# AI Memory System — Integration Guide

## Overview

The Bulbul Lean Agent uses a lightweight, file-based memory system to improve long-term project understanding, reduce repeated explanations, and maintain coding consistency.

This is **NOT** a cloud or AI memory system—it's a local markdown-based knowledge store.

---

## Memory Architecture

### Directory
```
.ai-memory/
├── user-preferences.md
├── ui-decisions.md
├── architecture-notes.md
├── project-rules.md
├── known-bugs.md
├── current-focus.md
└── session-summary.md
```

### File Purposes

| File | Purpose | Max Size |
|------|---------|----------|
| `user-preferences.md` | Workflow, UI tastes, style preferences | 80 lines |
| `ui-decisions.md` | Approved UI patterns, layout rules, spacing | 100 lines |
| `architecture-notes.md` | Architecture decisions, IPC/DB patterns, reusable structures | 120 lines |
| `project-rules.md` | Permanent constraints (SQLite, Electron, security, naming) | 100 lines |
| `known-bugs.md` | Recurring bugs, dangerous patterns, regressions | 80 lines |
| `current-focus.md` | Active areas, incomplete systems, priorities | 60 lines |
| `session-summary.md` | Task summaries and next steps (updated after each session) | 150 lines |

---

## Workflow

### Before Starting a Task

1. **Read all memory files** (takes 2-3 minutes)
2. **Inspect existing components** related to the task
3. **Check project rules** for hard constraints
4. **Scan known bugs** to avoid past mistakes
5. **Review architecture notes** for system design patterns

### During Task Execution

- Follow memory guidance + current Bulbul Lean rules
- Reuse existing code and patterns
- Respect user preferences and UI decisions
- Keep changes small and focused

### After Completing a Task

1. **Update `session-summary.md`** with:
   - Completed tasks
   - Files changed
   - Build status
   - Issues encountered
   - Next steps

2. **Suggest memory updates** if:
   - New recurring patterns detected → update `user-preferences.md`
   - New bug patterns discovered → update `known-bugs.md`
   - Important architectural decision made → update `architecture-notes.md`

3. **Keep explanations brief** (no essays, no repeated rules)

---

## Memory Maintenance Rules

### What to Store
- **Decisions**: Approved UI patterns, architecture choices
- **Patterns**: Recurring user preferences, common mistakes
- **Constraints**: Permanent project rules, security guardrails
- **Focus**: Active development areas and priorities
- **Lessons**: Bugs discovered, patterns to avoid

### What NOT to Store
- Chat history or conversation transcripts
- Repeated rule statements (reference project-rules.md instead)
- Duplicate information across files
- Excessive detail or essays
- Personal notes or brainstorming

### Keep Memory Lightweight
- **Bullet points** over paragraphs
- **Concise phrasing** (5-10 words per point)
- **Structured lists** over prose
- **Links to files** instead of copying code
- **Maximum 150 lines per file** (session-summary larger when needed)

---

## Token Efficiency

Loading all memory files:
- 7 files × ~80-120 lines average = ~700 lines
- Token cost: ~2,500-3,000 tokens (very low)
- Trade-off: Better long-term consistency and fewer repeated explanations

---

## Integration with Agent Config

The agent automatically:
1. Loads memory before each task (pre_task_rules)
2. Reads all files in `.ai-memory/` directory
3. Applies memory guidance alongside skill files
4. Prompts for memory updates after completing tasks

---

## Quick Reference

**Before coding**: Read `project-rules.md` + `known-bugs.md` + `current-focus.md`

**During coding**: Follow `architecture-notes.md` + `ui-decisions.md` + Bulbul Lean rules

**After coding**: Update `session-summary.md` + suggest memory updates

**If stuck**: Check `known-bugs.md` for past solutions

---

## Example: Adding a New Feature

1. Read `current-focus.md` → understand what to prioritize
2. Check `architecture-notes.md` → follow existing patterns
3. Scan `known-bugs.md` → avoid past mistakes (e.g., missing i18n keys, nested state updates)
4. Build feature following `ui-decisions.md` + `user-preferences.md`
5. Run `npm run build` to verify
6. Update `session-summary.md` with what was done
7. Suggest updates if new patterns discovered
