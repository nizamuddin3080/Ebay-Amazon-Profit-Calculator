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

### Boundary Policies
1. **$C = 0$ (Zero Product Cost):** $S$ and $\Pi$ calculate normally. $\text{ROI}$ returns `null` and displays `"N/A (Zero Cost)"` to prevent division by zero.
2. **$C < 0$ (Negative Cost):** Strictly disallowed; throws validation error.
3. **$P < 0$ (Negative Target Profit):** Permitted mathematically; UI displays amber/rose `"Loss Leader"` warning.
4. **$R + T \ge 100\%$:** Denominator $\le 0$; halts calculation and displays error banner.
5. **$S < D$ ($S_{\text{no\_ship}} < 0$):** Card 2 displays `$0.00` with warning label: *"Shipping deduction ($9.98) exceeds selling price"*.
6. **NaN / $\pm\infty$:** Intercepted by `Number.isFinite()`; halts calculation cleanly.

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

## 4. Confirmed Architectural Decisions (ADR Registry)

1. **ADR-01: Floating In-Page Overlay over Browser Action Popup:** Selected to provide non-closing, persistent contextual feedback while scrolling item descriptions and inspecting photos.
2. **ADR-02: Targeted & Debounced MutationObserver:** 250ms trailing debounce attached strictly to price/shipping container nodes to capture variation updates without CPU thrashing.
3. **ADR-03: Shadow DOM Encapsulation:** Injected via `#ebay-amazon-profit-calc-host` with an open `ShadowRoot` to prevent CSS cross-contamination.
4. **ADR-04: Multi-Tab Storage Sync:** Listening to `chrome.storage.onChanged` ensures settings updates apply instantly across all open tabs.
5. **ADR-05: Independent Content Script Execution:** Content script executes autonomously without depending on service worker roundtrips for calculations.
6. **ADR-06: Principle of Least Privilege:** Declarative match patterns only (`/itm/*`); permissions restricted strictly to `storage`. No broad `host_permissions`.
7. **ADR-07: Host Element Singleton Guard:** Verifies existence of `#ebay-amazon-profit-calc-host` to prevent duplicate injection.
8. **ADR-08: Multi-Tiered Extraction Pipeline:** Prioritizes JSON-LD $\rightarrow$ DOM Selectors $\rightarrow$ Meta tags $\rightarrow$ Sanitized regex text fallback.
9. **ADR-09: Currency Parsing & Disambiguation:** Identifies currency before stripping characters; disambiguates US (`1,234.56`) and European (`1.234,56`) formats; pauses calculation on unknown currencies with zero speculative conversion.
10. **ADR-10: Dual Independent Manual Override State:** Separate `priceOverride` and `shippingOverride` flags; manual inputs preserved during variation changes; reset only on Item ID change.
11. **ADR-11: Three-State Shipping Model:** Formalizes `FREE`, `KNOWN`, and `UNKNOWN` states; never treats `UNKNOWN` as $0.00; pauses calculation while `UNKNOWN`.
12. **ADR-12: SPA Navigation & Isolated-World Realities:** Acknowledges content scripts cannot intercept page-world `pushState`; uses multi-strategy detection (`popstate`, `<head>` observer, background `webNavigation` message, 500ms URL poll) and full teardown on Item ID change.
13. **ADR-13: Manifest V3 Declarative Match Patterns vs Host Permissions:** Uses precise path globs in `content_scripts.matches` and avoids broad `host_permissions`.
14. **ADR-14: Controlled Git Workflow & Pre-Push Security Gates:** Prohibits automatic remote pushes; enforces git diff review, secret scanning, test verification, and explicit user approval before pushing.

---

## 5. Confirmed Scope & Boundaries

### Confirmed In-Scope (MVP)
- Automatic extraction of Title, Price, Shipping, Total Cost, URL, and Item ID.
- Currency parsing & European/US separator disambiguation.
- Three-State Shipping Model (`FREE`, `KNOWN`, `UNKNOWN`).
- Dual independent manual overrides with "Re-detect" actions.
- Target Profit, Estimated Profit, Margin %, and ROI % calculation.
- Draggable, minimizable floating calculator with reliable clipboard copy & error toasts.
- Options page with persistent storage and reset-to-defaults functionality.
- Targeted 250ms debounced variation observer.
- Multi-strategy SPA navigation with teardown.

### Confirmed Out-of-Scope (Forbidden in MVP)
- No Amazon scraping, ASIN lookup, or competitor price matching.
- No automated unauthenticated currency conversion.
- No historical charts or Keepa/camelcamelcamel API integrations.
- No CSV/Excel exports or bulk scrapers.
- No external user accounts, logins, or remote database sync.

---

## 6. Known Limitations & Technical Constraints

1. **Unauthenticated Foreign Currency:** If an item is listed in a non-USD currency without an official conversion, calculation is paused and requires manual USD entry.
2. **Untracked Freight / Pickup Shipping:** In rare cases where shipping requires contacting the seller or freight dispatch, eBay DOM provides no numerical value. The extension cleanly flags this as `UNKNOWN` and requires manual entry.
3. **Complex Nested Seller Iframes:** If an eBay seller embeds descriptions inside nested iframes, data is extracted from eBay's primary container, not the nested seller iframe.

---

## 7. Pending Decisions

*There are currently **zero** unresolved high-risk architectural decisions. All core formulas, lifecycle patterns, and UI states have been established, audited, and verified.*

---

## 8. Implementation Phase Tracker

| Phase | Description | Status | Target Completion |
| :--- | :--- | :---: | :---: |
| **Phase 1** | Architecture, Planning & Documentation | **COMPLETED** | 2026-11-01 |
| **Phase 2** | Pure Calculation Engine & Unit Tests | **COMPLETED** | 2026-11-01 |
| **Phase 3** | Multi-Tiered eBay Extraction Engine | Pending | Phase 3 |
| **Phase 4** | Floating Calculator UI & Shadow DOM | Pending | Phase 2 |
| **Phase 5** | Settings Page & Storage System | Pending | Phase 2 |
| **Phase 6** | End-to-End Integration & Dynamic Observers | Pending | Phase 2 |
| **Phase 7** | Comprehensive QA & Edge Case Matrix | Pending | Phase 2 |
| **Phase 8** | Release Packaging & Developer Sign-Off | Pending | Phase 2 |
