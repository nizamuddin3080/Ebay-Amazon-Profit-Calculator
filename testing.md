# Quality Assurance & Testing Strategy: eBay to Amazon Profit Calculator

## 1. Overview & Test Philosophy

The testing strategy for the **eBay to Amazon Profit Calculator** is designed around mathematical rigor, DOM resilience, and zero regression. Because the extension directly impacts a seller's financial calculations, rounding errors or formula discrepancies are classified as **Critical (P0) Defects**.

The test architecture encompasses four distinct testing tiers:
1. **Unit Testing:** Deterministic verification of mathematical formulas, currency formatters, and schema sanitizers.
2. **Integration Testing:** Verification of interaction between storage adapters, reactive configuration updates, and content controllers.
3. **DOM & Dynamic Variant Testing:** Verification against real-world HTML snapshots and simulated mutation events.
4. **End-to-End & Manual QA Runbooks:** Browser verification in Google Chrome Developer Mode across live eBay listings.

---

## 2. Core Mathematical Verification & Test Cases

### 2.1 Formula Reference
$$S = \frac{C + P}{1 - R - T}, \quad S_{\text{no\_ship}} = S - D$$
$$\Pi = S \times (1 - R - T) - C, \quad M = \left(\frac{\Pi}{S}\right) \times 100, \quad \text{ROI} = \left(\frac{\Pi}{C}\right) \times 100$$

Where:
- $C = \text{Total eBay Cost} = \text{Item Price} + \text{Shipping}$
- $R = \text{Amazon Commission Rate}$ (e.g., $15\% = 0.15$)
- $T = \text{Sales Tax Rate}$ (e.g., $9\% = 0.09$)
- $P = \text{Target Profit Amount}$
- $D = \text{Shipping Deduction}$ (Default: $\$9.98$)

---

### 2.2 Standard Benchmark Test Cases

#### Test Case 1: Standard Arbitrage Item ($50 Baseline)
- **Inputs:**
  - Product Cost ($C$): `$50.00`
  - Amazon Commission ($R$): `15.0%` (`0.15`)
  - Sales Tax ($T$): `9.0%` (`0.09`)
  - Target Profit ($P$): `$12.00`
  - Shipping Deduction ($D$): `$9.98`
- **Manual Step-by-Step Derivation:**
  1. Denominator: $1 - 0.15 - 0.09 = 0.76$
  2. Numerator: $50.00 + 12.00 = 62.00$
  3. Selling Price With Shipping ($S$): $\frac{62.00}{0.76} = 81.578947... \implies \mathbf{\$81.58}$
  4. Selling Price Without Shipping ($S_{\text{no\_ship}}$): $81.578947... - 9.98 = 71.598947... \implies \mathbf{\$71.60}$
  5. Estimated Profit ($\Pi$): $81.578947... \times 0.76 - 50.00 = 62.00 - 50.00 = \mathbf{\$12.00}$
  6. Profit Margin ($M$): $\left(\frac{12.00}{81.578947...}\right) \times 100 = 14.70967...\% \implies \mathbf{14.7\%}$
  7. ROI: $\left(\frac{12.00}{50.00}\right) \times 100 = \mathbf{24.0\%}$
- **Expected Results:**
  - With Shipping: **$81.58**
  - Without Shipping: **$71.60**
  - Estimated Profit: **$12.00**
  - Profit Margin: **14.7%**
  - ROI: **24.0%**
- **Test Status:** Verified mathematically.

---

#### Test Case 2: High-Value Item ($100 Cost)
- **Inputs:**
  - Product Cost ($C$): `$100.00`
  - Amazon Commission ($R$): `15.0%` (`0.15`)
  - Sales Tax ($T$): `9.0%` (`0.09`)
  - Target Profit ($P$): `$20.00`
  - Shipping Deduction ($D$): `$9.98`
- **Manual Step-by-Step Derivation:**
  1. Denominator: $1 - 0.24 = 0.76$
  2. Numerator: $100.00 + 20.00 = 120.00$
  3. Selling Price With Shipping ($S$): $\frac{120.00}{0.76} = 157.894736... \implies \mathbf{\$157.90}$
  4. Selling Price Without Shipping ($S_{\text{no\_ship}}$): $157.894736... - 9.98 = 147.914736... \implies \mathbf{\$147.92}$
  5. Estimated Profit ($\Pi$): $157.894736... \times 0.76 - 100.00 = \mathbf{\$20.00}$
  6. Profit Margin ($M$): $\left(\frac{20.00}{157.894736...}\right) \times 100 = 12.6666...\% \implies \mathbf{12.7\%}$
  7. ROI: $\left(\frac{20.00}{100.00}\right) \times 100 = \mathbf{20.0\%}$
- **Expected Results:**
  - With Shipping: **$157.90**
  - Without Shipping: **$147.92**
  - Estimated Profit: **$20.00**
  - Profit Margin: **12.7%**
  - ROI: **20.0%**
- **Test Status:** Verified mathematically.

---

