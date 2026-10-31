# eBay to Amazon Profit Calculator

A lightweight, high-performance, and privacy-first Google Chrome Extension (Manifest V3) engineered to streamline cross-platform retail arbitrage and dropshipping workflows between eBay and Amazon.

---

> **Status:** Production Ready (Version 1.0.0)  
> **Target Manifest Version:** Manifest V3  
> **Source Code Status:** Fully Implemented & Tested (64/64 Automated Tests Passing)

---

## 1. Project Overview

The **eBay to Amazon Profit Calculator** automatically detects product parameters directly on eBay Product Details Pages (title, listed price, shipping cost, item ID, and canonical URL) and instantly calculates the required Amazon selling price to secure a specified target net profit.

Sellers often face significant friction and calculation errors when pricing products on Amazon sourced from eBay. Factoring in Amazon referral commission fees (default 15%), sales tax impact (default 9%), desired net profit, and optional customer shipping deductions ($9.98) requires multi-step algebra. This extension eliminates manual math by injecting an unobtrusive, reactive floating calculator directly into the eBay viewport.

### Primary Objectives
- **Zero Friction:** Automatic extraction upon navigating to any active eBay product listing (`/itm/*`).
- **Accurate Math:** Exact algebraic formula factoring in referral fees, taxes, and profit margins.
- **Dynamic Adaptability:** Real-time recalculation upon eBay variant selection (size, color, condition) without full page reload.
- **Total Privacy & Speed:** 100% client-side execution; zero external servers, tracking, analytics, or third-party dependencies.
- **Manual Resilience:** Instant independent fallback to manual inputs if shipping or price is ambiguous or missing.

---

## 2. Core Features (Implemented)

| Feature | Description | Status |
| :--- | :--- | :---: |
| **Automatic Extraction** | Extracts title, price, shipping cost, item ID, and URL via a multi-tiered fallback engine (JSON-LD & DOM). | **Completed** |
| **Currency Disambiguation** | Distinguishes US (`1,234.56`) and European (`1.234,56`) formats; pauses calculation on unknown currencies with zero speculative conversion. | **Completed** |
| **Three-State Shipping Model** | Explicitly models `FREE` ($0.00), `KNOWN` (valid amount), and `UNKNOWN` (missing/ambiguous; pauses calculation). | **Completed** |
| **Dual Manual Overrides** | Separate overrides for Price and Shipping; variation changes preserve manual inputs while updating non-overridden fields. | **Completed** |
| **Dynamic Variation Detection** | Targeted 250ms debounced observer for option/variant switches with duplicate event suppression. | **Completed** |
| **Profit Calculation Engine** | Computes Amazon Selling Price (With & Without Shipping), Estimated Net Profit, Profit Margin (%), and ROI (%). | **Completed** |
| **Boundary Policy Enforcement** | Handles zero cost ($C=0$ with ROI N/A), guards against $R+T \ge 100\%$, clamps negative second price ($S < D$), and warns on negative target profit. | **Completed** |
| **Floating Calculator UI** | Encapsulated inside a Shadow DOM (`#ebay-amazon-profit-calc-host`) to guarantee zero CSS conflicts with eBay's layout. Draggable and minimizable. | **Completed** |
| **Dual Selling Price Display** | Displays Amazon Price With Shipping and Amazon Price Without Shipping ($9.98 deduction). | **Completed** |
| **Reliable Clipboard Actions** | Dedicated copy buttons with primary write, execCommand fallback, and honest error handling (no false success). | **Completed** |
| **Persistent Configuration** | Stores commission rate, sales tax rate, target profit, and shipping deduction locally via `chrome.storage.local`. Options page + Toolbar popup. | **Completed** |

---

## 3. Technology Stack

- **Platform:** Google Chrome Extension Platform (Chromium-based browsers)
- **Manifest Version:** Manifest V3
- **Languages:** HTML5, CSS3, Vanilla JavaScript (ES2022+)
- **APIs Used:**
  - `chrome.storage.local` (Persistent user settings and state)
  - `chrome.runtime` (Message passing and asset resolution)
  - `Clipboard API` (`navigator.clipboard` with `document.execCommand` fallback)
  - `MutationObserver` (Targeted dynamic page parsing)
- **Permissions:** Strictly `storage`. In `manifest.json`, declarative `content_scripts.matches` with exact `/itm/*` path wildcards are used without broad `host_permissions`.
- **External Dependencies:** **0 (Zero)**. No npm packages, external fonts, or analytics scripts are bundled at runtime.

---

## 4. Mathematical Engine & Formulas

All calculations use internal high-precision floats and format numbers to 2 decimal places for currency and 1 decimal place for percentages:

$$\text{Selling Price With Shipping } (S) = \frac{C + P}{1 - R - T}$$
$$\text{Selling Price Without Shipping } (S_{\text{no\_ship}}) = S - D$$
$$\text{Estimated Profit } (\Pi) = S \times (1 - R - T) - C$$
$$\text{Profit Margin } (M) = \left(\frac{\Pi}{S}\right) \times 100$$
$$\text{Return on Investment } (\text{ROI}) = \left(\frac{\Pi}{C}\right) \times 100$$

Where:
- $C = \text{Total eBay Cost} = \text{Product Price} + \text{Shipping Cost}$
- $R = \text{Amazon Referral Commission Rate}$ (Default: `15.0%` / `0.15`)
- $T = \text{Sales Tax Rate}$ (Default: `9.0%` / `0.09`)
- $P = \text{Target Profit}$ (Default: `$12.00`)
- $D = \text{Shipping Deduction}$ (Default: `$9.98`, applied exclusively to $S_{\text{no\_ship}}$)

---

## 5. Folder Structure

```
EbayAmazonProfitCalculator/
├── AGENTS.md                  # Workspace & Agent operational rules (Git workflow)
├── README.md                  # Project overview and index
├── plan.md                    # Product requirements and roadmap
├── architecture.md            # Technical specifications and diagrams (ADR-01 to ADR-14)
├── design.md                  # UI/UX design tokens and layout specs
├── tasks.md                   # Granular task tracking across phases
├── rules.md                   # Strict development and coding rules
├── testing.md                 # QA test suite (TC-01 to TC-25)
├── memory.md                  # Persistent architecture decision log
├── changelog.md               # Version changelog
├── planning-audit.md          # Pre-development audit report
│
├── manifest.json              # MV3 configuration
├── background.js              # Service worker lifecycle handler
├── content.js                 # Master content script coordinator
├── calculator.js              # Floating calculator UI controller & Shadow DOM mounting
├── styles.css                 # Encapsulated Shadow DOM stylesheet
│
├── popup/                     # Toolbar Browser Action Popup
│   ├── popup.html             
│   ├── popup.js               
│   └── popup.css              
│
├── settings/                  # Dedicated Extension Options Page
│   ├── settings.html          
│   ├── settings.js            
│   └── settings.css           
│
├── utils/                     # Pure business logic modules
│   ├── calculator-engine.js   # Pure math calculation module
│   ├── ebay-parser.js         # Multi-tiered DOM/JSON-LD parser
│   └── storage.js             # LocalStorage & chrome.storage adapter
│
├── icons/                     # Extension branding assets
│   ├── icon16.png             
│   ├── icon48.png             
│   └── icon128.png            
│
├── scripts/                   # Build and utility scripts
│   └── generate-icons.js      
│
└── tests/                     # Comprehensive test suites
    ├── test-calculator.js     # Calculation engine unit tests
    ├── test-parser.js         # eBay parser unit tests
    ├── test-calculator-ui.js  # UI rendering and interaction tests
    ├── test-storage.js        # Storage adapter unit tests
    ├── test-integration.js    # Controller and lifecycle integration tests
    └── test-qa-suite.js       # Phase 7 full QA & E2E verification suite
```

---

## 6. Installation & Developer Mode Runbook

Follow these steps to load the extension in Google Chrome:

1. Clone or download this repository:
   ```bash
   git clone https://github.com/nizamuddin3080/Ebay-Amazon-Profit-Calculator.git
   ```
2. Open Google Chrome and navigate to:
   ```
   chrome://extensions/
   ```
3. Enable **Developer mode** toggle in the top-right corner.
4. Click the **Load unpacked** button in the top-left toolbar.
5. In the file picker, select the `EbayAmazonProfitCalculator` project directory.
6. Verify that **eBay to Amazon Profit Calculator (v1.0.0)** appears with its icon and active service worker.
7. Navigate to any live eBay item listing (e.g. `https://www.ebay.com/itm/123456789`) to view the floating profit calculator in action.

---

## 7. Running the Automated Test Suites

All tests run via standard Node.js without requiring external testing frameworks or dependencies:

```bash
# Run all 6 test suites (64 tests total)
node tests/test-calculator.js
node tests/test-parser.js
node tests/test-calculator-ui.js
node tests/test-storage.js
node tests/test-integration.js
node tests/test-qa-suite.js
```

---

## 8. Development Workflow & Git Synchronization

- **Repository:** `https://github.com/nizamuddin3080/Ebay-Amazon-Profit-Calculator.git`
- **Target Branch:** `main`
- **Policy:** In accordance with [AGENTS.md](file:///c:/Users/h/Music/Chrome%20Extensions/EbayAmazonProfitCalculator/AGENTS.md), all remote pushes require a completed pre-push review (Git diff review, secret scanning, test verification) and **explicit user approval**.
