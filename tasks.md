# Development Task Breakdown: eBay to Amazon Profit Calculator

## Phase Status Summary

- [ ] **Phase 1: Project Foundation** (5 Tasks)
- [ ] **Phase 2: Calculation Engine** (8 Tasks)
- [ ] **Phase 3: eBay Extraction Engine** (9 Tasks)
- [ ] **Phase 4: Calculator UI & Shadow DOM** (6 Tasks)
- [ ] **Phase 5: Settings & Storage System** (7 Tasks)
- [ ] **Phase 6: Integration & Dynamic Observers** (5 Tasks)
- [ ] **Phase 7: Testing & Quality Assurance** (8 Tasks)
- [ ] **Phase 8: Release Preparation** (5 Tasks)

---

## Phase 1: Project Foundation

### TASK-1.1: Manifest V3 Configuration & Least-Privilege Permissions
- **Description:** Create `manifest.json` defining MV3 metadata, declarative content scripts with precise path patterns (`*://*.ebay.com/itm/*`, etc.), background service worker, and minimal `storage` permission. Exclude broad `host_permissions`.
- **Priority:** Critical
- **Dependencies:** None
- **Acceptance Criteria:** Validates cleanly under Chrome Developer Mode with zero permission warnings or unnecessary host permissions.
- **Status:** Pending

### TASK-1.2: Standard Project Folder Structure Scaffolding
- **Description:** Scaffold directories: `/utils`, `/icons`, `/popup`, `/settings`, and core script files.
- **Priority:** High
- **Dependencies:** TASK-1.1
- **Acceptance Criteria:** Directory layout strictly matches the architecture specification.
- **Status:** Pending

### TASK-1.3: Background Service Worker Lifecycle
- **Description:** Implement `background.js` to handle extension installation, set up default settings in `chrome.storage.local`, and listen to `webNavigation.onHistoryStateUpdated` for SPA transition routing.
- **Priority:** Medium
- **Dependencies:** TASK-1.1, TASK-1.2
- **Acceptance Criteria:** On install, `chrome.storage.local` is seeded with default parameters; service worker sleeps when idle.
- **Status:** Pending

### TASK-1.4: Icon & Asset Generation
- **Description:** Create clean, crisp 16x16, 48x48, and 128x128 extension icons reflecting the calculator/e-commerce theme.
- **Priority:** Low
- **Dependencies:** TASK-1.2
- **Acceptance Criteria:** Icons render crisply without scaling distortion on toolbar and extension management pages.
- **Status:** Pending

### TASK-1.5: Controlled Git Workflow & Pre-Push Security Gate Setup
- **Description:** Verify Git configuration adhering strictly to `AGENTS.md` (no automatic push; mandatory diff review, secret scanning, and explicit user approval).
- **Priority:** High
- **Dependencies:** TASK-1.2
- **Acceptance Criteria:** Clean working directory with remote tracking; pre-push review protocol established.
- **Status:** Pending

---

## Phase 2: Calculation Engine

### TASK-2.1: Pure Calculation Engine Architecture
- **Description:** Create `utils/calculator-engine.js` as an exportable, pure JavaScript mathematical module with zero DOM dependencies.
- **Priority:** Critical
- **Dependencies:** TASK-1.2
- **Acceptance Criteria:** Module runs independently in both browser and Node/testing environments with zero side effects.
- **Status:** Pending

### TASK-2.2: Selling Price With Shipping Calculation
- **Description:** Implement formula: `Selling Price = (C + P) / (1 - R - T)`.
- **Priority:** Critical
- **Dependencies:** TASK-2.1
- **Acceptance Criteria:** For $C = 50, P = 12, R = 0.15, T = 0.09$, returns exact unrounded float matching `$81.58` when formatted.
- **Status:** Pending

