# Data-First Architecture Methodology

## The Principle: No UI-Only Features

**Every feature must touch the database.** If it doesn't read from or write to the database, it doesn't belong in the application.

## Terminology & Patterns

This architecture follows several established patterns:

### 1. **Data-Centric Design**
The database is the source of truth. All UI derives from database state.
- Alternative names: "Database-first development"
- Opposite: "UI-first development" (❌ avoid)

### 2. **Query-Derived UI**
UI components render results of database queries, not hardcoded values.
```typescript
// ✅ CORRECT - Query derives UI
const people = tree.people  // From database
const display = people.map(p => <PersonLink>{p.name}</PersonLink>)

// ❌ WRONG - Hardcoded UI
const display = [
  <PersonLink>Mary</PersonLink>,
  <PersonLink>John</PersonLink>
]
```

### 3. **Console Pattern**
The UI is a **console/dashboard for database manipulation**, not a feature engine.
- Forms are input methods (CREATE/UPDATE)
- Views are query results (SELECT)
- Exports are data serialization (READ all)

### 4. **CQRS-Lite** (Command Query Responsibility Separation)
Commands (writes) and Queries (reads) are separated:
- **Commands**: AddPersonForm, AddMemoryForm, EditBioForm
- **Queries**: MemoryBrowser, Timeline, Dashboard

### 5. **Constraint-Based Development**
Add a self-imposed constraint: **"Every feature must pass this test:"**
```
Feature Test Checklist:
☐ Does it create data? (INSERT)
☐ Does it read data? (SELECT)  
☐ Does it update data? (UPDATE)
☐ Does it delete data? (DELETE)
☐ Does it organize data? (filtering/sorting)
☐ Does it export data? (serialization)

If none of the above: ❌ REJECT - Not a real feature
```

## How to Enforce This Methodology

### 1. **Code Review Checklist**

When reviewing any new feature, ask:
```
- Does this feature touch the database?
  If NO → Why does it exist?
  
- Is the UI hardcoded or derived?
  If hardcoded → Derive from database
  
- Is there business logic in the component?
  If YES → Move to service layer
  
- Does this create "UI state" separate from database?
  If YES → Consolidate with database state
```

### 2. **Feature Template**

Before building, fill this out:
```markdown
## Feature: [Name]

### Database Operation
- [ ] CREATE new data type
- [ ] READ existing data type  
- [ ] UPDATE data type
- [ ] DELETE data type
- [ ] QUERY/FILTER data

**SQL equivalent:**
```sql
SELECT * FROM [table] WHERE [condition] ORDER BY [field]
```

### UI Components Needed
- [ ] Form component (if CREATE/UPDATE)
- [ ] Display component (if READ)
- [ ] Query interface (if filtering)

### Implementation Checklist
- [ ] Database schema defined
- [ ] Service layer method created
- [ ] Component uses service only
- [ ] No hardcoded values
- [ ] Derived from live database state
```

### 3. **Architecture Decision Record (ADR)**

Create a file: `ARCHITECTURE_DECISIONS.md`

```markdown
## ADR-001: Data-First Architecture

**Status:** APPROVED

**Decision:** Every feature must be tied to database operations.

**Rationale:**
- Ensures single source of truth
- Prevents UI state divergence
- Makes testing straightforward
- Enables easy UI replacement

**Consequences:**
- No "nice to have" UI-only features
- Slightly more upfront database design
- Disciplined feature scope
- Easier debugging and maintenance

**Violating This ADR:**
- Adding UI logic not backed by database
- Hardcoding values in components
- Creating derived state separate from DB
- "Just for now" quick hacks

**Enforcement:**
- Code review checklist (see template)
- Every PR must explain: "What database operation does this enable?"
```

## Real-World Examples

### ✅ GOOD: Features That Follow the Methodology

```typescript
// Feature: "Add Person"
// DB Operation: INSERT
Form → handleSavePerson() → PersistenceService.savePerson() → Firebase

// Feature: "View Memories by Person"
// DB Operation: SELECT * WHERE personIds CONTAINS X
Component → useMemo filter → database state → render

// Feature: "Export as ZIP"
// DB Operation: SELECT * (all) → Serialize
Button → ExportService.exportAsZIP() → Firebase read → ZIP → Download

// Feature: "Show person count"
// DB Operation: SELECT COUNT(*)
Dashboard → tree.people.length → display number
```

### ❌ BAD: Features That Violate the Methodology

