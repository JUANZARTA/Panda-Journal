# Bug Analysis: Recurring Tasks Creating Duplicates

## Summary
`generateTodayRecurringTasks()` creates multiple copies of recurring tasks instead of one per definition. The issue has **three root causes**:

1. **Promise.all() treating Observables incorrectly** (CRITICAL)
2. **Active listeners re-triggering the creation flow** (HIGH)
3. **localStorage guard insufficient** (MEDIUM)

---

## Problem 1: Promise.all() With Observables (CRITICAL BUG)

### Location
`src/app/services/recurring-task.service.ts`, lines 84-102

### The Code
```typescript
const creates = tasksToCreate.map((recurring) =>
  this.taskRepo.create(today, {
    nombre: recurring.nombre,
    categoriaId: recurring.categoriaId,
    estado: 'pendiente',
  })
);

return from(Promise.all(creates)).pipe(
  tap(() => {
    localStorage.setItem(storageKey, today);
  }),
  map(() => undefined)
);
```

### What's Wrong
- `this.taskRepo.create()` returns `Observable<string>`, NOT a Promise
- `creates` is an array of Observables: `Observable<string>[]`
- `Promise.all(creates)` treats Observables as **truthy values**, not async operations
- The Promise resolves **immediately** without waiting for tasks to be created in Firebase
- `localStorage` is marked as "done" while tasks are still being written

### Consequences
1. The Observable completes before Firebase finishes creating tasks
2. Concurrent/race conditions occur during task creation
3. When Firebase listeners emit changes, the deduplication logic may fail
4. Multiple attempts to create the same task succeed because they're not properly awaited

---

## Problem 2: Active Listeners Re-triggering Creation Flow (HIGH)

### Location
`src/app/services/recurring-task.service.ts`, lines 62-66

### The Code
```typescript
return this.recurringRepo.getActive().pipe(
  switchMap((recurringTasks) => {
    // ...
    return this.taskRepo.watchByDate(today).pipe(
      map((existingTasks) => { /* deduplication */ }),
      switchMap((tasksToCreate) => {
        // CREATE TASKS HERE
      })
    );
  })
);
```

### What's Wrong
- `getActive()` is a listener (`watchValue()` under the hood) that emits whenever recurring tasks change
- `watchByDate()` is also a listener that emits whenever tasks for today change
- When tasks are **created in Firebase**, `watchByDate()` emits again (new data available)
- This triggers the entire `switchMap` flow to re-run
- Even though the deduplication should catch duplicates, if any creation is still in-flight, timing issues occur

### Flow Diagram (What Actually Happens)
```
1. LayoutComponent constructor → generateTodayRecurringTasks().subscribe()
2. Check localStorage ("first run today") ✓
3. getActive() emits → switchMap executes
4. watchByDate() emits (empty list initially)
5. Filter: all recurring tasks need to be created
6. Create tasks with Promise.all() [COMPLETES IMMEDIATELY - BUG #1]
7. localStorage.setItem() marks as "done"
8. Subscription ends (Observable completes)
   ↓
9. Firebase is STILL writing tasks (happening in parallel)
10. Firebase finish writing → watchByDate() emits again
11. BUT: subscription is already complete, so no re-trigger...
    ↓
    UNLESS: getActive() changes, or watchByDate listener is held open by something else
```

### The Real Problem
Even though the subscription should complete after step 8, if any of these happen:
- Firebase writes occur in parallel and complete after the Promise resolves
- The listener chain is kept alive by another subscription
- The deduplication logic uses weak comparison (name + category)

Then multiple writes succeed before any listener can observe them and deduplicate.

---

## Problem 3: localStorage Guard Insufficient (MEDIUM)

### Location
`src/app/services/recurring-task.service.ts`, lines 47-60

### The Code
```typescript
generateTodayRecurringTasks(): Observable<void> {
  const today = formatDate(new Date());
  const storageKey = 'recurring_tasks_generated_date';

  try {
    const lastGenerated = localStorage.getItem(storageKey);
    if (lastGenerated === today) {
      return from([undefined]);
    }
  } catch (err) {
    // localStorage not available
  }

  return this.recurringRepo.getActive().pipe( /* ... */ );
}
```

### What's Wrong
- The guard is evaluated **once when the Observable is created**, not during execution
- If `localStorage` is unavailable (SSR, private browsing), it silently continues
- Multiple rapid calls to `generateTodayRecurringTasks().subscribe()` in different components bypass the guard
- The `localStorage.setItem()` happens inside an async pipeline that may not complete

### Race Condition Example
```
Call 1: subscribe() → check localStorage (today's date NOT set yet) → START creating
Call 2: subscribe() (on same instant) → check localStorage (still NOT set) → START creating
Result: Both calls create tasks in parallel
```

---

## Deduplication Logic (Why It Sometimes Fails)

### Location
`src/app/services/recurring-task.service.ts`, lines 69-77

### The Code
```typescript
const alreadyExists = existingTasks.some(
  (task) =>
    task.nombre.trim().toLowerCase() === recurring.nombre.trim().toLowerCase() &&
    task.categoriaId === recurring.categoriaId
);
```

