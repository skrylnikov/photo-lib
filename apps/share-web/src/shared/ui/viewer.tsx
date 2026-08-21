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
  viewerFilmBottomPadding,
  viewerNestedHandoffCorrection,
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
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [zoom, setZoom] = useState(1);
  const [decodedFullUrl, setDecodedFullUrl] = useState<string | null>(null);
  const [movement, setMovement] = useState<'next' | 'previous' | null>(null);
  const [settled, setSettled] = useState(false);
  const [handoffGeneration, setHandoffGeneration] = useState(0);
  const [backdropOpaque, setBackdropOpaque] = useState(false);
  const touchStart = useRef<number | null>(null);
  const photo = state ? photos[state.index] : undefined;
  const derivative = photo && ['jpeg', 'webp', 'avif', 'jxl', 'heic']
    .map((format) => photo.derivatives.filter((item) => item.format === format).sort((left, right) => right.width - left.width)[0])
    .find(Boolean);
  const previewDerivative = photo && ['jpeg', 'webp', 'avif', 'jxl', 'heic']
    .map((format) => photo.derivatives.filter((item) => item.format === format).sort((left, right) => left.width - right.width)[0])
    .find(Boolean);

  const animateMove = useCallback((direction: 'next' | 'previous', move: () => void) => {
    setMovement(direction);
    move();
    window.setTimeout(() => setMovement(null), 360);
  }, []);
  const nextWithAnimation = useCallback(() => animateMove('next', onNext), [animateMove, onNext]);
  const previousWithAnimation = useCallback(() => animateMove('previous', onPrevious), [animateMove, onPrevious]);
  const requestClose = useCallback(() => {
    setSettled(false);
    setBackdropOpaque(false);
    setZoom(1);
    onClose();
  }, [onClose]);

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
      setSettled(false);
      setBackdropOpaque(false);
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
    if (!state) return undefined;
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

      setSettled(true);
      setHandoffGeneration((current) => current + 1);
    };

    const run = () => {
      if (cancelled) return;
      const composition = compositionRef.current;
      if (!composition) {
        if (state.closing) onCloseComplete();
        else {
          setBackdropOpaque(true);
          setSettled(true);
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
      const duration = reducedMotion ? 120 : 520;

      if (!state.closing && !targetLoadedRect && performance.now() - imageWaitStartedAt < imageWaitTimeout) {
        frameId = window.requestAnimationFrame(run);
        return;
      }

      if (reducedMotion || !state.source || !state.origin || !compositionRect || !sourceRect || !sourceAnchorRect || !targetAnchorRect) {
        if (state.closing) onCloseComplete();
        else {
          setBackdropOpaque(true);
          setSettled(true);
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
      const sourcePerforationStyles = getComputedStyle(source, '::before');
      const sourceGradientGeometry = readGradientGeometry(sourcePerforationStyles.backgroundImage);
      const sourceBorderWidth = Number.parseFloat(sourceStyles.borderTopWidth) || 1;
      const sourcePerforationHeight = Number.parseFloat(sourcePerforationStyles.height);
      const sourcePerforationInset = Number.parseFloat(sourcePerforationStyles.top);
      const sourcePerforationOffset = Number.parseFloat(
        sourceStyles.getPropertyValue(cssVarName(filmStyles.filmPerforationOffset)),
      ) || 0;
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
        sourceFilmValues.forEach((value, property) => composition.style.setProperty(cssVarName(property), multiplyCssPixels(value, factor)));
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
          setSettled(true);
        }
        return;
      }
      const initialScale = targetAnchorRect.width / sourceAnchorRect.width;
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
      let metadataTargetPaddingTop = 0;
      let metadataSourcePaddingTop = 0;
      if (metadataTemplate) {
        metadataClone = metadataTemplate.cloneNode(true) as HTMLElement;
        const metadataStyles = getComputedStyle(metadataTemplate);
        metadataClone.style.fontSize = scaleCssLength(metadataStyles.fontSize, initialScale);
        metadataClone.style.letterSpacing = scaleCssLength(metadataStyles.letterSpacing, initialScale);
        metadataClone.style.rowGap = scaleCssLength(metadataStyles.rowGap, initialScale);
        metadataClone.style.columnGap = scaleCssLength(metadataStyles.columnGap, initialScale);
        metadataClone.style.lineHeight = metadataStyles.lineHeight;
        metadataTargetHeight = metadataRect ? metadataRect.height / initialScale : 0;
        metadataSourcePaddingTop = Number.parseFloat(metadataStyles.paddingTop) || 0;
        metadataTargetPaddingTop = metadataSourcePaddingTop / initialScale;
        metadataClone.style.height = '0px';
        metadataClone.style.maxHeight = 'none';
        metadataClone.style.overflow = 'hidden';
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
          setSettled(true);
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
          setSettled(true);
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
          setSettled(true);
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
      const targetBorderWidth = Number.parseFloat(settledTargetStyles.borderTopWidth) || 1;
      const normalizedTargetBorderWidth = targetBorderWidth / growLineTransform.scale;
      metadataRect = readRect(metadataTemplate);
      if (metadataClone && metadataRect) {
        metadataTargetHeight = metadataRect.height / growLineTransform.scale;
        metadataTargetPaddingTop = metadataSourcePaddingTop / growLineTransform.scale;
      }
      const finalPerforationOffset = -(alignedCloneRect.left + growLineTransform.translateX) / growLineTransform.scale;
      const setTransform = (progress: number) => {
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
          cssVarName(filmStyles.filmPerforationOffset),
          `${String(sourcePerforationOffset + (finalPerforationOffset - sourcePerforationOffset) * progress)}px`,
        );
        clone.style.setProperty(
          cssVarName(filmStyles.filmPerforationColor),
          progress === 0 ? sourcePerforationColor : targetPerforationColor,
        );
        clone.style.transform = `translate(${String((growLineTransform.translateX + targetTranslateXCorrection) * progress)}px, ${String((growLineTransform.translateY + targetTranslateYCorrection) * progress)}px) scale(${String(1 + (growLineTransform.scale - 1) * progress)})`;
        clone.style.height = `${String(sourceCloneHeight + (targetCloneHeight - sourceCloneHeight) * progress)}px`;
        const borderWidth = sourceBorderWidth + (normalizedTargetBorderWidth - sourceBorderWidth) * progress;
        clone.style.borderWidth = `${String(borderWidth)}px`;
        if (metadataClone) {
          metadataClone.style.height = `${String(metadataTargetHeight * progress)}px`;
          metadataClone.style.paddingTop = `${String(metadataTargetPaddingTop * progress)}px`;
          metadataClone.style.opacity = String(progress);
        }
      };
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
  }, [onCloseComplete, state]);

  if (!state || !photo) return null;
  const isFullFailed = derivative ? failed.has(derivative.url) : true;
  const isPreviewFailed = previewDerivative ? failed.has(previewDerivative.url) : true;
  const hasPreview = Boolean(previewDerivative && !isPreviewFailed);
  const isFullDecoded = isViewerDerivativeReady(decodedFullUrl, derivative?.url);
  const metadataDate = formatViewerDate(photo.capturedAt);
  const imageStyle = {
    '--viewer-zoom': String(zoom),
  } as CSSProperties;
  const previewStyle = {
    ...imageStyle,
    aspectRatio: `${String(derivative?.width ?? previewDerivative?.width ?? 1)} / ${String(derivative?.height ?? previewDerivative?.height ?? 1)}`,
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
        key={photo.id}
        className={`${filmStyles.filmSurface} ${styles.viewerFilm} ${state.closing || !settled ? styles.viewerFilmHidden : ''} ${movement === 'next' ? styles.viewerFilmNext : ''} ${movement === 'previous' ? styles.viewerFilmPrevious : ''}`}
      >
        <div ref={viewerWindowRef} className={styles.viewerWindow}>
          {hasPreview && previewDerivative ? <img
            ref={previewRef}
            className={`${styles.image} ${styles.imagePreview}`}
            src={previewDerivative.url}
            width={previewDerivative.width}
            height={previewDerivative.height}
            alt={photo.alt}
            style={previewStyle}
            loading="eager"
            decoding="async"
            onError={() => setFailed((current) => new Set([...current, previewDerivative.url]))}
          /> : null}
          {!isFullFailed && derivative ? <img
            ref={imageRef}
            className={`${styles.image} ${styles.imageFull} ${isFullDecoded ? styles.imageFullLoaded : ''}`}
            src={derivative.url}
            width={derivative.width}
            height={derivative.height}
            alt={photo.alt}
            style={imageStyle}
            loading="eager"
            decoding="async"
            onLoad={(event) => {
              const image = event.currentTarget;
              const url = derivative.url;
              void image.decode().then(() => setDecodedFullUrl(url)).catch(() => undefined);
            }}
            onError={() => {
              setDecodedFullUrl((current) => current === derivative.url ? null : current);
              setFailed((current) => new Set([...current, derivative.url]));
            }}
          /> : null}
          {isFullFailed && !hasPreview ? <div className={styles.error} role="status">This frame could not be loaded. The rest of the album remains available.</div> : null}
        </div>
        <div className={styles.metadata} aria-label="Frame metadata">
          <span className={styles.metadataTitle}>{title}</span>
          <span className={styles.metadataItem}>Frame {String(state.index + 1)}</span>
          <span className={`${styles.metadataItem} ${styles.metadataDate}`}>{metadataDate}</span>
        </div>
      </div>
    </div>
  </div>;
};
