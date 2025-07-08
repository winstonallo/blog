import starlight from "@astrojs/starlight";
import "@fontsource-variable/roboto-mono";
import lunaria from "@lunariajs/starlight";
import { defineConfig } from "astro/config";
import starlightBlog from "starlight-blog";
import starlightCoolerCredit from "starlight-cooler-credit";
import starlightImageZoom from "starlight-image-zoom";
import starlightLinksValidator from "starlight-links-validator";
import starlightThemeRapide from "starlight-theme-rapide";

// https://astro.build/config
export default defineConfig({
  site: "https://winstonallo.sh",
  integrations: [
    starlight({
      title: "Blog",
      customCss: [
        "./src/styles/custom.css",
        "@fontsource-variable/roboto-mono/wght.css",
      ],
      social: [
        {
          icon: "linkedin",
          label: "LinkedIn",
          href: "https://linkedin.com/in/arthur-bied-charreton",
        },
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/winstonallo",
        },
      ],
      defaultLocale: "root",
      locales: {
        root: {
          label: "English",
          lang: "en",
        },
      },
      lastUpdated: true,
      // logo: {
      //   light: "./src/assets/light-logo.png",
      //   dark: "./src/assets/dark-logo.png",
      //   replacesTitle: true,
      // },
      head: [
        // {
        //   tag: "meta",
        //   attrs: {
        //     name: "fediverse:creator",
        //     content: "@trueberryless@mastodon.social",
        //   },
        // },
        {
          tag: "script",
          attrs: {
            src: "https://rybbit-be.lou.gg/api/script.js",
            "data-site-id": "3",
            defer: true,
          },
        },
      ],
      routeMiddleware: "./src/routeData.ts",
      plugins: [
        starlightLinksValidator({
          exclude: ["/blog/tags/*"],
          errorOnRelativeLinks: false,
        }),
        starlightImageZoom(),
        starlightThemeRapide(),
        starlightCoolerCredit({
          credit: "Starlight Blog",
        }),
        starlightBlog({
          title: "winstonallo.sh",
          recentPostCount: 3,
          prevNextLinksOrder: "chronological",
          navigation: "none",
          metrics: {
            readingTime: true,
            words: "rounded",
          },
          authors: {
            winstonallo: {
              name: "Arthur Bied-Charreton",
              title: "winstonallo",
              url: "https://winstonallo.sh",
              picture: "/ai.jpg",
            },
          },
        }),
      ],
      components: {
        MarkdownContent: "./src/components/MarkdownContent.astro",
        TableOfContents: "./src/components/TableOfContents.astro",
        Hero: "./src/components/Hero.astro",
        PageTitle: "./src/components/PageTitle.astro",
      },
      pagination: false,
    }),
  ],
  redirects: {
    "/": "/blog",
  },
});
