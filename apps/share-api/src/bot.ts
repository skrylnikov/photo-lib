import { Bot } from 'grammy';
import { fetch } from 'undici';
import { writeFile } from 'node:fs/promises';

import { tgBotToken, storagePath } from 'config';

import { indexStorage, reindexStorage } from './job';

const bot = new Bot(tgBotToken);

bot.command(['help', 'start'], (ctx) =>
  ctx.reply(`Отпраавь фото файлом для загрузки. Файл должен быть меньше 20мб.
/reindex -  принудительно переиндексировать хрнилище
`)
);

bot.command('reindex', (ctx) => {
  reindexStorage();
  ctx.reply(`Переиндексация запущена`);
});

bot.on(['message:photo', 'message:document'], async (ctx) => {
  try {
    const file = await ctx.getFile();

    if (!file) {
      return ctx.reply(`Файл не найден`);
    }

    const result = await fetch(
      `https://api.telegram.org/file/bot${tgBotToken}/${file.file_path}`
    );

    const extention = file.file_path?.split('.').pop();

    if (result.status === 200 && result.body) {
      await writeFile(
        `${storagePath}/${file.file_unique_id}.${extention}`,
        result.body
      );
      indexStorage();
      ctx.reply(`Фото получено`);
      return;
    }

    ctx.reply(`Что-то пошло не тка(`);
  } catch (e) {
    console.error(e);
    ctx.reply(`Что-то пошло не тка(`);
  }
});

bot.start();
