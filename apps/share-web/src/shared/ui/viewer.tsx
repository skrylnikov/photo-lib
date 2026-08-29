import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PublicPhoto } from 'types';

import * as filmStyles from '../gallery/film.css.ts';
import * as styles from './viewer.css.ts';
import {
  formatViewerDate,
  isUsableViewerRect,
  isViewerDerivativeReady,
  nextViewerIndex,
  startViewerNavigation,
  viewerFilmEdgeExpansion,
  viewerFilmBottomPadding,
  viewerNestedHandoffCorrection,
  viewerNavigationPerforationOffset,
  viewerOffscreenShift,
  viewerPerforationOffsetForAnchorCenter,
  type ViewerNavigation,
  type ViewerNavigationDirection,
  type ViewerRect,
} from './viewer-state';

type ViewerState = {
  index: number;
  origin: HTMLButtonElement | null;
  source: HTMLElement | null;
  originRect: ViewerRect | null;
  originAnchorRect: ViewerRect | null;
  closing?: boolean;
} | null;
type ViewerHistoryState = { photoViewer?: boolean } | null;

const hasViewerHistory = (): boolean => Boolean((window.history.state as ViewerHistoryState)?.photoViewer);

const readRect = (element: HTMLElement | null): ViewerRect | null => {
  if (!element) return null;
  const { left, top, width, height } = element.getBoundingClientRect();
  const rect = { left, top, width, height };
  return isUsableViewerRect(rect) ? rect : null;
};

const scaleCssLength = (value: string, scale: number): string => {
  const normalized = value.trim();
  if (!normalized || normalized === 'auto' || normalized === 'normal') return normalized;
  return `calc(${normalized} / ${String(scale)})`;
};

const cssVarName = (token: string): string => token.startsWith('var(') ? token.slice(4, -1) : token;

const scaleCssPixels = (value: string, scale: number): string => {
  const pixels = Number.parseFloat(value);
  return Number.isFinite(pixels) ? `${String(pixels / scale)}px` : scaleCssLength(value, scale);
};

const multiplyCssPixels = (value: string, factor: number): string => {
  const pixels = Number.parseFloat(value);
  return Number.isFinite(pixels) ? `${String(pixels * factor)}px` : value;
};

const readGradientGeometry = (backgroundImage: string): { holeWidth: string; step: string } | null => {
  const pixels = [...backgroundImage.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1]));
  if (pixels.length < 4 || !pixels.every(Number.isFinite)) return null;
  return { holeWidth: `${String(pixels[1])}px`, step: `${String(pixels[pixels.length - 1])}px` };
};

const selectDerivative = (photo: PublicPhoto | undefined, largest: boolean) => photo && ['jpeg', 'webp', 'avif', 'jxl', 'heic']
  .map((format) => photo.derivatives
    .filter((item) => item.format === format)
    .sort((left, right) => (largest ? right.width - left.width : left.width - right.width))[0])
  .find(Boolean);

type FilmTransform = {
  translateX: number;
  translateY: number;
  scale: number;
};

const growTransform = (
  line: ViewerRect | null,
  sourceAnchor: ViewerRect | null,
  targetAnchor: ViewerRect | null,
): FilmTransform | null => {
  if (!isUsableViewerRect(line) || !isUsableViewerRect(sourceAnchor) || !isUsableViewerRect(targetAnchor)) return null;
  const scale = targetAnchor.width / sourceAnchor.width;
  const sourceAnchorOffset = {
    left: sourceAnchor.left - line.left,
    top: sourceAnchor.top - line.top,
  };
  return {
    translateX: targetAnchor.left - line.left - sourceAnchorOffset.left * scale,
    translateY: targetAnchor.top - line.top - sourceAnchorOffset.top * scale,
    scale,
  };
};

