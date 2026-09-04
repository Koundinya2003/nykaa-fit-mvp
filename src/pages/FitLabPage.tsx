import { useMemo, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '@/components/Breadcrumbs';
import { formatINR } from '@/utils/format';
import {
  adoptionMetrics,
  behaviourMetrics,
  buildFunnel,
  clearEvents,
  conversionReadout,
  getEvents,
  MIN_ARM_VIEWS,
  MIN_RATE_SAMPLE,
  projectImpact,
  returnsReadout,
  subscribeEvents,
  type ImpactAssumptions,
  type RateMetric,
} from '@/features/nykaa-fit/analytics/fitAnalytics';
import {
  EXPERIMENT_SALT,
  getUnitId,
  hasVariantOverride,
  setVariantOverride,
  TREATMENT_ALLOCATION,
  type Variant,
} from '@/features/nykaa-fit/experiment/variant';
import { useVariant } from '@/features/nykaa-fit/experiment/useVariant';
import { useFitProfile } from '@/features/nykaa-fit/utils/useFitProfile';
import { clearFitProfile } from '@/features/nykaa-fit/utils/fitStorage';
import { FIT_ELIGIBLE_CATEGORY_LABEL } from '@/features/nykaa-fit/utils/eligibility';
import '@/styles/fit-lab.css';

/* =========================================================================
   Internal experiment console. Not part of the shopping experience.

   Structured around the product hypothesis rather than around the feature,
   so the question it answers is "should we keep investing in this?" and not
   "is anyone clicking it?".

   Every figure is counted from this browser's own event log. Nothing is
   simulated. Where there is not enough data, it says so.
   ========================================================================= */

const VALIDATION_QUESTIONS = [
  'Is fit uncertainty actually a significant reason for PDP abandonment?',
  'Do shoppers use a personalised recommendation when it is offered?',
  'Do recommendations change which size gets selected?',
  'Does treatment increase Add-to-Bag conversion?',
  'Does that carry through to completed purchases?',
  'Does it reduce size-related returns?',
  'Is the effect large enough to justify expanding beyond dresses?',
];

const MVP_LIMITATIONS = [
  'Mock product and brand sizing data',
  'Heuristic body estimation, not an anthropometric model',
  'No historical Nykaa purchase or return data',
  'No empirical accuracy validation of any recommendation',
  'Local analytics only — one browser, no warehouse',
  'No real production experiment or randomised traffic',
];

const PRODUCTION_REQUIREMENTS = [
  'Actual brand size charts, ingested per brand and per season',
  'Garment measurements, not only body-block charts',
  'Historical order data keyed to size',
  'Size-specific return reason codes',
  'Customer feedback on fit after delivery',
  'A controlled A/B test with a powered sample size',
];

/** Illustrative starting points for the scenario model. They are assumptions
 *  the reader is expected to change, not measurements. */
const DEFAULT_ASSUMPTIONS: ImpactAssumptions = {
  monthlyEligibleViews: 500000,
  baselineAddToBagCvr: 0.08,
  expectedConversionLift: 0.05,
  averageOrderValue: 1800,
  baselineSizeReturnRate: 0.12,
  expectedReturnReduction: 0.1,
  averageReturnCost: 250,
};

function pct(value: number | null, digits = 1): string {
  return value === null ? '—' : `${(value * 100).toFixed(digits)}%`;
}

/**
 * A rate is only rendered as a percentage once the denominator can carry one.
 * "1 of 1" displayed as 100% is the single easiest way for a prototype to
 * imply a result it has not earned.
 */
function MetricRow({ metric }: { metric: RateMetric }) {
  const tooFew = metric.rate !== null && metric.denominator < MIN_RATE_SAMPLE;

  return (
    <div className="fitlab__metric">
      <p className="fitlab__metric-label">{metric.label}</p>
      <p className="fitlab__metric-value">
        {metric.rate === null ? (
          <span className="fitlab__nodata">No data yet</span>
        ) : tooFew ? (
          <span className="fitlab__smallsample">
            {metric.numerator} of {metric.denominator}
          </span>
        ) : (
          pct(metric.rate)
        )}
      </p>
      <p className="fitlab__metric-note">
        {tooFew
          ? `Under ${MIN_RATE_SAMPLE} observations — rate withheld · ${metric.detail}`
          : `${metric.numerator} / ${metric.denominator} · ${metric.detail}`}
      </p>
    </div>
  );
}

export default function FitLabPage() {
  const events = useSyncExternalStore(subscribeEvents, getEvents, () => []);
  const variant = useVariant();
  const profile = useFitProfile();
  const [scope, setScope] = useState<'all' | Variant>('all');
  const [assumptions, setAssumptions] = useState<ImpactAssumptions>(DEFAULT_ASSUMPTIONS);

  const scoped = scope === 'all' ? undefined : scope;
  const funnel = buildFunnel(events, scoped);
  const adoption = adoptionMetrics(events, scoped);
  const behaviour = behaviourMetrics(events, scoped);
  const conversion = conversionReadout(events);
  const returns = returnsReadout();
  const projection = useMemo(() => projectImpact(assumptions), [assumptions]);
  const topOfFunnel = funnel[0].count || 1;

  const byGroup = {
    control: events.filter((e) => e.experiment_group === 'control').length,
    treatment: events.filter((e) => e.experiment_group === 'treatment').length,
  };

  const set = <K extends keyof ImpactAssumptions>(key: K, value: number) =>
    setAssumptions((a) => ({ ...a, [key]: value }));

  return (
    <div className="page fitlab">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Fit Lab' }]} />

      <header className="fitlab__head">
        <p className="eyebrow">Internal &middot; not part of the shopping experience</p>
        <h1 className="display fitlab__title">Nykaa Fit &mdash; Experiment Console</h1>

        <div className="fitlab__hypothesis">
          <p className="fitlab__hypothesis-label">Hypothesis under test</p>
          <p className="fitlab__hypothesis-text">
            For shoppers who are already interested in a fashion product, uncertainty about fit can
            reduce purchase confidence and contribute to size-related returns. Personalised fit
            guidance <strong>may</strong> increase purchase conversion while reducing size-related
            returns.
          </p>
          <p className="fitlab__hypothesis-note">
            A hypothesis to validate, not an established result. Nothing in this build demonstrates
            that Nykaa Fit improves conversion or reduces returns.
          </p>
        </div>
      </header>

      {/* ---- Mechanism ---- */}
      <section className="fitlab__section">
        <h2 className="fitlab__h2">The mechanism we think is at work</h2>
        <div className="fitlab__chains">
          <div className="fitlab__chain">
            <p className="fitlab__chain-title">The problem, if it is real</p>
            <ol className="fitlab__steps">
              <li>Fit uncertainty at the size selector</li>
              <li>Lower purchase confidence</li>
              <li>Higher PDP abandonment</li>
              <li className="is-outcome">Lower Add-to-Bag conversion</li>
            </ol>
            <ol className="fitlab__steps">
              <li>Wrong size selected</li>
              <li>Size-related return</li>
              <li className="is-outcome">Lost revenue and logistics cost</li>
            </ol>
          </div>

          <div className="fitlab__chain fitlab__chain--test">
            <p className="fitlab__chain-title">What Nykaa Fit tests</p>
            <ol className="fitlab__steps">
              <li>Personalised fit guidance</li>
              <li>Higher purchase confidence</li>
              <li className="is-outcome">Higher conversion</li>
            </ol>
            <ol className="fitlab__steps">
              <li>Better size selection</li>
              <li className="is-outcome">Fewer size-related returns</li>
            </ol>
          </div>
        </div>
      </section>

      {/* ---- Experiment design ---- */}
      <section className="fitlab__section">
        <h2 className="fitlab__h2">Experiment design</h2>
        <div className="fitlab__grid">
          <div className="fitlab__card">
            <p className="fitlab__card-label">Your group</p>
            <p className="fitlab__card-value">{variant}</p>
            <p className="fitlab__card-note">
              {hasVariantOverride() ? 'Pinned manually (QA override)' : 'Assigned by unit hash'}
            </p>
            <div className="fitlab__actions">
              <button
                type="button"
                className={`btn btn--sm ${variant === 'control' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setVariantOverride('control')}
              >
                Control
              </button>
              <button
                type="button"
                className={`btn btn--sm ${variant === 'treatment' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setVariantOverride('treatment')}
              >
                Treatment
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => setVariantOverride(null)}
                disabled={!hasVariantOverride()}
              >
                Unpin
              </button>
            </div>
          </div>

          <div className="fitlab__card">
            <p className="fitlab__card-label">Arms</p>
            <dl className="fitlab__deflist">
              <div>
                <dt>Control</dt>
                <dd>Existing PDP, no Nykaa Fit</dd>
              </div>
              <div>
                <dt>Treatment</dt>
                <dd>Existing PDP + Nykaa Fit</dd>
              </div>
              <div>
                <dt>Scope</dt>
                <dd>{FIT_ELIGIBLE_CATEGORY_LABEL}</dd>
              </div>
              <div>
                <dt>Allocation</dt>
                <dd>
                  {Math.round(TREATMENT_ALLOCATION * 100)}% treatment
                  {TREATMENT_ALLOCATION === 1 && ' — dev default; a live test runs 50/50'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="fitlab__card">
            <p className="fitlab__card-label">Randomisation</p>
            <dl className="fitlab__deflist">
              <div>
                <dt>Unit</dt>
                <dd>
                  <code>{getUnitId()}</code>
                </dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>FNV-1a hash of salt + unit</dd>
              </div>
              <div>
                <dt>Salt</dt>
                <dd>
                  <code>{EXPERIMENT_SALT}</code>
                </dd>
              </div>
              <div>
                <dt>Property</dt>
                <dd>Deterministic, reproducible off-client</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="fitlab__metricdef">
          <div>
            <p className="fitlab__card-label">Primary metric</p>
            <p className="fitlab__primary">Product view &rarr; Add to Bag conversion</p>
            <p className="fitlab__card-note">
              Nykaa Fit acts on uncertainty at the PDP, so the PDP decision is where an effect
              should first appear.
            </p>
          </div>
          <div>
            <p className="fitlab__card-label">Secondary</p>
            <ul className="fitlab__inline-list">
              <li>Product view &rarr; Purchase</li>
              <li>Fit adoption</li>
              <li>Recommendation acceptance</li>
              <li>Size-change rate</li>
              <li>Checkout completion</li>
            </ul>
            <p className="fitlab__card-note">
              Fit adoption is a feature metric, not a North Star. High adoption with flat conversion
              would mean the feature is used but not useful.
            </p>
          </div>
          <div>
            <p className="fitlab__card-label">Guardrails</p>
            <ul className="fitlab__inline-list">
              <li>Overall return rate</li>
              <li>Size-related return rate</li>
              <li>PDP bounce</li>
              <li>Checkout abandonment</li>
              <li>Page performance</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- Q1 ---- */}
      <section className="fitlab__section">
        <div className="fitlab__section-head">
          <h2 className="fitlab__h2">1 &middot; Are shoppers using it?</h2>
          <div className="fitlab__scope" role="group" aria-label="Filter by experiment group">
            {(['all', 'control', 'treatment'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`fitlab__scope-btn ${scope === option ? 'is-active' : ''}`}
                onClick={() => setScope(option)}
              >
                {option === 'all' ? 'All' : option}
                <span className="fitlab__scope-count">
                  {option === 'all' ? events.length : byGroup[option]}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="fitlab__metrics">
          {adoption.map((m) => (
            <MetricRow key={m.id} metric={m} />
          ))}
        </div>
      </section>

      {/* ---- Q2 ---- */}
      <section className="fitlab__section">
        <h2 className="fitlab__h2">2 &middot; Is it changing behaviour?</h2>
        <p className="fitlab__lede fitlab__lede--tight">
          Usage is not impact. These separate &ldquo;saw the recommendation&rdquo; from
          &ldquo;decided differently because of it&rdquo;.
        </p>
        <div className="fitlab__metrics">
          {behaviour.map((m) => (
            <MetricRow key={m.id} metric={m} />
          ))}
        </div>
      </section>

      {/* ---- Q3 ---- */}
      <section className="fitlab__section">
        <h2 className="fitlab__h2">3 &middot; Is it moving business outcomes?</h2>

        <div className="fitlab__arms">
          {[conversion.control, conversion.treatment].map((arm) => (
            <div key={arm.group} className={`fitlab__arm fitlab__arm--${arm.group}`}>
              <p className="fitlab__card-label">{arm.group}</p>
              <p className="fitlab__arm-value">
                {arm.addToBagCvr === null ? (
                  <span className="fitlab__nodata">Not enough data</span>
                ) : (
                  pct(arm.addToBagCvr)
                )}
              </p>
              <p className="fitlab__card-note">
                Add to Bag &middot; {arm.addToBag} of {arm.views} views
              </p>
              <dl className="fitlab__armstats">
                <div>
                  <dt>Checkout started</dt>
                  <dd>{arm.checkoutStarted}</dd>
                </div>
                <div>
                  <dt>Purchases</dt>
                  <dd>{arm.purchases}</dd>
                </div>
                <div>
                  <dt>View &rarr; Purchase</dt>
                  <dd>{arm.purchaseCvr === null ? '—' : pct(arm.purchaseCvr)}</dd>
                </div>
              </dl>
              {arm.underpowered && (
                <p className="fitlab__arm-warn">Under {MIN_ARM_VIEWS} views — rates withheld</p>
              )}
            </div>
          ))}

          <div className="fitlab__arm fitlab__arm--lift">
            <p className="fitlab__card-label">Conversion lift</p>
            <p className="fitlab__arm-value">
              {conversion.addToBagLift === null ? (
                <span className="fitlab__nodata">Not enough data to estimate impact</span>
              ) : (
                `${conversion.addToBagLift > 0 ? '+' : ''}${pct(conversion.addToBagLift)}`
              )}
            </p>
            <p className="fitlab__card-note">(Treatment CVR &minus; Control CVR) / Control CVR</p>
            <p className="fitlab__arm-warn">
              Both arms need at least {MIN_ARM_VIEWS} views before any rate is shown. That is a
              display floor, not statistical sufficiency — a real read-out needs randomised traffic,
              a powered sample and a significance test.
            </p>
          </div>
        </div>
      </section>

      {/* ---- Q4 ---- */}
      <section className="fitlab__section">
        <h2 className="fitlab__h2">4 &middot; Does it improve economics?</h2>
        <div className="fitlab__arms fitlab__arms--two">
          <div className="fitlab__arm">
            <p className="fitlab__card-label">Size-related return rate &middot; control</p>
            <p className="fitlab__arm-value">
              <span className="fitlab__nodata">Not enough data</span>
            </p>
          </div>
          <div className="fitlab__arm">
            <p className="fitlab__card-label">Size-related return rate &middot; treatment</p>
            <p className="fitlab__arm-value">
              <span className="fitlab__nodata">Not enough data</span>
            </p>
          </div>
        </div>
        <p className="fitlab__requirement">{returns.requirement}</p>
      </section>

      {/* ---- Impact model ---- */}
      <section className="fitlab__section">
        <div className="fitlab__section-head">
          <h2 className="fitlab__h2">Potential business impact</h2>
          <span className="fitlab__badge fitlab__badge--warn">
            Scenario model, not actual results
          </span>
        </div>
        <p className="fitlab__lede fitlab__lede--tight">
          Arithmetic on assumptions you set below. It sizes the prize <em>if</em> the hypothesis
          holds; it is not evidence that it does.
        </p>

        <div className="fitlab__model">
          <div className="fitlab__inputs">
            <label className="fitlab__input">
              <span>Monthly eligible PDP views</span>
              <input
                type="number"
                min={0}
                step={10000}
                value={assumptions.monthlyEligibleViews}
                onChange={(e) => set('monthlyEligibleViews', Math.max(0, Number(e.target.value)))}
              />
            </label>

            <label className="fitlab__input">
              <span>
                Baseline Add-to-Bag CVR <b>{pct(assumptions.baselineAddToBagCvr)}</b>
              </span>
              <input
                type="range"
                min={1}
                max={30}
                step={0.5}
                value={assumptions.baselineAddToBagCvr * 100}
                onChange={(e) => set('baselineAddToBagCvr', Number(e.target.value) / 100)}
              />
            </label>

            <label className="fitlab__input">
              <span>
                Expected conversion lift <b>{pct(assumptions.expectedConversionLift)}</b>
              </span>
              <input
                type="range"
                min={0}
                max={25}
                step={0.5}
                value={assumptions.expectedConversionLift * 100}
                onChange={(e) => set('expectedConversionLift', Number(e.target.value) / 100)}
              />
            </label>

            <label className="fitlab__input">
              <span>Average order value</span>
              <input
                type="number"
                min={0}
                step={100}
                value={assumptions.averageOrderValue}
                onChange={(e) => set('averageOrderValue', Math.max(0, Number(e.target.value)))}
              />
            </label>

            <label className="fitlab__input">
              <span>
                Baseline size-related return rate <b>{pct(assumptions.baselineSizeReturnRate)}</b>
              </span>
              <input
                type="range"
                min={0}
                max={40}
                step={0.5}
                value={assumptions.baselineSizeReturnRate * 100}
                onChange={(e) => set('baselineSizeReturnRate', Number(e.target.value) / 100)}
              />
            </label>

            <label className="fitlab__input">
              <span>
                Expected reduction in those returns <b>{pct(assumptions.expectedReturnReduction)}</b>
              </span>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={assumptions.expectedReturnReduction * 100}
                onChange={(e) => set('expectedReturnReduction', Number(e.target.value) / 100)}
              />
            </label>

            <label className="fitlab__input">
              <span>Average cost of a return</span>
              <input
                type="number"
                min={0}
                step={25}
                value={assumptions.averageReturnCost}
                onChange={(e) => set('averageReturnCost', Math.max(0, Number(e.target.value)))}
              />
            </label>

            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => setAssumptions(DEFAULT_ASSUMPTIONS)}
            >
              Reset assumptions
            </button>
          </div>

          <div className="fitlab__outputs">
            <div className="fitlab__output">
              <p className="fitlab__card-label">Incremental orders / month</p>
              <p className="fitlab__output-value">
                {Math.round(projection.incrementalOrders).toLocaleString('en-IN')}
              </p>
              <p className="fitlab__card-note">
                {Math.round(projection.baselineOrders).toLocaleString('en-IN')} baseline orders
                &times; {pct(assumptions.expectedConversionLift)} lift
              </p>
            </div>

            <div className="fitlab__output is-primary">
              <p className="fitlab__card-label">Incremental GMV / month</p>
              <p className="fitlab__output-value">{formatINR(projection.incrementalGmv)}</p>
              <p className="fitlab__card-note">Incremental orders &times; average order value</p>
            </div>

            <div className="fitlab__output">
              <p className="fitlab__card-label">Returns avoided / month</p>
              <p className="fitlab__output-value">
                {Math.round(projection.returnsAvoided).toLocaleString('en-IN')}
              </p>
              <p className="fitlab__card-note">
                Orders &times; size-return rate &times; expected reduction
              </p>
            </div>

            <div className="fitlab__output">
              <p className="fitlab__card-label">Return cost saved / month</p>
              <p className="fitlab__output-value">{formatINR(projection.returnCostSaved)}</p>
              <p className="fitlab__card-note">Returns avoided &times; cost per return</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Validation ---- */}
      <section className="fitlab__section">
        <h2 className="fitlab__h2">What we need to validate</h2>
        <ol className="fitlab__validate">
          {VALIDATION_QUESTIONS.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </section>

      {/* ---- Limitations ---- */}
      <section className="fitlab__section">
        <h2 className="fitlab__h2">Limitations and what production needs</h2>
        <div className="fitlab__two">
          <div>
            <p className="fitlab__card-label">Current MVP limitations</p>
            <ul className="fitlab__bullets">
              {MVP_LIMITATIONS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="fitlab__card-label">Production validation required</p>
            <ul className="fitlab__bullets fitlab__bullets--go">
              {PRODUCTION_REQUIREMENTS.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="fitlab__requirement">
          Today: a heuristic recommendation engine. Production: real brand size charts + garment
          measurements + historical purchase data + return reasons + customer feedback, calibrated
          against observed outcomes.
        </p>
      </section>

      {/* ---- Funnel + log ---- */}
      <section className="fitlab__section">
        <div className="fitlab__section-head">
          <h2 className="fitlab__h2">Funnel &amp; event log</h2>
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={clearEvents}
            disabled={events.length === 0}
          >
            Clear log
          </button>
        </div>

        <ul className="fitlab__funnel">
          {funnel.map((step) => (
            <li key={step.name}>
              <span className="fitlab__funnel-label">{step.label}</span>
              <span className="fitlab__funnel-track">
                <span
                  className="fitlab__funnel-fill"
                  style={{ width: `${Math.min(100, (step.count / topOfFunnel) * 100)}%` }}
                />
              </span>
              <span className="fitlab__funnel-count">{step.count}</span>
              <code className="fitlab__funnel-event">{step.name}</code>
            </li>
          ))}
        </ul>

        {events.length === 0 ? (
          <p className="fitlab__empty">
            Nothing recorded yet. <Link to="/c/dresses">Open a dress</Link> and walk the journey —
            events appear here as they fire.
          </p>
        ) : (
          <div className="fitlab__logwrap">
            <table className="fitlab__log">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Event</th>
                  <th scope="col">Group</th>
                  <th scope="col">Properties</th>
                </tr>
              </thead>
              <tbody>
                {[...events]
                  .reverse()
                  .slice(0, 60)
                  .map((e) => (
                    <tr key={e.id}>
                      <td>{new Date(e.ts).toLocaleTimeString('en-IN', { hour12: false })}</td>
                      <td>
                        <code>{e.name}</code>
                      </td>
                      <td>{e.experiment_group}</td>
                      <td className="fitlab__props">
                        {Object.entries(e.props)
                          .filter(([, v]) => v !== undefined && v !== null)
                          .map(([k, v]) => `${k}=${v}`)
                          .join('  ') || '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="fitlab__requirement">
          Body measurements never enter an event. The fit profile stays in local storage on the
          device; only the decision — which size was recommended, which was chosen — is recorded.
        </p>
      </section>

      {/* ---- Profile ---- */}
      <section className="fitlab__section">
        <h2 className="fitlab__h2">Fit profile on this device</h2>
        {profile ? (
          <div className="fitlab__card fitlab__card--narrow">
            <p className="fitlab__card-value fitlab__card-value--sm">
              {profile.heightCm} cm &middot; {profile.weightKg} kg
            </p>
            <p className="fitlab__card-note">
              {profile.gender} &middot; prefers {profile.preferredFit} fit
              {profile.bodyShape ? ` · ${profile.bodyShape}` : ''}
            </p>
            <div className="fitlab__actions">
              <button type="button" className="btn btn--sm btn--ghost" onClick={clearFitProfile}>
                Delete profile
              </button>
            </div>
          </div>
        ) : (
          <p className="fitlab__empty">
            None saved. Open a dress and use Find My Fit to create one.
          </p>
        )}
      </section>
    </div>
  );
}
