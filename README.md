# STRATUS Company & Station Badge

A small Chrome Manifest V3 extension that shows the active STRATUS company and signed-in station in the top black navigation bar.

## Install

1. Unzip this package.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the unzipped extension folder.
6. Open or refresh STRATUS.

The badge appears immediately to the left of the STRATUS chat-bubble icon in this format:

`COMPANY  Silicon Valley Mechanical  |  STATION  Admin_Kyle McCabe`

When no station is signed in, it displays:

`COMPANY  Silicon Valley Mechanical  |  STATION  Not signed in`

The badge is anchored to the top of the webpage, not the browser viewport. It scrolls away with the top navigation instead of following you down the page.

## Chat-icon positioning

Version 1.1.5 finds the chat-bubble control in the live page DOM and measures its screen position. The badge's right edge is placed 30 pixels to the left of that icon. Its vertical center is matched to the icon's vertical center, placing the badge in the top-to-bottom middle of the black navigation bar.

The position is recalculated when:

- STRATUS finishes rendering its top navigation.
- The page DOM changes.
- The browser window is resized or zoom changes the layout.
- A page is restored from the browser back-forward cache.

If the chat control cannot be identified, the extension falls back to the previous reserved right-side position.

## Fresh detection behavior

Version 1.1.2 performs a fresh account-menu check whenever:

- STRATUS is refreshed.
- STRATUS is opened in a new tab.
- A page is restored from the browser back-forward cache.

The badge no longer starts by displaying a station cached by another page or tab. It temporarily shows **Detecting…**, opens and closes the account menu in the background, and then displays the current result.

STRATUS omits the **Signed into station** section when no station is active. When the extension confirms that the account menu is open and that section is absent, it clears the previously detected station and displays **Not signed in**.

## How detection works

- The extension looks for the exact **Signed into** label in the STRATUS user menu.
- It also looks for the **Signed into station** label.
- It reads the value immediately following each label.
- If the menu is not yet in the page, the extension makes a best-effort attempt to open and close it.
- The current page/tab maintains its own fresh detection state.
- The latest confirmed result is stored in `chrome.storage.local` for display in the extension popup, but the top badge does not trust that cached result after a refresh or in a new tab.
- A MutationObserver re-checks the page when the user opens the account menu manually or STRATUS updates the page.

## Manual overrides

Click the extension's toolbar icon to enter a company, a station, or both manually. Select **Use auto-detect** to remove both overrides and return to automatic detection.

Manual overrides intentionally take precedence over fresh detection until they are removed.

## Privacy and scope

- The extension runs only on `gtpstratus.com` and its subdomains.
- It makes no external network requests.
- It stores only the detected or manually entered company and station names in the local Chrome profile.

## If the badge does not update

1. Open `chrome://extensions`.
2. Click **Reload** on the extension card after replacing its files.
3. Refresh STRATUS with `Ctrl+R`.
4. If automatic opening is blocked by a future STRATUS page change, open the user menu once. The MutationObserver will read it immediately.
5. As a fallback, enter the values through the extension popup.

## Position adjustment

The badge uses `position: absolute`, so it stays at the top of the webpage and scrolls away with the navigation. Its horizontal position is normally calculated from the chat icon rather than from a fixed CSS offset.

The chat-icon gap is controlled by `CHAT_ICON_GAP_PX` in `content.js` and is set to 30 pixels. When the icon is found, the badge's `top` position is calculated from the icon center. `FALLBACK_RIGHT_OFFSET_PX` and `FALLBACK_TOP_PX` are used only when the chat icon cannot be found.

After editing, reload the extension from `chrome://extensions`.
