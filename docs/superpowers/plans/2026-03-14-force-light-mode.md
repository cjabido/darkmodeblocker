# Force Light Mode — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal Safari Web Extension that lets users manually force light mode on dark-themed websites using a CSS filter inversion toggle.

**Architecture:** A plain web extension directory (`extension/`) holds manifest + JS files, tested with Jest. Once tests pass, `safari-web-extension-converter` generates the Xcode project in one command. Three files do all the work: `manifest.json`, `content.js` (CSS injection), and `background.js` (toggle + storage).

**Tech Stack:** JavaScript (ES6), Safari Web Extension (MV3), Jest + jsdom (tests), Xcode (packaging via `safari-web-extension-converter`)

---

## Chunk 1: Project scaffold, icons, and manifest

### Task 1: Initialize project structure and test harness

**Files:**
- Create: `package.json`
- Create: `extension/` (directory)
- Create: `extension/images/` (directory)
- Create: `tests/` (directory)

- [ ] **Step 1: Create package.json**

```bash
cd /path/to/darkmodeblocker
```

Create `package.json`:

```json
{
  "name": "darkmodeblocker",
  "version": "1.0.0",
  "scripts": {
    "test": "jest --passWithNoTests"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "testEnvironmentOptions": {
      "url": "https://example.com"
    }
  }
}
```

Note: `--passWithNoTests` prevents Jest from exiting with an error before any test files exist. `testEnvironmentOptions.url` sets `window.location.hostname` to `example.com` globally across all test files — eliminating the need to mock `window.location` manually.

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create directories**

```bash
mkdir -p extension/images tests
```

- [ ] **Step 4: Verify Jest runs (no tests yet)**

```bash
npm test
```

Expected output: `No tests found` or similar. No errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json extension/ tests/
git commit -m "feat: init project with Jest test harness"
```

---

### Task 2: Create placeholder icon assets

**Files:**
- Create: `extension/images/icon-off.png`
- Create: `extension/images/icon-on.png`

- [ ] **Step 1: Create icon generation script**

Create `scripts/create-icons.py`:

```python
import struct, zlib, os

def make_png(size, rgb):
    """Create a minimal valid PNG of solid color."""
    r, g, b = rgb

    def chunk(t, d):
        crc = zlib.crc32(t + d) & 0xffffffff
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', crc)

    rows = b''.join(b'\x00' + bytes([r, g, b] * size) for _ in range(size))
    return (
        b'\x89PNG\r\n\x1a\n' +
        chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) +
        chunk(b'IDAT', zlib.compress(rows)) +
        chunk(b'IEND', b'')
    )

os.makedirs('extension/images', exist_ok=True)

# icon-off: gray (inactive state)
with open('extension/images/icon-off.png', 'wb') as f:
    f.write(make_png(48, (150, 150, 150)))

# icon-on: amber (active state)
with open('extension/images/icon-on.png', 'wb') as f:
    f.write(make_png(48, (255, 184, 0)))

