/* =========================================================================
   Analytics abstraction.

   Events are written to a pluggable list of sinks. The prototype ships one
   sink that appends to localStorage so the funnel can be inspected locally
   (see /fit-lab). Connecting a real provider later is one `registerSink`
   call — nothing that emits events needs to change.

   Body measurements are NEVER included in an event. The properties below
   carry the decision (which size was recommended, which was chosen), not the
   person.
   ========================================================================= */

export type FitEventName =
  | 'product_view'
  | 'fit_cta_clicked'
  | 'fit_profile_started'
  | 'fit_profile_completed'
  | 'fit_recommendation_shown'
  | 'fit_recommendation_accepted'
  /** Shopper saw a recommendation and then picked a different size. This is
   *  the signal that separates "used the feature" from "was persuaded by it". */
  | 'size_changed_after_recommendation'
  | 'size_selected'
  | 'add_to_bag'
  | 'checkout_started'
  | 'purchase';

export interface FitEventProps {
  product_id?: string;
  category?: string;
  brand?: string;
  /** Whether Nykaa Fit is available on this surface at all. */
  fit_eligible?: boolean;
  /** Whether a saved profile drove this interaction. */
  fit_profile_used?: boolean;
  recommended_size?: string | null;
  selected_size?: string | null;
  /** What the shopper was shown — 'Strong match', 'Good match', … */
  match_quality?: string;
  /** Internal algorithmic score. Not a probability of being correct; kept so
   *  the Fit Lab can compare recommendations against each other. */
  match_score?: number;
  /** True when the size added differs from the one recommended. */
  changed_from_recommendation?: boolean;
  /** 'recommended' when the size came from Nykaa Fit, 'manual' otherwise. */
  size_source?: 'recommended' | 'manual';
  /** Whether the profile was newly created or reused. */
  profile_origin?: 'new' | 'saved' | 'edited';
  value?: number;
  quantity?: number;
  order_id?: string;
  reason?: string;
}

export interface AnalyticsEvent {
  id: string;
  name: FitEventName;
  props: FitEventProps;
  /** Experiment bucket at the time of the event — 'control' or 'treatment'.
   *  Stamped on every event so any metric can be split by arm. */
  experiment_group: string;
  ts: number;
  session: string;
}

export interface AnalyticsSink {
  name: string;
  send(event: AnalyticsEvent): void;
}

const STORAGE_KEY = 'nykaafit.analytics.v1';
const SESSION_KEY = 'nykaafit.session.v1';
/** Ring buffer bound — a prototype log, not a warehouse. */
const MAX_EVENTS = 800;

type Listener = () => void;
const listeners = new Set<Listener>();
const sinks: AnalyticsSink[] = [];

let cache: AnalyticsEvent[] | undefined;

/* ---------- session id ---------- */

function sessionId(): string {
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 's_ephemeral';
  }
}

/* ---------- default sink: localStorage ---------- */

function readEvents(): AnalyticsEvent[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const localStorageSink: AnalyticsSink = {
  name: 'localStorage',
  send(event) {
    const next = [...getEvents(), event].slice(-MAX_EVENTS);
    cache = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* Full or unavailable — keep the in-memory log for this session. */
    }
  },
};

sinks.push(localStorageSink);

/** Attach a real analytics provider. Called once at app start when wired. */
export function registerSink(sink: AnalyticsSink): () => void {
  sinks.push(sink);
  return () => {
    const i = sinks.indexOf(sink);
    if (i >= 0) sinks.splice(i, 1);
  };
}

/* ---------- public API ---------- */

/** Resolved lazily to avoid a circular import with the experiment module. */
let groupResolver: () => string = () => 'unassigned';

export function setExperimentGroupResolver(fn: () => string): void {
  groupResolver = fn;
}

export function track(name: FitEventName, props: FitEventProps = {}): void {
  const event: AnalyticsEvent = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    props,
    experiment_group: groupResolver(),
    ts: Date.now(),
    session: sessionId(),
  };
  sinks.forEach((sink) => {
    try {
      sink.send(event);
    } catch {
      /* A failing sink must never break the shopping flow. */
    }
  });
  listeners.forEach((l) => l());
}

/**
 * Impression-style events must fire once per view, not once per render. React
 * StrictMode deliberately double-invokes effects in development, and a
 * component ref is recreated by that remount — so the guard has to live at
 * module scope, keyed by something stable for the view (the router's location
 * key plus the entity being viewed).
 */
const firedOnce = new Set<string>();
const FIRED_ONCE_CAP = 500;

export function trackOnce(dedupeKey: string, name: FitEventName, props: FitEventProps = {}): void {
  if (firedOnce.has(dedupeKey)) return;
  if (firedOnce.size >= FIRED_ONCE_CAP) firedOnce.clear();
  firedOnce.add(dedupeKey);
  track(name, props);
}

/** Test-only. */
export function __resetTrackOnce(): void {
  firedOnce.clear();
}

export function getEvents(): AnalyticsEvent[] {
  if (cache === undefined) cache = readEvents();
  return cache;
}

