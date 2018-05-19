// ─────────────────────────────────────────────────────────────────────────────
// Common

function subscribe(type, callback) {
  window.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (typeof message === 'object' && message.type && message.type === type) {
      console.log('Chrome Message:', message, sender);
      callback(message, sender, sendResponse);
    }

    // Asynchronous return
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Background Script

const ExtensionBackgroundI = {
  dispatch(tabId, message, responseCallback) {
    window.chrome.tabs.sendMessage(tabId, message, responseCallback);
    console.log('Content Dispatch:', message);
  },
  subscribe,
};

// ─────────────────────────────────────────────────────────────────────────────
// Content Script

const ExtensionContentI = {
  connect() {
    window.chrome.runtime.connect();
  },
  dispatch(message, responseCallback) {
    console.log('Background Dispatch:', message);
    window.chrome.runtime.sendMessage(message, responseCallback);
  },
  subscribe,
};


export { ExtensionContentI, ExtensionBackgroundI };