### Why It's Weak
- **Case-insensitive matching is good**, but depends on exact string comparison
- **No ID linking**: A recurring task has no reference to its generated task
- **Timing issue**: If Firebase hasn't synced `watchByDate()` yet, `existingTasks` is stale
- **Concurrent creates**: If two creates happen in parallel before either is visible in the listener

---

## Proposed Solution

### Fix 1: Replace Promise.all() with forkJoin (CRITICAL - Do First)
```typescript
import { forkJoin } from 'rxjs';

// INSTEAD OF:
const creates = tasksToCreate.map((recurring) =>
  this.taskRepo.create(today, {...})
);
return from(Promise.all(creates)).pipe(
  tap(() => localStorage.setItem(storageKey, today)),
  map(() => undefined)
);

// DO THIS:
if (tasksToCreate.length === 0) return from([undefined]);

return forkJoin(
  tasksToCreate.map((recurring) =>
    this.taskRepo.create(today, {
      nombre: recurring.nombre,
      categoriaId: recurring.categoriaId,
      estado: 'pendiente',
    })
  )
).pipe(
  tap(() => {
    localStorage.setItem(storageKey, today);
  }),
  map(() => undefined)
);
```

**Why**: `forkJoin()` properly waits for all Observables to complete before emitting.

### Fix 2: Use Take(1) to Prevent Re-triggering (HIGH)
```typescript
import { take } from 'rxjs/operators';

return this.recurringRepo.getActive().pipe(
  take(1),  // Only take the first emission
  switchMap((recurringTasks) => {
    // ...
    return this.taskRepo.watchByDate(today).pipe(
      take(1),  // Only take the first emission (existing tasks)
      // ... rest of logic
    );
  })
);
```

**Why**: Ensures the flow executes exactly once, preventing re-triggers from Firebase listener updates.

### Fix 3: Make localStorage Guard Reactive (MEDIUM)
```typescript
private hasGeneratedToday = new BehaviorSubject(false);

generateTodayRecurringTasks(): Observable<void> {
  const today = formatDate(new Date());
  const storageKey = 'recurring_tasks_generated_date';

  try {
    const lastGenerated = localStorage.getItem(storageKey);
    if (lastGenerated === today || this.hasGeneratedToday.value) {
      return from([undefined]);
    }
  } catch (err) {
    // localStorage not available
  }

  return this.recurringRepo.getActive().pipe(
    take(1),
    switchMap((recurringTasks) => {
      if (recurringTasks.length === 0) return from([undefined]);

      return this.taskRepo.watchByDate(today).pipe(
        take(1),
        map((existingTasks) => {
          return recurringTasks.filter((recurring) => {
            const alreadyExists = existingTasks.some(
              (task) =>
                task.nombre.trim().toLowerCase() === recurring.nombre.trim().toLowerCase() &&
                task.categoriaId === recurring.categoriaId
            );
            return !alreadyExists;
          });
        }),
        switchMap((tasksToCreate) => {
          if (tasksToCreate.length === 0) return from([undefined]);

          return forkJoin(
            tasksToCreate.map((recurring) =>
              this.taskRepo.create(today, {
                nombre: recurring.nombre,
                categoriaId: recurring.categoriaId,
                estado: 'pendiente',
              })
            )
          ).pipe(
            tap(() => {
              try {
                localStorage.setItem(storageKey, today);
                this.hasGeneratedToday.next(true);
              } catch (err) {
                // localStorage not available
                this.hasGeneratedToday.next(true);
              }
            }),
            map(() => undefined)
          );
        })
      );
    })
  );
}
```

**Why**: Guards at both levels prevent concurrent executions and multiple runs per day.

---

## Why Multiple Copies Are Created

### Scenario
1. User logs in → LayoutComponent created → `generateTodayRecurringTasks()` subscribes
2. Firefox marks date with `localStorage` immediately (before Promise.all completes)
3. Firebase is still writing tasks (async)
4. Listeners detect new writes → `watchByDate` emits again
5. Due to timing, deduplication check sees "no tasks yet" (listener lag)
6. System attempts to create again
7. Multiple tasks created with same name + category

### With Multiple Components
If another component also calls `generateTodayRecurringTasks()` (or if LayoutComponent is recreated), the guard is bypassed since `localStorage` set time != current time exactly.

---

## Impact
- **Severity**: HIGH (data duplication bug)
- **Frequency**: Intermittent (depends on Firebase latency + browser localStorage availability)
- **Scope**: Affects all recurring task generation
- **Users**: Every user generates tasks daily

---

## Testing Checklist After Fix
- [ ] Create 3 recurring tasks
- [ ] Clear localStorage (`localStorage.clear()` in DevTools)
- [ ] Refresh page
- [ ] Verify exactly 3 tasks are created (not 6, 9, etc.)
- [ ] Refresh again
- [ ] Verify no new tasks are created (guard working)
- [ ] Enable "Disable cache" in DevTools Network tab
- [ ] Refresh multiple times rapidly
- [ ] Verify still only 3 tasks exist
- [ ] Test in Private/Incognito mode (no localStorage)
