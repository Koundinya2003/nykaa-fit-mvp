import { MinusIcon, PlusIcon } from './Icons';
import '@/styles/bag.css';

interface Props {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  label: string;
}

export default function QuantityStepper({ value, min = 1, max = 5, onChange, label }: Props) {
  return (
    <div className="qty" role="group" aria-label={label}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <MinusIcon />
      </button>
      <span className="qty__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
