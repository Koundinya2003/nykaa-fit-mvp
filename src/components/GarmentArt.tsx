import { useId } from 'react';
import { shade } from '@/utils/color';

/* =========================================================================
   GarmentArt — every product photo in this MVP is drawn, not fetched.

   Rationale: a portfolio prototype must never show a broken image, and we
   cannot redistribute real catalogue photography. So each product renders a
   deterministic vector illustration tinted with its own colourway. Switching
   the colour on the PDP genuinely re-renders the garment.
   ========================================================================= */

export type GarmentKind = 'dresses' | 'tops' | 'jeans' | 'shirts' | 't-shirts' | 'shoes';
export type GarmentView = 'front' | 'back' | 'detail' | 'styled';
export type ShoeStyle = 'sneaker' | 'heel' | 'boot' | 'flat';

interface Props {
  kind: GarmentKind;
  hex: string;
  view?: GarmentView;
  shoeStyle?: ShoeStyle;
  className?: string;
  /** `cover` fills the frame (product tiles), `contain` fits inside it (hero). */
  fit?: 'cover' | 'contain';
  /** Drops the studio backdrop so the garment can sit on a page background. */
  bare?: boolean;
  /** Decorative art is hidden from assistive tech; the wrapper supplies alt text. */
  title?: string;
}

const SKIN = '#d8b79a';
const SKIN_DARK = '#c19d80';

/* ---------- Silhouettes (viewBox 0 0 600 800, mirrored about x = 300) ---------- */

const DRESS_BODY =
  'M300 130c-30 0-52 6-64 16l-44 34c18 28 30 52 36 78l14 16c-12 66-36 214-66 396 44 26 204 26 248 0-30-182-54-330-66-396l14-16c6-26 18-50 36-78l-44-34c-12-10-34-16-64-16z';

const TOP_BODY =
  'M300 146c-28 0-48 6-59 15l-49 33c17 26 29 48 35 72l14 15c-6 44-11 106-13 172 42 16 102 16 144 0-2-66-7-128-13-172l14-15c6-24 18-46 35-72l-49-33c-11-9-31-15-59-15z';

const TEE_BODY =
  'M300 148c-27 0-46 6-57 14l-62 32c14 30 26 56 32 82l18 12c-6 50-10 116-12 178 44 16 118 16 162 0-2-62-6-128-12-178l18-12c6-26 18-52 32-82l-62-32c-11-8-30-14-57-14z';

const SHIRT_BODY =
  'M300 150c-26 0-45 6-56 14l-52 34c16 28 27 52 33 76l13 14c-6 52-10 122-12 194 42 17 106 17 148 0-2-72-6-142-12-194l13-14c6-24 17-48 33-76l-52-34c-11-8-30-14-56-14z';

/* Sleeves are separate shapes drawn behind the body so long-sleeved styles
   do not read as vests. Short-sleeved kinds return null and rely on the cap
   built into the body path. */
const SLEEVES: Partial<Record<GarmentKind, string>> = {
  shirts:
    'M192 198l-42 222 64 16 34-166zM408 198l42 222-64 16-34-166z',
  dresses:
    'M192 180l-34 178 62 14 28-134zM408 180l34 178-62 14-28-134z',
  tops: 'M192 194l-26 130 56 12 22-96zM408 194l26 130-56 12-22-96z',
};

const CUFFS: Partial<Record<GarmentKind, string>> = {
  shirts: 'M152 404l62 16M448 404l-62 16',
  dresses: 'M160 344l60 14M440 344l-60 14',
  tops: 'M168 312l54 12M432 312l-54 12',
};

/* Jeans are drawn as one closed path: waistband, hips, inner crotch V, legs. */
const JEANS_BODY =
  'M206 168c-4 44-6 96-2 152 4 56 10 132 12 210 2 62 2 108 0 150 30 8 62 8 92 0 2-52 0-116-2-176-2-52-4-96-6-140 6 44 8 88 10 140 2 60 4 124 2 176 30 8 62 8 92 0-2-42-2-88 0-150 2-78 8-154 12-210 4-56 2-108-2-152-62-14-146-14-208 0z';

interface ShoeShape {
  /** Outsole, drawn on top of the upper so it reads as a separate unit. */
  sole: string;
  /** Main body of the shoe, side profile facing right. */
  upper: string;
  /** Optional stroked detail — laces, shaft seams, topline. */
  lines?: string;
  /** Optional filled detail — a side stripe or a heel stem. */
  accent?: string;
}

