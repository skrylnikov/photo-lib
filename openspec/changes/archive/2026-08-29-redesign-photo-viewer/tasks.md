## 1. Shared film presentation

- [x] 1.1 Extract reusable film-surface tokens/primitives from the public film-line styles, preserving the main gallery's current background, border, radius and responsive geometry.
- [x] 1.2 Replace stretch-scaled mask perforation with shared fixed-height top/bottom perforation strips and proportional desktop/mobile values.
- [x] 1.3 Verify that the main gallery layout, justified frame sizes, order and no-horizontal-overflow behavior remain unchanged.

## 2. Viewer composition and metadata

- [x] 2.1 Restructure viewer markup so the intrinsic image window is followed by the metadata rail and then the lower perforation.
- [x] 2.2 Render album title, frame number and localized effective date/time in the rail; preserve `alt` as accessible image/dialog text without rendering the filename as a separate visual caption.
- [x] 2.3 Add monospaced warm-colored caption styles with controlled wrapping/ellipsis, responsive spacing and sufficient contrast on desktop and mobile.
- [x] 2.4 Verify that the photo keeps its intrinsic aspect ratio and that metadata stays inside the film surface without overlapping the photo, perforation or viewport.

## 3. Origin-linked viewer transitions

- [x] 3.1 Capture the originating film-line rect and measure the full viewer composition after layout, then implement a dependency-free transition that brings the complete line into the viewer before settling on the selected photo.
- [x] 3.2 Implement the reverse close transition for the full composition, keeping the backdrop free of transform/opacity animation and the viewer mounted until animation completion while preserving history/back-button and focus restoration.
- [x] 3.3 Add centered open/close fallbacks for missing or invalid source/target rects and for derivative loading/error surfaces.
- [x] 3.4 Preserve next/previous animation, zoom, swipe, Escape, keyboard focus trap and body scroll lock while the new transitions are active.
- [x] 3.5 Disable transform/FLIP transitions under `prefers-reduced-motion: reduce`, retaining accessible controls and metadata without making the backdrop disappear.

## 4. Verification

- [x] 4.1 Add or update focused web tests for viewer metadata composition, origin fallback, navigation state and reduced-motion-safe behavior where the current test setup can observe them.
- [x] 4.2 Run the share-web test, lint, typecheck and build commands with the repository's required Node 24.13.0 runtime.
- [x] 4.3 Manually verify the viewer from home and album pages on desktop and narrow mobile layouts, including portrait/landscape images, long metadata, keyboard, touch, back-button, close reversal and derivative error states.
- [x] 4.4 Inspect the final diff to confirm that API, DTO, storage, database, public gallery layout and unrelated dirty-worktree changes remain outside the change scope.

## 5. Fullscreen regression fixes

- [x] 5.1 Replace the shared full-image loaded boolean with URL-scoped decode readiness so preview remains visible until the current derivative is decoded and stale completions cannot affect another frame.
- [x] 5.2 Implement a two-phase measured handoff that reveals the settled composition, aligns the animated clone within 0.5 CSS px, and removes it on the following paint while preserving the symmetric close transition.
- [x] 5.3 Derive viewer bottom padding from scaled perforation geometry plus a fixed 4px desktop or 3px mobile metadata gap without changing the upper image-to-metadata spacing.
- [x] 5.4 Add focused regression tests, validate the OpenSpec change, run share-web tests/lint/typecheck/build on Node 24.13.0, and visually verify delayed/cached loading and desktop/mobile handoff behavior.

## 6. Transition visual cleanup

- [x] 6.1 Remove the fullscreen film's outer and inset shadows so neither the settled surface nor animated clone renders extra bands above or below the perforation.
- [x] 6.2 Capture source line and anchor geometry before scroll lock, reserve a stable scrollbar gutter, and hide the original film-line with layout-preserving visibility for the complete clone lifecycle, including close and cancellation cleanup.
- [x] 6.3 Validate the change and run share-web tests/lint/typecheck/build on Node 24.13.0, then visually verify shadow-free open/close transitions, stable layout, one visible film-line, navigation and mobile behavior.

## 7. Exact clone geometry

- [x] 7.1 Interpolate clone padding, border and perforation geometry from the measured source film-line to normalized fullscreen values so progress zero matches the original surface within 0.5 CSS px.
- [x] 7.2 Correct the final clone surface and selected-photo anchor independently so neither the film nor image moves by more than 0.5 CSS px when the clone is removed or reverse animation begins.
- [x] 7.3 Add focused geometry tests, validate OpenSpec, run share-web tests/lint/typecheck/build on Node 24.13.0, and visually measure source, fullscreen and mobile handoffs.
