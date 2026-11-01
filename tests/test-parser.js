/**
 * Unit Test Suite for eBay Extraction Engine (TASK-3.9)
 * 
 * Verifies:
 * - TC-13: US currency parsing ($1,234.56, $45.00)
 * - TC-14: European currency parsing (1.234,56 €, 19,99 €)
 * - TC-15: Unknown or ambiguous currency
 * - TC-16: Missing/ambiguous shipping (UNKNOWN state)
 * - TC-17: Confirmed free shipping (FREE state)
 * - Multi-tier extraction (JSON-LD, DOM Selectors, Meta Tags)
 * - Item ID extraction from canonical links and URLs
 */

const assert = require('assert');
const EbayParser = require('../utils/ebay-parser.js');

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

console.log('\n--- Running eBay Parser Unit Tests ---\n');

// 1. Currency Identification
runTest('Currency Identification: Supported currencies', () => {
  assert.strictEqual(EbayParser.identifyCurrency('$45.00').currency, 'USD');
  assert.strictEqual(EbayParser.identifyCurrency('US $120.00').currency, 'USD');
  assert.strictEqual(EbayParser.identifyCurrency('£35.50').currency, 'GBP');
  assert.strictEqual(EbayParser.identifyCurrency('29,99 €').currency, 'EUR');
  assert.strictEqual(EbayParser.identifyCurrency('C $50.00').currency, 'CAD');
  assert.strictEqual(EbayParser.identifyCurrency('AU $65.00').currency, 'AUD');
});

// 2. TC-13: US Currency Parsing
runTest('TC-13: US Currency Parsing ($1,234.56, $45.00)', () => {
  const p1 = EbayParser.parseNormalizedPrice('$1,234.56');
  assert.strictEqual(p1.value, 1234.56);
  assert.strictEqual(p1.currency, 'USD');
  assert.strictEqual(p1.currencyState, EbayParser.CURRENCY_STATE.KNOWN);

  const p2 = EbayParser.parseNormalizedPrice('US $45.00');
  assert.strictEqual(p2.value, 45.00);
  assert.strictEqual(p2.currency, 'USD');

  const p3 = EbayParser.parseNormalizedPrice('$19.99/ea');
  assert.strictEqual(p3.value, 19.99);
});

// 3. TC-14: European Currency Parsing
runTest('TC-14: European Currency Parsing (1.234,56 €, 19,99 €)', () => {
  const p1 = EbayParser.parseNormalizedPrice('1.234,56 €');
  assert.strictEqual(p1.value, 1234.56);
  assert.strictEqual(p1.currency, 'EUR');
  assert.strictEqual(p1.currencyState, EbayParser.CURRENCY_STATE.KNOWN);

  const p2 = EbayParser.parseNormalizedPrice('19,99 EUR');
  assert.strictEqual(p2.value, 19.99);
  assert.strictEqual(p2.currency, 'EUR');

  const p3 = EbayParser.parseNormalizedPrice('1 450,00 €');
  assert.strictEqual(p3.value, 1450.00);
});

// 4. TC-15: Unknown or Ambiguous Currency
runTest('TC-15: Unknown or Ambiguous Currency', () => {
  const p1 = EbayParser.parseNormalizedPrice('¥ 5,000');
  assert.strictEqual(p1.currencyState, EbayParser.CURRENCY_STATE.UNKNOWN_CURRENCY);
  assert.strictEqual(p1.value, null);

  const p2 = EbayParser.parseNormalizedPrice('₹ 1,500');
  assert.strictEqual(p2.currencyState, EbayParser.CURRENCY_STATE.UNKNOWN_CURRENCY);
  assert.strictEqual(p2.value, null);

  // Ambiguous separator format
  const p3 = EbayParser.parseNormalizedPrice('1,234');
  assert.strictEqual(p3.value, 1234.00); // 3 digits after comma -> treated as thousands
});

// 5. TC-16: Missing / Ambiguous Shipping (UNKNOWN state)
runTest('TC-16: Missing / Ambiguous Shipping (UNKNOWN state)', () => {
  const s1 = EbayParser.parseShipping('Shipping: See details');
  assert.strictEqual(s1.state, EbayParser.SHIPPING_STATE.UNKNOWN);
  assert.strictEqual(s1.value, null);

  const s2 = EbayParser.parseShipping('Contact seller for quote');
  assert.strictEqual(s2.state, EbayParser.SHIPPING_STATE.UNKNOWN);
  assert.strictEqual(s2.value, null);

  const s3 = EbayParser.parseShipping('Freight delivery only');
  assert.strictEqual(s3.state, EbayParser.SHIPPING_STATE.UNKNOWN);
  assert.strictEqual(s3.value, null);

  const s4 = EbayParser.parseShipping('');
  assert.strictEqual(s4.state, EbayParser.SHIPPING_STATE.UNKNOWN);
  assert.strictEqual(s4.value, null);
});

