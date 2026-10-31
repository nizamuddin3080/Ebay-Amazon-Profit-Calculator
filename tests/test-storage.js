/**
 * Unit Test Suite for Storage Adapter & Settings System (Phase 5)
 * 
 * Verifies:
 * - TASK-5.1: Default retrieval & in-memory caching
 * - TASK-5.3: Input validation & boundary constraints (R + T >= 100%)
 * - TASK-5.4: Reset to defaults
 * - TASK-5.5: Subscriber notification & reactive synchronization
 * - TASK-5.7: Graceful fallback when chrome.storage is absent
 */

const assert = require('assert');
const StorageManager = require('../utils/storage.js');

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

async function runAll() {
  console.log('\n--- Running Storage Adapter Unit Tests ---\n');

  // 1. Default Configuration Invariants
  await runTest('TASK-5.1: Default Configuration Invariants', async () => {
    const s = await StorageManager.getSettings();
    assert.strictEqual(s.amazonCommissionRate, 15.0);
    assert.strictEqual(s.sellTaxRate, 9.0);
    assert.strictEqual(s.targetProfitAmount, 12.00);
    assert.strictEqual(s.shippingDeduction, 9.98);
  });

  // 2. Schema Validation (Valid Inputs)
  runTest('TASK-5.3: Schema Validation (Valid Inputs)', () => {
    const valid = StorageManager.validateSettings({
      amazonCommissionRate: 20.0,
      sellTaxRate: 8.5,
      targetProfitAmount: 15.0,
      shippingDeduction: 5.0
    });
    assert.strictEqual(valid.isValid, true);
    assert.strictEqual(valid.data.amazonCommissionRate, 20.0);
    assert.strictEqual(valid.data.sellTaxRate, 8.5);
  });

  // 3. Schema Validation (Boundary: Commission + Tax >= 100%)
  runTest('TASK-5.3: Rejection of Commission + Tax >= 100%', () => {
    const invalid1 = StorageManager.validateSettings({
      amazonCommissionRate: 60.0,
      sellTaxRate: 40.0, // 60 + 40 = 100%
      targetProfitAmount: 10.0,
      shippingDeduction: 9.98
    });
    assert.strictEqual(invalid1.isValid, false);
    assert(invalid1.error.includes('strictly less than 100%'));

    const invalid2 = StorageManager.validateSettings({
      amazonCommissionRate: 70.0,
      sellTaxRate: 35.0, // 105%
      targetProfitAmount: 10.0,
      shippingDeduction: 9.98
    });
    assert.strictEqual(invalid2.isValid, false);
  });

  // 4. Schema Validation (Negative Values)
  runTest('TASK-5.3: Rejection of Negative Commission or Deduction', () => {
    const invalidComm = StorageManager.validateSettings({
      amazonCommissionRate: -5.0,
      sellTaxRate: 9.0,
      targetProfitAmount: 12.0,
      shippingDeduction: 9.98
    });
    assert.strictEqual(invalidComm.isValid, false);

    const invalidDed = StorageManager.validateSettings({
      amazonCommissionRate: 15.0,
      sellTaxRate: 9.0,
      targetProfitAmount: 12.0,
      shippingDeduction: -2.0
    });
    assert.strictEqual(invalidDed.isValid, false);
  });

  // 5. Save & Retrieve Settings
  await runTest('TASK-5.1: Save & Retrieve Custom Settings', async () => {
    const custom = {
      amazonCommissionRate: 18.0,
      sellTaxRate: 7.25,
      targetProfitAmount: 25.0,
      shippingDeduction: 12.50
    };
    await StorageManager.saveSettings(custom);
    const loaded = await StorageManager.getSettings();

    assert.strictEqual(loaded.amazonCommissionRate, 18.0);
    assert.strictEqual(loaded.sellTaxRate, 7.25);
    assert.strictEqual(loaded.targetProfitAmount, 25.0);
    assert.strictEqual(loaded.shippingDeduction, 12.50);
  });

  // 6. Reset to Factory Defaults
  await runTest('TASK-5.4: Reset Settings to Factory Defaults', async () => {
    await StorageManager.resetSettings();
    const defaults = await StorageManager.getSettings();

    assert.strictEqual(defaults.amazonCommissionRate, 15.0);
    assert.strictEqual(defaults.sellTaxRate, 9.0);
    assert.strictEqual(defaults.targetProfitAmount, 12.0);
    assert.strictEqual(defaults.shippingDeduction, 9.98);
  });

  // 7. Reactive Change Subscriber Notifications
  await runTest('TASK-5.5: Reactive onSettingsChanged Listener Notification', async () => {
    let notified = false;
    let receivedSettings = null;

    const unsubscribe = StorageManager.onSettingsChanged((settings) => {
      notified = true;
      receivedSettings = settings;
    });

    await StorageManager.saveSettings({
      amazonCommissionRate: 12.0,
      sellTaxRate: 6.0,
      targetProfitAmount: 8.0,
      shippingDeduction: 4.50
    });

    assert.strictEqual(notified, true);
    assert.strictEqual(receivedSettings.targetProfitAmount, 8.0);

    // Clean up subscriber
    unsubscribe();
    notified = false;
    await StorageManager.resetSettings();
    assert.strictEqual(notified, false); // should not be notified after unsubscribe
  });

  console.log(`\nStorage Test Run Complete: ${passedTests}/${totalTests} Passed.\n`);
}

runAll();