export const usePhotoViewer = (count: number) => {
  const [state, setState] = useState<ViewerState>(null);
  const originRef = useRef<HTMLButtonElement | null>(null);
  const closingFromButton = useRef(false);

  const open = useCallback((index: number, origin: HTMLButtonElement, source: HTMLElement = origin) => {
    originRef.current = origin;
    const originRect = readRect(source);
    const originAnchorRect = readRect(origin);
    window.history.pushState({ ...window.history.state, photoViewer: true }, '');
    setState({ index, origin, source, originRect, originAnchorRect });
  }, []);

  const close = useCallback(() => {
    setState((current) => current && !current.closing ? { ...current, closing: true } : current);
    if (hasViewerHistory()) {
      closingFromButton.current = true;
      window.history.back();
    }
  }, []);

  const finishClose = useCallback(() => setState(null), []);

  const move = useCallback((delta: number) => {
    setState((current) => current ? { ...current, index: nextViewerIndex(current.index, delta, count) } : current);
  }, [count]);

  useEffect(() => {
    const onPopState = () => {
      if (closingFromButton.current) {
        closingFromButton.current = false;
        return;
      }
      setState((current) => current && !current.closing ? { ...current, closing: true } : current);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (state) return undefined;
    const origin = originRef.current;
    if (!origin) return undefined;
    requestAnimationFrame(() => origin.focus());
    return undefined;
  }, [state]);

  return { state, open, close, finishClose, next: () => move(1), previous: () => move(-1) };
};

export const PhotoViewer = ({
  title,
  photos,
  state,
  onClose,
  onCloseComplete,
  onNext,
  onPrevious,
}: {
  title: string;
  photos: readonly PublicPhoto[];
  state: ViewerState;
  onClose: () => void;
  onCloseComplete: () => void;
  onNext: () => void;
  onPrevious: () => void;
}) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const compositionRef = useRef<HTMLDivElement>(null);
  const viewerWindowRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLImageElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const animatedLineRef = useRef<HTMLElement | null>(null);
  const restoreAnimatedSourceRef = useRef<(() => void) | null>(null);
  const alignHandoffRef = useRef<(() => void) | null>(null);
  const handoffFrameRef = useRef(0);
  const navigationRef = useRef<ViewerNavigation | null>(null);
  const originOpenedRef = useRef(false);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [zoom, setZoom] = useState(1);
  const [decodedFullUrl, setDecodedFullUrl] = useState<string | null>(null);
  const [navigation, setNavigation] = useState<ViewerNavigation | null>(null);
  const [perforationOffset, setPerforationOffset] = useState(0);
  const [settled, setSettled] = useState(false);
  const [handoffGeneration, setHandoffGeneration] = useState(0);
  const [backdropOpaque, setBackdropOpaque] = useState(false);
  const touchStart = useRef<number | null>(null);
  const photo = state ? photos[state.index] : undefined;
  const derivative = selectDerivative(photo, true);
  const previewDerivative = selectDerivative(photo, false);

  const startNavigation = useCallback((direction: ViewerNavigationDirection) => {
    if (!state || state.closing) return;
    const nextNavigation = startViewerNavigation(state.index, direction, photos.length, navigationRef.current);
    if (!nextNavigation) return;
    navigationRef.current = nextNavigation;
    setZoom(1);
    setNavigation(nextNavigation);
  }, [photos.length, state]);
  const nextWithAnimation = useCallback(() => startNavigation('next'), [startNavigation]);
  const previousWithAnimation = useCallback(() => startNavigation('previous'), [startNavigation]);
  const requestClose = useCallback(() => {
    setZoom(1);
    if (!navigationRef.current) {
      setSettled(false);
      setBackdropOpaque(false);
    }
    onClose();
  }, [onClose]);
  const showSettled = useCallback(() => {
    originOpenedRef.current = true;
    setSettled(true);
  }, []);

  useEffect(() => {
    if (!state) originOpenedRef.current = false;
  }, [state]);

  useLayoutEffect(() => {
    const track = compositionRef.current;
    if (!navigation || !track) return undefined;
    let frameId = 0;
    let startedAt: number | null = null;
    const viewportWidth = window.innerWidth;
    const start = navigation.direction === 'next' ? 0 : -viewportWidth;
    const end = navigation.direction === 'next' ? -viewportWidth : 0;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const configuredDuration = Number((window as Window & { __PHOTO_VIEWER_E2E_DURATION__?: number }).__PHOTO_VIEWER_E2E_DURATION__);
    const duration = reducedMotion
      ? 0
      : Number.isFinite(configuredDuration) && configuredDuration > 0 ? configuredDuration : 360;

    const finish = () => {
      setPerforationOffset((current) => viewerNavigationPerforationOffset(
        current,
        viewportWidth,
        navigation.direction,
      ));
      navigationRef.current = null;
      setNavigation(null);
      (navigation.direction === 'next' ? onNext : onPrevious)();
    };
    const animate = (timestamp: number) => {
      startedAt ??= timestamp;
      const elapsed = duration === 0 ? 1 : Math.min(1, (timestamp - startedAt) / duration);
      const progress = 1 - ((1 - elapsed) ** 3);
      const translateX = start + (end - start) * progress;
      track.style.transform = `translateX(${String(translateX)}px)`;
      track.dataset.photoViewerNavigationProgress = String(progress);
      if (elapsed >= 1) finish();
      else frameId = window.requestAnimationFrame(animate);
    };

    track.dataset.photoViewerNavigation = navigation.direction;
    track.style.transform = `translateX(${String(start)}px)`;
    track.dataset.photoViewerNavigationProgress = '0';
    if (duration === 0) {
      track.style.removeProperty('transform');
      delete track.dataset.photoViewerNavigation;
      delete track.dataset.photoViewerNavigationProgress;
      finish();
      return undefined;
    }
    frameId = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frameId);
      track.style.removeProperty('transform');
      delete track.dataset.photoViewerNavigation;
      delete track.dataset.photoViewerNavigationProgress;
    };
  }, [navigation, onNext, onPrevious]);

  useEffect(() => {
    if (!state || state.closing) return undefined;
    requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
      else if (event.key === 'ArrowRight') nextWithAnimation();
      else if (event.key === 'ArrowLeft') previousWithAnimation();
      else if (event.key === 'Tab') {
        const controls = stageRef.current?.closest('[data-photo-viewer="open"]')?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
        if (!controls || controls.length === 0) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextWithAnimation, previousWithAnimation, requestClose, state]);

  useEffect(() => {
    setZoom(1);
  }, [photo?.id]);

  useEffect(() => {
    const image = imageRef.current;
    const url = derivative?.url;
    if (!image || !url || !image.complete || image.naturalWidth <= 0) return undefined;
    let cancelled = false;
    void image.decode().then(() => {
      if (!cancelled) setDecodedFullUrl(url);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [derivative?.url, photo?.id, state]);

  useEffect(() => {
    if (state?.closing) {
      if (!navigationRef.current) {
        setSettled(false);
        setBackdropOpaque(false);
      }
    }
  }, [state?.closing]);

  useLayoutEffect(() => {
    if (handoffGeneration === 0 || !settled || state?.closing || !animatedLineRef.current) return undefined;
    alignHandoffRef.current?.();
    handoffFrameRef.current = window.requestAnimationFrame(() => {
      animatedLineRef.current?.remove();
      animatedLineRef.current = null;
      const restoreAnimatedSource = restoreAnimatedSourceRef.current;
      restoreAnimatedSourceRef.current = null;
      restoreAnimatedSource?.();
      alignHandoffRef.current = null;
    });
    return () => window.cancelAnimationFrame(handoffFrameRef.current);
  }, [handoffGeneration, settled, state?.closing]);

  useEffect(() => {
    if (!state || navigationRef.current || (originOpenedRef.current && !state.closing)) return undefined;
    let cancelled = false;
    let frameId = 0;
    let animationFrameId = 0;
    let animatedLine: HTMLElement | null = null;
    let restoreAnimatedSource: (() => void) | null = null;
    const imageWaitStartedAt = performance.now();
    const imageWaitTimeout = 1600;

    const removeAnimatedLine = () => {
      animatedLine?.remove();
      if (animatedLineRef.current === animatedLine) animatedLineRef.current = null;
      const restoreSource = restoreAnimatedSource;
      restoreAnimatedSource = null;
      if (restoreAnimatedSourceRef.current === restoreSource) restoreAnimatedSourceRef.current = null;
      restoreSource?.();
      alignHandoffRef.current = null;
      animatedLine = null;
    };

    const finish = () => {
      if (cancelled) return;
      if (state.closing) {
        removeAnimatedLine();
        onCloseComplete();
        return;
      }

      showSettled();
      setHandoffGeneration((current) => current + 1);
    };

    const run = () => {
      if (cancelled) return;
      const composition = compositionRef.current;
      if (!composition) {
        if (state.closing) onCloseComplete();
        else {
          setBackdropOpaque(true);
          showSettled();
        }
        return;
      }

      let compositionRect = readRect(composition);
      const sourceRect = state.closing ? readRect(state.source ?? state.origin) : state.originRect;
      const sourceAnchorRect = state.closing
        ? readRect(state.origin) ?? state.originAnchorRect
        : state.originAnchorRect;
      const readLoadedTargetRect = (): ViewerRect | null => {
        const targetImage = imageRef.current;
        const targetImageRect = targetImage?.complete && targetImage.naturalWidth > 0 ? readRect(targetImage) : null;
        const targetPreview = previewRef.current;
        const targetPreviewRect = targetPreview?.complete && targetPreview.naturalWidth > 0 ? readRect(targetPreview) : null;
        return targetImageRect ?? targetPreviewRect;
      };
      const targetLoadedRect = readLoadedTargetRect();
      let targetAnchorRect = targetLoadedRect ?? readRect(viewerWindowRef.current);
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const configuredDuration = Number((window as Window & { __PHOTO_VIEWER_E2E_DURATION__?: number }).__PHOTO_VIEWER_E2E_DURATION__);
      const duration = reducedMotion
        ? 120
        : Number.isFinite(configuredDuration) && configuredDuration > 0 ? configuredDuration : 520;

      if (!state.closing && !targetLoadedRect && performance.now() - imageWaitStartedAt < imageWaitTimeout) {
        frameId = window.requestAnimationFrame(run);
        return;
      }

      if (reducedMotion || !state.source || !state.origin || !compositionRect || !sourceRect || !sourceAnchorRect || !targetAnchorRect) {
        if (state.closing) onCloseComplete();
        else {
          setBackdropOpaque(true);
          showSettled();
        }
        return;
      }

      const source = state.source;
      const initialTargetAnchorRect = targetAnchorRect;
      const filmProperties = [
        filmStyles.filmRadius,
        filmStyles.filmPaddingTop,
        filmStyles.filmPaddingBottom,
        filmStyles.filmPaddingInline,
        filmStyles.filmPerforationHeight,
        filmStyles.filmPerforationHoleWidth,
        filmStyles.filmPerforationStep,
        filmStyles.filmPerforationInset,
      ];
      const sourceStyles = getComputedStyle(source);
      const sourceImage = state.origin.querySelector('img');
      const sourceImageRadius = Number.parseFloat(
        getComputedStyle(sourceImage ?? state.origin).borderTopLeftRadius,
      ) || 3;
      const sourcePerforationStyles = getComputedStyle(source, '::before');
      const sourceGradientGeometry = readGradientGeometry(sourcePerforationStyles.backgroundImage);
      const sourceBorderWidth = Number.parseFloat(sourceStyles.borderTopWidth) || 1;
      const sourcePerforationHeight = Number.parseFloat(sourcePerforationStyles.height);
      const sourcePerforationInset = Number.parseFloat(sourcePerforationStyles.top);
      const sourcePerforationOffset = Number.parseFloat(
        sourceStyles.getPropertyValue(cssVarName(filmStyles.filmPerforationOffset)),
      ) || 0;
      const sourcePerforationHoleWidth = Number.parseFloat(sourceGradientGeometry?.holeWidth ?? '0') || 0;
      const sourcePerforationHoleCenterOffset = sourceRect && sourceAnchorRect && sourcePerforationHoleWidth > 0
        ? sourceRect.left + sourceBorderWidth + sourcePerforationOffset + sourcePerforationHoleWidth / 2
          - (sourceAnchorRect.left + sourceAnchorRect.width / 2)
        : 0;
      const sourcePerforationColor = sourceStyles.getPropertyValue(
        cssVarName(filmStyles.filmPerforationColor),
      ).trim();
      const sourceFilmValues = new Map([
        [filmStyles.filmRadius, sourceStyles.borderRadius],
        [filmStyles.filmPaddingTop, sourceStyles.paddingTop],
        [filmStyles.filmPaddingBottom, sourceStyles.paddingBottom],
        [filmStyles.filmPaddingInline, sourceStyles.paddingLeft],
        [filmStyles.filmPerforationHeight, sourcePerforationStyles.height],
        [filmStyles.filmPerforationHoleWidth, sourceGradientGeometry?.holeWidth ?? '10px'],
        [filmStyles.filmPerforationStep, sourceGradientGeometry?.step ?? '18px'],
        [filmStyles.filmPerforationInset, sourcePerforationStyles.top],
      ]);
      const applyFilmScale = (factor: number) => {
        sourceFilmValues.forEach((value, property) => {
          if (property !== filmStyles.filmRadius) composition.style.setProperty(cssVarName(property), multiplyCssPixels(value, factor));
        });
        const metadataGap = Number.parseFloat(
          getComputedStyle(composition).getPropertyValue(cssVarName(styles.viewerMetadataPerforationGap)),
        );
        if ([sourcePerforationHeight, sourcePerforationInset, metadataGap].every(Number.isFinite)) {
          composition.style.setProperty(
            cssVarName(filmStyles.filmPaddingBottom),
            `${String(viewerFilmBottomPadding(
              sourcePerforationHeight * factor,
              sourcePerforationInset * factor,
              metadataGap,
            ))}px`,
          );
        }
      };

      const fitViewerImage = (): ViewerRect => {
        let fittedRect = initialTargetAnchorRect;
        let imageMaxHeightAdjusted = false;
        const metadataForFit = composition.querySelector<HTMLElement>(`.${styles.metadata}`);
        for (let iteration = 0; iteration < 8; iteration += 1) {
          applyFilmScale(fittedRect.width / sourceAnchorRect.width);
          const viewerStyles = getComputedStyle(composition);
          const maxFilmHeight = Number.parseFloat(viewerStyles.maxHeight);
          const verticalPadding = Number.parseFloat(viewerStyles.paddingTop) + Number.parseFloat(viewerStyles.paddingBottom);
          const borderHeight = Number.parseFloat(viewerStyles.borderTopWidth) + Number.parseFloat(viewerStyles.borderBottomWidth);
          const metadataHeight = readRect(metadataForFit)?.height ?? 0;
          const availableImageHeight = maxFilmHeight - verticalPadding - borderHeight - metadataHeight;
          if (!Number.isFinite(availableImageHeight) || availableImageHeight <= 0) break;
          if (imageMaxHeightAdjusted || fittedRect.height > availableImageHeight + 0.5) {
            composition.style.setProperty('--viewer-image-max-height', `${String(availableImageHeight)}px`);
            imageMaxHeightAdjusted = true;
          }
          const measuredRect = readLoadedTargetRect() ?? readRect(viewerWindowRef.current) ?? fittedRect;
          const converged = Math.abs(measuredRect.width - fittedRect.width) <= 0.5
            && Math.abs(measuredRect.height - fittedRect.height) <= 0.5;
          fittedRect = measuredRect;
          if (converged) break;
        }
        return fittedRect;
      };

      targetAnchorRect = fitViewerImage();
      compositionRect = readRect(composition);
      if (!compositionRect || !targetAnchorRect) {
        if (state.closing) onCloseComplete();
        else {
          setBackdropOpaque(true);
          showSettled();
        }
        return;
      }
      const initialScale = targetAnchorRect.width / sourceAnchorRect.width;
      const targetImageRadius = sourceImageRadius * initialScale;
      composition.style.setProperty('--viewer-image-radius', `${String(targetImageRadius)}px`);
      applyFilmScale(initialScale);
      const sourceClone = source.cloneNode(true) as HTMLElement;
      const clone = document.createElement('div');
      clone.className = `${filmStyles.filmSurface} ${styles.viewerFilm}`;
      const rowClone = document.createElement('div');
      rowClone.className = filmStyles.row;
      Array.from(sourceClone.children).forEach((child) => {
        if (child instanceof HTMLButtonElement) rowClone.append(child);
      });
      clone.append(rowClone);
      const targetStyles = getComputedStyle(composition);
      const metadataTemplate = composition.querySelector<HTMLElement>(`.${styles.metadata}`);
      let metadataRect = readRect(metadataTemplate);
      let metadataClone: HTMLElement | null = null;
      let metadataTargetHeight = 0;
      let metadataTargetWidth = 0;
      let metadataTargetPaddingTop = 0;
      let metadataSourcePaddingTop = 0;
      let metadataTypographyFontSize = '';
      let metadataTypographyLetterSpacing = '';
      let metadataTypographyRowGap = '';
      let metadataTypographyColumnGap = '';
      let metadataTypographyLineHeight = '';
      if (metadataTemplate) {
        metadataClone = metadataTemplate.cloneNode(true) as HTMLElement;
        const metadataStyles = getComputedStyle(metadataTemplate);
        metadataTypographyFontSize = metadataStyles.fontSize;
        metadataTypographyLetterSpacing = metadataStyles.letterSpacing;
        metadataTypographyRowGap = metadataStyles.rowGap;
        metadataTypographyColumnGap = metadataStyles.columnGap;
        metadataTypographyLineHeight = metadataStyles.lineHeight;
        metadataTargetHeight = metadataRect ? metadataRect.height / initialScale : 0;
        metadataSourcePaddingTop = Number.parseFloat(metadataStyles.paddingTop) || 0;
        metadataTargetPaddingTop = metadataSourcePaddingTop / initialScale;
        metadataClone.style.height = '0px';
        metadataClone.style.maxHeight = 'none';
        metadataClone.style.overflow = 'hidden';
        metadataClone.style.position = 'absolute';
        metadataClone.style.width = 'auto';
        metadataClone.style.zIndex = '4';
        metadataClone.style.opacity = '0';
        metadataClone.style.paddingTop = '0px';
        clone.append(metadataClone);
      }
      clone.setAttribute('aria-hidden', 'true');
      Object.assign(clone.style, {
        position: 'fixed',
        zIndex: '30',
        left: `${String(sourceRect.left)}px`,
        top: `${String(sourceRect.top)}px`,
        width: `${String(sourceRect.width)}px`,
        maxWidth: 'none',
        maxHeight: 'none',
        margin: '0',
        pointerEvents: 'none',
        transformOrigin: 'top left',
        height: 'auto',
        boxShadow: targetStyles.boxShadow,
        transformStyle: targetStyles.transformStyle,
      });
      clone.dataset.photoViewerAnimation = 'clone';
      filmProperties.forEach((property) => {
        clone.style.setProperty(cssVarName(property), sourceFilmValues.get(property) ?? '');
      });
      clone.style.setProperty(cssVarName(filmStyles.filmPerforationOffset), `${String(sourcePerforationOffset)}px`);
      clone.style.setProperty(cssVarName(filmStyles.filmPerforationColor), sourcePerforationColor);
      const sourceWasHidden = source.classList.contains(styles.sourceFilmHidden);
      let sourceRestored = false;
      restoreAnimatedSource = () => {
        if (sourceRestored) return;
        sourceRestored = true;
        if (!sourceWasHidden) source.classList.remove(styles.sourceFilmHidden);
      };
      restoreAnimatedSourceRef.current = restoreAnimatedSource;
      if (!sourceWasHidden) source.classList.add(styles.sourceFilmHidden);
      document.body.appendChild(clone);
      animatedLine = clone;
      animatedLineRef.current = clone;

      const anchorLabel = state.origin.getAttribute('aria-label');
      const clonedAnchor = [...clone.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.getAttribute('aria-label') === anchorLabel);
      const cloneRect = readRect(clone);
      const clonedAnchorRect = readRect(clonedAnchor ?? null);
      if (!clonedAnchor || !cloneRect || !clonedAnchorRect) {
        removeAnimatedLine();
        if (state.closing) onCloseComplete();
        else {
          setBackdropOpaque(true);
          showSettled();
        }
        return;
      }
      clone.style.left = `${String(sourceAnchorRect.left - (clonedAnchorRect.left - cloneRect.left))}px`;
      clone.style.top = `${String(sourceAnchorRect.top - (clonedAnchorRect.top - cloneRect.top))}px`;
      const alignedCloneRect = readRect(clone);
      const alignedAnchorRect = readRect(clonedAnchor);
      if (!alignedCloneRect || !alignedAnchorRect) {
        removeAnimatedLine();
        if (state.closing) onCloseComplete();
        else {
          setBackdropOpaque(true);
          showSettled();
        }
        return;
      }
      const sourceCloneHeight = alignedCloneRect.height;
      const growLineTransform = growTransform(alignedCloneRect, alignedAnchorRect, targetAnchorRect);
      if (!growLineTransform) {
        removeAnimatedLine();
        if (state.closing) onCloseComplete();
        else {
          setBackdropOpaque(true);
          showSettled();
        }
        return;
      }
      // Use the exact scale of the aligned clone so the final gradients do not
      // drift by a fractional pixel during the handoff.
      applyFilmScale(growLineTransform.scale);
      const settledTargetStyles = getComputedStyle(composition);
      const targetPerforationStyles = getComputedStyle(composition, '::before');
      const targetGradientGeometry = readGradientGeometry(targetPerforationStyles.backgroundImage);
      const targetFilmValues = new Map([
        [filmStyles.filmRadius, scaleCssPixels(settledTargetStyles.borderRadius, growLineTransform.scale)],
        [filmStyles.filmPaddingTop, scaleCssPixels(settledTargetStyles.paddingTop, growLineTransform.scale)],
        [filmStyles.filmPaddingBottom, scaleCssPixels(settledTargetStyles.paddingBottom, growLineTransform.scale)],
        [filmStyles.filmPaddingInline, scaleCssPixels(settledTargetStyles.paddingLeft, growLineTransform.scale)],
        [filmStyles.filmPerforationHeight, scaleCssPixels(targetPerforationStyles.height, growLineTransform.scale)],
        [filmStyles.filmPerforationHoleWidth, scaleCssPixels(targetGradientGeometry?.holeWidth ?? '16px', growLineTransform.scale)],
        [filmStyles.filmPerforationStep, scaleCssPixels(targetGradientGeometry?.step ?? '30px', growLineTransform.scale)],
        [filmStyles.filmPerforationInset, scaleCssPixels(targetPerforationStyles.top, growLineTransform.scale)],
      ]);
      const targetPerforationColor = settledTargetStyles.getPropertyValue(
        cssVarName(filmStyles.filmPerforationColor),
      ).trim();
      const settledCompositionRect = readRect(composition);
      let targetCloneHeight = (settledCompositionRect?.height ?? compositionRect.height) / growLineTransform.scale;
      let targetTranslateXCorrection = 0;
      let targetTranslateYCorrection = 0;
      let targetPaddingTopCorrection = 0;
      // Move the film edge independently from the selected frame. The row
      // receives the inverse local shift so an edge correction cannot move the
      // photo anchor at the handoff.
      let targetFilmEdgeTranslation = 0;
      const targetBorderWidth = Number.parseFloat(settledTargetStyles.borderTopWidth) || 1;
      metadataRect = readRect(metadataTemplate);
      if (metadataClone && metadataRect) {
        metadataTargetWidth = metadataRect.width / growLineTransform.scale;
        metadataTargetHeight = metadataRect.height / growLineTransform.scale;
        metadataTargetPaddingTop = metadataSourcePaddingTop / growLineTransform.scale;
      }
      const cloneButtons = [...rowClone.querySelectorAll<HTMLButtonElement>('button')];
      const selectedButtonIndex = cloneButtons.indexOf(clonedAnchor);
      const viewport = { left: 0, right: window.innerWidth };
      const filmViewport = settledCompositionRect
        ? { left: settledCompositionRect.left, right: settledCompositionRect.left + settledCompositionRect.width }
        : viewport;
      const baseCloneWidth = alignedCloneRect.width;
      let leftFilmExpansion = 0;
      let rightFilmExpansion = 0;
      const neighboringFrameShifts = new Map<HTMLButtonElement, number>();
      const setTransform = (progress: number) => {
        const currentScale = 1 + (growLineTransform.scale - 1) * progress;
        const currentLeftFilmExpansion = leftFilmExpansion * progress;
        const currentRightFilmExpansion = rightFilmExpansion * progress;
        const currentEdgeTranslation = targetFilmEdgeTranslation * progress;
        const interpolateFilmValue = (property: typeof filmStyles.filmPaddingInline): number | null => {
          const sourceValue = Number.parseFloat(sourceFilmValues.get(property) ?? '');
          const targetValue = Number.parseFloat(targetFilmValues.get(property) ?? '');
          return Number.isFinite(sourceValue) && Number.isFinite(targetValue)
            ? sourceValue + (targetValue - sourceValue) * progress
            : null;
        };
        filmProperties.forEach((property) => {
          const sourceValue = Number.parseFloat(sourceFilmValues.get(property) ?? '');
          let targetValue = Number.parseFloat(targetFilmValues.get(property) ?? '');
          if (property === filmStyles.filmPaddingTop) targetValue += targetPaddingTopCorrection;
          if (Number.isFinite(sourceValue) && Number.isFinite(targetValue)) {
            clone.style.setProperty(
              cssVarName(property),
              `${String(sourceValue + (targetValue - sourceValue) * progress)}px`,
            );
          }
        });
        clone.style.setProperty(
          cssVarName(filmStyles.filmPerforationColor),
          progress === 0 ? sourcePerforationColor : targetPerforationColor,
        );
        clone.style.width = `${String(baseCloneWidth + currentLeftFilmExpansion + currentRightFilmExpansion)}px`;
        const rowTranslation = currentLeftFilmExpansion - currentEdgeTranslation;
        rowClone.style.transform = rowTranslation !== 0
          ? `translateX(${String(rowTranslation)}px)`
          : 'none';
        clone.style.transform = `translate(${String((growLineTransform.translateX + targetTranslateXCorrection) * progress - currentLeftFilmExpansion * currentScale + currentEdgeTranslation * currentScale)}px, ${String((growLineTransform.translateY + targetTranslateYCorrection) * progress)}px) scale(${String(currentScale)})`;
        clone.dataset.photoViewerProgress = String(progress);
        clone.style.height = `${String(sourceCloneHeight + (targetCloneHeight - sourceCloneHeight) * progress)}px`;
        // Keep the visible border inset stable while the clone scale changes.
        // Interpolating the unscaled CSS width makes the perforation appear to
        // drift away from the film edge before the fullscreen handoff.
        const visualBorderWidth = sourceBorderWidth + (targetBorderWidth - sourceBorderWidth) * progress;
        const borderWidth = visualBorderWidth / currentScale;
        clone.style.borderWidth = `${String(borderWidth)}px`;
        const currentBorderWidth = Number.parseFloat(getComputedStyle(clone).borderLeftWidth) || borderWidth;
        const currentPerforationHoleWidth = interpolateFilmValue(filmStyles.filmPerforationHoleWidth);
        const currentPerforationOffset = currentPerforationHoleWidth === null
          ? sourcePerforationOffset
          : viewerPerforationOffsetForAnchorCenter(
            readRect(clone),
            readRect(clonedAnchor),
            currentScale,
            currentPerforationHoleWidth,
            currentBorderWidth,
            sourcePerforationHoleCenterOffset * Math.max(0, 1 - progress / 0.98),
          ) ?? sourcePerforationOffset;
        clone.style.setProperty(cssVarName(filmStyles.filmPerforationOffset), `${String(currentPerforationOffset)}px`);
        cloneButtons.forEach((button, index) => {
          if (index === selectedButtonIndex) return;
          const side = index < selectedButtonIndex ? 'left' : 'right';
          const shift = neighboringFrameShifts.get(button) ?? 0;
          button.style.transform = shift === 0 ? 'none' : `translateX(${String(shift * progress)}px)`;
          button.style.transformOrigin = side === 'left' ? 'right center' : 'left center';
        });
        if (metadataClone) {
          const metadataScale = currentScale > 0 ? currentScale : 1;
          const metadataGrowth = 0.68 + 0.32 * progress;
          const targetMetadataHeight = metadataTargetHeight * growLineTransform.scale;
          const targetMetadataWidth = metadataTargetWidth * growLineTransform.scale;
          const targetMetadataPaddingTop = metadataTargetPaddingTop * growLineTransform.scale;
          const scaleTypography = (value: string): string => {
            const pixels = Number.parseFloat(value);
            if (!Number.isFinite(pixels)) return scaleCssLength(value, metadataScale);
            return `${String((pixels * metadataGrowth) / metadataScale)}px`;
          };
          metadataClone.style.fontSize = scaleTypography(metadataTypographyFontSize);
          metadataClone.style.letterSpacing = scaleTypography(metadataTypographyLetterSpacing);
          metadataClone.style.rowGap = scaleTypography(metadataTypographyRowGap);
          metadataClone.style.columnGap = scaleTypography(metadataTypographyColumnGap);
          metadataClone.style.lineHeight = scaleTypography(metadataTypographyLineHeight);
          metadataClone.style.height = `${String((targetMetadataHeight * metadataGrowth) / metadataScale)}px`;
          metadataClone.style.paddingTop = `${String((targetMetadataPaddingTop * metadataGrowth) / metadataScale)}px`;
          const paddingInline = interpolateFilmValue(filmStyles.filmPaddingInline);
          const paddingBottom = interpolateFilmValue(filmStyles.filmPaddingBottom);
          if (paddingInline !== null) {
            if (selectedButtonIndex === cloneButtons.length - 1) {
              metadataClone.style.left = 'auto';
              metadataClone.style.right = `${String(paddingInline)}px`;
            } else {
              metadataClone.style.left = `${String(paddingInline)}px`;
              metadataClone.style.right = 'auto';
            }
          }
          metadataClone.style.width = `${String((targetMetadataWidth * metadataGrowth) / metadataScale)}px`;
          if (paddingBottom !== null) metadataClone.style.bottom = `${String(paddingBottom)}px`;
          metadataClone.style.opacity = String(Math.min(1, progress * 2));
        }
      };
      setTransform(1);
      const targetCloneRect = readRect(clone);
      if (selectedButtonIndex === 0) {
        leftFilmExpansion = viewerFilmEdgeExpansion(
          targetCloneRect,
          filmViewport,
          'left',
          growLineTransform.scale,
        );
      }
      if (selectedButtonIndex === cloneButtons.length - 1) {
        rightFilmExpansion = viewerFilmEdgeExpansion(
          targetCloneRect,
          filmViewport,
          'right',
          growLineTransform.scale,
        );
      }
      cloneButtons.forEach((button, index) => {
        if (index === selectedButtonIndex) return;
        const side = index < selectedButtonIndex ? 'left' : 'right';
        const shift = viewerOffscreenShift(readRect(button), viewport, side);
        if (shift !== 0) neighboringFrameShifts.set(button, shift / growLineTransform.scale);
      });
      const alignTargetHandoff = () => {
        setTransform(1);
        for (let iteration = 0; iteration < 3; iteration += 1) {
          const correction = viewerNestedHandoffCorrection(
            readRect(clone),
            readRect(composition),
            readRect(clonedAnchor),
            readLoadedTargetRect() ?? targetAnchorRect,
            growLineTransform.scale,
          );
          if (!correction) break;
          if (
            Math.abs(correction.translateX) <= 0.5
            && Math.abs(correction.translateY) <= 0.5
            && Math.abs(correction.paddingTop * growLineTransform.scale) <= 0.5
            && Math.abs(correction.height * growLineTransform.scale) <= 0.5
          ) break;
          targetTranslateXCorrection += correction.translateX;
          targetTranslateYCorrection += correction.translateY;
          targetPaddingTopCorrection += correction.paddingTop;
          targetCloneHeight += correction.height;
          setTransform(1);
        }
        for (let iteration = 0; iteration < 3; iteration += 1) {
          const animatedSurface = readRect(clone);
          const settledSurface = readRect(composition);
          if (!animatedSurface || !settledSurface) break;
          let adjusted = false;
          if (selectedButtonIndex === 0) {
            const correction = (animatedSurface.left - settledSurface.left) / growLineTransform.scale;
            if (Math.abs(correction) > 0.01) {
              leftFilmExpansion = Math.max(0, leftFilmExpansion + correction);
              adjusted = true;
            }
          }
          if (selectedButtonIndex === cloneButtons.length - 1) {
            const correction = (settledSurface.left + settledSurface.width - (animatedSurface.left + animatedSurface.width)) / growLineTransform.scale;
            if (Math.abs(correction) > 0.01) {
              rightFilmExpansion = Math.max(0, rightFilmExpansion + correction);
              adjusted = true;
            }
          }
          if (!adjusted) break;
          setTransform(1);
        }
        // Expanding an edge can change the flex row's fractional layout.
        // Re-align the selected photo after that adjustment so only the film
        // edge moves and the photo anchor never jumps at handoff.
        for (let iteration = 0; iteration < 3; iteration += 1) {
          const correction = viewerNestedHandoffCorrection(
            readRect(clone),
            readRect(composition),
            readRect(clonedAnchor),
            readLoadedTargetRect() ?? targetAnchorRect,
            growLineTransform.scale,
          );
          if (!correction) break;
          if (
            Math.abs(correction.translateX) <= 0.01
            && Math.abs(correction.translateY) <= 0.01
            && Math.abs(correction.paddingTop * growLineTransform.scale) <= 0.01
            && Math.abs(correction.height * growLineTransform.scale) <= 0.01
          ) break;
          targetTranslateXCorrection += correction.translateX;
          targetTranslateYCorrection += correction.translateY;
          targetPaddingTopCorrection += correction.paddingTop;
          targetCloneHeight += correction.height;
          setTransform(1);
        }
        for (let iteration = 0; iteration < 3; iteration += 1) {
          const animatedSurface = readRect(clone);
          const settledSurface = readRect(composition);
          if (!animatedSurface || !settledSurface) break;
          const edgeDistance = selectedButtonIndex === 0
            ? animatedSurface.left - settledSurface.left
            : settledSurface.left + settledSurface.width - (animatedSurface.left + animatedSurface.width);
          const correction = (selectedButtonIndex === 0 ? -edgeDistance : edgeDistance) / growLineTransform.scale;
          if (Math.abs(correction) <= 0.01) break;
          targetFilmEdgeTranslation += correction;
          setTransform(1);
        }
        const settledPerforationHoleWidth = Number.parseFloat(targetGradientGeometry?.holeWidth ?? '');
        const settledPerforationOffset = viewerPerforationOffsetForAnchorCenter(
          readRect(composition),
          readLoadedTargetRect() ?? targetAnchorRect,
          1,
          settledPerforationHoleWidth,
          Number.parseFloat(getComputedStyle(composition).borderLeftWidth) || 0,
        );
        if (settledPerforationOffset !== null) {
          setPerforationOffset(settledPerforationOffset);
          composition.style.setProperty(
            cssVarName(filmStyles.filmPerforationOffset),
            `${String(settledPerforationOffset)}px`,
          );
        }
      };
      alignHandoffRef.current = alignTargetHandoff;
      alignTargetHandoff();
      setTransform(state.closing ? 1 : 0);
      if (!state.closing) setBackdropOpaque(true);
      const startedAt = performance.now();
      const animateFrame = (timestamp: number) => {
        if (cancelled) return;
        const elapsed = Math.min(1, (timestamp - startedAt) / duration);
        const eased = 1 - ((1 - elapsed) ** 3);
        setTransform(state.closing ? 1 - eased : eased);
        if (elapsed >= 1) finish();
        else animationFrameId = window.requestAnimationFrame(animateFrame);
      };
      animationFrameId = window.requestAnimationFrame(animateFrame);
    };

    frameId = requestAnimationFrame(run);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(animationFrameId);
      window.cancelAnimationFrame(handoffFrameRef.current);
      removeAnimatedLine();
    };
  }, [onCloseComplete, showSettled, state]);

  if (!state || !photo) return null;
  const isFullFailed = derivative ? failed.has(derivative.url) : true;
  const isPreviewFailed = previewDerivative ? failed.has(previewDerivative.url) : true;
  const hasPreview = Boolean(previewDerivative && !isPreviewFailed);
  const isFullDecoded = isViewerDerivativeReady(decodedFullUrl, derivative?.url);
  const imageStyle = {
    '--viewer-zoom': String(zoom),
  } as CSSProperties;
  const previewStyle = {
    ...imageStyle,
    '--viewer-image-natural-width': `${String(derivative?.width ?? previewDerivative?.width ?? 1)}px`,
    '--viewer-image-aspect-ratio': String(
      (derivative?.width ?? previewDerivative?.width ?? 1) / (derivative?.height ?? previewDerivative?.height ?? 1),
    ),
    aspectRatio: `${String(derivative?.width ?? previewDerivative?.width ?? 1)} / ${String(derivative?.height ?? previewDerivative?.height ?? 1)}`,
  } as CSSProperties;
  const targetPhoto = navigation ? photos[navigation.targetIndex] : undefined;
  const targetPreviewDerivative = selectDerivative(targetPhoto, false);
  const targetLargestDerivative = selectDerivative(targetPhoto, true);
  const renderSection = (sectionPhoto: PublicPhoto, index: number, current: boolean) => {
    const sectionPreview = current ? previewDerivative : targetPreviewDerivative;
    const sectionFull = current ? derivative : targetLargestDerivative;
    const sectionHasPreview = current
      ? hasPreview
      : Boolean(sectionPreview && !failed.has(sectionPreview.url));
    const sectionStyle = current ? previewStyle : {
      '--viewer-zoom': '1',
      '--viewer-image-natural-width': `${String(sectionFull?.width ?? sectionPreview?.width ?? 1)}px`,
      '--viewer-image-aspect-ratio': String(
        (sectionFull?.width ?? sectionPreview?.width ?? 1) / (sectionFull?.height ?? sectionPreview?.height ?? 1),
      ),
      aspectRatio: `${String(sectionFull?.width ?? sectionPreview?.width ?? 1)} / ${String(sectionFull?.height ?? sectionPreview?.height ?? 1)}`,
    } as CSSProperties;

    return <section
      key={sectionPhoto.id}
      className={`${styles.viewerSection} ${navigation ? styles.viewerSectionMoving : ''}`}
      data-photo-viewer-section={current ? 'current' : 'target'}
      data-photo-id={sectionPhoto.id}
    >
      <div ref={current ? viewerWindowRef : undefined} className={styles.viewerWindow}>
        {sectionHasPreview && sectionPreview ? <img
          ref={current ? previewRef : undefined}
          className={`${styles.image} ${styles.imagePreview}`}
          src={sectionPreview.url}
          width={sectionPreview.width}
          height={sectionPreview.height}
          alt={sectionPhoto.alt}
          style={sectionStyle}
          loading="eager"
          decoding="async"
          onError={() => setFailed((failedUrls) => new Set([...failedUrls, sectionPreview.url]))}
        /> : null}
        {current && !isFullFailed && derivative ? <img
          ref={imageRef}
          className={`${styles.image} ${styles.imageFull} ${isFullDecoded ? styles.imageFullLoaded : ''}`}
          src={derivative.url}
          width={derivative.width}
          height={derivative.height}
          alt={sectionPhoto.alt}
          style={imageStyle}
          loading="eager"
          decoding="async"
          onLoad={(event) => {
            const image = event.currentTarget;
            const url = derivative.url;
            void image.decode().then(() => setDecodedFullUrl(url)).catch(() => undefined);
          }}
          onError={() => {
            setDecodedFullUrl((currentUrl) => currentUrl === derivative.url ? null : currentUrl);
            setFailed((failedUrls) => new Set([...failedUrls, derivative.url]));
          }}
        /> : null}
        {current && isFullFailed && !hasPreview
          ? <div className={styles.error} role="status">This frame could not be loaded. The rest of the album remains available.</div>
          : null}
      </div>
      <div className={styles.metadata} aria-label="Frame metadata">
        <span className={styles.metadataTitle}>{title}</span>
        <span className={styles.metadataItem}>Frame {String(index + 1)}</span>
        <span className={`${styles.metadataItem} ${styles.metadataDate}`}>{formatViewerDate(sectionPhoto.capturedAt)}</span>
      </div>
    </section>;
  };
  const sections = navigation && targetPhoto
    ? navigation.direction === 'next'
      ? [renderSection(photo, state.index, true), renderSection(targetPhoto, navigation.targetIndex, false)]
      : [renderSection(targetPhoto, navigation.targetIndex, false), renderSection(photo, state.index, true)]
    : [renderSection(photo, state.index, true)];
  const filmStyle = {
    [cssVarName(filmStyles.filmPerforationOffset)]: `${String(perforationOffset)}px`,
  } as CSSProperties;

  return <div className={`${styles.backdrop} ${backdropOpaque ? styles.backdropSettled : ''} ${state.closing ? styles.backdropClosing : ''}`} data-photo-viewer="open" role="dialog" aria-modal="true" aria-label={`${photo.alt}, full screen viewer`}>
    <div className={styles.toolbar}>
      <button ref={closeRef} className={styles.control} type="button" aria-label="Close viewer" onClick={requestClose}>×</button>
      <span className={styles.title}>{title}</span>
      <span>{String(state.index + 1)} / {String(photos.length)}</span>
      <div>
        <button className={styles.control} type="button" aria-label="Zoom out" onClick={() => setZoom((current) => Math.max(1, current - 0.5))}>−</button>{' '}
        <button className={styles.control} type="button" aria-label="Zoom in" onClick={() => setZoom((current) => Math.min(3, current + 0.5))}>+</button>{' '}
        <button className={styles.control} type="button" aria-label="Previous frame" onClick={previousWithAnimation}>←</button>{' '}
        <button className={styles.control} type="button" aria-label="Next frame" onClick={nextWithAnimation}>→</button>
      </div>
    </div>
    <div
      ref={stageRef}
      className={styles.stage}
      data-photo-viewer-stage="film"
      onPointerDown={(event) => { touchStart.current = event.clientX; }}
      onPointerUp={(event) => {
        if (touchStart.current === null) return;
        const delta = event.clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(delta) > 45) (delta < 0 ? nextWithAnimation : previousWithAnimation)();
      }}
      onDoubleClick={() => setZoom((current) => current === 1 ? 2 : 1)}
      onWheel={(event) => { if (event.ctrlKey || event.metaKey) { event.preventDefault(); setZoom((current) => Math.min(3, Math.max(1, current - event.deltaY / 500))); } }}
    >
      <div
        ref={compositionRef}
        className={`${filmStyles.filmSurface} ${styles.viewerFilm} ${navigation ? styles.viewerFilmMoving : ''} ${!settled && !navigation ? styles.viewerFilmHidden : ''}`}
        style={filmStyle}
        data-photo-viewer-film="track"
      >
        {sections}
      </div>
    </div>
  </div>;
};
