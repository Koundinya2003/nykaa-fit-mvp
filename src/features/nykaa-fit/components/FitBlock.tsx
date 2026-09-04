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
  /** Applies a size to the PDP's size selector. */
  onSelectSize: (size: string, source: 'recommended') => void;
}

type PanelMode = 'closed' | 'form' | 'result';

/**
 * Orchestrates the whole Nykaa Fit surface on a PDP:
 * no profile -> CTA -> form -> result, and on later visits the saved profile
 * short-circuits straight to a recommendation card.
 *
 * Renders nothing at all in the control bucket or on ineligible products, so
 * the existing PDP is untouched for everyone outside the experiment.
 */
export default function FitBlock({
  product,
  state,
  viewKey,
  selectedSize,
  onSelectSize,
}: Props) {
  const { enabled, eligible, profile, recommendation, selectable } = state;
  const [mode, setMode] = useState<PanelMode>('closed');
  /** Distinguishes a first-time result from one served off a saved profile. */
  const [justCompleted, setJustCompleted] = useState(false);

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
        recommended_size: recommendation.recommendedSize,
        match_quality: recommendation.matchQuality,
        match_score: recommendation.matchScore,
        fit_profile_used: true,
      },
    );
  }, [recommendation, profile, product.id, product.brand, product.subcategory, viewKey]);

  // Moving to another product closes the panel and clears the one-shot flag.
  useEffect(() => {
    setMode('closed');
    setJustCompleted(false);
  }, [product.id]);

  if (!enabled || !eligible) return null;

  const openForm = (origin: 'cta' | 'edit') => {
    if (origin === 'cta') {
      track('fit_cta_clicked', {
        product_id: product.id,
        brand: product.brand,
        category: product.subcategory,
        fit_eligible: true,
        fit_profile_used: false,
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
    });
    setJustCompleted(true);
    setMode('result');
  };

  const handleSelect = (size: string) => {
    track('fit_recommendation_accepted', {
      product_id: product.id,
      brand: product.brand,
      category: product.subcategory,
      recommended_size: size,
      selected_size: size,
      match_quality: recommendation?.matchQuality,
      match_score: recommendation?.matchScore,
      changed_from_recommendation: false,
      fit_profile_used: true,
    });
    onSelectSize(size, 'recommended');
    setMode('closed');
  };

  const applied = Boolean(recommendation && selectedSize === recommendation.recommendedSize);

  return (
    <>
      {recommendation ? (
        <FitProfileSummary
          recommendation={recommendation}
          applied={applied}
          selectable={selectable}
          onSelect={handleSelect}
          onSeeWhy={() => {
            setJustCompleted(false);
            setMode('result');
          }}
          onEditProfile={() => openForm('edit')}
        />
      ) : (
        <FitCTA onClick={() => openForm('cta')} />
      )}

      <FitPanel
        open={mode !== 'closed'}
        title={mode === 'form' ? 'Find My Fit' : 'Your recommended size'}
        subtitle={
          mode === 'form'
            ? "Tell us a little about yourself and we'll recommend a size for this product."
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
            fromSavedProfile={!justCompleted}
            onSelect={handleSelect}
            onEditProfile={() => openForm('edit')}
            onNavigateAway={() => setMode('closed')}
          />
        )}
      </FitPanel>
    </>
  );
}
