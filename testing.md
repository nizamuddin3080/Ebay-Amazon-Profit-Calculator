# Quality Assurance & Testing Strategy: eBay to Amazon Profit Calculator

## 1. Overview & Test Philosophy

The testing strategy for the **eBay to Amazon Profit Calculator** is designed around mathematical rigor, DOM resilience, least-privilege security, and zero regression. Because the extension directly impacts a seller's financial calculations, rounding errors, unvalidated shipping, or formula discrepancies are classified as **Critical (P0) Defects**.

The test architecture encompasses four distinct testing tiers:
1. **Unit Testing:** Deterministic verification of mathematical formulas, currency formatters, and schema sanitizers.
2. **Integration Testing:** Verification of interaction between storage adapters, reactive configuration updates, content controllers, and clipboard handlers.
3. **DOM & Dynamic Variant Testing:** Verification against real-world HTML snapshots, targeted MutationObservers, and simulated variant switches.
4. **End-to-End & Manual QA Runbooks:** Browser verification in Google Chrome Developer Mode across live eBay listings.

---

## 2. Core Mathematical Verification & Benchmark Test Cases

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

#### TC-01: Standard Arbitrage Item ($50 Baseline)
- **Input:** $C = \$50.00, R = 15.0\% (0.15), T = 9.0\% (0.09), P = \$12.00, D = \$9.98$.
- **Trigger:** Initial calculation execution.
- **Expected Result:**
  - Denominator: $1 - 0.15 - 0.09 = 0.76$
  - With Shipping ($S$): $62.00 / 0.76 = 81.5789... \implies \mathbf{\$81.58}$
  - Without Shipping ($S_{\text{no\_ship}}$): $81.5789... - 9.98 = 71.5989... \implies \mathbf{\$71.60}$
  - Estimated Profit ($\Pi$): $81.5789... \times 0.76 - 50.00 = \mathbf{\$12.00}$
  - Profit Margin ($M$): $(12.00 / 81.5789...) \times 100 = \mathbf{14.7\%}$
  - ROI: $(12.00 / 50.00) \times 100 = \mathbf{24.0\%}$
- **Pass/Fail Criteria:** All 5 values match exact formatted figures within $\pm\$0.01$ and $\pm 0.1\%$.

#### TC-02: High-Value Item ($100 Cost)
- **Input:** $C = \$100.00, R = 15.0\%, T = 9.0\%, P = \$20.00, D = \$9.98$.
- **Trigger:** Initial calculation execution.
- **Expected Result:**
  - With Shipping ($S$): $120.00 / 0.76 = 157.8947... \implies \mathbf{\$157.90}$
  - Without Shipping ($S_{\text{no\_ship}}$): $157.8947... - 9.98 = 147.9147... \implies \mathbf{\$147.92}$
  - Estimated Profit ($\Pi$): $\mathbf{\$20.00}$
  - Profit Margin ($M$): $(20.00 / 157.8947...) \times 100 = \mathbf{12.7\%}$
  - ROI: $(20.00 / 100.00) \times 100 = \mathbf{20.0\%}$
- **Pass/Fail Criteria:** All 5 values match exact formatted figures within $\pm\$0.01$ and $\pm 0.1\%$.

#### TC-03-A: Low-Cost Target Output Verification ($59.21 Benchmark)
- **Input:** Numerator $(C + P) = \$45.00$ (e.g. $C = \$30.00, P = \$15.00$ or $C = \$40.00, P = \$5.00$), $R = 15.0\%, T = 9.0\%, D = \$9.98$.
- **Trigger:** Calculation execution.
- **Expected Result:**
  - With Shipping ($S$): $45.00 / 0.76 = 59.2105... \implies \mathbf{\$59.21}$
  - Without Shipping ($S_{\text{no\_ship}}$): $59.2105... - 9.98 = 49.2305... \implies \mathbf{\$49.23}$
- **Pass/Fail Criteria:** Prices match $\$59.21$ and $\$49.23$ exactly.

#### TC-03-B: Low-Cost Literal Input Verification ($C = \$30, P = \$5$)
- **Input:** $C = \$30.00, P = \$5.00, R = 15.0\%, T = 9.0\%, D = \$9.98$.
- **Trigger:** Calculation execution.
- **Expected Result:**
  - With Shipping ($S$): $35.00 / 0.76 = 46.0526... \implies \mathbf{\$46.05}$
  - Without Shipping ($S_{\text{no\_ship}}$): $46.0526... - 9.98 = 36.0726... \implies \mathbf{\$36.07}$
  - Estimated Profit ($\Pi$): $\mathbf{\$5.00}$, Margin: $\mathbf{10.9\%}$, ROI: $\mathbf{16.7\%}$
- **Pass/Fail Criteria:** Prices match $\$46.05$ and $\$36.07$ exactly.

---

## 3. Comprehensive Feature & Boundary Test Suite (TC-13 through TC-25)