// 6. TC-17: Confirmed Free Shipping (FREE state)
runTest('TC-17: Confirmed Free Shipping (FREE state)', () => {
  const s1 = EbayParser.parseShipping('Free shipping');
  assert.strictEqual(s1.state, EbayParser.SHIPPING_STATE.FREE);
  assert.strictEqual(s1.value, 0.0);

  const s2 = EbayParser.parseShipping('FAST \'N FREE');
  assert.strictEqual(s2.state, EbayParser.SHIPPING_STATE.FREE);
  assert.strictEqual(s2.value, 0.0);

  const s3 = EbayParser.parseShipping('$0.00 Standard Shipping');
  assert.strictEqual(s3.state, EbayParser.SHIPPING_STATE.FREE);
  assert.strictEqual(s3.value, 0.0);

  const s4 = EbayParser.parseShipping('Free local pickup');
  assert.strictEqual(s4.state, EbayParser.SHIPPING_STATE.FREE);
  assert.strictEqual(s4.value, 0.0);
});

// 7. Known Standard Shipping
runTest('Known Standard Shipping ($5.00, US $12.50, and transit date disambiguation)', () => {
  const s1 = EbayParser.parseShipping('$5.00 Standard Shipping');
  assert.strictEqual(s1.state, EbayParser.SHIPPING_STATE.KNOWN);
  assert.strictEqual(s1.value, 5.00);

  const s2 = EbayParser.parseShipping('US $12.50 Expedited');
  assert.strictEqual(s2.state, EbayParser.SHIPPING_STATE.KNOWN);
  assert.strictEqual(s2.value, 12.50);

  // Real-world listing test: "US $8.72 delivery in 2-4 days" should parse 8.72 (NOT 24.00!)
  const s3 = EbayParser.parseShipping('US $8.72 delivery in 2-4 days');
  assert.strictEqual(s3.state, EbayParser.SHIPPING_STATE.KNOWN);
  assert.strictEqual(s3.value, 8.72);

  // Isolated delivery transit text "2-4 days" should NEVER be parsed as $24.00
  const s4 = EbayParser.parseShipping('2-4 days');
  assert.strictEqual(s4.state, EbayParser.SHIPPING_STATE.UNKNOWN);
  assert.strictEqual(s4.value, null);
});

// 8. Item ID Extraction
runTest('Item ID Extraction: URL and Canonical Link', () => {
  const id1 = EbayParser.extractItemId(null, 'https://www.ebay.com/itm/123456789012');
  assert.strictEqual(id1, '123456789012');

  const id2 = EbayParser.extractItemId(null, 'https://www.ebay.co.uk/itm/Apple-iPhone-14-Pro-Max-/987654321098?hash=abc');
  assert.strictEqual(id2, '987654321098');

  // Mock doc with canonical link
  const mockDoc = {
    querySelector: (sel) => {
      if (sel === 'link[rel="canonical"]') {
        return { href: 'https://www.ebay.com/itm/334455667788' };
      }
      return null;
    }
  };
  const id3 = EbayParser.extractItemId(mockDoc, '');
  assert.strictEqual(id3, '334455667788');
});

// 9. Tier 1: JSON-LD Extraction
runTest('Tier 1: JSON-LD Structured Data Parsing', () => {
  const mockDoc = {
    querySelectorAll: (sel) => {
      if (sel === 'script[type="application/ld+json"]') {
        return [{
          textContent: JSON.stringify({
            '@type': 'Product',
            name: 'Sony WH-1000XM4 Wireless Headphones',
            offers: {
              '@type': 'Offer',
              price: '199.99',
              priceCurrency: 'USD'
            }
          })
        }];
      }
      return [];
    },
    querySelector: () => null
  };

  const result = EbayParser.extractFromJSONLD(mockDoc);
  assert.ok(result);
  assert.strictEqual(result.title, 'Sony WH-1000XM4 Wireless Headphones');
  assert.strictEqual(result.price, 199.99);
  assert.strictEqual(result.currency, 'USD');
  assert.strictEqual(result.source, 'Tier 1 (JSON-LD)');
});

