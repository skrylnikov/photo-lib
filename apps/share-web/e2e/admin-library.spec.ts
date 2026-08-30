import { expect, test, type Page } from '@playwright/test';

type Status = 'pending' | 'processing' | 'ready' | 'failed';
type Media = { id: string; originalName: string; status: Status; safeError: string | null };
type Album = { id: string; position: number; slug: string; title: string; published: boolean; mediaIds: string[] };

const initialMedia: Media[] = [
  { id: 'media-1', originalName: 'Summer One.jpg', status: 'ready', safeError: null },
  { id: 'media-2', originalName: 'Summer Two.jpg', status: 'ready', safeError: null },
  { id: 'media-3', originalName: 'Winter Three.jpg', status: 'ready', safeError: null },
  { id: 'media-failed', originalName: 'Summer Failed.heic', status: 'failed', safeError: 'media_processing_failed' },
  { id: 'media-processing', originalName: 'Processing.heic', status: 'processing', safeError: null },
  { id: 'media-published', originalName: 'Published.jpg', status: 'ready', safeError: null },
];

const setupAdmin = async (page: Page) => {
  const media = initialMedia.map((item) => ({ ...item }));
  const albums: Album[] = [
    { id: 'album-1', position: 0, slug: 'first', title: 'Первый альбом', published: false, mediaIds: ['media-1', 'media-2', 'media-3'] },
    { id: 'album-2', position: 1, slug: 'second', title: 'Второй альбом', published: false, mediaIds: [] },
    { id: 'album-3', position: 2, slug: 'published', title: 'Опубликованный альбом', published: true, mediaIds: ['media-published'] },
  ];
  const mutations: string[] = [];
  let saveCount = 0;
  let failNextSave = false;
  let logoutCount = 0;
  let mediaListCount = 0;
  let failLargePreview = false;

  const albumDto = (album: Album) => ({
    ...album,
    description: null,
    publishedAt: null,
    createdAt: '2026-08-31T00:00:00.000Z',
    updatedAt: '2026-08-31T00:00:00.000Z',
    media: album.mediaIds.map((mediaId, position) => ({
      albumId: album.id,
      mediaId,
      position,
      featured: position === 0,
      media: {
        ...media.find((item) => item.id === mediaId),
        width: 1200,
        height: 800,
        derivatives: [{ format: 'jpeg', width: 640, height: 427 }],
        uploadIntent: null,
        assignment: { targetAlbumId: null, assignmentStatus: 'not_requested', assignmentError: null },
      },
    })),
  });
  const mediaDto = (item: Media) => ({
    ...item,
    originalMime: 'image/jpeg',
    originalBytes: 4096,
    width: item.status === 'ready' ? 1200 : 0,
    height: item.status === 'ready' ? 800 : 0,
    createdAt: '2026-08-31T00:00:00.000Z',
    derivatives: item.status === 'ready' ? [{ format: 'jpeg', width: 1600, height: 1067 }] : [],
    uploadIntent: null,
    assignment: { targetAlbumId: null, assignmentStatus: 'not_requested', assignmentError: null },
    albumLinks: albums.flatMap((album) => album.mediaIds.includes(item.id)
      ? [{ albumId: album.id, position: album.mediaIds.indexOf(item.id), featured: false, album: { title: album.title, published: album.published } }]
      : []),
  });

  await page.route('**/auth/session', (route) => route.fulfill({ json: { authenticated: true } }));
  await page.route('**/auth/logout', (route) => { logoutCount += 1; return route.fulfill({ json: { ok: true } }); });
  await page.route('**/upload/test', (route) => route.fulfill({ status: 200, body: '' }));
  await page.route('**/media/**', (route) => failLargePreview && route.request().url().endsWith('/1600')
    ? route.fulfill({ status: 404, body: '' })
    : route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#789"/></svg>',
    }));
  await page.route('**/trpc/**', async (route) => {
    const request = route.request();
    const procedures = decodeURIComponent(new URL(request.url()).pathname.split('/trpc/')[1] ?? '').split(',');
    const body = request.method() === 'POST'
      ? request.postDataJSON() as Record<string, Record<string, unknown> & { json?: Record<string, unknown> }>
      : {};
    const responses = [];

    for (const [index, procedure] of procedures.entries()) {
      const input = body[String(index)]?.json ?? body[String(index)] ?? {};
      if (procedure === 'admin.listAlbums') responses.push({ result: { data: albums.map(albumDto) } });
      else if (procedure === 'admin.listMedia') { mediaListCount += 1; responses.push({ result: { data: media.map(mediaDto) } }); }
      else {
        mutations.push(procedure);
        let result: unknown = { ok: true };
        if (procedure === 'admin.saveAlbum') {
          saveCount += 1;
          await new Promise((resolve) => setTimeout(resolve, 120));
          if (failNextSave) {
            failNextSave = false;
            responses.push({ error: { message: 'media_not_ready:media-processing', code: -32600, data: { code: 'BAD_REQUEST', httpStatus: 400, path: procedure } } });
            continue;
          }
          const album = albums.find(({ id }) => id === input.id);
          if (album) {
            album.title = String(input.title);
            album.slug = String(input.slug);
            album.mediaIds = (input.items as Array<{ mediaId: string }>).map(({ mediaId }) => mediaId);
          }
        } else if (procedure === 'admin.reorderAlbums') {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const ordered = input.albumIds as string[];
          albums.sort((left, right) => ordered.indexOf(left.id) - ordered.indexOf(right.id));
          albums.forEach((album, position) => { album.position = position; });
        } else if (procedure === 'admin.publishAlbum') {
          const album = albums.find(({ id }) => id === input.id);
          if (album) album.published = true;
        } else if (procedure === 'admin.unpublishAlbum') {
          const album = albums.find(({ id }) => id === input.id);
          if (album) album.published = false;
        } else if (procedure === 'admin.retryMedia') {
          const item = media.find(({ id }) => id === input.id);
          if (item) { item.status = 'pending'; item.safeError = null; }
        } else if (procedure === 'admin.deleteMedia') {
          const blocking = albums.filter((album) => album.published && album.mediaIds.includes(String(input.id)));
          if (blocking.length > 0) {
            responses.push({ error: { message: `media_in_published_albums:${blocking.map(({ title }) => title).join(',')}`, code: -32600, data: { code: 'BAD_REQUEST', httpStatus: 400, path: procedure } } });
            continue;
          }
          const itemIndex = media.findIndex(({ id }) => id === input.id);
          if (itemIndex >= 0) media.splice(itemIndex, 1);
          for (const album of albums) album.mediaIds = album.mediaIds.filter((id) => id !== input.id);
        } else if (procedure === 'admin.createUploadIntent') {
          result = { id: 'intent-1', uploadUrl: '/upload/test', expiresAt: '2099-01-01T00:00:00Z', assignment: { targetAlbumId: input.targetAlbumId, assignmentStatus: 'pending', assignmentError: null } };
        } else if (procedure === 'admin.completeUpload') {
          result = { id: 'media-processing', status: 'pending', assignment: { targetAlbumId: 'album-1', assignmentStatus: 'pending', assignmentError: null } };
        }
        responses.push({ result: { data: result } });
      }
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(responses) });
  });

  return {
    albums,
    mutations,
    saveCount: () => saveCount,
    failSave: () => { failNextSave = true; },
    logoutCount: () => logoutCount,
    mediaListCount: () => mediaListCount,
    setStatus: (id: string, status: Status) => { const item = media.find((value) => value.id === id); if (item) item.status = status; },
    failLargePreview: () => { failLargePreview = true; },
  };
};