### TASK-2.3: Selling Price Without Shipping Calculation
- **Description:** Implement formula: `Price Without Shipping = Selling Price With Shipping - D`.
- **Priority:** Critical
- **Dependencies:** TASK-2.2
- **Acceptance Criteria:** For calculated price `$81.58` and deduction `$9.98$, returns exact float matching `$71.60`.
- **Status:** Pending

### TASK-2.4: Estimated Profit Formula
- **Description:** Implement formula: `Estimated Profit = Selling Price * (1 - R - T) - C`.
- **Priority:** High
- **Dependencies:** TASK-2.2
- **Acceptance Criteria:** Matches target profit $P$ within floating-point epsilon ($|Profit - P| < 0.01$).
- **Status:** Pending

### TASK-2.5: Profit Margin & ROI Formulas
- **Description:** Implement `Profit Margin = (Estimated Profit / Selling Price) * 100` and `ROI = (Estimated Profit / Cost) * 100`.
- **Priority:** High
- **Dependencies:** TASK-2.4
- **Acceptance Criteria:** For $C = 50$, yields Margin $\approx 14.7\%$ and ROI $\approx 24.0\%$.
- **Status:** Pending

### TASK-2.6: Input Validation, Division Safeguard & Boundary Policies
- **Description:** Implement comprehensive boundary validation: reject $C < 0$, guard against division by zero ($R + T \ge 100\%$), handle zero cost ($C = 0$) by returning `null` / `"N/A"` for ROI, clamp negative second selling price ($S < D$) with warning label, and guard against `NaN` and $\pm\infty$.
- **Priority:** Critical
- **Dependencies:** TASK-2.1
- **Acceptance Criteria:** Throws descriptive domain error or returns structured error state object on invalid inputs; never outputs `Infinity` or `NaN`.
- **Status:** Pending

### TASK-2.7: Currency Formatting & Precision Helpers
- **Description:** Create formatters for currency (2 decimal places with currency symbol) and percentages (1 decimal place).
- **Priority:** Medium
- **Dependencies:** TASK-2.1
- **Acceptance Criteria:** Correctly formats numbers without premature truncation during intermediate calculations.
- **Status:** Pending

### TASK-2.8: Unit Test Suite for Calculation Engine
- **Description:** Write comprehensive unit test script verifying Test Cases TC-01, TC-02, TC-03-A, TC-03-B, and boundary cases (TC-21, TC-22).
- **Priority:** High
- **Dependencies:** TASK-2.1 through TASK-2.7
- **Acceptance Criteria:** 100% of arithmetic test assertions pass.
- **Status:** Pending

---

## Phase 3: eBay Extraction Engine

### TASK-3.1: Extraction Engine Architecture & Pipeline
- **Description:** Create `utils/ebay-parser.js` implementing the four-tier fallback extraction pipeline.
- **Priority:** Critical
- **Dependencies:** TASK-1.2
- **Acceptance Criteria:** Pipeline gracefully proceeds through Tier 1 -> Tier 2 -> Tier 3 -> Tier 4 until valid data is parsed.
- **Status:** Pending

### TASK-3.2: Tier 1 JSON-LD Schema.org Extraction
- **Description:** Parse `<script type="application/ld+json">` for `@type: "Product"` to extract canonical name, price, currency, and offers.
- **Priority:** High
- **Dependencies:** TASK-3.1
- **Acceptance Criteria:** Successfully extracts valid product objects from modern eBay schema scripts.
- **Status:** Pending

### TASK-3.3: Tier 2 eBay DOM Selector Extraction (Price & Title)
- **Description:** Implement high-priority CSS selector queries for listed item price and title.
- **Priority:** Critical
- **Dependencies:** TASK-3.1
- **Acceptance Criteria:** Extracts prices across standard BIN (Buy It Now) and discount promo layouts.
- **Status:** Pending

### TASK-3.4: Three-State Shipping Engine (FREE, KNOWN, UNKNOWN)
- **Description:** Implement shipping selector parser recognizing "FREE" ($0.00), extracting valid amounts (KNOWN), and identifying ambiguous text ("See details", "Contact seller", "Freight") as UNKNOWN.
- **Priority:** Critical
- **Dependencies:** TASK-3.1
- **Acceptance Criteria:** Correctly sets shipping state. Never coerces UNKNOWN to $0.00; triggers calculation pause when UNKNOWN.
- **Status:** Pending

### TASK-3.5: Item ID & Canonical URL Extraction
- **Description:** Extract eBay Item ID from URL regex pattern (`/itm/(\d+)`) and canonical meta tags.
- **Priority:** Medium
- **Dependencies:** TASK-3.1
- **Acceptance Criteria:** Correctly isolates numeric item IDs on localized domains (`ebay.com`, `ebay.co.uk`, etc.).
- **Status:** Pending

### TASK-3.6: Tier 3 Meta Tags & Tier 4 Regex Parsing
- **Description:** Implement fallback parser querying `og:price:amount` and sanitized regex scans over `#mainContent`.
- **Priority:** Medium
- **Dependencies:** TASK-3.1
- **Acceptance Criteria:** Yields valid price on legacy eBay templates where modern classes are omitted.
- **Status:** Pending

