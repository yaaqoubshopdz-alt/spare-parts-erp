# Memory Maintenance Rules

## Golden Rules

1. **Keep It Small**: Every file under 100 lines (session-summary up to 150)
2. **Keep It Practical**: Bullets and lists, not essays
3. **No Duplication**: Never repeat info across files
4. **Update Immediately**: Don't batch memory updates
5. **Token Efficient**: ~3,000 tokens to load entire memory (very cheap)

---

## File-Specific Maintenance

### user-preferences.md
- **When to add**: User states preference 3+ times
- **Remove**: Preferences that no longer apply
- **Update**: Refinements to existing preferences
- **Lines**: Keep under 80 lines
- **Structure**: Categories (Development Workflow, UI/UX, Project Approach, Code Style)

### ui-decisions.md
- **When to add**: Design decision finalized and approved
- **Remove**: Deprecated patterns (old theme colors, old form styles)
- **Update**: Refinements to approved patterns
- **Lines**: Keep under 100 lines
- **Structure**: Categories (Theme, Layout, Spacing, Headers, Pagination, Forms)
- **Reference**: Link to actual component files when applicable

### architecture-notes.md
- **When to add**: New pattern or architecture decision
- **Remove**: Never remove (historical decisions matter)
- **Update**: Add new subsections for new patterns
- **Lines**: Keep under 120 lines
- **Structure**: Core Architecture, IPC Patterns, Database Rules, Component Structure, Services
- **Reference**: Link to actual implementation files

### project-rules.md
- **When to add**: New permanent constraint discovered
- **Remove**: Never (rules are permanent guardrails)
- **Update**: Clarify existing rules with examples
- **Lines**: Keep under 100 lines
- **Structure**: Permanent Rules, Architecture Constraints, Security Constraints, Quality Constraints, Naming

### known-bugs.md
- **When to add**: Bug fixed or pattern discovered
- **Remove**: Only if bug is proven non-existent or no longer relevant
- **Update**: Add new subsections for new patterns
- **Lines**: Keep under 80 lines
- **Structure**: Previous Issues, Dangerous Patterns, Recurring Mistakes, Regressions, Testing Gaps

### current-focus.md
- **When to add**: New development area identified
- **Remove**: Areas marked as complete
- **Update**: Every time priorities shift
- **Lines**: Keep under 60 lines
- **Structure**: Active Areas, Incomplete Systems, Priorities, Short-term Focus, Future Enhancements

### session-summary.md
- **When to add**: After every completed session
- **Remove**: Keep last 5-10 sessions, archive older ones
- **Update**: New summary each session
- **Lines**: Up to 150 lines per entry
- **Structure**: Date, Tasks Completed, Key Changes, Build Status, Issues, Memory Updates, Next Steps

---

## How to Avoid Memory Bloat

### ❌ Don't Store
- Chat transcripts or conversation history
- Full code snippets (reference file paths instead)
- Repeated rule statements
- Personal notes or brainstorming
- Implementation details (those go in code)
- Stack traces or error logs

### ✅ Store Instead
- **Decisions**: "Approved dark theme with CSS variables"
- **Patterns**: "Use roundTo2() for financial calculations"
- **Constraints**: "No cloud services, SQLite only"
- **References**: "See src/shared/utils/calculations.ts for roundTo2()"
- **Links**: "[ProductForm](../src/features/products/components/ProductForm.tsx)"

---

## Anti-Patterns to Avoid

### Pattern 1: Memory Duplication
❌ **Bad**: Same rule in both `project-rules.md` and `architecture-notes.md`  
✅ **Good**: Store in `project-rules.md`, reference from `architecture-notes.md`

### Pattern 2: Excessive Detail
❌ **Bad**: "When implementing a feature, consider the following 20-step process..."  
✅ **Good**: "Follow IPC patterns in architecture-notes.md"

### Pattern 3: Outdated Info
❌ **Bad**: Keep outdated preferences and rules "for history"  
✅ **Good**: Update immediately when rule changes, add date to significant updates

### Pattern 4: Abandoning Memory
❌ **Bad**: Stop reading/updating memory after 2 weeks  
✅ **Good**: Make memory reading and updating part of every task

### Pattern 5: Over-Granular Sections
❌ **Bad**: "user-preferences.md" has 50 subsections for every small preference  
✅ **Good**: Group related preferences into categories (5-8 categories max)

---

## What Good Memory Looks Like

### Example: user-preferences.md (Good)
```markdown
## Development Workflow
- Prefers execution-first over long explanations
- Values concise, focused code changes
- Wants build verification after modifications

## UI/UX Preferences
- Dark, professional Tailwind theme
- Reuse existing Purchase/Sales patterns
- Extend existing UI rather than rebuild
```

### Example: user-preferences.md (Bad)
```markdown
## The User's Development Workflow Details
When the user develops, they prefer an execution-first approach...
[3 paragraphs of explanation]
Also, they want... [another paragraph]
Additionally, the user prefers... [another paragraph]
```

---

## When to Consolidate Memory

### Consolidate When
- Same topic appears in multiple files (merge into one, reference from others)
- Session summaries reach 5-10 entries (archive older ones)
- A preference or rule appears multiple times (move to permanent section)

### Don't Consolidate When
- It reduces clarity or increases file size
- It removes useful historical context
- It crosses different file purposes

---

## Token Budget

### Memory Load Cost
- 7 core memory files: ~2,500-3,000 tokens
- **Per-session cost**: 3,000 tokens (one-time load per session)
- **Saved per-session**: ~5,000-10,000 tokens (no repeated explanations)
- **Net savings**: 2,000-7,000 tokens per session

### Memory Update Cost
- Session summary: ~200-300 tokens
- Suggestion to update: ~100 tokens
- **Total update overhead**: ~400 tokens per session
- **Still net positive**: More saved than spent

---

## Maintenance Checklist

### Daily (During Session)
- [ ] Read memory at task start
- [ ] Follow memory guidance
- [ ] Update session summary at task end

### Weekly (Optional)
- [ ] Review session summaries for patterns
- [ ] Check if any user preferences repeat
- [ ] Verify all files under max line count

### Monthly (Optional)
- [ ] Archive old session summaries (keep last 10)
- [ ] Consolidate similar entries
- [ ] Update current-focus.md with progress

### Annually (Optional)
- [ ] Review all permanent rules (project-rules.md)
- [ ] Archive superseded architecture decisions
- [ ] Clean up outdated known-bugs

---

## Emergency Reset

If memory becomes corrupted or outdated:

1. Delete `.ai-memory/` directory
2. Recreate from templates
3. Start fresh with current project state
4. Rebuild memory over next 3-5 sessions

**Estimated recovery time**: 2 hours to rebuild comprehensive memory
