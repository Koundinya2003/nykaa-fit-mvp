import { useEffect, useState } from 'react';
import type { Product } from '@/types';
import type { FitProfile } from '../types/fitTypes';
import type { FitState } from '../utils/useFitRecommendation';
import { saveFitProfile } from '../utils/fitStorage';
import { track, trackOnce } from '../analytics/fitAnalytics';
import FitCTA from './FitCTA';
import FitPanel from './FitPanel';
import FitProfileForm from './FitProfileForm';
import FitProfileSummary from './FitProfileSummary';
import FitResult from './FitResult';
import '../styles/nykaa-fit.css';

interface Props {
  product: Product;
  state: FitState;
  /** Stable per navigation entry; keeps impression events to one per view. */
  viewKey: string;
  selectedSize: string | null;
  onSelectSize: (size: string, source: 'recommended') => void;
  /** Opens the brand's published size chart — where a withheld
   *  recommendation sends the shopper instead of guessing. */
  onOpenSizeChart: () => void;
}

type PanelMode = 'closed' | 'form' | 'result';

/**
 * Orchestrates the Nykaa Fit surface on a product page:
 * no profile -> CTA -> form -> result, and on every later visit the saved
 * profile short-circuits straight to a recommendation.
 *
 * Renders nothing in the control bucket or on ineligible products, so the
 * existing page is untouched for everyone outside the experiment.
 */
export default function FitBlock({
  product,
  state,
  viewKey,
  selectedSize,
  onSelectSize,
  onOpenSizeChart,
}: Props) {
  const { enabled, eligible, profile, needsMeasurements, recommendation, selectable } = state;
  const [mode, setMode] = useState<PanelMode>('closed');

  // One impression per view per profile version — re-fires after an edit,
  // but not on a re-render or a StrictMode remount.
  useEffect(() => {
    if (!recommendation || !profile) return;
    trackOnce(
      `fit_recommendation_shown:${viewKey}:${product.id}:${profile.updatedAt}`,
      'fit_recommendation_shown',
      {
        product_id: product.id,
        brand: product.brand,
        category: product.subcategory,
        recommended_size: recommendation.confidence.withheld
          ? null
          : recommendation.recommendedSize,
        confidence_level: recommendation.confidence.level,
        withheld: recommendation.confidence.withheld,
        measurements_given: Object.keys(profile.measurements).length,
        fit_profile_used: true,
      },
    );
  }, [recommendation, profile, product.id, product.brand, product.subcategory, viewKey]);

  // Moving to another product closes the panel.
  useEffect(() => setMode('closed'), [product.id]);

  if (!enabled || !eligible) return null;

  const openForm = (origin: 'cta' | 'edit') => {
    if (origin === 'cta') {
      track('fit_cta_clicked', {
        product_id: product.id,
        brand: product.brand,
        category: product.subcategory,
        fit_eligible: true,
      });
    }
    track('fit_profile_started', {
      product_id: product.id,
      profile_origin: origin === 'edit' ? 'edited' : 'new',
    });
    setMode('form');
  };

  const handleSubmit = (input: Omit<FitProfile, 'createdAt' | 'updatedAt'>) => {
    const wasExisting = Boolean(profile);
    saveFitProfile(input);
    track('fit_profile_completed', {
      product_id: product.id,
      profile_origin: wasExisting ? 'edited' : 'new',
      measurements_given: Object.keys(input.measurements).length,
    });
    setMode('result');
  };

  const handleSelect = (size: string) => {
    track('fit_recommendation_accepted', {
      product_id: product.id,
      brand: product.brand,
      category: product.subcategory,
      recommended_size: size,
      selected_size: size,
      confidence_level: recommendation?.confidence.level,
      changed_from_recommendation: false,
      fit_profile_used: true,
    });
    onSelectSize(size, 'recommended');
    setMode('closed');
  };

  const applied = Boolean(
    recommendation &&
      !recommendation.confidence.withheld &&
      selectedSize === recommendation.recommendedSize,
  );

  return (
    <>
      {recommendation ? (
        <FitProfileSummary
          recommendation={recommendation}
          brand={product.brand}
          applied={applied}
          selectable={selectable}
          onSelect={handleSelect}
          onSeeWhy={() => setMode('result')}
          onEditProfile={() => openForm('edit')}
          onOpenSizeChart={onOpenSizeChart}
        />
      ) : (
        <FitCTA
          onClick={() => openForm('cta')}
          needsMeasurements={needsMeasurements}
          onOpenSizeChart={onOpenSizeChart}
        />
      )}

      <FitPanel
        open={mode !== 'closed'}
        title={mode === 'form' ? 'Your fit profile' : 'Your size in this style'}
        subtitle={
          mode === 'form'
            ? 'Your measurements, saved on this device and reused on every brand.'
            : `${product.brand} — ${product.name}`
        }
        onClose={() => setMode('closed')}
      >
        {mode === 'form' && (
          <FitProfileForm
            existing={profile}
            onSubmit={handleSubmit}
            onCancel={() => setMode('closed')}
          />
        )}

        {mode === 'result' && recommendation && profile && (
          <FitResult
            recommendation={recommendation}
            product={product}
            profile={profile}
            selectable={selectable}
            onSelect={handleSelect}
            onEditProfile={() => openForm('edit')}
            onNavigateAway={() => setMode('closed')}
            onOpenSizeChart={() => {
              setMode('closed');
              onOpenSizeChart();
            }}
          />
        )}
      </FitPanel>
    </>
  );
}
