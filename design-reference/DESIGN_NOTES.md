# Dangote Loan App — Merged Design Reference

Source material stored in `design-reference/screens/`:
- `credit-loan-flow.webp` — light theme, blue accent: borrow amount stepper, repayment term picker, credit score gauge, loan purpose grid
- `payments-transfer-flow.png` — light theme, blue accent: payments hub, currency conversion, request/transfer money, card entry
- Dribbble video (`Get Loans` app, not saved as a file — summarized below): dark theme, lime accent: home dashboard hero, loan progress bar, popular loans list, pill bottom nav, loan detail/apply screen with frequency tabs and unpaid bills

## Merged design system (light + dark pair)

**Shared structure across both themes** — same layout/components, only tokens swap:

| Token | Dark theme | Light theme |
|---|---|---|
| Background | `#0B0B0C` | `#F2F4F7` |
| Card surface | `#1E1E22` → `#2A2A30` gradient | `#FFFFFF` |
| Accent (primary CTA / active state) | `#D4FF4D` (lime) | `#1360F0` (blue) |
| Primary text | `#FFFFFF` | `#0B0F1A` |
| Secondary text | `#9A9AA2` | `#6B7280` |
| Success/positive | `#4ADE80` | `#16A34A` |
| Radius | 20–28px cards, full-pill buttons/nav | same |

**Components pulled from the video (dark, lime):**
- Hero header: avatar + menu icon, "Get Loans in Minutes" headline
- Segmented loan-progress bar (Total / Paid / Due) with % labels
- Popular Loans list rows with icon chip + "Apply Loan" pill
- Pill-shaped bottom nav with expanding labeled icons (Wallet / grid / Statistic)
- Loan detail screen: back chevron header, amount stepper, frequency pill-tabs (6/12/24 months), full-width "Apply Now" CTA, Unpaid Bills list with sparkline

**Components pulled from the screenshots (light, blue):**
- Borrow-amount screen: big centered `$` value with underline, helper caption, Continue CTA
- Repayment-term screen: radio-style term cards (6/12/24 months + Custom) with interest-rate subtext, selected state = filled check + tinted border
- Credit score screen: circular gauge (score + trend), quick actions (Make Payment / Manage / More), summary grid (late payments, oldest account, available credit, credit usage)
- Loan purpose grid: icon tiles (Housing / Bills / Vacation / …)
- Payments hub: circular action buttons (Withdraw / Request / Transfer / Recurring), contacts row, linked institutions list
- Numeric keypad pattern for entering amounts (Request Money)

## Screen set built into the prototype
1. **Home** — video-style hero + loan progress + popular loans + bottom nav
2. **Borrow amount** — screenshot-style stepper input
3. **Repayment term** — screenshot-style radio term cards
4. **Credit score** — screenshot-style gauge + summary grid
5. **Loan detail / Apply** — video-style frequency tabs + unpaid bills

All screens share one bottom nav and one theme-token system so light/dark can be toggled without redesigning layout.

Prototype file: `design-reference/prototype/index.html` (open directly in a browser, or use the theme toggle in the top-right of the mock status bar area).
