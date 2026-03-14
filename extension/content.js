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
