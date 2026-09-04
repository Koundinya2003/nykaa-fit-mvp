# Nykaa Fit — MVP

A Nykaa Fashion–style shopping prototype with **Nykaa Fit**: personalised size guidance on the
product page, built to *reduce uncertainty before you buy*.

**This is a product experiment, not a shipped feature.** The hypothesis under test:

> For shoppers who are already interested in a fashion product, uncertainty about fit can reduce
> purchase confidence and contribute to size-related returns. Personalised fit guidance **may**
> increase purchase conversion while reducing size-related returns.

Nothing in this build demonstrates that it does. The app's job is to emit the events an analysis
would consume, and the Fit Lab reports "not enough data" rather than inventing a result.

Store journey: **Home → Category → Listing → Product Detail → Size Selection → Add to Bag → Bag → Checkout**

Nykaa Fit journey: **Product → Find My Fit → height, weight, gender, preferred fit → recommendation
→ why → Select size → Add to Bag**

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-checks (`tsc -b`) then builds to `dist/` |
| `npm run preview` | Serves the production build |
| `npm run typecheck` | Types only, no emit |
| `npm test` | Unit tests (vitest) — engine, storage, analytics |

## Stack

- **React 19 + TypeScript**, built with **Vite 7**
- **react-router-dom 7** for client-side routing
- **React Context + `useReducer`-free state**, persisted to `localStorage` — no Redux
- **Hand-written CSS** with a token layer (`src/styles/tokens.css`); no UI framework

## Routes

| Path | Page |
| --- | --- |
| `/` | Home |
| `/c/:categoryId` | Listing — `women`, `men`, `dresses`, `tops`, `jeans`, `shoes` |
| `/search?q=` | Search results |
| `/p/:productId` | Product detail |
| `/bag` | Shopping bag |
| `/wishlist` | Wishlist |
| `/checkout` | Order review + confirmation (no payment) |
| `/fit-lab` | Internal: experiment bucket, metrics, raw event log |
| `*` | Not found |

Listing pages also accept `?sub=`, `?gender=`, `?tag=`, `?brand=`, `?size=`, `?color=`,
`?pmin=`/`?pmax=`, `?disc=`, `?rating=` and `?sort=`. Filter and sort state lives entirely
in the URL, so every filtered view is shareable and the back button works through a
filtering session.

## Project structure

```
src/
  components/   Header, SearchBar, Navigation, ProductCard, ProductGrid, FilterPanel,
                SortDropdown, ProductGallery, SizeSelector, SizeChart, ProductInfo,
                Reviews, RecommendationCarousel, BagItem, Footer, …
  pages/        Home, Listing, Search, ProductDetail, Bag, Wishlist, Checkout,
                FitLab, NotFound
  context/      ShopContext — bag, wishlist, toasts (localStorage-backed)
  data/         products (60), categories, reviews, sizeCharts, brandSizing,
                palette, homeContent
  features/
    nykaa-fit/  The whole fit feature — see below
  hooks/        useLocalStorage, useProductFilters, useDebounce
  types/        Domain types
  utils/        catalogue (filter/sort/search), format (pricing), color
  styles/       tokens, global, layout, home, product, listing, pdp, bag, fit-lab
```

## Nykaa Fit

```
src/features/nykaa-fit/
  components/   FitBlock (orchestrator), FitCTA, FitProfileForm, FitResult,
                FitProfileSummary, SizeComparison, FitPanel, FitConfidence
  engine/       fitEngine, scoring, bodyModel   ← pure, no React, no network
  analytics/    fitAnalytics — pluggable sinks, localStorage by default
  experiment/   variant assignment + useVariant
  utils/        fitStorage, eligibility, useFitProfile, useFitRecommendation
  types/        fitTypes
  styles/       nykaa-fit.css
```

**Scope.** Enabled only for women's dresses (`utils/eligibility.ts`). Every other product and the
control bucket render the existing PDP untouched.

**How the recommendation works.** Deterministic and offline — no AI API, no model, no randomness.

```
estimated body  (height, weight, gender, optional age / body shape)
  + product fit class     slim +0.8″ · regular 0 · relaxed −0.8″ · oversized −1.6″
  + preferred fit         slim −0.7″ · regular 0 · relaxed +0.9″
  + brand sizing          runs small / true to size / runs large
  ────────────────────────────────────────────────────────────────
  = effective body → nearest size in *this brand's* chart
```

