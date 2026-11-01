/**
 * Test Suite for Search & Catalog Grid Calculator (SearchGridProcessor)
 * 
 * Verifies:
 * - Single item calculation and Shadow DOM injection ($205.00 -> $285.53 / $275.55)
 * - Range item calculation and Shadow DOM injection ($80.97 to $134.95 -> $122.33 – $193.36)
 * - Exact calculations matching all 4 boots from the user screenshot
 * - Dummy card / placeholder skipping ("Shop on eBay", href="#")
 * - Idempotency and duplicate prevention
 * - Reactive settings synchronization across all cards
 * - Clipboard copy actions and click event propagation stoppage
 * - Floating status pill lifecycle and teardown
 */

const assert = require('assert');
const CalculatorEngine = require('../utils/calculator-engine.js');
const EbayParser = require('../utils/ebay-parser.js');
const StorageManager = require('../utils/storage.js');
const SearchGridProcessor = require('../search-calculator.js');

let totalTests = 0;
let passedTests = 0;
const testPromises = [];

function runTest(name, fn) {
  totalTests++;
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      const p = res.then(() => {
        passedTests++;
        console.log(`  ✓ PASS: ${name}`);
      }).catch((err) => {
        console.error(`  ✗ FAIL: ${name}`);
        console.error(`    ${err.message}`);
        process.exitCode = 1;
      });
      testPromises.push(p);
      return p;
    }
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

// Lightweight Mock DOM environment
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
    this.dataset = {};
    this.style = {};
    this.textContent = '';
    this.children = [];
    this.parentNode = null;
    this.shadowRoot = null;
    this._listeners = {};
    this._attributes = {};
    this.href = '';
  }

  setAttribute(name, val) {
    this._attributes[name] = val;
    if (name === 'href') this.href = val;
    if (name === 'id') this.id = val;
    if (name === 'class') this.className = val;
  }

  getAttribute(name) {
    if (name === 'href') return this.href || this._attributes[name] || null;
    if (name === 'id') return this.id || this._attributes[name] || null;
    if (name === 'class') return this.className || this._attributes[name] || null;
    return this._attributes[name] !== undefined ? this._attributes[name] : null;
  }

  appendChild(el) {
    this.children.push(el);
    el.parentNode = this;
    return el;
  }

  removeChild(el) {
    const idx = this.children.indexOf(el);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      el.parentNode = null;
    }
    return el;
  }

  attachShadow() {
    this.shadowRoot = new MockShadowRoot(this);
    return this.shadowRoot;
  }

  addEventListener(ev, cb) {
    if (!this._listeners[ev]) this._listeners[ev] = [];
    this._listeners[ev].push(cb);
  }

  dispatchEvent(event) {
    const handlers = this._listeners[event.type] || [];
    for (const h of handlers) {
      h(event);
    }
  }

  querySelector(sel) {
    return mockQuerySelector(this, sel);
  }

  querySelectorAll(sel) {
    return mockQuerySelectorAll(this, sel);
  }

  cloneNode(deep = true) {
    const clone = new MockElement(this.tagName);
    clone.id = this.id;
    clone.className = this.className;
    clone.textContent = this.textContent;
    clone.href = this.href;
    clone.dataset = Object.assign({}, this.dataset);
    clone._attributes = Object.assign({}, this._attributes);
    if (deep) {
      for (const child of this.children) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }
}

class MockShadowRoot {
  constructor(host) {
    this.host = host;
    this.children = [];
    this._html = '';
  }

  set innerHTML(html) {
    this._html = html;
    this.children = parseHtmlToMockElements(html);
  }

  get innerHTML() {
    return this._html;
  }

  querySelector(sel) {
    return mockQuerySelector(this, sel);
  }

  querySelectorAll(sel) {
    return mockQuerySelectorAll(this, sel);
  }

  getElementById(id) {
    return this.querySelector(`#${id}`);
  }
}

function parseHtmlToMockElements(html) {
  const root = new MockElement('shadow-root');
  const tagRegex = /<([a-zA-Z0-9-]+)([^>]*)>/gi;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const tagName = match[1];
    if (['style', 'script'].includes(tagName.toLowerCase())) continue;
    if (tagName.startsWith('/')) continue;
    const attrsStr = match[2] || '';

    const el = new MockElement(tagName);

    const idMatch = attrsStr.match(/id="([^"]+)"/);
    if (idMatch) el.id = idMatch[1];

    const classMatch = attrsStr.match(/class="([^"]+)"/);
    if (classMatch) el.className = classMatch[1];

    const copyMatch = attrsStr.match(/data-copy="([^"]+)"/);
    if (copyMatch) el.setAttribute('data-copy', copyMatch[1]);

    root.appendChild(el);
  }
  return root.children;
}

