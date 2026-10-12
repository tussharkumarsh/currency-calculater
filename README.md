# Smart Cash Counter

A fast, private Indian currency counter for retail counters. Type how many of each note and coin you received, see the total update instantly, and share a clean summary on WhatsApp.

Built with Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4 and lucide-react. There is no backend, database or analytics.

## Features

- Banknotes ₹500, ₹200, ₹100, ₹50, ₹20, ₹10 and coins ₹10, ₹5, ₹2, ₹1 in separate groups. ₹10 notes and ₹10 coins are counted independently.
- Optional legacy ₹2,000 note, off by default and enabled in Settings.
- Live row amounts, note/coin subtotals, grand total, notes, coins, pieces and denominations used.
- Indian digit grouping (₹1,25,000 · ₹1,00,00,000) and amount in words (English or Hindi).
- Fast entry:
  - Numeric keypad on mobile.
  - <kbd>Enter</kbd> goes to the next field and <kbd>Shift</kbd>+<kbd>Enter</kbd> to the previous one.
  - <kbd>↑</kbd>/<kbd>↓</kbd> change the quantity by 1 (hold <kbd>Shift</kbd> for 10).
  - Focusing a field selects its content, so you can type over it.
  - The +/− buttons are skipped by <kbd>Tab</kbd>.
- Invalid input (letters, signs, decimals, more than 99,999 per row) is rejected as you type, with a short inline message. It can never change the totals.
- WhatsApp sharing with a recipient preview, customer-number priority, a default number and Indian mobile validation.
- Copy summary to clipboard.
- **Clear all** (top of the entry panel, always in reach) fully resets for the next customer: every quantity, the customer number and any validation messages are cleared, the page scrolls to the top and the cursor goes to ₹500. An 8-second Undo protects against accidental taps. After sharing, a **Start next customer** shortcut does the same.
- "Try an example" data for first-time users.
- Responsive layout:
  - Desktop/tablet: two columns. Fits 1366×768 and 1440×900 without scrolling.
  - Mobile: single column with a fixed total + Share bar.
- Light and dark themes, visible focus states, labelled controls and reduced-motion support.
- Installable PWA that works offline once it has loaded.

## Modes

A segmented switch at the top of the page offers three modes: **Cash Counter | Calculator | Discount Calculator**. Switching is instant, with no page reload. Every mode and tab stays loaded in the background, so switching never clears anything. Nothing in Calculator or Discount Calculator mode is saved or sent anywhere.

### Calculator

A standard calculator on its own screen.

- Keys: 0–9, decimal point, + − × ÷, %, =, AC, ⌫ and ±. Normal precedence applies (2 + 3 × 4 = 14).
- Results are rounded to 15 significant digits, so 0.1 + 0.2 = 0.3.
- Dividing by zero shows "Cannot divide by zero" instead of Infinity or NaN.
- % follows the shop-calculator convention: 2000 − 15% = 1,700.
- Physical keyboard: digits, `+ - * /`, `%`, `.`, Enter or `=`, Backspace, Esc to clear.

### Discount Calculator

Two tabs, showing one tool at a time.

**Customer Discount** works out what the customer pays after a percentage discount.
- Enter the original price and a discount (0–100%), or tap a 5/10/15/20% preset or Custom. Results update as you type.
- Shows **Customer pays** prominently, plus *You save*, the original price and the discount. Example: ₹100 at 10% → ₹90; ₹2,000 at 15% → ₹1,700.
- Includes Copy result, a Clear button that resets only this tab, and a collapsible *find the original price from a selling price* tool.

**Selling Price / Margin** works out the price you need to charge to reach a profit target.
- **Profit margin** (default) is profit as a share of the *selling* price: selling price = cost ÷ (1 − margin). ₹90 cost at 10% → ₹100; ₹200 at 20% → ₹250.
- **Cost markup** is profit as a share of the *cost*: selling price = cost × (1 + markup). ₹100 cost at 10% → ₹110.
- The field label changes with the selected method, and a cross-check row shows the equivalent figure in the other method. For example, a 10% margin equals an 11.11% markup.
- Presets: 5/10/15/20/25% or Custom.
- Margin must be at least 0% and below 100%. Markup is allowed up to 1000%.
- When the exact price has fractions of a paisa, it is **rounded up** to the next paisa so the target is never missed. ₹100 at a 10% margin gives ₹111.12, because ₹111.11 would be a 9.999% margin. A note on screen explains this whenever it happens.

