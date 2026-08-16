# STRATUS Company & Station Badge

![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4)
![Version](https://img.shields.io/badge/version-1.2.0-2F6EA8)
![License](https://img.shields.io/badge/license-MIT-5b9bd5)

A small Chrome Manifest V3 extension that shows your active STRATUS company and signed-in station in the top navigation bar of [gtpstratus.com](https://gtpstratus.com).

```
COMPANY  Silicon Valley Mechanical  |  STATION  Admin_Kyle McCabe
```

When no station is signed in, the station side displays **Not signed in**.

## Features

- **Live badge** — anchored 30 px to the left of the STRATUS chat-bubble icon, vertically centered on it, and scrolling with the top navigation.
- **Fresh detection** — re-runs on every refresh, new tab, and back/forward-cache restore; never shows a value cached by another tab.
- **Smart menu reading** — finds the `Signed into` and `Signed into station` labels in the account menu and best-effort opens/closes the menu in the background.
- **Manual overrides** — set a company and/or station by hand from the extension popup at any time.
- **Private by design** — runs only on `gtpstratus.com`, makes no network requests, and stores only detected/entered names in your local Chrome profile.

## Requirements

- Chrome or any Chromium-based browser that supports Manifest V3 extensions.
- A STRATUS account (badge data comes from the STRATUS user menu).

## Install

1. Clone this repository:

   ```powershell
   git clone https://github.com/kmccabe87/stratus-company-badge.git
   ```

2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked**.
5. Select the cloned `stratus-company-badge` folder.
6. Open or refresh STRATUS.

To update after pulling new changes, click **Reload** on the extension card and refresh STRATUS (`Ctrl+R`).

## How detection works

- The extension looks for the exact **Signed into** label (company) and the **Signed into station** label in the STRATUS user menu, then reads the value that follows each label.
- STRATUS omits the **Signed into station** section when no station is active; once the menu is confirmed open and the section is absent, the badge shows **Not signed in**.
- Each page/tab keeps its own detection state. The latest confirmed result is stored in `chrome.storage.local` so the extension popup can display it, but the top badge always re-checks on a fresh page.
- A `MutationObserver` re-checks when you open the account menu manually or STRATUS updates the page.

## Badge positioning

The chat-bubble control is located in the live DOM and measured on screen; the badge's right edge sits 30 px left of it, vertically centered. The position is recalculated when STRATUS finishes rendering, the DOM changes, the window is resized or zoomed, or a page is restored from the back/forward cache.

If the chat control cannot be identified, the badge falls back to a reserved right-side position.

## Manual overrides

Click the extension's toolbar icon to enter a company, a station, or both. **Use auto-detect** removes both overrides and returns to automatic detection. Manual overrides take precedence until removed.

## Troubleshooting

1. Reload the extension from `chrome://extensions` after replacing its files.
2. Refresh STRATUS with `Ctrl+R`.
3. If automatic menu opening is blocked by a future STRATUS page change, open the user menu once — the observer reads it immediately.
4. As a last resort, enter the values through the extension popup.

## Configuration

Tuning constants live at the top of [`content.js`](content.js):

| Constant | Purpose | Default |
| --- | --- | --- |
| `CHAT_ICON_GAP_PX` | Gap between the badge's right edge and the chat icon | `30` |
| `FALLBACK_RIGHT_OFFSET_PX` | Right offset used only when the chat icon is not found | `225` |
| `FALLBACK_TOP_PX` | Top offset used only when the chat icon is not found | `7` |

After editing, reload the extension from `chrome://extensions`.

## Project layout

```
stratus-company-badge/
├── manifest.json    # Extension manifest (MV3)
├── content.js       # Badge rendering, positioning, and detection
├── popup.html       # Toolbar popup markup
├── popup.css        # Toolbar popup styling
├── popup.js         # Manual override storage UI
└── icons/           # Extension icons (SVG)
```

## Privacy & scope

- Content script injected only on `https://gtpstratus.com/*` and its subdomains.
- Sole permission: `storage` (local profile storage for detected values and overrides).
- No external network requests. No analytics.

## License

[MIT](LICENSE) © Kyle McCabe
