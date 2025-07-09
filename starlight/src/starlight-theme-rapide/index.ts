import type { StarlightPlugin } from '@astrojs/starlight/types'

import { overrideComponents } from './libs/starlight'

export default function starlightThemeRapidePlugin(): StarlightPlugin {
  return {
    name: 'starlight-theme-rapide',
    hooks: {
      'config:setup'({ config, logger, updateConfig }) {
        const userExpressiveCodeConfig =
          !config.expressiveCode || config.expressiveCode === true ? {} : config.expressiveCode

        updateConfig({
          components: overrideComponents(config, ['LanguageSelect', 'Pagination', 'ThemeSelect'], logger),
          customCss: [
            ...(config.customCss ?? []),
            './src/starlight-theme-rapide/styles/layers.css',
            './src/starlight-theme-rapide/styles/theme.css',
            './src/starlight-theme-rapide/styles/base.css',
            ...(config.markdown?.headingLinks === false ? [] : ['./src/starlight-theme-rapide/styles/anchors.css']),
          ],
          expressiveCode:
            config.expressiveCode === false
              ? false
              : {
                themes: ['vitesse-dark', 'vitesse-light'],
                ...userExpressiveCodeConfig,
                styleOverrides: {
                  borderColor: 'var(--sl-rapide-ui-border-color)',
                  borderRadius: '0.5rem',
                  ...userExpressiveCodeConfig.styleOverrides,
                  frames: {
                    editorActiveTabIndicatorTopColor: 'unset',
                    editorActiveTabIndicatorBottomColor: 'var(--sl-color-gray-6)',
                    editorTabBarBorderBottomColor: 'var(--sl-rapide-ui-border-color)',
                    frameBoxShadowCssValue: 'unset',
                    ...userExpressiveCodeConfig.styleOverrides?.frames,
                  },
                  textMarkers: {
                    backgroundOpacity: '40%',
                    markBackground: 'var(--sl-rapide-ec-marker-bg-color)',
                    markBorderColor: 'var(--sl-rapide-ec-marker-border-color)',
                    ...userExpressiveCodeConfig.styleOverrides?.textMarkers,
                  },
                },
              },
        })
      },
    },
  }
}
