# Known Bugs & Patterns to Avoid

## Previous Issues
- Nested state updates in React: Use separate setState closures, not nested `setState` inside `setState`
- SQL injection: Any attempt to build SQL with concatenation or backtick interpolation causes silent failures
- IPC handlers without try/catch: Unhandled errors crash the main process silently
- Missing i18n keys: Hardcoded strings bypass translation system
- roundTo2 missed: Financial calculations without rounding cause decimal precision errors

## Dangerous Patterns (Do Not Repeat)
- Do not use `Object.assign()` in Zustand selectors; prefer spread or explicit updates
- Do not add cloud services without discussion; stick to offline-first
- Do not create new UI component systems; reuse Tailwind + existing atoms
- Do not build SQL with template literals or concatenation
- Do not skip IPC whitelist updates when adding new channels
- Do not store plaintext secrets in source files or environment variables

## Recurring Mistakes
- Forgetting `npm run build` after edits (causes out-of-sync artifacts)
- Hardcoding form labels instead of using i18n keys
- Missing error handling in IPC handlers (crashes main process)
- Creating large monolithic page files instead of splitting into sub-components
- Adding new package dependencies without checking existing utilities

## Regressions to Watch
- Build failures after TypeScript changes
- IPC channel mismatches between preload and main
- Inventory calculations losing precision (roundTo2 required)
- Infinite render loops in React components with missing useCallback dependencies
- Database queries missing prepared statement parameters

## Testing Gaps
- No comprehensive integration tests for invoice→inventory→ledger flow
- Limited edge case coverage for location-based inventory movements
- Missing validation tests for concurrent sales and purchases
- Incomplete test coverage for financial calculations across modules

