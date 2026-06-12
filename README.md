# Tably

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/J3G820LBTF)

[![chrome-web-store](https://developer.chrome.com/static/docs/webstore/branding/image/mPGKYBIR2uCP0ApchDXE.png)](https://chromewebstore.google.com/detail/tably/acnbdinebifelgdihaakonbnfpllfoch)


A fast, minimalistic new tab page that puts your tabs front and center. No clutter, no distractions — just instant access to everything you need. Built for efficiency with zero loading overhead.

![Tably](./assets/main.png)

## Features

- **Instant tab search** — press `/` or `Ctrl+Shift+F` (`Cmd+Shift+F` on Mac) to fuzzy-find any open tab, bookmark, or history entry in milliseconds
- **Tab management** — view, switch, and close tabs directly from your new tab page. Detects duplicates and stale tabs automatically
- **Bookmarks & history** — search across all your bookmarks and browsing history without leaving the page
- **Lightweight** — no external requests on load, no analytics, no bloat. Opens as fast as an empty tab
- **Customizable themes** — 10+ preset color themes, light/dark/system mode, or create your own

### Search

Press `/` to open the unified search. Filter by tabs, bookmarks, or history — navigate with arrow keys, switch with Enter.

![Search](./assets/search.png)

### Themes

Choose from presets like Ocean, Forest, Sunset, or Noir — or build a fully custom palette.

![Themes](./assets/themes.png)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Load the `dist/` folder as an unpacked extension in Chrome.


## License

MIT — see [LICENSE](./LICENSE).
