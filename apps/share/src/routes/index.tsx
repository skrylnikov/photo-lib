"use client";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { photoFlexLayout } from "photo-flex-layout";
import useResizeObserver from "use-resize-observer";
import PhotoSwipeLightbox from "photoswipe/lightbox";
// import type {P} from 'photoswipe'
import "photoswipe/style.css";

import { css } from "../../styled-system/css";

import { prisma } from "@pl/database";
import { useEffect, useMemo, useRef } from "react";

import { Card } from "../entities/card";

const getPhotoList = createServerFn().handler(async () => {
  const list = await prisma.image.findMany({
    include: {
      Thumbnail: true,
      files: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  return list
    .filter((item) => item.Thumbnail.length > 0)
    .map((item) => ({
      id: item.id,
      filename: item.filename,
      date: item.date,
      thumbnail: item.Thumbnail,
      files: item.files,
    }));
});

export const Route = createFileRoute("/")({
  component: Home,
  loader: () => getPhotoList(),
  ssr: false,
});

const defaultWidth = "window" in globalThis ? window.innerWidth - 50 : 1000;
const defaultHeight = "window" in globalThis ? window.innerHeight - 100 : 1000;

function Home() {
  const photoList = Route.useLoaderData();

  const resize = useResizeObserver();

  const width = resize.width ?? defaultWidth - 16;

  console.log(width);

  const layout = useMemo(
    () =>
      photoFlexLayout({
        targetRowHeight: 280,
        containerWidth: width,
        boxSpacing: 2,
        items: photoList
          .filter((photo) => photo.thumbnail.length > 0)
          .map((photo) => ({
            width: photo.thumbnail[0].width,
            height: photo.thumbnail[0].height,
          })),
      }),
    [photoList, width]
  );

  console.log(photoList);

  console.log(layout);

  const onClick = () => {
    console.log("click");
  };

  useEffect(() => {
    let lightbox = new PhotoSwipeLightbox({
      gallery: "#gallery",
      children: "a",
      pswpModule: () => import("photoswipe"),
    });
    lightbox?.init();

    // Parse data-pswp-webp-src attribute
    lightbox.addFilter("itemData", (itemData, index) => {
      const webpSrc = itemData.element?.dataset.pswpWebpSrc;
      if (webpSrc) {
        itemData.webpSrc = webpSrc;
      }
      return itemData;
    });

    // use <picture> instead of <img>
    lightbox.on("contentLoad", (e) => {
      const { content } = e;
      const dataset = content.data?.element?.dataset;

      const sources = [
        { type: "image/jxl", src: dataset?.pswpJxlSrc },
        { type: "image/heic", src: dataset?.pswpHeicSrc },
        { type: "image/avif", src: dataset?.pswpAvifSrc },
        { type: "image/webp", src: dataset?.pswpWebpSrc },
      ].filter((s) => s.src); // Filter out formats that don't have a source

      // Check if there are any alternative sources or if original src exists
      if (sources.length > 0 && content.data.src) {
        // Prevent the default behavior (loading <img> directly)
        e.preventDefault();

        content.pictureElement = document.createElement("picture");

        // Add <source> elements for alternative formats
        sources.forEach((sourceData) => {
          const sourceEl = document.createElement("source");
          sourceEl.srcset = sourceData.src!;
          sourceEl.type = sourceData.type;
          content.pictureElement!.appendChild(sourceEl);
        });

        // Add fallback <source> element (e.g., JPEG)
        const sourceFallback = document.createElement("source");
        sourceFallback.srcset = content.data.src;
        // Infer type from src or assume jpeg/png as common fallbacks
        // For simplicity, assuming JPEG here. You might need more robust logic
        // if your original images aren't always JPEG.
        const fallbackType = content.data.src.endsWith('.png') ? 'image/png' : 'image/jpeg';
        sourceFallback.type = fallbackType;
        content.pictureElement.appendChild(sourceFallback);


        // Create the <img> element as the final fallback and for dimensions
        content.element = document.createElement("img");
        (content.element as HTMLImageElement).src = content.data.src; // Fallback src
        content.element.setAttribute("alt", content.data.alt || "");
        content.element.className = "pswp__img";
        content.pictureElement.appendChild(content.element);

        content.state = "loading";

        // Image loading/error handling
        if (
          content.element instanceof HTMLImageElement &&
          content.element.complete
        ) {
          content.onLoaded();
        } else {
          content.element.onload = () => {
            content.onLoaded();
          };
          content.element.onerror = () => {
            content.onError();
          };
        }
      }
      // If no alternative sources, let PhotoSwipe handle the default <img> loading
    });

    // by default PhotoSwipe appends <img>,
    // but we want to append <picture>
    lightbox.on("contentAppend", (e) => {
      const { content } = e;
      if (content.pictureElement && !content.pictureElement.parentNode) {
        e.preventDefault();
        content.slide?.container?.appendChild(content.pictureElement);
      }
    });

    // for next/prev navigation with <picture>
    // by default PhotoSwipe removes <img>,
    // but we want to remove <picture>
    lightbox.on("contentRemove", (e) => {
      const { content } = e;
      if (content.pictureElement && content.pictureElement.parentNode) {
        e.preventDefault();
        content.pictureElement.remove();
      }
    });

    // lightbox.addFilter("itemData", (itemData, index) => {
    //   const data = photoList[index];
    //   console.log(itemData);

    //   return {
    //     ...itemData,
    //     element: undefined,
    //     src: undefined,
    //     msrc: undefined,
    //     html: `<picture>
    //       ${data.thumbnail
    //         .filter((x) => x.size === "full")
    //         .map(
    //           (x: any) =>
    //             `<source srcSet="/s3/photo-lib-share/${x.path}" type="image/${x.format}" />`
    //         )
    //         .join("")}
    //       <img
    //         src="/s3/photo-lib-share/${data.files[0].path}"
    //         height=${data.thumbnail[0].height}
    //         width=${data.thumbnail[0].width}
    //         alt=""
    //       />
    //     </picture>
    //   `,
    //   };
    // });

    return () => {
      lightbox?.destroy();
      // @ts-ignore
      lightbox = null;
    };
  }, []);

  return (
    <div
      ref={resize.ref}
      className={css({
        margin: "8px",
        height: "100vh",
      })}
    >
      <div
        id="gallery"
        className={css({
          position: "relative",
        })}
      >
        {layout.boxes.map((x, i) => (
          <Card key={i} data={photoList[i]} box={x} onClick={onClick} i={i} />
        ))}
      </div>
    </div>
  );
}
