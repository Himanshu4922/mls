# mls-v3-frontend

HomeAtlas — GTA real estate portal. Next.js 16 App Router frontend for the
**mls-v2** Django/DRF backend, built to the **HomeAtlasUI** design reference.

## Setup

```bash
cp .env.example .env.local     # point API_BASE_URL at the mls-v2 backend
npm install
npm run dev
```

The app renders without a backend — every data-backed section degrades to an
explicit "unavailable" state rather than showing placeholder numbers.

## How the three repos relate

| Repo | Role |
|---|---|
| `../HomeAtlasUI` | Design reference (React + Vite prototype). UI/UX source of truth. **Read-only.** |
| `../mls-v2` | Working Django/DRF backend + Next frontend. API + business-logic source of truth. **Read-only.** |
| this repo | The production app: HomeAtlasUI's design on mls-v2's APIs. |

## Docs

| File | What it covers |
|---|---|
| [docs/01-RECON.md](docs/01-RECON.md) | Inventory of both reference repos; UX issues found in the design prototype |
| [docs/02-MAPPING.md](docs/02-MAPPING.md) | Field-level mapping of every UI need to a backend endpoint |
| [docs/03-ARCHITECTURE.md](docs/03-ARCHITECTURE.md) | Decisions, design system, a11y baseline |
| [docs/API_GAPS.md](docs/API_GAPS.md) | **Backend work required**, with proposed contracts and priorities |
| [docs/MASTER_PROMPT.md](docs/MASTER_PROMPT.md) | Original build brief |

## Architecture

```
app/
  (site)/          Pages with navbar + footer chrome
  (map)/           Full-bleed map layout (no footer)
  api/             Route handlers proxying mls-v2 (auth cookies, valuation, watched)
components/
  ui/              Primitives: Button, Badge, Field, Modal, States, Section, Pagination
  layout/          Navbar, Footer, AnnouncementBar, Logo
  property/        PropertyCard, Gallery, ListingFilters, InquiryForm, SaveButton
  valuation/       ValuationWizard
  market/          TrendChart (SVG, no chart library)
  providers/       AuthProvider, WatchedProvider
lib/
  api/             Typed client + per-domain endpoint modules + RESO mappers
  types/           backend.ts (DRF shapes) / domain.ts (UI shapes)
  utils/           Formatters, URL search-param helpers
```

**Key conventions**

- **`lib/api/mappers.ts` is the only place that knows RESO field names.** Components
  consume `PropertySummary` / `PropertyDetail`; a backend rename is a one-file fix.
- **DRF serializes `DecimalField` as a string** — money and area fields are typed
  `string | null` in `backend.ts` and converted at the mapper boundary.
- **Filters live in the URL**, so searches are shareable and the back button works.
- **JWTs live in httpOnly cookies**, set by `app/api/auth/*` route handlers. Page
  scripts never see a token; Server Components resolve the user during render.
- **Nothing is invented.** When the backend cannot supply a field the UI renders an
  em-dash or a labelled unavailable state, and the gap is recorded in `API_GAPS.md`.

## Design system

Tokens live in `app/globals.css` under `@theme`, extracted from HomeAtlasUI and
normalized (the prototype mixed `#1B2E4B` and `#1e3a5f` for the same role; v3 uses one
navy). Semantic names — `navy`, `gold`, `ink`, `ink-muted`, `line`, `surface-alt` — plus
a type scale (`text-display` … `text-caption`) replace ad-hoc `text-[32px]` values.

Accessibility work absent from the prototype and added here: real `<Link>` navigation,
visible focus rings, modal focus trap + Escape + scroll lock, `aria-pressed` on toggles,
accessible names on icon buttons, a screen-reader data table behind every chart,
`prefers-reduced-motion` handling, and a skip-to-content link.

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build (runs typecheck)
npm run lint    # eslint
```

## Known limitations

Listing filters for price, bedrooms and property type are applied **client-side** over a
300-row window, because `properties/filter/` has no such query params. The UI says so
when the window is exhausted. See **G1** in [docs/API_GAPS.md](docs/API_GAPS.md) — it is
the highest-value backend change.

Market trends chart **list** prices, not sold prices: the backend's `trends/` endpoint
computes from active listings only and returns its own disclaimer, which the page shows
verbatim. Days-on-market and sale-to-list ratio need `close_price` (**G3**).
