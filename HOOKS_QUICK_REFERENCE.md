# CRM Hooks — Quick Reference Card

## One-Liner Imports

```typescript
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { useSearch } from '@/hooks/useSearch';
import { usePagination, usePaginationWithTotal } from '@/hooks/usePagination';
import { useForm, useSimpleForm } from '@/hooks/useForm';
import { useModal, useModals, useConfirm } from '@/hooks/useModal';
import { useFetch, useInfiniteFetch } from '@/hooks/useFetch';
```

---

## Common Patterns (Copy & Paste Ready)

### Pattern 1: Protected Page with Auth
```typescript
'use client';
import { useAuth } from '@/hooks/useAuth';

export default function ProtectedPage() {
  const token = useAuth(); // Auto-redirects if missing
  return <div>Welcome! Your token: {token?.slice(0, 10)}...</div>;
}
```

### Pattern 2: Simple List with Search
```typescript
'use client';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { useSearch } from '@/hooks/useSearch';

export default function ListPage() {
  const token = useAuth();
  const { data, loading, fetch } = useCRM({ token });
  const search = useSearch();

  useEffect(() => {
    fetch(`/api/endpoint?search=${search.debouncedQuery}`);
  }, [search.debouncedQuery]);

  return (
    <div>
      <input value={search.query} onChange={e => search.setQuery(e.target.value)} />
      {loading ? <div>Loading...</div> : <div>{data?.length} items</div>}
    </div>
  );
}
```

### Pattern 3: Paginated List
```typescript
const pag = usePaginationWithTotal({ pageSize: 20 });

useEffect(() => {
  crm.fetch(`/api/endpoint?skip=${pag.skip}&limit=${pag.pageSize}`);
}, [pag.page]);

useEffect(() => {
  if (crm.data?.total) pag.setTotal(crm.data.total);
}, [crm.data]);

return (
  <div>
    <p>Showing {pag.startIndex} to {pag.endIndex} of {pag.total}</p>
    <button onClick={pag.nextPage} disabled={!pag.canGoNext}>Next</button>
  </div>
);
```

### Pattern 4: Form Submission
```typescript
const { data, fetch } = useCRM({ token });
const form = useForm({
  initialValues: { email: '', password: '' },
  onSubmit: async (values) => {
    await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(values),
    });
  },
});

return (
  <form onSubmit={form.handleSubmit}>
    <input name="email" value={form.values.email} onChange={form.handleChange} />
    <button type="submit" disabled={form.isSubmitting}>Login</button>
  </form>
);
```

### Pattern 5: Delete with Confirmation
```typescript
const { fetch } = useCRM({ token });
const confirm = useConfirm();

const handleDelete = (id: string) => {
  confirm.show({
    title: 'Delete this item?',
    isDangerous: true,
    onConfirm: async () => {
      await fetch(`/api/endpoint/${id}`, { method: 'DELETE' });
    },
  });
};

return (
  <>
    <button onClick={() => handleDelete('123')}>Delete</button>
    {confirm.isOpen && (
      <ConfirmDialog
        title={confirm.options?.title}
        onConfirm={confirm.confirm}
        onCancel={confirm.cancel}
      />
    )}
  </>
);
```

### Pattern 6: Modal CRUD
```typescript
const crm = useCRM({ token });
const modal = useModal();
const confirm = useConfirm();

return (
  <>
    <button onClick={modal.open}>Add Item</button>
    <button onClick={() => handleDelete(item._id)}>Delete</button>

    {modal.isOpen && (
      <Modal onClose={modal.close}>
        <AddItemForm onSuccess={modal.close} />
      </Modal>
    )}

    {confirm.isOpen && <ConfirmDialog {...confirm} />}
  </>
);
```

### Pattern 7: Dashboard with Cache
```typescript
const { data: stats, loading } = useFetch(
  '/api/stats',
  { token, cache: 60000 } // Cache for 1 minute
);

return (
  <div>
    {loading && <Spinner />}
    <StatCard label="Total" value={stats?.total} />
  </div>
);
```

---

## Hook Cheat Sheet

| Need | Hook | Example |
|------|------|---------|
| Get token | `useAuth()` | `const token = useAuth();` |
| Make API call | `useCRM()` | `const { data, fetch } = useCRM({ token });` |
| Simple fetch | `useFetch()` | `const { data } = useFetch('/api/endpoint', { token });` |
| Infinite scroll | `useInfiniteFetch()` | `const { items, loadMore } = useInfiniteFetch(...)` |
| Pagination | `usePagination()` | `const { page, nextPage } = usePagination();` |
| Pagination + total | `usePaginationWithTotal()` | `const { total, startIndex } = usePaginationWithTotal();` |
| Search | `useSearch()` | `const { query, debouncedQuery } = useSearch();` |
| Filter | `useFilter()` | `const { filters, setFilter } = useFilter({ status: 'all' });` |
| Search + Filter | `useSearchAndFilter()` | `const { search, filter } = useSearchAndFilter({ ... });` |
| Form | `useForm()` | `const form = useForm({ initialValues, onSubmit });` |
| Simple form | `useSimpleForm()` | `const { values, handleChange } = useSimpleForm({ ... });` |
| Modal | `useModal()` | `const { isOpen, open, close } = useModal();` |
| Multiple modals | `useModals()` | `const { isOpen, open } = useModals(['add', 'edit']);` |
| Confirm dialog | `useConfirm()` | `const { show, confirm } = useConfirm();` |

