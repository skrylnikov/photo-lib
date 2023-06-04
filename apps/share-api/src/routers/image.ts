import { router, publicProcedure } from '../trpc';

import { prisma } from 'database';

export const imageRouter = router({
  list: publicProcedure.query(async () => {
    const list = await prisma.image.findMany({
      include: {
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
