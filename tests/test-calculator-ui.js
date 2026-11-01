/**
 * Unit Test Suite for Calculator UI & Shadow DOM Component (Phase 4)
 * 
 * Verifies:
 * - TASK-4.1: Shadow DOM Host & Style Injection
 * - TASK-4.2: Floating Calculator Markup & Layout
 * - TASK-4.4: Minimized Pill State & Toggle
 * - TASK-4.5: Dual Independent Manual Overrides & Re-Detect
 * - TASK-4.6: Robust Clipboard Copy & Error Feedback
 * - Singleton Guard (Prevention of Duplicate Calculator Instances)
 */

const assert = require('assert');
const CalculatorEngine = require('../utils/calculator-engine.js');
const EbayParser = require('../utils/ebay-parser.js');
const ProfitCalculatorUI = require('../calculator.js');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n--- Running Calculator UI Unit Tests ---\n');

// Mock DOM Environment for Testing
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
    this.title = '';
    this.placeholder = '';
    this.value = '';
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

  attachShadow(opts) {
    this.shadowRoot = new MockShadowRoot();
    return this.shadowRoot;
  }

  addEventListener(ev, cb) {
    if (!this._listeners[ev]) this._listeners[ev] = [];
    this._listeners[ev].push(cb);
  }

  dispatchEvent(ev) {
    const handlers = this._listeners[ev.type] || [];
    for (const h of handlers) h(ev);
  }

  getBoundingClientRect() {
    return { left: 100, top: 100, width: 320, height: 400 };
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
    // Simple id extraction to populate getElementById
    const matches = html.matchAll(/id="([^"]+)"/g);
    for (const m of matches) {
      const el = new MockElement('div');
      el.id = m[1];
      this._elementsById.set(m[1], el);
    }
  }

  get innerHTML() {
    return this._html;
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
  }

  createElement(tag) {
    return new MockElement(tag);
  }

  getElementById(id) {
    return this.body.children.find(c => c.id === id) || null;
  }
}

// 1. Singleton Mounting & ShadowRoot Creation
runTest('TASK-4.1: Shadow DOM Host Singleton Mounting', () => {
  const doc = new MockDocument();
  const ui1 = new ProfitCalculatorUI();
  const mounted1 = ui1.mount(doc);

  assert.ok(mounted1);
  assert.ok(ui1.shadowRoot);
  assert.strictEqual(doc.body.children.length, 1);
  assert.strictEqual(doc.body.children[0].id, 'ebay-amazon-profit-calc-host');

  // Second mount returns existing instance without creating another host element
  const ui2 = new ProfitCalculatorUI();
  const mounted2 = ui2.mount(doc);
  assert.strictEqual(mounted1, mounted2);
  assert.strictEqual(doc.body.children.length, 1);
});

// 2. Markup Hierarchy Verification
runTest('TASK-4.2: Floating Calculator Markup & Layout Verification', () => {
  const doc = new MockDocument();
  const ui = new ProfitCalculatorUI();
  ui.mount(doc);

  const root = ui.shadowRoot;
  assert.ok(root.getElementById('eapc-expanded'));
  assert.ok(root.getElementById('eapc-drag-header'));
  assert.ok(root.getElementById('eapc-item-title'));
  assert.ok(root.getElementById('eapc-input-price'));
  assert.ok(root.getElementById('eapc-input-shipping'));
  assert.ok(root.getElementById('eapc-total-cost'));
  assert.ok(root.getElementById('eapc-settings-bar'));
  assert.ok(root.getElementById('eapc-price-with-ship'));
  assert.ok(root.getElementById('eapc-price-without-ship'));
  assert.ok(root.getElementById('eapc-target-profit'));
  assert.ok(root.getElementById('eapc-estimated-profit'));
  assert.ok(root.getElementById('eapc-profit-margin'));
  assert.ok(root.getElementById('eapc-roi'));
  assert.ok(root.getElementById('eapc-action-copy-main'));
  assert.ok(root.getElementById('eapc-action-copy-alt'));
  assert.ok(root.getElementById('eapc-pill'));
  assert.ok(root.getElementById('eapc-toast'));
});

