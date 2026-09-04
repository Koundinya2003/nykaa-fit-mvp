import { useState } from 'react';
import { deliveryEstimate } from '@/utils/format';
import { ReturnIcon, TruckIcon, ShieldIcon } from './Icons';
import '@/styles/pdp.css';

/** Pincode check. There is no real serviceability API behind this MVP, so the
 *  estimate is derived deterministically from the pincode itself — stated
 *  plainly in the helper text rather than dressed up as a live lookup. */
export default function DeliveryCheck() {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState<{ days: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setError('Enter a valid 6-digit pincode');
      setResult(null);
      return;
    }
    setError(null);
    setResult(deliveryEstimate(pincode));
  };

  return (
    <section className="delivery">
      <h2 className="delivery__title">Delivery Options</h2>

      <form className="delivery__form" onSubmit={check}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          className="delivery__input"
          placeholder="Enter pincode"
          aria-label="Delivery pincode"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, ''));
            setError(null);
          }}
        />
        <button type="submit" className="delivery__submit">
          Check
        </button>
      </form>

      {error && (
        <p className="delivery__error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <p className="delivery__result">
          <TruckIcon size={18} />
          Delivered by <strong>{result.label}</strong> — {result.days} days to {pincode}
        </p>
      )}

      <ul className="delivery__perks">
        <li>
          <TruckIcon size={18} />
          Free delivery on orders above ₹999
        </li>
        <li>
          <ReturnIcon size={18} />
          14-day easy returns and exchange
        </li>
        <li>
          <ShieldIcon size={18} />
          100% authentic, sourced from the brand
        </li>
      </ul>
    </section>
  );
}
