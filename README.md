<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/01_hero_dark.svg">
  <img src="docs/readme/01_hero_light.svg" width="100%" alt="Nykaa Fit MVP, a product experiment. Headline: Will this fit? Personalised size guidance on the product page of a fashion shopping prototype, built to reduce uncertainty before you buy. It sizes your saved items across brands from your own measurements, and it is allowed to say it does not know. Live at nykaa-fit-mvp.vercel.app, start at /fit-profile. A measuring tape marked with the store chart sizes XS to XXL; a marker sweeps along it and settles at bust 35 inches, between S and M, the example profile used in this README. Numbers: 60 products in the mock catalogue, up to 3 measurements (bust, waist, hip), 0 network calls in the fit feature, 17 tracked events, 9 success metrics. Hypothesis: for shoppers already interested in a fashion product, uncertainty about fit can reduce purchase confidence and contribute to size related returns; personalised fit guidance may increase conversion while reducing size related returns. Nothing in this build demonstrates that it does. Not affiliated with Nykaa.">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/02_engine_dark.svg">
  <img src="docs/readme/02_engine_light.svg" width="100%" alt="How the recommendation works. Two inputs, and they are the only two. Your measurements, only the ones you entered, blanks stay blank: bust, waist, hip. Plus the room you asked for: this garment's cut and your preferred fit, slim, regular or relaxed. Equals the body to look up, then the nearest size in this brand's published chart, then a confidence check that is allowed to decline. Deterministic and offline: no AI API, no model, no randomness and no network call. Partial profiles are first class: the weights (bust 0.45, waist 0.35, hip 0.2) renormalise over whatever you gave. Every answer carries a receipt built in the same function call. Nothing is estimated: an earlier height and weight estimator was deleted, because a guess presented as your body is worse than no answer.">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/03_confidence_dark.svg">
  <img src="docs/readme/03_confidence_light.svg" width="100%" alt="Confidence, and the decision to say nothing. score = completeness times (closeness times 0.5 plus separation times 0.5). Completeness: how much of your body you told us. Closeness: how well the winning size fits. Separation: how clearly it beats the runner up. Completeness is a ceiling, not another term to average: 0 measurements 0, 1 measurement 0.55, 2 measurements 0.8, 3 measurements 1. High confidence needs a score of 0.72 or more, so a one measurement profile can reach medium but never high. Medium is 0.45 up to 0.72; below 0.45 no size is named. Sitting exactly between two sizes scores near zero on separation and is withheld however complete the profile is. A sold out size substitution multiplies the score by 0.8. Shoppers see High or Medium, never a percentage, because there is no validation data behind the heuristic.">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/04_brands_dark.svg">
  <img src="docs/readme/04_brands_light.svg" width="100%" alt="Product specific by construction. One profile, bust 35, waist 29.5, hip 38.5 inches, regular fit, against different brands' charts: Kazo Sequin Party Dress, slim cut, size L, high confidence. AND Belted Shirt Dress, regular cut, size M, high. ONLY Puff Sleeve Dress, regular cut, size M, high. W for Woman Tiered Midi, relaxed cut, size S, high. Libas Anarkali Maxi, regular cut, size S, medium. Same body, four different letters, and nothing about other shoppers produced that spread: it is the charts. Advice is never arithmetic: a brand's runs small note and your own reported kept or returned outcomes are shown beside the recommendation, never folded into it. The receipt lists the measurements used with values, the ones skipped marked not given and not estimated either, the brand's chart rows, the ease target split into cut and preference, and what was not used.">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/05_experiment_dark.svg">
  <img src="docs/readme/05_experiment_light.svg" width="100%" alt="The experiment and what it measures. Control is the existing product page; treatment is the product page plus Nykaa Fit, enabled only for women's dresses. Primary metric: product view to add to bag conversion. The business metric it serves: the share of users who buy at least one wishlisted item within 30 days of saving it. Assignment is a deterministic FNV 1a hash of a persisted randomisation unit, so a visitor always lands in the same arm. TREATMENT_ALLOCATION is the only dial: 0 everyone control, 0.5 a live test, 1 everyone treatment, the dev default; override with ?fit=on or ?fit=off or from /fit-lab. 17 events go through one analytics abstraction with pluggable sinks. /metrics maps them onto nine metrics: profile started, profile completed, recommendation shown, recommendation followed, size selected, added to bag, wishlist item resolved, order placed, return reported. Guardrails enforced by tests: body measurements never enter an event, and the engine cannot import the review corpus or a body estimator. The Fit Lab withholds rates below a display floor: 1 of 1 is shown as a count, never as 100%.">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/06_scope_dark.svg">
  <img src="docs/readme/06_scope_light.svg" width="100%" alt="Stack, scope and what production would need. Stack: React 19 and TypeScript built with Vite 7, react router 7, React Context state persisted to localStorage, hand written CSS on a token layer, vitest unit tests; product images are locally generated SVG garment illustrations with four views per colourway. Run: npm install, npm run dev, open localhost port 5173. Scope: mock catalogue with no backend, checkout is review and confirm with no payment, sign in is out of scope, size charts are plausible mock data and the engine has never been calibrated against real purchases or returns. Production would need real brand size charts, garment measurements, historical orders keyed to size, size specific return reason codes, post delivery fit feedback, and a powered A/B test.">
