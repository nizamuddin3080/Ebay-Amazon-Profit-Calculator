/**
 * eBay to Amazon Profit Calculator - Search Grid Processor
 * 
 * Injects Amazon profit calculations and fast copy actions onto all product cards
 * across eBay search results (/sch/*), category browse (/b/*), and store (/str/*) pages.
 * 
 * Features:
 * - Shadow DOM encapsulation on every card (zero CSS conflict with eBay)
 * - Single price & range pricing support ($80.97 to $134.95)
 * - 1-click clipboard copy for calculated Amazon prices
 * - Debounced MutationObserver for dynamic infinite scroll / AJAX filtering
 * - Reactive cross-tab settings synchronization
 * - Lightweight floating status/settings pill
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js / CommonJS
    module.exports = factory();
  } else {
    // Browser global (Content script)
    root.SearchGridProcessor = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class SearchGridProcessor {
    constructor(options = {}) {
      this.options = Object.assign({
        onSettingsClick: () => this.openSettings()
      }, options);

      this.processedCards = new Map(); // cardEl -> { host, data }
      this.currentSettings = null;
      this.mutationObserver = null;
      this.statusPillHost = null;
      this.isPillMinimized = false;
      this.isScanning = false;
      this.scanDebounceTimer = null;
      this.unsubscribeStorage = null;
      this.retryTimers = [];
      this.scrollHandler = null;
      this.scrollDebounceTimer = null;
    }

    /**
     * Initializes the processor on search/browse pages.
     */
    async init() {
      try {
        // 1. Get active settings
        const storageManager = (typeof window !== 'undefined' && window.StorageManager)
          ? window.StorageManager
          : (typeof require !== 'undefined' ? require('./utils/storage.js') : null);

        if (storageManager && storageManager.getSettings) {
          this.currentSettings = await storageManager.getSettings();
        } else {
          this.currentSettings = {
            amazonCommissionRate: 15.0,
            sellTaxRate: 9.0,
            targetProfitAmount: 12.00,
            shippingDeduction: 9.98
          };
        }

        // 2. Listen to settings changes across tabs
        if (storageManager && storageManager.onSettingsChanged) {
          this.unsubscribeStorage = storageManager.onSettingsChanged((newSettings) => {
            this.handleSettingsUpdated(newSettings);
          });
        }

        // 3. Scan and inject cards already in the DOM
        this.processAllCards();

        // 4. Mount floating status pill
        this.mountStatusPill();

        // 5. Watch for dynamically loaded cards
        this.initMutationObserver();

        // 6. Polling retry passes for cards rendered asynchronously
        this.initRetryPasses();

        // 7. Passive scroll listener for infinite scroll
        this.initScrollListener();
      } catch (err) {
        console.error('[EAPC Search Processor] Initialization error:', err);
      }
    }

    /**
     * Scans the document for uncalculated product cards.
     */
    processAllCards() {
      if (typeof document === 'undefined') return 0;

      // Clean out dead / removed card references from earlier queries
      for (const [card] of this.processedCards.entries()) {
        if (!document.body.contains(card)) {
          this.processedCards.delete(card);
        }
      }

      // Broad card selectors covering standard, grid, and modular variations
      const cardElements = document.querySelectorAll(
        '.s-item, .s-card, li.s-item, li.s-card, .b-list__item, [data-view*="mi:"], ul.srp-results > li, .srp-results li'
      );
      let newCount = 0;

      for (const card of cardElements) {
        if (this.processCard(card)) {
          newCount++;
        }
      }

      this.updateStatusPill();
      return newCount;
    }

    /**
     * Processes a single product card element.
     * @returns {boolean} true if card was processed, false if skipped
     */
    processCard(card) {
      if (!card || !card.querySelector) return false;

      // Skip already processed cards
      if (card.dataset.eapcProcessed === 'true' || card.querySelector('.eapc-search-card-host')) {
        return false;
      }

      const parser = (typeof window !== 'undefined' && window.EbayParser)
        ? window.EbayParser
        : (typeof require !== 'undefined' ? require('./utils/ebay-parser.js') : null);

      if (!parser || !parser.extractSearchCardData) return false;

      const extracted = parser.extractSearchCardData(card);
      if (!extracted || !extracted.success || !extracted.priceData) {
        return false; // Skip dummy headers or unparseable items
      }

      // Calculate Amazon selling prices
      const calcData = this.calculateForCard(extracted.priceData, extracted.shippingInfo);
      if (!calcData) return false;

      // Find insertion target within the card
      const target = card.querySelector('.s-item__details') ||
                     card.querySelector('.s-item__info') ||
                     card.querySelector('.s-item__details-section') ||
                     card.querySelector('.s-card__info') ||
                     card.querySelector('.s-item__wrapper') ||
                     card;

      // Create isolated Shadow DOM host
      const host = document.createElement('div');
      host.className = 'eapc-search-card-host';
      const shadow = host.attachShadow({ mode: 'open' });

      // Render content and bind copy handlers
      this.renderCardContent(shadow, extracted, calcData);

      // Append host to target
      target.appendChild(host);

      // Mark card as processed and track
      card.dataset.eapcProcessed = 'true';
      this.processedCards.set(card, { host, shadow, extracted, calcData });

      return true;
    }

    /**
     * Computes Amazon selling prices for single or range items using active settings.
     */
    calculateForCard(priceData, shippingInfo) {
      const engine = (typeof window !== 'undefined' && window.CalculatorEngine)
        ? window.CalculatorEngine
        : (typeof require !== 'undefined' ? require('./utils/calculator-engine.js') : null);

      if (!engine || !engine.calculate) return null;

      const settings = this.currentSettings || {
        amazonCommissionRate: 15.0,
        sellTaxRate: 9.0,
        targetProfitAmount: 12.00,
        shippingDeduction: 9.98
      };

      const shippingCost = (shippingInfo && shippingInfo.state === 'KNOWN' && shippingInfo.value !== null)
        ? shippingInfo.value
        : 0.0;

      const isShippingUnknown = (shippingInfo && shippingInfo.state === 'UNKNOWN');

      if (priceData.isRange) {
        // Price Range: calculate min and max bounds
        const minCost = priceData.min + shippingCost;
        const maxCost = priceData.max + shippingCost;

        const calcMin = engine.calculate({
          productCost: minCost,
          commissionRate: settings.amazonCommissionRate,
          taxRate: settings.sellTaxRate,
          targetProfit: settings.targetProfitAmount,
          shippingDeduction: settings.shippingDeduction
        });

        const calcMax = engine.calculate({
          productCost: maxCost,
          commissionRate: settings.amazonCommissionRate,
          taxRate: settings.sellTaxRate,
          targetProfit: settings.targetProfitAmount,
          shippingDeduction: settings.shippingDeduction
        });

        return {
          isRange: true,
          isShippingUnknown,
          currency: priceData.currency || 'USD',
          withShip: {
            display: `${calcMin.formatted.sellingPriceWithShipping} – ${calcMax.formatted.sellingPriceWithShipping}`,
            copyVal: `${calcMin.sellingPriceWithShipping.toFixed(2)} - ${calcMax.sellingPriceWithShipping.toFixed(2)}`,
            minNum: calcMin.sellingPriceWithShipping,
            maxNum: calcMax.sellingPriceWithShipping
          },
          noShip: {
            display: `${calcMin.formatted.sellingPriceWithoutShipping} – ${calcMax.formatted.sellingPriceWithoutShipping}`,
            copyVal: `${calcMin.sellingPriceWithoutShipping.toFixed(2)} - ${calcMax.sellingPriceWithoutShipping.toFixed(2)}`,
            minNum: calcMin.sellingPriceWithoutShipping,
            maxNum: calcMax.sellingPriceWithoutShipping
          },
          targetProfit: `$${settings.targetProfitAmount.toFixed(2)}`,
          estProfit: `$${settings.targetProfitAmount.toFixed(2)}`,
          marginDisplay: `${calcMax.formatted.profitMargin} – ${calcMin.formatted.profitMargin}`,
          roiDisplay: `${calcMax.formatted.roi} – ${calcMin.formatted.roi}`
        };
      } else {
        // Single Price
        const cost = priceData.min + shippingCost;

        const calc = engine.calculate({
          productCost: cost,
          commissionRate: settings.amazonCommissionRate,
          taxRate: settings.sellTaxRate,
          targetProfit: settings.targetProfitAmount,
          shippingDeduction: settings.shippingDeduction
        });

        return {
          isRange: false,
          isShippingUnknown,
          currency: priceData.currency || 'USD',
          withShip: {
            display: calc.formatted.sellingPriceWithShipping,
            copyVal: calc.sellingPriceWithShipping.toFixed(2),
            num: calc.sellingPriceWithShipping
          },
          noShip: {
            display: calc.formatted.sellingPriceWithoutShipping,
            copyVal: calc.sellingPriceWithoutShipping.toFixed(2),
            num: calc.sellingPriceWithoutShipping
          },
          targetProfit: `$${settings.targetProfitAmount.toFixed(2)}`,
          estProfit: calc.formatted.estimatedProfit,
          marginDisplay: calc.formatted.profitMargin,
          roiDisplay: calc.formatted.roi
        };
      }
    }

    /**
     * Injects HTML markup and scoped styles into the card's Shadow DOM.
     */
    renderCardContent(shadow, extracted, calcData) {
      shadow.innerHTML = `
        <style>
          :host {
            display: block;
            margin: 6px 0 8px 0;
            width: 100%;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #f1f5f9;
            text-align: left;
          }

          * {
            box-sizing: border-box;
          }

          .eapc-card {
            background: linear-gradient(135deg, #0e1726 0%, #080d1a 100%);
            border: 1px solid rgba(56, 189, 248, 0.28);
            border-radius: 8px;
            padding: 8px 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          }

          .eapc-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
            padding-bottom: 4px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .eapc-brand {
            font-size: 10.5px;
            font-weight: 700;
            letter-spacing: 0.5px;
            background: linear-gradient(90deg, #38bdf8, #34d399);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .eapc-target-pill {
            font-size: 10px;
            color: #94a3b8;
            background: rgba(255, 255, 255, 0.06);
            padding: 1px 5px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          .eapc-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3px 0;
          }

          .eapc-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }

          .eapc-label-with-ship {
            color: #34d399;
          }

          .eapc-label-no-ship {
            color: #38bdf8;
          }

          .eapc-price-box {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .eapc-price {
            font-size: 13.5px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.2px;
          }

          .eapc-btn-copy {
            background: rgba(56, 189, 248, 0.12);
            border: 1px solid rgba(56, 189, 248, 0.3);
            color: #38bdf8;
            border-radius: 4px;
            padding: 2px 7px;
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            line-height: 1.2;
            user-select: none;
          }

          .eapc-btn-copy:hover {
            background: rgba(56, 189, 248, 0.25);
            border-color: #38bdf8;
            color: #ffffff;
          }

          .eapc-btn-copied {
            background: rgba(52, 211, 153, 0.25) !important;
            border-color: #34d399 !important;
            color: #34d399 !important;
          }

          .eapc-footer {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
            margin-top: 5px;
            padding-top: 4px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 9.5px;
            color: #94a3b8;
          }

          .eapc-profit-highlight {
            color: #34d399;
            font-weight: 700;
          }

          .eapc-ship-warn {
            color: #fbbf24;
            font-size: 9.5px;
            margin-top: 2px;
          }
        </style>

        <div class="eapc-card">
          <div class="eapc-header">
            <span class="eapc-brand">⚡ AMAZON ARBITRAGE</span>
            <span class="eapc-target-pill">Target: ${calcData.targetProfit}</span>
          </div>

          <div class="eapc-row">
            <span class="eapc-label eapc-label-with-ship">With Shipping</span>
            <div class="eapc-price-box">
              <span class="eapc-price">${calcData.withShip.display}</span>
              <button class="eapc-btn-copy" data-copy="${calcData.withShip.copyVal}" title="Copy to clipboard">Copy</button>
            </div>
          </div>

          <div class="eapc-row">
            <span class="eapc-label eapc-label-no-ship">W/O Shipping</span>
            <div class="eapc-price-box">
              <span class="eapc-price">${calcData.noShip.display}</span>
              <button class="eapc-btn-copy" data-copy="${calcData.noShip.copyVal}" title="Copy to clipboard">Copy</button>
            </div>
          </div>

          <div class="eapc-footer">
            <span>Est. Profit: <strong class="eapc-profit-highlight">${calcData.estProfit}</strong></span>
            <span>• Margin: ${calcData.marginDisplay}</span>
            ${!calcData.isRange ? `<span>• ROI: ${calcData.roiDisplay}</span>` : ''}
          </div>

          ${calcData.isShippingUnknown ? `
            <div class="eapc-ship-warn">⚠ Shipping unspecified on eBay card (assumes free)</div>
          ` : ''}
        </div>
      `;

      // Bind copy buttons with stopPropagation to avoid navigating product link
      const copyBtns = shadow.querySelectorAll('.eapc-btn-copy');
      copyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const textToCopy = btn.getAttribute('data-copy');
          this.copyToClipboard(textToCopy, btn);
        });
      });
    }

    /**
     * Copies text to clipboard with honest visual button feedback.
     */
    async copyToClipboard(text, btnElement) {
      if (!text) return;

      let success = false;

      // 1. Primary write via navigator.clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          success = true;
        } catch {
          success = false;
        }
      }

      // 2. Fallback via temporary textarea
      if (!success && typeof document !== 'undefined') {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          success = document.execCommand('copy');
          document.body.removeChild(textarea);
        } catch {
          success = false;
        }
      }

      // Button feedback
      if (btnElement) {
        if (success) {
          const originalText = btnElement.textContent;
          btnElement.textContent = '✓ Copied!';
          if (btnElement.classList && btnElement.classList.add) {
            btnElement.classList.add('eapc-btn-copied');
          }
          setTimeout(() => {
            btnElement.textContent = originalText;
            if (btnElement.classList && btnElement.classList.remove) {
              btnElement.classList.remove('eapc-btn-copied');
            }
          }, 1200);
        } else {
          btnElement.textContent = '✕ Error';
          setTimeout(() => {
            btnElement.textContent = 'Copy';
          }, 1500);
        }
      }
    }

    /**
     * Reacts to cross-tab settings updates by recalculating all cards on page.
     */
    handleSettingsUpdated(newSettings) {
      this.currentSettings = newSettings;

      for (const [card, info] of this.processedCards.entries()) {
        if (!document.body.contains(card)) {
          this.processedCards.delete(card);
          continue;
        }

        const newCalcData = this.calculateForCard(info.extracted.priceData, info.extracted.shippingInfo);
        if (newCalcData) {
          info.calcData = newCalcData;
          this.renderCardContent(info.shadow, info.extracted, newCalcData);
        }
      }

      this.updateStatusPill();
    }

    /**
     * Initializes debounced MutationObserver observing document.body.
     */
    initMutationObserver() {
      if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;

      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }

      this.mutationObserver = new MutationObserver(() => {
        clearTimeout(this.scanDebounceTimer);
        this.scanDebounceTimer = setTimeout(() => {
          this.processAllCards();
        }, 200);
      });

      // Always observe document.body so container replacements never unbind the observer
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    /**
     * Schedules consecutive retry scans to discover cards rendered by AJAX/hydration.
     */
    initRetryPasses() {
      const delays = [300, 800, 1500, 3000, 5000];
      for (const delay of delays) {
        const timer = setTimeout(() => {
          this.processAllCards();
        }, delay);
        this.retryTimers.push(timer);
      }
    }

    /**
     * Passive scroll listener ensuring infinite scroll additions are captured immediately.
     */
    initScrollListener() {
      if (typeof window === 'undefined') return;
      this.scrollHandler = () => {
        clearTimeout(this.scrollDebounceTimer);
        this.scrollDebounceTimer = setTimeout(() => {
          this.processAllCards();
        }, 200);
      };
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
    }

    /**
     * Resets state and re-scans when user executes a new search or changes filter/sort.
     */
    handleSearchNavigation() {
      // Clear stale cards
      for (const [card, info] of this.processedCards.entries()) {
        if (info.host && info.host.parentNode) {
          info.host.parentNode.removeChild(info.host);
        }
        delete card.dataset.eapcProcessed;
      }
      this.processedCards.clear();
      this.updateStatusPill();

      // Trigger immediate scan and schedule retry passes for the incoming results
      this.processAllCards();
      this.initRetryPasses();
    }

    /**
     * Mounts floating status bar in bottom-right corner.
     */
    mountStatusPill() {
      if (typeof document === 'undefined') return;
      if (document.querySelector('.eapc-search-status-host')) return;

      this.statusPillHost = document.createElement('div');
      this.statusPillHost.className = 'eapc-search-status-host';
      const shadow = this.statusPillHost.attachShadow({ mode: 'open' });

      document.body.appendChild(this.statusPillHost);
      this.renderStatusPillContent(shadow);
    }

    /**
     * Renders floating status pill markup and styling.
     */
    renderStatusPillContent(shadow) {
      const count = this.processedCards.size;
      const settings = this.currentSettings || { amazonCommissionRate: 15, targetProfitAmount: 12 };

      shadow.innerHTML = `
        <style>
          :host {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
          }

          .eapc-pill {
            background: linear-gradient(135deg, #0e1726 0%, #080d1a 100%);
            border: 1px solid rgba(56, 189, 248, 0.35);
            border-radius: 30px;
            padding: 7px 14px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
            display: flex;
            align-items: center;
            gap: 10px;
            color: #f1f5f9;
            user-select: none;
            backdrop-filter: blur(8px);
          }

          .eapc-pill-badge {
            background: linear-gradient(90deg, #38bdf8, #34d399);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 700;
            letter-spacing: 0.3px;
          }

          .eapc-pill-count {
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
            padding: 2px 7px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 11px;
          }

          .eapc-pill-info {
            font-size: 11px;
            color: #94a3b8;
          }

          .eapc-pill-btn {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #e2e8f0;
            border-radius: 6px;
            padding: 3px 8px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .eapc-pill-btn:hover {
            background: rgba(56, 189, 248, 0.2);
            border-color: #38bdf8;
            color: #38bdf8;
          }

          .eapc-pill-minimized {
            padding: 6px 10px;
            border-radius: 20px;
            cursor: pointer;
          }
        </style>

        <div class="eapc-pill ${this.isPillMinimized ? 'eapc-pill-minimized' : ''}" id="eapc-pill-container">
          <span class="eapc-pill-badge">⚡ EAPC</span>
          ${!this.isPillMinimized ? `
            <span class="eapc-pill-count" id="eapc-pill-count">${count} items</span>
            <span class="eapc-pill-info" id="eapc-pill-info">Comm: ${settings.amazonCommissionRate}% | Target: $${settings.targetProfitAmount.toFixed(2)}</span>
            <button class="eapc-pill-btn" id="eapc-pill-settings">⚙ Settings</button>
            <button class="eapc-pill-btn" id="eapc-pill-toggle" title="Minimize">–</button>
          ` : `
            <span class="eapc-pill-count">${count}</span>
            <span style="cursor: pointer; font-size: 10px; color: #94a3b8;" title="Expand">▲</span>
          `}
        </div>
      `;

      const btnSettings = shadow.getElementById('eapc-pill-settings');
      if (btnSettings) {
        btnSettings.addEventListener('click', (e) => {
          e.stopPropagation();
          this.options.onSettingsClick();
        });
      }

      const btnToggle = shadow.getElementById('eapc-pill-toggle');
      if (btnToggle) {
        btnToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          this.isPillMinimized = !this.isPillMinimized;
          this.renderStatusPillContent(shadow);
        });
      }

      if (this.isPillMinimized) {
        const container = shadow.getElementById('eapc-pill-container');
        if (container) {
          container.addEventListener('click', () => {
            this.isPillMinimized = false;
            this.renderStatusPillContent(shadow);
          });
        }
      }
    }

    /**
     * Updates status pill values.
     */
    updateStatusPill() {
      if (!this.statusPillHost || !this.statusPillHost.shadowRoot) return;
      this.renderStatusPillContent(this.statusPillHost.shadowRoot);
    }

    /**
     * Opens extension options settings page.
     */
    openSettings() {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
      } else if (typeof window !== 'undefined') {
        window.open('settings/settings.html', '_blank');
      }
    }

    /**
     * Cleans up observers, hosts, timers, and listeners.
     */
    teardown() {
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }

      if (this.scanDebounceTimer) {
        clearTimeout(this.scanDebounceTimer);
        this.scanDebounceTimer = null;
      }

      if (this.scrollDebounceTimer) {
        clearTimeout(this.scrollDebounceTimer);
        this.scrollDebounceTimer = null;
      }

      for (const t of this.retryTimers) {
        clearTimeout(t);
      }
      this.retryTimers = [];

      if (this.scrollHandler && typeof window !== 'undefined') {
        window.removeEventListener('scroll', this.scrollHandler);
        this.scrollHandler = null;
      }

      if (typeof this.unsubscribeStorage === 'function') {
        this.unsubscribeStorage();
        this.unsubscribeStorage = null;
      }

      // Remove all injected card hosts
      for (const [card, info] of this.processedCards.entries()) {
        if (info.host && info.host.parentNode) {
          info.host.parentNode.removeChild(info.host);
        }
        delete card.dataset.eapcProcessed;
      }
      this.processedCards.clear();

      // Remove status pill
      if (this.statusPillHost && this.statusPillHost.parentNode) {
        this.statusPillHost.parentNode.removeChild(this.statusPillHost);
        this.statusPillHost = null;
      }
    }
  }

  return SearchGridProcessor;
});
