## 1. Film-frame interaction

- [x] 1.1 Replace the `.frame` `translateY` hover rule with a CSS-only, pointer-transparent `::after` light-leak layer using a restrained warm gradient, inset highlight and approximately 900ms transition.
- [x] 1.2 Apply the same light-leak state to `:focus-visible` while preserving the existing visible focus outline and button activation behavior.
- [x] 1.3 Update the reduced-motion rule so hover/focus states remain distinguishable but the light-leak transition is disabled; confirm no transform, rotation, scale or external shadow remains on the frame.
- [x] 1.4 Add a subtle approximately 3px radius to the frame, photo and inner light-leak boundary while preserving the focus outline.

## 2. Verification

- [x] 2.1 Verify that the React markup, inline frame dimensions, justified-row layout, aspect ratios, order and horizontal overflow behavior are unchanged.
- [x] 2.2 Run the affected web lint, typecheck and build checks with the repository-supported Node runtime.
- [x] 2.3 Manually verify the public home and album gallery on desktop and mobile: pointer hover, keyboard focus, click-through to viewer and non-hover reset.
- [ ] 2.4 Manually verify `prefers-reduced-motion: reduce` and confirm the effect remains readable without animation in Chromium and Safari/iPhone.
