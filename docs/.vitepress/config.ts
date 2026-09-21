import { defineConfig } from 'vitepress'
import { fileURLToPath } from 'node:url'

// Developer documentation for the Meddleware platform. Integration guides, design-system usage,
// self-host runbooks, and Sui development patterns. User-facing product docs live at docs.meddleware.co.uk.
// Output is pinned to the repo-root dist/ so the Dockerfile's `COPY --from=build /app/dist` works unchanged.
const outDir = fileURLToPath(new URL('../../dist', import.meta.url))
const srcDir = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  title: 'Meddleware Dev',
  description:
    'Integration guides, design system usage, and Sui development patterns for the Meddleware platform.',
  lang: 'en-GB',
  srcDir,
  outDir,
  cleanUrls: true,
  lastUpdated: false,
  appearance: 'dark',
  head: [['meta', { name: 'theme-color', content: '#5e1622' }]],

  themeConfig: {
    search: { provider: 'local' },

    nav: [
      {
        text: 'Web',
        items: [
          { text: 'Getting started', link: '/getting-started/' },
          { text: 'Design system', link: '/design-system/' },
        ],
      },
      {
        text: 'Blockchain',
        items: [
          { text: 'Active', items: [{ text: 'Sui', link: '/sui/' }] },
          { text: 'Coming soon', items: [{ text: 'More blockchains', link: '/blockchain/' }] },
        ],
      },
      { text: 'API reference →', link: 'https://docs.meddleware.co.uk/blockchain/sui/' },
      // TODO white-label: { text: 'Operator guides', link: '/operator/' }
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting started',
          items: [
            { text: 'Overview', link: '/getting-started/' },
            { text: 'Toolchain', link: '/getting-started/toolchain' },
            { text: 'Local development', link: '/getting-started/local-dev' },
          ],
        },
      ],
      '/design-system/': [
        {
          text: 'Design system',
          items: [
            { text: 'Overview', link: '/design-system/' },
            { text: 'Design tokens', link: '/design-system/tokens' },
            { text: 'Components', link: '/design-system/components' },
          ],
        },
      ],
      '/sui/': [
        {
          text: 'Sui',
          items: [
            { text: 'Overview', link: '/sui/' },
            { text: 'Environment setup', link: '/sui/environment' },
            { text: 'PTB patterns', link: '/sui/ptb-patterns' },
          ],
        },
        {
          text: 'Walrus Storage',
          collapsed: true,
          items: [
            { text: 'SDK setup', link: '/sui/walrus-storage/' },
            { text: 'Integration guide', link: '/sui/walrus-storage/integration' },
            { text: 'Self-host a relay', link: '/sui/walrus-storage/relay-self-host' },
            // TODO white-label: { text: 'White-label operator guide', link: '/sui/walrus-storage/operator' }
          ],
        },
        {
          text: 'Sealed Storage',
          collapsed: true,
          items: [
            { text: 'SDK setup', link: '/sui/sealed-storage/' },
            { text: 'Integration guide', link: '/sui/sealed-storage/integration' },
            { text: 'Writing policies', link: '/sui/sealed-storage/policies' },
            // TODO white-label: { text: 'White-label operator guide', link: '/sui/sealed-storage/operator' }
          ],
        },
        {
          text: 'Access Gate',
          collapsed: true,
          items: [
            { text: 'SDK setup', link: '/sui/access-gate/' },
            { text: 'Integration guide', link: '/sui/access-gate/integration' },
            { text: 'Deploy the gateway', link: '/sui/access-gate/gateway' },
            // TODO white-label: { text: 'White-label operator guide', link: '/sui/access-gate/operator' }
          ],
        },
        {
          text: 'DAO',
          collapsed: true,
          items: [
            { text: 'Governance patterns', link: '/sui/dao/' },
            // TODO white-label: { text: 'White-label operator guide', link: '/sui/dao/operator' }
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/meddleware-org' }],

    footer: {
      message: 'Developer documentation for the Meddleware platform.',
      copyright: 'Meddleware · 0BSD',
    },
  },
})