---

## API Methods (useCRM)

```typescript
const crm = useCRM({ token });

// GET
await crm.fetch('/api/endpoint');

// POST
await crm.fetch('/api/endpoint', { method: 'POST', body: JSON.stringify(data) });

// PUT
await crm.fetch('/api/endpoint/123', { method: 'PUT', body: JSON.stringify(data) });

// DELETE
await crm.fetch('/api/endpoint/123', { method: 'DELETE' });

// PATCH
await crm.fetch('/api/endpoint/123', { method: 'PATCH', body: JSON.stringify(data) });

// Helper functions
import { crmGet, crmPost, crmPut, crmDelete, crmPatch } from '@/hooks/useCRM';
const data = await crmGet('/api/endpoint', token);
const result = await crmPost('/api/endpoint', token, { name: 'test' });
```

---

## Auth Utilities

```typescript
import { getAuthToken, setAuthToken, clearAuthToken, isAuthenticated } from '@/hooks/useAuth';

// Get current token
const token = getAuthToken(); // null if not set

// Set token (after login)
setAuthToken(jwtToken);

// Clear token (on logout)
clearAuthToken();

// Check if logged in
if (isAuthenticated()) {
  // User is logged in
}
```

---

## Form Properties

```typescript
const form = useForm({...});

// Values
form.values.email;
form.setFieldValue('email', 'test@test.com');

// Errors
form.errors.email; // 'Required'
form.setFieldError('email', 'Invalid email');

// Touched
form.touched.email; // true/false
form.setFieldTouched('email', true);

// Submit
form.isSubmitting; // true while submitting
form.handleSubmit(e); // Call on form submit

// Reset
form.resetForm(); // Clear all
form.setValues({ email: '' }); // Partial update
```

---

## Hook Composition

```typescript
// List page combining multiple hooks
function ListPage() {
  const token = useAuth();
  const crm = useCRM({ token });
  const search = useSearch({ debounceMs: 500 });
  const filter = useFilter({ status: 'all', type: 'lead' });
  const pag = usePaginationWithTotal({ pageSize: 20 });
  const modal = useModal();

  useEffect(() => {
    const params = new URLSearchParams({
      search: search.debouncedQuery,
      status: filter.filters.status,
      type: filter.filters.type,
      skip: pag.skip.toString(),
      limit: pag.pageSize.toString(),
    });
    crm.fetch(`/api/items?${params}`);
  }, [search.debouncedQuery, filter.filters, pag.page]);

  return (
    <div>
      {/* Search input */}
      {/* Filter selects */}
      {/* Items table */}
      {/* Pagination buttons */}
      {/* Modal */}
    </div>
  );
}
```

---

## Error Handling

```typescript
// Catch API errors
const { data, error } = useCRM({ token });

if (error) {
  console.error('API Error:', error.message);
  return <Alert message={error.message} />;
}

// Form submission error
const form = useForm({
  onSubmit: async (values) => {
    // Error thrown in onSubmit is caught
  },
  onError: (error) => {
    console.error('Form error:', error);
  },
});
```

---

## Performance Tips

```typescript
// Tip 1: Cache GET requests
const { data } = useFetch('/api/static', {
  token,
  cache: 5 * 60 * 1000, // Cache 5 minutes
});

// Tip 2: Debounce search queries
const search = useSearch({ debounceMs: 500 }); // Default 300ms

// Tip 3: Use pagination instead of loading all items
const pag = usePagination({ pageSize: 50 }); // Adjust per needs

// Tip 4: Memoize callbacks passed to children
const handleDelete = useCallback((id: string) => {
  // ...
}, [dependencies]);
```

---

## Troubleshooting Quick Fix

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Make sure `useAuth()` runs first |
| API calls fail | Check token is passed: `useCRM({ token })` |
| Search not working | Use `search.debouncedQuery` not `search.query` |
| Form not submitting | Check `form.handleSubmit` is on form element |
| Modal not closing | Call `modal.close()` in onClose handler |
| Pagination bugs | Use `usePaginationWithTotal` for total tracking |
| Page reloads infinitely | Check dependency arrays in useEffect |
| Performance slow | Add caching: `useFetch(..., { cache: 60000 })` |

---

## File Locations

```
Hooks:       /hooks/*.ts
Quick Start: /docs/HOOKS_INDEX.md
Full Docs:   /docs/HOOKS_DOCUMENTATION.md
Examples:    /docs/HOOKS_INTEGRATION_GUIDE.md
```

---

## Links

- 📖 [Full Documentation](./HOOKS_DOCUMENTATION.md)
- 📝 [Integration Guide](./HOOKS_INTEGRATION_GUIDE.md)
- 🚀 [Quick Start](./HOOKS_INDEX.md)
- 📊 [Summary](./CUSTOM_HOOKS_SUMMARY.md)

---

**Version**: 1.0.0 | **Status**: Production Ready | **Date**: 2024