```typescript
// ❌ "Dark mode toggle"
// DB Operation: None (pure UI)
setDarkMode(!darkMode)  // No database touch
❌ REJECT

// ❌ "Show a banner if memory count > 100"
// DB Operation: Implied but hardcoded condition
if (memories.length > 100) { showBanner() }
// Better: Create database view/flag instead
❌ Better to make this configurable in DB

// ❌ "Sort memories newest first by default"
// DB Operation: The sorting is fine, but if hardcoded...
const sorted = [...memories].reverse()  // Wrong
// Better: Have database return pre-sorted
✅ const sorted = memories  // Already sorted by service

// ❌ "Disable button if no person selected"
// DB Operation: None (pure UI state)
<button disabled={!selectedPersonId} />
// This is OK as long as selectedPersonId comes from database
// But if selectedPersonId is arbitrary UI state → ❌ REJECT
```

## Decision Tree: Should This Feature Exist?

```
┌─ Does this feature read/write/organize database data?
│
├─ YES → ✅ GOOD FEATURE
│   ├─ Is it a form? → AddForm component
│   ├─ Is it a query? → Browser/View component
│   └─ Is it an export? → Export method
│
└─ NO → ❌ QUESTION IT
    ├─ Is it cosmetic? (color, animation) 
    │  └─ Still valid if it doesn't add logic
    │
    ├─ Is it functional but UI-only?
    │  └─ ❌ REJECT - Or tie to database
    │
    └─ Example: "Show loading spinner"
       ✅ VALID - It reflects database operation state
       (loading from Firebase, etc.)
```

## The Anti-Pattern to Avoid: Feature Creep

```
❌ Start: "Let me add a nice button here"
   → "Let me add some UI state for it"
   → "Let me add some derived logic"
   → "Let me add another helper function"
   → "Let me add another component"
   → *Suddenly 500 lines of UI code with zero database connection*

✅ Start: "I need users to tag memories by season"
   → Add `tags.season` to Memory schema
   → Create DatabaseService.addSeasonTag()
   → Create form UI for tag input
   → Create query view filtering by season
   → Add export including season metadata
   → Done: 50 lines, tight integration with database
```

## Monitoring & Maintenance

### Warning Signs

If you see these, **violate the methodology**:
- 🚩 UI component with internal state lasting > 5 seconds
- 🚩 Hardcoded lists, counts, or values
- 🚩 Helper functions that don't touch a service
- 🚩 CSS/animation that takes 30+ minutes to implement
- 🚩 "Let me just add this quick thing"

### Health Checks

Run quarterly:
```typescript
// Find all component state
const componentState = grep('useState', 'src/components')

// For each, ask:
// - Does it reflect database state?
// - Could it be derived from database?
// - Is it temporary UI fluff?

// Find all hardcoded values
const hardcoded = grep('const [a-z]+ = \["[A-Z]', 'src/components')

// For each, ask:
// - Should this come from database?
// - Is it configuration?
```

## Future Scalability

This methodology scales because:

✅ **Migrating databases** (Firebase → PostgreSQL):
- Only change service layer
- UI stays identical

✅ **Adding API backend**:
- Services already structured for this
- UI doesn't need to change

✅ **Replacing UI framework** (React → Vue):
- Components become different, but structure same
- Database operations identical

✅ **Scaling to 1M records**:
- Add pagination/caching at service layer
- UI logic doesn't need to change

## Summary

| Aspect | Data-First | UI-First |
|--------|-----------|----------|
| Source of Truth | Database | UI state |
| Feature definition | "What DB operation?" | "What would be cool?" |
| Testing | Easy - test DB operations | Hard - mock UI state |
| Debugging | Clear - trace to DB | Complex - UI state divergence |
| Maintenance | Stable - DB changes are intentional | Fragile - UI changes break things |
| Scalability | Clean - layers can be swapped | Messy - tight coupling |
| Developer velocity | Slower initially, faster long-term | Fast initially, slower long-term |

## Enforcement in Practice

### For Team Members
1. Read `DATABASE_ARCHITECTURE.md` - understand layers
2. Read `UI_CONSOLE_DATA_FLOW.md` - understand data flow
3. Before implementing: "What database operation does this enable?"
4. Code review: Checklist above
5. Question features that don't touch DB

### For Project Owner
1. During feature requests: "How will this change the database?"
2. If no answer: Don't build it
3. Pushback on "nice to haves" that don't touch data
4. Celebrate simplicity (code that doesn't exist is code that can't break)

## The Business Case

**Why enforce data-first architecture?**

```
❌ UI-first app (6 months):
- Fast initial delivery
- Lots of UI features
- But: Brittle, hard to test, slow to change
- Technical debt accumulates
- Adding new DB operation later is painful

✅ Data-first app (6 months):
- Slower initial delivery
- Fewer UI features (only real ones)
- But: Robust, easy to test, fast to change
- Technical debt minimal
- Adding new DB operation later is trivial
- Can swap UI entirely without touching DB

At 6 months: They look the same
At 12 months: Data-first app is 3x faster to modify
```

---

**This is your competitive advantage.** Most web apps are UI-first chaos. Yours is disciplined infrastructure.
