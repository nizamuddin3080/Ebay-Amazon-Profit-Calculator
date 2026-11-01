/**
 * eBay to Amazon Profit Calculator - Floating UI & Shadow DOM Component
 * 
 * Manages the isolated Shadow DOM overlay, viewport dragging, minimized pill toggle,
 * dual independent manual overrides, selling price cards, and reliable clipboard copy.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js / CommonJS
    module.exports = factory(require('./utils/calculator-engine.js'), require('./utils/ebay-parser.js'));
  } else {
    // Browser global (Content script)
    root.ProfitCalculatorUI = factory(root.CalculatorEngine, root.EbayParser);
  }
})(typeof self !== 'undefined' ? self : this, function (CalculatorEngine, EbayParser) {
  'use strict';

  const HOST_ID = 'ebay-amazon-profit-calc-host';
  const STORAGE_KEY_POS = 'eapc_ui_position';
  const STORAGE_KEY_MIN = 'eapc_ui_minimized';

  class ProfitCalculatorUI {
    constructor(options = {}) {
      this.options = Object.assign({
        onSettingsClick: () => {},
        onPriceChange: () => {},
        onShippingChange: () => {},
        onPriceReset: () => {},
        onShippingReset: () => {},
        cssUrl: null
      }, options);

      this.hostElement = null;
      this.shadowRoot = null;
      this.isMinimized = false;
      this.isDragging = false;
      this.dragOffset = { x: 0, y: 0 };
      this.currentDetails = null;
      this.currentCalcResult = null;
      this.currentCalcResultZero = null;
      this.currentSettings = null;
      this.manualOverride = {
        price: { isOverridden: false, value: null },
        shipping: { isOverridden: false, value: null }
      };

      this.toastTimer = null;
    }

    /**
     * Initializes and attaches the calculator inside an isolated ShadowRoot.
     * Enforces singleton host element check.
     */
    mount(doc = document) {
      if (!doc || !doc.body) return null;

      // Singleton guard: if host already exists, re-use instance
      let host = doc.getElementById(HOST_ID);
      if (host && host._eapcInstance) {
        return host._eapcInstance;
      }

      if (!host) {
        host = doc.createElement('div');
        host.id = HOST_ID;
        doc.body.appendChild(host);
      }

      this.hostElement = host;
      this.hostElement._eapcInstance = this;
      this.shadowRoot = host.attachShadow({ mode: 'open' });

      // Restore saved minimized state
      try {
        const savedMin = sessionStorage.getItem(STORAGE_KEY_MIN);
        if (savedMin !== null) {
          this.isMinimized = savedMin === 'true';
        }
      } catch (e) {}

      this.render();
      this.restorePosition();
      this.bindEvents();

      return this;
    }

    /**
     * Injects scoped styles and HTML template.
     */
    render() {
      if (!this.shadowRoot) return;

      this.shadowRoot.innerHTML = `
        <style>
          ${this.getInlineStyles()}
        </style>
        <div class="eapc-wrapper">
          <!-- Expanded Container -->
          <div class="eapc-container" id="eapc-expanded" style="display: ${this.isMinimized ? 'none' : 'block'};">
            <!-- Header -->
            <div class="eapc-header" id="eapc-drag-header">
              <div class="eapc-header-left">
                <span class="eapc-drag-handle">⋮⋮</span>
                <span class="eapc-title">eBay → Amazon Calc</span>
              </div>
              <div class="eapc-header-controls">
                <button class="eapc-btn-icon" id="eapc-btn-minimize" title="Minimize">─</button>
                <button class="eapc-btn-icon" id="eapc-btn-settings" title="Settings">⚙</button>
                <button class="eapc-btn-icon" id="eapc-btn-close" title="Close">✕</button>
              </div>
            </div>

            <!-- Product Information -->
            <div class="eapc-section">
              <div class="eapc-product-title" id="eapc-item-title" title="eBay Item">Detecting product...</div>
              
              <!-- eBay Price Row -->
              <div class="eapc-row">
                <span class="eapc-label">eBay Price:</span>
                <div class="eapc-input-group">
                  <span class="eapc-badge eapc-badge-auto" id="eapc-price-badge">AUTO</span>
                  <button class="eapc-btn-redetect" id="eapc-price-reset" title="Reset to auto-detected price" style="display: none;">↺</button>
                  <div class="eapc-input-wrapper">
                    <span class="eapc-currency-prefix">$</span>
                    <input type="text" class="eapc-input" id="eapc-input-price" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <!-- eBay Shipping Row -->
              <div class="eapc-row">
                <span class="eapc-label">eBay Shipping:</span>
                <div class="eapc-input-group">
                  <span class="eapc-badge eapc-badge-auto" id="eapc-shipping-badge">AUTO</span>
                  <button class="eapc-btn-redetect" id="eapc-shipping-reset" title="Reset to auto-detected shipping" style="display: none;">↺</button>
                  <div class="eapc-input-wrapper">
                    <span class="eapc-currency-prefix">$</span>
                    <input type="text" class="eapc-input" id="eapc-input-shipping" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <!-- Total Cost Row -->
              <div class="eapc-row" style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--eapc-border);">
                <span class="eapc-label" style="font-weight: 600;">Total Product Cost (C):</span>
                <span class="eapc-total-cost-val" id="eapc-total-cost">$0.00</span>
              </div>
            </div>

            <!-- Settings Quick View Bar -->
            <div class="eapc-settings-bar" id="eapc-settings-bar" title="Click to edit calculation settings">
              <span id="eapc-settings-summary">Comm: 15% • Tax: 9% • Target: $12 • Ded: $9.98</span>
              <span>⚙</span>
            </div>

            <!-- Optional Warning Banners -->
            <div id="eapc-banner-container"></div>

            <!-- Selling Price Cards -->
            <div class="eapc-section">
              <!-- Group 1: 0% Tax (Exempt / Resale) -->
              <div class="eapc-tax-card-group">
                <div class="eapc-tax-group-header">
                  <span class="eapc-tax-pill eapc-tax-pill-zero">0% TAX (EXEMPT / RESALE)</span>
                </div>
                <!-- Card 1a: 0% Tax With Shipping -->
                <div class="eapc-price-card eapc-price-card-primary">
                  <div class="eapc-card-info">
                    <span class="eapc-card-label">With Shipping (0% Tax)</span>
                    <span class="eapc-card-price eapc-text-profit" id="eapc-price-with-ship-zero">$0.00</span>
                  </div>
                  <button class="eapc-btn-copy-card" id="eapc-btn-copy-with-ship-zero" title="Copy 0% Tax with shipping">COPY</button>
                </div>
                <!-- Card 1b: 0% Tax Without Shipping -->
                <div class="eapc-price-card eapc-price-card-secondary" style="margin-top: 6px;">
                  <div class="eapc-card-info">
                    <span class="eapc-card-label">Without Shipping (0% Tax)</span>
                    <span class="eapc-card-price eapc-text-blue" id="eapc-price-without-ship-zero">$0.00</span>
                    <span class="eapc-card-sublabel" id="eapc-deduction-sublabel-zero">(-$9.98 deduction)</span>
                  </div>
                  <button class="eapc-btn-copy-card" id="eapc-btn-copy-without-ship-zero" title="Copy 0% Tax without shipping">COPY</button>
                </div>
              </div>

              <!-- Group 2: Settings Tax -->
              <div class="eapc-tax-card-group" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--eapc-border);">
                <div class="eapc-tax-group-header">
                  <span class="eapc-tax-pill eapc-tax-pill-setting" id="eapc-tax-badge-setting">9% TAX (AS PER SETTINGS)</span>
                </div>
                <!-- Card 2a: Settings Tax With Shipping -->
                <div class="eapc-price-card eapc-price-card-primary">
                  <div class="eapc-card-info">
                    <span class="eapc-card-label">With Shipping (Settings Tax)</span>
                    <span class="eapc-card-price eapc-text-profit" id="eapc-price-with-ship">$0.00</span>
                  </div>
                  <button class="eapc-btn-copy-card" id="eapc-btn-copy-with-ship" title="Copy Settings tax with shipping">COPY</button>
                </div>
                <!-- Card 2b: Settings Tax Without Shipping -->
                <div class="eapc-price-card eapc-price-card-secondary" style="margin-top: 6px;">
                  <div class="eapc-card-info">
                    <span class="eapc-card-label">Without Shipping (Settings Tax)</span>
                    <span class="eapc-card-price eapc-text-blue" id="eapc-price-without-ship">$0.00</span>
                    <span class="eapc-card-sublabel" id="eapc-deduction-sublabel">(-$9.98 deduction)</span>
                  </div>
                  <button class="eapc-btn-copy-card" id="eapc-btn-copy-without-ship" title="Copy Settings tax without shipping">COPY</button>
                </div>
              </div>
            </div>

            <!-- Profit Summary Grid -->
            <div class="eapc-section">
              <div class="eapc-summary-grid">
                <div class="eapc-summary-item">
                  <span class="eapc-summary-label">Target Profit:</span>
                  <span class="eapc-summary-val" id="eapc-target-profit">$12.00</span>
                </div>
                <div class="eapc-summary-item">
                  <span class="eapc-summary-label">Estimated Profit:</span>
                  <span class="eapc-summary-val eapc-text-profit" id="eapc-estimated-profit">$12.00</span>
                </div>
                <div class="eapc-summary-item">
                  <span class="eapc-summary-label">Profit Margin:</span>
                  <span class="eapc-summary-val" id="eapc-profit-margin">0.0%</span>
                </div>
                <div class="eapc-summary-item">
                  <span class="eapc-summary-label">Return on Inv:</span>
                  <span class="eapc-summary-val" id="eapc-roi">0.0%</span>
                </div>
              </div>
            </div>

            <!-- Primary Action Buttons -->
            <div class="eapc-actions">
              <button class="eapc-btn-action eapc-btn-primary" id="eapc-action-copy-main">Copy Amazon Price</button>
              <button class="eapc-btn-action eapc-btn-secondary" id="eapc-action-copy-alt">Copy W/O Ship</button>
            </div>
          </div>

          <!-- Minimized Pill Container -->
          <div class="eapc-pill" id="eapc-pill" style="display: ${this.isMinimized ? 'flex' : 'none'};">
            <span class="eapc-pill-dot"></span>
            <span class="eapc-pill-text" id="eapc-pill-text">Amazon: $0.00 | Profit: $0.00</span>
            <span class="eapc-pill-expand">▲ EXP</span>
          </div>

          <!-- Feedback Toast Notification -->
          <div class="eapc-toast" id="eapc-toast"></div>
        </div>
      `;
    }

    /**
     * Binds DOM listeners for dragging, input changes, copying, and minimize/expand.
     */
    bindEvents() {
      const root = this.shadowRoot;
      if (!root) return;

      // Minimize & Expand controls
      const btnMin = root.getElementById('eapc-btn-minimize');
      const btnClose = root.getElementById('eapc-btn-close');
      const pill = root.getElementById('eapc-pill');
      const btnSettings = root.getElementById('eapc-btn-settings');
      const settingsBar = root.getElementById('eapc-settings-bar');

      if (btnMin) btnMin.addEventListener('click', () => this.toggleMinimize(true));
      if (pill) pill.addEventListener('click', () => this.toggleMinimize(false));
      if (btnClose) btnClose.addEventListener('click', () => this.close());
      if (btnSettings) btnSettings.addEventListener('click', () => this.options.onSettingsClick());
      if (settingsBar) settingsBar.addEventListener('click', () => this.options.onSettingsClick());

      // Manual price override input
      const inputPrice = root.getElementById('eapc-input-price');
      if (inputPrice) {
        inputPrice.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          this.manualOverride.price.isOverridden = true;
          this.manualOverride.price.value = Number.isFinite(val) ? val : null;
          this.updateOverrideBadges();
          this.options.onPriceChange(this.manualOverride.price.value, true);
        });
      }

      // Manual shipping override input
      const inputShipping = root.getElementById('eapc-input-shipping');
      if (inputShipping) {
        inputShipping.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          this.manualOverride.shipping.isOverridden = true;
          this.manualOverride.shipping.value = Number.isFinite(val) ? val : null;
          this.updateOverrideBadges();
          this.options.onShippingChange(this.manualOverride.shipping.value, true);
        });
      }

      // Re-detect buttons
      const btnResetPrice = root.getElementById('eapc-price-reset');
      if (btnResetPrice) {
        btnResetPrice.addEventListener('click', () => {
          this.manualOverride.price.isOverridden = false;
          this.manualOverride.price.value = null;
          this.updateOverrideBadges();
          this.options.onPriceReset();
        });
      }

      const btnResetShipping = root.getElementById('eapc-shipping-reset');
      if (btnResetShipping) {
        btnResetShipping.addEventListener('click', () => {
          this.manualOverride.shipping.isOverridden = false;
          this.manualOverride.shipping.value = null;
          this.updateOverrideBadges();
          this.options.onShippingReset();
        });
      }

      // Copy buttons for all 4 price options
      const btnCopyCardWithShip = root.getElementById('eapc-btn-copy-with-ship');
      const btnCopyCardNoShip = root.getElementById('eapc-btn-copy-without-ship');
      const btnCopyCardWithShipZero = root.getElementById('eapc-btn-copy-with-ship-zero');
      const btnCopyCardNoShipZero = root.getElementById('eapc-btn-copy-without-ship-zero');
      const btnActionCopyMain = root.getElementById('eapc-action-copy-main');
      const btnActionCopyAlt = root.getElementById('eapc-action-copy-alt');

      const copyWithShipAction = () => {
        if (this.currentCalcResult && this.currentCalcResult.isValid) {
          this.copyToClipboard(this.currentCalcResult.sellingPriceWithShipping.toFixed(2));
        }
      };

      const copyNoShipAction = () => {
        if (this.currentCalcResult && this.currentCalcResult.isValid) {
          this.copyToClipboard(this.currentCalcResult.sellingPriceWithoutShipping.toFixed(2));
        }
      };

      const copyWithShipZeroAction = () => {
        if (this.currentCalcResultZero && this.currentCalcResultZero.isValid) {
          this.copyToClipboard(this.currentCalcResultZero.sellingPriceWithShipping.toFixed(2));
        }
      };

      const copyNoShipZeroAction = () => {
        if (this.currentCalcResultZero && this.currentCalcResultZero.isValid) {
          this.copyToClipboard(this.currentCalcResultZero.sellingPriceWithoutShipping.toFixed(2));
        }
      };

      if (btnCopyCardWithShip) btnCopyCardWithShip.addEventListener('click', copyWithShipAction);
      if (btnCopyCardNoShip) btnCopyCardNoShip.addEventListener('click', copyNoShipAction);
      if (btnCopyCardWithShipZero) btnCopyCardWithShipZero.addEventListener('click', copyWithShipZeroAction);
      if (btnCopyCardNoShipZero) btnCopyCardNoShipZero.addEventListener('click', copyNoShipZeroAction);
      if (btnActionCopyMain) btnActionCopyMain.addEventListener('click', copyWithShipAction);
      if (btnActionCopyAlt) btnActionCopyAlt.addEventListener('click', copyWithShipZeroAction);

      // Drag and drop mechanics
      this.initDragging();
    }

    /**
     * Initializes pointer dragging on the header handle, constrained to viewport.
     */
    initDragging() {
      const header = this.shadowRoot.getElementById('eapc-drag-header');
      const container = this.shadowRoot.getElementById('eapc-expanded');
      if (!header || !this.hostElement) return;

      const onPointerDown = (e) => {
        // Only drag on left click and not on interactive buttons
        if (e.button !== 0 || e.target.closest('.eapc-btn-icon')) return;

        this.isDragging = true;
        const rect = this.hostElement.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;

        if (container) container.classList.add('eapc-dragging');
        header.setPointerCapture(e.pointerId);
      };

      const onPointerMove = (e) => {
        if (!this.isDragging) return;

        const width = this.hostElement.offsetWidth || 320;
        const height = this.hostElement.offsetHeight || 420;

        // Viewport boundaries
        const minX = 10;
        const maxX = window.innerWidth - width - 10;
        const minY = 10;
        const maxY = window.innerHeight - height - 10;

        let newX = e.clientX - this.dragOffset.x;
        let newY = e.clientY - this.dragOffset.y;

        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));

        this.hostElement.style.left = `${newX}px`;
        this.hostElement.style.top = `${newY}px`;
        this.hostElement.style.right = 'auto'; // Reset right anchor
      };

      const onPointerUp = (e) => {
        if (!this.isDragging) return;
        this.isDragging = false;
        if (container) container.classList.remove('eapc-dragging');
        header.releasePointerCapture(e.pointerId);

        // Save position preference
        try {
          const rect = this.hostElement.getBoundingClientRect();
          sessionStorage.setItem(STORAGE_KEY_POS, JSON.stringify({ x: rect.left, y: rect.top }));
        } catch (err) {}
      };

      header.addEventListener('pointerdown', onPointerDown);
      header.addEventListener('pointermove', onPointerMove);
      header.addEventListener('pointerup', onPointerUp);
      header.addEventListener('pointercancel', onPointerUp);
    }

    /**
     * Restores previously saved viewport coordinates.
     */
    restorePosition() {
      if (!this.hostElement) return;
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY_POS);
        if (saved) {
          const pos = JSON.parse(saved);
          if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
            const maxX = window.innerWidth - 330;
            const maxY = window.innerHeight - 100;
            this.hostElement.style.left = `${Math.max(10, Math.min(pos.x, maxX))}px`;
            this.hostElement.style.top = `${Math.max(10, Math.min(pos.y, maxY))}px`;
            this.hostElement.style.right = 'auto';
          }
        }
      } catch (e) {}
    }

    /**
     * Toggles between expanded card and compact floating pill.
     */
    toggleMinimize(minimized) {
      this.isMinimized = minimized;
      const expanded = this.shadowRoot.getElementById('eapc-expanded');
      const pill = this.shadowRoot.getElementById('eapc-pill');

      if (expanded) expanded.style.display = minimized ? 'none' : 'block';
      if (pill) pill.style.display = minimized ? 'flex' : 'none';

      try {
        sessionStorage.setItem(STORAGE_KEY_MIN, String(minimized));
      } catch (e) {}
    }

    /**
     * Closes the calculator for the current page session.
     */
    close() {
      if (this.hostElement) {
        this.hostElement.style.display = 'none';
      }
    }

    /**
     * Updates manual override badges and re-detect visibility.
     */
    updateOverrideBadges() {
      const root = this.shadowRoot;
      if (!root) return;

      const badgePrice = root.getElementById('eapc-price-badge');
      const btnResetPrice = root.getElementById('eapc-price-reset');
      if (badgePrice && btnResetPrice) {
        if (this.manualOverride.price.isOverridden) {
          badgePrice.textContent = 'MANUAL';
          badgePrice.className = 'eapc-badge eapc-badge-manual';
          btnResetPrice.style.display = 'inline-flex';
        } else {
          badgePrice.textContent = 'AUTO';
          badgePrice.className = 'eapc-badge eapc-badge-auto';
          btnResetPrice.style.display = 'none';
        }
      }

      const badgeShipping = root.getElementById('eapc-shipping-badge');
      const btnResetShipping = root.getElementById('eapc-shipping-reset');
      if (badgeShipping && btnResetShipping) {
        if (this.manualOverride.shipping.isOverridden) {
          badgeShipping.textContent = 'MANUAL';
          badgeShipping.className = 'eapc-badge eapc-badge-manual';
          btnResetShipping.style.display = 'inline-flex';
        } else {
          // Follow extraction shipping state
          if (this.currentDetails && this.currentDetails.shippingState === 'FREE') {
            badgeShipping.textContent = 'FREE';
            badgeShipping.className = 'eapc-badge eapc-badge-free';
          } else if (this.currentDetails && this.currentDetails.shippingState === 'UNKNOWN') {
            badgeShipping.textContent = 'UNKNOWN';
            badgeShipping.className = 'eapc-badge eapc-badge-unknown';
          } else {
            badgeShipping.textContent = 'AUTO';
            badgeShipping.className = 'eapc-badge eapc-badge-auto';
          }
          btnResetShipping.style.display = 'none';
        }
      }
    }

    /**
     * Updates calculator UI with freshly extracted details, active settings, and calculation results.
     */
    update(details, settings, calcResult, calcResultZero = null) {
      this.currentDetails = details;
      this.currentSettings = settings;
      this.currentCalcResult = calcResult;

      // Automatically calculate 0% tax if not passed by caller
      if (!calcResultZero && details && CalculatorEngine && CalculatorEngine.calculate) {
        const effectivePrice = this.manualOverride.price.isOverridden
          ? this.manualOverride.price.value
          : (details ? details.price : null);
        const effectiveShipping = this.manualOverride.shipping.isOverridden
          ? this.manualOverride.shipping.value
          : (details ? details.shippingCost : 0);

        if (effectivePrice !== null && Number.isFinite(effectivePrice) && (details.shippingState !== 'UNKNOWN' || this.manualOverride.shipping.isOverridden)) {
          calcResultZero = CalculatorEngine.calculate({
            productCost: effectivePrice + (effectiveShipping || 0),
            commissionRate: settings ? settings.amazonCommissionRate : 15.0,
            taxRate: 0,
            targetProfit: settings ? settings.targetProfitAmount : 12.0,
            shippingDeduction: settings ? settings.shippingDeduction : 9.98
          });
        }
      }
      this.currentCalcResultZero = calcResultZero;

      const root = this.shadowRoot;
      if (!root) return;

      // Ensure visible if unhidden
      if (this.hostElement && this.hostElement.style.display === 'none') {
        this.hostElement.style.display = 'block';
      }

      // Title
      const elTitle = root.getElementById('eapc-item-title');
      if (elTitle && details && details.title) {
        elTitle.textContent = details.title;
        elTitle.title = details.title;
      }

      // Inputs (only populate if not manually overridden)
      const inputPrice = root.getElementById('eapc-input-price');
      if (inputPrice && !this.manualOverride.price.isOverridden) {
        inputPrice.value = details && details.price !== null && Number.isFinite(details.price)
          ? details.price.toFixed(2)
          : '';
      }

      const inputShipping = root.getElementById('eapc-input-shipping');
      if (inputShipping && !this.manualOverride.shipping.isOverridden) {
        if (details && details.shippingState === 'FREE') {
          inputShipping.value = '0.00';
          inputShipping.placeholder = '0.00 (FREE)';
          inputShipping.classList.remove('eapc-input-amber');
        } else if (details && details.shippingState === 'UNKNOWN') {
          inputShipping.value = '';
          inputShipping.placeholder = 'Enter shipping $';
          inputShipping.classList.add('eapc-input-amber');
        } else if (details && details.shippingCost !== null) {
          inputShipping.value = details.shippingCost.toFixed(2);
          inputShipping.classList.remove('eapc-input-amber');
        }
      }

      this.updateOverrideBadges();

      // Total Product Cost
      const elTotalCost = root.getElementById('eapc-total-cost');
      if (elTotalCost) {
        if (details && details.shippingState === 'UNKNOWN' && !this.manualOverride.shipping.isOverridden) {
          elTotalCost.textContent = 'N/A (Shipping Required)';
          elTotalCost.style.color = 'var(--eapc-accent-amber)';
        } else {
          const effectivePrice = this.manualOverride.price.isOverridden
            ? this.manualOverride.price.value
            : (details ? details.price : 0);
          const effectiveShipping = this.manualOverride.shipping.isOverridden
            ? this.manualOverride.shipping.value
            : (details ? details.shippingCost || 0 : 0);

          const total = (effectivePrice || 0) + (effectiveShipping || 0);
          elTotalCost.textContent = `$${total.toFixed(2)}`;
          elTotalCost.style.color = 'var(--eapc-text-primary)';
        }
      }

      // Settings Summary Bar
      const elSettingsSummary = root.getElementById('eapc-settings-summary');
      if (elSettingsSummary && settings) {
        elSettingsSummary.textContent = `Comm: ${settings.amazonCommissionRate || 15}% • Tax: ${settings.sellTaxRate || 9}% • Target: $${(settings.targetProfitAmount || 12).toFixed(2)} • Ded: $${(settings.shippingDeduction || 9.98).toFixed(2)}`;
      }

      // Deduction sublabels
      const elDedSublabel = root.getElementById('eapc-deduction-sublabel');
      if (elDedSublabel && settings) {
        elDedSublabel.textContent = `(-$${(settings.shippingDeduction || 9.98).toFixed(2)} deduction)`;
      }
      const elDedSublabelZero = root.getElementById('eapc-deduction-sublabel-zero');
      if (elDedSublabelZero && settings) {
        elDedSublabelZero.textContent = `(-$${(settings.shippingDeduction || 9.98).toFixed(2)} deduction)`;
      }
      const elTaxBadgeSetting = root.getElementById('eapc-tax-badge-setting');
      if (elTaxBadgeSetting && settings) {
        elTaxBadgeSetting.textContent = `${settings.sellTaxRate || 9}% TAX (AS PER SETTINGS)`;
      }

      // Warning Banner Container
      const bannerContainer = root.getElementById('eapc-banner-container');
      if (bannerContainer) {
        bannerContainer.innerHTML = '';

        if (details && details.shippingState === 'UNKNOWN' && !this.manualOverride.shipping.isOverridden) {
          bannerContainer.innerHTML = `
            <div class="eapc-banner-paused">
              <span>⚠</span>
              <span><strong>Calculation Paused:</strong> Please enter shipping cost above.</span>
            </div>
          `;
        } else if (calcResult && !calcResult.isValid) {
          bannerContainer.innerHTML = `
            <div class="eapc-banner-error">
              <span>✕</span>
              <span>${calcResult.error || 'Calculation error'}</span>
            </div>
          `;
        } else if (calcResult && calcResult.flags && calcResult.flags.warningMessage) {
          bannerContainer.innerHTML = `
            <div class="eapc-banner-paused">
              <span>⚠</span>
              <span>${calcResult.flags.warningMessage}</span>
            </div>
          `;
        }
      }

      // Render Calculation Cards & Summary
      const elPriceWithShip = root.getElementById('eapc-price-with-ship');
      const elPriceNoShip = root.getElementById('eapc-price-without-ship');
      const elPriceWithShipZero = root.getElementById('eapc-price-with-ship-zero');
      const elPriceNoShipZero = root.getElementById('eapc-price-without-ship-zero');
      const elTargetProfit = root.getElementById('eapc-target-profit');
      const elEstProfit = root.getElementById('eapc-estimated-profit');
      const elMargin = root.getElementById('eapc-profit-margin');
      const elRoi = root.getElementById('eapc-roi');
      const pillText = root.getElementById('eapc-pill-text');

      const isPaused = (details && details.shippingState === 'UNKNOWN' && !this.manualOverride.shipping.isOverridden);

      if (isPaused || !calcResult || !calcResult.isValid) {
        if (elPriceWithShip) elPriceWithShip.textContent = '--';
        if (elPriceNoShip) elPriceNoShip.textContent = '--';
        if (elPriceWithShipZero) elPriceWithShipZero.textContent = '--';
        if (elPriceNoShipZero) elPriceNoShipZero.textContent = '--';
        if (elEstProfit) elEstProfit.textContent = '--';
        if (elMargin) elMargin.textContent = 'N/A';
        if (elRoi) elRoi.textContent = 'N/A';
        if (pillText) pillText.textContent = 'Amazon: Paused | Enter Shipping';
      } else {
        if (elPriceWithShip) elPriceWithShip.textContent = calcResult.formatted.sellingPriceWithShipping;
        if (elPriceNoShip) elPriceNoShip.textContent = calcResult.formatted.sellingPriceWithoutShipping;
        if (elPriceWithShipZero && this.currentCalcResultZero) {
          elPriceWithShipZero.textContent = this.currentCalcResultZero.formatted.sellingPriceWithShipping;
        }
        if (elPriceNoShipZero && this.currentCalcResultZero) {
          elPriceNoShipZero.textContent = this.currentCalcResultZero.formatted.sellingPriceWithoutShipping;
        }
        if (elTargetProfit && settings) elTargetProfit.textContent = `$${(settings.targetProfitAmount || 12).toFixed(2)}`;
        if (elEstProfit) elEstProfit.textContent = calcResult.formatted.estimatedProfit;
        if (elMargin) elMargin.textContent = calcResult.formatted.profitMargin;
        if (elRoi) elRoi.textContent = calcResult.formatted.roi;
        if (pillText) {
          const zeroShipText = this.currentCalcResultZero ? this.currentCalcResultZero.formatted.sellingPriceWithShipping : '--';
          pillText.textContent = `0%: ${zeroShipText} | Tax: ${calcResult.formatted.sellingPriceWithShipping} | Profit: ${calcResult.formatted.estimatedProfit}`;
        }
      }
    }

    /**
     * Resets manual overrides when a new Item ID is detected.
     */
    resetOverridesForNewItem() {
      this.manualOverride.price.isOverridden = false;
      this.manualOverride.price.value = null;
      this.manualOverride.shipping.isOverridden = false;
      this.manualOverride.shipping.value = null;
      this.updateOverrideBadges();
    }

    /**
     * Reliable clipboard write with primary API and fallback, with honest feedback.
     */
    async copyToClipboard(text) {
      if (!text || text === '--') return;

      let success = false;

      // 1. Primary write via navigator.clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          success = true;
        } catch (e) {
          success = false;
        }
      }

      // 2. Fallback execution via temporary textarea inside Shadow DOM
      if (!success && typeof document !== 'undefined') {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          textarea.style.top = '-9999px';
          this.shadowRoot.appendChild(textarea);
          textarea.focus();
          textarea.select();
          success = document.execCommand('copy');
          this.shadowRoot.removeChild(textarea);
        } catch (err) {
          success = false;
        }
      }

      // 3. Display affirmative toast
      if (success) {
        this.showToast(`✓ Copied $${text} to clipboard!`, 'success');
      } else {
        this.showToast('✕ Copy failed — please select manually', 'error');
      }
    }

    /**
     * Displays a toast notification inside the shadow root.
     */
    showToast(message, type = 'success') {
      const toast = this.shadowRoot.getElementById('eapc-toast');
      if (!toast) return;

      clearTimeout(this.toastTimer);
      toast.textContent = message;
      toast.className = `eapc-toast eapc-toast-${type} eapc-toast-show`;

      this.toastTimer = setTimeout(() => {
        toast.classList.remove('eapc-toast-show');
      }, type === 'error' ? 2500 : 1500);
    }

    /**
     * Inline stylesheet string embedded directly for self-contained encapsulation.
     */
    getInlineStyles() {
      return `
        :host {
          all: initial;
          display: block;
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #F8FAFC;
          line-height: 1.4;
          -webkit-font-smoothing: antialiased;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .eapc-wrapper {
          --eapc-bg-primary: #0F172A;
          --eapc-bg-surface: #1E293B;
          --eapc-bg-hover: #2D3748;
          --eapc-border: #334155;
          --eapc-border-focus: #3B82F6;
          --eapc-text-primary: #F8FAFC;
          --eapc-text-muted: #94A3B8;
          --eapc-text-faint: #64748B;
          --eapc-accent-profit: #10B981;
          --eapc-accent-blue: #3B82F6;
          --eapc-accent-amber: #F59E0B;
          --eapc-accent-rose: #EF4444;
          font-size: 13px;
        }
        .eapc-container {
          width: 320px;
          background: var(--eapc-bg-primary);
          border: 1px solid var(--eapc-border);
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
          overflow: hidden;
          user-select: none;
        }
        .eapc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: var(--eapc-bg-surface);
          border-bottom: 1px solid var(--eapc-border);
          cursor: grab;
        }
        .eapc-header-left { display: flex; align-items: center; gap: 8px; }
        .eapc-drag-handle { color: var(--eapc-text-faint); font-size: 14px; }
        .eapc-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--eapc-text-muted); }
        .eapc-header-controls { display: flex; align-items: center; gap: 4px; }
        .eapc-btn-icon { background: transparent; border: none; color: var(--eapc-text-muted); width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 13px; }
        .eapc-btn-icon:hover { background: var(--eapc-bg-hover); color: var(--eapc-text-primary); }
        .eapc-section { padding: 12px; border-bottom: 1px solid var(--eapc-border); }
        .eapc-product-title { font-size: 12px; color: var(--eapc-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 10px; }
        .eapc-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px; }
        .eapc-row:last-child { margin-bottom: 0; }
        .eapc-label { font-size: 12px; color: var(--eapc-text-muted); }
        .eapc-input-group { display: flex; align-items: center; gap: 6px; }
        .eapc-input-wrapper { position: relative; display: flex; align-items: center; }
        .eapc-currency-prefix { position: absolute; left: 8px; font-size: 12px; color: var(--eapc-text-faint); pointer-events: none; }
        .eapc-input { width: 84px; padding: 4px 6px 4px 18px; background: var(--eapc-bg-surface); border: 1px solid var(--eapc-border); border-radius: 6px; color: var(--eapc-text-primary); font-family: monospace; font-size: 12px; font-weight: 600; outline: none; }
        .eapc-input:focus { border-color: var(--eapc-border-focus); }
        .eapc-input.eapc-input-amber { border-color: var(--eapc-accent-amber); }
        .eapc-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2px 5px; border-radius: 9999px; }
        .eapc-badge-auto { background: rgba(148,163,184,0.15); color: var(--eapc-text-muted); }
        .eapc-badge-manual { background: rgba(245,158,11,0.2); color: var(--eapc-accent-amber); }
        .eapc-badge-free { background: rgba(16,185,129,0.2); color: var(--eapc-accent-profit); }
        .eapc-badge-unknown { background: rgba(245,158,11,0.2); color: var(--eapc-accent-amber); }
        .eapc-btn-redetect { background: transparent; border: none; color: var(--eapc-accent-amber); cursor: pointer; font-size: 12px; }
        .eapc-total-cost-val { font-family: monospace; font-size: 13px; font-weight: 700; }
        .eapc-settings-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: rgba(30,41,59,0.5); border-bottom: 1px solid var(--eapc-border); font-size: 10px; color: var(--eapc-text-muted); cursor: pointer; }
        .eapc-banner-paused { background: rgba(245,158,11,0.15); border-bottom: 1px solid rgba(245,158,11,0.3); padding: 8px 12px; font-size: 11px; color: var(--eapc-accent-amber); display: flex; align-items: center; gap: 6px; }
        .eapc-banner-error { background: rgba(239,68,68,0.15); border-bottom: 1px solid rgba(239,68,68,0.3); padding: 8px 12px; font-size: 11px; color: var(--eapc-accent-rose); display: flex; align-items: center; gap: 6px; }
        .eapc-tax-card-group { margin-bottom: 0; }
        .eapc-tax-group-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .eapc-tax-pill { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 7px; border-radius: 4px; }
        .eapc-tax-pill-zero { color: #38bdf8; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); }
        .eapc-tax-pill-setting { color: #a78bfa; background: rgba(167,139,250,0.15); border: 1px solid rgba(167,139,250,0.3); }
        .eapc-price-card { background: var(--eapc-bg-surface); border-radius: 8px; padding: 8px 10px; display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--eapc-border); }
        .eapc-price-card-primary { border-color: rgba(16,185,129,0.4); }
        .eapc-price-card-secondary { border-color: rgba(59,130,246,0.4); }
        .eapc-card-info { display: flex; flex-direction: column; }
        .eapc-card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--eapc-text-muted); margin-bottom: 2px; }
        .eapc-card-sublabel { font-size: 9px; color: var(--eapc-text-faint); }
        .eapc-card-price { font-family: monospace; font-size: 20px; font-weight: 700; }
        .eapc-text-profit { color: var(--eapc-accent-profit); }
        .eapc-text-blue { color: var(--eapc-accent-blue); }
        .eapc-btn-copy-card { background: rgba(255,255,255,0.08); border: 1px solid var(--eapc-border); color: #fff; font-size: 10px; font-weight: 700; padding: 6px 10px; border-radius: 6px; cursor: pointer; }
        .eapc-summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: rgba(30,41,59,0.4); padding: 8px 10px; border-radius: 8px; border: 1px solid var(--eapc-border); }
        .eapc-summary-item { display: flex; flex-direction: column; }
        .eapc-summary-label { font-size: 10px; color: var(--eapc-text-muted); }
        .eapc-summary-val { font-family: monospace; font-size: 12px; font-weight: 700; }
        .eapc-actions { display: flex; gap: 8px; padding: 10px 12px; }
        .eapc-btn-action { flex: 1; padding: 8px; font-size: 11px; font-weight: 700; border-radius: 6px; border: none; cursor: pointer; }
        .eapc-btn-primary { background: var(--eapc-accent-profit); color: #042f2e; }
        .eapc-btn-secondary { background: var(--eapc-bg-surface); border: 1px solid var(--eapc-border); color: #fff; }
        .eapc-toast { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%) translateY(20px); padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 600; opacity: 0; pointer-events: none; transition: all 0.2s ease; z-index: 10; white-space: nowrap; }
        .eapc-toast-show { opacity: 1; transform: translateX(-50%) translateY(0); }
        .eapc-toast-success { background: var(--eapc-accent-profit); color: #042f2e; }
        .eapc-toast-error { background: var(--eapc-accent-rose); color: #fff; }
        .eapc-pill { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--eapc-bg-primary); border: 1px solid var(--eapc-border); border-radius: 9999px; cursor: pointer; user-select: none; }
        .eapc-pill-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--eapc-accent-profit); }
        .eapc-pill-text { font-family: monospace; font-size: 11px; font-weight: 700; }
        .eapc-pill-expand { font-size: 9px; font-weight: 700; color: var(--eapc-text-muted); text-transform: uppercase; }
      `;
    }
  }

  return ProfitCalculatorUI;
});
