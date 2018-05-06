// ────────────────────────────────────────────────────────────────────────────
// Preamble
//
// Working Parts:
// - Tab Broadcasting and Message Subcription
// - Session Keeper
// - Messaging


import { ExtensionBackgroundI } from './extension';

// ────────────────────────────────────────────────────────────────────────────
// Tab Broadcasting
//
// Keep track of which tabs are connected and send messages to them
// This will accumulate tabs over time.
// TODO: Purge closed tabs.

const TABS = [];

function registerTab(id) {
  console.log('Register:', id);
  if (!TABS.includes(id)) {
    TABS.push(id);
  }
}

function broadcast(message) {
  console.log('Chrome broadcast:', message);
  TABS.forEach(id => (ExtensionBackgroundI(id, message)));
}

window.script = this;

// ────────────────────────────────────────────────────────────────────────────
// Session Keeper
//
// Only keep the last session used

let _session = null; /* eslint-disable-line no-underscore-dangle */
let _sessionSeenTime = null; /* eslint-disable-line no-underscore-dangle */
let onUpdateSession = null;

function updateSession(session) {
  if (_session !== session) {
    _session = session;
    _sessionSeenTime = (new Date()).toJSON();
    onUpdateSession(session);
  }
}


// ────────────────────────────────────────────────────────────────────────────
// Communication


// Incoming Messages

ExtensionBackgroundI.subscribe('TAB ACTIVE', async (m, sender, sendResponse) => {
  // Making the little icon go from grey to black.
  window.chrome.pageAction.show(sender.tab.id);
  sendResponse();
});

// Logic:
// The situation is this, we only have one master session, every time
// a login is made we make that the new session. That is every time e
// see a working session, that is every time we see a session in URL,
// that is everytime we recieve a session register.
// Additionally there is a manual session change.
// So both of these funnel into an update session.

ExtensionBackgroundI.subscribe('SESSION REGISTER', async (m, sender, sendResponse) => {
  // When a page is reloaded.
  registerTab(sender.tab.id);
  updateSession(m.session);
  sendResponse();
});

ExtensionBackgroundI.subscribe('SESSION CHANGED', async (m, sender, sendResponse) => {
  // When a session has been manually changed.
  updateSession(m.session);
  sendResponse();
});


// Outgoing Messages

onUpdateSession = session => (
  broadcast({ type: 'MASTER SESSION UPDATE', session })
);
