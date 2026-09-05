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

Start at **[`/fit-profile`](https://nykaa-fit-mvp.vercel.app/fit-profile)**. Enter your own
measurements and the page sizes your saved items across brands live, before you save anything.
Nothing here invents a body for you.

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
| `/fit-profile` | Create, edit and delete your measurements, with a live cross-brand preview |
| `/checkout` | Order review + confirmation, then the kept/returned prompt |
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
                FitProfileSummary, FitReceiptPanel, FitNotes, QuickAdjust,
                SizeComparison, FitPanel, ConfidenceChip, FitAcrossProducts,
                WishlistFitCard, FitOutcomePrompt
  engine/       fitEngine, scoring, confidence  ← pure, no React, no network,
                                                  no access to the catalogue's
                                                  reviews (enforced by test)
  analytics/    fitAnalytics — pluggable sinks, localStorage by default
  experiment/   variant assignment + useVariant
  utils/        fitStorage, eligibility, wishlistFit, fitOutcomes,
                personalFitNotes, fitResolutionStore, quickStart, hooks
  types/        fitTypes
  styles/       nykaa-fit.css
```

**Scope.** Enabled only for women's dresses (`utils/eligibility.ts`). Every other product and the
control bucket render the existing PDP untouched.

**How the recommendation works.** Two inputs, and they are the only two.

```
your measurements   only the ones you entered — blanks stay blank
  + the room you asked for   this garment's cut + your preferred fit
  ─────────────────────────────────────────────────────────────────
  = the body to look up -> nearest size in THIS BRAND'S published chart
  -> then a confidence check that is allowed to decline
```

Deterministic and offline: no AI API, no model, no randomness, and no network call anywhere in
the feature.

**Nothing is estimated.** An earlier build asked for height and weight and derived bust, waist
and hip from them with a girth model. That is guessing, and a guess presented as your body is
worse than no answer, so the estimator has been deleted rather than de-emphasised. You enter
whichever measurements you know — one, two or three — and the form tells you what each buys you.
With none, the honest output is the brand's size chart and instructions for taking them.

**Partial profiles are first-class.** Weights renormalise over whatever you gave, skipped
measurements are compared against nothing, and the confidence model treats completeness as a
ceiling rather than another term to average in:

```
score = completeness x (closeness x 0.5 + separation x 0.5)
```

A flawless match on a waist alone is still only a statement about a waist, so a
one-measurement profile can reach *medium* confidence but never *high* — which is what makes
"add your bust and hip" a real offer rather than a nag.

**Confidence, and the decision to say nothing.** Three signals, all of them things we actually
observe: how much of your body you told us, how well the winning size fits it, and how clearly
it beats the runner-up. Below the threshold the UI names no size and hands over to the published
chart. Sitting exactly between two sizes scores near zero on separation and is withheld however
complete your measurements are — that is the case a wrong answer costs you a return.

**Advice is never arithmetic.** A brand's "runs small" note and any kept/returned outcomes you
have reported yourself are shown *beside* the recommendation, never folded into it. Both are
editorial or single data points; neither is strong enough to silently move a number computed
from a published chart. You can see them and apply your own judgement, which on one data point
is better than ours.

**Every recommendation carries a receipt** listing the measurements used with their values, the
ones you skipped (marked "not given — not estimated either"), the brand's chart rows, the ease
target broken into the cut and your preference in inches, and an explicit list of what was *not*
used. It is built in the same function call as the answer, so the explanation cannot drift from
the computation.

**No confidence percentage is shown to shoppers.** There is no validation data behind this
heuristic, so a number would imply a calibration it does not have. Shoppers see *High* /
*Medium* confidence, or no size at all.

**Product-specific by construction.** One profile (35 / 29.5 / 38.5, regular fit) against
different brands' published charts:

| Product | Cut | Size | Confidence |
| --- | --- | --- | --- |
| Kazo Sequin Party Dress | slim | **L** | High |
| AND Belted Shirt Dress | regular | **M** | High |
| ONLY Puff Sleeve Dress | regular | **M** | High |
| W for Woman Tiered Midi | relaxed | **S** | High |
| Libas Anarkali Maxi | regular | **S** | Medium |

Same body, four different letters. Nothing about other shoppers produced that spread — it is
the charts.

**Privacy.** The profile lives in `localStorage` and nowhere else. There is no network call in
the feature, no photograph, and no computer vision. Analytics events carry the *decision* and
never a body measurement — asserted by a test over every event the app can emit.

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

**No fabricated customer data.** The engine may consult the shopper's own inputs and the
brand's published chart, and nothing else. That is easy to state and very easy to erode, so it
is asserted structurally: a test walks every file under `engine/` and fails if any of them
imports the review corpus or references a body estimator. An earlier build aggregated generated
review sentiment per brand and displayed it as "18 fit reports"; that module is gone.

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