### TASK-3.7: Currency Parsing & Disambiguation Engine
- **Description:** Build parser to identify currency symbol/code (USD, GBP, EUR, CAD, AUD) before stripping characters, handle US (`1,234.56`) and European (`1.234,56`) separator disambiguation, and flag unknown currencies.
- **Priority:** High
- **Dependencies:** TASK-3.1
- **Acceptance Criteria:** Accurately converts European formats; pauses calculation on unknown currencies without speculative conversion.
- **Status:** Pending

### TASK-3.8: Targeted & Debounced Dynamic Variation Monitor
- **Description:** Implement targeted `MutationObserver` on price and shipping containers with a 250ms trailing debounce and duplicate event suppression.
- **Priority:** High
- **Dependencies:** TASK-3.3, TASK-3.4
- **Acceptance Criteria:** Emits an update event only when price/shipping genuinely updates and DOM has stabilized.
- **Status:** Pending

### TASK-3.9: Extraction Engine Resilience & Mock Test Runner
- **Description:** Test parser against static HTML fixtures representing diverse eBay page variants.
- **Priority:** High
- **Dependencies:** TASK-3.1 through TASK-3.8
- **Acceptance Criteria:** Extraction succeeds without uncaught exceptions on all fixtures (TC-13 to TC-17).
- **Status:** Pending

---

## Phase 4: Calculator UI & Shadow DOM

### TASK-4.1: Shadow DOM Host & Style Injection
- **Description:** Construct host element `#ebay-amazon-profit-calc-host` and attach an open `ShadowRoot` containing reset tokens and scoped CSS.
- **Priority:** Critical
- **Dependencies:** TASK-1.2
- **Acceptance Criteria:** Zero style leakage from or into the eBay host document.
- **Status:** Pending

### TASK-4.2: Floating Calculator Markup & Layout
- **Description:** Build HTML template containing Header, Product Info, Settings Quick View, Price Cards, Profit Summary, Action Buttons, and Paused Banner.
- **Priority:** High
- **Dependencies:** TASK-4.1
- **Acceptance Criteria:** Markup matches `design.md` specifications exactly.
- **Status:** Pending

### TASK-4.3: Viewport Dragging & Boundary Constraints
- **Description:** Implement pointer-based dragging on header handle, constraining coordinates inside visible window.
- **Priority:** Medium
- **Dependencies:** TASK-4.2
- **Acceptance Criteria:** Calculator moves smoothly without lag and cannot be dragged off-screen.
- **Status:** Pending

### TASK-4.4: Minimized Pill State & Toggle Animation
- **Description:** Implement toggle logic collapsing the full calculator into compact pill showing live Amazon Price and Profit.
- **Priority:** Medium
- **Dependencies:** TASK-4.2
- **Acceptance Criteria:** Clean transition between expanded and minimized states with state persistence.
- **Status:** Pending

### TASK-4.5: Dual Independent Manual Input Controls & Re-Detect Actions
- **Description:** Connect price and shipping inputs to independent override states (`priceOverride`, `shippingOverride`) with `[MANUAL]` badges and `[↺]` Re-detect triggers.
- **Priority:** High
- **Dependencies:** TASK-4.2
- **Acceptance Criteria:** Typing a value locks only that field; variation updates preserve manual input while updating the other field.
- **Status:** Pending

### TASK-4.6: Robust Clipboard Copy & Error Feedback
- **Description:** Implement clipboard write functionality on both price cards with `navigator.clipboard.writeText`, fallback `execCommand`, emerald success toast, and rose error toast on failure.
- **Priority:** High
- **Dependencies:** TASK-4.2
- **Acceptance Criteria:** Copies exact formatted price; displays confirmation toast only upon verified success; displays error toast if copy fails.
- **Status:** Pending

---

## Phase 5: Settings & Storage System

### TASK-5.1: Storage Adapter Implementation
- **Description:** Create `utils/storage.js` to manage default configuration, read/write wrappers, and schema validation.
- **Priority:** Critical
- **Dependencies:** TASK-1.2
- **Acceptance Criteria:** Reads settings reliably with automatic fallback to defaults if unset.
- **Status:** Pending

### TASK-5.2: Options Page UI (settings.html & settings.css)
- **Description:** Create standalone settings page with cards for Commission %, Tax %, Target Profit $, and Shipping Deduction $.
- **Priority:** High
- **Dependencies:** TASK-5.1
- **Acceptance Criteria:** Clean, modern options UI compliant with `design.md`.
- **Status:** Pending