Body estimation uses a girth index, √(kg / m): approximating the torso as a cylinder of roughly
constant density, circumference scales with the square root of mass over height. Coefficients are
anchored to a stated reference body, so the behaviour is inspectable rather than magic. It is a
transparent heuristic, presented as an estimate — never as a measurement.

Sizes are ranked by weighted distance (bust 0.45, waist 0.35, hip 0.20).

**No confidence percentage is shown to shoppers.** There is no validation data behind this
heuristic, so a number would imply a probability of being right that it cannot support. Shoppers
see qualitative language — *Strong match*, *Good match*, *Closest available size*, plus an optional
*Consider sizing up / down*. An internal `matchScore` is retained for ranking and analytics and is
explicitly documented as an algorithmic score, not a probability.

**Product-specific by construction.** Each brand has its own published chart (block + grade) *and*
its own real-world sizing behaviour. One profile (165 cm / 60 kg / regular) gets:

| Product | Cut | Brand sizing | Size |
| --- | --- | --- | --- |
| Libas Anarkali Maxi | regular | Runs large | **S** |
| AND Belted Shirt Dress | regular | True to size | **M** |
| Vero Moda Ruched Bodycon | slim | Runs small | **L** |
| Kazo Sequin Party Dress | slim | Runs small | **L** |
| W for Woman Tiered Midi | relaxed | Runs large | **XS** |

**Privacy.** Height and weight live in `localStorage` and nowhere else. There is no network call in
the feature, no photograph, and no computer vision. Analytics events carry the *decision* (which
size was recommended, which was chosen) and never a body measurement — there is a test asserting
this.

**Measurement.** Eleven events go through one abstraction with pluggable sinks —
`product_view`, `fit_cta_clicked`, `fit_profile_started`, `fit_profile_completed`,
`fit_recommendation_shown`, `fit_recommendation_accepted`, `size_changed_after_recommendation`,
`size_selected`, `add_to_bag`, `checkout_started`, `purchase`. `registerSink()` connects a real
provider without touching a call site.

Every event carries `experiment_group`, `product_id`, `category` and, where relevant,
`recommended_size`, `selected_size`, `changed_from_recommendation` and `fit_profile_used`.
`size_changed_after_recommendation` is the event that separates *using* the feature from being
*persuaded* by it.

**Body measurements never enter an event.** Height and weight stay in the fit profile in local
storage; only the decision is recorded. A test asserts this over every event the app can emit.

**Experiment.** Control = existing PDP; treatment = PDP + Nykaa Fit. Primary metric is
product-view → add-to-bag conversion. Assignment is a deterministic FNV-1a hash of a persisted
randomisation unit, so the same visitor always lands in the same arm and the split can be
reproduced off-client. `TREATMENT_ALLOCATION` in `experiment/variant.ts` is the only dial:
`0` = everyone control, `0.5` = a live test, `1` = everyone treatment (the dev default). Override
with `?fit=on` / `?fit=off` or from `/fit-lab`.

**Fit Lab** (`/fit-lab`) is structured around the hypothesis, not the feature — are shoppers using
it, is it changing behaviour, is it moving business outcomes, does it improve economics — plus an
adjustable impact model (labelled *scenario model, not actual results*), the seven things that
still need validating, and the MVP's data limitations. Rates are withheld below a display floor:
"1 of 1" is shown as a count, never as 100%.

## Product imagery

Every product "photo" is a **locally generated SVG illustration** (`components/GarmentArt.tsx`),
tinted by the product's own colourway. Nothing is fetched from a CDN, so no image can break and
no third-party asset is redistributed. Selecting a colour on the PDP genuinely re-renders the
garment, and each colourway has four views (front, back, fabric detail, styled on a form).

## Scope notes

- Mock catalogue only — no live API, no backend.
- Checkout is a review-and-confirm step; no payment method is collected and no address is entered.
- Account / sign-in is out of scope and the header control is visibly disabled rather than dead.
- Not affiliated with Nykaa. Brand names are used to make the mock catalogue read realistically.
- Nykaa Fit's size charts and brand sizing behaviour are plausible mock data, not the brands' real
  published charts. The engine is a heuristic and has never been calibrated against real purchases
  or returns.
- Guardrail metrics (bounce, checkout abandonment, page performance, size-related returns) are named
  in `/fit-lab` but not instrumented; each states what it would need.
- Production would need: real brand size charts, garment measurements, historical order data keyed
  to size, size-specific return reason codes, post-delivery fit feedback, and a powered A/B test.
