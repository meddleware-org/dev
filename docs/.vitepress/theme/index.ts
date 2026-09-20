// Dev theme = VitePress default theme + Meddleware brand overrides.
// The design-token CSS is imported so the palette stays in lockstep with the apps; custom.css
// maps VitePress's --vp-c-brand-* onto the functional primary ramps from design-tokens.
import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import '@meddleware/design-tokens/tokens.css'
import './custom.css'

const theme: Theme = {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'home-hero-actions-after': () =>
        h('p', { class: 'home-explore-prompt' }, 'Choose a topic above to start building.'),
    }),
}

export default theme