// 3. UI Update with Extracted Data and Calculations
runTest('TASK-4.2 & Phase 2 Integration: UI Calculation Rendering', () => {
  const doc = new MockDocument();
  const ui = new ProfitCalculatorUI();
  ui.mount(doc);

  const details = {
    title: 'Sony WH-1000XM4 Headphones',
    price: 45.0,
    shippingState: 'KNOWN',
    shippingCost: 5.0
  };

  const settings = {
    amazonCommissionRate: 15.0,
    sellTaxRate: 9.0,
    targetProfitAmount: 12.0,
    shippingDeduction: 9.98
  };

  const calcResult = CalculatorEngine.calculate({
    productCost: 50.0,
    commissionRate: 15.0,
    taxRate: 9.0,
    targetProfit: 12.0,
    shippingDeduction: 9.98
  });

  ui.update(details, settings, calcResult);

  const root = ui.shadowRoot;
  assert.strictEqual(root.getElementById('eapc-item-title').textContent, 'Sony WH-1000XM4 Headphones');
  assert.strictEqual(root.getElementById('eapc-total-cost').textContent, '$50.00');
  // Settings Tax (9%):
  assert.strictEqual(root.getElementById('eapc-price-with-ship').textContent, '$81.58');
  assert.strictEqual(root.getElementById('eapc-price-without-ship').textContent, '$71.60');

  // 0% Tax (Exempt / Resale):
  // (50 + 12) / 0.85 = 72.94, without ship = 72.94 - 9.98 = 62.96
  assert.strictEqual(root.getElementById('eapc-price-with-ship-zero').textContent, '$72.94');
  assert.strictEqual(root.getElementById('eapc-price-without-ship-zero').textContent, '$62.96');
  assert.strictEqual(root.getElementById('eapc-estimated-profit').textContent, '$12.00');
  assert.strictEqual(root.getElementById('eapc-profit-margin').textContent, '14.7%');
  assert.strictEqual(root.getElementById('eapc-roi').textContent, '24.0%');
});

// 4. Paused State Rendering when Shipping is UNKNOWN
runTest('TASK-4.2: Paused UI State when Shipping is UNKNOWN', () => {
  const doc = new MockDocument();
  const ui = new ProfitCalculatorUI();
  ui.mount(doc);

  const details = {
    title: 'Vintage Leather Jacket',
    price: 60.0,
    shippingState: 'UNKNOWN',
    shippingCost: null
  };

  const settings = {
    amazonCommissionRate: 15.0,
    sellTaxRate: 9.0,
    targetProfitAmount: 12.0,
    shippingDeduction: 9.98
  };

  ui.update(details, settings, null);

  const root = ui.shadowRoot;
  assert(root.getElementById('eapc-total-cost').textContent.includes('N/A'));
  assert.strictEqual(root.getElementById('eapc-price-with-ship').textContent, '--');
  assert.strictEqual(root.getElementById('eapc-price-without-ship').textContent, '--');
  assert(root.getElementById('eapc-banner-container').innerHTML.includes('Calculation Paused'));
});

// 5. Minimized Pill State Toggle
runTest('TASK-4.4: Minimized Pill State & Toggle', () => {
  const doc = new MockDocument();
  const ui = new ProfitCalculatorUI();
  ui.mount(doc);

  const expanded = ui.shadowRoot.getElementById('eapc-expanded');
  const pill = ui.shadowRoot.getElementById('eapc-pill');

  // Minimize
  ui.toggleMinimize(true);
  assert.strictEqual(ui.isMinimized, true);
  assert.strictEqual(expanded.style.display, 'none');
  assert.strictEqual(pill.style.display, 'flex');

  // Expand
  ui.toggleMinimize(false);
  assert.strictEqual(ui.isMinimized, false);
  assert.strictEqual(expanded.style.display, 'block');
  assert.strictEqual(pill.style.display, 'none');
});