/* Side profiles, all sharing a baseline near y = 470 and spanning roughly
   x 90 → 560 so every footwear tile has the same optical weight. */
const SHOE_PATHS: Record<ShoeStyle, ShoeShape> = {
  sneaker: {
    upper:
      'M118 470C110 400 116 344 140 312C150 298 168 296 178 306C190 318 196 332 214 340C232 348 250 336 262 316C276 292 296 292 312 312C334 340 352 366 378 386C412 412 452 426 496 436C524 442 538 452 538 462L538 470Z',
    sole:
      'M100 462L548 462C562 462 566 476 560 490C552 508 530 518 500 518L130 518C104 518 92 506 92 488C92 472 92 462 100 462Z',
    lines: 'M268 348L322 334M280 378L338 362M296 408L354 392',
    accent:
      'M186 462C238 438 286 400 318 352C330 334 356 346 346 366C310 424 254 468 200 494C182 504 168 472 186 462Z',
  },
  boot: {
    upper:
      'M140 470C130 380 132 300 138 236C141 208 160 194 194 194C232 194 250 210 258 244C272 306 292 356 322 386C356 420 420 438 486 452C518 458 532 462 532 470Z',
    sole:
      'M96 456L552 456C566 456 570 472 562 488C552 510 528 522 496 522L126 522C100 522 86 508 86 488C86 470 88 456 96 456Z',
    lines: 'M146 268H254M148 316H262M152 364H274M156 412H296',
  },
  heel: {
    upper:
      'M152 470C148 410 168 356 210 332C250 310 288 322 306 356C326 394 366 424 424 440C470 452 508 456 524 458C534 459 536 468 528 470Z',
    sole:
      'M150 462L530 462C540 462 542 472 536 478C526 486 508 490 486 490L168 490C154 490 146 480 150 462Z',
    accent:
      'M166 486L150 606C148 620 160 626 172 622C182 618 186 610 186 600L200 488Z',
    lines: 'M226 340C258 386 306 418 366 436',
  },
  flat: {
    upper:
      'M150 470C146 434 162 404 192 388C224 370 256 380 274 404C294 430 332 448 388 456C438 464 488 468 518 468C530 468 532 478 522 480Z',
    sole:
      'M142 470L528 470C540 470 544 480 538 488C528 498 506 504 478 504L166 504C148 504 138 492 142 470Z',
    lines: 'M204 420C254 444 322 460 400 464',
  },
};

/* ---------- Fabric textures for the "detail" shot ---------- */

function textureFor(kind: GarmentKind, id: string, ink: string) {
  switch (kind) {
    case 'jeans':
      return (
        <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 12L12 0M-3 3L3 -3M9 15L15 9" stroke={ink} strokeWidth="2" opacity="0.28" />
        </pattern>
      );
    case 't-shirts':
      return (
        <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 10q3.5-8 7 0t7 0" fill="none" stroke={ink} strokeWidth="1.6" opacity="0.26" />
        </pattern>
      );
    case 'shirts':
      return (
        <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 0h10M0 5h10" stroke={ink} strokeWidth="1.2" opacity="0.2" />
          <path d="M0 0v10M5 0v10" stroke={ink} strokeWidth="1.2" opacity="0.14" />
        </pattern>
      );
    case 'shoes':
      return (
        <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.6" fill={ink} opacity="0.22" />
          <circle cx="12" cy="10" r="1.2" fill={ink} opacity="0.18" />
          <circle cx="7" cy="13" r="1" fill={ink} opacity="0.14" />
        </pattern>
      );
    default:
      return (
        <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M9 2a7 7 0 100 14 7 7 0 100-14" fill="none" stroke={ink} strokeWidth="1.1" opacity="0.2" />
        </pattern>
      );
  }
}

/* ---------- Per-kind detailing drawn on top of the silhouette ---------- */

