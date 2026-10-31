# UI/UX Design Specification: eBay to Amazon Profit Calculator

## 1. Design Philosophy

The **eBay to Amazon Profit Calculator** is engineered as a high-density, high-utility productivity overlay. Its visual aesthetic is inspired by modern developer and financial tools: clean, unobtrusive, highly legible, and tactile.

### Guiding Principles
- **Contextual Non-Intrusiveness:** Never obstruct primary eBay listing media, bid buttons, or description panels. The widget is compact, floating, and effortlessly minimizable.
- **Visual Hierarchy for Rapid Decision-Making:** Key outcomes—specifically the two calculated Amazon selling prices and estimated profit—are visually dominant, allowing sellers to parse margins in under two seconds.
- **Zero Style Collision:** Rendered in an isolated Shadow DOM with complete CSS reset tokens to guarantee identical presentation regardless of eBay themes or third-party extensions.
- **Affirmative Feedback:** Every interactive state (hover, click, copy, drag) delivers immediate visual confirmation.

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
| `--eapc-accent-amber`| `#F59E0B` | Missing shipping notice, manual input override badge (Amber 500) |
| `--eapc-accent-rose` | `#EF4444` | Negative profit, error banners (Rose 500) |

### 2.2 Typography
- **Font Family:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif`
- **Monospace (Prices/Inputs):** `ui-monospace, "SF Mono", "Cascadia Mono", "Roboto Mono", Consolas, monospace`
- **Scale:**
  - Hero Price: `24px` / Weight `700` / Line-height `1.1`
  - Section Title: `11px` / Weight `700` / Letter-spacing `0.08em` / Uppercase
  - Body Text: `13px` / Weight `400` / Line-height `1.4`
  - Microcopy / Badges: `10px` / Weight `600` / Letter-spacing `0.04em`

### 2.3 Spacing & Layout Grid
- Base unit: `4px`
- Paddings: `4px` (xs), `8px` (sm), `12px` (md), `16px` (lg), `20px` (xl)
- Corner Radii:
  - Outer Widget Shell: `12px`
  - Cards & Containers: `8px`
  - Buttons & Inputs: `6px`
  - Status Badges / Pills: `9999px` (Full rounded)
- Shadows:
  - Shell Elevation: `0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)`
  - Card Elevation: `0 1px 3px 0 rgba(0, 0, 0, 0.2)`

---

## 3. Floating Calculator Layout & Wireframe

### Expanded State Wireframe (Width: 320px)

```
┌──────────────────────────────────────────────────────────┐
│  ⋮⋮  EBAY → AMAZON PROFIT CALCULATOR          ─   ⚙   ✕  │  <-- Header & Controls
├──────────────────────────────────────────────────────────┤
│  PRODUCT INFORMATION                                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Sony WH-1000XM4 Wireless Headphones...             │  │  <-- Item Title
│  └────────────────────────────────────────────────────┘  │
│  eBay Price:      [$ 45.00  ]    [AUTO]                  │  <-- Editable input
│  eBay Shipping:   [$  5.00  ]    [FREE TOGGLE]           │  <-- Editable input
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

### Minimized Pill State Wireframe (Viewport Anchored)

```
┌──────────────────────────────────────────────────┐
│  🟢  Amazon: $81.58  |  Profit: $12.00    ▲ EXP  │
└──────────────────────────────────────────────────┘
```
*Note: The minimized pill stays docked to the right edge or user-dragged position, providing instant feedback without covering listing media.*

---

## 4. Component Detailed Specifications

### 4.1 Header Bar
- **Drag Handle (`⋮⋮`):** Indicates draggability. Cursor changes to `grab` / `grabbing`.
- **Title:** `EBAY → AMAZON PROFIT CALCULATOR` in bold 11px uppercase slate-400.
- **Controls Group:**
  - `─` (Minimize): Collapses calculator into the compact pill.
  - `⚙` (Settings): Opens the extension settings page in a new browser tab.
  - `✕` (Close): Hides the widget for the remainder of the session on this listing.

