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
