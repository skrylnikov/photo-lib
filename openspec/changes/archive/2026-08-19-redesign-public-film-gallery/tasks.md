## 1. Public metadata contract

- [x] 1.1 Add the nullable normalized `capturedAt` field to the media data model and create a new SQLite migration without editing existing migrations.
- [x] 1.2 Extract and validate EXIF `DateTimeOriginal` during media processing, falling back to the media creation timestamp when the value is missing or invalid.
- [x] 1.3 Extend the shared public photo type and public router DTO with only the effective capture date and safe frame metadata; add tests proving GPS and unrelated EXIF/storage fields remain private.
- [x] 1.4 Verify legacy media records receive a deterministic `createdAt` fallback through migration or read-time compatibility logic.

## 2. Multi-row film layout

- [x] 2.1 Evaluate the legacy justified-layout and PhotoSwipe dependencies against the current React 19/TypeScript 6 workspace, then add only compatible dependencies or define local adapters.
- [x] 2.2 Implement a justified row layout based on each photo's intrinsic width and height, preserving album order and exposing frame indices.
- [x] 2.3 Replace the directional film primitives with independent left-to-right line surfaces that have no turn, bridge, tail, reel or direction variant.
- [x] 2.4 Replace the home page album sections with separate independent film-line compositions on a shared album backdrop, containing only the API's featured photos.
- [x] 2.5 Replace the album page square grid with the full ordered independent film-line composition while preserving not-found and description states.

## 3. Fullscreen viewer

- [x] 3.1 Implement viewer state and ordered photo navigation shared by home and album pages, including the originating frame for focus restoration.
- [x] 3.2 Integrate the compatible lightbox/viewer adapter with natural derivative dimensions, zoom, close, previous/next controls, keyboard navigation and touch swipe.
- [x] 3.3 Add the analog metadata overlay with localized effective date/time, album frame number and accessible labels.
- [x] 3.4 Add film-linked open, transition and close animations without blocking viewer gestures, loading or focus management.
- [x] 3.5 Implement loading/error/fallback behavior so a failed derivative affects only the current frame and does not make the whole gallery unusable.

## 4. Responsive and accessible presentation

- [x] 4.1 Update responsive layout rules so every independent line remains left-to-right, readable and inside the album backdrop without uncontrolled page-level horizontal overflow.
- [x] 4.2 Add `prefers-reduced-motion` behavior for film lines, viewer transitions and decorative effects while preserving navigation and metadata.
- [x] 4.3 Add keyboard focus trapping/restoration, Escape handling, accessible names, visible controls and mobile back-button behavior for the viewer.
- [x] 4.4 Add the locally bundled handwritten display font and visual tokens/assets with a documented fallback and no remote runtime dependency.

## 5. Verification

- [x] 5.1 Add or update web/API tests for DTO capture dates, EXIF fallback, order preservation, intrinsic aspect ratios, independent line direction, album header count and viewer navigation state.
- [x] 5.2 Run the relevant Node 24.13.0 lint, typecheck and build commands for the affected workspaces after the visual reset.
- [x] 5.3 Manually verify published and unpublished albums, independent LTR lines, the subdued full-album backdrop, title/frame count, portrait/landscape/mixed photos, fullscreen zoom/navigation, EXIF and fallback dates, touch/keyboard access and reduced-motion behavior.
- [x] 5.4 Inspect the final diff to confirm reel, tails, bridges, turns and unrelated runtime, storage, admin and existing dirty-worktree changes were not modified.

## 6. Independent film lines and album backdrop

- [x] 6.1 Remove reel/катушку presentation, directional tails, row bridges, U-turns, zig-zag direction changes and associated state, props and CSS layers from the public gallery.
- [x] 6.2 Render each justified row as an independent left-to-right film line with local perforation/border treatment, ending after its own final frame without a decorative tail.
- [x] 6.3 Add a restrained paper or matte-film backdrop spanning the complete album composition while keeping the surrounding page background light and calm.
- [x] 6.4 Add an accessible album header above the lines with the album name and the number of frames shown in the current home or album composition.
- [x] 6.5 Remove obsolete visual tests and update focused layout tests for no connectors, no horizontal overflow, stable order and correct home-versus-album frame counts.
