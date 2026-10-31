/**
 * Settings Page Controller
 * Handles user interactions, form validation, storage persistence, and reset to defaults.
 */

(function () {
  'use strict';

  // DOM Elements
  const form = document.getElementById('settings-form');
  const inputCommission = document.getElementById('commission-input');
  const inputTax = document.getElementById('tax-input');
  const inputProfit = document.getElementById('profit-input');
  const inputDeduction = document.getElementById('deduction-input');
  const btnReset = document.getElementById('btn-reset');
  const errorBanner = document.getElementById('error-banner');
  const toast = document.getElementById('toast');

  let toastTimer = null;

  /**
   * Displays an ephemeral feedback toast.
   */
  function showToast(message, type = 'success') {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `toast toast-${type} toast-show`;
    toastTimer = setTimeout(() => {
      toast.classList.remove('toast-show');
    }, type === 'error' ? 3000 : 2000);
  }

  /**
   * Displays or hides the top error banner.
   */
  function setError(message) {
    if (message) {
      errorBanner.textContent = message;
      errorBanner.style.display = 'block';
    } else {
      errorBanner.textContent = '';
      errorBanner.style.display = 'none';
    }
  }

  /**
   * Populates form inputs from settings object.
   */
  function populateInputs(settings) {
    if (!settings) return;
    inputCommission.value = settings.amazonCommissionRate.toFixed(1);
    inputTax.value = settings.sellTaxRate.toFixed(1);
    inputProfit.value = settings.targetProfitAmount.toFixed(2);
    inputDeduction.value = settings.shippingDeduction.toFixed(2);
  }

  /**
   * Reads current form inputs into a settings object.
   */
  function readInputs() {
    return {
      amazonCommissionRate: parseFloat(inputCommission.value),
      sellTaxRate: parseFloat(inputTax.value),
      targetProfitAmount: parseFloat(inputProfit.value),
      shippingDeduction: parseFloat(inputDeduction.value)
    };
  }

  /**
   * Validates inputs on the fly.
   */
  function validateCurrent() {
    const raw = readInputs();
    const result = window.StorageManager.validateSettings(raw);
    if (!result.isValid) {
      setError(result.error);
      return false;
    }
    setError(null);
    return true;
  }

  // Real-time input listeners
  [inputCommission, inputTax, inputProfit, inputDeduction].forEach((el) => {
    el.addEventListener('input', validateCurrent);
  });

  // Load saved settings on startup
  window.addEventListener('DOMContentLoaded', async () => {
    try {
      const settings = await window.StorageManager.getSettings();
      populateInputs(settings);
    } catch (err) {
      setError('Failed to load settings. Using default configuration.');
      populateInputs(window.StorageManager.DEFAULT_SETTINGS);
    }
  });

  // Save Settings handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateCurrent()) {
      showToast('Please correct validation errors before saving.', 'error');
      return;
    }

    const payload = readInputs();
    try {
      await window.StorageManager.saveSettings(payload);
      showToast('✓ Settings saved successfully!', 'success');
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
      showToast('✕ Error saving settings', 'error');
    }
  });

  // Reset to Defaults handler
  btnReset.addEventListener('click', async () => {
    try {
      const defaults = await window.StorageManager.resetSettings();
      populateInputs(defaults);
      setError(null);
      showToast('✓ Settings restored to defaults!', 'success');
    } catch (err) {
      setError('Failed to reset settings.');
      showToast('✕ Reset failed', 'error');
    }
  });
})();
