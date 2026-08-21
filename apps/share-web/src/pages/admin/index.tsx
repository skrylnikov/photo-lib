import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { humanizeAdminError } from './errors';
import {
  albumButton,
  compositionGrid,
  dragTarget,
  dropzone,
  header,
  layout,
  mediaPreview,
  preview,
  previewFallback,
  queueCard,
  queueGrid,
  availableMediaCard,
  availableMediaGrid,
  sidebar,
  visuallyHidden,
  workspace,
} from './style.css.ts';
import { page } from '../../app/style.css.ts';
import { trpc, type RouterOutput } from '../../shared/api/trpc';

type Albums = RouterOutput['admin']['listAlbums'];
type Media = RouterOutput['admin']['listMedia'];
type MediaItem = Media[number];
type QueuePhase = 'queued' | 'uploading' | 'upload-failed' | 'pending' | 'processing' | 'ready' | 'failed';
type Membership = { mediaId: string; featured: boolean };
type QueueItem = {
  localId: string;
  file: File;
  previewUrl: string;
  targetAlbumId: string;
  phase: QueuePhase;
  mediaId?: string;
  error?: string;
};

const terminalPhases = new Set<QueuePhase>(['upload-failed', 'ready', 'failed']);
const statusLabel: Record<QueuePhase, string> = {
  queued: 'В очереди',
  uploading: 'Загрузка',
  'upload-failed': 'Ошибка загрузки',
  pending: 'Ожидает обработки',
  processing: 'Обрабатывается',
  ready: 'Готово',
  failed: 'Ошибка обработки',
};

const statusColor: Record<QueuePhase, string> = {
  queued: 'gray',
  uploading: 'blue',
  'upload-failed': 'red',
  pending: 'yellow',
  processing: 'blue',
  ready: 'green',
  failed: 'red',
};

const updateQueueItem = (items: QueueItem[], localId: string, update: Partial<QueueItem>): QueueItem[] =>
  items.map((item) => item.localId === localId ? { ...item, ...update } : item);

const mediaById = (items: Media | null): Map<string, MediaItem> => new Map((items ?? []).map((item) => [item.id, item]));

