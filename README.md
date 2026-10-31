# eBay to Amazon Profit Calculator

A lightweight, high-performance, and privacy-first Google Chrome Extension (Manifest V3) engineered to streamline cross-platform retail arbitrage and dropshipping workflows between eBay and Amazon.

---

> **Status:** Phase 1 – Architecture, Planning & Documentation  
> **Target Manifest Version:** Manifest V3  
> **Source Code Status:** Planned (Implementation begins in Phase 2 upon formal approval)

---

## 1. Project Overview

The **eBay to Amazon Profit Calculator** automatically detects product parameters directly on eBay Product Details Pages (title, listed price, shipping cost, item ID, and canonical URL) and instantly calculates the required Amazon selling price to secure a specified target net profit.

Sellers often face significant friction and calculation errors when pricing products on Amazon sourced from eBay. Factoring in Amazon referral commission fees (default 15%), sales tax impact (default 9%), desired net profit, and optional customer shipping deductions ($9.98) requires multi-step algebra. This extension eliminates manual math by injecting an unobtrusive, reactive floating calculator directly into the eBay viewport.

### Primary Objectives
- **Zero Friction:** Automatic extraction upon navigating to any active eBay product listing.
- **Accurate Math:** Exact algebraic formula factoring in referral fees, taxes, and profit margins.
- **Dynamic Adaptability:** Real-time recalculation upon eBay variant selection (size, color, condition) without full page reload.
- **Total Privacy & Speed:** 100% client-side execution; zero external servers, tracking, analytics, or third-party dependencies.
- **Manual Resilience:** Instant fallback to manual inputs if shipping or price is ambiguous or missing.

---

## 2. Core Features (MVP Scope)

| Feature | Description | Status |
| :--- | :--- | :--- |
| **Automatic Extraction** | Extracts title, price, shipping cost, item ID, and URL via a multi-tiered fallback engine (JSON-LD & DOM). | Planned (Phase 3) |
| **Dynamic Variation Detection** | Monitors DOM mutations for option/variant switches and updates pricing seamlessly. | Planned (Phase 3) |
| **Profit Calculation Engine** | Computes Amazon Selling Price (With & Without Shipping), Estimated Net Profit, Profit Margin (%), and ROI (%). | Planned (Phase 2) |
| **Floating Calculator UI** | Encapsulated inside a Shadow DOM to guarantee zero CSS conflicts with eBay's layout. Draggable and minimizable. | Planned (Phase 4) |
| **Dual Selling Price Display** | Displays Amazon Price With Shipping and Amazon Price Without Shipping ($9.98 deduction). | Planned (Phase 4) |
| **One-Click Clipboard Actions** | Dedicated copy buttons for both selling prices with visual toast feedback. | Planned (Phase 4) |
| **Persistent Configuration** | Stores commission rate, sales tax rate, target profit, and shipping deduction locally via `chrome.storage.local`. | Planned (Phase 5) |
| **Manual Override Mode** | Allows sellers to manually type or correct price and shipping values on the fly. | Planned (Phase 3) |

---

## 3. Technology Stack

- **Platform:** Google Chrome Extension Platform (Chromium-based browsers)
- **Manifest Version:** Manifest V3
- **Languages:** HTML5, CSS3, Vanilla JavaScript (ES2022+)
- **APIs Used:**
  - `chrome.storage.local` (Persistent user settings and state)
  - `chrome.runtime` (Message passing and asset resolution)
  - `Clipboard API` (`navigator.clipboard` with legacy fallback)
  - `MutationObserver` & `DOMParser` (Dynamic page parsing)
- **External Dependencies:** **0 (Zero)**. No npm packages, external fonts, or analytics scripts are bundled at runtime.

---

## 4. Project Scope Control

To guarantee reliability, speed, and clean code, the MVP scope is strictly controlled:

### In-Scope (MVP)
- Automatic eBay product detection and data extraction.
- Support for common eBay layouts (`ebay.com`, `ebay.co.uk`, `ebay.ca`, `ebay.com.au`, `ebay.de`).
- Accurate mathematical calculations (With Shipping, Without Shipping, Margin %, ROI %).
- Floating, draggable, minimizable UI inside a Shadow DOM.
- Settings management with local persistence.
- Manual price/shipping overrides.
- Clipboard copy with toast feedback.

### Strictly Out-of-Scope (Future Explorations)
- No automated Amazon product search, scraping, or Buy Box matching.
- No historical pricing trackers or keepa/camelcamelcamel API integrations.
- No bulk export, CSV downloads, or cloud synchronization.
- No user accounts, logins, telemetry, or remote backends.

---

## 5. Documentation Index