All money maths uses whole paise (integers, plus BigInt for the selling-price products), so results are exact.

## Getting started

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev          # http://localhost:3000
```

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | Development server                                    |
| `npm test`          | Unit tests (Vitest)                                   |
| `npm run typecheck` | TypeScript strict check                               |
| `npm run lint`      | ESLint (Next.js core-web-vitals + TypeScript rules)  |
| `npm run build`     | Production build                                      |
| `npm start`         | Serve the production build                            |
| `npm run check`     | Typecheck, lint, test and build in one go             |

## Configuring the default WhatsApp number

1. Open the app and click the **Settings** icon (top-right of the cash entry panel). A blue dot means no default number is set yet.
2. Enter the shop's WhatsApp number, for example `98765 43210` or `+91 98765-43210`. The dialog shows the normalised number it will use.
3. Optionally set a shop name, the message language (English/हिन्दी), whether to include the date, and whether to show the ₹2,000 note.
4. Click **Save**.

The settings are stored only in this browser's `localStorage`. No phone number is hard-coded in the source.

### How the recipient is chosen

1. If a customer number is entered and valid, the summary goes to that customer.
2. If the customer number is entered but invalid, sharing stops with an error. It never falls back to the default number silently.
3. If the customer field is blank, the default number from Settings is used.
4. If neither number is available, the app asks you to enter one or open Settings.

The number that will be used is always shown under the field before you share.

Numbers are accepted with or without `+91`, `91`, `0` or `0091` prefixes, and with spaces, hyphens or brackets. They must be 10-digit Indian mobile numbers starting with 6–9. They are normalised to `91XXXXXXXXXX` for the link.

## How WhatsApp sharing works

The app uses WhatsApp's official Click to Chat link:

```
https://wa.me/919876543210?text=<encodeURIComponent(message)>
```

**Share on WhatsApp** opens WhatsApp (the app on phones, WhatsApp Web or Desktop on computers) with the summary already filled in. **WhatsApp does not send it automatically.** The shopkeeper reviews the message and presses **Send** in WhatsApp, and the app never reports a message as sent. If the number isn't registered on WhatsApp, WhatsApp itself will say so.

Example message:

```
*Cash Received — Sharma Stores*
Date: 12 Oct 2026, 2:30 pm

Denomination Breakdown:
_Notes_
₹500 × 4 = ₹2,000
₹200 × 2 = ₹400

Total Notes: 6
Total Coins: 0
Total Pieces: 6

*Grand Total: ₹2,400*

Amount in Words: Two Thousand Four Hundred Rupees Only.

Thank you!
```

Only rows with a quantity above zero are included. Sharing is disabled while the total is ₹0.

## Privacy

- All calculations run in the browser, in React state. Nothing is sent to the app's server, and the server only serves static files.
- Quantities and customer numbers are never saved. Reloading or closing the page clears them.
- Only the shop settings (shop name, default number, language, date toggle, ₹2,000 toggle) are kept in `localStorage` on the device.
- There is no account, database, cookies, analytics or transaction history.
- Cash details leave the device only when you click **Share on WhatsApp**. The summary is then placed in the `wa.me` link and handed to WhatsApp, which sends it only after you confirm there.
- Nothing sensitive is logged to the console.

## Architecture

```
app/
  layout.tsx            Metadata, viewport, service-worker registration
  page.tsx              Renders <AppShell />
  manifest.ts           PWA manifest
  globals.css           Design tokens (light/dark), Tailwind v4 theme
