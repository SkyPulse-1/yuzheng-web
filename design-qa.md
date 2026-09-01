# 语证首页“数字研究台”设计 QA

## 对照范围

- Source visual truth: `docs/design/yuzheng-home-digital-research-desk-v1.png`
- Implementation desktop screenshot: `artifacts/design-audit/home-digital-research-desk-desktop-pass3.png`
- Implementation mobile screenshots:
  - `artifacts/design-audit/home-digital-research-desk-mobile.png`
  - `artifacts/design-audit/home-digital-research-desk-mobile-bottom.png`
- Side-by-side comparison: `artifacts/design-audit/home-digital-research-desk-comparison-pass2.png`
- Desktop viewport: 1440 × 1024 CSS px, devicePixelRatio 1.5
- Mobile viewport: 390 × 844 CSS px, devicePixelRatio 1.5
- Source pixels: 1487 × 1058
- Desktop implementation pixels: 1440 × 1024
- Density normalization: source visual was normalized to 1440 × 1024 and placed beside the 1440 × 1024 implementation capture.
- State: logged-in home route with no recent evidence rows, therefore the approved long-march example is visible.

## Full-view comparison

The side-by-side pass confirms the intended information hierarchy: compact wordmark navigation, left editorial headline, one primary and one secondary action, right-side layered research desk, front evidence card, and one shared three-column evidence-principles strip. The implementation is slightly more compact than the concept image so it remains stable with live Chinese copy and responsive browser chrome, but it preserves the same major-region proportions and reading order.

## Focused evidence

Focused region checks were completed on the right research desk and the mobile lower viewport because the full-view comparison could not show paper-edge quality, evidence-card spacing, or mobile tap targets clearly enough. The final desktop capture shows a real generated document backdrop asset behind live HTML evidence content. The mobile bottom capture shows the full research card and all three principles without overlap or horizontal overflow.

## Required fidelity surfaces

- Fonts and typography: Chinese Songti fallbacks preserve the editorial display hierarchy; sans-serif UI copy remains readable. Headline wrapping matches the approved two-line structure, body copy is 15–17px with generous line height, and small metadata does not truncate essential source information.
- Spacing and layout rhythm: the desktop uses a 42/58-style asymmetrical hero, a restrained CTA pair, and one shared principles surface. The mobile layout becomes one column, maintains 18px page margins, and keeps the primary action at 54px height.
- Colors and visual tokens: warm ivory, ink black, evidence gold, muted sage and subtle indigo-derived focus states map to `DESIGN.md`. Gold is not used as the only indicator for small text.
- Image quality and asset fidelity: the initial CSS-drawn paper layers were replaced with `public/assets/research-document-backdrop-alpha.png`, a generated raster asset with real alpha transparency. No fake logo, SVG illustration, emoji, placeholder, or generic AI imagery is present.
- Copy and content: all approved homepage copy is present. The page contains no Prompt/提示词 language, chat-bot framing, fabricated analytics, or unrelated feature inventory.
- Icons: the target does not require a standalone icon family; no improvised icon glyphs are used for core actions.
- Accessibility and interaction: semantic navigation/regions/headings are present; CTA and progress controls are keyboard-addressable; the carousel uses `aria-live="polite"`; reduced-motion users do not receive automatic transitions or pointer glow.

## Interaction and runtime checks

- “进入工作区” resolves to `/dashboard` for the authenticated state.
- “了解证据原则” updates the route to `/#principles` and reveals the principles region.
- Empty recent-evidence state renders the long-march sample.
- Multi-card switching, source-link formation and reduced-motion behavior are covered by `tests/components/recent-evidence-carousel.test.tsx`.
- Desktop viewport has no clipped persistent controls.
- Mobile document width is 375px inside a 390px viewport, with `scrollWidth = 375`; no horizontal overflow.
- Browser console warning/error check returned no entries.

## Comparison history

### Pass 1 — blocked

- [P2] The two academic document layers were drawn with CSS surfaces and repeated lines instead of using a real visual asset.
- Impact: the backdrop lacked the paper texture and evidence-path detail visible in the approved concept, and violated the asset-fidelity rule.
- Fix: generated a dedicated academic-document backdrop, produced a true 32-bit alpha PNG, replaced the CSS paper elements with a Next.js image, and added a restrained drop shadow.

### Pass 2 — passed

- Post-fix evidence: `artifacts/design-audit/home-digital-research-desk-desktop-pass3.png`
- The checkerboard matte is absent in the browser render, document edges are clean, the live evidence card remains readable, and the source-to-conclusion backdrop matches the approved art direction.
- No actionable P0, P1 or P2 findings remain.

## Follow-up polish

- [P3] The live implementation is intentionally slightly more compact than the concept image to protect real-content wrapping at 1024px-wide desktop layouts.

final result: passed
