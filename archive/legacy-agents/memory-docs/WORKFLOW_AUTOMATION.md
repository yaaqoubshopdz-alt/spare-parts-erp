# Memory Workflow Automation

## Automatic Workflow Triggered by Bulbul Lean Agent

### Task Start Sequence

```
1. Task request received
2. Load .ai-memory/ directory
3. Read user-preferences.md → understand workflow
4. Read project-rules.md → enforce constraints
5. Read architecture-notes.md → respect system design
6. Read ui-decisions.md → maintain consistency
7. Read known-bugs.md → avoid past mistakes
8. Read current-focus.md → align with priorities
9. Inspect existing codebase
10. Execute task following memory + Bulbul Lean rules
```

**Time cost**: ~2-3 minutes to read all memory + inspect code

### Task Completion Sequence

```
1. Verify build passes: npm run build
2. Confirm TypeScript compilation successful
3. Update session-summary.md with:
   - Date of session
   - Tasks completed (✅ checked)
   - Key file changes
   - Build status
   - Issues encountered
   - Next session notes
4. Analyze work for patterns:
   - New user preferences? → suggest user-preferences.md update
   - New bug patterns? → suggest known-bugs.md update
   - Architecture decision? → suggest architecture-notes.md update
5. Close session
```

---

## Memory Update Triggers

### When to Update `user-preferences.md`

- User explicitly states a preference (e.g., "I prefer X over Y")
- Same preference pattern appears multiple times in conversation
- User criticizes a workflow or requests consistent changes
- **Frequency**: After 3+ similar preferences observed

### When to Update `ui-decisions.md`

- New UI pattern approved for a feature
- User requests specific spacing, sizing, or layout rule
- New button style, form layout, or page structure standardized
- **Frequency**: After design decision is finalized

### When to Update `architecture-notes.md`

- New IPC pattern discovered or created
- Database schema rule established
- Component structure decision made
- New service or utility pattern adopted
- **Frequency**: When a significant pattern is decided

### When to Update `known-bugs.md`

- Bug or regression discovered and fixed
- Dangerous pattern identified (e.g., missing i18n, nested setState)
- Performance issue found and resolved
- Security issue discovered and addressed
- **Frequency**: Immediately after discovering pattern

### When to Update `current-focus.md`

- Development direction changes
- New priority area identified
- Feature or system marked as "complete"
- **Frequency**: Weekly or when direction shifts

---

## Session Summary Template

Each session ends with a brief summary:

```markdown
## Date: YYYY-MM-DD

### Tasks Completed
- ✅ [Task]: [brief description]
- ✅ [Task]: [brief description]

### Key Changes
- [file.ts]: [change type] — [1 line summary]
- [file.tsx]: [change type] — [1 line summary]

### Build Status
- ✅ TypeScript: OK
- ✅ Vite build: OK
- ✅ Tests: passed/pending

### Issues Encountered
- [Issue]: [resolution in 1 line]

### Memory Updates Suggested
- Check user-preferences.md if new patterns
- Check known-bugs.md if new issues
- Check architecture-notes.md if design decisions

### Next Session Notes
- [What to continue]
- [Watch for X issue]
```

---

## Memory Maintenance Schedule

### After Every Session
- Update `session-summary.md`

### Weekly Review (Optional)
- Scan `known-bugs.md` for patterns
- Check `current-focus.md` for alignment
- Review `user-preferences.md` for consistency

### Monthly Review (Optional)
- Archive old session summaries if needed
- Consolidate repeated patterns
- Ensure all files still under max lines

---

## Light Loading Strategy

### Initial Load (2-3 min)
- Read all 7 memory files (~2,500-3,000 tokens)
- Lightweight compared to full project documentation

### Context Reuse
- Agent retains memory throughout session
- No reload between task continuations
- Only reload at session start

### Efficiency Gains
- **Eliminated**: Repeated explanations of rules
- **Reduced**: Time spent on code reuse decisions
- **Improved**: Consistency across sessions
- **Faster**: Task execution (no "Did I do this before?" questions)

---

## Integration Checklist

✅ Memory directory created: `.ai-memory/`
✅ 7 memory files created with initial content
✅ Agent config updated: `bulbul-erp-architect.yaml`
✅ Memory purposes defined
✅ Pre-task rules documented
✅ Post-task rules documented
✅ Integration guide created
✅ Workflow automation documented
✅ Build verified after changes

---

## Quick Memory Commands (Pseudo-code)

```bash
# Start task
read_memory_files()
load_preferences()
load_rules()
inspect_project()
execute_task()

# End task
verify_build()
update_session_summary()
suggest_memory_updates()
close_session()
```

---

## Expected Outcomes

### Short-term (Days)
- Consistent code style across features
- Fewer questions about project rules
- Faster task startup and understanding

### Medium-term (Weeks)
- Identified user preferences documented
- Known bugs and patterns consolidated
- UI consistency across all pages

### Long-term (Months)
- Memory system becomes ground truth for project
- New contributors can onboard by reading memory
- Reduced AI confusion and overengineering
- Improved code quality and consistency
