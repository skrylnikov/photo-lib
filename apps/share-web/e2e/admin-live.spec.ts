import { expect, test, type Locator, type Page } from '@playwright/test';

test.skip(process.env.ADMIN_LIVE_E2E !== '1', 'requires the isolated dev-auth API and RustFS stack');

const jpeg = Buffer.from('/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAwAEADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAQH/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AjgGspgAAAAAAAAAAAAAAAAAAAAAH/9k=', 'base64');

const createAlbum = async (page: Page, title: string, slug: string) => {
  await page.getByRole('button', { name: 'Создать альбом' }).click();
  const dialog = page.getByRole('dialog', { name: 'Создать черновой альбом' });
  await dialog.getByLabel('Название').fill(title);
  await dialog.getByLabel('Slug').fill(slug);
  await dialog.getByRole('button', { name: 'Создать черновик' }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
};

const libraryCard = (page: Page, name: string): Locator =>
  page.locator('[data-library-media-id]').filter({ hasText: name });

test('runs the complete admin library flow against the real API', async ({ page }) => {
  test.setTimeout(180_000);
  const suffix = Date.now().toString(36);
  const albumOne = `Live One ${suffix}`;
  const albumTwo = `Live Two ${suffix}`;
  const mediaOne = `live-one-${suffix}.jpg`;
  const mediaTwo = `live-two-${suffix}.jpg`;
  const mediaFailed = `live-failed-${suffix}.jpg`;
  await page.goto('/admin');
  await createAlbum(page, albumOne, `live-one-${suffix}`);
  await createAlbum(page, albumTwo, `live-two-${suffix}`);

  await page.locator('[data-album-id]').filter({ hasText: albumTwo }).dragTo(
    page.locator('[data-album-id]').filter({ hasText: albumOne }),
  );
  await expect(page.getByText('Порядок альбомов сохранён.')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-album-id]').filter({ hasText: albumOne })).toBeVisible();
  await expect(page.locator('[data-album-id]').filter({ hasText: albumTwo })).toBeVisible();
  const albumOrder = await page.locator('[data-album-id]').allInnerTexts();
  expect(albumOrder.findIndex((text) => text.includes(albumTwo))).toBeLessThan(
    albumOrder.findIndex((text) => text.includes(albumOne)),
  );
  await page.getByRole('button', { name: `Переместить альбом «${albumTwo}» ниже` }).press('Enter');
  await expect(page.getByText('Порядок альбомов сохранён.')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: `Переместить альбом «${albumOne}» ниже` })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.locator('[data-album-id]').filter({ hasText: albumOne }).getByRole('button').first().click();
  await expect(page.getByRole('button', { name: 'Сохранить альбом', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Сохранить данные|Сохранить состав/ })).toHaveCount(0);
  await page.locator('#admin-file-input').setInputFiles([
    { name: mediaOne, mimeType: 'image/jpeg', buffer: jpeg },
    { name: mediaTwo, mimeType: 'image/jpeg', buffer: jpeg },
    { name: mediaFailed, mimeType: 'image/jpeg', buffer: Buffer.from('not an image') },
  ]);

  await expect(libraryCard(page, mediaOne).getByText('Готово', { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(libraryCard(page, mediaTwo).getByText('Готово', { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(libraryCard(page, mediaFailed).getByText('Ошибка обработки', { exact: true })).toBeVisible({ timeout: 90_000 });

  const first = page.locator('[data-album-media-id]').filter({ hasText: mediaOne });
  const second = page.locator('[data-album-media-id]').filter({ hasText: mediaTwo });
  await second.dragTo(first);
  await page.getByLabel('Название', { exact: true }).fill('Live Curated');
  await page.getByRole('button', { name: 'Сохранить альбом', exact: true }).click();
  await expect(page.getByText('Альбом сохранён.')).toBeVisible();
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect(page.getByText('Альбом опубликован.')).toBeVisible();

  await page.getByLabel('Поиск по имени').fill('LIVE-TWO');
  await expect(libraryCard(page, mediaTwo)).toBeVisible();
  await expect(libraryCard(page, mediaOne)).toHaveCount(0);
  const preview = page.getByRole('button', { name: `Открыть превью «${mediaTwo}»` });
  await preview.click();
  await expect(page.getByRole('dialog')).toContainText(mediaTwo);
  await page.keyboard.press('Escape');
  await expect(preview).toBeFocused();

  await page.getByLabel('Поиск по имени').fill(mediaFailed);
  await libraryCard(page, mediaFailed).getByRole('button', { name: 'Повторить обработку' }).click();
  await expect(libraryCard(page, mediaFailed).getByText(/Ожидает обработки|Обрабатывается/)).toBeVisible();
  await expect(libraryCard(page, mediaFailed).getByText('Ошибка обработки', { exact: true })).toBeVisible({ timeout: 90_000 });

  await page.getByLabel('Поиск по имени').fill(mediaOne);
  page.once('dialog', (dialog) => dialog.accept());
  await libraryCard(page, mediaOne).getByRole('button', { name: 'Удалить' }).click();
  await expect(page.getByText(/Удаление заблокировано опубликованными альбомами/)).toBeVisible();

  await page.getByLabel('Поиск по имени').fill(mediaFailed);
  page.once('dialog', (dialog) => dialog.accept());
  await libraryCard(page, mediaFailed).getByRole('button', { name: 'Удалить' }).click();
  await expect(page.getByText(`Медиа «${mediaFailed}» удалено.`)).toBeVisible();
  await page.reload();
  await page.getByLabel('Поиск по имени').fill(mediaFailed);
  await expect(page.getByText('По заданным условиям ничего не найдено.')).toBeVisible();

  await page.locator('[data-album-id]').filter({ hasText: albumTwo }).getByRole('button').first().click();
  await page.getByLabel('Описание', { exact: true }).fill('reload guard');
  let reloadDialogType: string | undefined;
  page.once('dialog', async (dialog) => {
    reloadDialogType = dialog.type();
    await dialog.dismiss();
  });
  await page.reload({ timeout: 5000 }).catch(() => undefined);
  expect(reloadDialogType).toBe('beforeunload');
});