### TASK-5.3: Settings Page Controller & Validation
- **Description:** Implement `settings/settings.js` handling form inputs, numeric constraints, and save/reset triggers.
- **Priority:** High
- **Dependencies:** TASK-5.2
- **Acceptance Criteria:** Disallows non-numeric input and displays error if `Commission + Tax >= 100%`.
- **Status:** Pending

### TASK-5.4: Reset to Defaults Functionality
- **Description:** Provide one-click button restoring all settings to initial defaults (15% Comm, 9% Tax, $12 Profit, $9.98 Ded).
- **Priority:** Medium
- **Dependencies:** TASK-5.3
- **Acceptance Criteria:** Storage is restored to exact factory defaults and UI inputs refresh immediately.
- **Status:** Pending

### TASK-5.5: Reactive Cross-Tab Storage Synchronization
- **Description:** Listen to `chrome.storage.onChanged` in content script to update open calculator instances immediately.
- **Priority:** High
- **Dependencies:** TASK-5.1, TASK-4.2
- **Acceptance Criteria:** Saving new settings in options tab immediately recalculates pricing in existing eBay tabs without refresh.
- **Status:** Pending

### TASK-5.6: Browser Action Quick Popup
- **Description:** Implement `popup/popup.html` providing quick access to extension status and a direct link to the options page.
- **Priority:** Low
- **Dependencies:** TASK-5.1
- **Acceptance Criteria:** Opens cleanly from Chrome toolbar.
- **Status:** Pending

### TASK-5.7: Storage Error Handling & In-Memory Fallback
- **Description:** Implement memory fallback if `chrome.storage.local` is restricted or fails.
- **Priority:** Low
- **Dependencies:** TASK-5.1
- **Acceptance Criteria:** Calculator continues functioning using in-memory state if storage API throws.
- **Status:** Pending

---

## Phase 6: Integration & Dynamic Observers

### TASK-6.1: Content Script Master Controller
- **Description:** Build `content.js` to orchestrate parser, calculation engine, storage adapter, and UI components.
- **Priority:** Critical
- **Dependencies:** Phases 1, 2, 3, 4, 5
- **Acceptance Criteria:** Injects floating calculator on valid eBay product pages on `document_idle`.
- **Status:** Pending

### TASK-6.2: Single-Instance Verification & Teardown Guards
- **Description:** Implement singleton guard ensuring duplicate calculators are never injected into the same tab.
- **Priority:** High
- **Dependencies:** TASK-6.1
- **Acceptance Criteria:** Consecutive injection calls cleanly verify existence and abort without error.
- **Status:** Pending

### TASK-6.3: SPA Navigation Detection & Lifecycle Teardown
- **Description:** Implement multi-strategy SPA detection (`popstate`/`hashchange`, `<head>` observer, background `webNavigation` message, 500ms URL poll) with full teardown and manual override reset on Item ID change.
- **Priority:** High
- **Dependencies:** TASK-6.1
- **Acceptance Criteria:** Browsing between related eBay items cleanly disconnects old observers, clears timers, resets manual overrides, and extracts new item details.
- **Status:** Pending

### TASK-6.4: Debounced Targeted Observer for Dynamic Variants
- **Description:** Attach debounced (250ms) `MutationObserver` strictly to price and shipping containers to capture AJAX updates.
- **Priority:** High
- **Dependencies:** TASK-6.1
- **Acceptance Criteria:** Selecting a different size or color updates calculated Amazon prices within 300ms while preserving manual overrides.
- **Status:** Pending

### TASK-6.5: End-to-End State Re-Synchronization
- **Description:** Connect manual override state with dynamic observation to ensure manual edits are not overwritten prematurely.
- **Priority:** Medium
- **Dependencies:** TASK-6.4
- **Acceptance Criteria:** User-typed values remain intact until user navigates to a new item or clicks "Re-detect".
- **Status:** Pending

---

## Phase 7: Testing & Quality Assurance

### TASK-7.1: Automated Mathematical Test Verification (TC-01 to TC-03-B)
- **Description:** Run all core arithmetic test cases and log exact floating-point accuracy.
- **Priority:** Critical
- **Dependencies:** Phase 2, Phase 6
- **Acceptance Criteria:** Zero calculation discrepancies against Test Cases 1, 2, 3A, and 3B.
- **Status:** Pending

