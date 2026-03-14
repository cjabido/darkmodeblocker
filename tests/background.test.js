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