components/
  app/
    AppShell.tsx          Mode switch + all three modes (inactive ones hidden, state kept)
    ModeSwitch.tsx        The three top-level modes
    SegmentedTabs.tsx     Reusable segmented control (ARIA tabs, arrow/Home/End keys)
  calculator/
    CalculatorMode.tsx    Calculator mode (standard calculator only)
    DiscountMode.tsx      Discount Calculator mode with its two tabs
    StandardCalculator.tsx  Keypad, display, physical keyboard support
    DiscountCalculator.tsx  Customer Discount tab: price, % presets, results, copy, clear
    SellingPriceCalculator.tsx  Selling Price / Margin tab: margin or markup pricing
    controls.tsx          Shared preset button and result row
    ReverseDiscountCalculator.tsx  Selling price → original price
    NumberField.tsx       Decimal input with ₹/% affixes and validation
  cash-counter/
    CashCounter.tsx       State owner: quantities, customer number, share/copy/clear/undo
    DenominationSection.tsx  Notes or coins group with subtotal
    DenominationRow.tsx   Quantity field, stepper, validation, keyboard handling (memoised)
    LiveSummary.tsx       Grand total, words, counts, breakdown
    WhatsAppShare.tsx     Customer number, recipient preview, Share + Copy
    CounterSettings.tsx   <dialog>-based settings form
  pwa/ServiceWorkerRegister.tsx
lib/
  currency.ts           Denominations, quantity parsing, calculateTotals() — the single source of truth
  format-currency.ts    Indian digit grouping and ₹ formatting (deterministic, no ICU dependence)
  amount-in-words.ts    Indian-system number to words, English and Hindi
  phone.ts              Indian mobile validation and normalisation
  whatsapp.ts           Recipient resolution, message builder, wa.me URL builder
  settings.ts           localStorage settings store (useSyncExternalStore)
  clipboard.ts          Clipboard with legacy fallback
  calculator.ts         Calculator reducer, precedence evaluation, display formatting
  discount-calculations.ts  Paise-exact discount and reverse-discount maths
  margin-calculations.ts    Selling price from profit margin or cost markup
types/cash-counter.ts
public/sw.js            Offline cache (app shell + static assets only)
scripts/generate-icons.mjs  Regenerates PNG icons via next/og
tests/                  Vitest unit tests
```

Every number on screen and in the WhatsApp message comes from one `calculateTotals()` result. That means row amounts, subtotals, counts, the summary and the message cannot disagree. The calculation also re-validates each quantity, so a corrupted value counts as zero rather than distorting the total.

## Testing

`npm test` runs 173 unit tests. The 91 for the Cash Counter cover:

- Calculation rules, including ₹500×4 + ₹200×2 = ₹2,400, empty totals, independent ₹10 note/coin counts, and corrupted or maximum values.
- Quantity parsing.
- Indian grouping for thousands, lakhs and crores.
- English/Hindi words for every value from 1 to 99,999.
- Phone validation.
- Recipient priority rules.
- The exact message format.
- URL encoding of `₹`, `×`, `—`, `&`, `#`, spaces and newlines.
- Settings sanitising.

The other 82 cover:
- The standard calculator: arithmetic, precedence, decimals, %, ±, backspace, divide-by-zero and keyboard mapping.
- The discount maths: presets, 0%/100%, paise rounding, reverse calculation and validation messages.
- Selling-price maths: margin vs markup, the 100% limit, zero cost, decimals and round-up behaviour.

The app was also checked in a real browser at 360, 390, 768, 1024, 1280, 1366 and 1440 px widths. The checks covered live updates, keyboard navigation, invalid input, Clear/Undo, the WhatsApp URL and recipient, Copy, the Hindi message, the ₹2,000 toggle, reload clearing, no horizontal overflow and dark mode.

## Deploying to Vercel

1. Push this repository to GitHub, GitLab or Bitbucket.
2. In Vercel, choose **Add New → Project** and import the repository. The Next.js preset is detected automatically and needs no environment variables.
3. Click **Deploy**.

Or from the CLI:

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production
```

Every route is statically prerendered, so the app runs entirely from Vercel's CDN.

## Known limitations

- Click to Chat can only pre-fill a message. The shopkeeper must press **Send** in WhatsApp, and the app cannot confirm delivery.
- Only Indian (+91) mobile numbers are supported as recipients.
- The maximum is 99,999 pieces per denomination row.
- Typing a decimal point is rejected keystroke by keystroke. So typing `2.5` shows a warning on `.` and ends up as `25`. Pasting `2.5` is rejected as a whole.
- Offline mode needs one successful online visit first, and service workers only run on HTTPS or localhost.
- On desktop, WhatsApp opens in a new tab (WhatsApp Web) or hands off to WhatsApp Desktop if it is installed.
