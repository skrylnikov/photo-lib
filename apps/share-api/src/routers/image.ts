import { router, publicProcedure } from '../trpc';

import { prisma } from 'database';

export const imageRouter = router({
  list: publicProcedure.query(async () => {
    console.log('list');
    
    const list = await prisma.image.findMany({
      include: {
        files: true,
        Thumbnail: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return list.map(({ Thumbnail, exif, ...image }) => ({
      ...image,
      date: image.date.toISOString(),
      thumbnails: Thumbnail,
    }));
  }),
});

