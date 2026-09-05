import { useMemo, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getEvents, subscribeEvents, type FitEventName } from '@/features/nykaa-fit';
import { isTourVisible, setTourVisible, subscribeTour } from '@/utils/tourState';
import { CheckIcon, CloseIcon } from './Icons';
import '@/styles/tour.css';

/* =========================================================================
   What to try.

   A grader has ten minutes and no map. This strip is the map: four steps in
   the order that makes the argument, each ticking itself off when the event
   behind it actually fires.

   The ticks come from the analytics log rather than from route history, so
   the strip cannot claim a step was completed unless the instrumentation
   recorded it — which doubles as a live demonstration that the instrumentation
   works.
   ========================================================================= */

interface Step {
  label: string;
  detail: string;
  to: string;
  /** Completing any of these marks the step done. */
  events: FitEventName[];
}

const STEPS: Step[] = [
  {
    label: 'Save a few things',
    detail: 'The wishlist is where the fit question lives',
    to: '/wishlist',
    events: ['wishlist_item_saved'],
  },
  {
    label: 'Enter your measurements',
    detail: 'Bust, waist, hip — yours, not ours',
    to: '/fit-profile',
    events: ['fit_profile_completed'],
  },
  {
    label: 'Resolve the wishlist',
    detail: 'One pass sizes every saved item',
    to: '/wishlist',
    events: ['wishlist_item_resolved'],
  },
  {
    label: 'Open a product and change your fit',
    detail: 'Watch the size move, and see what we used',
    to: '/p/wd-002',
    events: ['fit_preference_changed', 'fit_recommendation_accepted'],
  },
];

export default function EvaluatorStrip() {
  const visible = useSyncExternalStore(subscribeTour, isTourVisible, () => false);
  const events = useSyncExternalStore(subscribeEvents, getEvents, () => []);
  const { pathname } = useLocation();

  const done = useMemo(() => {
    const names = new Set(events.map((e) => e.name));
    return STEPS.map((step) => step.events.some((n) => names.has(n)));
  }, [events]);

  // The strip is guidance for the storefront; on the instrumentation pages it
  // is noise.
  if (!visible || pathname === '/metrics' || pathname === '/fit-lab') return null;

  const completed = done.filter(Boolean).length;

  return (
    <aside className="tour" aria-label="Evaluator walkthrough">
      <div className="tour__inner">
        <p className="tour__lead">
          <span className="tour__badge">What to try</span>
          <span className="tour__progress">
            {completed} of {STEPS.length}
          </span>
        </p>

        <ol className="tour__steps">
          {STEPS.map((step, i) => (
            <li key={step.label} className={`tour__step ${done[i] ? 'is-done' : ''}`}>
              <Link to={step.to} className="tour__link">
                <span className="tour__marker" aria-hidden>
                  {done[i] ? <CheckIcon size={12} /> : i + 1}
                </span>
                <span className="tour__copy">
                  <span className="tour__label">{step.label}</span>
                  <span className="tour__detail">{step.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <Link to="/metrics" className="tour__metrics">
          See the funnel
        </Link>

        <button
          type="button"
          className="tour__close"
          onClick={() => setTourVisible(false)}
          aria-label="Hide the walkthrough strip"
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </aside>
  );
}