export function clearEvents(): void {
  cache = [];
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing to do. */
  }
  listeners.forEach((l) => l());
}

export function subscribeEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only. */
export function __resetAnalyticsCache(): void {
  cache = undefined;
}

/* ---------- funnel helpers (used by the internal Fit Lab) ---------- */

export interface FunnelStep {
  name: FitEventName;
  label: string;
  count: number;
  /** Distinct products the step was reached on. */
  products: number;
}

const FUNNEL: { name: FitEventName; label: string }[] = [
  { name: 'product_view', label: 'Product view' },
  { name: 'fit_cta_clicked', label: 'Find My Fit clicked' },
  { name: 'fit_profile_started', label: 'Profile started' },
  { name: 'fit_profile_completed', label: 'Profile completed' },
  { name: 'fit_recommendation_shown', label: 'Recommendation shown' },
  { name: 'fit_recommendation_accepted', label: 'Recommendation accepted' },
  { name: 'size_selected', label: 'Size selected' },
  { name: 'add_to_bag', label: 'Added to bag' },
  { name: 'checkout_started', label: 'Checkout started' },
  { name: 'purchase', label: 'Purchase' },
];

export function buildFunnel(events: AnalyticsEvent[], group?: string): FunnelStep[] {
  const scoped = group ? events.filter((e) => e.experiment_group === group) : events;
  return FUNNEL.map((step) => {
    const matching = scoped.filter((e) => e.name === step.name);
    return {
      ...step,
      count: matching.length,
      products: new Set(matching.map((e) => e.props.product_id).filter(Boolean)).size,
    };
  });
}

/* =========================================================================
   Experiment read-outs.

   Everything below is computed from events this browser actually recorded.
   Nothing is simulated, and every figure can come back `null`, which the Fit
   Lab renders as "not enough data" rather than as a zero. A zero would read
   as a measured result; null is the truth.
   ========================================================================= */

/** Below this many product views in an arm we refuse to show a rate for it.
 *  This is a display floor to stop one click reading as "100% conversion" —
 *  it is NOT statistical sufficiency, which needs a power calculation. */
export const MIN_ARM_VIEWS = 30;

/** Below this denominator a percentage is theatre — "1 of 1" is not 100%.
 *  Rates under this are shown as raw counts instead. */
export const MIN_RATE_SAMPLE = 10;

