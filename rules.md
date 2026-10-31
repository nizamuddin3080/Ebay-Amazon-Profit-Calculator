# Development Rules & Architectural Invariants: eBay to Amazon Profit Calculator

## 1. Prime Invariants (Non-Negotiable)

1. **Rule 1 — Zero Hardcoded Configuration:** Never hardcode configurable settings (Amazon Commission, Sales Tax, Target Profit, Shipping Deduction) outside the centralized default configuration module (`utils/storage.js`).
2. **Rule 2 — Independent Calculation Engine:** Keep calculation logic 100% decoupled from DOM manipulation, UI rendering, and Chrome APIs. The math engine must remain a pure function module testable in isolation.
3. **Rule 3 — Zero Formula Duplication:** Never duplicate calculation formulas across files. Any component needing price, margin, or ROI calculations must import or invoke `calculator-engine.js`.
4. **Rule 4 — Zero External Runtime Dependencies:** Never introduce external npm libraries, bundlers, polyfills, or CDN scripts. The extension must run on 100% standard Vanilla JavaScript (ES2022+), native HTML5, and CSS3.
5. **Rule 5 — Minimal Chrome Permissions:** Never request permissions beyond `storage` and targeted eBay host match patterns (`*://*.ebay.com/itm/*`, etc.). Never request `<all_urls>` or invasive webRequest APIs.
6. **Rule 6 — Explicit Shipping Verification:** Never assume a missing or unparsable shipping cost is $0. Free shipping must be explicitly confirmed (e.g. "Free", "$0.00"). If unconfirmed, mark as `N/A` and prompt manual input.
7. **Rule 7 — Never Fail Silently on Extraction:** Never present speculative or unverified extracted prices. If a price cannot be determined with certainty, clearly display a manual input prompt rather than displaying an erroneous number.
8. **Rule 8 — Strict Scope Control:** Do not introduce unrelated features (e.g. Amazon scraping, ASIN matching, Keepa charts, bulk exports, user logins). Stay focused strictly on the single-item profit calculation workflow.
9. **Rule 9 — Non-Breaking Incrementalism:** Do not break existing working functionality when implementing new tasks. Every addition must preserve the integrity of previous phases.
10. **Rule 10 — Living Documentation Synchronization:** Whenever an architectural decision or mathematical formula changes, update all relevant documentation files (`plan.md`, `architecture.md`, `testing.md`, `memory.md`) immediately.

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
- **Shadow DOM Isolation:** All injected UI elements must be mounted inside a closed or managed open `ShadowRoot` attached to a host container. This prevents CSS bleed and protects extension styles from host page tampering.
- **Sanitized DOM Manipulation:** Never insert untrusted strings directly into `.innerHTML`. Use `textContent` for text insertion and programmatic element construction (`document.createElement`) for markup.
- **Zero Telemetry / External Calls:** No outbound `fetch` or `XMLHttpRequest` calls to external servers. All operations are strictly local.

---

## 4. Calculation Precision & Numeric Rules

- **Internal Full Precision:** Maintain all internal calculations at standard double-precision IEEE 754 floating-point accuracy. Do not round intermediate values.
- **Presentation Rounding:** Round monetary values to exactly 2 decimal places (`.toFixed(2)`) strictly at the UI display formatting boundary.
- **Percentages:** Display margins and ROI formatted to 1 decimal place (`.toFixed(1)`).
- **Division Guard:** Always check that the denominator $1 - R - T > 0$ before division. If $R + T \ge 1.0$, immediately abort calculation and trigger a structured validation error.
- **Negative & NaN Guards:** Guard against `NaN` propagation using `Number.isFinite()`. If any input evaluates to `NaN` or `Infinity`, default safely to an error state.

---

## 5. DOM Extraction & Parsing Rules

- **Multi-Tier Execution:** Always execute extraction in tiered order:
  1. JSON-LD structured script elements
  2. High-priority eBay CSS selectors
  3. Meta tags (`og:`, `twitter:`)
  4. Sanitized fallback text parsing
- **Currency Stripping:** Use regex to strip currency symbols (`$`, `£`, `€`, `US $`, `AU $`) and normalize commas to dots before parsing via `parseFloat()`.
- **Defensive Querying:** Always verify that an element exists before accessing its properties (use optional chaining `element?.textContent?.trim()`).
- **Observer Throttling:** Debounce all `MutationObserver` callbacks by at least 250ms to prevent execution thrashing during rapid DOM restyling or variant switching.

---

## 6. UI Consistency & Usability Rules

- **Non-Obstructive Viewport Footprint:** The calculator must not exceed 340px in width and must be positioned so it does not conceal eBay item images or purchase buttons by default.
- **Draggability:** Header must serve as a drag handle, constrained strictly to viewport boundaries (`0 <= left <= window.innerWidth - width`).
- **State Persistence:** The user's minimized/expanded state and position preference must be stored in `sessionStorage` or `chrome.storage.local`.
- **Feedback Immediate:** Clicking any copy button must display unambiguous confirmation (e.g., visual toast or button text shift to "Copied!") for 1200ms to 1800ms.

---

## 7. Version Control & Git Discipline

- Follow the mandatory guidelines defined in [AGENTS.md](file:///c:/Users/h/Music/Chrome%20Extensions/EbayAmazonProfitCalculator/AGENTS.md).
- Remote target: `https://github.com/nizamuddin3080/Ebay-Amazon-Profit-Calculator.git` on branch `main`.
- All commits must use clear Conventional Commit prefixes (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- Stage changes cleanly and push after completing distinct logical tasks.
