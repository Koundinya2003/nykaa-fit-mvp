import { useEffect, useRef } from 'react';
import { CloseIcon } from '@/components/Icons';
import '../styles/nykaa-fit.css';

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Centred dialog on desktop, bottom sheet on mobile. Locks page scroll,
 *  closes on Escape and on scrim click, and returns focus on close. */
export default function FitPanel({ open, title, subtitle, onClose, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    returnFocusTo.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // Move focus into the dialog so keyboard users are not left behind it.
    const focusTarget = panelRef.current?.querySelector<HTMLElement>(
      'input, button, [tabindex]:not([tabindex="-1"])',
    );
    focusTarget?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      returnFocusTo.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fit-panel" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fit-panel__scrim" onClick={onClose} />
      <div className="fit-panel__sheet" ref={panelRef}>
        <header className="fit-panel__head">
          <div>
            <h2 className="fit-panel__title">{title}</h2>
            {subtitle && <p className="fit-panel__sub">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        <div className="fit-panel__body">{children}</div>
      </div>
    </div>
  );
}
