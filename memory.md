# Project Memory & Architectural Decision Log

## 1. Project Identity & Purpose

- **Project Name:** eBay to Amazon Profit Calculator
- **Platform:** Google Chrome Extension (Manifest V3)
- **Primary Purpose:** Enable cross-platform e-commerce sellers and dropshippers to instantly compute accurate Amazon selling prices directly within eBay product detail pages, factoring in platform fees, taxes, and shipping allowances without leaving the page.
- **Git Repository:** `https://github.com/nizamuddin3080/Ebay-Amazon-Profit-Calculator.git`
- **Active Branch:** `main`

---

## 2. Core Business Logic & Invariant Formulas

All components must adhere strictly to these unrounded internal formulas:

$$\text{Selling Price With Shipping } (S) = \frac{C + P}{1 - R - T}$$
$$\text{Selling Price Without Shipping } (S_{\text{no\_ship}}) = S - D$$
$$\text{Estimated Profit } (\Pi) = S \times (1 - R - T) - C$$
$$\text{Profit Margin } (M) = \left(\frac{\Pi}{S}\right) \times 100$$
$$\text{Return on Investment } (\text{ROI}) = \left(\frac{\Pi}{C}\right) \times 100$$

### Key Variable Invariant Definitions
- $C = \text{Total eBay Cost} = \text{Product Price} + \text{Shipping Cost}$
- $R = \text{Amazon Referral Commission Rate}$ (Default: `0.15` for 15%)
- $T = \text{Sales Tax Rate}$ (Default: `0.09` for 9%)
- $P = \text{Target Profit}$ (Default: `$12.00`)
- $D = \text{Shipping Deduction}$ (Default: `$9.98`)
- **Crucial Invariant:** The shipping deduction $D$ ($9.98) is applied **exclusively** to derive the second display price. It is **never** deducted from $C$ or $P$ in the primary calculation.

---

## 3. Default Configuration Registry

| Configuration Key | Type | Default Value | Configurable | Storage Area |
| :--- | :--- | :--- | :---: | :--- |
| `amazonCommissionRate` | Number (Percent) | `15.0` | Yes | `chrome.storage.local` |
| `sellTaxRate` | Number (Percent) | `9.0` | Yes | `chrome.storage.local` |
| `targetProfitAmount` | Number (Dollars) | `12.00` | Yes | `chrome.storage.local` |
| `shippingDeduction` | Number (Dollars) | `9.98` | Yes | `chrome.storage.local` |
| `uiPosition` | Object `{x, y}` | `null` (auto top-right) | Dynamic | `chrome.storage.local` |
| `isMinimized` | Boolean | `false` | Dynamic | `sessionStorage` / `local` |

---

## 4. Confirmed Architectural Decisions (ADR Summary)

1. **Floating In-Page Overlay over Browser Action Popup:**
   Selected to provide non-closing, persistent contextual feedback while scrolling item descriptions and inspecting photos.
2. **Shadow DOM Encapsulation:**
   Injected via `#ebay-amazon-profit-calc-host` with an open `ShadowRoot` to prevent eBay's CSS from contaminating the calculator and vice versa.
3. **Multi-Tiered Extraction Engine:**
   Tier 1 (JSON-LD) $\rightarrow$ Tier 2 (DOM Selectors) $\rightarrow$ Tier 3 (Meta Tags) $\rightarrow$ Tier 4 (Sanitized Fallback Regex).
4. **Debounced MutationObserver for Variation Changes:**
   250ms debounce observer attached to primary price containers to capture AJAX updates when users toggle size/color dropdowns.
5. **Manual Override Coexistence:**
   If a user types into price/shipping fields, an `isManualOverride` flag protects their input from being overwritten by DOM mutations until navigation to a new item ID occurs.
6. **Reactive Cross-Tab Storage:**
   Listening to `chrome.storage.onChanged` ensures settings updates on the Options page apply instantly to all open eBay tabs without reloading.
7. **Principle of Least Privilege:**
   Only `storage` permission and targeted host match patterns (`*://*.ebay.com/itm/*`, etc.) are requested. Zero network telemetry or remote backends.

---

## 5. Confirmed Scope & Boundaries

### Confirmed In-Scope (MVP)
- Automatic extraction of Title, Price, Shipping, Total Cost, URL, and Item ID.
- Calculation of With Shipping Price, Without Shipping Price, Estimated Profit, Margin %, and ROI %.
- Draggable, minimizable floating calculator with one-click clipboard copying.
- Manual price/shipping correction fields.
- Dynamic variation detection.
- Options page with persistent storage and reset-to-defaults functionality.

### Confirmed Out-of-Scope (Forbidden in MVP)
- No Amazon scraping, ASIN lookup, or competitor price matching.
- No historical charts or Keepa/camelcamelcamel API integrations.
- No CSV/Excel exports or bulk scrapers.
- No external user accounts, logins, or remote database sync.

---

## 6. Known Limitations & Technical Constraints

1. **Regional Currencies:** Mathematical formulas assume dollar or decimal-normalized values. If a listing is in a foreign currency without conversion (e.g., JPY without decimals), the seller must input normalized figures manually.
2. **Untracked Freight / Pickup Shipping:** In rare cases where shipping requires contacting the seller or freight dispatch, eBay DOM provides no numerical value. The extension cleanly flags this as `N/A` and requires manual input.
3. **Complex Shadow DOM / Iframe Listings:** If an eBay seller embeds descriptions inside nested iframes, data is extracted from eBay's primary container, not the nested seller iframe.

---

## 7. Pending Decisions

*There are currently **zero** unresolved high-risk architectural decisions. All core formulas, lifecycle patterns, and UI states have been established and verified.*

---

## 8. Implementation Phase Tracker

| Phase | Description | Status | Target Completion |
| :--- | :--- | :---: | :---: |
| **Phase 1** | Architecture, Planning & Documentation | **COMPLETED** | 2026-11-01 |
| **Phase 2** | Pure Calculation Engine & Unit Tests | Pending | Phase 2 Start |
| **Phase 3** | Multi-Tiered eBay Extraction Engine | Pending | Phase 2 |
| **Phase 4** | Floating Calculator UI & Shadow DOM | Pending | Phase 2 |
| **Phase 5** | Settings Page & Storage System | Pending | Phase 2 |
| **Phase 6** | End-to-End Integration & Dynamic Observers | Pending | Phase 2 |
| **Phase 7** | Comprehensive QA & Edge Case Matrix | Pending | Phase 2 |
| **Phase 8** | Release Packaging & Developer Sign-Off | Pending | Phase 2 |
