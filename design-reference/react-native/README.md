# Dangote Loan — React Native UI

React Native (Expo) port of the merged design in `../DESIGN_NOTES.md` and `../prototype/index.html`.

## Run it

```bash
cd design-reference/react-native
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android), or press `w` for web, `i`/`a` for a simulator/emulator.

## Structure

```
App.js                        # theme provider + simple 5-route shell + bottom nav
src/theme/theme.js             # dark (lime) + light (blue) color tokens
src/theme/ThemeContext.js      # useAppTheme() hook, toggleTheme()
src/components/                # shared building blocks (buttons, cards, gauge, tabs, nav...)
src/screens/
  HomeScreen.js                 # hero + loan progress bar + popular loans (video-inspired)
  BorrowAmountScreen.js         # amount stepper prompt (screenshot-inspired)
  RepaymentTermScreen.js        # term radio cards (screenshot-inspired)
  CreditScoreScreen.js          # SVG gauge + summary grid (screenshot-inspired)
  LoanDetailScreen.js           # frequency tabs + unpaid bills (video-inspired)
```

## Notes

- Navigation here is a minimal `useState` router to keep the sample dependency-free. Swap in
  `@react-navigation/native` + a stack/tab navigator for a real app — the screens don't need to change,
  just how `App.js` renders them.
- `CreditGauge` draws its arc with `react-native-svg`; the fill angle is computed from `score / max`.
- All colors/spacing come from `src/theme/theme.js` — change tokens there to retheme every screen at once.
- Bottom nav currently shows 3 tabs (Home / Borrow / Credit); the loan-detail screen is reachable via
  "Apply Loan" on the Home Loan row and returns to Home via the back arrow.
