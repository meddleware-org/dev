# Design tokens

`@meddleware/design-tokens` ships four entry points:

| Import | Use |
| --- | --- |
| `@meddleware/design-tokens/tokens.css` | CSS custom properties — **always required** |
| `@meddleware/design-tokens/seasons.css` | Optional seasonal accent overrides |
| `@meddleware/design-tokens/tokens.json` | Raw JSON token tree for tooling |
| `@meddleware/design-tokens` (JS) | TypeScript re-export of the token tree |

## Two-layer naming discipline

**Layer 1 — palette/ramp (colour-named):** These are the raw hue swatches. Components never reference them directly.

```css
--mw-red-500   --mw-red-300   --mw-red-600
--mw-blue-500  --mw-blue-300
--mw-yellow-400  --mw-green-500
/* …and legacy brand ramps: --mw-oxblood-*, --mw-indigo-*, --mw-gold-* */
```

**Layer 2 — semantic roles (colour-agnostic):** What your components and apps should use. Revaluing them later never requires renaming.

```css
--accent          /* primary action (red) */
--secondary       /* secondary action (blue) */
--warning         /* caution/advisory (yellow) */
--ok              /* success/positive (green) */
--danger          /* error/destructive (red) */
--info            /* informational (blue) */
--focus-ring      /* keyboard focus indicator */
--highlight       /* text emphasis (yellow) */
--bg  --surface  --text  --muted  --border  --lift
```

## Sacred-geometry scales

All spacing and type sizes are derived from the golden ratio (φ = 1.618) via `calc()`. Nothing is a magic number.

### Spacing (Fibonacci)

```css
--space-3xs:  0.25rem   /* 4px  */
--space-2xs:  0.5rem    /* 8px  */
--space-xs:   0.75rem   /* 12px */
--space-sm:   1.25rem   /* 20px */
--space-md:   2rem      /* 32px */
--space-lg:   3.25rem   /* 52px */
--space-xl:   5.25rem   /* 84px */
--space-2xl:  8.5rem    /* 136px */
--space-3xl:  13.75rem  /* 220px */
```

### Type scale (φ-derived modular)

```css
--font-size-base:  1rem
--font-size-sm:    calc(var(--font-size-base) / var(--ratio-phi-root))  /* ~0.787rem */
--font-size-lg:    calc(var(--font-size-base) * var(--ratio-phi-root))  /* ~1.272rem */
--font-size-xl:    calc(var(--font-size-base) * var(--ratio-phi))       /* ~1.618rem */
--font-size-2xl:   calc(var(--font-size-xl)   * var(--ratio-phi))       /* ~2.618rem */
--font-size-3xl:   calc(var(--font-size-2xl)  * var(--ratio-phi))       /* ~4.236rem */
```

### Ratios and splits

```css
--ratio-phi:      1.618
--ratio-phi-inv:  0.618
--ratio-phi-root: 1.272
--split-major:    61.8%   /* φ-split: use for hero/content layouts */
--split-minor:    38.2%
```

## Seasonal theming

Import `seasons.css` and set `data-season` on `<html>` (or any ancestor). The season overrides accent, highlight, status tints, and a faint background tint. Dark mode composes independently.

```ts
// Enable seasonal theming
import '@meddleware/design-tokens/seasons.css'
```

```html
<!-- Spring: green/yellow accents -->
<html data-season="spring">

<!-- Summer: bright blue/red -->
<html data-season="summer">

<!-- Autumn: orange/amber -->
<html data-season="autumn">

<!-- Winter: cool blue/desaturated -->
<html data-season="winter">
```

Seasons compose with `data-theme`:

```html
<html data-theme="dark" data-season="winter">
```

To override a single role while keeping seasonal fallback:

```css
/* In your app's CSS — defines --season-accent for the current season scope */
:root {
  --season-accent: #0066cc;  /* overrides the spring/summer/etc. accent locally */
}
```

Not importing `seasons.css` is a valid opt-out — every role uses its light/dark primary fallback silently. No console warnings.

## Chaos and motion tokens

```css
--noise-overlay     /* SVG noise layer (use with .mw-noise utility class) */
--noise-opacity: 0.035
--hero-offset       /* φ-derived horizontal offset for intentional asymmetry */
--gap-irregular     /* slightly non-uniform gap for human presence */
--transition-base: 140ms cubic-bezier(0.2, 0, 0.2, 1)
--transition-slow: 320ms cubic-bezier(0.2, 0, 0.2, 1)
```

## TypeScript / JSON usage

```ts
import { primary, ratio, space, semantic } from '@meddleware/design-tokens'

console.log(primary.red[500])    // "#d92d20"
console.log(ratio.phi)           // 1.618
console.log(space.md)            // "2rem"
console.log(semantic.dark.accent) // "#ef5a4c"
```
