# Nykaa Fit — MVP

A Nykaa Fashion–style shopping prototype with **Nykaa Fit**: personalised size guidance on the
product page, built to *reduce uncertainty before you buy*.

**This is a product experiment, not a shipped feature.** The hypothesis under test:

> For shoppers who are already interested in a fashion product, uncertainty about fit can reduce
> purchase confidence and contribute to size-related returns. Personalised fit guidance **may**
> increase purchase conversion while reducing size-related returns.

Nothing in this build demonstrates that it does. The app's job is to emit the events an analysis
would consume, and the Fit Lab reports "not enough data" rather than inventing a result.

The business metric it serves: **the share of users who purchase at least one wishlisted item
within 30 days of saving it.** The thesis is that a wishlist is a queue of unresolved questions,
and the resolvable one is *"will this fit?"* — a price question answers itself when the sale
lands, but fit uncertainty never resolves on its own.

Store journey: **Home → Category → Listing → Product Detail → Size Selection → Add to Bag → Bag → Checkout**

Nykaa Fit journey: **Wishlist → Resolve fit for all saved items → per-item size, confidence and
stock → Add to Bag**, or **Product → Find My Fit → bust, waist, hip, height → recommendation →
why → Select size → Add to Bag**

In a hurry? **[`/demo`](https://nykaa-fit-mvp.vercel.app/demo)** seeds a measured fit profile and
a ten-item wishlist spanning nine brands, then lands on the wishlist with every item resolved.

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
| `npm test` | Unit tests (vitest) — engine, confidence, wishlist, brand history, analytics |

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
| `/wishlist` | Wishlist — per-item size, confidence, stock, and the resolve-all pass |
| `/checkout` | Order review + confirmation, then the kept/returned prompt |
| `/demo` | Seeds a fit profile plus a ten-item wishlist and lands on it resolved |
| `/metrics` | The nine instrumented success metrics, with counts |
| `/fit-lab` | Internal: experiment bucket, arm splits, raw event log |
| `*` | Not found |

Deep links work in production because `vercel.json` rewrites every path to `index.html`; without
it a pasted product URL hits Vercel's 404 rather than the app.

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
                FitProfileSummary, SizeComparison, FitPanel, ConfidenceChip,
                FitAcrossProducts, WishlistFitCard, FitOutcomePrompt,
                BrandFitHistoryPanel
  engine/       fitEngine, scoring, bodyModel, confidence,
                brandFitHistory              ← pure, no React, no network
  analytics/    fitAnalytics — pluggable sinks, localStorage by default
  experiment/   variant assignment + useVariant
  utils/        fitStorage, eligibility, wishlistFit, fitOutcomes,
                fitResolutionStore, demoSeed, hooks
  types/        fitTypes
  styles/       nykaa-fit.css
```

**Scope.** Enabled only for women's dresses (`utils/eligibility.ts`). Every other product and the
control bucket render the existing PDP untouched.

**How the recommendation works.** Deterministic and offline — no AI API, no model, no randomness.

```
your body       measured bust / waist / hip, or estimated from height + weight
  + product fit class     slim +0.8″ · regular 0 · relaxed −0.8″ · oversized −1.6″
  + preferred fit         slim −0.7″ · regular 0 · relaxed +0.9″
  + brand sizing          the published label, shrunk toward what shoppers
                          actually reported about that brand
  ────────────────────────────────────────────────────────────────
  = effective body → nearest size in *this brand's* chart
  → then a confidence check that can decline to answer
```

**Measurements are the primary input.** Bust, waist, hip and height, because a measurement means
the same thing in every brand and a size label does not: 34″ is 34″ at Kazo and at W for Woman,
whereas "Medium" is not. Height and weight remain as an explicit *"I don't know my measurements"*
fallback, which estimates the three girths with a girth index, √(kg / m) — approximating the torso
as a cylinder of roughly constant density, circumference scales with the square root of mass over
height. That path is a proxy, so it is capped at medium confidence everywhere, and the wishlist's
"Ready to buy" bucket is unreachable from it.

Sizes are ranked by weighted distance (bust 0.45, waist 0.35, hip 0.20).

**Confidence, and the decision to say nothing.** Three things we actually know decide whether we
answer at all: how the body numbers were obtained, how clearly the winning size beats the
runner-up, and how much fit history the brand has and how much it agrees with itself — plus a
sanity check that the winning size fits at all rather than being the least-bad option in the run.
Below the threshold the UI names no size and hands over to the brand's published size chart. A
shopper between two sizes on a thin-history brand is exactly where a wrong answer costs a return,
and *"we don't know yet, here is the chart"* is the honest output. `engine/confidence.ts` holds
the weights; the withholding case is covered by tests.

**No confidence percentage is shown to shoppers.** There is no validation data behind this
heuristic, so a number would imply a probability of being right that it cannot support. Shoppers
see qualitative language — *High / Medium confidence*, *Strong match*, *Good match*, *Closest
available size*, plus an optional *Consider sizing up / down*. An internal `matchScore` is
retained for ranking and analytics and is explicitly documented as an algorithmic score, not a
probability.

**Brand fit behaviour is derived, not declared.** `engine/brandFitHistory.ts` aggregates every
brand's review fit feedback and any kept/returned outcomes the shopper has reported into three
numbers: how much evidence exists, which way the brand runs, and how much that evidence agrees
with itself. The published label is the prior, and the observation is shrunk toward it in
proportion to the evidence — `weight / (weight + 20)` — so a thin brand stays close to its own
chart and a well-evidenced one is driven by what happened. A reported return is weighted six
times a review, because it is an outcome rather than an opinion.

**The loop closes.** After an order is placed, the confirmation asks *did it fit?* per line, with
a reason. The answer goes straight back into that brand's history and visibly moves the applied
correction, the confidence, and — with enough agreeing reports — the size itself. `/metrics` shows
the per-brand table with the shift each report caused.

**Product-specific by construction.** Each brand has its own published chart (block + grade) *and*
its own observed sizing behaviour. One measured profile (35 / 29.5 / 38.5, 164 cm, regular) gets:

| Product | Cut | Brand reads as | Size |
| --- | --- | --- | --- |
| Libas Anarkali Maxi | regular | usually runs large | **S** |
| AND Belted Shirt Dress | regular | consistently true to its chart | **M** |
| Global Desi Boho Maxi | relaxed | usually true to its chart | **S** |
| Vero Moda Ruched Bodycon | slim | usually runs small | **L** |
| Kazo Sequin Party Dress | slim | usually runs small | **L** |
| Biba Chikankari A-Line | regular | *(between sizes — withheld)* | **—** |

**Privacy.** The fit profile lives in `localStorage` and nowhere else. There is no network call in
the feature, no photograph, and no computer vision. Analytics events carry the *decision* (which
size was recommended, which was chosen) and never a body measurement — there is a test asserting
this over every event the app can emit.

**Measurement.** Every event goes through one abstraction with pluggable sinks —
`product_view`, `fit_cta_clicked`, `fit_profile_started`, `fit_profile_completed`,
`fit_recommendation_shown`, `fit_recommendation_accepted`, `size_changed_after_recommendation`,
`size_selected`, `add_to_bag`, `checkout_started`, `purchase`, `wishlist_viewed`,
`wishlist_item_saved`, `wishlist_item_resolved`, `wishlist_resolve_all`, `wishlist_add_to_bag`
and `fit_outcome_reported`. `registerSink()` connects a real provider without touching a call
site.

`/metrics` maps those onto the nine metric names the success criteria are written in —
`profile_started`, `profile_completed`, `recommendation_shown`, `recommendation_followed`,
`size_selected`, `added_to_bag`, `wishlist_item_resolved`, `order_placed`, `return_reported` —
and shows the count each one has actually recorded in this browser, alongside the raw event
behind it. A count of zero means the event has not fired here, not that the metric is missing.

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