// 6. Dual Independent Manual Override Badges and Resets
runTest('TASK-4.5: Dual Independent Manual Overrides & Re-Detect Badges', () => {
  const doc = new MockDocument();
  const ui = new ProfitCalculatorUI();
  ui.mount(doc);

  // Initial state: AUTO
  assert.strictEqual(ui.manualOverride.price.isOverridden, false);
  assert.strictEqual(ui.manualOverride.shipping.isOverridden, false);

  // Manually override shipping only
  ui.manualOverride.shipping.isOverridden = true;
  ui.manualOverride.shipping.value = 8.50;
  ui.updateOverrideBadges();

  const root = ui.shadowRoot;
  assert.strictEqual(root.getElementById('eapc-shipping-badge').textContent, 'MANUAL');
  assert.strictEqual(root.getElementById('eapc-price-badge').textContent, 'AUTO');

  // Reset overrides for new item
  ui.resetOverridesForNewItem();
  assert.strictEqual(ui.manualOverride.price.isOverridden, false);
  assert.strictEqual(ui.manualOverride.shipping.isOverridden, false);
  assert.strictEqual(root.getElementById('eapc-shipping-badge').textContent, 'AUTO');
});

// 7. Toast Notification Feedback
runTest('TASK-4.6: Toast Notification Feedback Rendering', () => {
  const doc = new MockDocument();
  const ui = new ProfitCalculatorUI();
  ui.mount(doc);

  const toast = ui.shadowRoot.getElementById('eapc-toast');
  ui.showToast('✓ Copied $81.58 to clipboard!', 'success');
  assert.strictEqual(toast.textContent, '✓ Copied $81.58 to clipboard!');
  assert(toast.className.includes('eapc-toast-success'));
  assert(toast.className.includes('eapc-toast-show'));

  ui.showToast('✕ Copy failed — please select manually', 'error');
  assert.strictEqual(toast.textContent, '✕ Copy failed — please select manually');
  assert(toast.className.includes('eapc-toast-error'));
});

// 8. Dual Tax Options Direct Copy Testing
runTest('Dual Tax Options: Direct copy for 0% Tax and Settings Tax with & without shipping', async () => {
  const doc = new MockDocument();
  const ui = new ProfitCalculatorUI();
  ui.mount(doc);

  let copiedText = '';
  ui.copyToClipboard = async (text) => {
    copiedText = text;
  };

  const details = {
    title: 'Dual Tax Test Item',
    price: 45.0,
    shippingState: 'KNOWN',
    shippingCost: 5.0
  };
  const settings = {
    amazonCommissionRate: 15.0,
    sellTaxRate: 9.0,
    targetProfitAmount: 12.0,
    shippingDeduction: 9.98
  };
  const calcResult = CalculatorEngine.calculate({
    productCost: 50.0,
    commissionRate: 15.0,
    taxRate: 9.0,
    targetProfit: 12.0,
    shippingDeduction: 9.98
  });

  ui.update(details, settings, calcResult);
  const root = ui.shadowRoot;

  // 1. Copy Settings Tax With Shipping
  root.getElementById('eapc-btn-copy-with-ship').dispatchEvent({ type: 'click' });
  assert.strictEqual(copiedText, '81.58');

  // 2. Copy Settings Tax Without Shipping
  root.getElementById('eapc-btn-copy-without-ship').dispatchEvent({ type: 'click' });
  assert.strictEqual(copiedText, '71.60');

  // 3. Copy 0% Tax With Shipping
  root.getElementById('eapc-btn-copy-with-ship-zero').dispatchEvent({ type: 'click' });
  assert.strictEqual(copiedText, '72.94');

  // 4. Copy 0% Tax Without Shipping
  root.getElementById('eapc-btn-copy-without-ship-zero').dispatchEvent({ type: 'click' });
  assert.strictEqual(copiedText, '62.96');
});

console.log(`\nUI Test Run Complete: ${passedTests}/${totalTests} Passed.\n`);
