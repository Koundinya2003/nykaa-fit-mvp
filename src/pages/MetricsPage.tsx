import { useMemo, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import {
  BrandFitHistoryPanel,
  clearEvents,
  clearOutcomes,
  clearResolutions,
  clearFitProfile,
  getEvents,
  metricCounts,
  subscribeEvents,
  wishlistConversion,
  useFitOutcomes,
  type AnalyticsEvent,
} from '@/features/nykaa-fit';
import Breadcrumbs from '@/components/Breadcrumbs';
import '@/styles/metrics.css';

/* =========================================================================
   /metrics — the instrumentation, made visible.

   Every metric claimed on the success slide has an event behind it, and this
   page is how that claim is checked rather than asserted: nine named metrics,
   the raw event each one counts, and the count this browser has actually
   recorded.

   Nothing on this page is simulated. A count of zero means the event has not
   fired in this browser, not that the metric is broken — and a rate with no
   denominator is shown as "no data", never as 0%.
   ========================================================================= */

const RECENT_EVENTS = 40;

export default function MetricsPage() {
  const events = useSyncExternalStore(subscribeEvents, getEvents, () => [] as AnalyticsEvent[]);
  const outcomes = useFitOutcomes();
  const [showRaw, setShowRaw] = useState(false);

  const metrics = useMemo(() => metricCounts(events), [events]);
  const wishlist = useMemo(() => wishlistConversion(events), [events]);

  const max = Math.max(1, ...metrics.map((m) => m.count));

  const resetAll = () => {
    clearEvents();
    clearOutcomes();
    clearResolutions();
    clearFitProfile();
  };

  return (
    <div className="page metrics">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Metrics' }]} />

      <header className="metrics__head">
        <div>
          <p className="metrics__eyebrow">Internal · instrumentation</p>
          <h1 className="display metrics__title">Success metrics</h1>
          <p className="metrics__lede">
            Every metric on the success slide, and the event that backs it. Counts are read from
            this browser&rsquo;s own localStorage log — nothing here is simulated, and an empty
            count means the event has not fired yet on this device.
          </p>
        </div>
        <div className="metrics__actions">
          <Link to="/demo" className="btn btn--accent btn--sm">
            Seed the walkthrough
          </Link>
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
            Reset all local data
          </button>
        </div>
      </header>

      {/* ---- The primary metric ---- */}
      <section className="metrics__section">
        <h2 className="metrics__section-title">
          Primary metric — wishlisted items purchased within {wishlist.windowDays} days
        </h2>
        <div className="metrics__primary">
          <div className="metrics__big">
            <span className="metrics__big-value">
              {wishlist.rate === null ? 'No data' : `${Math.round(wishlist.rate * 100)}%`}
            </span>
            <span className="metrics__big-label">
              {wishlist.purchasedWithinWindow} of {wishlist.saved} saved items bought in the window
            </span>
          </div>
          <dl className="metrics__facts">
            <div>
              <dt>Items saved</dt>
              <dd>{wishlist.saved}</dd>
            </div>
            <div>
              <dt>Fit resolved</dt>
              <dd>{wishlist.resolved}</dd>
            </div>
            <div>
              <dt>Bought after resolving</dt>
              <dd>{wishlist.purchasedAfterResolve}</dd>
            </div>
          </dl>
        </div>
        <p className="metrics__note">
          A rate needs a denominator: with no saved items this reads &ldquo;no data&rdquo; rather
          than 0%. The comparison that matters is the last column against the first — items whose
          fit question was answered versus items still carrying it.
        </p>
      </section>

      {/* ---- The nine instrumented events ---- */}
      <section className="metrics__section">
        <h2 className="metrics__section-title">Instrumented events</h2>
        <ol className="funnel">
          {metrics.map((m) => (
            <li key={m.spec.id} className="funnel__row">
              <div className="funnel__head">
                <code className="funnel__id">{m.spec.id}</code>
                <span className="funnel__count">{m.count}</span>
              </div>
              <div className="funnel__bar" aria-hidden>
                <span style={{ width: `${(m.count / max) * 100}%` }} />
              </div>
              <p className="funnel__meta">
                {m.spec.label} · logged as{' '}
                <code>{m.spec.sources.join(', ')}</code>
                {m.spec.whereLabel && <> · {m.spec.whereLabel}</>}
                {m.products > 0 && <> · {m.products} distinct products</>}
              </p>
              <p className="funnel__note">{m.spec.note}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- Brand fit history ---- */}
      <section className="metrics__section">
        <h2 className="metrics__section-title">Per-brand fit history</h2>
        <p className="metrics__lede">
          What drives the cross-brand comparison, and what the reported outcomes have changed.{' '}
          {outcomes.length === 0
            ? 'No outcomes reported on this device yet — place an order and answer "did it fit?" to see these move.'
            : `${outcomes.length} outcome${outcomes.length === 1 ? '' : 's'} reported on this device.`}
        </p>
        <BrandFitHistoryPanel />
      </section>

      {/* ---- Raw log ---- */}
      <section className="metrics__section">
        <div className="metrics__rawhead">
          <h2 className="metrics__section-title">Raw event log</h2>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setShowRaw((s) => !s)}
            aria-expanded={showRaw}
          >
            {showRaw ? 'Hide' : `Show last ${RECENT_EVENTS}`} ({events.length} total)
          </button>
        </div>

        {showRaw && (
          <div className="metrics__scroll">
            <table className="metrics__table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Arm</th>
                  <th scope="col">Properties</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {[...events]
                  .slice(-RECENT_EVENTS)
                  .reverse()
                  .map((e) => (
                    <tr key={e.id}>
                      <td>
                        <code>{e.name}</code>
                      </td>
                      <td>{e.experiment_group}</td>
                      <td className="metrics__props">
                        {Object.entries(e.props)
                          .filter(([, v]) => v !== undefined && v !== null)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(' · ') || '—'}
                      </td>
                      <td>{new Date(e.ts).toLocaleTimeString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="metrics__foot">
        Deeper experiment read-outs — arm splits, guardrails and the impact model — live on{' '}
        <Link to="/fit-lab">the Fit Lab</Link>. Body measurements are never included in an event;
        the log carries the decision, not the person.
      </p>
    </div>
  );
}