</picture>

# Nykaa Fit MVP

**MVP live on:** https://nykaa-fit-mvp.vercel.app/

**Walkthrough:** [Nykaa Fit walkthrough (PDF)](Nykaa-Fit-Walkthrough.pdf)

A shopping prototype in the style of Nykaa Fashion with **Nykaa Fit**: personalised size guidance on the product page, built to *reduce uncertainty before you buy*.

**This is a product experiment, not a shipped feature.** The hypothesis under test:

> For shoppers who are already interested in a fashion product, uncertainty about fit can reduce purchase confidence and contribute to size related returns. Personalised fit guidance **may** increase purchase conversion while reducing size related returns.

Nothing in this build demonstrates that it does. The app's job is to emit the events an analysis would consume, and the Fit Lab reports "not enough data" rather than inventing a result.

The business metric it serves: **the share of users who purchase at least one wishlisted item within 30 days of saving it.** The thesis is that a wishlist is a queue of unresolved questions, and the resolvable one is *"will this fit?"*. A price question answers itself when the sale lands, but fit uncertainty never resolves on its own.

Store journey: **Home → Category → Listing → Product Detail → Size Selection → Add to Bag → Bag → Checkout**

Nykaa Fit journey: **Wishlist → Resolve fit for all saved items → per item size, confidence and stock → Add to Bag**, or **Product → Find My Fit → bust, waist, hip, height → recommendation → why → Select size → Add to Bag**

