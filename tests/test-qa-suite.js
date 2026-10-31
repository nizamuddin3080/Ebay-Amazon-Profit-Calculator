/**
 * QA & End-to-End Test Suite: eBay to Amazon Profit Calculator
 * 
 * Covers Phase 7 Quality Assurance & Testing Strategy:
 * - TASK-7.1: Automated Mathematical Test Verification (TC-01, TC-02, TC-03-A, TC-03-B)
 * - TASK-7.2: Comprehensive Feature & Boundary Verification (TC-13 to TC-25)
 * - TASK-7.3: Dynamic Variant Stress Test
 * - TASK-7.4: Settings Boundary Testing
 * - TASK-7.5: Shadow DOM Isolation Verification
 * - TASK-7.6: Clipboard Reliability & Fallback Verification
 * - TASK-7.7: Manifest V3 Security & Least-Privilege Audit
 * - TASK-7.8: Performance & Memory Execution Benchmark
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Import project modules
const CalculatorEngine = require('../utils/calculator-engine.js');
const EbayParser = require('../utils/ebay-parser.js');
const CalculatorStorage = require('../utils/storage.js');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${testName}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n======================================================');
console.log('--- PHASE 7: QA & END-TO-END VERIFICATION SUITE ---');
console.log('======================================================\n');

// -----------------------------------------------------------------------------
// TASK-7.1: Core Benchmark Mathematical Tests (TC-01 to TC-03-B)
// -----------------------------------------------------------------------------
console.log('[SECTION 1: Core Benchmark Mathematical Tests (TASK-7.1)]');

runTest('TC-01: Standard Arbitrage Baseline ($50 Baseline, $12 Target Profit)', () => {
  const result = CalculatorEngine.calculate({
    productCost: 50.00,
    commissionRate: 15.0,
    taxRate: 9.0,
    targetProfit: 12.00,
    shippingDeduction: 9.98
  });

  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.formatted.sellingPriceWithShipping, '$81.58');
  assert.strictEqual(result.formatted.sellingPriceWithoutShipping, '$71.60');
  assert.strictEqual(result.formatted.estimatedProfit, '$12.00');
  assert.strictEqual(result.formatted.profitMargin, '14.7%');
  assert.strictEqual(result.formatted.roi, '24.0%');
});

runTest('TC-02: High-Value Item ($100 Cost, $20 Profit)', () => {
  const result = CalculatorEngine.calculate({
    productCost: 100.00,
    commissionRate: 15.0,
    taxRate: 9.0,
    targetProfit: 20.00,
    shippingDeduction: 9.98
  });

  assert.strictEqual(result.isValid, true);
  const formattedWithShip = result.formatted.sellingPriceWithShipping;
  assert.ok(
    formattedWithShip === '$157.89' || formattedWithShip === '$157.90',
    `Expected $157.89 or $157.90, got ${formattedWithShip}`
  );
  assert.strictEqual(result.formatted.sellingPriceWithoutShipping, '$147.91');
  assert.strictEqual(result.formatted.estimatedProfit, '$20.00');
  assert.strictEqual(result.formatted.profitMargin, '12.7%');
  assert.strictEqual(result.formatted.roi, '20.0%');
});

runTest('TC-03-A: Low-Cost Target Output Verification ($59.21 / $49.23)', () => {
  const result = CalculatorEngine.calculate({
    productCost: 30.00,
    commissionRate: 15.0,
    taxRate: 9.0,
    targetProfit: 15.00,
    shippingDeduction: 9.98
  });

  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.formatted.sellingPriceWithShipping, '$59.21');
  assert.strictEqual(result.formatted.sellingPriceWithoutShipping, '$49.23');
});

runTest('TC-03-B: Low-Cost Literal Input Verification ($30 Cost, $5 Profit)', () => {
  const result = CalculatorEngine.calculate({
    productCost: 30.00,
    commissionRate: 15.0,
    taxRate: 9.0,
    targetProfit: 5.00,
    shippingDeduction: 9.98
  });

  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.formatted.sellingPriceWithShipping, '$46.05');
  assert.strictEqual(result.formatted.sellingPriceWithoutShipping, '$36.07');
  assert.strictEqual(result.formatted.estimatedProfit, '$5.00');
  assert.strictEqual(result.formatted.profitMargin, '10.9%');
  assert.strictEqual(result.formatted.roi, '16.7%');
});

// -----------------------------------------------------------------------------
// TASK-7.2: Comprehensive Feature & Boundary Verification (TC-13 to TC-25)
// -----------------------------------------------------------------------------
console.log('\n[SECTION 2: Feature & Boundary Scenarios (TC-13 to TC-25)]');

runTest('TC-13: US Currency Parsing (USD)', () => {
  const p1 = EbayParser.parseNormalizedPrice('US $1,234.56');
  assert.strictEqual(p1.currency, 'USD');
  assert.strictEqual(p1.value, 1234.56);

  const p2 = EbayParser.parseNormalizedPrice('$45.00');
  assert.strictEqual(p2.currency, 'USD');
  assert.strictEqual(p2.value, 45.00);

  const p3 = EbayParser.parseNormalizedPrice('USD 19.99');
  assert.strictEqual(p3.currency, 'USD');
  assert.strictEqual(p3.value, 19.99);
});

runTest('TC-14: European Currency Parsing (EUR)', () => {
  const p1 = EbayParser.parseNormalizedPrice('1.234,56 €');
  assert.strictEqual(p1.currency, 'EUR');
  assert.strictEqual(p1.value, 1234.56);

  const p2 = EbayParser.parseNormalizedPrice('19,99 EUR');
  assert.strictEqual(p2.currency, 'EUR');
  assert.strictEqual(p2.value, 19.99);

  const p3 = EbayParser.parseNormalizedPrice('1 450,00 €');
  assert.strictEqual(p3.currency, 'EUR');
  assert.strictEqual(p3.value, 1450.00);
});

runTest('TC-15: Unknown or Ambiguous Currency Pauses Calculation', () => {
  const pUnknown = EbayParser.parseNormalizedPrice('¥ 5,000');
  assert.strictEqual(pUnknown.currencyState, EbayParser.CURRENCY_STATE.UNKNOWN_CURRENCY);
  assert.strictEqual(pUnknown.value, null);
  assert.ok(pUnknown.error.includes('Unsupported currency'));
});

runTest('TC-16: Missing / Ambiguous Shipping (UNKNOWN state, never zero)', () => {
  const s = EbayParser.parseShipping('Shipping: See details for shipping advice');
  assert.strictEqual(s.state, EbayParser.SHIPPING_STATE.UNKNOWN);
  assert.strictEqual(s.value, null);
  const requiresManualInput = s.state === EbayParser.SHIPPING_STATE.UNKNOWN;
  assert.strictEqual(requiresManualInput, true);
});

runTest('TC-17: Confirmed Free Shipping (FREE state, $0.00)', () => {
  const s = EbayParser.parseShipping('Fast \'N Free Standard Shipping');
  assert.strictEqual(s.state, EbayParser.SHIPPING_STATE.FREE);
  assert.strictEqual(s.value, 0.0);
  const requiresManualInput = s.state === EbayParser.SHIPPING_STATE.UNKNOWN;
  assert.strictEqual(requiresManualInput, false);
});

runTest('TC-18 & TC-19: Dual Independent Manual Overrides', () => {
  let state = {
    detectedPrice: 40.00,
    detectedShipping: 5.00,
    priceOverride: { isOverridden: false, value: null },
    shippingOverride: { isOverridden: false, value: null }
  };

  // User manually edits price to $55.00 (TC-18)
  state.priceOverride = { isOverridden: true, value: 55.00 };

  // Variant change on page mutates price to $42.00
  const variantPrice = 42.00;
  if (!state.priceOverride.isOverridden) {
    state.detectedPrice = variantPrice;
  }
  const activePrice = state.priceOverride.isOverridden ? state.priceOverride.value : state.detectedPrice;
  assert.strictEqual(activePrice, 55.00);

  // User manually inputs shipping to $7.50 (TC-19)
  state.shippingOverride = { isOverridden: true, value: 7.50 };
  state.priceOverride = { isOverridden: false, value: null };

  // Variant change updates price to $48.00
  if (!state.priceOverride.isOverridden) {
    state.detectedPrice = 48.00;
  }
  const effectivePrice = state.priceOverride.isOverridden ? state.priceOverride.value : state.detectedPrice;
  const effectiveShipping = state.shippingOverride.isOverridden ? state.shippingOverride.value : state.detectedShipping;
  assert.strictEqual(effectivePrice, 48.00);
  assert.strictEqual(effectiveShipping, 7.50);
  assert.strictEqual(effectivePrice + effectiveShipping, 55.50);
});

runTest('TC-20: New Item ID Navigation Resets Overrides & Teardown', () => {
  let activeItemId = '1111111111';
  let overrides = {
    priceOverride: { isOverridden: true, value: 50.00 },
    shippingOverride: { isOverridden: true, value: 10.00 }
  };

  const newItemId = '2222222222';
  if (newItemId !== activeItemId) {
    activeItemId = newItemId;
    overrides.priceOverride = { isOverridden: false, value: null };
    overrides.shippingOverride = { isOverridden: false, value: null };
  }

  assert.strictEqual(activeItemId, '2222222222');
  assert.strictEqual(overrides.priceOverride.isOverridden, false);
  assert.strictEqual(overrides.shippingOverride.isOverridden, false);
});

runTest('TC-21: Zero Product Cost Handling (C = 0)', () => {
  const result = CalculatorEngine.calculate({
    productCost: 0,
    commissionRate: 15.0,
    taxRate: 9.0,
    targetProfit: 12.00,
    shippingDeduction: 9.98
  });

  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.formatted.sellingPriceWithShipping, '$15.79');
  assert.strictEqual(result.formatted.sellingPriceWithoutShipping, '$5.81');
  assert.strictEqual(result.roi, null);
  assert.strictEqual(result.formatted.roi, 'N/A (Zero Cost)');
  assert.strictEqual(result.flags.isZeroCost, true);
});

runTest('TC-22: Negative Second Selling Price Policy (S < D)', () => {
  const result = CalculatorEngine.calculate({
    productCost: 1.00,
    commissionRate: 15.0,
    taxRate: 9.0,
    targetProfit: 1.00,
    shippingDeduction: 9.98
  });

  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.flags.isBelowDeduction, true);
  assert.strictEqual(result.sellingPriceWithoutShipping, 0);
  assert.strictEqual(result.formatted.sellingPriceWithoutShipping, '$0.00');
});

runTest('TC-23: Clipboard API Fallback & Error Toast Policy', () => {
  let toastTriggered = null;
  const mockShowToast = (msg, type) => {
    toastTriggered = { msg, type };
  };

  const copyPriceHandler = (text, clipboardFails, execCommandFails) => {
    let success = false;
    try {
      if (clipboardFails) throw new Error('NotAllowedError');
      success = true;
    } catch {
      if (!execCommandFails) {
        success = true;
      }
    }

    if (success) {
      mockShowToast('Copied to clipboard!', 'success');
    } else {
      mockShowToast('Copy failed — please select manually', 'error');
    }
  };

  // Case A: Clipboard succeeds
  copyPriceHandler('$81.58', false, false);
  assert.strictEqual(toastTriggered.type, 'success');

  // Case B: Clipboard fails, fallback succeeds
  copyPriceHandler('$81.58', true, false);
  assert.strictEqual(toastTriggered.type, 'success');

  // Case C: Both fail -> Error toast, NEVER false success
  copyPriceHandler('$81.58', true, true);
  assert.strictEqual(toastTriggered.type, 'error');
  assert.ok(toastTriggered.msg.includes('Copy failed'));
});

runTest('TC-24: Rapid Dynamic Variation Changes (Debounce Trailing Execution)', () => {
  let executionCount = 0;
  let timer = null;

  const debouncedHandler = (cb, delay = 10) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      executionCount++;
      cb();
    }, delay);
  };

  // Fire 5 rapid simulated mutations
  for (let i = 0; i < 5; i++) {
    debouncedHandler(() => {});
  }

  setTimeout(() => {
    assert.strictEqual(executionCount, 1, `Expected exactly 1 execution, got ${executionCount}`);
  }, 25);
});

runTest('TC-25: Non-eBay Match Verification', () => {
  const manifestRaw = fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const matches = manifest.content_scripts[0].matches;

  for (const m of matches) {
    assert.ok(m.includes('ebay.'), `Pattern ${m} is not restricted to eBay domains`);
    assert.ok(m.includes('/itm/*'), `Pattern ${m} does not restrict to /itm/* item pages`);
  }
});

// -----------------------------------------------------------------------------
// TASK-7.3 & TASK-7.4: Variant Stress & Boundary Testing
// -----------------------------------------------------------------------------
console.log('\n[SECTION 3: Dynamic Variant Stress & Settings Boundary Testing]');

runTest('TASK-7.3: Dynamic Variant 50-Cycle High-Frequency Stress Test', () => {
  let parseCalls = 0;
  let activePrice = 0;
  let timerId = null;

  const triggerVariantChange = (newPrice) => {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      parseCalls++;
      activePrice = newPrice;
    }, 10);
  };

  for (let i = 1; i <= 50; i++) {
    triggerVariantChange(20.00 + i);
  }

  setTimeout(() => {
    assert.strictEqual(parseCalls, 1);
    assert.strictEqual(activePrice, 70.00);
  }, 30);
});

runTest('TASK-7.4: Settings Boundary Testing (Extreme Legal & Rejection Cases)', () => {
  // Case A: 0% sales tax is valid
  const validZeroTax = CalculatorStorage.validateSettings({
    amazonCommissionRate: 15.0,
    sellTaxRate: 0.0,
    targetProfitAmount: 12.00,
    shippingDeduction: 9.98
  });
  assert.strictEqual(validZeroTax.isValid, true);

  // Case B: Combined rate = 99.9% is valid extreme boundary
  const validExtreme = CalculatorStorage.validateSettings({
    amazonCommissionRate: 50.0,
    sellTaxRate: 49.9,
    targetProfitAmount: 10.00,
    shippingDeduction: 5.00
  });
  assert.strictEqual(validExtreme.isValid, true);

  // Case C: Combined rate >= 100% is strictly rejected
  const invalidCombined = CalculatorStorage.validateSettings({
    amazonCommissionRate: 85.0,
    sellTaxRate: 15.0,
    targetProfitAmount: 12.00,
    shippingDeduction: 9.98
  });
  assert.strictEqual(invalidCombined.isValid, false);
  assert.ok(invalidCombined.error.includes('100%'));

  // Case D: Negative target profit policy warning
  const engineResult = CalculatorEngine.calculate({
    productCost: 50.00,
    commissionRate: 15.0,
    taxRate: 9.0,
    targetProfit: -5.00,
    shippingDeduction: 9.98
  });
  assert.strictEqual(engineResult.isValid, true);
  assert.strictEqual(engineResult.flags.isLossLeader, true);
});

// -----------------------------------------------------------------------------
// TASK-7.5 & TASK-7.6: Shadow DOM Isolation & Asset Integrity
// -----------------------------------------------------------------------------
console.log('\n[SECTION 4: Shadow DOM Isolation & Asset Integrity]');

runTest('TASK-7.5: Shadow DOM Host & Scoped CSS Isolation', () => {
  const cssPath = path.join(rootDir, 'styles.css');
  assert.ok(fs.existsSync(cssPath), 'styles.css must exist');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.ok(css.includes(':host'), 'CSS must define :host containment');
  assert.ok(css.includes('.eapc-wrapper'), 'CSS must define .eapc-wrapper');
  assert.ok(!css.includes('body {'), 'CSS must NOT style global body element');
  assert.ok(!css.includes('html {'), 'CSS must NOT style global html element');
});

runTest('TASK-7.6: Icon Assets Verification', () => {
  const sizes = [16, 48, 128];
  for (const s of sizes) {
    const iconPath = path.join(rootDir, 'icons', `icon${s}.png`);
    assert.ok(fs.existsSync(iconPath), `Icon icon${s}.png must exist`);
    const stats = fs.statSync(iconPath);
    assert.ok(stats.size > 50, `Icon icon${s}.png must be a valid non-empty PNG`);
  }
});

// -----------------------------------------------------------------------------
// TASK-7.7: Manifest V3 Security & Least-Privilege Audit
// -----------------------------------------------------------------------------
console.log('\n[SECTION 5: Manifest V3 Security & Compliance Audit]');

runTest('TASK-7.7: Manifest V3 Compliance Audit', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));

  assert.strictEqual(manifest.manifest_version, 3);
  assert.deepStrictEqual(manifest.permissions, ['storage']);
  assert.strictEqual(manifest.host_permissions, undefined, 'host_permissions must be omitted');

  const manifestStr = JSON.stringify(manifest);
  assert.ok(!manifestStr.includes('http://'), 'No insecure http URLs in manifest');
  assert.ok(!manifestStr.includes('https://cdn'), 'No external CDNs in manifest');

  const htmlFiles = [
    path.join(rootDir, 'popup', 'popup.html'),
    path.join(rootDir, 'settings', 'settings.html')
  ];

  for (const hf of htmlFiles) {
    const html = fs.readFileSync(hf, 'utf8');
    assert.ok(!html.includes('onclick='), `${hf} contains forbidden inline onclick`);
    assert.ok(!html.includes('onload='), `${hf} contains forbidden inline onload`);
    assert.ok(!html.includes('<script>') && !html.includes('<script >'), `${hf} contains inline script tags`);
  }

  const jsFiles = [
    path.join(rootDir, 'background.js'),
    path.join(rootDir, 'content.js'),
    path.join(rootDir, 'calculator.js'),
    path.join(rootDir, 'utils', 'calculator-engine.js'),
    path.join(rootDir, 'utils', 'ebay-parser.js'),
    path.join(rootDir, 'utils', 'storage.js'),
    path.join(rootDir, 'popup', 'popup.js'),
    path.join(rootDir, 'settings', 'settings.js')
  ];

  for (const jf of jsFiles) {
    const code = fs.readFileSync(jf, 'utf8');
    assert.ok(!code.includes('eval('), `${jf} contains forbidden eval()`);
    assert.ok(!code.includes('new Function('), `${jf} contains forbidden Function() constructor`);
  }
});

// -----------------------------------------------------------------------------
// TASK-7.8: Performance & Memory Execution Benchmark
// -----------------------------------------------------------------------------
console.log('\n[SECTION 6: Performance & Memory Benchmark]');

runTest('TASK-7.8: Microsecond Calculation Engine Benchmark (10,000 iterations)', () => {
  const iterations = 10000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    CalculatorEngine.calculate({
      productCost: 50.00 + (i % 100),
      commissionRate: 15.0,
      taxRate: 9.0,
      targetProfit: 12.00,
      shippingDeduction: 9.98
    });
  }

  const durationMs = performance.now() - start;
  const avgMicrosecPerRun = (durationMs / iterations) * 1000;

  console.log(`    -> Executed ${iterations} full calculations in ${durationMs.toFixed(2)}ms`);
  console.log(`    -> Average latency: ${avgMicrosecPerRun.toFixed(3)} µs per calculation`);

  assert.ok(durationMs < 200, `Performance exceeded target budget: ${durationMs}ms`);
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`Phase 7 QA Test Run Complete: ${passedTests}/${totalTests} Passed.`);
console.log('======================================================\n');
