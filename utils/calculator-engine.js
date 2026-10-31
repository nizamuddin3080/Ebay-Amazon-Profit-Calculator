/**
 * eBay to Amazon Profit Calculator - Pure Calculation Engine
 * 
 * Implements deterministic algebraic formulas for Amazon selling prices,
 * estimated net profits, profit margins, and return on investment (ROI).
 * 
 * Zero DOM dependencies. 100% pure function architecture.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js / CommonJS
    module.exports = factory();
  } else {
    // Browser global (Content script / Extension window)
    root.CalculatorEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Central default invariants
  const DEFAULTS = Object.freeze({
    COMMISSION_RATE: 15.0,  // 15.0%
    TAX_RATE: 9.0,          // 9.0%
    TARGET_PROFIT: 12.00,   // $12.00
    SHIPPING_DEDUCTION: 9.98 // $9.98
  });

  /**
   * Helper to normalize rates provided either as percentages (15.0) or decimals (0.15).
   * Standard convention is percentage [0, 100].
   */
  function normalizeRate(rate, defaultRate) {
    if (rate === undefined || rate === null || rate === '') {
      return defaultRate / 100;
    }
    const num = Number(rate);
    if (!Number.isFinite(num)) {
      return NaN;
    }
    // If rate is provided as percentage (e.g. 15), convert to decimal 0.15
    return num > 1.0 ? num / 100 : num;
  }

  /**
   * Currency formatter rounding strictly at display boundary.
   */
  function formatCurrency(val, symbol = '$') {
    if (val === null || val === undefined || !Number.isFinite(val)) {
      return '--';
    }
    return `${symbol}${val.toFixed(2)}`;
  }

  /**
   * Percentage formatter rounding to 1 decimal place.
   */
  function formatPercent(val) {
    if (val === null || val === undefined || !Number.isFinite(val)) {
      return 'N/A';
    }
    return `${val.toFixed(1)}%`;
  }

  /**
   * Validates raw calculation inputs according to business and mathematical boundaries.
   */
  function validateInputs(params) {
    const {
      productCost,
      commissionRate,
      taxRate,
      targetProfit,
      shippingDeduction
    } = params;

    // 1. Cost checks
    if (productCost === null || productCost === undefined || productCost === '') {
      return { isValid: false, errorCode: 'MISSING_COST', error: 'Product cost is required.' };
    }
    const c = Number(productCost);
    if (!Number.isFinite(c)) {
      return { isValid: false, errorCode: 'INVALID_COST', error: 'Product cost must be a valid number.' };
    }
    if (c < 0) {
      return { isValid: false, errorCode: 'NEGATIVE_COST', error: 'Product cost cannot be negative.' };
    }

    // 2. Profit checks
    const p = targetProfit !== undefined && targetProfit !== null && targetProfit !== ''
      ? Number(targetProfit)
      : DEFAULTS.TARGET_PROFIT;
    if (!Number.isFinite(p)) {
      return { isValid: false, errorCode: 'INVALID_PROFIT', error: 'Target profit must be a valid number.' };
    }

    // 3. Deduction checks
    const d = shippingDeduction !== undefined && shippingDeduction !== null && shippingDeduction !== ''
      ? Number(shippingDeduction)
      : DEFAULTS.SHIPPING_DEDUCTION;
    if (!Number.isFinite(d) || d < 0) {
      return { isValid: false, errorCode: 'INVALID_DEDUCTION', error: 'Shipping deduction must be a non-negative number.' };
    }

    // 4. Rate normalization and checks
    const r = normalizeRate(commissionRate, DEFAULTS.COMMISSION_RATE);
    const t = normalizeRate(taxRate, DEFAULTS.TAX_RATE);

    if (!Number.isFinite(r) || r < 0) {
      return { isValid: false, errorCode: 'INVALID_COMMISSION', error: 'Commission rate must be a non-negative number.' };
    }
    if (!Number.isFinite(t) || t < 0) {
      return { isValid: false, errorCode: 'INVALID_TAX', error: 'Tax rate must be a non-negative number.' };
    }

    // 5. Division by zero / negative denominator safeguard (1 - R - T <= 0)
    if (r + t >= 1.0) {
      return {
        isValid: false,
        errorCode: 'EXCESSIVE_FEES',
        error: 'Combined Commission and Tax must be less than 100%.'
      };
    }

    return {
      isValid: true,
      data: {
        cost: c,
        profit: p,
        deduction: d,
        commission: r,
        tax: t
      }
    };
  }

  /**
   * Main calculation function implementing reverse-margin formula.
   * 
   * Formulas:
   * S = (C + P) / (1 - R - T)
   * S_no_ship = S - D
   * Profit = S * (1 - R - T) - C
   * Margin = (Profit / S) * 100
   * ROI = (Profit / C) * 100
   */
  function calculate(params) {
    const validation = validateInputs(params);
    if (!validation.isValid) {
      return {
        isValid: false,
        errorCode: validation.errorCode,
        error: validation.error,
        sellingPriceWithShipping: null,
        sellingPriceWithoutShipping: null,
        rawSellingPriceWithoutShipping: null,
        estimatedProfit: null,
        profitMargin: null,
        roi: null,
        formatted: {
          sellingPriceWithShipping: '--',
          sellingPriceWithoutShipping: '--',
          estimatedProfit: '--',
          profitMargin: 'N/A',
          roi: 'N/A'
        },
        flags: {
          isZeroCost: false,
          isLossLeader: false,
          isBelowDeduction: false,
          warningMessage: validation.error
        }
      };
    }

    const { cost: C, profit: P, deduction: D, commission: R, tax: T } = validation.data;

    // Denominator calculation: (1 - R - T)
    const denom = 1.0 - R - T;

    // Amazon Selling Price With Shipping: (C + P) / (1 - R - T)
    const sellingPriceWithShipping = (C + P) / denom;

    // Amazon Selling Price Without Shipping: S - D
    const rawWithoutShipping = sellingPriceWithShipping - D;

    // Policy: Clamped selling price without shipping if S < D
    let sellingPriceWithoutShipping = rawWithoutShipping;
    let isBelowDeduction = false;
    let belowDeductionWarning = null;

    if (rawWithoutShipping < 0) {
      sellingPriceWithoutShipping = 0.0;
      isBelowDeduction = true;
      belowDeductionWarning = `Shipping deduction ($${D.toFixed(2)}) exceeds selling price.`;
    }

    // Estimated Net Profit: S * (1 - R - T) - C
    const estimatedProfit = (sellingPriceWithShipping * denom) - C;

    // Profit Margin Percentage: (Profit / S) * 100
    const profitMargin = sellingPriceWithShipping > 0
      ? (estimatedProfit / sellingPriceWithShipping) * 100
      : 0.0;

    // Return on Investment Percentage: (Profit / C) * 100
    // Division by zero safeguard for zero cost (C = 0)
    const isZeroCost = C === 0;
    const roi = isZeroCost ? null : (estimatedProfit / C) * 100;

    // Loss-leader flag for negative target profit
    const isLossLeader = P < 0;
    const warningMessage = isLossLeader
      ? 'Loss Leader Pricing (Negative Target Profit)'
      : belowDeductionWarning;

    return {
      isValid: true,
      errorCode: null,
      error: null,
      sellingPriceWithShipping,
      sellingPriceWithoutShipping,
      rawSellingPriceWithoutShipping: rawWithoutShipping,
      estimatedProfit,
      profitMargin,
      roi,
      formatted: {
        sellingPriceWithShipping: formatCurrency(sellingPriceWithShipping),
        sellingPriceWithoutShipping: formatCurrency(sellingPriceWithoutShipping),
        estimatedProfit: formatCurrency(estimatedProfit),
        profitMargin: formatPercent(profitMargin),
        roi: isZeroCost ? 'N/A (Zero Cost)' : formatPercent(roi)
      },
      flags: {
        isZeroCost,
        isLossLeader,
        isBelowDeduction,
        warningMessage
      }
    };
  }

  return {
    DEFAULTS,
    calculate,
    validateInputs,
    formatCurrency,
    formatPercent,
    normalizeRate
  };
});