The complete architectural blueprint and engineering specifications are organized into dedicated documentation files:

1. [plan.md](file:///c:/Users/h/Music/Chrome%20Extensions/EbayAmazonProfitCalculator/plan.md) – Product development plan, user stories, requirements, and milestones.
2. [architecture.md](file:///c:/Users/h/Music/Chrome%20Extensions/EbayAmazonProfitCalculator/architecture.md) – Technical architecture, Manifest V3 design, component lifecycle, and Mermaid diagrams.
3. [design.md](file:///c:/Users/h/Music/Chrome%20Extensions/EbayAmazonProfitCalculator/design.md) – Complete UI/UX design specification, design tokens, wireframes, and component states.
4. [tasks.md](file:///c:/Users/h/Music/Chrome%20Extensions/EbayAmazonProfitCalculator/tasks.md) – Comprehensive task breakdown across 8 phases with acceptance criteria and status tracking.
5. [rules.md](file:///c:/Users/h/Music/Chrome%20Extensions/EbayAmazonProfitCalculator/rules.md) – Strict coding standards, security constraints, and architectural invariants.
6. [testing.md](file:///c:/Users/h/Music/Chrome%20Extensions/EbayAmazonProfitCalculator/testing.md) – Quality assurance strategy, verified test cases, edge case matrix, and runbooks.
7. [memory.md](file:///c:/Users/h/Music/Chrome%20Extensions/EbayAmazonProfitCalculator/memory.md) – Project memory, confirmed architectural decisions, and configuration registry.
8. [changelog.md](file:///c:/Users/h/Music/Chrome%20Extensions/EbayAmazonProfitCalculator/changelog.md) – Semantic version history and release log.
9. [planning-audit.md](file:///c:/Users/h/Music/Chrome%20Extensions/EbayAmazonProfitCalculator/planning-audit.md) – Comprehensive pre-implementation consistency audit and readiness verification.

---

## 6. Planned Folder Structure

```
EbayAmazonProfitCalculator/
├── AGENTS.md                  # Workspace & Agent operational rules
├── README.md                  # Project overview and index
├── plan.md                    # Product requirements and roadmap
├── architecture.md            # Technical specifications and diagrams
├── design.md                  # UI/UX design tokens and layout specs
├── tasks.md                   # Granular task tracking across phases
├── rules.md                   # Strict development and coding rules
├── testing.md                 # QA test suite and test cases
├── memory.md                  # Persistent architecture decision log
├── changelog.md               # Version changelog
├── planning-audit.md          # Pre-implementation audit report
│
├── manifest.json              # [Planned - Phase 1] MV3 configuration
├── background.js              # [Planned - Phase 1] Service worker lifecycle handler
├── content.js                 # [Planned - Phase 4/6] Content script entry point
├── styles.css                 # [Planned - Phase 4] Encapsulated UI stylesheet
│
├── popup/                     # Browser Action Popup (Optional quick settings/status)
│   ├── popup.html             # [Planned - Phase 5]
│   ├── popup.js               # [Planned - Phase 5]
│   └── popup.css              # [Planned - Phase 5]
│
├── settings/                  # Dedicated Extension Options Page
│   ├── settings.html          # [Planned - Phase 5]
│   ├── settings.js            # [Planned - Phase 5]
│   └── settings.css           # [Planned - Phase 5]
│
├── utils/                     # Pure, decoupled business logic modules
│   ├── calculator-engine.js   # [Planned - Phase 2] Pure math calculation module
│   ├── ebay-parser.js         # [Planned - Phase 3] Multi-tiered DOM/JSON-LD parser
│   └── storage.js             # [Planned - Phase 5] LocalStorage & chrome.storage adapter
│
└── icons/                     # Extension branding assets
    ├── icon16.png             # [Planned - Phase 1]
    ├── icon48.png             # [Planned - Phase 1]
    └── icon128.png            # [Planned - Phase 1]
```

---

## 7. Installation Overview (Developer Mode)

*(Note: The extension is currently in Phase 1 Planning. Source code will be available upon completion of Phase 2 through Phase 6.)*

Once development is complete:
1. Clone the repository:
   ```bash
   git clone https://github.com/nizamuddin3080/Ebay-Amazon-Profit-Calculator.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** and select the `EbayAmazonProfitCalculator` root directory.
5. Open any eBay item page (e.g., `https://www.ebay.com/itm/...`) to observe the floating calculator.

---

## 8. Development Workflow & Git Synchronization

- **Repository:** `https://github.com/nizamuddin3080/Ebay-Amazon-Profit-Calculator.git`
- **Target Branch:** `main`
- **Policy:** Atomic, descriptive git commits pushed to `origin main` upon each milestone completion.
