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

### TASK-1.1: Manifest V3 Configuration & Permissions
- **Description:** Create `manifest.json` defining MV3 metadata, content scripts, background service worker, host permissions for eBay domains, and local storage permissions.
- **Priority:** Critical
- **Dependencies:** None
- **Acceptance Criteria:** Validates cleanly under Chrome Developer Mode with zero permission warnings or deprecated keys.
- **Status:** Pending

### TASK-1.2: Standard Project Folder Structure Scaffolding
- **Description:** Scaffold directories: `/utils`, `/icons`, `/popup`, `/settings`, and core script files.
- **Priority:** High
- **Dependencies:** TASK-1.1
- **Acceptance Criteria:** Directory layout strictly matches the architecture specification.
- **Status:** Pending

### TASK-1.3: Background Service Worker Lifecycle
- **Description:** Implement `background.js` to handle extension installation, set up default settings in `chrome.storage.local`, and log lifecycle status.
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

### TASK-1.5: Workspace Version Control Sync Check
- **Description:** Verify Git remote tracking and ensure pre-commit status adheres to `AGENTS.md` guidelines.
- **Priority:** High
- **Dependencies:** TASK-1.2
- **Acceptance Criteria:** Clean working directory with active tracking against `origin/main`.
- **Status:** Pending

---

## Phase 2: Calculation Engine

### TASK-2.1: Pure Calculation Engine Architecture
- **Description:** Create `utils/calculator-engine.js` as an exportable, pure JavaScript mathematical module with zero DOM dependencies.
- **Priority:** Critical
- **Dependencies:** TASK-1.2
- **Acceptance Criteria:** Module runs independently in both browser and Node/testing environments.
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
- **Acceptance Criteria:** For calculated price `$81.58` and deduction `$9.98`, returns exact float matching `$71.60`.
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

### TASK-2.6: Input Validation & Boundary Division Safeguard
- **Description:** Validate all numerical parameters. Enforce: $C \ge 0$, $P \in \mathbb{R}$, $D \ge 0$, and $R + T < 1.0$.
- **Priority:** Critical
- **Dependencies:** TASK-2.1
- **Acceptance Criteria:** Throws descriptive domain error or returns error state object when $R + T \ge 1.0$; never outputs `Infinity` or `NaN`.
- **Status:** Pending

### TASK-2.7: Currency Formatting & Precision Helpers
- **Description:** Create formatters for currency (2 decimal places with currency symbol) and percentages (1 decimal place).
- **Priority:** Medium
- **Dependencies:** TASK-2.1
- **Acceptance Criteria:** Correctly formats numbers without premature truncation during intermediate calculations.
- **Status:** Pending

### TASK-2.8: Unit Test Suite for Calculation Engine
- **Description:** Write comprehensive unit test script verifying Test Cases 1, 2, and 3, plus boundary cases.
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
- **Description:** Parse `<script type="application/ld+json">` for `@type: "Product"` to extract canonical name, price, and currency.
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

### TASK-3.4: Shipping Detection & Free Shipping Heuristics
- **Description:** Implement shipping selector parser. Recognize "FREE", "$0", "Fast 'N Free", or parse exact shipping values.
- **Priority:** Critical
- **Dependencies:** TASK-3.1
- **Acceptance Criteria:** Distinguishes between explicitly free shipping ($0.00) and missing/uncalculated shipping (returns `null` / `N/A`).
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

### TASK-3.7: Currency Normalization Utility
- **Description:** Build parser to clean raw text strings (e.g. `"US $45.99/ea"`, `"GBP 12.50"`, `"EUR 19,95"`) into clean numerical floats.
- **Priority:** High
- **Dependencies:** TASK-3.1
- **Acceptance Criteria:** Accurately converts comma-delimited European formats and strips extraneous currency symbols.
- **Status:** Pending

### TASK-3.8: Dynamic Product Variation Monitor
- **Description:** Implement observer hooks to detect when size, color, or quantity dropdowns trigger price mutations.
- **Priority:** High
- **Dependencies:** TASK-3.3, TASK-3.4
- **Acceptance Criteria:** Emits an `itemUpdated` event when variant switch completes.
- **Status:** Pending

### TASK-3.9: Extraction Engine Resilience & Mock Test Runner
- **Description:** Test parser against static HTML fixtures representing 5 distinct eBay page variants.
- **Priority:** High
- **Dependencies:** TASK-3.1 through TASK-3.8
- **Acceptance Criteria:** Extraction succeeds without uncaught exceptions on all fixtures.
- **Status:** Pending

---

## Phase 4: Calculator UI & Shadow DOM

### TASK-4.1: Shadow DOM Host & Style Injection
- **Description:** Construct the host element `#ebay-amazon-profit-calc-host` and attach an open `ShadowRoot` containing reset tokens and scoped CSS.
- **Priority:** Critical
- **Dependencies:** TASK-1.2
- **Acceptance Criteria:** Zero style leakage from or into the eBay host document.
- **Status:** Pending

### TASK-4.2: Floating Calculator Markup & Hierarchy
- **Description:** Build the HTML template containing Header, Product Info, Settings Quick View, Price Cards, Profit Summary, and Action Buttons.
- **Priority:** High
- **Dependencies:** TASK-4.1
- **Acceptance Criteria:** Markup matches `design.md` specifications exactly.
- **Status:** Pending