export const AdminPage = ({ navigate }: { navigate: (path: string) => void }) => {
  const [albums, setAlbums] = useState<Albums | null>(null);
  const [media, setMedia] = useState<Media | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [membership, setMembership] = useState<Membership[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationNotice, setOperationNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [createAlbumError, setCreateAlbumError] = useState<string | null>(null);
  const [createAlbumSubmitting, setCreateAlbumSubmitting] = useState(false);
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);
  const [dragOverMediaId, setDragOverMediaId] = useState<string | null>(null);
  const [failedPreviewIds, setFailedPreviewIds] = useState<ReadonlySet<string>>(() => new Set());
  const selectedAlbumRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);

  const selectedAlbum = useMemo(
    () => albums?.find((album) => album.id === selectedAlbumId) ?? null,
    [albums, selectedAlbumId],
  );
  const mediaMap = useMemo(() => mediaById(media), [media]);

  const syncSelectedAlbum = useCallback((nextAlbums: Albums): void => {
    const nextSelectedId = selectedAlbumRef.current ?? nextAlbums[0]?.id ?? null;
    selectedAlbumRef.current = nextSelectedId;
    setSelectedAlbumId(nextSelectedId);
    if (dirtyRef.current) return;
    const nextSelected = nextAlbums.find((album) => album.id === nextSelectedId);
    setMembership(nextSelected?.media.map(({ media: item, featured }) => ({ mediaId: item.id, featured })) ?? []);
  }, []);

  const mergeServerStatuses = useCallback((nextMedia: Media): void => {
    setQueue((current) => {
      const merged = current.map((item) => {
        if (!item.mediaId) return item;
        const serverMedia = nextMedia.find((value) => value.id === item.mediaId);
        if (!serverMedia) return item;
        const phase = serverMedia.status;
        return { ...item, phase, error: serverMedia.safeError ? humanizeAdminError(new Error(serverMedia.safeError)) : undefined };
      });
      queueRef.current = merged;
      return merged;
    });
  }, []);

  const loadData = useCallback(async (checkSession: boolean): Promise<void> => {
    setLoadError(false);
    try {
      if (checkSession) {
        const sessionResponse = await fetch('/auth/session');
        if (sessionResponse.status === 401) {
          setUnauthorized(true);
          return;
        }
        if (!sessionResponse.ok) throw new Error('session_failed');
        const session = (await sessionResponse.json()) as { authenticated?: boolean };
        if (!session.authenticated) {
          setUnauthorized(true);
          return;
        }
      }
      const [nextAlbums, nextMedia] = await Promise.all([
        trpc.admin.listAlbums.query(),
        trpc.admin.listMedia.query(),
      ]);
      setUnauthorized(false);
      setAlbums(nextAlbums);
      setMedia(nextMedia);
      syncSelectedAlbum(nextAlbums);
      mergeServerStatuses(nextMedia);
    } catch (error) {
      if (checkSession) setLoadError(true);
      else setOperationError(humanizeAdminError(error));
    } finally {
      if (checkSession) setLoading(false);
    }
  }, [mergeServerStatuses, syncSelectedAlbum]);

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  useEffect(() => {
    selectedAlbumRef.current = selectedAlbumId;
    if (!dirty) {
      setMembership(selectedAlbum?.media.map(({ media: item, featured }) => ({ mediaId: item.id, featured })) ?? []);
      setTitle(selectedAlbum?.title ?? '');
      setSlug(selectedAlbum?.slug ?? '');
      setDescription(selectedAlbum?.description ?? '');
    }
  }, [dirty, selectedAlbum, selectedAlbumId]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => () => {
    queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  const hasActiveQueue = queue.some((item) => !terminalPhases.has(item.phase));
  useEffect(() => {
    if (!hasActiveQueue) return undefined;
    const timer = window.setInterval(() => {
      void loadData(false);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [hasActiveQueue, loadData]);

  const selectAlbum = (id: string | null): void => {
    selectedAlbumRef.current = id;
    dirtyRef.current = false;
    setSelectedAlbumId(id);
    setDirty(false);
    setOperationError(null);
  };

  const run = async (operation: () => Promise<void>, successMessage?: string): Promise<boolean> => {
    setOperationError(null);
    setOperationNotice(null);
    try {
      await operation();
      if (successMessage) setOperationNotice(successMessage);
      await loadData(false);
      return true;
    } catch (error) {
      setOperationError(humanizeAdminError(error));
      return false;
    }
  };

  const createAlbum = async (): Promise<void> => {
    const nextTitle = newTitle.trim();
    const nextSlug = newSlug.trim();
    if (!nextTitle || !nextSlug) {
      setCreateAlbumError('Укажите название и slug альбома.');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) {
      setCreateAlbumError('Slug должен содержать только латинские буквы в нижнем регистре, цифры и дефисы.');
      return;
    }
    setCreateAlbumError(null);
    setCreateAlbumSubmitting(true);
    try {
      const created = await trpc.admin.createAlbum.mutate({ title: nextTitle, slug: nextSlug, description: null });
      selectedAlbumRef.current = created.id;
      dirtyRef.current = false;
      setSelectedAlbumId(created.id);
      setDirty(false);
      setNewTitle('');
      setNewSlug('');
      setCreateAlbumOpen(false);
      setOperationNotice('Черновой альбом создан.');
      await loadData(false);
    } catch (error) {
      setCreateAlbumError(humanizeAdminError(error));
    } finally {
      setCreateAlbumSubmitting(false);
    }
  };

  const uploadOne = async (item: QueueItem): Promise<void> => {
    setQueue((current) => updateQueueItem(current, item.localId, { phase: 'uploading', error: undefined }));
    try {
      const mime = item.file.type || 'application/octet-stream';
      const intent = await trpc.admin.createUploadIntent.mutate({
        originalName: item.file.name,
        mime,
        bytes: item.file.size,
        targetAlbumId: item.targetAlbumId,
      });
      const response = await fetch(intent.uploadUrl, { method: 'PUT', headers: { 'Content-Type': mime }, body: item.file });
      if (!response.ok) throw new Error('upload_failed');
      const completed = await trpc.admin.completeUpload.mutate({ intentId: intent.id });
      setQueue((current) => updateQueueItem(current, item.localId, { mediaId: completed.id, phase: 'pending' }));
    } catch (error) {
      setQueue((current) => updateQueueItem(current, item.localId, { phase: 'upload-failed', error: humanizeAdminError(error) }));
    }
  };

  const uploadBatch = async (items: QueueItem[]): Promise<void> => {
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        await uploadOne(items[index]);
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, items.length) }, () => worker()));
    await loadData(false);
  };

  const addFiles = (files: FileList | null): void => {
    if (!files || !selectedAlbumId) {
      setOperationError('Сначала выберите неопубликованный альбом назначения.');
      return;
    }
    if (selectedAlbum?.published) {
      setOperationError('Сначала снимите альбом с публикации.');
      return;
    }
    const nextItems = Array.from(files).filter((file) => file.type.startsWith('image/')).map((file) => ({
      localId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      targetAlbumId: selectedAlbumId,
      phase: 'queued' as const,
    }));
    if (nextItems.length === 0) {
      setOperationError('Выберите хотя бы одно изображение.');
      return;
    }
    setQueue((current) => {
      const merged = [...current, ...nextItems];
      queueRef.current = merged;
      return merged;
    });
    void uploadBatch(nextItems);
  };

  const retryUpload = (item: QueueItem): void => {
    const retry = { ...item, phase: 'queued' as const, error: undefined };
    setQueue((current) => updateQueueItem(current, item.localId, retry));
    void uploadBatch([retry]);
  };

  const removeQueueItem = (item: QueueItem): void => {
    URL.revokeObjectURL(item.previewUrl);
    setQueue((current) => {
      const next = current.filter((value) => value.localId !== item.localId);
      queueRef.current = next;
      return next;
    });
  };

  const updateMembership = (mediaId: string, update: Partial<Membership>): void => {
    dirtyRef.current = true;
    setDirty(true);
    setMembership((current) => current.map((item) => item.mediaId === mediaId ? { ...item, ...update } : item));
  };

  const addToMembership = (mediaId: string): void => {
    if (membership.some((item) => item.mediaId === mediaId)) return;
    dirtyRef.current = true;
    setDirty(true);
    setMembership((current) => [...current, { mediaId, featured: false }]);
  };

  const removeFromMembership = (mediaId: string): void => {
    dirtyRef.current = true;
    setDirty(true);
    setMembership((current) => current.filter((item) => item.mediaId !== mediaId));
  };

  const moveMembership = (mediaId: string, direction: -1 | 1): void => {
    const index = membership.findIndex((item) => item.mediaId === mediaId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= membership.length) return;
    const next = [...membership];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    dirtyRef.current = true;
    setDirty(true);
    setMembership(next);
  };

  const reorderMembership = (targetMediaId: string): void => {
    if (selectedAlbum?.published || !draggedMediaId || draggedMediaId === targetMediaId) return;
    const from = membership.findIndex((item) => item.mediaId === draggedMediaId);
    const to = membership.findIndex((item) => item.mediaId === targetMediaId);
    if (from < 0 || to < 0) return;
    const next = [...membership];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    dirtyRef.current = true;
    setDirty(true);
    setMembership(next);
    setDraggedMediaId(null);
    setDragOverMediaId(null);
  };

  const saveMembership = async (): Promise<void> => {
    if (!selectedAlbumId || selectedAlbum?.published) return;
    const saved = await run(async () => {
      await trpc.admin.setAlbumMedia.mutate({
        albumId: selectedAlbumId,
        items: membership.map(({ mediaId, featured }) => ({ mediaId, featured })),
      });
    }, 'Состав альбома сохранён.');
    if (saved) {
      dirtyRef.current = false;
      setDirty(false);
    }
  };

  const saveMetadata = async (): Promise<void> => {
    if (!selectedAlbumId || selectedAlbum?.published) return;
    const saved = await run(async () => {
      await trpc.admin.updateAlbum.mutate({ id: selectedAlbumId, title, slug, description: description || null });
    }, 'Данные альбома сохранены.');
    if (saved) {
      dirtyRef.current = false;
      setDirty(false);
    }
  };

  const deleteAlbum = async (): Promise<void> => {
    if (!selectedAlbumId || selectedAlbum?.published || !window.confirm('Удалить этот неопубликованный альбом?')) return;
    const deleted = await run(async () => {
      await trpc.admin.deleteAlbum.mutate({ id: selectedAlbumId });
    }, 'Альбом удалён.');
    if (deleted) selectAlbum(null);
  };

  const togglePublish = async (): Promise<void> => {
    if (!selectedAlbum) return;
    await run(async () => {
      if (selectedAlbum.published) await trpc.admin.unpublishAlbum.mutate({ id: selectedAlbum.id });
      else await trpc.admin.publishAlbum.mutate({ id: selectedAlbum.id });
    }, selectedAlbum.published ? 'Альбом снят с публикации.' : 'Альбом опубликован.');
  };

  const availableMedia = (media ?? []).filter((item) =>
    item.status === 'ready' && !membership.some(({ mediaId }) => mediaId === item.id),
  );
  const readyCount = selectedAlbum?.media.filter(({ media: item }) => item.status === 'ready').length ?? 0;
  const processingCount = selectedAlbum?.media.filter(({ media: item }) => item.status === 'pending' || item.status === 'processing').length ?? 0;

  if (unauthorized) {
    return <Container className={page}><Stack><Title order={1}>Требуется доступ администратора</Title><Text>Войдите через Pocket ID, чтобы управлять библиотекой.</Text><Button component="a" href="/auth/login">Войти</Button></Stack></Container>;
  }

  if (loading && !albums) return <Container className={page}><Text>Загрузка рабочей области…</Text></Container>;
  if (loadError && !albums) return <Container className={page}><Stack><Title order={1}>Админка недоступна</Title><Text c="red">Библиотеку не удалось загрузить.</Text><Button onClick={() => void loadData(true)}>Повторить</Button></Stack></Container>;

  return <Container className={`${page} ${workspace}`}>
    <Stack gap="xl">
      <Group className={header} justify="space-between">
        <div><Title order={1}>Библиотека</Title><Text c="dimmed">Загрузка, обработка и курирование альбомов</Text></div>
        <Button variant="subtle" onClick={async () => { await fetch('/auth/logout', { method: 'POST' }); navigate('/'); }}>Выйти</Button>
      </Group>
      {operationError && <Alert color="red" title="Операция не выполнена" withCloseButton onClose={() => setOperationError(null)}>{operationError}</Alert>}
      {operationNotice && <Alert color="green" title="Готово" withCloseButton onClose={() => setOperationNotice(null)}>{operationNotice}</Alert>}
      <div className={layout}>
        <Stack className={sidebar} gap="md">
          <Card withBorder>
            <Stack gap="sm">
              <Title order={3}>Альбомы</Title>
              {albums?.map((album) => <Button key={album.id} className={albumButton} variant={album.id === selectedAlbumId ? 'light' : 'subtle'} onClick={() => selectAlbum(album.id)}>
                <Stack gap={0}><Text size="sm" fw={600}>{album.title}</Text><Text size="xs" c="dimmed">{album.media.length} медиа · {album.published ? 'опубликован' : 'черновик'}</Text></Stack>
              </Button>)}
              {albums?.length === 0 && <Text size="sm" c="dimmed">Альбомов пока нет.</Text>}
            </Stack>
          </Card>
          <Card withBorder>
            <Stack gap="sm">
              <Title order={3}>Управление</Title>
              <Button onClick={() => { setCreateAlbumError(null); setCreateAlbumOpen(true); }}>Создать альбом</Button>
            </Stack>
          </Card>
          <Modal
            opened={createAlbumOpen}
            onClose={() => { if (!createAlbumSubmitting) setCreateAlbumOpen(false); }}
            title="Создать черновой альбом"
            centered
          >
            <form onSubmit={(event) => { event.preventDefault(); void createAlbum(); }}>
              <Stack gap="md">
                <TextInput
                  label="Название"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.currentTarget.value)}
                  error={createAlbumError && !newTitle.trim() ? createAlbumError : undefined}
                />
                <TextInput
                  label="Slug"
                  value={newSlug}
                  onChange={(event) => setNewSlug(event.currentTarget.value)}
                  error={createAlbumError && newTitle.trim() ? createAlbumError : undefined}
                />
                <Group justify="flex-end">
                  <Button variant="default" onClick={() => setCreateAlbumOpen(false)} disabled={createAlbumSubmitting}>Отмена</Button>
                  <Button type="submit" loading={createAlbumSubmitting}>Создать черновик</Button>
                </Group>
              </Stack>
            </form>
          </Modal>
        </Stack>
        <Stack gap="lg">
          {!selectedAlbum && <Card withBorder><Text c="dimmed">Выберите альбом или создайте новый черновик.</Text></Card>}
          {selectedAlbum && <>
            <Card withBorder>
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <div><Title order={2}>{selectedAlbum.title}</Title><Text c="dimmed">/{selectedAlbum.slug}</Text></div>
                  <Badge color={selectedAlbum.published ? 'green' : 'yellow'}>{selectedAlbum.published ? 'Опубликован' : 'Черновик'}</Badge>
                </Group>
                <Group grow align="flex-end">
                  <TextInput label="Название" value={title} disabled={selectedAlbum.published} onChange={(event) => { setTitle(event.currentTarget.value); setDirty(true); }} />
                  <TextInput label="Slug" value={slug} disabled={selectedAlbum.published} onChange={(event) => { setSlug(event.currentTarget.value); setDirty(true); }} />
                </Group>
                <Textarea label="Описание" value={description} disabled={selectedAlbum.published} onChange={(event) => { setDescription(event.currentTarget.value); setDirty(true); }} />
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">{selectedAlbum.media.length} элементов · {dirty ? 'есть несохранённые изменения' : 'синхронизировано'}</Text>
                  <Group>
                    <Button variant="default" onClick={() => void saveMetadata()} disabled={selectedAlbum.published || !dirty}>Сохранить данные</Button>
                    <Button color={selectedAlbum.published ? 'gray' : 'blue'} onClick={() => void togglePublish()}>{selectedAlbum.published ? 'Снять с публикации' : 'Опубликовать'}</Button>
                    <Button color="red" variant="light" onClick={() => void deleteAlbum()} disabled={selectedAlbum.published}>Удалить</Button>
                  </Group>
                </Group>
              </Stack>
            </Card>

            {!selectedAlbum.published && <Card withBorder>
              <Stack gap="md">
                <Group justify="space-between"><Title order={3}>Мультизагрузка</Title><Select label="Альбом назначения" value={selectedAlbumId} onChange={selectAlbum} data={albums?.filter((album) => !album.published).map((album) => ({ value: album.id, label: album.title })) ?? []} /></Group>
                <label className={dropzone} htmlFor="admin-file-input" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}>
                  <Stack align="center" gap="xs"><Text fw={600}>Перетащите изображения сюда или выберите файлы</Text><Text size="sm" c="dimmed">Каждый файл загружается независимо; параллельно выполняются до 3 передач.</Text><Button component="span">Выбрать файлы</Button></Stack>
                </label>
                <input id="admin-file-input" className={visuallyHidden} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/jxl,image/heif,image/heic" onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = ''; }} />
                {queue.length > 0 && <div className={queueGrid}>{queue.map((item) => <Card key={item.localId} className={queueCard} withBorder padding={0}>
                  <img className={preview} src={item.previewUrl} alt="" />
                  <Stack p="sm" gap="xs"><Text size="sm" fw={600} lineClamp={1}>{item.file.name}</Text><Badge color={statusColor[item.phase]}>{statusLabel[item.phase]}</Badge>{item.error && <Text size="xs" c="red">{item.error}</Text>}<Group gap="xs"><Button size="xs" variant="light" onClick={() => retryUpload(item)} disabled={item.phase !== 'upload-failed'}>Повторить</Button><Button size="xs" variant="subtle" color="red" onClick={() => removeQueueItem(item)}>Удалить</Button></Group></Stack>
                </Card>)}</div>}
              </Stack>
            </Card>}

            <Card withBorder>
              <Stack gap="md">
                <Group justify="space-between"><div><Title order={3}>Состав альбома</Title><Text size="sm" c="dimmed">{readyCount} готово · {processingCount} в обработке · {dirty ? 'есть несохранённые изменения' : 'синхронизировано'}</Text></div><Button onClick={() => void saveMembership()} disabled={selectedAlbum.published || !dirty}>Сохранить состав</Button></Group>
                {membership.length === 0 && <Text c="dimmed">В альбоме пока нет готовых медиа.</Text>}
                <div className={compositionGrid}>{membership.map((item, index) => {
                  const value = mediaMap.get(item.mediaId);
                  if (!value) return <Card key={item.mediaId} withBorder><Text c="red">Медиа {item.mediaId} недоступно</Text></Card>;
                  const assignment = value.assignment ?? { assignmentStatus: 'not_requested' as const, assignmentError: null, targetAlbumId: null };
                  const canReorder = !selectedAlbum.published;
                  const previewFailed = failedPreviewIds.has(value.id);
                  return <Card
                    key={item.mediaId}
                    withBorder
                    draggable={canReorder}
                    className={dragOverMediaId === item.mediaId ? dragTarget : undefined}
                    onDragStart={(event) => {
                      if (!canReorder) return;
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', item.mediaId);
                      setDraggedMediaId(item.mediaId);
                    }}
                    onDragEnd={() => { setDraggedMediaId(null); setDragOverMediaId(null); }}
                    onDragOver={(event) => {
                      if (!canReorder || !draggedMediaId || draggedMediaId === item.mediaId) return;
                      event.preventDefault();
                      setDragOverMediaId(item.mediaId);
                    }}
                    onDragLeave={() => { if (dragOverMediaId === item.mediaId) setDragOverMediaId(null); }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (canReorder) reorderMembership(item.mediaId);
                    }}
                  >
                    {value.status === 'ready' && (previewFailed ? <div className={previewFallback}>Превью недоступно</div> : <img className={mediaPreview} src={`/media/${value.id}/jpeg/640`} alt={value.originalName} onError={() => setFailedPreviewIds((current) => new Set([...current, value.id]))} />)}
                    <Stack p="sm" gap="xs"><Text size="sm" fw={600} lineClamp={1}>{value.originalName}</Text><Badge color={value.status === 'ready' ? 'green' : 'red'}>{value.status}</Badge>{assignment.assignmentStatus === 'unavailable' && <Text size="xs" c="orange">{humanizeAdminError(new Error(assignment.assignmentError ?? 'target_album_not_found'))}</Text>}<Checkbox label="Избранное" checked={item.featured} disabled={selectedAlbum.published} onChange={(event) => updateMembership(item.mediaId, { featured: event.currentTarget.checked })} /><Group gap="xs"><ActionIcon aria-label="Переместить выше" variant="default" disabled={index === 0 || selectedAlbum.published} onClick={() => moveMembership(item.mediaId, -1)}>↑</ActionIcon><ActionIcon aria-label="Переместить ниже" variant="default" disabled={index === membership.length - 1 || selectedAlbum.published} onClick={() => moveMembership(item.mediaId, 1)}>↓</ActionIcon><Button size="xs" color="red" variant="subtle" disabled={selectedAlbum.published} onClick={() => removeFromMembership(item.mediaId)}>Убрать</Button></Group></Stack>
                  </Card>;
                })}</div>
                {availableMedia.length > 0 && <><Divider /><Stack gap="xs"><Text fw={600}>Добавить готовые медиа</Text><div className={availableMediaGrid}>{availableMedia.map((item) => {
                  const previewFailed = failedPreviewIds.has(item.id);
                  return <Card key={item.id} className={availableMediaCard} withBorder padding={0}>
                    {previewFailed ? <div className={previewFallback}>Превью недоступно</div> : <img className={mediaPreview} src={`/media/${item.id}/jpeg/640`} alt={item.originalName} onError={() => setFailedPreviewIds((current) => new Set([...current, item.id]))} />}
                    <Stack p="sm" gap="xs"><Text size="sm" fw={600} lineClamp={1}>{item.originalName}</Text><Badge color="green">Готово</Badge><Button size="xs" variant="light" disabled={selectedAlbum.published || membership.some(({ mediaId }) => mediaId === item.id)} onClick={() => addToMembership(item.id)}>Добавить</Button></Stack>
                  </Card>;
                })}</div></Stack></>}
              </Stack>
            </Card>
          </>}
        </Stack>
      </div>
    </Stack>
  </Container>;
};