### 4.2 Section 1: Product Information
- **Title Snippet:** Single-line truncated product name (`text-overflow: ellipsis`) with native tooltip on hover displaying full title.
- **eBay Price Field:** Input field with `$` prefix. Auto-populated by parser. Editable by user.
- **eBay Shipping Field:** Input field with `$` prefix. Supports:
  - Number format (e.g. `4.50`)
  - Free shipping indicator badge: `FREE` ($0.00)
  - Missing/Ambiguous state: displays placeholder `Enter $` with an amber border.
- **Total Product Cost:** Live calculated sum `Total = Price + Shipping`. Rendered in bold text.

### 4.3 Section 2: Calculation Settings (Quick View)
- Compact row showing active formula variables: `Comm: 15%`, `Tax: 9%`, `Target: $12.00`, `Deduction: $9.98`.
- Clicking this bar smoothly navigates to the dedicated Options page.

### 4.4 Section 3: Amazon Selling Price Cards
- **Card 1: With Shipping ($81.58)**
  - Prominent border with subtle Emerald accent glow (`rgba(16, 185, 129, 0.15)`).
  - Displays large `$81.58` hero typography.
  - Quick action `[ COPY ]` button aligned to the right.
- **Card 2: Without Shipping ($71.60)**
  - Clean card surface with subtle Blue accent glow (`rgba(59, 130, 246, 0.15)`).
  - Displays `$71.60` with sublabel `(-$9.98 deduction)`.
  - Quick action `[ COPY ]` button aligned to the right.

### 4.5 Section 4: Profit Summary Grid
- 2x2 grid with subtle dividers:
  - **Target Profit:** e.g., `$12.00`
  - **Estimated Profit:** e.g., `$12.00` (Emerald if $>0$, Rose if $<0$)
  - **Profit Margin:** e.g., `14.7%`
  - **ROI (Return on Investment):** e.g., `24.0%`

### 4.6 Section 5: Action Buttons & Feedback Toasts
- Two primary pill buttons with high tactile contrast.
- On click, triggers clipboard write and pops a floating toast inside the widget:
  ```
  ┌──────────────────────────────┐
  │  ✓  Copied $81.58 to clipboard!
  └──────────────────────────────┘
  ```
  (Toast auto-dismisses after 1500ms).

---

## 5. Settings Page Layout (options.html)

A clean, centered, distraction-free options card layout:

```
┌─────────────────────────────────────────────────────────────────┐
│  eBay to Amazon Profit Calculator — Settings                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Amazon Referral Commission (%)                                 │
│  [ 15.00                     ]  Standard Amazon fee category    │
│                                                                 │
│  Sales Tax (%)                                                  │
│  [ 9.00                      ]  Estimated customer sales tax    │
│                                                                 │
│  Target Net Profit ($)                                          │
│  [ 12.00                     ]  Minimum net dollar profit       │
│                                                                 │
│  Shipping Deduction ($)                                         │
│  [ 9.98                      ]  Deduction for Free Ship pricing │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [ Reset to Defaults ]                     [ Save Settings ]    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Interaction & Edge Case States

| State | Visual Treatment | User Action / Trigger |
| :--- | :--- | :--- |
| **Normal / Active** | Slate 900 background, crisp white metrics, green price cards. | Standard detected listing. |
| **Extracting / Loading** | Skeleton shimmer pulse over price and title fields. | Initial page load or variation click in progress. |
| **Missing Shipping** | Shipping input displays amber outline and `Enter shipping $` placeholder. Total cost shows `--`. | Listing has "Contact Seller" or freight shipping. |
| **Manual Override** | Small `[EDITED]` amber badge appears next to modified input. | User types in price or shipping field. |
| **Invalid Formula (≥ 100%)** | Price cards display `ERROR`; banner displays *"Commission + Tax must be < 100%"*. | User sets invalid settings in options. |
| **Negative Margin** | Estimated profit and ROI turn bright Rose (`#EF4444`). | Target profit set negative or product cost exceeds margin limits. |
| **Copied Toast** | Emerald badge slides up from bottom: `✓ Copied $81.58`. | User clicks any copy button. |
| **Dragged** | Box shadow elevates to 24px blur; opacity adjusts to 95%. | User drags header handle. |