### TASK-4.3: Viewport Dragging & Boundary Constraints
- **Description:** Implement pointer-based dragging on the header handle, constraining coordinates inside the visible window.
- **Priority:** Medium
- **Dependencies:** TASK-4.2
- **Acceptance Criteria:** Calculator moves smoothly without lag and cannot be dragged off-screen.
- **Status:** Pending

### TASK-4.4: Minimized Pill State & Toggle Animation
- **Description:** Implement toggle logic collapsing the full calculator into the compact pill showing live Amazon Price and Profit.
- **Priority:** Medium
- **Dependencies:** TASK-4.2
- **Acceptance Criteria:** Clean transition between expanded and minimized states with state persistence.
- **Status:** Pending

### TASK-4.5: Manual Input Controls & Two-Way Binding
- **Description:** Connect price and shipping input elements to internal state with input debouncing and visual `[EDITED]` tags.
- **Priority:** High
- **Dependencies:** TASK-4.2
- **Acceptance Criteria:** Typing a new value updates calculations in real time without lag.
- **Status:** Pending

### TASK-4.6: One-Click Clipboard Copying & Toast Notification
- **Description:** Implement clipboard write functionality on both price cards with an animated "Copied!" feedback badge.
- **Priority:** High
- **Dependencies:** TASK-4.2
- **Acceptance Criteria:** Copies exact formatted price (e.g., `81.58`) and displays confirmation toast for 1500ms.
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
- **Description:** Create the standalone settings page with cards for Commission %, Tax %, Target Profit $, and Shipping Deduction $.
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
- **Description:** Provide a one-click button restoring all settings to initial defaults (15% Comm, 9% Tax, $12 Profit, $9.98 Ded).
- **Priority:** Medium
- **Dependencies:** TASK-5.3
- **Acceptance Criteria:** Storage is restored to exact factory defaults and UI inputs refresh immediately.
- **Status:** Pending

### TASK-5.5: Reactive Cross-Tab Storage Synchronization
- **Description:** Listen to `chrome.storage.onChanged` in the content script to update open calculator instances immediately.
- **Priority:** High
- **Dependencies:** TASK-5.1, TASK-4.2
- **Acceptance Criteria:** Saving new settings in the options tab immediately recalculates pricing in existing eBay tabs without refresh.
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

### TASK-6.3: SPA & History API Navigation Detection
- **Description:** Detect eBay client-side page transitions via `popstate` and `pushState` wrappers, triggering re-extraction when Item ID changes.
- **Priority:** High
- **Dependencies:** TASK-6.1
- **Acceptance Criteria:** Browsing between related eBay items smoothly resets state and loads new product metrics.
- **Status:** Pending

### TASK-6.4: Debounced Mutation Observer for Dynamic Variants
- **Description:** Attach a debounced (250ms) `MutationObserver` to eBay price containers to capture AJAX price updates.
- **Priority:** High
- **Dependencies:** TASK-6.1
- **Acceptance Criteria:** Selecting a different size or color updates the calculated Amazon prices within 300ms.
- **Status:** Pending

### TASK-6.5: End-to-End State Re-Synchronization
- **Description:** Connect manual override state with dynamic observation to ensure manual edits are not overwritten prematurely.
- **Priority:** Medium
- **Dependencies:** TASK-6.4
- **Acceptance Criteria:** User-typed values remain intact until user navigates to a new item or clicks "Re-detect".
- **Status:** Pending

---

## Phase 7: Testing & Quality Assurance

### TASK-7.1: Automated Mathematical Test Verification
- **Description:** Run all test cases from `testing.md` and log exact floating-point accuracy.
- **Priority:** Critical
- **Dependencies:** Phase 2, Phase 6
- **Acceptance Criteria:** Zero calculation discrepancies against Test Cases 1, 2, and 3.
- **Status:** Pending

### TASK-7.2: Live eBay Listing DOM Extraction Matrix
- **Description:** Test extraction across 15 diverse live eBay listings (Standard BIN, Variations, Best Offer, Auction, Free Shipping, Freight).
- **Priority:** Critical
- **Dependencies:** Phase 3, Phase 6
- **Acceptance Criteria:** Correctly detects price on at least 95% of active product listings.
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
- **Description:** Verify clipboard copy on both Windows and macOS across standard and secured browser contexts.
- **Priority:** Medium
- **Dependencies:** TASK-4.6
- **Acceptance Criteria:** Price copies to system clipboard reliably on every click.
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
- **Description:** Execute clean install via `chrome://extensions/` -> **Load unpacked** on a fresh profile.
- **Priority:** Critical
- **Dependencies:** TASK-8.1
- **Acceptance Criteria:** Extension loads immediately with zero errors or warnings in the Chrome Extensions dashboard.
- **Status:** Pending

### TASK-8.3: Documentation & README Finalization
- **Description:** Update `README.md` and `changelog.md` to reflect production release status and include finalized screenshots.
- **Priority:** Medium
- **Dependencies:** TASK-8.1
- **Acceptance Criteria:** All documentation links and instructions are accurate and complete.
- **Status:** Pending

### TASK-8.4: Git Repository Tagging & Synchronization
- **Description:** Commit all artifacts, create semantic release tag `v1.0.0`, and push to `origin main`.
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
