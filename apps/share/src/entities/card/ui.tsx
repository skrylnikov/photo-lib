'use client'

import { useMemo, useState, useRef, useEffect } from "react";
import { ILayoutBox } from 'photo-flex-layout';
import { Image as IImage } from '@pl/database';
import { css } from "styled-system/css";


interface IProps {
  i: number;
  data: any;
  box: ILayoutBox;
  onClick: (id: string) => void;
}

export const Card = ({ data, box, i, onClick }: IProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);

  const height = box.height;
  const width = box.width;

  const previewJXL = useMemo(() => data.thumbnail.find((x: any) => x.size === 'preview' && x.format === 'jxl'), [data]);
  const previewHeic = useMemo(() => data.thumbnail.find((x: any) => x.size === 'preview' && x.format === 'heif'), [data]);
  const previewAvif = useMemo(() => data.thumbnail.find((x: any) => x.size === 'preview' && x.format === 'avif'), [data]);
  const previewWebp = useMemo(() => data.thumbnail.find((x: any ) => x.size === 'preview' && x.format === 'webp'), [data]);
  const fullJXL = useMemo(() => data.thumbnail.find((x: any) => x.size === 'full' && x.format === 'jxl'), [data]);
  const fullHeic = useMemo(() => data.thumbnail.find((x: any) => x.size === 'full' && x.format === 'heif'), [data]);
  const fullAvif = useMemo(() => data.thumbnail.find((x: any) => x.size === 'full' && x.format === 'avif'), [data]);
  const fullWebp = useMemo(() => data.thumbnail.find((x: any) => x.size === 'full' && x.format === 'webp'), [data]);
  const original = data.files[0];

  const full = fullJXL || fullHeic || fullAvif || fullWebp || original;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.1,
      }
    );

    const currentRef = cardRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
      <a
        ref={cardRef}
        className={css({
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transform: 'translateY(30px)',
          transition: 'opacity 0.6s ease-out, transform 0.4s ease-out, filter 0.6s ease-out',
          willChange: 'opacity, transform, filter',
          filter: 'blur(10px)',
          '&[data-visible="true"]': {
            opacity: 1,
            transform: 'translateY(0)',
            filter: 'blur(0px)',
          },
        })}
        style={{
          top: box.top,
          left: box.left,
          width,
          height,
          backgroundColor: data.LightMuted ?? 'rgba(0,0,0,0.1)',
        }}
        key={data.id}
        data-visible={isVisible}
        target="_blank"
        rel="noreferrer"
        href={`/s3/photo-lib-share/${full.path}`}
        data-id={data.id}
        data-pswp-width={full.width}
        data-pswp-height={full.height}
        data-pswp-webp-src={fullWebp ? `/s3/photo-lib-share/${fullWebp.path}` : undefined}
        data-pswp-avif-src={fullAvif ? `/s3/photo-lib-share/${fullAvif.path}` : undefined}
        data-pswp-heic-src={fullHeic ? `/s3/photo-lib-share/${fullHeic.path}` : undefined}
        data-pswp-jxl-src={fullJXL ? `/s3/photo-lib-share/${fullJXL.path}` : undefined}
      >
        <picture >
          {previewJXL && <source srcSet={`/s3/photo-lib-share/${previewJXL.path}`} type="image/jxl" />}
          {previewHeic && <source srcSet={`/s3/photo-lib-share/${previewHeic.path}`} type="image/heif" />}
          {previewAvif && <source srcSet={`/s3/photo-lib-share/${previewAvif.path}`} type="image/avif" />}
          {previewWebp && <source srcSet={`/s3/photo-lib-share/${previewWebp.path}`} type="image/webp" />}
          <img
            src={`/s3/photo-lib-share/${original.path}`}
            loading="lazy"
            height={height}
            width={width}
            alt=""
          />
        </picture>
      </a>
  );
};
