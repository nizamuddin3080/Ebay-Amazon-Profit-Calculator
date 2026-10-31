# Development Rules & Architectural Invariants: eBay to Amazon Profit Calculator

## 1. Prime Invariants (Non-Negotiable)

1. **Rule 1 — Zero Hardcoded Configuration:** Never hardcode configurable settings (Amazon Commission, Sales Tax, Target Profit, Shipping Deduction) outside the centralized default configuration module (`utils/storage.js`).
2. **Rule 2 — Independent Calculation Engine:** Keep calculation logic 100% decoupled from DOM manipulation, UI rendering, and Chrome APIs. The math engine must remain a pure function module testable in isolation.
3. **Rule 3 — Zero Formula Duplication:** Never duplicate calculation formulas across files. Any component needing price, margin, or ROI calculations must import or invoke `calculator-engine.js`.
4. **Rule 4 — Zero External Runtime Dependencies:** Never introduce external npm libraries, bundlers, polyfills, or CDN scripts. The extension must run on 100% standard Vanilla JavaScript (ES2022+), native HTML5, and CSS3.
5. **Rule 5 — Minimal Permissions & Declarative Match Patterns:** Request only `storage` in `permissions`. In `manifest.json`, use declarative `content_scripts.matches` with exact path patterns (`*://*.ebay.com/itm/*`, etc.). Do not request broad `host_permissions` or invasive permissions (`<all_urls>`, `webRequest`, `cookies`).
6. **Rule 6 — Explicit Three-State Shipping Model:** Implement explicit shipping states: `FREE`, `KNOWN`, and `UNKNOWN`. Never assume a missing or unparsable shipping cost is $0. Free shipping must be explicitly confirmed (`$0.00`). If unconfirmed or missing, mark as `UNKNOWN`, pause calculations, and prompt manual entry.
7. **Rule 7 — Dual Independent Manual Override State:** Maintain independent override flags for price (`priceOverride.isOverridden`) and shipping (`shippingOverride.isOverridden`). Manual values must never be overwritten by automatic DOM extraction. Automatic extraction may still update non-overridden fields. Reset overrides ONLY when navigating to a new eBay Item ID; preserve overrides during variation changes.
8. **Rule 8 — Currency Identification & Zero Speculative Conversion:** Identify the currency symbol/code before stripping characters or parsing numbers. Never assume an unknown currency is USD. Never perform automatic currency conversion without an explicit, authenticated exchange rate provider. If currency is unknown or unsupported, pause calculation and prompt manual USD input.
9. **Rule 9 — Calculation Boundary & Error Handling:** Strictly validate inputs: reject negative costs ($C < 0$), guard against division by zero ($R + T \ge 100\%$), clamp negative second selling prices ($S < D$) with informative warnings, handle zero cost ($C = 0$) by returning `null` / `"N/A"` for ROI, and guard against `NaN` and $\pm\infty$.
10. **Rule 10 — Controlled Git Workflow & Pre-Push Security Gates:** Do NOT automatically push every change to remote `main`. Require git diff review, secret scanning, test verification, and explicit user approval before executing `git push origin main`. Never commit credentials, tokens, or sensitive local files.

---

## 2. JavaScript & Coding Standards

### 2.1 Language & Syntax
- Standard: **Modern Vanilla JavaScript (ES2022+)**.
- Strict Mode: Always use `"use strict";` or ES modules.
- Modern Features: Use `async`/`await`, `Optional Chaining (?.)`, `Nullish Coalescing (??)`, `Destructuring`, and arrow functions. Avoid `var`; always use `const` and `let`.
- Formatting: 2 spaces indentation, semicolons mandatory, single quotes for strings (or template literals).

### 2.2 Naming Conventions
- **Files & Folders:** Lowercase kebab-case (e.g., `calculator-engine.js`, `ebay-parser.js`, `storage.js`).
- **Classes & Constructors:** PascalCase (e.g., `EbayParser`, `CalculatorEngine`, `StorageManager`).
- **Functions & Methods:** camelCase with active verb prefix (e.g., `calculateAmazonPrice()`, `extractProductDetails()`, `bindEvents()`).
- **Variables & Properties:** camelCase (e.g., `productCost`, `shippingAmount`, `isManualOverride`).
- **Constants & Enums:** UPPER_SNAKE_CASE (e.g., `DEFAULT_COMMISSION_RATE`, `DEFAULT_SHIPPING_DEDUCTION`).
- **DOM & CSS Classes:** Lowercase prefixed kebab-case scoped to the extension (e.g., `.eapc-container`, `.eapc-price-card`, `.eapc-btn-copy`).

