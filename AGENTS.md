# Repository Guidelines

## Project Structure & Architecture

`App.js` composes navigation, React Native Paper, safe-area handling, and startup.
Put screens in `page/`; put shared UI, hooks, types, and helpers in `module/`.
`resource/` contains assets; Jest tests and setup are in `__tests__/` and `jest/`.
Keep Android and iOS configuration in `android/` and `ios/`.

SQLite access and schema migrations belong in `module/SQLite.ts`.
`Record`, `Note`, and `Setting` are core tables; `Top_Note` is a view.
For persistent-data changes, add a versioned `doUpdate` migration and update
`startUp` for new databases. Never bypass or rewrite earlier migrations:
installed databases upgrade incrementally.

## Build, Test, and Development Commands

- `yarn start` — start Metro.
- `yarn android` / `yarn ios` — build and launch the debug app.
- `yarn test --watchAll=false` — run Jest once with native-module mocks.
- `yarn lint` — run ESLint and Prettier rules.
- `yarn build_apk` / `yarn build_aab` — build signed Android releases; local
  signing configuration is required.

Use Node 18 or newer. For an Android bundle smoke check, run:

```sh
npx react-native bundle --platform android --dev true --entry-file index.js \
  --bundle-output /tmp/eveapp-index.android.bundle \
  --assets-dest /tmp/eveapp-rn-assets --reset-cache
```

## Coding Style and Component Design

The codebase mixes JavaScript/JSX and TypeScript/TSX; follow the target file.
Use four spaces, CRLF, single quotes, semicolons, trailing commas, and 120-column
lines, as configured by `.editorconfig`, ESLint, and Prettier. Use PascalCase for
components and screens, camelCase for functions and state, and add route types to
`module/IRootStackParamList.ts`. Use `Decimal` for money and exchange rates.

## Testing, Commits, and Reviews

Add focused Jest tests in `__tests__/*.test.js` for changed logic. Commits use
prefixes such as `feat:`, `fix:`, `refactor:`, `chore:`, and `ci:`. Keep commits
focused. Pull requests should explain behaviour, validation, related issues, and
include screenshots for UI changes.

## Required Agent Rules

1. Comment code to explain the design reason and operating mechanism, not syntax.
2. Never add a runtime-behaviour fallback without the user's prior approval.
3. Inline a new component or function unless it has at least two usage sites.
4. Treat every change as subject to Claude review: favour explicit, compatible code.
5. Review feedback may be accepted or rejected after checking requirements and
   existing behaviour.
6. When rejecting feedback, tell the user the specific reason for that decision.
