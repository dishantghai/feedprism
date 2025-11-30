# FeedPrism Product Workflow

> Minimal overhead, AI-assisted, spec-driven development.

---

## How It Works

```
IDEA → BACKLOG → SPEC → BUILD → DONE
```

1. **Capture ideas quickly** → Add one-liner to `BACKLOG.md`
2. **When ready to build** → Create a spec in `specs/`
3. **AI helps elaborate** → Give AI the spec, it does the research and builds
4. **Done** → Move to archive, update status

---

## The Backlog

`BACKLOG.md` is a simple list. Each item needs only:

```markdown
### [F|B|I|T]-NNN: Short Title
Priority: P0|P1|P2
One sentence describing what and why.
```

**Prefixes:**
- `F` = Feature
- `B` = Bug  
- `I` = Improvement (UX, refactor, perf)
- `T` = Tech debt

**Priorities:**
- `P0` = Do now (blocking or critical)
- `P1` = Do soon (next sprint)
- `P2` = Do later (nice to have)

That's it. No estimates, no assignees, no ceremony.

---

## Creating a Spec

When you're ready to build something, create a spec file:

```
specs/F-001-feature-name.md
```

A spec has **4 sections max**:

```markdown
# F-001: Feature Name

## Problem
What's broken or missing? Why does it matter?

## Goal
What does "done" look like? Be specific.

## Approach (optional)
Any technical direction or constraints? Skip if obvious.

## Notes (optional)
Edge cases, open questions, related items.
```

**The AI handles the rest.** When you give the spec to your AI assistant:
- It reads the codebase
- It proposes implementation
- It builds it
- You review

---

## Working With AI

When starting work on an item:

```
"Let's work on F-001. Here's the spec: [paste or reference file]"
```

The AI will:
1. Read the spec
2. Explore the codebase for context
3. Propose an approach (or use yours)
4. Implement incrementally
5. You verify and iterate

**Tips:**
- Keep specs focused (one thing per spec)
- Let AI suggest refinements to the spec
- Specs can evolve during implementation
- Don't over-specify upfront

---

## Lifecycle

```
BACKLOG.md              → Active items waiting to be built
specs/                  → Specs for items in progress
archive/YYYY-MM/        → Completed specs (moved monthly)
```

When done:
1. Mark complete in `BACKLOG.md` (prefix with ✅)
2. Move spec to `archive/YYYY-MM/`
3. Update `PROJECT_STATUS.md` if needed

---

## Quick Commands

**Add an idea:**
```markdown
### F-012: Add dark mode toggle
Priority: P2
Users want to switch themes without system preference.
```

**Create a spec:**
```bash
touch specs/F-012-dark-mode-toggle.md
# Fill in Problem, Goal, (Approach), (Notes)
```

**Start building:**
```
"Let's implement F-012. The spec is in specs/F-012-dark-mode-toggle.md"
```

---

## Anti-Patterns to Avoid

❌ **Don't** write detailed implementation specs upfront (AI figures it out)  
❌ **Don't** add fields you won't use (estimates, story points, epics)  
❌ **Don't** let items rot in backlog (review weekly, prune aggressively)  
❌ **Don't** create specs for tiny fixes (just do them)  

✅ **Do** capture ideas immediately (even half-formed)  
✅ **Do** keep specs focused on *what* and *why*, not *how*  
✅ **Do** let specs evolve during implementation  
✅ **Do** archive completed work for future reference  

---

**That's the whole system.** No tools, no boards, no process overhead.