### TC-13: US Currency Parsing
- **Input:** Raw DOM strings `"US $1,234.56"`, `"$45.00"`, `"USD 19.99"`.
- **Trigger:** `EbayParser.parsePrice(rawString)`.
- **Expected Result:**
  - Currency identified as `USD`.
  - Commas identified as thousands separators; periods identified as decimal separators.
  - Returns clean floating-point numbers: `1234.56`, `45.00`, `19.99`.
- **Pass/Fail Criteria:** Numeric output matches float exactly; currency code equals `USD`.

### TC-14: European Currency Parsing
- **Input:** Raw DOM strings `"1.234,56 €"`, `"19,99 EUR"`, `"1 450,00 €"`.
- **Trigger:** `EbayParser.parsePrice(rawString)`.
- **Expected Result:**
  - Currency identified as `EUR`.
  - Periods or spaces identified as thousands separators; commas identified as decimal separators.
  - Returns clean normalized floats: `1234.56`, `19.99`, `1450.00`.
- **Pass/Fail Criteria:** Commas are converted to decimal dots; float values match normalized values.

### TC-15: Unknown or Ambiguous Currency
- **Input:** Raw DOM strings `"¥ 5,000"`, `"₹ 1,500"`, or ambiguous string `"1,234"` (conflicting single separator without context).
- **Trigger:** `EbayParser.parsePrice(rawString)`.
- **Expected Result:**
  - Parser flags currency state as `UNKNOWN_CURRENCY` or `AMBIGUOUS_FORMAT`.
  - No automatic exchange rate conversion is attempted.
  - Calculation state sets to `PAUSED`. UI displays warning: *"Unknown currency detected. Please enter USD cost manually."*
- **Pass/Fail Criteria:** Calculation engine does not output a speculative USD price; manual entry input is highlighted in amber.

### TC-16: Missing Shipping Handling
- **Input:** Listing DOM containing text `"Shipping: See details"`, `"Contact seller for shipping quote"`, or `"Freight pickup only"`.
- **Trigger:** `EbayParser.extractShippingDetails(document)`.
- **Expected Result:**
  - Shipping state set to `UNKNOWN`. Shipping value is `null`.
  - Shipping is **NOT** coerced to `$0.00`.
  - Total product cost displays `N/A`.
  - Calculation state enters `PAUSED_INCOMPLETE_COST`. UI displays amber input placeholder: `"Enter shipping $"`.
- **Pass/Fail Criteria:** No selling price is computed; system pauses until user inputs a valid shipping cost.

### TC-17: Confirmed Free Shipping
- **Input:** Listing DOM containing `"Free shipping"`, `"Fast 'N Free"`, or `"$0.00"`.
- **Trigger:** `EbayParser.extractShippingDetails(document)`.
- **Expected Result:**
  - Shipping state set to `FREE`. Shipping value is `0.00`.
  - Total product cost $C$ equals product price ($C = \text{Price} + 0$).
  - UI displays green `FREE` badge next to shipping input.
  - Calculation proceeds immediately.
- **Pass/Fail Criteria:** Shipping is registered as exactly `0.00` and prices calculate automatically.

### TC-18: Manual Price Override During Variation Changes
- **Input:** Listing has detected Price `$40.00`, Shipping `$5.00`. User manually edits Price input to `$55.00`. User then clicks a different color variation dropdown on eBay, which dynamically changes the eBay page's listed price to `$42.00`.
- **Trigger:** User `input` event on price field, followed by DOM mutation on price container.
- **Expected Result:**
  - `priceOverride.isOverridden` is `true` with value `$55.00`.
  - `shippingOverride.isOverridden` is `false`.
  - The DOM mutation observer detects the page price change to `$42.00`, but discards it for price because `priceOverride.isOverridden` is `true`.
  - Price field retains user's manual value `$55.00` with `[MANUAL]` badge.
  - Calculations continue using $C = 55.00 + 5.00 = \$60.00$.
- **Pass/Fail Criteria:** User manual price is NOT overwritten by the variation switch.

### TC-19: Manual Shipping Override During Variation Changes
- **Input:** Listing has detected Price `$40.00`, Shipping state `UNKNOWN`. User manually inputs Shipping `$7.50`. User then selects a different size variation on eBay, updating the eBay listed price to `$48.00`.
- **Trigger:** User inputs shipping, followed by eBay variation click mutating price node.
- **Expected Result:**
  - `shippingOverride.isOverridden` is `true` with value `$7.50`.
  - `priceOverride.isOverridden` is `false`.
  - DOM mutation observer detects price change to `$48.00`. Because price is not overridden, price field updates to `$48.00`.
  - Manual shipping `$7.50` is preserved.
  - Calculation automatically re-evaluates: $C = 48.00 + 7.50 = \$55.50$.
- **Pass/Fail Criteria:** Price updates dynamically to `$48.00` while manual shipping `$7.50` remains intact.