// 10. Tier 2: DOM Selectors Extraction
runTest('Tier 2: DOM Selectors Extraction', () => {
  const mockDoc = {
    querySelector: (sel) => {
      if (sel === '[data-testid="x-price-primary"] span') {
        return { textContent: 'US $49.95' };
      }
      if (sel === '.x-item-title__mainTitle .ux-textspans') {
        return { textContent: 'Vintage Leather Jacket Brown' };
      }
      if (sel === '[data-testid="x-shipping-cost"] .ux-textspans') {
        return { textContent: 'Free shipping' };
      }
      return null;
    }
  };

  const result = EbayParser.extractFromDOMSelectors(mockDoc);
  assert.ok(result);
  assert.strictEqual(result.title, 'Vintage Leather Jacket Brown');
  assert.strictEqual(result.price, 49.95);
  assert.strictEqual(result.shipping.state, EbayParser.SHIPPING_STATE.FREE);
  assert.strictEqual(result.shipping.value, 0.0);
  assert.strictEqual(result.source, 'Tier 2 (DOM Selectors)');
});

// 11. Tier 3: Meta Tag Extraction
runTest('Tier 3: Meta Tag Extraction', () => {
  const mockDoc = {
    querySelector: (sel) => {
      if (sel === 'meta[property="og:price:amount"]') {
        return { content: '89.00' };
      }
      if (sel === 'meta[property="og:price:currency"]') {
        return { content: 'USD' };
      }
      if (sel === 'meta[property="og:title"]') {
        return { content: 'Mechanical Keyboard RGB' };
      }
      return null;
    }
  };

  const result = EbayParser.extractFromMetaTags(mockDoc);
  assert.ok(result);
  assert.strictEqual(result.title, 'Mechanical Keyboard RGB');
  assert.strictEqual(result.price, 89.00);
  assert.strictEqual(result.currency, 'USD');
  assert.strictEqual(result.source, 'Tier 3 (Meta Tags)');
});

// 12. Full Pipeline Execution
runTest('Full Pipeline: End-to-End Extraction with Fallback', () => {
  const mockDoc = {
    querySelectorAll: () => [],
    querySelector: (sel) => {
      if (sel === '.x-price-primary .ux-textspans') {
        return { textContent: '$75.50' };
      }
      if (sel === 'h1.x-item-title') {
        return { textContent: 'Running Shoes Size 10' };
      }
      if (sel === '.ux-labels-values--shipping .ux-textspans--BOLD') {
        return { textContent: '$4.50' };
      }
      if (sel === 'link[rel="canonical"]') {
        return { href: 'https://www.ebay.com/itm/556677889900' };
      }
      return null;
    }
  };

  const result = EbayParser.extractProductDetails(mockDoc);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.itemId, '556677889900');
  assert.strictEqual(result.data.title, 'Running Shoes Size 10');
  assert.strictEqual(result.data.price, 75.50);
  assert.strictEqual(result.data.shippingState, EbayParser.SHIPPING_STATE.KNOWN);
  assert.strictEqual(result.data.shippingCost, 4.50);
});

// 13. Real-World Disambiguation: Delivery Transit Times & HTML Entities
runTest('Real-World Disambiguation: Bulova Wilton ($8.72 shipping with "2-4 days" and HTML entity title)', () => {
  const mockDoc = {
    querySelectorAll: () => [],
    querySelector: (sel) => {
      if (sel === '[data-testid="x-price-primary"] span' || sel === '.x-price-primary .ux-textspans') {
        return { textContent: 'US $158.28' };
      }
      if (sel === '.x-item-title__mainTitle .ux-textspans' || sel === 'h1.x-item-title') {
        return { textContent: 'New Bulova Wilton Men&#039;s Chronograph Quartz Watch' };
      }
      if (sel === '.ux-labels-values--shipping .ux-labels-values__values-content') {
        return {
          textContent: 'US $8.72 delivery in 2-4 days',
          querySelectorAll: () => [
            { textContent: 'US $8.72' },
            { textContent: 'delivery in 2-4 days' }
          ]
        };
      }
      if (sel === 'link[rel="canonical"]') {
        return { href: 'https://www.ebay.com/itm/112233445566' };
      }
      return null;
    }
  };

  const result = EbayParser.extractProductDetails(mockDoc);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.title, "New Bulova Wilton Men's Chronograph Quartz Watch");
  assert.strictEqual(result.data.price, 158.28);
  assert.strictEqual(result.data.shippingState, EbayParser.SHIPPING_STATE.KNOWN);
  assert.strictEqual(result.data.shippingCost, 8.72);
});

console.log(`\nParser Test Run Complete: ${passedTests}/${totalTests} Passed.\n`);
