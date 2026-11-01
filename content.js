/**
 * eBay to Amazon Profit Calculator - Content Script Master Coordinator
 * 
 * Orchestrates:
 * - Dynamic page routing: Item Pages (/itm/*) vs Search / Catalog Pages (/sch/*, /b/*, /str/*)
 * - Single-item floating calculator UI (ProfitCalculatorUI)
 * - Multi-item grid calculation injection (SearchGridProcessor)
 * - Persistent storage & reactive cross-tab synchronization (StorageManager)
 * - Targeted dynamic variation mutation monitoring
 * - SPA navigation tracking and comprehensive lifecycle teardown
 */

(function () {
  'use strict';

  // Single-Instance Verification Guard
  if (window._eapcMasterControllerActive) {
    return;
  }
  window._eapcMasterControllerActive = true;

  /**
   * Controller for single-item product detail pages (/itm/*).
   */
  class ItemPageController {
    constructor(router) {
      this.router = router;
      this.ui = null;
      this.currentSettings = null;
      this.currentDetails = null;
      this.activeItemId = null;
      this.variationObserver = null;
      this.unsubscribeStorage = null;
    }

    /**
     * Bootstraps the controller on item page load.
     */
    async init() {
      try {
        // 1. Load active settings from storage
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
      } catch (err) {
        console.error('[EAPC Item Controller] Initialization error:', err);
      }
    }

    /**
     * Extracts details for the current item page and updates UI.
     */
    processCurrentPage() {
      const extracted = window.EbayParser.extractProductDetails(document, window.location.href);

      this.activeItemId = extracted.itemId || window.EbayParser.extractItemId(document, window.location.href);

      if (extracted.success && extracted.data) {
        this.currentDetails = extracted.data;
      } else {
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

      const effectivePrice = manual.price.isOverridden
        ? manual.price.value
        : this.currentDetails.price;

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
        isShippingValid = false;
      }

      let calcResult = null;

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

        if (!this.ui.manualOverride.price.isOverridden && updatedDetails.price !== null) {
          this.currentDetails.price = updatedDetails.price;
        }

        if (!this.ui.manualOverride.shipping.isOverridden) {
          this.currentDetails.shippingState = updatedDetails.shippingState;
          this.currentDetails.shippingCost = updatedDetails.shippingCost;
        }

        this.recalculateAndUpdateUI();
      }, 250);
    }

    handleManualPrice(val, isManual) {
      this.recalculateAndUpdateUI();
    }

    handleManualShipping(val, isManual) {
      this.recalculateAndUpdateUI();
    }

    handlePriceReset() {
      const extracted = window.EbayParser.extractProductDetails(document, window.location.href);
      if (extracted.success && extracted.data) {
        this.currentDetails.price = extracted.data.price;
      }
      this.recalculateAndUpdateUI();
    }

    handleShippingReset() {
      const extracted = window.EbayParser.extractProductDetails(document, window.location.href);
      if (extracted.success && extracted.data) {
        this.currentDetails.shippingState = extracted.data.shippingState;
        this.currentDetails.shippingCost = extracted.data.shippingCost;
      }
      this.recalculateAndUpdateUI();
    }

    handleItemNavigation(newItemId) {
      console.log(`[EAPC Item Controller] Navigated to new Item ID: ${newItemId} (Old: ${this.activeItemId})`);

      if (this.variationObserver) {
        this.variationObserver.disconnect();
        this.variationObserver = null;
      }

      if (this.ui) {
        this.ui.resetOverridesForNewItem();
      }

      this.processCurrentPage();
    }

    openSettings() {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
      } else {
        window.open('settings/settings.html', '_blank');
      }
    }

    teardown() {
      if (this.variationObserver) {
        this.variationObserver.disconnect();
        this.variationObserver = null;
      }

      if (typeof this.unsubscribeStorage === 'function') {
        this.unsubscribeStorage();
        this.unsubscribeStorage = null;
      }

      if (this.ui) {
        this.ui.close();
        this.ui = null;
      }
    }
  }

  /**
   * Master Page Router & Coordinator
   * Directs execution to ItemPageController or SearchGridProcessor based on current URL & DOM.
   */
  class PageCoordinator {
    constructor() {
      this.itemController = null;
      this.searchProcessor = null;
      this.currentMode = null; // 'ITEM' | 'SEARCH' | null
      this.urlPollTimer = null;
      this.headObserver = null;
      this.lastProcessedUrl = '';
    }

    init() {
      this.route();
      this.initSPANavigation();
    }

    /**
     * Determines current page mode and manages transitions.
     */
    route() {
      const currentUrl = window.location.href;
      const isItem = window.EbayParser.isItemPage(currentUrl, document);
      const isSearch = !isItem && window.EbayParser.isSearchOrBrowsePage(currentUrl, document);

      if (isItem) {
        // Transition to Item Mode
        if (this.currentMode === 'SEARCH' && this.searchProcessor) {
          this.searchProcessor.teardown();
          this.searchProcessor = null;
        }

        if (this.currentMode !== 'ITEM' || !this.itemController) {
          this.currentMode = 'ITEM';
          this.itemController = new ItemPageController(this);
          this.itemController.init();
        } else {
          // Already in Item mode; verify if Item ID changed
          const newItemId = window.EbayParser.extractItemId(document, currentUrl);
          if (newItemId && newItemId !== this.itemController.activeItemId) {
            this.itemController.handleItemNavigation(newItemId);
          }
        }
      } else if (isSearch) {
        // Transition to Search/Catalog Mode
        if (this.currentMode === 'ITEM' && this.itemController) {
          this.itemController.teardown();
          this.itemController = null;
        }

        if (this.currentMode !== 'SEARCH' || !this.searchProcessor) {
          this.currentMode = 'SEARCH';
          this.searchProcessor = new window.SearchGridProcessor();
          this.searchProcessor.init();
        } else if (this.lastProcessedUrl !== currentUrl) {
          // User navigated to a new search query or pagination on search page
          this.searchProcessor.handleSearchNavigation();
        } else {
          // Already in Search mode; rescan cards
          this.searchProcessor.processAllCards();
        }
      } else {
        // Neither search nor item page (e.g. eBay account, messages)
        if (this.itemController) {
          this.itemController.teardown();
          this.itemController = null;
        }
        if (this.searchProcessor) {
          this.searchProcessor.teardown();
          this.searchProcessor = null;
        }
        this.currentMode = null;
      }

      this.lastProcessedUrl = currentUrl;
    }

    /**
     * Multi-Strategy SPA Navigation detection.
     */
    initSPANavigation() {
      const onNavigate = () => this.route();

      window.addEventListener('popstate', onNavigate);
      window.addEventListener('hashchange', onNavigate);

      if (document.head) {
        this.headObserver = new MutationObserver(onNavigate);
        this.headObserver.observe(document.head, { childList: true, subtree: true, characterData: true });
      }

      this.urlPollTimer = setInterval(() => {
        if (window.location.href !== this.lastProcessedUrl) {
          this.route();
        }
      }, 500);

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg) => {
          if (msg && msg.type === 'EBAY_SPA_NAVIGATED') {
            this.route();
          }
        });
      }
    }
  }

  // Launch Coordinator on document_idle
  const coordinator = new PageCoordinator();
  coordinator.init();
})();