Start at **[`/fit-profile`](https://nykaa-fit-mvp.vercel.app/fit-profile)**. Enter your own measurements and the page sizes your saved items across brands live, before you save anything. Nothing here invents a body for you.

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>.

* `npm run dev`: Vite dev server with HMR
* `npm run build`: type checks (`tsc -b`) then builds to `dist/`
* `npm run preview`: serves the production build
* `npm run typecheck`: types only, no emit
* `npm test`: unit tests (vitest) for the engine, confidence, wishlist, brand history and analytics

## Stack

* **React 19 + TypeScript**, built with **Vite 7**
* **react router dom 7** (`react-router-dom`) for client side routing
* **React Context** state without `useReducer`, persisted to `localStorage`; no Redux
* **Hand written CSS** with a token layer (`src/styles/tokens.css`); no UI framework

## Routes

<table>
<tr><th>Path</th><th>Page</th></tr>
<tr><td><code>/</code></td><td>Home</td></tr>
<tr><td><code>/c/:categoryId</code></td><td>Listing: <code>women</code>, <code>men</code>, <code>dresses</code>, <code>tops</code>, <code>jeans</code>, <code>shoes</code></td></tr>
<tr><td><code>/search?q=</code></td><td>Search results</td></tr>
<tr><td><code>/p/:productId</code></td><td>Product detail</td></tr>
<tr><td><code>/bag</code></td><td>Shopping bag</td></tr>
<tr><td><code>/wishlist</code></td><td>Wishlist: per item size, confidence, stock, and the resolve all pass</td></tr>
<tr><td><code>/fit-profile</code></td><td>Create, edit and delete your measurements, with a live cross brand preview</td></tr>
<tr><td><code>/checkout</code></td><td>Order review and confirmation, then the kept or returned prompt</td></tr>
<tr><td><code>/metrics</code></td><td>The nine instrumented success metrics, with counts</td></tr>
<tr><td><code>/fit-lab</code></td><td>Internal: experiment bucket, arm splits, raw event log</td></tr>
<tr><td><code>*</code></td><td>Not found</td></tr>
</table>

Deep links work in production because `vercel.json` rewrites every path to `index.html`; without it a pasted product URL hits Vercel's 404 rather than the app.

Listing pages also accept `?sub=`, `?gender=`, `?tag=`, `?brand=`, `?size=`, `?color=`, `?pmin=` and `?pmax=`, `?disc=`, `?rating=` and `?sort=`. Filter and sort state lives entirely in the URL, so every filtered view is shareable and the back button works through a filtering session.

## Project structure

```
src/
  components/   Header, SearchBar, Navigation, ProductCard, ProductGrid, FilterPanel,
                SortDropdown, ProductGallery, SizeSelector, SizeChart, ProductInfo,
                Reviews, RecommendationCarousel, BagItem, Footer, …
  pages/        Home, Listing, Search, ProductDetail, Bag, Wishlist, Checkout,
                FitLab, NotFound
  context/      ShopContext: bag, wishlist, toasts (localStorage backed)
  data/         products (60), categories, reviews, sizeCharts, brandSizing,
                palette, homeContent
  features/
    nykaa-fit/  The whole fit feature, see below
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
  analytics/    fitAnalytics: pluggable sinks, localStorage by default
  experiment/   variant assignment + useVariant
  utils/        fitStorage, eligibility, wishlistFit, fitOutcomes,
                personalFitNotes, fitResolutionStore, quickStart, hooks
  types/        fitTypes
  styles/       nykaa-fit.css
```

**Scope.** Enabled only for women's dresses (`utils/eligibility.ts`). Every other product and the control bucket render the existing PDP untouched.

**How the recommendation works.** Two inputs, and they are the only two.

```
your measurements          only the ones you entered, blanks stay blank
  + the room you asked for this garment's cut + your preferred fit
  =========================================================
  = the body to look up  →  nearest size in THIS BRAND'S published chart
  →  then a confidence check that is allowed to decline
```

Deterministic and offline: no AI API, no model, no randomness, and no network call anywhere in the feature.

**Nothing is estimated.** An earlier build asked for height and weight and derived bust, waist and hip from them with a girth model. That is guessing, and a guess presented as your body is worse than no answer, so the estimator has been deleted rather than played down. You enter whichever measurements you know (one, two or three) and the form tells you what each buys you. With none, the honest output is the brand's size chart and instructions for taking them.

**Partial profiles are first class.** Weights renormalise over whatever you gave, skipped measurements are compared against nothing, and the confidence model treats completeness as a ceiling rather than another term to average in:

```
score = completeness x (closeness x 0.5 + separation x 0.5)
```

A flawless match on a waist alone is still only a statement about a waist, so a one measurement profile can reach *medium* confidence but never *high*. That is what makes "add your bust and hip" a real offer rather than a nag.

**Confidence, and the decision to say nothing.** Three signals, all of them things we actually observe: how much of your body you told us, how well the winning size fits it, and how clearly it beats the runner up. Below the threshold the UI names no size and hands over to the published chart. Sitting exactly between two sizes scores near zero on separation and is withheld however complete your measurements are, because that is the case where a wrong answer costs you a return.

**Advice is never arithmetic.** A brand's "runs small" note and any kept or returned outcomes you have reported yourself are shown *beside* the recommendation, never folded into it. Both are editorial or single data points; neither is strong enough to silently move a number computed from a published chart. You can see them and apply your own judgement, which on one data point is better than ours.

**Every recommendation carries a receipt** listing the measurements used with their values, the ones you skipped (marked "not given, not estimated either"), the brand's chart rows, the ease target broken into the cut and your preference in inches, and an explicit list of what was *not* used. It is built in the same function call as the answer, so the explanation cannot drift from the computation.

**No confidence percentage is shown to shoppers.** There is no validation data behind this heuristic, so a number would imply a calibration it does not have. Shoppers see *High* or *Medium* confidence, or no size at all.

**Product specific by construction.** One profile (35 / 29.5 / 38.5, regular fit) against different brands' published charts:

<table>
<tr><th>Product</th><th>Cut</th><th>Size</th><th>Confidence</th></tr>
<tr><td>Kazo Sequin Party Dress</td><td>slim</td><td><b>L</b></td><td>High</td></tr>
<tr><td>AND Belted Shirt Dress</td><td>regular</td><td><b>M</b></td><td>High</td></tr>
<tr><td>ONLY Puff Sleeve Dress</td><td>regular</td><td><b>M</b></td><td>High</td></tr>
<tr><td>W for Woman Tiered Midi</td><td>relaxed</td><td><b>S</b></td><td>High</td></tr>
<tr><td>Libas Anarkali Maxi</td><td>regular</td><td><b>S</b></td><td>Medium</td></tr>
</table>

Same body, four different letters. Nothing about other shoppers produced that spread: it is the charts.

**Privacy.** The profile lives in `localStorage` and nowhere else. There is no network call in the feature, no photograph, and no computer vision. Analytics events carry the *decision* and never a body measurement, asserted by a test over every event the app can emit.

**Measurement.** Every event goes through one abstraction with pluggable sinks: `product_view`, `fit_cta_clicked`, `fit_profile_started`, `fit_profile_completed`, `fit_recommendation_shown`, `fit_recommendation_accepted`, `size_changed_after_recommendation`, `size_selected`, `add_to_bag`, `checkout_started`, `purchase`, `wishlist_viewed`, `wishlist_item_saved`, `wishlist_item_resolved`, `wishlist_resolve_all`, `wishlist_add_to_bag` and `fit_outcome_reported`. `registerSink()` connects a real provider without touching a call site.

`/metrics` maps those onto the nine metric names the success criteria are written in (`profile_started`, `profile_completed`, `recommendation_shown`, `recommendation_followed`, `size_selected`, `added_to_bag`, `wishlist_item_resolved`, `order_placed`, `return_reported`) and shows the count each one has actually recorded in this browser, alongside the raw event behind it. A count of zero means the event has not fired here, not that the metric is missing.

Every event carries `experiment_group`, `product_id`, `category` and, where relevant, `recommended_size`, `selected_size`, `changed_from_recommendation` and `fit_profile_used`. `size_changed_after_recommendation` is the event that separates *using* the feature from being *persuaded* by it.

**Body measurements never enter an event.** Height and weight stay in the fit profile in local storage; only the decision is recorded. A test asserts this over every event the app can emit.

**No fabricated customer data.** The engine may consult the shopper's own inputs and the brand's published chart, and nothing else. That is easy to state and very easy to erode, so it is asserted structurally: a test walks every file under `engine/` and fails if any of them imports the review corpus or references a body estimator. An earlier build aggregated generated review sentiment per brand and displayed it as "18 fit reports"; that module is gone.

**Experiment.** Control is the existing PDP; treatment is the PDP plus Nykaa Fit. The primary metric is product view to add to bag conversion. Assignment is a deterministic FNV 1a hash of a persisted randomisation unit, so the same visitor always lands in the same arm and the split can be reproduced off client. `TREATMENT_ALLOCATION` in `experiment/variant.ts` is the only dial: `0` puts everyone in control, `0.5` is a live test, `1` puts everyone in treatment (the dev default). Override with `?fit=on` or `?fit=off`, or from `/fit-lab`.

**Fit Lab** (`/fit-lab`) is structured around the hypothesis, not the feature (are shoppers using it, is it changing behaviour, is it moving business outcomes, does it improve economics), plus an adjustable impact model (labelled *scenario model, not actual results*), the seven things that still need validating, and the MVP's data limitations. Rates are withheld below a display floor: "1 of 1" is shown as a count, never as 100%.

## Product imagery

Every product "photo" is a **locally generated SVG illustration** (`components/GarmentArt.tsx`), tinted by the product's own colourway. Nothing is fetched from a CDN, so no image can break and no third party asset is redistributed. Selecting a colour on the PDP genuinely renders the garment again, and each colourway has four views (front, back, fabric detail, styled on a form).

## Scope notes

* Mock catalogue only: no live API, no backend.
* Checkout is a review and confirm step; no payment method is collected and no address is entered.
* Account and sign in are out of scope, and the header control is visibly disabled rather than dead.
* Not affiliated with Nykaa. Brand names are used to make the mock catalogue read realistically.
* Nykaa Fit's size charts and brand sizing behaviour are plausible mock data, not the brands' real published charts. The engine is a heuristic and has never been calibrated against real purchases or returns.
* Guardrail metrics (bounce, checkout abandonment, page performance, size related returns) are named in `/fit-lab` but not instrumented; each states what it would need.
* Production would need: real brand size charts, garment measurements, historical order data keyed to size, size specific return reason codes, post delivery fit feedback, and a powered A/B test.

## Rebuilding the panels

The images at the top are generated. Edit `docs/readme/one_sheet.html`, then run:

```bash
node docs/readme/build_readme_svgs.js docs/readme/one_sheet.html docs/readme 960
```

This needs Node with Playwright and curl (fonts are fetched from Google Fonts and embedded). The small `docs/readme/package.json` marks the build script as CommonJS, since the app itself is an ES module package.
