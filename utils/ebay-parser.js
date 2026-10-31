/**
 * eBay to Amazon Profit Calculator - eBay Extraction Engine
 * 
 * Implements a prioritized multi-tier extraction pipeline:
 * Tier 1: JSON-LD Schema.org structured scripts
 * Tier 2: High-priority eBay DOM selectors
 * Tier 3: OpenGraph & Twitter meta tags
 * Tier 4: Sanitized fallback text regex parsing
 * 
 * Features:
 * - Currency identification & European/US format disambiguation
 * - Three-State Shipping Model (FREE, KNOWN, UNKNOWN)
 * - Item ID & Canonical URL extraction
 * - Targeted, debounced mutation monitoring for product variations
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js / CommonJS
    module.exports = factory();
  } else {
    // Browser global (Content script)
    root.EbayParser = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Shipping States
  const SHIPPING_STATE = Object.freeze({
    FREE: 'FREE',
    KNOWN: 'KNOWN',
    UNKNOWN: 'UNKNOWN'
  });

  // Currency States
  const CURRENCY_STATE = Object.freeze({
    KNOWN: 'KNOWN',
    UNKNOWN_CURRENCY: 'UNKNOWN_CURRENCY',
    AMBIGUOUS_FORMAT: 'AMBIGUOUS_FORMAT'
  });

  // Known / Supported Currency Identifiers (Sorted with longer prefixes first)
  const CURRENCY_SYMBOLS = [
    { code: 'CAD', symbol: 'CAD $' },
    { code: 'CAD', symbol: 'C $' },
    { code: 'CAD', symbol: 'CAD' },
    { code: 'AUD', symbol: 'AUD $' },
    { code: 'AUD', symbol: 'AU $' },
    { code: 'AUD', symbol: 'AUD' },
    { code: 'USD', symbol: 'USD $' },
    { code: 'USD', symbol: 'US $' },
    { code: 'USD', symbol: 'USD' },
    { code: 'GBP', symbol: 'GB £' },
    { code: 'GBP', symbol: 'GBP' },
    { code: 'EUR', symbol: 'EUR €' },
    { code: 'EUR', symbol: 'EUR' },
    { code: 'USD', symbol: '$' },
    { code: 'GBP', symbol: '£' },
    { code: 'EUR', symbol: '€' }
  ];

  // RegEx for Free Shipping recognition
  const FREE_SHIPPING_REGEX = /\b(free\s*(shipping|local\s*pickup)?|fast\s*'?n\s*free|\$0(?:\.00)?)\b/i;

  // RegEx for Ambiguous / Missing Shipping
  const UNKNOWN_SHIPPING_REGEX = /\b(see\s+details|contact\s+seller|freight|varies|calculate|check\s+details)\b/i;

  // RegEx for eBay Item ID extraction
  const ITEM_ID_REGEX = /\/itm\/(?:[^\/]+\/)?(\d+)/i;

  /**
   * Identifies currency code and symbol from raw string before stripping characters.
   */
  function identifyCurrency(rawString) {
    if (!rawString || typeof rawString !== 'string') {
      return { currency: null, isSupported: false };
    }

    const trimmed = rawString.trim();

    // Check against known currency definitions (longer symbols checked first)
    for (const item of CURRENCY_SYMBOLS) {
      if (trimmed.includes(item.symbol)) {
        return { currency: item.code, matchedSymbol: item.symbol, isSupported: true };
      }
    }

    // Check for explicit foreign currency indicators (e.g. ¥, ₹, ₩, CHF, etc.)
    const foreignMatch = trimmed.match(/[¥₹₩₽]|CHF|JPY|INR|SEK|BRL|CNY/i);
    if (foreignMatch) {
      return { currency: foreignMatch[0].toUpperCase(), matchedSymbol: foreignMatch[0], isSupported: false };
    }

    return { currency: null, isSupported: false };
  }

  /**
   * Disambiguates US (1,234.56) and European (1.234,56) decimal/thousands separators
   * and parses into a clean floating-point number.
   */
  function parseNormalizedPrice(rawString) {
    if (!rawString || typeof rawString !== 'string') {
      return { value: null, currencyState: CURRENCY_STATE.UNKNOWN_CURRENCY, error: 'Empty price string' };
    }

    const currencyInfo = identifyCurrency(rawString);

    // If a foreign/unsupported currency was explicitly identified
    if (currencyInfo.currency && !currencyInfo.isSupported) {
      return {
        value: null,
        currency: currencyInfo.currency,
        currencyState: CURRENCY_STATE.UNKNOWN_CURRENCY,
        error: `Unsupported currency: ${currencyInfo.currency}`
      };
    }

    // Strip currency symbols and letters, keeping digits, commas, dots, and spaces
    let cleaned = rawString.replace(/[^0-9.,\s]/g, '').trim();
    if (!cleaned) {
      return { value: null, currencyState: CURRENCY_STATE.UNKNOWN_CURRENCY, error: 'No numeric content found' };
    }

    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    let numericString = cleaned;

    if (hasComma && hasDot) {
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');

      if (lastDot > lastComma) {
        // Standard US Format: 1,234.56 -> Strip commas
        numericString = cleaned.replace(/,/g, '').replace(/\s/g, '');
      } else {
        // European Format: 1.234,56 -> Strip dots, replace comma with dot
        numericString = cleaned.replace(/\./g, '').replace(/\s/g, '').replace(/,/g, '.');
      }
    } else if (hasComma && !hasDot) {
      // Only comma present
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length === 2) {
        // Decimal comma: 45,99 -> 45.99
        numericString = cleaned.replace(/\s/g, '').replace(/,/g, '.');
      } else if (parts.length === 2 && parts[1].length === 3) {
        // Thousands comma: 1,200 -> 1200
        numericString = cleaned.replace(/,/g, '').replace(/\s/g, '');
      } else if (parts.length > 2) {
        // Multiple thousands commas: 1,000,000 -> 1000000
        numericString = cleaned.replace(/,/g, '').replace(/\s/g, '');
      } else {
        // Ambiguous single comma format
        return {
          value: null,
          currency: currencyInfo.currency || 'USD',
          currencyState: CURRENCY_STATE.AMBIGUOUS_FORMAT,
          error: `Ambiguous separator format: ${rawString}`
        };
      }
    } else if (hasDot && !hasComma) {
      // Only dot present
      const parts = cleaned.split('.');
      if (parts.length === 2 && parts[1].length === 3) {
        // Thousands dot: 1.200 -> 1200
        numericString = cleaned.replace(/\./g, '').replace(/\s/g, '');
      } else if (parts.length > 2) {
        // Multiple thousands dots: 1.000.000 -> 1000000
        numericString = cleaned.replace(/\./g, '').replace(/\s/g, '');
      } else {
        // Standard decimal dot: 45.99 or 45.9
        numericString = cleaned.replace(/\s/g, '');
      }
    } else {
      // Integer without separators: 45
      numericString = cleaned.replace(/\s/g, '');
    }

    const parsedValue = parseFloat(numericString);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return {
        value: null,
        currency: currencyInfo.currency,
        currencyState: CURRENCY_STATE.AMBIGUOUS_FORMAT,
        error: 'Failed to parse valid float'
      };
    }

    return {
      value: parsedValue,
      currency: currencyInfo.currency || 'USD',
      currencyState: CURRENCY_STATE.KNOWN,
      error: null
    };
  }

  /**
   * Extracts and categorizes shipping cost into FREE, KNOWN, or UNKNOWN.
   */
  function parseShipping(rawString) {
    if (!rawString || typeof rawString !== 'string') {
      return { state: SHIPPING_STATE.UNKNOWN, value: null, raw: rawString };
    }

    const trimmed = rawString.trim();

    // 1. Explicit free shipping match
    if (FREE_SHIPPING_REGEX.test(trimmed)) {
      return { state: SHIPPING_STATE.FREE, value: 0.0, raw: trimmed };
    }

    // 2. Explicit ambiguous or missing shipping indicators
    if (UNKNOWN_SHIPPING_REGEX.test(trimmed)) {
      return { state: SHIPPING_STATE.UNKNOWN, value: null, raw: trimmed };
    }

    // 3. Attempt numeric parse
    const parsed = parseNormalizedPrice(trimmed);
    if (parsed.currencyState === CURRENCY_STATE.KNOWN && parsed.value !== null) {
      if (parsed.value === 0) {
        return { state: SHIPPING_STATE.FREE, value: 0.0, raw: trimmed };
      }
      return { state: SHIPPING_STATE.KNOWN, value: parsed.value, raw: trimmed };
    }

    // Default fallback: Cannot determine with certainty
    return { state: SHIPPING_STATE.UNKNOWN, value: null, raw: trimmed };
  }

  /**
   * Tier 1: Extracts structured data from JSON-LD schema.org script tags.
   */
  function extractFromJSONLD(doc) {
    if (!doc || !doc.querySelectorAll) return null;

    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const json = JSON.parse(script.textContent || '{}');
        const items = Array.isArray(json) ? json : [json];

        for (const item of items) {
          if (item['@type'] === 'Product' || item['@type'] === 'ItemPage') {
            const title = item.name || null;
            let price = null;
            let currency = null;

            if (item.offers) {
              const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
              if (offer && offer.price !== undefined) {
                price = parseFloat(offer.price);
                currency = offer.priceCurrency || null;
              }
            }

            if (price !== null && Number.isFinite(price) && price >= 0) {
              return {
                title,
                price,
                currency: currency || 'USD',
                source: 'Tier 1 (JSON-LD)'
              };
            }
          }
        }
      } catch (e) {
        // Malformed JSON-LD script, ignore and continue
      }
    }
    return null;
  }

  /**
   * Tier 2: Extracts price, title, and shipping using high-priority eBay CSS selectors.
   */
  function extractFromDOMSelectors(doc) {
    if (!doc || !doc.querySelector) return null;

    // Price Selectors
    const priceSelectors = [
      '[data-testid="x-price-primary"] span',
      '.x-price-primary .ux-textspans',
      '#prcIsum',
      '#mm-saleDscPrc',
      '.vi-bin-primary-price__sub',
      '.notranslate'
    ];

    let rawPrice = null;
    for (const sel of priceSelectors) {
      const el = doc.querySelector(sel);
      if (el && el.textContent && el.textContent.trim()) {
        const text = el.textContent.trim();
        // Verify it contains digits
        if (/\d/.test(text)) {
          rawPrice = text;
          break;
        }
      }
    }

    // Title Selectors
    const titleSelectors = [
      '.x-item-title__mainTitle .ux-textspans',
      'h1.x-item-title',
      '#itemTitle',
      'h1'
    ];

    let title = null;
    for (const sel of titleSelectors) {
      const el = doc.querySelector(sel);
      if (el && el.textContent && el.textContent.trim()) {
        title = el.textContent.replace(/^(details\s+about\s*|ebay\s*item\s*#?\s*)/i, '').trim();
        if (title.length > 3) break;
      }
    }

    // Shipping Selectors
    const shippingSelectors = [
      '[data-testid="x-shipping-cost"] .ux-textspans',
      '.ux-labels-values--shipping .ux-textspans--BOLD',
      '#fshippingCost',
      '#shippingSection'
    ];

    let rawShipping = null;
    for (const sel of shippingSelectors) {
      const el = doc.querySelector(sel);
      if (el && el.textContent && el.textContent.trim()) {
        rawShipping = el.textContent.trim();
        break;
      }
    }

    if (!rawPrice) return null;

    const parsedPrice = parseNormalizedPrice(rawPrice);
    if (parsedPrice.currencyState !== CURRENCY_STATE.KNOWN || parsedPrice.value === null) {
      return null;
    }

    const shippingInfo = parseShipping(rawShipping);

    return {
      title,
      price: parsedPrice.value,
      currency: parsedPrice.currency,
      shipping: shippingInfo,
      rawPrice,
      rawShipping,
      source: 'Tier 2 (DOM Selectors)'
    };
  }

  /**
   * Tier 3: Extracts price and title from OpenGraph / Twitter meta tags.
   */
  function extractFromMetaTags(doc) {
    if (!doc || !doc.querySelector) return null;

    const priceMeta = doc.querySelector('meta[property="og:price:amount"]') ||
                      doc.querySelector('meta[name="twitter:data1"]');
    const currencyMeta = doc.querySelector('meta[property="og:price:currency"]');
    const titleMeta = doc.querySelector('meta[property="og:title"]') ||
                      doc.querySelector('meta[name="twitter:title"]');

    if (!priceMeta || !priceMeta.content) return null;

    const parsedPrice = parseNormalizedPrice(priceMeta.content);
    if (parsedPrice.currencyState !== CURRENCY_STATE.KNOWN || parsedPrice.value === null) {
      return null;
    }

    return {
      title: titleMeta ? titleMeta.content.trim() : null,
      price: parsedPrice.value,
      currency: (currencyMeta && currencyMeta.content) || parsedPrice.currency || 'USD',
      source: 'Tier 3 (Meta Tags)'
    };
  }

  /**
   * Tier 4: Sanitized regex search on primary container text.
   */
  function extractFromRegexFallback(doc) {
    if (!doc || !doc.querySelector) return null;

    const mainContainer = doc.querySelector('#mainContent') || doc.body;
    if (!mainContainer || !mainContainer.innerText) return null;

    const text = mainContainer.innerText;
    const match = text.match(/(?:US\s*)?[\$£€]\s*([0-9]{1,3}(?:[,.][0-9]{3})*(?:[,.][0-9]{2}))/i);
    if (!match) return null;

    const parsedPrice = parseNormalizedPrice(match[0]);
    if (parsedPrice.currencyState !== CURRENCY_STATE.KNOWN || parsedPrice.value === null) {
      return null;
    }

    return {
      title: null,
      price: parsedPrice.value,
      currency: parsedPrice.currency,
      source: 'Tier 4 (Regex Fallback)'
    };
  }

  /**
   * Extracts Item ID from canonical link or location pathname.
   */
  function extractItemId(doc, locationHref) {
    // 1. Try canonical link tag
    if (doc && doc.querySelector) {
      const canonical = doc.querySelector('link[rel="canonical"]');
      if (canonical && canonical.href) {
        const match = canonical.href.match(ITEM_ID_REGEX);
        if (match) return match[1];
      }
    }

    // 2. Try passed or window location href
    const url = locationHref || (typeof window !== 'undefined' ? window.location.href : '');
    if (url) {
      const match = url.match(ITEM_ID_REGEX);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Full extraction pipeline running Tiers 1 through 4 sequentially.
   */
  function extractProductDetails(doc, locationHref) {
    const activeDoc = doc || (typeof document !== 'undefined' ? document : null);
    if (!activeDoc) {
      return {
        success: false,
        error: 'No valid document object available for extraction',
        data: null
      };
    }

    const itemId = extractItemId(activeDoc, locationHref);

    // Pipeline execution: Tier 1 -> Tier 2 -> Tier 3 -> Tier 4
    let result = extractFromJSONLD(activeDoc);

    // If Tier 1 found price but shipping was missing, look up shipping from DOM
    if (result && !result.shipping) {
      const domResult = extractFromDOMSelectors(activeDoc);
      result.shipping = domResult ? domResult.shipping : { state: SHIPPING_STATE.UNKNOWN, value: null };
    }

    if (!result) {
      result = extractFromDOMSelectors(activeDoc);
    }

    if (!result) {
      result = extractFromMetaTags(activeDoc);
      if (result) {
        const domResult = extractFromDOMSelectors(activeDoc);
        result.shipping = domResult ? domResult.shipping : { state: SHIPPING_STATE.UNKNOWN, value: null };
      }
    }

    if (!result) {
      result = extractFromRegexFallback(activeDoc);
      if (result) {
        result.shipping = { state: SHIPPING_STATE.UNKNOWN, value: null };
      }
    }

    if (!result || result.price === null || !Number.isFinite(result.price)) {
      return {
        success: false,
        error: 'Product price could not be detected',
        itemId,
        data: null
      };
    }

    // Ensure shipping is always structured
    const shipping = result.shipping || { state: SHIPPING_STATE.UNKNOWN, value: null };

    return {
      success: true,
      error: null,
      itemId,
      data: {
        title: result.title || 'eBay Item',
        price: result.price,
        currency: result.currency || 'USD',
        shippingState: shipping.state,
        shippingCost: shipping.value,
        rawPrice: result.rawPrice || null,
        rawShipping: shipping.raw || null,
        source: result.source
      }
    };
  }

  /**
   * Creates a debounced MutationObserver targeting price/shipping container nodes.
   * Suppresses duplicate events and coalesces rapid variant switches.
   */
  function createVariationObserver(doc, onUpdate, debounceMs = 250) {
    const activeDoc = doc || (typeof document !== 'undefined' ? document : null);
    if (!activeDoc || !activeDoc.querySelector || typeof MutationObserver === 'undefined') {
      return { disconnect: () => {} };
    }

    let debounceTimer = null;
    let lastSeenPriceText = '';
    let lastSeenShippingText = '';

    const priceTarget = activeDoc.querySelector('[data-testid="x-price-primary"]') ||
                        activeDoc.querySelector('.x-price-primary') ||
                        activeDoc.querySelector('#prcIsum');

    const shippingTarget = activeDoc.querySelector('[data-testid="x-shipping-cost"]') ||
                          activeDoc.querySelector('.ux-labels-values--shipping');

    if (!priceTarget && !shippingTarget) {
      return { disconnect: () => {} };
    }

    function checkMutation() {
      const currentPriceText = priceTarget ? priceTarget.textContent.trim() : '';
      const currentShippingText = shippingTarget ? shippingTarget.textContent.trim() : '';

      // Duplicate event suppression
      if (currentPriceText === lastSeenPriceText && currentShippingText === lastSeenShippingText) {
        return;
      }

      lastSeenPriceText = currentPriceText;
      lastSeenShippingText = currentShippingText;

      const details = extractProductDetails(activeDoc);
      if (details.success && typeof onUpdate === 'function') {
        onUpdate(details.data);
      }
    }

    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(checkMutation, debounceMs);
    });

    const observerConfig = { childList: true, subtree: true, characterData: true };

    if (priceTarget) observer.observe(priceTarget, observerConfig);
    if (shippingTarget) observer.observe(shippingTarget, observerConfig);

    return {
      disconnect: () => {
        clearTimeout(debounceTimer);
        observer.disconnect();
      }
    };
  }

  return {
    SHIPPING_STATE,
    CURRENCY_STATE,
    identifyCurrency,
    parseNormalizedPrice,
    parseShipping,
    extractItemId,
    extractFromJSONLD,
    extractFromDOMSelectors,
    extractFromMetaTags,
    extractFromRegexFallback,
    extractProductDetails,
    createVariationObserver
  };
});
