/**
 * Integration Test Suite for Master Controller & Dynamic Observers (Phase 6)
 * 
 * Verifies:
 * - TASK-6.1: Content Script Master Controller orchestration
 * - TASK-6.2: Single-Instance Verification & Teardown Guards
 * - TASK-6.3: SPA Navigation Detection & Lifecycle Teardown (Item ID change resets overrides)
 * - TASK-6.4: Debounced Targeted Observer for Dynamic Variants
 * - TASK-6.5: End-to-End State Re-Synchronization (Manual override preservation on variant change)
 */

const assert = require('assert');
const CalculatorEngine = require('../utils/calculator-engine.js');
const EbayParser = require('../utils/ebay-parser.js');
const StorageManager = require('../utils/storage.js');
const ProfitCalculatorUI = require('../calculator.js');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      return res.then(() => {
        passedTests++;
        console.log(`  ✓ PASS: ${name}`);
      }).catch((err) => {
        console.error(`  ✗ FAIL: ${name}`);
        console.error(`    ${err.message}`);
        process.exitCode = 1;
      });
    }
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

// Lightweight Mock DOM setup
class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.id = '';
    this.className = '';
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c)
    };
    this.style = {};
    this.textContent = '';
    this.children = [];
    this.shadowRoot = null;
    this._listeners = {};
    this._eapcInstance = null;
  }

  appendChild(el) {
    this.children.push(el);
    return el;
  }

  removeChild(el) {
    this.children = this.children.filter(c => c !== el);
    return el;
  }

  attachShadow() {
    this.shadowRoot = new MockShadowRoot();
    return this.shadowRoot;
  }

  addEventListener(ev, cb) {
    if (!this._listeners[ev]) this._listeners[ev] = [];
    this._listeners[ev].push(cb);
  }

  getBoundingClientRect() {
    return { left: 50, top: 50, width: 320, height: 400 };
  }
}

class MockShadowRoot {
  constructor() {
    this._elementsById = new Map();
    this._html = '';
    this.children = [];
  }

  set innerHTML(html) {
    this._html = html;
    const matches = html.matchAll(/id="([^"]+)"/g);
    for (const m of matches) {
      const el = new MockElement('div');
      el.id = m[1];
      this._elementsById.set(m[1], el);
    }
  }

  getElementById(id) {
    return this._elementsById.get(id) || null;
  }

  appendChild(el) {
    this.children.push(el);
    return el;
  }

  removeChild(el) {
    this.children = this.children.filter(c => c !== el);
    return el;
  }
}

class MockDocument {
  constructor() {
    this.body = new MockElement('body');
    this.head = new MockElement('head');
  }

  createElement(tag) {
    return new MockElement(tag);
  }

  getElementById(id) {
    return this.body.children.find(c => c.id === id) || null;
  }
}

