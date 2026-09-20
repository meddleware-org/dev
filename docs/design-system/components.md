# Components

`@meddleware/ui` exports a Vue 3 component library. All components are styled exclusively via CSS custom properties from `@meddleware/design-tokens` — no hardcoded values.

## Installation

```bash
npm install @meddleware/ui @meddleware/design-tokens
```

`vue ^3.5.0` is a peer dependency — supply your own.

## Layout shell

The three shell components share an identical prop API:

```vue
<AppHeader variant="dark" />
<AppSidebar variant="light" />
<AppFooter variant="transparent" :docs-url="DOCS_URL" :dev-url="DEV_URL" />
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `'dark' \| 'light' \| 'transparent'` | `'transparent'` | Colour scheme for the shell component (theme-independent — `'dark'` renders correctly on a light page) |
| `colors` | `PanelColors` | — | Per-instance override of any `--mw-panel-*` token |
| `docsUrl` | `string` | — | `AppFooter` only — "Documentation" link href |
| `devUrl` | `string` | — | `AppFooter` only — "Developer docs" link href |

### Slots

`AppHeader` and `AppSidebar` expose named slots for custom content:

```vue
<AppHeader variant="dark">
  <template #logo><!-- custom logo --></template>
  <template #nav><!-- nav links --></template>
  <template #actions>
    <ColorModeControl v-model="mode" />
  </template>
</AppHeader>

<AppSidebar variant="light">
  <template #head><!-- sidebar header --></template>
  <template #default>
    <SidebarItem label="Overview" :active="true" />
    <SidebarItem label="Settings" />
  </template>
  <template #foot><!-- sidebar footer --></template>
</AppSidebar>
```

## Colour mode

```ts
import { useColorMode } from '@meddleware/ui'
import type { ColorMode } from '@meddleware/ui'

const { mode } = useColorMode()   // ColorMode: 'light' | 'dark' | 'system'
mode.value = 'dark'               // sets data-theme="dark" on <html>, persists to localStorage
```

`ColorModeControl` is a presentational toggle — bind with `v-model`:

```vue
<ColorModeControl v-model="mode" />
```

## Primitives

| Component | Props | Notes |
| --- | --- | --- |
| `UiButton` | native `<button>` attrs | Styled with `--accent`, `--focus-ring`, `--transition-base` |
| `UiCard` | — | `--surface` background, `--border`, `--radius` |
| `UiSelect` | native `<select>` attrs | Styled with scale tokens; `--focus-ring` on focus |
| `UiNotice` | `variant: 'info' \| 'warning' \| 'danger' \| 'ok'` | Uses status role tokens |
| `SidebarItem` | `label`, `icon?`, `active?`, `disabled?` | Navigation item for `AppSidebar` |
| `CopyableAddress` | `address`, `truncate?`, `chars?`, `label?` | Copy-to-clipboard with icon; slot for link |
| `ExplorerLink` | `href`, `value?` | External block-explorer link; compose inside `CopyableAddress` |

### Copy + link pattern

```vue
<CopyableAddress :address="addr">
  <ExplorerLink :href="suiExplorerUrl('account', addr, 'testnet')" :value="addr" />
</CopyableAddress>
```

### Explorer helper

```ts
import { suiExplorerUrl } from '@meddleware/ui'

const url = suiExplorerUrl('txblock', txDigest, 'testnet')
// → https://suiscan.xyz/testnet/tx/<txDigest>
```

Supported kinds: `'account'`, `'object'`, `'txblock'`. Network defaults to `'testnet'`.

## CSS utilities (`base.css`)

Import `@meddleware/ui/base.css` to get element-level defaults and opt-in utility classes:

| Class | Effect |
| --- | --- |
| `.mw-noise` | Applies `--noise-overlay` as a `::before` layer — controlled imperfection |
| `.mw-spinner` | Sigil-like ring loader animation (settles on `prefers-reduced-motion`) |
| `.mw-hand-drawn` | Empty positioned hook — drop an `<svg>` or `<canvas>` inside for bespoke illustration |
| `.mw-mono` | Monospace font via `--mw-font-mono` |

All animations respect `prefers-reduced-motion`.
