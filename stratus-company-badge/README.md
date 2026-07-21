# STRATUS Company & Station Badge

A small Chrome Manifest V3 extension that shows the active STRATUS company and signed-in station in the top black navigation bar.

## Install

1. Unzip this package.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the unzipped extension folder.
6. Open or refresh STRATUS.

The badge appears toward the right side of the black navigation bar, with room reserved for the account icons, in this format:

`COMPANY  Silicon Valley Mechanical  |  STATION  Admin_Kyle McCabe`

When no station is signed in, it displays:

`COMPANY  Silicon Valley Mechanical  |  STATION  Not signed in`

The badge is anchored to the top of the webpage, not the browser viewport. It scrolls away with the top navigation instead of following you down the page.

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

The badge defaults to the right side of the top bar and reserves space for the account icons. It uses `position: absolute`, so it does not follow the viewport while scrolling. To move it, edit the `.badge` CSS inside `content.js`.

Examples:

- Farther left: increase the minimum and maximum values in `right: clamp(185px, 15vw, 235px);`
- Farther right: decrease those values, but leave enough room for the account icons
- Near the left navigation: use `left: 500px; right: auto; transform: none;`

After editing, reload the extension from `chrome://extensions`.