export interface RateMetric {
  id: string;
  label: string;
  numerator: number;
  denominator: number;
  /** null when there is no data yet — never shown as 0%. */
  rate: number | null;
  detail: string;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function counter(events: AnalyticsEvent[], group?: string) {
  const scoped = group ? events.filter((e) => e.experiment_group === group) : events;
  return (name: FitEventName, predicate?: (e: AnalyticsEvent) => boolean) =>
    scoped.filter((e) => e.name === name && (predicate ? predicate(e) : true)).length;
}

/** A real add to bag — the blocked-without-a-size case is not a conversion. */
const REAL_ADD = (e: AnalyticsEvent) => e.props.reason !== 'blocked_no_size';

/* ---------- 1. Are shoppers using it? ---------- */

export function adoptionMetrics(events: AnalyticsEvent[], group?: string): RateMetric[] {
  const count = counter(events, group);
  const eligibleViews = count('product_view', (e) => e.props.fit_eligible === true);
  const ctaClicks = count('fit_cta_clicked');
  const started = count('fit_profile_started');
  const completed = count('fit_profile_completed');
  const shown = count('fit_recommendation_shown');
  const accepted = count('fit_recommendation_accepted');

  return [
    {
      id: 'cta-ctr',
      label: 'Fit CTA click-through',
      numerator: ctaClicks,
      denominator: eligibleViews,
      rate: rate(ctaClicks, eligibleViews),
      detail: 'Find My Fit clicks per eligible product view',
    },
    {
      id: 'profile-completion',
      label: 'Profile completion',
      numerator: completed,
      denominator: started,
      rate: rate(completed, started),
      detail: 'Finished the form once they started it',
    },
    {
      id: 'acceptance',
      label: 'Recommendation acceptance',
      numerator: accepted,
      denominator: shown,
      rate: rate(accepted, shown),
      detail: 'Applied the size we suggested',
    },
  ];
}

/* ---------- 2. Is it changing behaviour? ---------- */

export function behaviourMetrics(events: AnalyticsEvent[], group?: string): RateMetric[] {
  const count = counter(events, group);
  const shown = count('fit_recommendation_shown');
  const accepted = count('fit_recommendation_accepted');
  const changed = count('size_changed_after_recommendation');
  const addsWithRec = count(
    'add_to_bag',
    (e) => REAL_ADD(e) && Boolean(e.props.recommended_size),
  );
  const addsOnRec = count(
    'add_to_bag',
    (e) => REAL_ADD(e) && e.props.changed_from_recommendation === false,
  );

  return [
    {
      id: 'added-recommended',
      label: 'Added the recommended size',
      numerator: addsOnRec,
      denominator: addsWithRec,
      rate: rate(addsOnRec, addsWithRec),
      detail: 'Bag additions that matched the recommendation',
    },
    {
      id: 'size-change',
      label: 'Size changed after seeing a recommendation',
      numerator: changed,
      denominator: shown,
      rate: rate(changed, shown),
      detail: 'Overrode the suggestion — the honest counterweight to acceptance',
    },
    {
      id: 'accept-vs-shown',
      label: 'Recommendation influenced the pick',
      numerator: accepted,
      denominator: shown,
      rate: rate(accepted, shown),
      detail: 'Did the recommendation actually decide the size',
    },
  ];
}

/* ---------- 3. Is it moving business outcomes? ---------- */

export interface ArmConversion {
  group: Variant;
  views: number;
  addToBag: number;
  checkoutStarted: number;
  purchases: number;
  /** null until the arm clears MIN_ARM_VIEWS. */
  addToBagCvr: number | null;
  purchaseCvr: number | null;
  underpowered: boolean;
}

type Variant = 'control' | 'treatment';

function armConversion(events: AnalyticsEvent[], group: Variant): ArmConversion {
  const count = counter(events, group);
  const views = count('product_view');
  const addToBag = count('add_to_bag', REAL_ADD);
  const checkoutStarted = count('checkout_started');
  const purchases = count('purchase');
  const enough = views >= MIN_ARM_VIEWS;

  return {
    group,
    views,
    addToBag,
    checkoutStarted,
    purchases,
    addToBagCvr: enough ? addToBag / views : null,
    purchaseCvr: enough ? purchases / views : null,
    underpowered: !enough,
  };
}

export interface ConversionReadout {
  control: ArmConversion;
  treatment: ArmConversion;
  /** Relative lift in add-to-bag CVR, or null when either arm is short. */
  addToBagLift: number | null;
  purchaseLift: number | null;
}

/**
 * The primary metric. Returns null lifts unless BOTH arms clear the display
 * floor — a lift computed from a handful of sessions is noise dressed up as
 * a result.
 */
export function conversionReadout(events: AnalyticsEvent[]): ConversionReadout {
  const control = armConversion(events, 'control');
  const treatment = armConversion(events, 'treatment');

  const lift = (c: number | null, t: number | null) =>
    c !== null && t !== null && c > 0 ? (t - c) / c : null;

  return {
    control,
    treatment,
    addToBagLift: lift(control.addToBagCvr, treatment.addToBagCvr),
    purchaseLift: lift(control.purchaseCvr, treatment.purchaseCvr),
  };
}

/* ---------- 4. Does it improve economics? ---------- */

export interface ReturnsReadout {
  /** Always null in this prototype: returns are not in the event stream. */
  controlSizeReturnRate: number | null;
  treatmentSizeReturnRate: number | null;
  requirement: string;
}

export function returnsReadout(): ReturnsReadout {
  return {
    controlSizeReturnRate: null,
    treatmentSizeReturnRate: null,
    requirement:
      'Needs post-purchase returns data with a size-related reason code, joined to order_id. ' +
      'The purchase event already carries order_id so that join is possible.',
  };
}

/* ---------- Impact model ---------- */

export interface ImpactAssumptions {
  monthlyEligibleViews: number;
  baselineAddToBagCvr: number;
  expectedConversionLift: number;
  averageOrderValue: number;
  baselineSizeReturnRate: number;
  expectedReturnReduction: number;
  averageReturnCost: number;
}

export interface ImpactProjection {
  baselineOrders: number;
  incrementalOrders: number;
  incrementalGmv: number;
  returnsAvoided: number;
  returnCostSaved: number;
  totalUpside: number;
}

/**
 * A scenario model, not a measurement. Every input is an assumption the
 * reader sets; the output is arithmetic on those assumptions and says
 * nothing about whether Nykaa Fit works.
 */
export function projectImpact(a: ImpactAssumptions): ImpactProjection {
  const baselineOrders = a.monthlyEligibleViews * a.baselineAddToBagCvr;
  const incrementalOrders = baselineOrders * a.expectedConversionLift;
  const incrementalGmv = incrementalOrders * a.averageOrderValue;

  const totalOrders = baselineOrders + incrementalOrders;
  const returnsAvoided = totalOrders * a.baselineSizeReturnRate * a.expectedReturnReduction;
  const returnCostSaved = returnsAvoided * a.averageReturnCost;

  return {
    baselineOrders,
    incrementalOrders,
    incrementalGmv,
    returnsAvoided,
    returnCostSaved,
    totalUpside: incrementalGmv + returnCostSaved,
  };
}


/** How sizes were chosen — the raw input to the behaviour metrics above. */
export function sizeSourceSplit(events: AnalyticsEvent[], group?: string) {
  const scoped = (group ? events.filter((e) => e.experiment_group === group) : events).filter(
    (e) => e.name === 'add_to_bag' && e.props.selected_size,
  );
  const recommended = scoped.filter((e) => e.props.size_source === 'recommended').length;
  const manual = scoped.length - recommended;
  const matchedRecommendation = scoped.filter(
    (e) => e.props.recommended_size && e.props.recommended_size === e.props.selected_size,
  ).length;
  return { total: scoped.length, recommended, manual, matchedRecommendation };
}
