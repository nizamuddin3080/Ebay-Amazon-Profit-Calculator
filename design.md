# UI/UX Design Specification: eBay to Amazon Profit Calculator

## 1. Design Philosophy

The **eBay to Amazon Profit Calculator** is engineered as a high-density, high-utility productivity overlay. Its visual aesthetic is inspired by modern developer and financial tools: clean, unobtrusive, highly legible, and tactile.

### Guiding Principles
- **Contextual Non-Intrusiveness:** Never obstruct primary eBay listing media, bid buttons, or description panels. The widget is compact, floating, and effortlessly minimizable.
- **Visual Hierarchy for Rapid Decision-Making:** Key outcomes—specifically the two calculated Amazon selling prices and estimated profit—are visually dominant, allowing sellers to parse margins in under two seconds.
- **Zero Style Collision:** Rendered in an isolated Shadow DOM with complete CSS reset tokens to guarantee identical presentation regardless of eBay themes or third-party extensions.
- **Affirmative & Accurate Feedback:** Every interactive state (hover, click, copy, drag) delivers immediate visual confirmation. Zero false success feedback if operations fail.

---

## 2. Design System & Tokens

### 2.1 Color Palette

```
  Primary Dark        Card Surface        Border / Divider      Accent Green
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │   #0F172A   │     │   #1E293B   │     │   #334155   │     │   #10B981   │
  │  Slate 900  │     │  Slate 800  │     │  Slate 700  │     │ Emerald 500 │
  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘

  Accent Blue         Text Primary        Text Muted          Warning Amber
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │   #3B82F6   │     │   #F8FAFC   │     │   #94A3B8   │     │   #F59E0B   │
  │  Blue 500   │     │  Slate 50   │     │  Slate 400  │     │  Amber 500  │
  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

| Token Name | Hex Code | Purpose / Application |
| :--- | :--- | :--- |
| `--eapc-bg-primary` | `#0F172A` | Calculator shell background (Slate 900) |
| `--eapc-bg-surface` | `#1E293B` | Input backgrounds, price cards, section containers (Slate 800) |
| `--eapc-bg-hover` | `#2D3748` | Interactive row hover, button hover |
| `--eapc-border` | `#334155` | Dividers, card strokes, subtle input borders (Slate 700) |
| `--eapc-border-focus` | `#3B82F6` | Active input outline (Blue 500) |
| `--eapc-text-primary` | `#F8FAFC` | High-contrast titles, primary prices, values (Slate 50) |
| `--eapc-text-muted` | `#94A3B8` | Field labels, subtext, percentage tags (Slate 400) |
| `--eapc-text-faint` | `#64748B` | Currency symbols, hints, icons (Slate 500) |
| `--eapc-accent-profit`| `#10B981` | Positive profit, ROI highlights, With Shipping Card (Emerald 500) |
| `--eapc-accent-blue` | `#3B82F6` | Primary action buttons, Without Shipping Card (Blue 500) |
| `--eapc-accent-amber`| `#F59E0B` | Missing shipping notice, manual input override badge, paused state (Amber 500) |
| `--eapc-accent-rose` | `#EF4444` | Negative profit, error banners, copy failure toast (Rose 500) |

### 2.2 Typography
- **Font Family:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif`
- **Monospace (Prices/Inputs):** `ui-monospace, "SF Mono", "Cascadia Mono", "Roboto Mono", Consolas, monospace`
- **Scale:**
  - Hero Price: `24px` / Weight `700` / Line-height `1.1`
  - Section Title: `11px` / Weight `700` / Letter-spacing `0.08em` / Uppercase
  - Body Text: `13px` / Weight `400` / Line-height `1.4`
  - Microcopy / Badges: `10px` / Weight `600` / Letter-spacing `0.04em`

---

## 3. Floating Calculator Layout & Wireframes

### 3.1 Normal Active State Wireframe (Width: 320px)

```
┌──────────────────────────────────────────────────────────┐
│  ⋮⋮  EBAY → AMAZON PROFIT CALCULATOR          ─   ⚙   ✕  │  <-- Header & Controls
├──────────────────────────────────────────────────────────┤
│  PRODUCT INFORMATION                                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Sony WH-1000XM4 Wireless Headphones...             │  │  <-- Truncated Item Title
│  └────────────────────────────────────────────────────┘  │
│  eBay Price:      [$ 45.00  ]  [AUTO]    [↺]             │  <-- Editable input + Re-detect
│  eBay Shipping:   [$  5.00  ]  [AUTO]    [↺]             │  <-- Editable input + Re-detect
│  Total Cost (C):  $ 50.00                                │  <-- Sum highlight
├──────────────────────────────────────────────────────────┤
│  CALCULATION SETTINGS (QUICK VIEW)                       │
│  Comm: 15%  •  Tax: 9%  •  Target: $12  •  Ded: $9.98    │  <-- Settings snapshot
├──────────────────────────────────────────────────────────┤
│  AMAZON SELLING PRICE                                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │  WITH SHIPPING (PRIMARY)                           │  │
│  │  $81.58                               [ COPY ]     │  │  <-- Card 1 (Emerald)
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  WITHOUT SHIPPING (DED. $9.98)                     │  │
│  │  $71.60                               [ COPY ]     │  │  <-- Card 2 (Blue)
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  PROFIT SUMMARY                                          │
│  ┌─────────────────────────┬──────────────────────────┐  │
│  │ Target Profit:   $12.00 │ Estimated Profit: $12.00 │  │
│  ├─────────────────────────┼──────────────────────────┤  │
│  │ Profit Margin:    14.7% │ Return on Inv:     24.0% │  │
│  └─────────────────────────┴──────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  [  COPY AMAZON PRICE  ]    [  COPY W/O SHIPPING  ]      │  <-- Main action buttons
└──────────────────────────────────────────────────────────┘
```

### 3.2 Paused State Wireframe (Shipping State: UNKNOWN)

```
┌──────────────────────────────────────────────────────────┐
│  ⋮⋮  EBAY → AMAZON PROFIT CALCULATOR          ─   ⚙   ✕  │
├──────────────────────────────────────────────────────────┤
│  PRODUCT INFORMATION                                     │
│  eBay Price:      [$ 45.00  ]  [AUTO]                    │
│  eBay Shipping:   [         ]  [UNKNOWN] ⚠               │  <-- Amber outline, placeholder
│  Total Cost (C):  N/A (Shipping Required)                │
├──────────────────────────────────────────────────────────┤
│  ⚠ CALCULATION PAUSED                                    │
│  Please enter shipping cost above to view Amazon prices. │
├──────────────────────────────────────────────────────────┤
│  AMAZON SELLING PRICE                                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │  WITH SHIPPING:      --              [ COPY (off)] │  │
│  │  WITHOUT SHIPPING:   --              [ COPY (off)] │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 3.3 Minimized Pill State Wireframe (Viewport Anchored)

