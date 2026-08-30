## 1. SPA fallback

- [x] 1.1 Включить встроенный SPA-режим `reproxy` в `apps/share-web/Dockerfile` и проверить успешную сборку production web image.

## 2. Runtime-проверка

- [x] 2.1 Запустить собранный web container с существующими proxy rules и проверить, что прямые GET `/admin` и `/album/test` возвращают application shell, а `/trpc`, `/media`, `/auth` и health routes сохраняют прежние не-HTML ответы и статусы.