print("Icons created: extension/images/icon-off.png, extension/images/icon-on.png")
```

- [ ] **Step 2: Run the script**

```bash
mkdir -p scripts
# (save script above as scripts/create-icons.py first)
python3 scripts/create-icons.py
```

Expected: `Icons created: extension/images/icon-off.png, extension/images/icon-on.png`

- [ ] **Step 3: Verify icons exist and are valid PNG**

```bash
file extension/images/icon-off.png extension/images/icon-on.png
```

Expected: both lines show `PNG image data, 48 x 48`

- [ ] **Step 4: Commit**

```bash
git add extension/images/ scripts/create-icons.py
git commit -m "feat: add placeholder toolbar icons"
```

---

### Task 3: Write manifest.json

**Files:**
- Create: `extension/manifest.json`

- [ ] **Step 1: Create manifest.json**

Create `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Force Light Mode",
  "version": "1.0",
  "description": "Force light mode on dark-themed websites.",
  "action": {
    "default_title": "Force Light Mode",
    "default_icon": {
      "48": "images/icon-off.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ],
  "permissions": ["storage", "activeTab"]
}
```

- [ ] **Step 2: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('extension/manifest.json', 'utf8')); console.log('valid JSON')"
```

Expected: `valid JSON`

- [ ] **Step 3: Commit**

```bash
git add extension/manifest.json
git commit -m "feat: add MV3 manifest"
```

---

## Chunk 2: content.js with TDD

### Task 4: Write failing content.js tests

**Files:**
- Create: `tests/content.test.js`

- [ ] **Step 1: Create tests/content.test.js**

```js
// window.location.hostname is 'example.com' via testEnvironmentOptions.url in package.json — no manual mock needed.

// Mock browser APIs before requiring the module
global.browser = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({ sites: {} })
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    }
  }
};

const { applyFilter, removeFilter } = require('../extension/content.js');

const STYLE_ID = 'force-light-style';

// Helper: flush all pending microtasks and macrotasks
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  // Reset DOM between tests
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.remove();
  jest.clearAllMocks();
});

afterEach(() => {
  // Restore module registry after any jest.resetModules() calls in auto-apply tests
  jest.resetModules();
});

describe('applyFilter', () => {
  test('injects a style tag with the correct CSS', () => {
    applyFilter();
    const style = document.getElementById(STYLE_ID);
    expect(style).not.toBeNull();
    expect(style.textContent).toContain('invert(100%)');
    expect(style.textContent).toContain('hue-rotate(180deg)');
  });

  test('CSS targets html element', () => {
    applyFilter();
    const style = document.getElementById(STYLE_ID);
    expect(style.textContent).toMatch(/html\s*\{/);
  });

  test('CSS re-inverts img elements', () => {
    applyFilter();
    const style = document.getElementById(STYLE_ID);
    expect(style.textContent).toContain('img');
  });

  test('is idempotent — does not inject duplicate style tags', () => {
    applyFilter();
    applyFilter();
    expect(document.querySelectorAll(`#${STYLE_ID}`).length).toBe(1);
  });
});

describe('removeFilter', () => {
  test('removes the style tag when it is present', () => {
    applyFilter();
    removeFilter();
    expect(document.getElementById(STYLE_ID)).toBeNull();
  });

  test('does not throw when style tag is not present', () => {
    expect(() => removeFilter()).not.toThrow();
  });
});

