/**
 * Browser Action Popup Controller
 */

(function () {
  'use strict';

  const cfgCommission = document.getElementById('cfg-commission');
  const cfgTax = document.getElementById('cfg-tax');
  const cfgProfit = document.getElementById('cfg-profit');
  const cfgDeduction = document.getElementById('cfg-deduction');
  const btnSettings = document.getElementById('btn-open-settings');
  const btnOptionsPage = document.getElementById('btn-options-page');

  function openOptions() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
    } else {
      window.open('../settings/settings.html', '_blank');
    }
  }

  if (btnSettings) btnSettings.addEventListener('click', openOptions);
  if (btnOptionsPage) btnOptionsPage.addEventListener('click', openOptions);

  async function loadConfig() {
    if (!window.StorageManager) return;
    try {
      const s = await window.StorageManager.getSettings();
      if (cfgCommission) cfgCommission.textContent = `${s.amazonCommissionRate.toFixed(1)}%`;
      if (cfgTax) cfgTax.textContent = `${s.sellTaxRate.toFixed(1)}%`;
      if (cfgProfit) cfgProfit.textContent = `$${s.targetProfitAmount.toFixed(2)}`;
      if (cfgDeduction) cfgDeduction.textContent = `$${s.shippingDeduction.toFixed(2)}`;
    } catch (e) {
      console.error('Failed to load popup config:', e);
    }
  }

  window.addEventListener('DOMContentLoaded', loadConfig);
})();