test('serializes save/publish, preserves rejected drafts, and guards dirty navigation', async ({ page }) => {
  const fixture = await setupAdmin(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Первый альбом' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Сохранить альбом', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Сохранить данные|Сохранить состав/ })).toHaveCount(0);

  const title = page.getByLabel('Название', { exact: true });
  await title.fill('Изменённый альбом');
  await page.getByRole('button', { name: 'Сохранить альбом', exact: true }).dblclick();
  await expect(page.getByText('Альбом сохранён.')).toBeVisible();
  expect(fixture.saveCount()).toBe(1);

  fixture.failSave();
  await title.fill('Локальный черновик');
  await page.getByRole('button', { name: 'Сохранить альбом', exact: true }).click();
  await expect(page.getByText(/browser-safe/)).toBeVisible();
  await expect(title).toHaveValue('Локальный черновик');
  await expect(page.getByText('есть несохранённые изменения').first()).toBeVisible();

  const publishesBeforeFailure = fixture.mutations.filter((name) => name === 'admin.publishAlbum').length;
  fixture.failSave();
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect.poll(() => fixture.saveCount()).toBe(3);
  expect(fixture.mutations.filter((name) => name === 'admin.publishAlbum')).toHaveLength(publishesBeforeFailure);

  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect(page.getByText('Альбом опубликован.')).toBeVisible();
  expect(fixture.mutations.slice(-2)).toEqual(['admin.saveAlbum', 'admin.publishAlbum']);

  await page.getByRole('button', { name: 'Снять с публикации' }).click();
  await expect(page.getByText('Альбом снят с публикации.')).toBeVisible();
  await title.fill('Снова dirty');
  await page.getByLabel('Slug', { exact: true }).fill('again-dirty');
  await page.getByLabel('Описание', { exact: true }).fill('Локальное описание');
  await page.locator('[data-album-media-id="media-2"]').getByRole('checkbox', { name: 'Избранное' }).check();
  const listsBeforePoll = fixture.mediaListCount();
  await page.locator('#admin-file-input').setInputFiles({ name: 'poll.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('image') });
  await expect.poll(() => fixture.mediaListCount()).toBeGreaterThan(listsBeforePoll);
  fixture.setStatus('media-processing', 'ready');
  await expect.poll(() => fixture.mediaListCount(), { timeout: 5000 }).toBeGreaterThan(listsBeforePoll + 1);
  await expect(title).toHaveValue('Снова dirty');
  await expect(page.getByLabel('Slug', { exact: true })).toHaveValue('again-dirty');
  await expect(page.getByLabel('Описание', { exact: true })).toHaveValue('Локальное описание');
  await expect(page.locator('[data-album-media-id="media-2"]').getByRole('checkbox', { name: 'Избранное' })).toBeChecked();
  expect(await page.locator('[data-album-media-id]').evaluateAll((items) => items.map((item) => item.getAttribute('data-album-media-id'))))
    .toEqual(['media-1', 'media-2', 'media-3']);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Выйти' }).click();
  expect(fixture.logoutCount()).toBe(0);
  await expect(page).toHaveURL(/\/admin$/);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: /^Второй альбом 0 медиа/ }).click();
  await expect(page.getByRole('heading', { name: 'Локальный черновик' })).toBeVisible();
  expect(await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    return !window.dispatchEvent(event);
  })).toBe(true);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /^Второй альбом 0 медиа/ }).click();
  await expect(page.getByRole('heading', { name: 'Второй альбом' })).toBeVisible();
});

