# Data-First Code Review Checklist

Use this checklist for every PR/commit.

## Pre-Implementation: Feature Design

- [ ] **Feature Definition**: "What database operation does this enable?"
  - [ ] CREATE (insert new data)
  - [ ] READ (query existing data)
  - [ ] UPDATE (modify existing data)
  - [ ] DELETE (remove data)
  - [ ] FILTER/SORT (organize data)
  - [ ] EXPORT (serialize data)

- [ ] **If none of above**: This is a UI-only feature. ❌ **REJECT**

- [ ] **SQL Equivalent**: Can I write a SQL statement for what this does?
  ```sql
  Example: SELECT * FROM memories WHERE personIds CONTAINS 'id-123'
  ```

## During Implementation: Code Structure

### Components (UI Layer)
- [ ] Component imports from **services only**, not other components
- [ ] No hardcoded values, lists, or defaults
- [ ] All data comes from props or database query
- [ ] `useMemo` with proper dependencies for queries

```typescript
// ✅ GOOD
const results = useMemo(() => {
  return tree.memories.filter(m => m.tags.personIds.includes(personId))
}, [personId, tree.memories])

// ❌ BAD
const [results, setResults] = useState([
  { id: '1', name: 'Memory 1' },
  { id: '2', name: 'Memory 2' }
])
```

### Services (Logic Layer)
- [ ] Service imports **only**: types, other services, Firebase
- [ ] Service imports **NO**: React, components, CSS
- [ ] Methods are CRUD operations or queries
- [ ] Each method touches database

```typescript
// ✅ GOOD
export const ArchiveService = {
  savePerson(person: Person): Promise<string>  // Creates
  getPerson(id: string): Promise<Person | null>  // Reads
  updatePerson(person: Person): Promise<void>  // Updates
}

// ❌ BAD
export const UIHelpers = {
  formatDateForDisplay(date: Date): string  // No DB touch
  getColorForStatus(status: string): string  // No DB touch
}
```

### Styling (Presentation Layer)
- [ ] CSS in `.css` files, not inline styles
- [ ] No JavaScript-driven styles (use CSS classes)
- [ ] No hardcoded breakpoints that don't match design system

```typescript
// ✅ GOOD
return <div className="memory-card">{content}</div>

// ❌ BAD
return <div style={{
  background: '#1e1b4b',
  padding: '12px',
  borderRadius: '8px'
}}>{content}</div>
```

## Post-Implementation: Testing

- [ ] **Database Operation Test**: Does it actually touch the DB?
  - [ ] Add person → verify in Firestore
  - [ ] Query memory → verify correct filtering
  - [ ] Export → verify data includes all items

- [ ] **Offline Test**: Does it work when offline?
  - [ ] Add person offline → verify IndexedDB
  - [ ] View memory offline → verify from cache
  - [ ] Export offline → verify from cache

- [ ] **Data Integrity Test**: Is data consistent?
  - [ ] No orphaned references
  - [ ] All required fields present
  - [ ] Dates/types valid

## Review Comments Template

### If feature is unclear:
```
"What database operation does this enable? I don't see a CRUD operation or query.
Can you explain which of these it is?
- CREATE: Inserts new data
- READ: Queries existing data
- UPDATE: Modifies data
- DELETE: Removes data
- FILTER/SORT: Organizes data
- EXPORT: Serializes data"
```

### If service has UI imports:
```
"This service imports React/components. 
Services should be data-only and testable in isolation.
Move any UI logic to the component layer."
```

### If component has inline styles:
```
"Let's move these inline styles to [ComponentName].css.
This keeps data flow clean and makes the code more maintainable."
```

### If data is hardcoded:
```
"This data is hardcoded. 
Should it come from the database instead?
- Yes → Add to database schema
- No → Why not? Can we extract it to config?"
```

## Quick Test: "Is This Data-First?"

Run this mental test on the feature:

```typescript
// If I delete all UI code (src/components/):
// Q: Does the database layer still work?
// A: YES → ✅ DATA-FIRST
// A: NO  → ❌ UI-FIRST (refactor needed)

// If I replace all React with Vue:
// Q: Does the data layer need to change?
// A: NO → ✅ DATA-FIRST
// A: YES → ❌ Too much logic in UI

// If data grows to 1M items:
// Q: Can we solve it at service layer only?
// A: YES → ✅ DATA-FIRST (pagination, caching)
// A: NO  → ❌ Component logic is performance bottleneck
```

## Automation Ideas

### Pre-commit Hook
```bash
# Check for hardcoded strings in components
grep -r 'const [a-z]+ = \["' src/components/ 

# Check for React imports in services
grep -r 'import.*React' src/services/
```

### Linter Rule
```json
{
  "rules": {
    "no-hardcoded-arrays-in-components": "error",
    "services-no-react-imports": "error",
    "max-component-lines": "warn"
  }
}
```

---

**Use this before pressing "Merge" on any PR.**
