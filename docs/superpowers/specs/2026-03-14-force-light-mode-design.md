# Force Light Mode — Safari Extension Design Spec

**Date:** 2026-03-14
**Status:** Approved

---

## Overview

A new, standalone Safari Web Extension that forces light mode on dark-themed websites. The user manually toggles it per-site via the Safari toolbar button. Per-site state persists across sessions via `browser.storage.local`.

---

## Goals

- Allow users to force a light appearance on websites that only offer a dark theme
- Work on macOS, iOS, and iPadOS from a single codebase
- Stay minimal: no options page, no popup, no auto-detection logic

## Non-Goals

- Auto-detecting dark pages
- Syncing state across devices
- Supporting browsers other than Safari
- A "personalized" DOM-walking color override (out of scope; CSS filter approach only)

---

## Architecture

### File Structure

```
ForceLight.xcodeproj          ← Xcode project (Swift app shell)
ForceLight/                   ← macOS/iOS app target (required by Safari)
Resources/
  manifest.json               ← Safari Web Extension manifest (MV3)
  background.js               ← toolbar button handler + storage
  content.js                  ← CSS filter injection/removal
  images/
    icon-on.png               ← toolbar icon, active state
    icon-off.png              ← toolbar icon, inactive state
```

### Components

**`background.js`**
- Listens for toolbar button click via `browser.action.onClicked` (MV3 API)
- Reads current tab hostname
- Toggles `sites[hostname]` in `browser.storage.local`
- Sends a `{ action: "toggle", enabled: bool }` message to the active tab's content script via `browser.tabs.sendMessage` — this is covered by `activeTab` when called within the `onClicked` handler (user gesture window); no `tabs` permission required
- Updates toolbar icon via `browser.action.setIcon({ tabId, path: "images/icon-on.png" })` / `icon-off.png` inside the `onClicked` handler; paths are relative to the extension root (the `Resources/` directory as defined by the manifest location)

**`content.js`**
- On page load: reads `browser.storage.local` for current hostname; if enabled, injects the filter style
- Listens for messages from `background.js` and applies or removes the filter immediately (no reload)
- Guards against duplicate injection by checking for element ID `force-light-style`

**`manifest.json`**
- Manifest version: 3 (MV3; supported by Safari 15.4+ on macOS, iOS 15.4+; recommended for new extensions)
- Permissions: `storage`, `activeTab`
- Content script: matches `<all_urls>`, runs at `document_start`
- Background: service worker declared as `"background": { "service_worker": "background.js" }` (MV3 stanza; do not use MV2's `"scripts"` key)

---

## CSS Technique

```css
/* Applied to the <html> element */
html {
  filter: invert(100%) hue-rotate(180deg) !important;
}

/* Re-invert media to preserve original colors */
img,
video,
picture,
[style*="background-image"] {
  filter: invert(100%) hue-rotate(180deg) !important;
}
```

The double-invert trick: inverting `html` flips dark→light across the entire page, then inverting images and video a second time cancels out the effect on them, preserving their original appearance.

**Known limitation:** The `[style*="background-image"]` selector only covers elements with an inline `style` attribute containing `background-image`. Elements whose background image is set via a stylesheet rule are not re-inverted and will appear color-inverted. This is an accepted gap for the minimal scope of this extension.

---

## Data Model

Stored in `browser.storage.local`:

```json
{
  "sites": {
    "github.com": true,
    "linear.app": true
  }
}
```

- Key: hostname (e.g. `github.com`, not full URL)
- Value: `true` = force light mode active; absent or `false` = inactive
- Scope: local per-device, not synced via iCloud

---

## User Interaction Flow

1. User visits a dark-themed website
2. User clicks the extension toolbar button (Mac) or taps it via Safari's Extensions menu (iOS/iPadOS)
3. `background.js` toggles state and sends a message to `content.js`
4. `content.js` injects the CSS filter — page immediately inverts to light, no reload
5. Toolbar icon updates to active state (`icon-on.png`)
6. On any future visit to the same hostname, `content.js` auto-applies the filter on `document_start`
7. Clicking the button again removes the filter, marks the site inactive, and restores `icon-off.png`

---

## Platform Notes

- **macOS**: toolbar button visible in Safari's toolbar
- **iOS / iPadOS**: extension accessible via the `AA` / puzzle-piece icon in the Safari address bar
- All three platforms share the same JS resources; Xcode build targets handle platform-specific packaging

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `browser.storage` unavailable | Fail silently; page loads without filter |
| Style tag already present (SPA soft navigation) | Check for `#force-light-style` before injecting; skip if exists |
| SPA removes style tag after client-side navigation | Known gap — accepted for minimal scope; filter may silently drop after SPA route change. `MutationObserver` / `pushState` hooks to re-apply are explicitly out of scope. |
| Special pages (`about:`, `file://`, `safari-extension://`) | Safari blocks content scripts on these automatically |
| Content script message arrives before DOM ready | Safe — filter targets `html` element which exists at `document_start` |

---

## Out of Scope

- Options/settings page
- Per-URL (vs per-hostname) granularity
- Auto dark-page detection
- Cross-browser support
- "Personalized" DOM-walking color overrides
- Re-applying filter after SPA client-side navigation