```
┌──────────────────────────────────────────────────┐
│  🟢  Amazon: $81.58  |  Profit: $12.00    ▲ EXP  │
└──────────────────────────────────────────────────┘
```

---

## 4. Component Detailed Specifications

### 4.1 Header Bar
- **Drag Handle (`⋮⋮`):** Indicates draggability. Cursor changes to `grab` / `grabbing`.
- **Title:** `EBAY → AMAZON PROFIT CALCULATOR` in bold 11px uppercase slate-400.
- **Controls Group:**
  - `─` (Minimize): Collapses calculator into compact pill.
  - `⚙` (Settings): Opens extension options page in a new browser tab.
  - `✕` (Close): Dismisses widget for the session.

### 4.2 Section 1: Product Information
- **Title Snippet:** Single-line truncated product name (`text-overflow: ellipsis`) with native tooltip on hover.
- **eBay Price Field:** Input field with `$` prefix. Supports auto-extraction, manual override, and a `[↺]` Re-detect button when in `[MANUAL]` mode.
- **eBay Shipping Field (Three-State UI):**
  - `FREE`: Green `FREE` pill ($0.00).
  - `KNOWN`: Shows dollar amount, e.g. `$5.00`.
  - `UNKNOWN`: Amber outline, `UNKNOWN` badge, placeholder `Enter shipping $`.
- **Total Product Cost:** Renders `$50.00` in bold, or `N/A` when shipping is `UNKNOWN`.

### 4.3 Section 3: Selling Price Cards & Special Policies
- **Card 1: With Shipping ($81.58):** Emerald border highlight; hero typography; quick `[ COPY ]` button.
- **Card 2: Without Shipping ($71.60):** Blue border highlight; sublabel `(-$9.98 deduction)`.
- **Negative Second Selling Price Policy ($S < D$):**
  - If selling price $S < \$9.98$, Card 2 renders `$0.00` in amber with sublabel: *"Shipping deduction ($9.98) exceeds selling price"*.
- **Zero Cost Handling ($C = 0$):**
  - Prices compute normally; ROI grid cell displays `"N/A (Zero Cost)"`.

### 4.4 Section 4: Profit Summary Grid
- **Target Profit:** e.g., `$12.00` (displays amber banner if negative target profit is entered).
- **Estimated Profit:** Emerald if $>0$, Rose if $<0$.
- **Profit Margin:** e.g., `14.7%`.
- **Return on Investment:** e.g., `24.0%` (or `"N/A (Zero Cost)"`).

### 4.5 Section 5: Action Buttons & Feedback Toasts
- Two primary action buttons.
- **Clipboard Success:** Emerald toast slides up: `✓ Copied $81.58 to clipboard!` (1500ms auto-dismiss).
- **Clipboard Failure:** Rose toast: `✕ Copy failed — please select manually` (2500ms auto-dismiss). No false positive success message.

---

## 5. Interaction & Edge Case States

| State | Visual Treatment | Trigger / Condition |
| :--- | :--- | :--- |
| **Normal / Active** | Slate 900 background, crisp white metrics, green cards. | Standard detected listing with price and shipping. |
| **Shipping UNKNOWN** | Amber outline on shipping input; price cards show `--`. | Shipping text is "See details", "Contact seller", freight. |
| **Price Manual Override** | `[MANUAL]` amber badge next to Price with `[↺]` Re-detect button. | User manually types in the price field. |
| **Shipping Manual Override** | `[MANUAL]` amber badge next to Shipping with `[↺]` Re-detect button. | User manually types in shipping field. |
| **Negative Target Profit** | Amber banner: *"Loss Leader Pricing (Negative Profit)"*. | User configures negative target profit ($P < 0$). |
| **$S < D$ (Second Price $< 0$)** | Card 2 displays `$0.00` with amber warning label. | Calculated price is less than $9.98 deduction. |
| **Commission+Tax $\ge 100\%$** | Rose banner: *"Commission + Tax must be < 100%"*; cards show `--`. | Denominator $1 - R - T \le 0$. |
| **Copy Success** | Emerald toast: `✓ Copied $81.58`. | Promise resolves or fallback returns true. |
| **Copy Failure** | Rose toast: `✕ Copy failed — please select manually`. | Both primary and fallback copy methods reject. |
