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
