# Changelog: eBay to Amazon Profit Calculator

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-11-01

### Added
- **Formal Currency Parsing & Disambiguation Specification:**
  - Standardized parsing for US (`1,234.56`) and European (`1.234,56`) formats with single-separator heuristics.
  - Identification of currency symbol/code (USD, GBP, EUR, CAD, AUD) prior to numeric extraction.
  - Zero unauthenticated currency conversion; pauses calculation on unknown currencies.
- **Three-State Shipping Model (`FREE`, `KNOWN`, `UNKNOWN`):**
  - Confirmed $0.00 (`FREE`), valid amount $>0$ (`KNOWN`), and missing/ambiguous (`UNKNOWN`).
  - Explicit rule that `UNKNOWN` is never coerced to zero and pauses calculations.
- **Dual Independent Manual Override States:**
  - Independent `priceOverride` and `shippingOverride` states.
  - Preservation of manual inputs across variation changes while allowing non-overridden fields to update automatically.
  - Per-field "Re-detect" action; reset overrides only on Item ID change.
- **Comprehensive Boundary Validation & Policies:**
  - Zero product cost ($C = 0$) policy returning `"N/A (Zero Cost)"` for ROI to prevent division by zero.
  - Strict rejection of negative product cost ($C < 0$).
  - Negative target profit ($P < 0$) warning banner for intentional loss leaders.
  - Strict division guard when $R + T \ge 100\%$.
  - Negative second selling price ($S < D$) clamped to `$0.00` with warning label.
  - Systematic `Number.isFinite()` guards against `NaN` and $\pm\infty$.
- **Targeted & Debounced MutationObserver Architecture:**
  - Targeted exclusively to price and shipping container nodes.
  - 250ms trailing debounce timer with duplicate event suppression.
- **Multi-Strategy SPA Navigation & Teardown Architecture:**
  - Acknowledged isolated-world reality where content scripts cannot intercept page-world `pushState`.
  - Implemented `popstate`, `<head>` title/canonical observer, background `webNavigation` messaging, and 500ms URL polling fallback.
  - Full teardown protocol (disconnect observers, clear timers, clear cache, reset overrides).
- **Least-Privilege Manifest V3 Permission Specification:**
  - Clarified declarative `content_scripts.matches` with path wildcards (`/itm/*`) vs omission of broad `host_permissions`.
  - Request only `storage` in `permissions`.
- **Reliable Clipboard Handling:**
  - Primary write via `navigator.clipboard.writeText` with `document.execCommand` fallback.
  - Honest error handling: rose error toast on failure; zero false positive "Copied!" messages.
- **Controlled Git Workflow & Pre-Push Security Gate:**
  - Updated `AGENTS.md` to prohibit automatic remote pushes.
  - Enforced pre-push review: Git diff review, secret scanning, test verification, and explicit user approval before remote push.
- **Thirteen New Test Cases (TC-13 through TC-25):**
  - Codified test cases in `testing.md` with explicit Input, Trigger, Expected Result, and Pass/Fail Criteria.
- **Six New Architectural Decision Records (ADR-09 through ADR-14):**
  - Documented in `architecture.md` and `memory.md`.

### Changed
- Replaced monolithic `isManualOverride` boolean with structured dual override schema.
- Updated `AGENTS.md` and `rules.md` to require explicit user approval before remote push.
- Aligned task descriptions and acceptance criteria across all 8 phases in `tasks.md`.

### Fixed
- Corrected architectural assumption regarding content script `history.pushState` monkey-patching in Chrome MV3 isolated world.
- Resolved path wildcard ambiguity between `host_permissions` and declarative `content_scripts.matches`.

---

## [0.1.0] - 2026-11-01

### Added
- Complete Phase 1 Architecture & Engineering Documentation Suite (`README.md`, `plan.md`, `architecture.md`, `design.md`, `tasks.md`, `rules.md`, `testing.md`, `memory.md`, `changelog.md`, `planning-audit.md`).
- Initialized local Git repository with remote tracking against `https://github.com/nizamuddin3080/Ebay-Amazon-Profit-Calculator.git`.
- Added `AGENTS.md` workspace guidelines.

### Fixed
- Reconciled mathematical discrepancy in Test Case 3 between literal $30 / $5 parameters and target $59.21 output, documenting both derivations in `testing.md` and `planning-audit.md`.

### Security
- Mandated zero external network dependencies and restricted Chrome extension permissions strictly to `storage` and targeted eBay listing URLs.