test('persists native and fallback ordering and manages the independent media library', async ({ page }) => {
  const fixture = await setupAdmin(page);
  await page.goto('/admin');

  await page.locator('[data-album-id="album-2"]').dragTo(page.locator('[data-album-id="album-1"]'));
  await expect(page.getByRole('button', { name: /Переместить альбом «Второй альбом»/ }).first()).toBeDisabled();
  await expect(page.getByText('Порядок альбомов сохранён.')).toBeVisible();
  await page.getByRole('button', { name: 'Переместить альбом «Первый альбом» выше' }).click();
  await expect(page.getByText('Порядок альбомов сохранён.')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-album-id]').first()).toHaveAttribute('data-album-id', 'album-1');
  await expect(page.getByText('Summer Failed.heic')).toBeVisible();
  await expect(page.getByText('Processing.heic')).toBeVisible();

  await page.locator('[data-album-media-id="media-3"]').dragTo(page.locator('[data-album-media-id="media-1"]'));
  await page.locator('[data-album-media-id="media-2"]').getByRole('button', { name: 'Переместить выше' }).click();
  await page.getByRole('button', { name: 'Сохранить альбом', exact: true }).click();
  await page.reload();
  expect(await page.locator('[data-album-media-id]').evaluateAll((items) => items.map((item) => item.getAttribute('data-album-media-id'))))
    .toEqual(['media-3', 'media-2', 'media-1']);

  await page.getByLabel('Поиск по имени').fill('SUMMER');
  await page.getByRole('combobox', { name: 'Состояние' }).click();
  await page.getByRole('option', { name: 'Ошибка обработки' }).click();
  await expect(page.getByText('Summer Failed.heic')).toBeVisible();
  await expect(page.locator('[data-library-media-id="media-1"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Повторить обработку' }).click();
  await expect(page.getByText('По заданным условиям ничего не найдено.')).toBeVisible();

  await page.getByRole('combobox', { name: 'Состояние' }).click();
  await page.getByRole('option', { name: 'Все состояния' }).click();
  const previewButton = page.getByRole('button', { name: 'Открыть превью «Summer One.jpg»' });
  await previewButton.click();
  await expect(page.getByRole('dialog')).toContainText('Summer One.jpg');
  expect(await page.getByRole('dialog').locator('img').evaluate((image) => {
    const element = image as HTMLImageElement;
    const rect = element.getBoundingClientRect();
    return Math.abs(rect.width / rect.height - element.naturalWidth / element.naturalHeight);
  })).toBeLessThan(0.01);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(previewButton).toBeFocused();

  fixture.failLargePreview();
  await page.getByRole('button', { name: 'Открыть превью «Summer Two.jpg»' }).click();
  await expect(page.getByRole('dialog').getByText('Превью недоступно')).toBeVisible();
  await page.keyboard.press('Escape');

  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('[data-library-media-id="media-2"]').getByRole('button', { name: 'Удалить' }).click();
  await expect(page.locator('[data-library-media-id="media-2"]')).toBeVisible();

  await page.getByLabel('Поиск по имени').fill('');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-library-media-id="media-published"]').getByRole('button', { name: 'Удалить' }).click();
  await expect(page.getByText(/Удаление заблокировано опубликованными альбомами/)).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-library-media-id="media-1"]').getByRole('button', { name: 'Удалить' }).click();
  await expect(page.getByText('Медиа «Summer One.jpg» удалено.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Summer One.jpg')).toHaveCount(0);
  await expect(page.getByText('Processing.heic')).toBeVisible();
});