---

## 3. Security & Manifest V3 Requirements

- **CSP Compliance:** No inline script execution (`<script>` tags or `onclick` HTML attributes). All event listeners must be attached programmatically via `addEventListener`.
- **No Dynamic Evaluation:** Never use `eval()`, `new Function()`, or `setTimeout("string", ...)` under any circumstances.
- **Shadow DOM Isolation:** All injected UI elements must be mounted inside a closed or managed open `ShadowRoot` attached to `#ebay-amazon-profit-calc-host`. This prevents CSS bleed and protects extension styles from host page tampering.
- **Sanitized DOM Manipulation:** Never insert untrusted strings directly into `.innerHTML`. Use `textContent` for text insertion and programmatic element construction (`document.createElement`) for markup.
- **Zero Telemetry / External Calls:** No outbound `fetch` or `XMLHttpRequest` calls to external servers. All operations are strictly local.

---

## 4. Calculation Precision & Numeric Rules

- **Internal Full Precision:** Maintain all internal calculations at standard double-precision IEEE 754 floating-point accuracy. Do not round intermediate values.
- **Presentation Rounding:** Round monetary values to exactly 2 decimal places (`.toFixed(2)`) strictly at the UI display formatting boundary.
- **Percentages:** Display margins and ROI formatted to 1 decimal place (`.toFixed(1)`).
- **Division Guard:** Always check that the denominator $1 - R - T > 0$ before division. If $R + T \ge 1.0$, immediately abort calculation and display an error banner.
- **Negative & NaN Guards:** Guard against `NaN` propagation using `Number.isFinite()`. If any input evaluates to `NaN` or `Infinity`, default safely to an error state.
- **Zero Cost ROI Rule:** When product cost $C = 0$, ROI must return `null` and render as `"N/A (Zero Cost)"` to prevent division by zero.

---

## 5. DOM Extraction, Dynamic Variants & SPA Rules

- **Multi-Tier Execution:** Always execute extraction in tiered order: JSON-LD $\rightarrow$ DOM Selectors $\rightarrow$ Meta tags $\rightarrow$ Sanitized regex.
- **Targeted Subtree Observers:** Attach `MutationObserver` exclusively to specific price and shipping containers. Never observe broad document trees.
- **Debounce Throttling:** Debounce all mutation events by 250ms trailing timer to prevent thrashing during variant dropdown changes.
- **Duplicate Event Suppression:** Compare newly parsed price and shipping with cached values before dispatching UI updates.
- **SPA Navigation Isolated-World Reality:** Content scripts cannot intercept page-world calls to `history.pushState`. Combine `popstate`/`hashchange` listeners, a targeted `<head>` MutationObserver, background `webNavigation` messaging, and lightweight 500ms URL polling to detect Item ID changes, followed by an exhaustive observer and override teardown.

---

## 6. Clipboard Handling Rules

- **Primary Write:** Always attempt `navigator.clipboard.writeText(formattedText)`.
- **Fallback Execution:** If primary write rejects, execute `document.execCommand('copy')` via an ephemeral textarea in the Shadow Root.
- **No False Success Feedback:** Display the emerald "Copied!" badge strictly upon verified success. If both primary and fallback methods fail, display a rose error toast: *"Copy failed — please select manually"*.

---

## 7. Version Control & Git Discipline

- Follow the mandatory guidelines defined in [AGENTS.md](file:///c:/Users/h/Music/Chrome%20Extensions/EbayAmazonProfitCalculator/AGENTS.md).
- **No Automatic Remote Push:** Stage and commit locally. Do NOT push to `origin main` without completing the pre-push review checklist (Git diff review, secret scanning, test verification) and receiving **explicit user approval**.
- All commits must use clear Conventional Commit prefixes (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
