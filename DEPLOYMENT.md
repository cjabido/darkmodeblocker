# Deployment Guide — Force Light Mode

## Before Submitting to the App Store

### 1. App Icons (required)

The current placeholder icons (48x48 solid color squares) will be rejected by App Store review. Replace them before archiving.

**What you need:**
- A 1024×1024 PNG app icon — no alpha channel, no rounded corners (Apple adds those)
- Xcode generates all required sizes from this single image

**How to set it:**
1. Open `Force Light Mode/Force Light Mode.xcodeproj` in Xcode
2. In the file navigator: `Shared (App)` → `Assets.xcassets` → `AppIcon`
3. Drag your 1024×1024 PNG into the **App Store** slot
4. Do the same for `LargeIcon.imageset` (used by the extension)

**Toolbar icons** (`extension/images/icon-on.png` and `icon-off.png`) should also be replaced with something intentional (e.g. a sun/moon symbol). After replacing, re-run `safari-web-extension-converter` to regenerate the Xcode project, or copy the new PNGs directly into the generated extension resources folder.

### 2. Privacy Policy (required)

The App Store requires a privacy policy URL for extensions. Since this extension collects no data, a simple one-pager is sufficient.

Minimum content: "Force Light Mode does not collect, store, or transmit any personal data."

Host it anywhere publicly accessible (GitHub Pages, a simple web page, etc.) and add the URL in App Store Connect.

### 3. App Store Connect Metadata (required)

Prepare the following before submission:

- **Name:** Force Light Mode
- **Subtitle:** (optional, 30 chars) e.g. "Invert dark websites to light"
- **Description:** e.g. "Force light mode on dark-themed websites with one tap. Enable per-site — your preferences are saved automatically."
- **Category:** Utilities
- **Keywords:** dark mode, light mode, safari extension, invert, accessibility
- **Screenshots:** At minimum one Safari screenshot showing the extension toggling a dark site to light (required per platform)

### 4. Known Limitations to Be Aware Of

These are accepted gaps in the current implementation — worth knowing before submitting:

- **Stylesheet background images:** Elements with `background-image` set via CSS stylesheets (not inline `style` attributes) will appear color-inverted rather than restored. Only inline `style="background-image: ..."` attributes are re-inverted.
- **SPA navigation:** On single-page apps (e.g. Notion, Linear), navigating between pages without a full reload may drop the filter. A manual page refresh re-applies it.

---

## Deployment Steps

### macOS — App Store Submission

1. Open `Force Light Mode/Force Light Mode.xcodeproj` in Xcode
2. Select scheme: **Force Light Mode (macOS)** — destination: **Any Mac**
3. **Product → Archive** (⇧⌘A or via menu — not ⌘B)
4. Xcode Organizer opens automatically → click **Distribute App**
5. Choose **App Store Connect** → **Upload** → Next → allow automatic signing → Upload
6. In [App Store Connect](https://appstoreconnect.apple.com):
   - Create a new macOS app with bundle ID `com.cjabido.forcelightmode`
   - Fill in name, description, category, screenshots, privacy policy URL
   - Select the uploaded build → **Submit for Review**

---

### iOS/iPadOS — App Store Submission

1. In Xcode, select scheme: **Force Light Mode (iOS)** — destination: **Any iOS Device (arm64)**
2. **Product → Archive**
3. Xcode Organizer → **Distribute App** → **App Store Connect** → **Upload**
4. In App Store Connect:
   - Create a new iOS app with bundle ID `com.cjabido.forcelightmode`
   - Add screenshots for iPhone and iPad (required separately)
   - Select the uploaded build → **Submit for Review**

> Note: macOS and iOS are submitted as separate apps in App Store Connect unless you configure a Universal Purchase.

---

### iOS/iPadOS — Direct Install to Personal Device (no App Store)

For personal use or testing on a physical device before App Store submission.

**Requirements:** Paid Apple Developer Program membership (certificate valid for 1 year)

1. Connect your iPhone/iPad via USB
2. In Xcode, click the destination selector (top center) → select your device under **Connected Devices**
3. First time on this device:
   - iPhone: **Settings → Privacy & Security → Developer Mode → On** → restart
4. Press **⌘R** to build and install
5. If prompted "untrusted developer" on the device:
   - **Settings → General → VPN & Device Management** → your Apple ID → **Trust**
6. Enable the extension:
   - **Settings → Safari → Extensions → Force Light Mode → On → Allow on All Websites**
7. Test in Safari: tap **AA** in the address bar → **Force Light Mode**

---

### TestFlight (optional — share with others before App Store release)

1. Archive the iOS build (steps 1–2 above)
2. Organizer → **Distribute App** → **App Store Connect** → **Upload**
3. In App Store Connect → **TestFlight** → add testers by Apple ID
4. Testers install the **TestFlight** app on their device → accept the invite
