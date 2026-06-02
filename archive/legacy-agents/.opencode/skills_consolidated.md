# Consolidated OpenCode Skills Archive

Here is the archive of all skill files previously located in `.opencode/skills/`.

---

## 1. concise-planning.md
- Start with a short execution plan: inspect, modify, verify.
- Keep plans to 3-5 focused steps.
- Do not write long reports or repeated rule restatements.
- Use existing project structure as the first design constraint.
- Summarize only what changed and why.

---

## 2. database-design.md
- Use the local SQLite schema under `database/schema` as the source of truth.
- Prefer prepared statements and parameter binding for all SQL queries.
- Use transactions for multi-table operations, especially invoices and inventory updates.
- Preserve location-based inventory movement and avoid adding new sync tables.
- Keep schema changes minimal and aligned with current ERP flows.
- Reuse existing database service patterns before creating new data access helpers.

---

## 3. electron-development.md
- Preserve `contextIsolation`, `sandbox`, and `preload` IPC whitelist behavior.
- Use the existing `electron/ipc/*.ipc.ts` naming and channel patterns.
- Handle every IPC request in `try/catch` and return structured success/error results.
- Never enable `nodeIntegration` in renderer.
- Do not add cloud or remote network logic to Electron main/preload.
- Keep IPC surface minimal and reuse existing services before adding a new channel.

---

## 4. performance-engineer.md
- Optimize by reusing existing Zustand selectors and memoized UI patterns.
- Avoid rendering large tables repeatedly; reuse current list and table design.
- Do not introduce premature optimization or new state frameworks.
- Keep performance work focused on slow render or blocking IPC paths.
- Prefer existing Tailwind-based layouts and avoid bulky new DOM structure.

---

## 5. react-patterns.md
- Use existing React and Tailwind patterns from `src/features` and `src/shared/components`.
- Prefer local component state or Zustand state slices instead of global refactors.
- Keep component files small; avoid one huge page file.
- Reuse existing page layouts and form patterns before introducing new UI containers.
- Use existing hooks and utilities; do not add new frameworks or styling systems.
- Preserve current route / feature module boundaries and file naming.

---

## 6. security-auditor.md
- No cloud auth or remote services; keep security local and desktop-only.
- Validate access inside Electron main/IPC, not just in renderer UI.
- Never store plaintext credentials or secret keys in source.
- Use existing hashing and validation patterns; do not add new auth stacks.
- Confirm IPC handlers do not execute arbitrary payloads.
- Prefer secure defaults and explicit permission checks.

---

## 7. systematic-debugging.md
- Reproduce the issue locally before editing code.
- Inspect current component, service, and IPC flow first.
- Prefer small, targeted fixes over broad refactors.
- Keep existing behavior intact while resolving the bug.
- Verify by running `npm run build` and project tests.
- Use logs and existing test coverage to confirm the fix.

---

## 8. ui-skills.md
- Preserve the current dark-friendly, professional Tailwind theme.
- Reuse shared UI atoms and components; avoid new design systems.
- Prefer existing Purchase/Sales layout structure and spacing patterns.
- Keep UI changes incremental and consistent with current desktop ERP style.
- Avoid introducing heavy visual libraries, new color palettes, or animation frameworks.
- Keep forms accessible and responsive within the existing Electron window layout.
