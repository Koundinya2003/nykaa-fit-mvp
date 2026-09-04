import EmptyState from '@/components/EmptyState';
import '@/styles/listing.css';

export default function NotFoundPage() {
  return (
    <div className="page section">
      <EmptyState
        title="We couldn't find that page"
        body="The link may be out of date, or the product may no longer be in the catalogue."
        ctaLabel="Back to home"
        ctaTo="/"
      />
    </div>
  );
}