### TASK-7.2: Comprehensive Feature & Boundary Verification (TC-13 to TC-25)
- **Description:** Execute automated and manual test runs for currency parsing (TC-13, 14, 15), shipping states (TC-16, 17), overrides (TC-18, 19, 20), boundary limits (TC-21, 22), clipboard (TC-23), debounce (TC-24), and injection prevention (TC-25).
- **Priority:** Critical
- **Dependencies:** Phase 3, Phase 6
- **Acceptance Criteria:** 100% of test cases pass according to specified pass/fail criteria.
- **Status:** Pending

### TASK-7.3: Dynamic Variant Stress Test
- **Description:** Rapidly switch dropdown variations on multi-item listings to verify debounce and observer stability.
- **Priority:** High
- **Dependencies:** TASK-6.4
- **Acceptance Criteria:** No memory leaks, detached DOM nodes, or incorrect stale prices.
- **Status:** Pending

### TASK-7.4: Settings Persistence & Boundary Testing
- **Description:** Test extreme configuration values (0% tax, high profit, commission + tax = 99.9%).
- **Priority:** High
- **Dependencies:** Phase 5
- **Acceptance Criteria:** Extension remains stable and recalculates accurately under extreme inputs.
- **Status:** Pending

### TASK-7.5: Shadow DOM Isolation Verification
- **Description:** Inspect injected elements to confirm zero styles leak into eBay and no eBay styles alter the calculator.
- **Priority:** High
- **Dependencies:** Phase 4
- **Acceptance Criteria:** Calculator looks identical across varying host page stylesheets.
- **Status:** Pending

### TASK-7.6: Clipboard Copy Reliability Test
- **Description:** Verify clipboard copy across standard and secured browser contexts, testing fallback and error toast.
- **Priority:** Medium
- **Dependencies:** TASK-4.6
- **Acceptance Criteria:** Price copies to system clipboard reliably; error toast triggers cleanly if denied.
- **Status:** Pending

### TASK-7.7: Manifest V3 Security Audit
- **Description:** Verify compliance with Chrome Web Store CSP guidelines (no inline scripts, no remote code).
- **Priority:** Critical
- **Dependencies:** All previous tasks
- **Acceptance Criteria:** Extension passes automated Chrome extension linter with 0 errors.
- **Status:** Pending

### TASK-7.8: Performance & Memory Benchmark
- **Description:** Profile CPU and memory consumption in Chrome DevTools during extended browsing sessions.
- **Priority:** Medium
- **Dependencies:** All previous tasks
- **Acceptance Criteria:** Content script consumes < 15MB RAM and 0% idle CPU.
- **Status:** Pending

---

## Phase 8: Release Preparation

### TASK-8.1: Clean Production Build Assembly
- **Description:** Verify root directory files, eliminate development logs, and organize production manifest.
- **Priority:** High
- **Dependencies:** Phase 7
- **Acceptance Criteria:** Clean directory containing only required production assets.
- **Status:** Pending

### TASK-8.2: Developer Mode Installation Runbook Verification
- **Description:** Execute clean install via `chrome://extensions/` -> **Load unpacked** on fresh profile.
- **Priority:** Critical
- **Dependencies:** TASK-8.1
- **Acceptance Criteria:** Extension loads immediately with zero errors or warnings in Chrome Extensions dashboard.
- **Status:** Pending

### TASK-8.3: Documentation & README Finalization
- **Description:** Update `README.md` and `changelog.md` to reflect production release status.
- **Priority:** Medium
- **Dependencies:** TASK-8.1
- **Acceptance Criteria:** All documentation links and instructions are accurate and complete.
- **Status:** Pending

### TASK-8.4: Git Security Review & User-Authorized Remote Push
- **Description:** Execute pre-push checklist: Git diff review, secret scanning, test verification, and secure user approval before pushing `v1.0.0` to `origin main`.
- **Priority:** Critical
- **Dependencies:** TASK-8.1 through TASK-8.3
- **Acceptance Criteria:** Remote repository at `nizamuddin3080/Ebay-Amazon-Profit-Calculator` is up to date with clean commit history.
- **Status:** Pending

### TASK-8.5: Final Gate Sign-Off
- **Description:** Conduct final product readiness review against acceptance criteria before declaring Phase 1 complete.
- **Priority:** Critical
- **Dependencies:** All tasks
- **Acceptance Criteria:** Formal sign-off granted by Principal Architect.
- **Status:** Pending
