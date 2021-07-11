import { opendir } from 'fs/promises';
import { resolve, relative } from 'path';



export const deepReadDir = async (inputPath: string) => {
  const result: string[] = [];

  const each = async (path: string) => {
    const dir = await opendir(resolve(inputPath, path));

    for await (const dirent of dir) {
      if (dirent.name.indexOf('.') ===0) {
        continue;
      }
      if (dirent.isFile()) {
        result.push(relative(inputPath, resolve(path, dirent.name)));
      }
      if (dirent.isDirectory()) {
        await each(resolve(path, dirent.name));
      }
    }
  };

  await each(inputPath);

  return result;
};