function Detailing({
  kind,
  view,
  dark,
  light,
}: {
  kind: GarmentKind;
  view: GarmentView;
  dark: string;
  light: string;
}) {
  const isBack = view === 'back';
  const line = { stroke: dark, strokeWidth: 2, fill: 'none', opacity: 0.5 } as const;

  if (kind === 'jeans') {
    return (
      <g>
        <path d="M206 196c62-14 146-14 208 0" {...line} />
        <path d="M206 168c62-14 146-14 208 0" {...line} />
        {!isBack && (
          <>
            <path d="M300 200v96" {...line} />
            <path d="M232 206c14 22 40 30 62 26" {...line} />
            <path d="M368 206c-14 22-40 30-62 26" {...line} />
          </>
        )}
        {isBack && (
          <>
            <path d="M238 226h56v46h-56zM306 226h56v46h-56z" {...line} />
            <path d="M262 180v-24M338 180v-24" {...line} />
          </>
        )}
        <path d="M300 336c-2 60-4 120-6 176" {...line} />
      </g>
    );
  }

  if (kind === 'shoes') return null;

  const neckY = kind === 'dresses' ? 148 : kind === 'shirts' ? 168 : 164;

  return (
    <g>
      {/* Neckline */}
      {isBack ? (
        <path d={`M258 ${neckY}q42 22 84 0`} stroke={dark} strokeWidth="3" fill="none" opacity="0.55" />
      ) : (
        <path
          d={`M254 ${neckY - 6}q46 44 92 0`}
          fill={dark}
          opacity="0.35"
        />
      )}

      {/* Shirt collar + placket + buttons */}
      {kind === 'shirts' && !isBack && (
        <>
          <path d="M300 176l-42-22-18 34 46 26zM300 176l42-22 18 34-46 26" fill={light} opacity="0.9" />
          <path d="M294 190v256h12V190z" fill={dark} opacity="0.22" />
          {[228, 276, 324, 372, 420].map((y) => (
            <circle key={y} cx="300" cy={y} r="5" fill={light} stroke={dark} strokeWidth="1.4" />
          ))}
        </>
      )}

      {/* Ribbed neck band on tees */}
      {kind === 't-shirts' && (
        <path
          d={isBack ? 'M256 162q44 24 88 0' : 'M252 158q48 40 96 0'}
          fill="none"
          stroke={light}
          strokeWidth="9"
          opacity="0.75"
        />
      )}

      {/* Waist seam / centre-back seam */}
      {kind === 'dresses' && (
        <path
          d={isBack ? 'M300 260v396' : 'M232 296q68 26 136 0'}
          stroke={dark}
          strokeWidth="2"
          fill="none"
          opacity="0.4"
        />
      )}

      {kind === 'tops' && isBack && <path d="M300 176v242" {...line} />}

      {/* Sleeve hems */}
      <path
        d={
          kind === 't-shirts'
            ? 'M181 194l50 26M419 194l-50 26'
            : 'M192 194l44 24M408 194l-44 24'
        }
        stroke={dark}
        strokeWidth="2.5"
        fill="none"
        opacity="0.45"
      />
    </g>
  );
}

function bodyPath(kind: GarmentKind): string {
  switch (kind) {
    case 'dresses':
      return DRESS_BODY;
    case 'tops':
      return TOP_BODY;
    case 't-shirts':
      return TEE_BODY;
    case 'shirts':
      return SHIRT_BODY;
    case 'jeans':
      return JEANS_BODY;
    default:
      return '';
  }
}

