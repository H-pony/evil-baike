# Journal UI design QA

final result: passed

## Scope and visual truth

Adapt the UI and interactions of the user-selected [Spark Journal](https://spark-journal.kddi.com/) to the existing 恶人百科 archive. Keep its routes, published Markdown, sources, timeline structure, favorites, and submission workflow.

- Source desktop: `docs/ui-qa/source-desktop.png`; implementation: `docs/ui-qa/home-desktop.png`.
- Source mobile: `docs/ui-qa/source-mobile.png`; implementation: `docs/ui-qa/home-mobile.png`.
- Source menu: `docs/ui-qa/source-menu.png`; implementation: `docs/ui-qa/menu-desktop.png`.
- Source editorial sections: `docs/ui-qa/source-sections.png`; implementation: `docs/ui-qa/sections-desktop.png`.
- Desktop CSS viewport and pixels: 1440 × 960, device scale factor 1.
- Mobile CSS viewport and pixels: 390 × 844, device scale factor 1.
- Reference and implementation exclude browser chrome and have matching pixel dimensions; no density resizing was used for comparison files.
- State: homepage, first featured slide, closed overlays, animation enabled. Menu comparisons show the open drawer. Editorial comparisons use scroll position 950. Archive copy and imagery are intentionally adapted to the project.

Both the reference and implementation were opened in Google Chrome and captured. The in-app computer-use entry points timed out; verification used an isolated Chrome profile through DevTools, without Playwright or changing the user's Chrome profile.

## Findings and comparison history

No actionable P0/P1/P2 findings remain.

1. **P2: menu placement and density.** The first implementation used a centered, two-column modal. The reference uses a narrow right drawer. Evidence: `menu-comparison-before.png`. Changed to a 420 px drawer, compact link rows, a pale backdrop, and a bottom close action. Post-fix evidence: `menu-comparison-after.png` and mobile menu capture. Native dialog focus containment and Escape close were verified.
2. **P2: background overflow.** The large source-derived spark could enlarge the page's horizontal extent. It is now contained in a non-interactive clipped artwork layer. Final browser checks show no page overflow at 320, 360, 390, 768, 1024, and 1440 px.
3. **P2: mobile hero rhythm.** The earlier header was taller and the featured card narrower than the reference. Evidence: `mobile-comparison-before.png`. Reduced the mobile header to 70 px and set the card width to 88 vw. Post-fix evidence: `mobile-comparison.png`; the card now aligns with the reference's main region. Headline line counts vary naturally with the archive's Chinese titles.
4. **P2: feature card proportions.** The first topic pictures were too large and their stagger too small. Evidence: `sections-comparison-before.png`. Adjusted the inset, grid gaps, and vertical stagger to match the square-picture/vertical-title composition. Post-fix evidence: `sections-comparison.png`.

## Required fidelity surfaces

- **Fonts and typography:** Geist for Latin/UI text and Montserrat for editorial labels/counts are served locally as variable WOFF2 files, with licenses. Chinese uses the system sans-serif fallback. Display weights, navy titles, date hierarchy, and wrapping were inspected. Schema category names in entry headers are displayed in Chinese. Shorter archive copy explains remaining line-count differences.
- **Spacing and layout rhythm:** the desktop center card is approximately 680 px wide, with visible neighboring cards, a 16:9 image, and separate date/title area. Rounded white frames, pill controls, grid topics, two-column introduction, vertical section labels, and staggered feature cards were compared. Mobile collapses the sections without clipping controls.
- **Colors and tokens:** source navy `#0e0d6a`, page `#f2f3f8`, grid `#dde0e7`, and pastel category colors are applied throughout. The hero uses the source spark geometry and gradient colors. Status information keeps its semantic colors.
- **Image quality and assets:** three generated editorial photographs are locally stored as WebP at approximately 1200 × 675. Crops and sharpness were inspected. Each card labels the image as illustrative; entry captions keep illustrations separate from source evidence. Decorative marks and small interface icons use the reference's real SVG geometry. Existing anonymous initials avatars retain the archive's established behavior.
- **Copy and content:** real existing event titles, summaries, dates, source counts, and people/organization relationships drive the UI. Topic links lead to existing tag routes. Archive navigation provides real site destinations and the collection methodology. The site retains its own identity and content.

## Full-view and focused evidence

- `desktop-comparison.png`, `mobile-comparison.png`: equal-size source/implementation images in the same comparison canvas.
- `sections-comparison.png`: introduction and feature composition.
- `menu-comparison-before.png`, `menu-comparison-after.png`: drawer correction.
- `header-focus-comparison.png`: readable desktop navigation/control crop.
- `hover-desktop.png`: article hover wash and centered reading CTA.
- `home-full.png`: full rendered homepage.
- `events-desktop.png`, `events-mobile.png`, `entry-desktop.png`, `entry-mobile.png`, `search-desktop.png`, `search-mobile.png`, `menu-mobile.png`: route and overlay evidence.

## Interaction and runtime validation

Browser check records: `checks.json`, `extra-checks.json`, `final-checks.json`, `hover-check.json`, all under `docs/ui-qa/`.

Passed: next/previous carousel, both wrap directions, automatic advance, pause and persisted preference, reduced-motion default, keyboard arrows, touch swipe, image hover CTA, right drawer, Escape close/focus restoration, archive guide, search results and no-result state, Command K, year filter/clear, sorting URL update, favorites add/list/remove, header hide/show on scroll, back to top, required form fields, route rendering, and desktop/mobile overflow checks.

No uncaught client JavaScript exceptions were observed. Local Astro development returns 404 for the existing Cloudflare `/api/views` and `/api/admin/analytics` endpoints; these are recorded in `checks.json`. Live submission delivery and authenticated analytics were outside this UI change and were not submitted or authenticated during QA.

`npm run check` passed with zero errors/warnings and two existing deprecated-copy API hints. Production build generates 55 pages. `git diff --check` passes.

## Implementation checklist

- [x] Compare reference and implementation together at matching viewports.
- [x] Fix and recapture all P2 findings.
- [x] Verify required typography, spacing, colors, images, and copy surfaces.
- [x] Exercise primary interactions and inspect runtime exceptions.
- [x] Preserve archive content and backend integrations.
- [x] Keep local preview available at `http://127.0.0.1:4321/`.

## Follow-up polish

P3: date formatting, counter letterforms, and background spark placement differ slightly from the reference. These do not affect the adopted layout or interactions. The existing server-backed workflows should be checked in the normal Cloudflare environment when deploying.
