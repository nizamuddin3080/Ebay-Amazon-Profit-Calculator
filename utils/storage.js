/**
 * eBay to Amazon Profit Calculator - Storage Manager Adapter
 * 
 * Wraps chrome.storage.local with schema validation, default fallbacks,
 * reactive change listeners, and in-memory fallback for non-extension environments.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js / CommonJS
    module.exports = factory();
  } else {
    // Browser global (Extension context / Content script)
    root.StorageManager = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'eapc_user_settings';

  // Central Default Invariants
  const DEFAULT_SETTINGS = Object.freeze({
    amazonCommissionRate: 15.0,  // 15.0%
    sellTaxRate: 9.0,           // 9.0%
    targetProfitAmount: 12.00,  // $12.00
    shippingDeduction: 9.98     // $9.98
  });

  // In-Memory Fallback Cache
  let inMemoryCache = Object.assign({}, DEFAULT_SETTINGS);
  const changeListeners = new Set();

  /**
   * Validates settings object according to business constraints.
   */
  function validateSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      return { isValid: false, error: 'Invalid settings payload.' };
    }

    const comm = Number(settings.amazonCommissionRate);
    const tax = Number(settings.sellTaxRate);
    const profit = Number(settings.targetProfitAmount);
    const deduction = Number(settings.shippingDeduction);

    if (!Number.isFinite(comm) || comm < 0) {
      return { isValid: false, error: 'Commission rate must be a non-negative number.' };
    }
    if (!Number.isFinite(tax) || tax < 0) {
      return { isValid: false, error: 'Tax rate must be a non-negative number.' };
    }
    if (!Number.isFinite(profit)) {
      return { isValid: false, error: 'Target profit must be a valid number.' };
    }
    if (!Number.isFinite(deduction) || deduction < 0) {
      return { isValid: false, error: 'Shipping deduction must be a non-negative number.' };
    }

    // Rate sum constraint
    if (comm + tax >= 100.0) {
      return {
        isValid: false,
        error: 'Combined Commission and Tax must be strictly less than 100%.'
      };
    }

    return {
      isValid: true,
      data: {
        amazonCommissionRate: comm,
        sellTaxRate: tax,
        targetProfitAmount: profit,
        shippingDeduction: deduction
      }
    };
  }

  /**
   * Retrieves saved settings or defaults.
   */
  function getSettings() {
    return new Promise((resolve) => {
      // 1. Check Chrome Storage API
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          chrome.storage.local.get([STORAGE_KEY], (result) => {
            if (chrome.runtime && chrome.runtime.lastError) {
              console.warn('[EAPC Storage] Failed to read from chrome.storage.local:', chrome.runtime.lastError);
              return resolve(Object.assign({}, inMemoryCache));
            }

            const saved = result ? result[STORAGE_KEY] : null;
            if (saved && typeof saved === 'object') {
              const validated = validateSettings(saved);
              if (validated.isValid) {
                inMemoryCache = Object.assign({}, DEFAULT_SETTINGS, validated.data);
                return resolve(Object.assign({}, inMemoryCache));
              }
            }

            // Fallback to defaults
            inMemoryCache = Object.assign({}, DEFAULT_SETTINGS);
            resolve(Object.assign({}, inMemoryCache));
          });
          return;
        } catch (e) {
          console.warn('[EAPC Storage] Exception accessing chrome.storage.local:', e);
        }
      }

      // 2. In-memory fallback
      resolve(Object.assign({}, inMemoryCache));
    });
  }

  /**
   * Saves updated settings to storage and notifies subscribers.
   */
  function saveSettings(settings) {
    return new Promise((resolve, reject) => {
      const validation = validateSettings(settings);
      if (!validation.isValid) {
        return reject(new Error(validation.error));
      }

      const cleanSettings = validation.data;
      inMemoryCache = Object.assign({}, cleanSettings);

      // Save to chrome.storage.local if available
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          chrome.storage.local.set({ [STORAGE_KEY]: cleanSettings }, () => {
            if (chrome.runtime && chrome.runtime.lastError) {
              console.warn('[EAPC Storage] Write failed, falling back to cache:', chrome.runtime.lastError);
            }
            notifySubscribers(cleanSettings);
            resolve(cleanSettings);
          });
          return;
        } catch (e) {
          console.warn('[EAPC Storage] Storage write exception:', e);
        }
      }

      // In-memory resolution
      notifySubscribers(cleanSettings);
      resolve(cleanSettings);
    });
  }

  /**
   * Resets settings back to factory default invariants.
   */
  function resetSettings() {
    return saveSettings(DEFAULT_SETTINGS);
  }

  /**
   * Registers a reactive callback for settings changes.
   */
  function onSettingsChanged(callback) {
    if (typeof callback !== 'function') return () => {};

    changeListeners.add(callback);

    // Also register native chrome.storage.onChanged listener if in extension
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      const nativeListener = (changes, areaName) => {
        if (areaName === 'local' && changes[STORAGE_KEY]) {
          const newVal = changes[STORAGE_KEY].newValue;
          if (newVal) {
            callback(newVal);
          }
        }
      };

      try {
        chrome.storage.onChanged.addListener(nativeListener);
      } catch (e) {}
    }

    return () => {
      changeListeners.delete(callback);
    };
  }

  /**
   * Notifies in-memory subscribers.
   */
  function notifySubscribers(newSettings) {
    for (const cb of changeListeners) {
      try {
        cb(newSettings);
      } catch (e) {
        console.error('[EAPC Storage] Subscriber callback error:', e);
      }
    }
  }

  return {
    DEFAULT_SETTINGS,
    STORAGE_KEY,
    getSettings,
    saveSettings,
    resetSettings,
    validateSettings,
    onSettingsChanged
  };
});
