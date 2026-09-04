import type { Product, ProductImage as ProductImageMeta } from '@/types';
import GarmentArt, { type GarmentKind, type ShoeStyle } from './GarmentArt';

/** Footwear needs a silhouette that matches the style, which we read off the
 *  product name rather than adding another field to every shoe record. */
export function shoeStyleFor(product: Product): ShoeStyle {
  const n = product.name.toLowerCase();
  if (n.includes('boot')) return 'boot';
  if (n.includes('heel') || n.includes('wedge') || n.includes('sandal')) return 'heel';
  if (n.includes('ballerina') || n.includes('flat') || n.includes('loafer')) return 'flat';
  return 'sneaker';
}

export function garmentKindFor(product: Product): GarmentKind {
  return product.subcategory as GarmentKind;
}

interface Props {
  product: Product;
  /** Which colourway to render. Falls back to the first colour. */
  colorName?: string;
  view?: ProductImageMeta['view'];
  className?: string;
}

export default function ProductImageView({ product, colorName, view = 'front', className }: Props) {
  const color = product.colors.find((c) => c.name === colorName) ?? product.colors[0];
  const meta = product.images.find((i) => i.colorName === color.name && i.view === view);

  return (
    <GarmentArt
      kind={garmentKindFor(product)}
      hex={color.hex}
      view={view}
      shoeStyle={shoeStyleFor(product)}
      className={className}
      title={meta?.alt ?? `${product.brand} ${product.name}`}
    />
  );
}