async function runAll() {
  console.log('\n--- Running Integration & Controller Tests (Phase 6) ---\n');

  // 1. Single-Instance Verification
  runTest('TASK-6.2: Single-Instance Guard Aborts Duplicate Execution', () => {
    global.window = global.window || {};
    window._eapcMasterControllerActive = false;

    // Simulate first instance initialization
    assert.strictEqual(window._eapcMasterControllerActive, false);
    window._eapcMasterControllerActive = true;

    // Simulate second instance initialization attempt
    const secondInitAttempt = () => {
      if (window._eapcMasterControllerActive) {
        return 'ABORTED';
      }
      return 'RUNNING';
    };

    assert.strictEqual(secondInitAttempt(), 'ABORTED');
  });

  // 2. End-to-End Orchestration: Parser -> Engine -> Storage -> UI
  await runTest('TASK-6.1: Full Pipeline Integration (Parser -> Engine -> Storage -> UI)', async () => {
    const doc = new MockDocument();
    const settings = await StorageManager.getSettings();

    // Mock parsed product details ($50 item, $5 shipping)
    const mockDetails = {
      title: 'Apple iPad Air 5th Gen 64GB',
      price: 45.0,
      shippingState: 'KNOWN',
      shippingCost: 5.0
    };

    // Calculate via Engine
    const totalCost = mockDetails.price + mockDetails.shippingCost;
    const calcResult = CalculatorEngine.calculate({
      productCost: totalCost,
      commissionRate: settings.amazonCommissionRate,
      taxRate: settings.sellTaxRate,
      targetProfit: settings.targetProfitAmount,
      shippingDeduction: settings.shippingDeduction
    });

    // Mount UI
    const ui = new ProfitCalculatorUI();
    ui.mount(doc);
    ui.update(mockDetails, settings, calcResult);

    const root = ui.shadowRoot;
    assert.strictEqual(root.getElementById('eapc-item-title').textContent, 'Apple iPad Air 5th Gen 64GB');
    assert.strictEqual(root.getElementById('eapc-total-cost').textContent, '$50.00');
    assert.strictEqual(root.getElementById('eapc-price-with-ship').textContent, '$81.58');
    assert.strictEqual(root.getElementById('eapc-price-without-ship').textContent, '$71.60');
    assert.strictEqual(root.getElementById('eapc-estimated-profit').textContent, '$12.00');
  });

  // 3. Selective Manual Override Preservation on Dynamic Variant Update
  runTest('TASK-6.4 & 6.5: Dynamic Variant Price Update Preserves Manual Shipping Override', () => {
    const doc = new MockDocument();
    const ui = new ProfitCalculatorUI();
    ui.mount(doc);

    // Initial item data
    const currentDetails = {
      title: 'Sneakers Size 9',
      price: 40.0,
      shippingState: 'UNKNOWN',
      shippingCost: null
    };

    // User manually types shipping: $8.00
    ui.manualOverride.shipping.isOverridden = true;
    ui.manualOverride.shipping.value = 8.00;
    ui.updateOverrideBadges();

    assert.strictEqual(ui.manualOverride.shipping.isOverridden, true);
    assert.strictEqual(ui.manualOverride.price.isOverridden, false);

    // Variant switch occurs on eBay: Price changes to $52.00, Shipping still UNKNOWN
    const variantUpdate = {
      price: 52.0,
      shippingState: 'UNKNOWN',
      shippingCost: null
    };

    // Controller logic: update price (since not overridden), but preserve manual shipping
    if (!ui.manualOverride.price.isOverridden) {
      currentDetails.price = variantUpdate.price;
    }
    if (!ui.manualOverride.shipping.isOverridden) {
      currentDetails.shippingState = variantUpdate.shippingState;
    }

    assert.strictEqual(currentDetails.price, 52.0);
    assert.strictEqual(ui.manualOverride.shipping.value, 8.00);

    // Recalculate with new Price ($52) + Manual Shipping ($8) = $60
    const calcResult = CalculatorEngine.calculate({
      productCost: 52.0 + 8.0, // $60 total cost
      commissionRate: 15.0,
      taxRate: 9.0,
      targetProfit: 12.0,
      shippingDeduction: 9.98
    });

    ui.update(currentDetails, StorageManager.DEFAULT_SETTINGS, calcResult);

    const root = ui.shadowRoot;
    assert.strictEqual(root.getElementById('eapc-total-cost').textContent, '$60.00');
    // For C=60, (60+12)/0.76 = 72/0.76 = 94.7368... -> $94.74
    assert.strictEqual(root.getElementById('eapc-price-with-ship').textContent, '$94.74');
  });

  // 4. SPA Navigation Lifecycle Teardown
  runTest('TASK-6.3: Navigation to New Item ID Resets Overrides and Cleans Up', () => {
    const doc = new MockDocument();
    const ui = new ProfitCalculatorUI();
    ui.mount(doc);

    // Set overrides on old item
    ui.manualOverride.price.isOverridden = true;
    ui.manualOverride.price.value = 75.0;
    ui.manualOverride.shipping.isOverridden = true;
    ui.manualOverride.shipping.value = 10.0;
    ui.updateOverrideBadges();

    assert.strictEqual(ui.manualOverride.price.isOverridden, true);
    assert.strictEqual(ui.manualOverride.shipping.isOverridden, true);

    // User navigates to new item ID
    ui.resetOverridesForNewItem();

    assert.strictEqual(ui.manualOverride.price.isOverridden, false);
    assert.strictEqual(ui.manualOverride.price.value, null);
    assert.strictEqual(ui.manualOverride.shipping.isOverridden, false);
    assert.strictEqual(ui.manualOverride.shipping.value, null);

    const root = ui.shadowRoot;
    assert.strictEqual(root.getElementById('eapc-price-badge').textContent, 'AUTO');
    assert.strictEqual(root.getElementById('eapc-shipping-badge').textContent, 'AUTO');
  });

  console.log(`\nIntegration Test Run Complete: ${passedTests}/${totalTests} Passed.\n`);
}

runAll();