function matchesSelector(node, sel) {
  if (!node) return false;
  sel = sel.trim();

  // Attribute selector [attr] or [attr="val"] or [attr*="val"]
  if (sel.startsWith('[') && sel.endsWith(']')) {
    const inner = sel.slice(1, -1);
    if (inner.includes('*=')) {
      const [attr, val] = inner.split('*=').map(s => s.replace(/"/g, '').trim());
      const nodeVal = node.getAttribute(attr);
      return nodeVal && nodeVal.includes(val);
    }
    if (inner.includes('=')) {
      const [attr, val] = inner.split('=').map(s => s.replace(/"/g, '').trim());
      return node.getAttribute(attr) === val;
    }
    return !!node.getAttribute(inner);
  }

  // Tag + attribute selector, e.g. a[href*="/itm/"] or button[data-copy="285.53"]
  if (sel.includes('[') && sel.includes(']')) {
    const tag = sel.substring(0, sel.indexOf('['));
    if (tag && node.tagName && node.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    const inner = sel.substring(sel.indexOf('[') + 1, sel.indexOf(']'));
    if (inner.includes('*=')) {
      const [attr, val] = inner.split('*=').map(s => s.replace(/"/g, '').trim());
      const nodeVal = node.getAttribute(attr);
      return nodeVal && nodeVal.includes(val);
    }
    if (inner.includes('=')) {
      const [attr, val] = inner.split('=').map(s => s.replace(/"/g, '').trim());
      return node.getAttribute(attr) === val;
    }
    return !!node.getAttribute(inner);
  }

  // Compound tag.class, e.g. a.s-item__link
  if (sel.includes('.')) {
    const parts = sel.split('.');
    const tag = parts[0];
    const cls = parts[1];
    if (tag && node.tagName && node.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    const classes = (node.className || '').split(/\s+/);
    return classes.includes(cls);
  }

  // #id
  if (sel.startsWith('#')) {
    return node.id === sel.slice(1);
  }

  // tag
  if (node.tagName && node.tagName.toLowerCase() === sel.toLowerCase()) {
    return true;
  }

  return false;
}

function mockQuerySelector(root, sel) {
  const all = mockQuerySelectorAll(root, sel);
  return all.length > 0 ? all[0] : null;
}

function mockQuerySelectorAll(root, sel) {
  const results = [];
  const selectors = sel.split(',').map(s => s.trim());

  function search(node) {
    if (!node) return;
    const children = node.children || [];
    for (const c of children) {
      for (const s of selectors) {
        if (matchesSelector(c, s)) {
          results.push(c);
          break;
        }
      }
      search(c);
    }
  }

  search(root);
  return results;
}

function createMockSearchCard({ title, price, shipping, url }) {
  const card = new MockElement('li');
  card.className = 's-item';

  const wrapper = new MockElement('div');
  wrapper.className = 's-item__wrapper';
  card.appendChild(wrapper);

  const info = new MockElement('div');
  info.className = 's-item__info';
  wrapper.appendChild(info);

  const link = new MockElement('a');
  link.className = 's-item__link';
  link.href = url;
  link.setAttribute('href', url);
  info.appendChild(link);

  const titleEl = new MockElement('div');
  titleEl.className = 's-item__title';
  titleEl.textContent = title;
  link.appendChild(titleEl);

  const details = new MockElement('div');
  details.className = 's-item__details';
  info.appendChild(details);

  const priceEl = new MockElement('span');
  priceEl.className = 's-item__price';
  priceEl.textContent = price;
  details.appendChild(priceEl);

  if (shipping) {
    const shipEl = new MockElement('span');
    shipEl.className = 's-item__shipping';
    shipEl.textContent = shipping;
    details.appendChild(shipEl);
  }

  return card;
}

// Global setup
const mockBody = new MockElement('body');
global.document = {
  body: mockBody,
  createElement: (tag) => new MockElement(tag),
  querySelector: (sel) => mockQuerySelector(mockBody, sel),
  querySelectorAll: (sel) => mockQuerySelectorAll(mockBody, sel)
};
mockBody.contains = (node) => {
  let curr = node;
  while (curr) {
    if (curr === mockBody) return true;
    curr = curr.parentNode;
  }
  return false;
};

global.window = {
  StorageManager,
  CalculatorEngine,
  EbayParser,
  SearchGridProcessor
};

console.log('\n--- Running Search Grid Calculator Unit Tests ---\n');

// 1. Single Price Boot #1: Georgia Boot Carbo-Tec ($205.00)
runTest('Boot 1 ($205.00): Amazon price calculation and Shadow DOM mounting', async () => {
  const card = createMockSearchCard({
    title: 'Georgia Boot Carbo-Tec LT Steel Toe Waterproof Pull On Work Boot GB00267',
    price: '$205.00',
    shipping: 'Free delivery in 2-4 days',
    url: 'https://www.ebay.com/itm/112233445501'
  });
  mockBody.appendChild(card);

  const processor = new SearchGridProcessor();
  processor.currentSettings = {
    amazonCommissionRate: 15.0,
    sellTaxRate: 9.0,
    targetProfitAmount: 12.00,
    shippingDeduction: 9.98
  };

  const processed = processor.processCard(card);
  assert.strictEqual(processed, true);

  const host = card.querySelector('.eapc-search-card-host');
  assert.ok(host, 'Shadow host element was not mounted');
  assert.ok(host.shadowRoot, 'ShadowRoot was not attached');

  const cardHtml = host.shadowRoot.innerHTML;
  assert.ok(cardHtml.includes('$285.53'), `Expected $285.53 with shipping, got: ${cardHtml}`);
  assert.ok(cardHtml.includes('$275.55'), `Expected $275.55 without shipping, got: ${cardHtml}`);
  assert.ok(cardHtml.includes('$12.00'), `Expected $12.00 target/est profit, got: ${cardHtml}`);
  assert.strictEqual(card.dataset.eapcProcessed, 'true');

  processor.teardown();
  mockBody.removeChild(card);
});

// 2. Price Range Boot #2: Caterpillar Men Invader ($80.97 to $134.95)
runTest('Boot 2 ($80.97 to $134.95): Range price calculation and markup', () => {
  const card = createMockSearchCard({
    title: 'Caterpillar Men Invader Mid Vent Composite Toe Work Boot Shoes',
    price: '$80.97 to $134.95',
    shipping: 'Free delivery',
    url: 'https://www.ebay.com/itm/112233445502'
  });
  mockBody.appendChild(card);

  const processor = new SearchGridProcessor();
  processor.currentSettings = {
    amazonCommissionRate: 15.0,
    sellTaxRate: 9.0,
    targetProfitAmount: 12.00,
    shippingDeduction: 9.98
  };

  const processed = processor.processCard(card);
  assert.strictEqual(processed, true);

  const host = card.querySelector('.eapc-search-card-host');
  const cardHtml = host.shadowRoot.innerHTML;
  assert.ok(cardHtml.includes('$122.33 – $193.36'), `Expected range $122.33 – $193.36 with ship, got: ${cardHtml}`);
  assert.ok(cardHtml.includes('$112.35 – $183.38'), `Expected range $112.35 – $183.38 without ship, got: ${cardHtml}`);

  processor.teardown();
  mockBody.removeChild(card);
});

// 3. Price Range Boot #3: Caterpillar Invader Max ($119.99 to $125.97)
runTest('Boot 3 ($119.99 to $125.97): Range price calculation verification', () => {
  const card = createMockSearchCard({
    title: 'Caterpillar Men Invader Max 6" Waterproof Composite Toe Work Boot Shoes',
    price: '$119.99 to $125.97',
    shipping: 'Free delivery',
    url: 'https://www.ebay.com/itm/112233445503'
  });
  mockBody.appendChild(card);

  const processor = new SearchGridProcessor();
  processor.currentSettings = {
    amazonCommissionRate: 15.0,
    sellTaxRate: 9.0,
    targetProfitAmount: 12.00,
    shippingDeduction: 9.98
  };

  const processed = processor.processCard(card);
  assert.strictEqual(processed, true);

  const host = card.querySelector('.eapc-search-card-host');
  const cardHtml = host.shadowRoot.innerHTML;
  assert.ok(cardHtml.includes('$173.67 – $181.54'), `Expected $173.67 – $181.54 with ship, got: ${cardHtml}`);
  assert.ok(cardHtml.includes('$163.69 – $171.56'), `Expected $163.69 – $171.56 without ship, got: ${cardHtml}`);

  processor.teardown();
  mockBody.removeChild(card);
});

// 4. Single Price Boot #4: Caterpillar Calibrate ($97.97)
runTest('Boot 4 ($97.97): Exact calculation and ROI verification', () => {
  const card = createMockSearchCard({
    title: 'Caterpillar Men Calibrate Work Boot',
    price: '$97.97',
    shipping: 'Free delivery',
    url: 'https://www.ebay.com/itm/112233445504'
  });
  mockBody.appendChild(card);

  const processor = new SearchGridProcessor();
  processor.currentSettings = {
    amazonCommissionRate: 15.0,
    sellTaxRate: 9.0,
    targetProfitAmount: 12.00,
    shippingDeduction: 9.98
  };

  const processed = processor.processCard(card);
  assert.strictEqual(processed, true);

  const host = card.querySelector('.eapc-search-card-host');
  const cardHtml = host.shadowRoot.innerHTML;
  assert.ok(cardHtml.includes('$144.70'), `Expected $144.70 with ship, got: ${cardHtml}`);
  assert.ok(cardHtml.includes('$134.72'), `Expected $134.72 without ship, got: ${cardHtml}`);
  assert.ok(cardHtml.includes('ROI: 12.2%'), `Expected ROI 12.2%, got: ${cardHtml}`);

  processor.teardown();
  mockBody.removeChild(card);
});

// 5. Placeholder & Header Card Skipping
runTest('Placeholder Card: Ignores Shop on eBay and dummy items', () => {
  const dummyCard = createMockSearchCard({
    title: 'Shop on eBay',
    price: '$10.00',
    shipping: 'Free',
    url: '#'
  });
  mockBody.appendChild(dummyCard);

  const processor = new SearchGridProcessor();
  const processed = processor.processCard(dummyCard);
  assert.strictEqual(processed, false, 'Expected dummy card to be skipped');
  assert.strictEqual(dummyCard.querySelector('.eapc-search-card-host'), null);

  mockBody.removeChild(dummyCard);
});

// 6. Idempotency & Duplicate Prevention
runTest('Idempotency: Repetitive scans do not inject duplicate cards', () => {
  const card = createMockSearchCard({
    title: 'Sample Boot',
    price: '$100.00',
    shipping: 'Free',
    url: 'https://www.ebay.com/itm/999999999999'
  });
  mockBody.appendChild(card);

  const processor = new SearchGridProcessor();
  processor.currentSettings = {
    amazonCommissionRate: 15.0,
    sellTaxRate: 9.0,
    targetProfitAmount: 12.00,
    shippingDeduction: 9.98
  };

  const firstScan = processor.processAllCards();
  assert.strictEqual(firstScan, 1);

  const secondScan = processor.processAllCards();
  assert.strictEqual(secondScan, 0);

  const allHosts = card.querySelectorAll('.eapc-search-card-host');
  assert.strictEqual(allHosts.length, 1);

  processor.teardown();
  mockBody.removeChild(card);
});

// 7. Reactive Settings Synchronization
runTest('Reactive Settings: Updates card prices dynamically when settings change', () => {
  const card = createMockSearchCard({
    title: 'Sample Boot',
    price: '$50.00',
    shipping: 'Free',
    url: 'https://www.ebay.com/itm/888888888888'
  });
  mockBody.appendChild(card);

  const processor = new SearchGridProcessor();
  processor.currentSettings = {
    amazonCommissionRate: 15.0,
    sellTaxRate: 9.0,
    targetProfitAmount: 12.00,
    shippingDeduction: 9.98
  };

  processor.processAllCards();
  const host = card.querySelector('.eapc-search-card-host');
  assert.ok(host.shadowRoot.innerHTML.includes('$81.58')); // Baseline $50

  // Mutate settings: Target profit increases to $20.00
  processor.handleSettingsUpdated({
    amazonCommissionRate: 15.0,
    sellTaxRate: 9.0,
    targetProfitAmount: 20.00,
    shippingDeduction: 9.98
  });

  // New selling price: (50 + 20) / 0.76 = 70 / 0.76 = 92.11
  assert.ok(host.shadowRoot.innerHTML.includes('$92.11'), `Expected $92.11 after settings update, got: ${host.shadowRoot.innerHTML}`);
  assert.ok(host.shadowRoot.innerHTML.includes('Target: $20.00'));

  processor.teardown();
  mockBody.removeChild(card);
});

// 8. Clipboard Copy & Propagation Stoppage
runTest('Copy Action: Copies price and stops event propagation', async () => {
  let copiedText = '';
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: async (t) => { copiedText = t; }
    },
    configurable: true
  });

  const card = createMockSearchCard({
    title: 'Sample Boot',
    price: '$205.00',
    shipping: 'Free',
    url: 'https://www.ebay.com/itm/777777777777'
  });
  mockBody.appendChild(card);

  const processor = new SearchGridProcessor();
  processor.currentSettings = {
    amazonCommissionRate: 15.0,
    sellTaxRate: 9.0,
    targetProfitAmount: 12.00,
    shippingDeduction: 9.98
  };

  processor.processAllCards();
  const host = card.querySelector('.eapc-search-card-host');
  const buttons = host.shadowRoot.querySelectorAll('button');
  const copyBtn = host.shadowRoot.querySelector('button[data-copy="285.53"]') || buttons[0];
  assert.ok(copyBtn, 'Copy button was not found');

  let defaultPrevented = false;
  let propagationStopped = false;

  const mockEvent = {
    type: 'click',
    preventDefault: () => { defaultPrevented = true; },
    stopPropagation: () => { propagationStopped = true; }
  };

  copyBtn.dispatchEvent(mockEvent);

  await new Promise(r => setTimeout(r, 20));

  assert.strictEqual(copiedText, '285.53');
  assert.strictEqual(defaultPrevented, true);
  assert.strictEqual(propagationStopped, true);
  assert.strictEqual(copyBtn.textContent, '✓ Copied!');

  processor.teardown();
  mockBody.removeChild(card);
});

// 9. Floating Status Pill Lifecycle & Teardown
runTest('Status Pill: Mounts and cleans up on teardown', () => {
  const processor = new SearchGridProcessor();
  processor.mountStatusPill();

  const pillHost = mockBody.querySelector('.eapc-search-status-host');
  assert.ok(pillHost, 'Status pill host was not mounted in document.body');
  assert.ok(pillHost.shadowRoot.innerHTML.includes('⚡ EAPC'));

  processor.teardown();
  assert.strictEqual(mockBody.querySelector('.eapc-search-status-host'), null);
});

// 10. Modern .s-card Layout: Haggar Pants with +$6.65 delivery
runTest('Modern .s-card: Haggar pants with +$6.65 delivery calculates $49.54 / $39.56', () => {
  const card = new MockElement('li');
  card.className = 's-card s-card--vertical';

  const container = new MockElement('div');
  container.className = 'su-card-container';
  card.appendChild(container);

  const header = new MockElement('div');
  header.className = 'su-card-container__header';
  container.appendChild(header);

  const link = new MockElement('a');
  link.className = 's-card__link';
  link.href = 'https://www.ebay.com/itm/318926210701';
  link.setAttribute('href', 'https://www.ebay.com/itm/318926210701');
  header.appendChild(link);

  const title = new MockElement('div');
  title.className = 's-card__title';
  title.textContent = "Haggar Men's Performance Comfort Stretch Dress Pant Khaki 32x30 NWT MSRP $70";
  link.appendChild(title);

  const attrs = new MockElement('div');
  attrs.className = 'su-card-container__attributes__primary';
  container.appendChild(attrs);

  const priceRow = new MockElement('div');
  priceRow.className = 's-card__attribute-row';
  const priceSpan = new MockElement('span');
  priceSpan.className = 's-card__price';
  priceSpan.textContent = '$19.00';
  priceRow.appendChild(priceSpan);
  attrs.appendChild(priceRow);

  const buyNowRow = new MockElement('div');
  buyNowRow.className = 's-card__attribute-row';
  buyNowRow.textContent = 'Buy It Now';
  attrs.appendChild(buyNowRow);

  const shipRow = new MockElement('div');
  shipRow.className = 's-card__attribute-row';
  shipRow.textContent = '+$6.65 delivery';
  attrs.appendChild(shipRow);

  mockBody.appendChild(card);

  const processor = new SearchGridProcessor();
  processor.currentSettings = {
    amazonCommissionRate: 15.0,
    sellTaxRate: 9.0,
    targetProfitAmount: 12.00,
    shippingDeduction: 9.98
  };

  const processed = processor.processCard(card);
  assert.strictEqual(processed, true);

  const host = card.querySelector('.eapc-search-card-host');
  assert.ok(host, 'Host not mounted on .s-card');
  const cardHtml = host.shadowRoot.innerHTML;

  // Cost: $19.00 + $6.65 = $25.65
  // With Shipping: (25.65 + 12) / 0.76 = 37.65 / 0.76 = $49.54
  // Without Shipping: 49.539 - 9.98 = $39.56
  assert.ok(cardHtml.includes('$49.54'), `Expected $49.54 with shipping, got: ${cardHtml}`);
  assert.ok(cardHtml.includes('$39.56'), `Expected $39.56 without shipping, got: ${cardHtml}`);
  assert.ok(!cardHtml.includes('Shipping unspecified'), 'Unexpected warning: Shipping unspecified should NOT be present');

  processor.teardown();
  mockBody.removeChild(card);
});

Promise.all(testPromises).then(() => {
  console.log(`\nSearch Grid Test Run Complete: ${passedTests}/${totalTests} Passed.\n`);
});