describe('auto-apply on page load', () => {
  test('applies filter when hostname is enabled in storage', async () => {
    jest.resetModules();
    global.browser = {
      storage: { local: { get: jest.fn().mockResolvedValue({ sites: { 'example.com': true } }) } },
      runtime: { onMessage: { addListener: jest.fn() } }
    };

    require('../extension/content.js');
    await flushPromises(); // flush microtasks + macrotasks to let .then() run

    expect(document.getElementById(STYLE_ID)).not.toBeNull();
  });

  test('does not apply filter when hostname is not in storage', async () => {
    jest.resetModules();
    global.browser = {
      storage: { local: { get: jest.fn().mockResolvedValue({ sites: {} }) } },
      runtime: { onMessage: { addListener: jest.fn() } }
    };

    require('../extension/content.js');
    await flushPromises();

    expect(document.getElementById(STYLE_ID)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- tests/content.test.js
```

Expected: FAIL — `Cannot find module '../extension/content.js'`

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/content.test.js
git commit -m "test: add failing tests for content.js"
```

---

### Task 5: Implement content.js

**Files:**
- Create: `extension/content.js`

- [ ] **Step 1: Create extension/content.js**

```js
const STYLE_ID = 'force-light-style';

const CSS = [
  'html { filter: invert(100%) hue-rotate(180deg) !important; }',
  'img, video, picture, [style*="background-image"] {',
  '  filter: invert(100%) hue-rotate(180deg) !important;',
  '}'
].join('\n');

function applyFilter() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  // document.head may not exist at document_start; documentElement always does
  (document.head || document.documentElement).appendChild(style);
}

function removeFilter() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

// On page load: apply filter if this hostname is enabled
browser.storage.local.get('sites').then(function (result) {
  const sites = (result && result.sites) || {};
  if (sites[window.location.hostname] === true) {
    applyFilter();
  }
});

// Listen for toggle messages from background.js
browser.runtime.onMessage.addListener(function (message) {
  if (message.action === 'toggle') {
    message.enabled ? applyFilter() : removeFilter();
  }
});

// Export for Jest testing
if (typeof module !== 'undefined') {
  module.exports = { applyFilter, removeFilter };
}
```

- [ ] **Step 2: Run tests — verify they pass before committing**

```bash
npm test -- tests/content.test.js
```

Expected: all 8 tests PASS (4 `applyFilter` + 2 `removeFilter` + 2 `auto-apply on page load`)

Common issues if tests fail:
- Style not appending: confirm `document.head` exists in jsdom (it does by default)
- CSS string mismatch: check exact whitespace in `toContain` assertions vs CSS constant
- Auto-apply tests: ensure `jest.resetModules()` properly re-runs init code

- [ ] **Step 3: Commit**

```bash
git add extension/content.js
git commit -m "feat: implement content.js filter injection"
```

---

### Task 6: Run full test suite — confirm all content tests green

- [ ] **Step 1: Run full suite**

```bash
npm test
```

Expected: 8 tests PASS from `content.test.js`. `background.test.js` does not exist yet — that is expected.

---

## Chunk 3: background.js, Xcode generation, and manual testing

### Task 7: Write failing background.js tests

**Files:**
- Create: `tests/background.test.js`

- [ ] **Step 1: Create tests/background.test.js**

```js
// Mock browser APIs before requiring the module
global.browser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined)
    }
  },
  action: {
    onClicked: { addListener: jest.fn() },
    setIcon: jest.fn().mockResolvedValue(undefined)
  },
  tabs: {
    sendMessage: jest.fn().mockResolvedValue(undefined)
  }
};

const { toggleSite } = require('../extension/background.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('toggleSite', () => {
  test('enables a site that was off', async () => {
    browser.storage.local.get.mockResolvedValue({ sites: {} });

    const result = await toggleSite('github.com', 1);

    expect(result).toBe(true);
    expect(browser.storage.local.set).toHaveBeenCalledWith({
      sites: { 'github.com': true }
    });
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(1, {
      action: 'toggle',
      enabled: true
    });
    expect(browser.action.setIcon).toHaveBeenCalledWith({
      tabId: 1,
      path: { '48': 'images/icon-on.png' }
    });
  });

  test('disables a site that was on', async () => {
    browser.storage.local.get.mockResolvedValue({ sites: { 'github.com': true } });

    const result = await toggleSite('github.com', 1);

    expect(result).toBe(false);
    expect(browser.storage.local.set).toHaveBeenCalledWith({
      sites: { 'github.com': false }
    });
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(1, {
      action: 'toggle',
      enabled: false
    });
    expect(browser.action.setIcon).toHaveBeenCalledWith({
      tabId: 1,
      path: { '48': 'images/icon-off.png' }
    });
  });

  test('preserves other sites when toggling one', async () => {
    browser.storage.local.get.mockResolvedValue({ sites: { 'linear.app': true } });

    await toggleSite('github.com', 1);

    expect(browser.storage.local.set).toHaveBeenCalledWith({
      sites: { 'linear.app': true, 'github.com': true }
    });
  });

  test('handles missing sites key in storage gracefully', async () => {
    browser.storage.local.get.mockResolvedValue({});

    const result = await toggleSite('example.com', 2);

    expect(result).toBe(true);
    expect(browser.storage.local.set).toHaveBeenCalledWith({
      sites: { 'example.com': true }
    });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- tests/background.test.js
```

Expected: FAIL — `Cannot find module '../extension/background.js'`

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/background.test.js
git commit -m "test: add failing tests for background.js"
```

---

### Task 8: Implement background.js

**Files:**
- Create: `extension/background.js`

- [ ] **Step 1: Create extension/background.js**

```js
async function toggleSite(hostname, tabId) {
  const result = await browser.storage.local.get('sites');
  const sites = (result && result.sites) || {};
  const isEnabled = sites[hostname] === true;
  const newEnabled = !isEnabled;

  sites[hostname] = newEnabled;
  await browser.storage.local.set({ sites });

  await browser.tabs.sendMessage(tabId, { action: 'toggle', enabled: newEnabled });

  await browser.action.setIcon({
    tabId,
    path: { '48': newEnabled ? 'images/icon-on.png' : 'images/icon-off.png' }
  });

  return newEnabled;
}

browser.action.onClicked.addListener(async function (tab) {
  const hostname = new URL(tab.url).hostname;
  await toggleSite(hostname, tab.id);
});

// Export for Jest testing
if (typeof module !== 'undefined') {
  module.exports = { toggleSite };
}
```

- [ ] **Step 2: Run tests — verify they pass before committing**

```bash
npm test -- tests/background.test.js
```

Expected: all 4 tests PASS

- [ ] **Step 3: Commit**

```bash
git add extension/background.js
git commit -m "feat: implement background.js toggle handler"
```

---

### Task 9: Run background.js tests — verify they pass

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: all tests PASS (8 from content.test.js + 4 from background.test.js = 12 total)

- [ ] **Step 2: If any test fails, fix the implementation and re-run until green**

---

### Task 10: Generate Xcode project

**Files:**
- Create: `Force Light Mode/` (generated by converter)
- Create: `Force Light Mode.xcodeproj`

- [ ] **Step 1: Switch xcode-select to Xcode.app (requires sudo — enter your password)**

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

- [ ] **Step 2: Run safari-web-extension-converter**

```bash
/Applications/Xcode.app/Contents/Developer/usr/bin/safari-web-extension-converter \
  extension/ \
  --project-location . \
  --app-name "Force Light Mode" \
  --bundle-identifier com.YOURNAME.forcelightmode \
  --swift \
  --no-open
```

Replace `YOURNAME` with your Apple Developer identifier or any reverse-domain string (e.g. `com.cjabido.forcelightmode`).

Expected: Xcode project created. The converter places `Force Light Mode.xcodeproj` directly in `--project-location` (i.e. the repo root), with app/extension sources in a `Force Light Mode/` subfolder.

- [ ] **Step 3: Verify project was created**

```bash
ls -d "Force Light Mode.xcodeproj" "Force Light Mode/"
```

Expected: both entries exist. `Force Light Mode.xcodeproj` is at the repo root; `Force Light Mode/` contains the Swift app/extension source files.

- [ ] **Step 4: Commit the generated project**

```bash
git add "Force Light Mode.xcodeproj" "Force Light Mode/"
git commit -m "feat: generate Xcode project via safari-web-extension-converter"
```

---

### Task 11: Build and manually test in Safari

- [ ] **Step 1: Open the project in Xcode**

```bash
open "Force Light Mode.xcodeproj"
```

- [ ] **Step 2: Build for macOS**

In Xcode: select the macOS app scheme → Product → Build (⌘B).
Expected: Build Succeeded with no errors.

- [ ] **Step 3: Run the app once (required to register extension with Safari)**

In Xcode: Product → Run (⌘R). A minimal app window will appear — this is expected.
Close it after it launches.

- [ ] **Step 4: Enable the extension in Safari**

Safari → Settings → Extensions → check "Force Light Mode" → Allow on all websites.

- [ ] **Step 5: Verify `sendMessage` works without `tabs` permission**

Click the toolbar button on any page. If the page does not immediately invert and the Safari console shows a permission error for `tabs.sendMessage`, add `"tabs"` to the `permissions` array in `extension/manifest.json`, re-run `safari-web-extension-converter`, and rebuild.

- [ ] **Step 6: Test toggle on a dark-themed site**

1. Navigate to a dark-themed site (e.g. `https://github.com` in dark mode)
2. Click the Force Light Mode toolbar button (or Extensions menu on iOS/iPadOS)
3. Page should immediately invert to light — confirm filter is applied
4. Click button again — page should revert to dark
5. Reload the page — if toggled on, filter should auto-apply on reload

- [ ] **Step 7: Test persistence**

1. Enable on a site
2. Close Safari tab, reopen the site
3. Filter should auto-apply from storage

- [ ] **Step 8: Commit any fixes found during manual testing**

```bash
git add -A
git commit -m "fix: manual testing corrections"
```

---

## Known Gaps (accepted, out of scope)

- `[style*="background-image"]` only catches inline background images; stylesheet-assigned backgrounds will appear inverted
- Filter silently drops after SPA client-side navigation (pushState / history API)
- iOS/iPadOS testing requires a physical device or simulator with Safari