#### Test Case 3: Low-Cost / Micro Item Analysis & Discrepancy Reconciliation
- **Analysis Note:**
  - Case 3A (Parameters yielding exact prompt output $59.21):
    - When Numerator $(C + P) = 45.00$ (e.g., $C = \$30.00, P = \$15.00$ or $C = \$40.00, P = \$5.00$):
      $$S = \frac{45.00}{0.76} = 59.2105... \implies \mathbf{\$59.21}$$
      $$S_{\text{no\_ship}} = 59.2105... - 9.98 = 49.2305... \implies \mathbf{\$49.23}$$
  - Case 3B (Strict literal inputs $C = \$30.00, P = \$5.00$):
    - Numerator: $30.00 + 5.00 = 35.00$
      $$S = \frac{35.00}{0.76} = 46.0526... \implies \mathbf{\$46.05}$$
      $$S_{\text{no\_ship}} = 46.0526... - 9.98 = 36.0726... \implies \mathbf{\$36.07}$$
      $$\text{Estimated Profit} = \mathbf{\$5.00}, \quad \text{Margin} = 10.9\%, \quad \text{ROI} = 16.7\%$$
- **Engineering Resolution:** The calculation engine implements the strict pure formula $\frac{C + P}{1 - R - T}$. Both parameter sets are codified into the automated test suite as `TC-03-A` (target result $59.21 verification) and `TC-03-B` (literal $30 / $5 parameter verification).

---

## 3. Boundary & Edge Case Test Matrix

| Case ID | Scenario Description | Input Parameters | Expected Behavior |
| :--- | :--- | :--- | :--- |
| **TC-EDGE-01** | Zero Shipping (Free Shipping) | Price: `$25.00`, Ship: `$0.00` | $C = \$25.00$. Calculation proceeds normally. No warnings. |
| **TC-EDGE-02** | Free Shipping Keywords | Text: `"Free 4-day shipping"` | Parser detects text keyword, normalizes to `$0.00`, displays green `FREE` pill. |
| **TC-EDGE-03** | Missing Shipping (Freight / Contact) | Text: `"See details"`, `"Freight"` | Parser sets shipping to `null`. UI marks shipping input in Amber with placeholder `Enter $`. Calc paused until manual input. |
| **TC-EDGE-04** | Out-of-Stock / Ended Listing | Listing has no Buy It Now or price | Parser returns `price: null`. UI displays clean prompt: *"Price unavailable. Enter manually."* |
| **TC-EDGE-05** | Division by Zero Guard | $R = 50.0\%, T = 50.0\%$ | Denominator $1 - 1.0 = 0$. Engine intercepts $R + T \ge 100\%$, displays warning toast, suppresses calculation. |
| **TC-EDGE-06** | Excessive Commission + Tax | $R = 60.0\%, T = 45.0\%$ ($105\%$) | Denominator negative ($-0.05$). Engine returns invalid state error; prevents negative prices. |
| **TC-EDGE-07** | Non-Numeric / String Ingestion | Price input typed as `"abc"` | Input sanitizer strips non-digits; if invalid, sets error state without throwing `NaN`. |
| **TC-EDGE-08** | Extreme Large Values | Price: `$99,999.00`, Target: `$5,000` | Formats cleanly with standard comma separators; no buffer overflow. |
| **TC-EDGE-09** | Dynamic Variant Switch | User changes size dropdown on eBay | `MutationObserver` triggers after 250ms debounce. Recalculates new prices without full page reload. |
| **TC-EDGE-10** | Manual Input Override | User types `$15.00` over `$12.00` | State marks `isManualOverride: true`. Preserves manual value despite subtle DOM restyling. |
| **TC-EDGE-11** | Clipboard Failure Fallback | Clipboard API permission denied | Falls back to hidden textarea `document.execCommand('copy')`. Displays feedback toast. |
| **TC-EDGE-12** | Local Storage Failure | `chrome.storage.local` throttled | Storage adapter falls back to in-memory default configuration; logs warning. |

---

## 4. DOM Extraction Verification Strategy

To guarantee that DOM updates or variations across eBay regions do not break extraction:
1. **Mock HTML Fixtures:** Create static HTML snapshots representing:
   - Modern eBay US Listing (`ux-textspans` layout)
   - UK / EU Listing (`ebay.co.uk`, comma decimal separator)
   - Variation Listing (Dropdowns for Color/Size)
   - Auction Listing with Buy It Now option
   - Listing with Freight / Pickup Shipping
2. **Selector Prioritization Checklist:**
   ```javascript
   // Tier 1: JSON-LD Structured Data
   document.querySelector('script[type="application/ld+json"]')
   // Tier 2: Modern CSS Selectors
   document.querySelector('[data-testid="x-price-primary"] span')
   document.querySelector('.x-price-primary .ux-textspans')
   // Tier 3: Meta tags
   document.querySelector('meta[property="og:price:amount"]')
   ```

---

## 5. Manual QA Runbook (Developer Mode Verification)

```
Step 1: Open Chrome and load unpacked extension from project root.
Step 2: Verify Extension icon appears in toolbar and background worker is registered.
Step 3: Open options page (chrome://extensions/ -> Options).
Step 4: Confirm default values:
        - Amazon Commission: 15%
        - Sales Tax: 9%
        - Target Profit: $12.00
        - Shipping Deduction: $9.98
Step 5: Navigate to live eBay product: https://www.ebay.com/itm/123456789
Step 6: Confirm floating calculator mounts at top-right inside Shadow DOM.
Step 7: Confirm title, price, and shipping populate automatically.
Step 8: Verify calculated "With Shipping" and "Without Shipping" prices match formula.
Step 9: Click [COPY PRICE] and paste into a text editor; verify exact dollar value pasted.
Step 10: Toggle variation dropdown (e.g. Size/Color); observe instant price update.
Step 11: Drag calculator to bottom-left; refresh page; verify position persists.
Step 12: Click minimize [─]; verify compact pill appears with live profit metrics.
```
