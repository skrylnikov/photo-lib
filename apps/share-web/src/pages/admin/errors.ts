const knownMessages: Record<string, string> = {
  album_not_found: 'Альбом больше недоступен.',
  album_must_be_unpublished: 'Сначала снимите альбом с публикации.',
  album_not_ready: 'Публикация заблокирована: дождитесь готовности указанных медиа.',
  target_album_not_found: 'Выбранный альбом назначения больше не существует.',
  media_not_found: 'Одно или несколько медиа больше недоступны.',
  media_not_ready: 'В состав можно добавить только готовые browser-safe медиа.',
  upload_intent_invalid: 'Срок загрузки истёк. Повторите загрузку файла.',
  upload_verification_failed: 'Сервер не подтвердил загруженный файл.',
  upload_failed: 'Не удалось передать файл в хранилище.',
  media_processing_failed: 'Обработка изображения завершилась ошибкой.',
  media_processing: 'Дождитесь завершения обработки перед удалением.',
  media_not_failed: 'Повторная обработка доступна только для медиа с ошибкой.',
  media_original_unavailable: 'Оригинал недоступен в хранилище; повторная обработка невозможна.',
  media_job_not_found: 'Задача обработки медиа больше недоступна.',
  media_in_published_albums: 'Удаление заблокировано опубликованными альбомами.',
  duplicate_album_ids: 'Порядок альбомов содержит дубликаты.',
  missing_album_ids: 'В порядке альбомов отсутствуют записи.',
  unknown_album_ids: 'Порядок альбомов содержит неизвестные записи.',
  logout_failed: 'Не удалось завершить сессию.',
  target_album_deleted: 'Альбом назначения был удалён до завершения обработки.',
  target_album_published: 'Альбом назначения был опубликован до завершения обработки.',
};

export const humanizeAdminError = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const [code, details] = raw.split(/:(.*)/s, 2);
  const base = knownMessages[code] ?? 'Операция не выполнена. Проверьте данные и повторите попытку.';
  if (code === 'album_not_ready' && details) return `${base} Блокирующие медиа: ${details}.`;
  if (code === 'media_not_ready' && details) return `${base} ID: ${details}.`;
  if (code === 'media_in_published_albums' && details) return `${base} Альбомы: ${details}.`;
  return base;
};
