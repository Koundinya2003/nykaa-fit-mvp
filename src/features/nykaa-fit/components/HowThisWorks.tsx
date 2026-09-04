import '../styles/nykaa-fit.css';

/**
 * Unobtrusive honesty note. The shopper is being given a recommendation about
 * their own body from two numbers — they are entitled to know how much
 * machinery is behind it, which right now is a heuristic and not a model
 * validated against real purchases.
 */
export default function HowThisWorks() {
  return (
    <details className="fit-how">
      <summary>How this works</summary>
      <p>
        We estimate your fit from your profile, this product&rsquo;s sizing information, its fit
        type and how the brand&rsquo;s garments tend to run. It is an estimate to help you decide,
        not a measurement of your body — and it improves as we learn which sizes people keep.
      </p>
      <p className="fit-how__privacy">
        Your height and weight stay on this device and are never sent anywhere.
      </p>
    </details>
  );
}