export default function GarmentArt({
  kind,
  hex,
  view = 'front',
  shoeStyle = 'sneaker',
  className,
  fit = 'cover',
  bare = false,
  title,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const bgId = `bg-${uid}`;
  const fabricId = `fab-${uid}`;
  const texId = `tex-${uid}`;
  const shadowId = `sh-${uid}`;

  const dark = shade(hex, -0.34);
  const darker = shade(hex, -0.55);
  const light = shade(hex, 0.34);

  const shoes = SHOE_PATHS[shoeStyle];

  return (
    <svg
      viewBox="0 0 600 800"
      className={className}
      role="img"
      aria-label={title}
      preserveAspectRatio={fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'}
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6f1ea" />
          <stop offset="58%" stopColor="#ebe3d9" />
          <stop offset="100%" stopColor="#dcd1c3" />
        </linearGradient>
        <linearGradient id={fabricId} x1="0.15" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="42%" stopColor={hex} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <radialGradient id={shadowId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#4a3f37" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4a3f37" stopOpacity="0" />
        </radialGradient>
        {textureFor(kind, texId, darker)}
      </defs>

      {!bare && <rect width="600" height="800" fill={`url(#${bgId})`} />}

      {/* ---------------- Fabric close-up ---------------- */}
      {view === 'detail' ? (
        <g>
          <rect width="600" height="800" fill={`url(#${fabricId})`} />
          <rect width="600" height="800" fill={`url(#${texId})`} />
          <path d="M0 470h600" stroke={darker} strokeWidth="3" opacity="0.45" />
          <path
            d="M0 452h600"
            stroke={light}
            strokeWidth="2.5"
            strokeDasharray="14 12"
            opacity="0.85"
          />
          <path
            d="M0 488h600"
            stroke={light}
            strokeWidth="2.5"
            strokeDasharray="14 12"
            opacity="0.6"
          />
          {kind === 'jeans' ? (
            <>
              <circle cx="430" cy="238" r="26" fill={light} opacity="0.9" />
              <circle cx="430" cy="238" r="13" fill={darker} opacity="0.55" />
            </>
          ) : (
            <>
              <circle cx="420" cy="250" r="34" fill={light} opacity="0.92" />
              <circle cx="420" cy="250" r="30" fill="none" stroke={darker} strokeWidth="2" opacity="0.4" />
              <circle cx="409" cy="241" r="4" fill={darker} opacity="0.6" />
              <circle cx="431" cy="241" r="4" fill={darker} opacity="0.6" />
              <circle cx="409" cy="261" r="4" fill={darker} opacity="0.6" />
              <circle cx="431" cy="261" r="4" fill={darker} opacity="0.6" />
            </>
          )}
          <ellipse cx="300" cy="800" rx="420" ry="150" fill={`url(#${shadowId})`} />
        </g>
      ) : (
        <g>
          {/* Ground shadow */}
          <ellipse
            cx="300"
            cy={kind === 'shoes' ? 528 : 706}
            rx={kind === 'shoes' ? 240 : 170}
            ry="34"
            fill={`url(#${shadowId})`}
          />

          {/* Abstract mannequin behind the garment on the styled shot. Faceless
              and neutral on purpose — it reads as a display form, not a person. */}
          {view === 'styled' && kind !== 'shoes' && (
            <g>
              <path d="M258 420h36v336a18 18 0 0 1-36 0z" fill={SKIN} />
              <path d="M306 420h36v336a18 18 0 0 1-36 0z" fill={SKIN} />
              <path d="M246 150h108v300H246z" fill={SKIN_DARK} />
              <path
                d="M216 180 176 430M384 180l40 250"
                stroke={SKIN}
                strokeWidth="34"
                strokeLinecap="round"
                fill="none"
              />
              <path d="M283 116h34v50h-34z" fill={SKIN_DARK} />
              <circle cx="300" cy="88" r="42" fill={SKIN} />
            </g>
          )}

          {kind === 'shoes' ? (
            <g transform={view === 'back' ? 'translate(600 0) scale(-1 1)' : undefined}>
              <path d={shoes.upper} fill={`url(#${fabricId})`} />
              <path d={shoes.upper} fill={`url(#${texId})`} opacity="0.5" />
              {shoes.accent && <path d={shoes.accent} fill={light} opacity="0.9" />}
              <path d={shoes.upper} fill="none" stroke={darker} strokeWidth="2.5" opacity="0.5" />
              {shoes.lines && (
                <path
                  d={shoes.lines}
                  fill="none"
                  stroke={darker}
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.45"
                />
              )}
              <path
                d={shoes.sole}
                fill={shade(hex, 0.62)}
                stroke={darker}
                strokeWidth="2.5"
                strokeOpacity="0.5"
              />
            </g>
          ) : (
            <g transform={view === 'back' ? 'translate(600 0) scale(-1 1)' : undefined}>
              {/* The denim path accumulates ~11px of drift to the right of the
                  600-wide frame; nudge it back so it sits on the axis. */}
              <g transform={kind === 'jeans' ? 'translate(-11 0)' : undefined}>
              {SLEEVES[kind] && (
                <>
                  <path d={SLEEVES[kind]} fill={`url(#${fabricId})`} />
                  <path d={SLEEVES[kind]} fill={`url(#${texId})`} opacity="0.55" />
                  <path
                    d={SLEEVES[kind]}
                    fill="none"
                    stroke={darker}
                    strokeWidth="2.5"
                    opacity="0.5"
                  />
                  <path
                    d={CUFFS[kind]}
                    fill="none"
                    stroke={darker}
                    strokeWidth="2.5"
                    opacity="0.4"
                  />
                </>
              )}
              <path d={bodyPath(kind)} fill={`url(#${fabricId})`} />
              <path d={bodyPath(kind)} fill={`url(#${texId})`} opacity="0.55" />
              <Detailing kind={kind} view={view} dark={darker} light={light} />
              <path
                d={bodyPath(kind)}
                fill="none"
                stroke={darker}
                strokeWidth="2.5"
                opacity="0.5"
              />
              </g>
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
