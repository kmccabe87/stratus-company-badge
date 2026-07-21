# STRATUS Company & Station Badge

A small Chrome Manifest V3 extension that shows the active STRATUS company and signed-in station in the top black navigation bar.

## Install

1. Unzip this package.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the unzipped extension folder.
6. Open or refresh STRATUS.

The badge appears at the top center of the black navigation bar in this format:

`COMPANY  Silicon Valley Mechanical  |  STATION  Admin_Kyle McCabe`

The badge is anchored to the top of the webpage, not the browser viewport. It scrolls away with the top navigation instead of following you down the page.

## How detection works

- The extension looks for the exact **Signed into** label in the STRATUS user menu.
- It also looks for the exact **Signed into station** label.
- It reads the value immediately following each label.
- If the menu is not yet in the page, the extension makes one best-effort attempt to open and close the account menu.
- The detected company and station are cached in `chrome.storage.local`, so they can appear immediately on later page loads.
- A MutationObserver re-checks the page after STRATUS single-page navigation updates.

## Manual overrides

Click the extension's toolbar icon to enter a company, a station, or both manually. Select **Use auto-detect** to remove both overrides and return to automatic detection.

## Privacy and scope

- The extension runs only on `gtpstratus.com` and its subdomains.
- It makes no external network requests.
- It stores only the detected or manually entered company and station names in the local Chrome profile.

## If the badge does not appear

1. Confirm the STRATUS page address ends in `gtpstratus.com`.
2. If your STRATUS deployment uses a different domain, edit `manifest.json` and replace the two entries in `content_scripts.matches` with your actual HTTPS domain.
3. Open `chrome://extensions`, click the extension's **Reload** button, and refresh STRATUS.
4. Open the STRATUS user menu once. The extension should capture both values and cache them.
5. As a fallback, enter the values through the extension popup.

## Position adjustment

The badge defaults to the top center and uses `position: absolute`, so it does not follow the viewport while scrolling. To move it, edit the `.badge` CSS inside `content.js`.

Examples:

- Near the right side: replace `left: 50%; transform: translateX(-50%);` with `left: auto; right: 220px; transform: none;`
- Near the left navigation: use `left: 500px; transform: none;`

After editing, reload the extension from `chrome://extensions`.
