# Journal UI assets

The UI adapts the user-selected [Spark Journal reference](https://spark-journal.kddi.com/) to the existing public-event archive. The archive's routes, content, source records, and submission API are retained. KDDI branding, stories, and article photography are not used.

## Source-derived interface assets

- `public/icons/`: the reference site's existing decorative spark geometry and small interface icons, extracted from the public page/CSS; color variants use the archive's navy and pastel palette.
- `public/images/bg-grad-01.webp` through `bg-grad-03.webp`: small source background textures from `/assets/img/common/`; retained for reference fidelity.
- The hero gradient and topic grid use the exact reference CSS colors and pattern. The star uses the source SVG geometry as a mask.
- `public/fonts/geist.woff2`, `montserrat.woff2`: Latin variable subsets served locally. Their SIL Open Font License files are included alongside them. Chinese uses PingFang SC / Microsoft YaHei / the system sans-serif fallback.

## Generated editorial illustrations

These images were generated with the built-in ImageGen tool. They are visibly labeled “示意配图” and do not represent a real institution, event scene, person, report, or piece of evidence. They remain separate from the Markdown content and source lists.

- `public/images/library.webp`: empty contemporary university library, pale wood shelves and desks, soft daylight, cream/navy/muted peach; wide photographic composition; no people, text, logos, or recognizable institution.
- `public/images/documents.webp`: overhead archival research desk, blank papers and folder, pen, magnifying glass, closed books; soft daylight, navy/pale pink/lilac; no people, readable text, logos, or real evidence.
- `public/images/campus.webp`: anonymous contemporary pale-stone academic building and tree-lined path, soft daylight, pale blue/lavender, no people, signs, logos, or identifiable institution.

The generated files were inspected and converted to WebP at approximately 1200 × 675. Their assignment to event cards is defined in `src/lib/journal.ts`.

## Current JUNNI theme (2026-10-24)

The current interface follows the user-selected [JUNNI website](https://junni.co.jp/): charcoal tile grid, warm white typography, lime reverse scene, transparent header and circular controls. Earlier Spark assets above are retained as historical provenance; they do not describe the current theme. The archive keeps its own brand and copy. Its 3D artwork is made from real page text in CSS, rather than an image of the reference brand.

`public/icons/dots.svg` uses the MIT-licensed [Tabler dots icon](https://github.com/tabler/tabler-icons/blob/main/icons/outline/dots.svg). The locally served fonts retain the SIL licenses listed above. The generated editorial images remain illustrative and are cropped into the compact event cards.
