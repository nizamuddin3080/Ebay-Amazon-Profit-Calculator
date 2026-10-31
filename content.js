/**
 * eBay to Amazon Profit Calculator - Content Script Master Controller
 * 
 * Orchestrates:
 * - Multi-tier eBay product extraction (EbayParser)
 * - Reverse-margin calculation engine (CalculatorEngine)
 * - Shadow DOM floating calculator UI (ProfitCalculatorUI)
 * - Persistent storage & reactive cross-tab synchronization (StorageManager)
 * - Targeted dynamic variation mutation monitoring
 * - SPA navigation tracking and lifecycle teardown
 */

(function () {
  'use strict';

  // TASK-6.2: Single-Instance Verification Guard
  if (window._eapcMasterControllerActive) {
    return;
  }
  window._eapcMasterControllerActive = true;

  class MasterController {
    constructor() {
      this.ui = null;
      this.currentSettings = null;
      this.currentDetails = null;
      this.activeItemId = null;
      this.variationObserver = null;
      this.urlPollTimer = null;
      this.headObserver = null;
      this.unsubscribeStorage = null;
    }

    /**
     * Bootstraps the controller on page load.
     */
    async init() {
      try {
        // 1. Load active settings from storage (or defaults)
        this.currentSettings = await window.StorageManager.getSettings();

        // 2. Initialize and mount Floating UI inside Shadow DOM
        this.ui = new window.ProfitCalculatorUI({
          onSettingsClick: () => this.openSettings(),
          onPriceChange: (val, isManual) => this.handleManualPrice(val, isManual),
          onShippingChange: (val, isManual) => this.handleManualShipping(val, isManual),
          onPriceReset: () => this.handlePriceReset(),
          onShippingReset: () => this.handleShippingReset()
        });
        this.ui.mount(document);

        // 3. Listen to reactive storage updates across tabs
        this.unsubscribeStorage = window.StorageManager.onSettingsChanged((newSettings) => {
          this.currentSettings = newSettings;
          this.recalculateAndUpdateUI();
        });

        // 4. Initial extraction & calculation
        this.processCurrentPage();

        // 5. Setup SPA navigation detection & lifecycle teardown
        this.initSPANavigation();
      } catch (err) {
        console.error('[EAPC Controller] Initialization error:', err);
      }
    }

    /**
     * Extracts details for the current page and updates UI.
     */
    processCurrentPage() {
      const extracted = window.EbayParser.extractProductDetails(document, window.location.href);

      this.activeItemId = extracted.itemId || window.EbayParser.extractItemId(document, window.location.href);

      if (extracted.success && extracted.data) {
        this.currentDetails = extracted.data;
      } else {
        // Partial extraction fallback
        this.currentDetails = {
          title: (extracted.data && extracted.data.title) || document.title || 'eBay Item',
          price: extracted.data ? extracted.data.price : null,
          currency: (extracted.data && extracted.data.currency) || 'USD',
          shippingState: (extracted.data && extracted.data.shippingState) || 'UNKNOWN',
          shippingCost: extracted.data ? extracted.data.shippingCost : null
        };
      }

      this.recalculateAndUpdateUI();
      this.setupVariationObserver();
    }

    /**
     * Calculates Amazon selling prices using active settings and current inputs.
     */
    recalculateAndUpdateUI() {
      if (!this.ui || !this.currentDetails) return;

      const manual = this.ui.manualOverride;

      // Determine effective price
      const effectivePrice = manual.price.isOverridden
        ? manual.price.value
        : this.currentDetails.price;

      // Determine effective shipping
      let effectiveShipping = 0.0;
      let isShippingValid = false;

      if (manual.shipping.isOverridden) {
        effectiveShipping = manual.shipping.value || 0.0;
        isShippingValid = manual.shipping.value !== null && Number.isFinite(manual.shipping.value);
      } else if (this.currentDetails.shippingState === 'FREE') {
        effectiveShipping = 0.0;
        isShippingValid = true;
      } else if (this.currentDetails.shippingState === 'KNOWN' && this.currentDetails.shippingCost !== null) {
        effectiveShipping = this.currentDetails.shippingCost;
        isShippingValid = true;
      } else {
        // UNKNOWN shipping
        isShippingValid = false;
      }

      let calcResult = null;

      // Only calculate if both price and shipping are valid
      if (effectivePrice !== null && Number.isFinite(effectivePrice) && isShippingValid) {
        const totalProductCost = effectivePrice + effectiveShipping;

        calcResult = window.CalculatorEngine.calculate({
          productCost: totalProductCost,
          commissionRate: this.currentSettings ? this.currentSettings.amazonCommissionRate : 15.0,
          taxRate: this.currentSettings ? this.currentSettings.sellTaxRate : 9.0,
          targetProfit: this.currentSettings ? this.currentSettings.targetProfitAmount : 12.0,
          shippingDeduction: this.currentSettings ? this.currentSettings.shippingDeduction : 9.98
        });
      }

      // Update Floating Calculator UI
      this.ui.update(this.currentDetails, this.currentSettings, calcResult);
    }

    /**
     * Attaches debounced targeted observer to price and shipping nodes.
     */
    setupVariationObserver() {
      if (this.variationObserver) {
        this.variationObserver.disconnect();
        this.variationObserver = null;
      }

      this.variationObserver = window.EbayParser.createVariationObserver(document, (updatedDetails) => {
        if (!updatedDetails) return;

        // If price is not manually overridden, update price
        if (!this.ui.manualOverride.price.isOverridden && updatedDetails.price !== null) {
          this.currentDetails.price = updatedDetails.price;
        }

        // If shipping is not manually overridden, update shipping
        if (!this.ui.manualOverride.shipping.isOverridden) {
          this.currentDetails.shippingState = updatedDetails.shippingState;
          this.currentDetails.shippingCost = updatedDetails.shippingCost;
        }

        this.recalculateAndUpdateUI();
      }, 250);
    }

    /**
     * Handles user manual editing of the price field.
     */
    handleManualPrice(val, isManual) {
      this.recalculateAndUpdateUI();
    }

    /**
     * Handles user manual editing of the shipping field.
     */
    handleManualShipping(val, isManual) {
      this.recalculateAndUpdateUI();
    }

    /**
     * Re-detects price from DOM on reset action.
     */
    handlePriceReset() {
      const extracted = window.EbayParser.extractProductDetails(document, window.location.href);
      if (extracted.success && extracted.data) {
        this.currentDetails.price = extracted.data.price;
      }
      this.recalculateAndUpdateUI();
    }

    /**
     * Re-detects shipping from DOM on reset action.
     */
    handleShippingReset() {
      const extracted = window.EbayParser.extractProductDetails(document, window.location.href);
      if (extracted.success && extracted.data) {
        this.currentDetails.shippingState = extracted.data.shippingState;
        this.currentDetails.shippingCost = extracted.data.shippingCost;
      }
      this.recalculateAndUpdateUI();
    }

    /**
     * Multi-Strategy SPA Navigation & Lifecycle Teardown.
     */
    initSPANavigation() {
      const checkNavigation = () => {
        const newItemId = window.EbayParser.extractItemId(document, window.location.href);
        if (newItemId && newItemId !== this.activeItemId) {
          this.handleItemNavigation(newItemId);
        }
      };

      // 1. Window popstate & hashchange
      window.addEventListener('popstate', checkNavigation);
      window.addEventListener('hashchange', checkNavigation);

      // 2. Observer on <head> observing title & canonical link
      if (document.head) {
        this.headObserver = new MutationObserver(checkNavigation);
        this.headObserver.observe(document.head, { childList: true, subtree: true, characterData: true });
      }

      // 3. Lightweight 500ms URL polling fallback
      this.urlPollTimer = setInterval(checkNavigation, 500);

      // 4. Runtime message listener from service worker
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg) => {
          if (msg && msg.type === 'EBAY_SPA_NAVIGATED') {
            checkNavigation();
          }
        });
      }
    }

    /**
     * Executes full teardown and re-initializes on new Item ID.
     */
    handleItemNavigation(newItemId) {
      console.log(`[EAPC Controller] Navigated to new Item ID: ${newItemId} (Old: ${this.activeItemId})`);

      // 1. Disconnect variation observer
      if (this.variationObserver) {
        this.variationObserver.disconnect();
        this.variationObserver = null;
      }

      // 2. Reset manual overrides in UI
      if (this.ui) {
        this.ui.resetOverridesForNewItem();
      }

      // 3. Process new page
      this.processCurrentPage();
    }

    /**
     * Opens extension settings page.
     */
    openSettings() {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
      } else {
        window.open('settings/settings.html', '_blank');
      }
    }
  }

  // Launch Master Controller on document_idle
  const controller = new MasterController();
  controller.init();
})();
