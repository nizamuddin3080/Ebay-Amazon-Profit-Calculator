/**
 * eBay to Amazon Profit Calculator - Background Service Worker (Manifest V3)
 * 
 * Handles extension installation, initial storage seeding, options routing,
 * and SPA navigation notifications.
 */

// Import StorageManager into service worker scope
importScripts('utils/storage.js');

// Lifecycle: Extension Installed / Updated
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[EAPC Service Worker] Installed event:', details.reason);
  try {
    // Seed default settings if unset
    const settings = await StorageManager.getSettings();
    console.log('[EAPC Service Worker] Active settings initialized:', settings);
  } catch (err) {
    console.error('[EAPC Service Worker] Failed to initialize settings:', err);
  }
});

// Runtime Messaging Handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'OPEN_SETTINGS') {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
    }
    sendResponse({ success: true });
    return true;
  }

  return false;
});
