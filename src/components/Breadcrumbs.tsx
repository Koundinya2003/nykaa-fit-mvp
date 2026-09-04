import { Link } from 'react-router-dom';
import { ChevronRight } from './Icons';
import '@/styles/listing.css';

interface Props {
  trail: { label: string; to?: string }[];
}

export default function Breadcrumbs({ trail }: Props) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol>
        {trail.map((item, i) => (
          <li key={`${item.label}-${i}`}>
            {item.to ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
            {i < trail.length - 1 && <ChevronRight size={14} className="crumbs__sep" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
