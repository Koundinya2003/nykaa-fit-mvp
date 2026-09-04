import { Link } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { CloseIcon } from './Icons';
import '@/styles/layout.css';

export default function Toasts() {
  const { toasts, dismissToast } = useShop();
  if (toasts.length === 0) return null;

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast__msg">{t.message}</span>
          {t.actionTo && t.actionLabel && (
            <Link to={t.actionTo} className="toast__action" onClick={() => dismissToast(t.id)}>
              {t.actionLabel}
            </Link>
          )}
          <button
            type="button"
            className="toast__close"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(t.id)}
          >
            <CloseIcon size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