### TC-20: New Item ID Navigation (Complete Teardown & Reset)
- **Input:** User navigates from eBay Item ID `1111111111` (where manual overrides were active: Price `$50`, Ship `$10`) to Item ID `2222222222` via in-page link or search.
- **Trigger:** Canonical Item ID change detected via URL/canonical observer.
- **Expected Result:**
  - Active MutationObservers disconnect.
  - Timers clear.
  - `priceOverride.isOverridden` and `shippingOverride.isOverridden` reset to `false`.
  - Injected calculator resets state to `EXTRACTING`.
  - New item details for `2222222222` are parsed cleanly from scratch.
- **Pass/Fail Criteria:** Old manual overrides from the previous listing are completely cleared; new listing data is loaded.

### TC-21: Zero Product Cost Handling
- **Input:** Free sample product where Price `$0.00`, Shipping `$0.00` $\implies C = \$0.00$. Settings: $P = \$12.00, R = 15\%, T = 9\%$.
- **Trigger:** Calculation execution with $C = 0$.
- **Expected Result:**
  - With Shipping ($S$): $(0 + 12) / 0.76 = \mathbf{\$15.79}$.
  - Without Shipping ($S_{\text{no\_ship}}$): $15.79 - 9.98 = \mathbf{\$5.81}$.
  - Estimated Profit ($\Pi$): $15.789... \times 0.76 - 0 = \mathbf{\$12.00}$.
  - Profit Margin: $(12 / 15.789...) \times 100 = \mathbf{76.0\%}$.
  - ROI: Formula $\Pi / C = 12 / 0 \implies \text{division by zero}$. Engine returns `null`; UI displays `"N/A (Zero Cost)"`.
  - No `Infinity` or `NaN` rendered anywhere.
- **Pass/Fail Criteria:** $S$ and $\Pi$ calculate correctly; ROI displays `"N/A (Zero Cost)"` without script error.

### TC-22: Negative Second Selling Price Policy ($S < D$)
- **Input:** Micro item with Cost $C = \$1.00$, Target Profit $P = \$1.00$. Settings: $R = 15\%, T = 9\%, D = \$9.98$.
- **Trigger:** Calculation execution.
- **Expected Result:**
  - With Shipping ($S$): $(1 + 1) / 0.76 = \mathbf{\$2.63}$.
  - Without Shipping raw math: $2.63 - 9.98 = \mathbf{-\$7.35}$.
  - Policy enforcement: Card 2 displays `$0.00` with warning sublabel: *"Shipping deduction ($9.98) exceeds selling price"*.
- **Pass/Fail Criteria:** No negative currency value is presented to the user; warning badge is displayed.

### TC-23: Clipboard API Failure & Fallback Handling
- **Input:** User clicks `[COPY PRICE]` button when document is out of focus or `navigator.clipboard.writeText` rejects with `NotAllowedError`.
- **Trigger:** Click on copy button resulting in primary clipboard Promise rejection.
- **Expected Result:**
  - Catch handler triggers fallback `document.execCommand('copy')` using an ephemeral textarea in the Shadow Root.
  - If fallback succeeds: Shows emerald toast `"Copied!"`.
  - If both primary and fallback fail: Does **NOT** display `"Copied!"`. Displays rose error toast: *"Copy failed — please select manually"*.
- **Pass/Fail Criteria:** Zero false-positive "Copied!" notifications when the clipboard buffer is not updated.

### TC-24: Rapid Dynamic Variation Changes (Debounce Stress Test)
- **Input:** User rapidly clicks 5 variation dropdown options within 400ms on a multi-variant listing.
- **Trigger:** High-frequency consecutive DOM mutations.
- **Expected Result:**
  - 250ms trailing debounce timer restarts on each mutation event.
  - Intermediate transient DOM states are suppressed.
  - Exactly one parse execution occurs 250ms after the final click.
  - Calculations update accurately reflecting the final selected variation.
- **Pass/Fail Criteria:** Exactly 1 calculation update executed; no CPU lockup or duplicate UI renders.

### TC-25: Non-eBay Website Injection Prevention
- **Input:** Browser navigates to `https://www.amazon.com`, `https://www.google.com`, or `https://www.ebay.com/usr/sellername` (non-item page).
- **Trigger:** Extension loads on non-item URLs.
- **Expected Result:**
  - Extension content script is **NOT** injected.
  - No DOM elements are created in `#ebay-amazon-profit-calc-host`.
  - Zero console logs or errors on non-item pages.
- **Pass/Fail Criteria:** Verify `#ebay-amazon-profit-calc-host` is `null` on non-item pages.

---

## 4. Manual QA Runbook (Developer Mode Verification)

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
Step 6: Confirm floating calculator mounts inside Shadow DOM.
Step 7: Confirm title, price, and shipping populate automatically.
Step 8: Verify calculated "With Shipping" and "Without Shipping" prices match formula.
Step 9: Test manual shipping override: Type $4.50; verify recalculation and [MANUAL] tag.
Step 10: Toggle variation dropdown (e.g. Size/Color); observe price updates while manual shipping stays $4.50.
Step 11: Click [COPY PRICE] and paste into a text editor; verify exact dollar value pasted.
Step 12: Click minimize [─]; verify compact pill appears with live profit metrics.
Step 13: Navigate to another item; verify manual overrides reset and new item is parsed cleanly.
```
