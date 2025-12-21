# CRM Dashboard — Hooks Integration Guide

This guide shows how to refactor the existing 7 dashboard pages to use the new custom hooks library, reducing code duplication and improving maintainability.

---

## Overview

### Current State
- 7 dashboard pages with inline API calls
- Repetitive fetch/useState patterns
- Manual token handling
- Duplicated search/pagination logic

### After Integration
- Cleaner, more readable code
- Reusable hooks for common patterns
- Consistent error handling
- 40-50% less code per page

---

## Before & After Examples

### Page 1: Dashboard Overview

#### Before (Current)
```typescript
// app/admin/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    if (!authToken) {
      router.push('/admin/login');
      return;
    }
    setToken(authToken);

    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/crm/stats', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      {/* ... cards */}
    </div>
  );
}
```

#### After (With Hooks)
```typescript
// app/admin/dashboard/page.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useFetch } from '@/hooks/useFetch';

export default function DashboardPage() {
  const token = useAuth(); // Auto-redirects if missing
  const { data: stats, loading, error } = useFetch(
    '/api/admin/crm/stats',
    { token, cache: 60000 }
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      {/* ... cards */}
    </div>
  );
}
```

**Result**: 45% less code, cleaner logic

---

### Page 2: Leads Management

#### Before (Current - ~120 lines)
```typescript
export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch leads
  useEffect(() => {
    const authToken = localStorage.getItem('token');
    if (!authToken) {
      router.push('/admin/login');
      return;
    }
    setToken(authToken);

    const fetchLeads = async () => {
      setLoading(true);
      try {
        const url = new URL('/api/admin/crm/leads', window.location.origin);
        url.searchParams.set('limit', '20');
        url.searchParams.set('skip', String((page - 1) * 20));
        if (debouncedQuery) url.searchParams.set('search', debouncedQuery);

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setLeads(data.data || []);
        setTotal(data.total || 0);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [page, debouncedQuery, router]);

  // Delete lead
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    try {
      await fetch(`/api/admin/crm/leads/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(leads.filter((l) => l._id !== id));
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1>Leads</h1>
        <button onClick={() => setAddModalOpen(true)}>Add Lead</button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />

      <table>
        {/* ... */}
      </table>

      {/* Pagination */}
      {/* Modal components */}
    </div>
  );
}
```

#### After (With Hooks - ~40 lines)
```typescript
export default function LeadsPage() {
  const token = useAuth();
  const crm = useCRM({ token });
  const search = useSearch();
  const pag = usePaginationWithTotal({ pageSize: 20 });
  const modal = useModal();
  const confirm = useConfirm();

  useEffect(() => {
    crm.fetch(
      `/api/admin/crm/leads?search=${search.debouncedQuery}&skip=${pag.skip}&limit=${pag.pageSize}`
    );
  }, [search.debouncedQuery, pag.page]);

  useEffect(() => {
    if (crm.data?.total) pag.setTotal(crm.data.total);
  }, [crm.data]);

  const handleDelete = (id: string) => {
    confirm.show({
      title: 'Delete Lead?',
      isDangerous: true,
      onConfirm: async () => {
        await crm.fetch(`/api/admin/crm/leads/${id}`, {
          method: 'DELETE',
        });
        crm.reset();
      },
    });
  };

  if (crm.loading && !crm.data) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1>Leads</h1>
        <button onClick={modal.open}>Add Lead</button>
      </div>

      <input
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
        placeholder="Search..."
      />

      <table>
        {crm.data?.data?.map((lead: Lead) => (
          <tr key={lead._id}>
            <td>{lead.name}</td>
            <td>{lead.email}</td>
            <td>
              <button onClick={() => handleDelete(lead._id)}>Delete</button>
            </td>
          </tr>
        ))}
      </table>

      {/* Pagination buttons */}

      {modal.isOpen && <AddLeadModal onClose={modal.close} />}
      {confirm.isOpen && <ConfirmDialog {...confirm} />}
    </div>
  );
}
```

**Result**: 67% less code, much cleaner

---

### Page 3: Sales Dashboard

#### Before (~150 lines with view mode switching)
```typescript
export default function SalesDashboardPage() {
  const [viewMode, setViewMode] = useState<'overview' | 'pipeline' | 'forecast' | 'performance'>('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  // ... more state

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    if (!authToken) return router.push('/admin/login');
    setToken(authToken);

    const fetchData = async () => {
      try {
        const endpoint = `/api/admin/crm/sales?view=${viewMode}`;
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        // ...
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [viewMode, router]);

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {['overview', 'pipeline', 'forecast', 'performance'].map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as any)}
            className={viewMode === mode ? 'active' : ''}
          >
            {mode}
          </button>
        ))}
      </div>

      {loading && <Spinner />}

      {viewMode === 'overview' && <OverviewChart data={data} />}
      {viewMode === 'pipeline' && <PipelineChart data={data} />}
      {/* ... */}
    </div>
  );
}
```

#### After (With Hooks - ~35 lines)
```typescript
export default function SalesDashboardPage() {
  const token = useAuth();
  const [viewMode, setViewMode] = useState<'overview' | 'pipeline' | 'forecast' | 'performance'>('overview');
  const { data, loading } = useFetch(
    `/api/admin/crm/sales?view=${viewMode}`,
    { token, cache: 30000 }
  );

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {['overview', 'pipeline', 'forecast', 'performance'].map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as any)}
            className={viewMode === mode ? 'active' : ''}
          >
            {mode}
          </button>
        ))}
      </div>

      {loading && <Spinner />}

      {viewMode === 'overview' && <OverviewChart data={data} />}
      {viewMode === 'pipeline' && <PipelineChart data={data} />}
      {/* ... */}
    </div>
  );
}
```

**Result**: 77% less code

---

## Integration Checklist

### For Each Page

- [ ] Replace `useState` for token with `useAuth()`
- [ ] Replace fetch + loading/error states with `useCRM()` or `useFetch()`
- [ ] Replace search state with `useSearch()`
- [ ] Replace pagination state with `usePagination()`
- [ ] Replace modal state with `useModal()` or `useModals()`
- [ ] Replace confirm with `useConfirm()`
- [ ] Remove manual Bearer token injection (hooks handle it)
- [ ] Clean up useEffect dependencies
- [ ] Test all functionality

### Updated Pages

1. **Dashboard Overview** - Use `useFetch` for stats
2. **Leads Management** - Use `useCRM`, `useSearch`, `usePaginationWithTotal`, `useModal`, `useConfirm`
3. **Sales Dashboard** - Use `useFetch` with view mode state
4. **Messages/WhatsApp** - Use `useCRM` and `useModal`
5. **Analytics Dashboard** - Use `useFetch` with multiple endpoints
6. **Templates** - Use `useCRM`, `useSearch`, `usePaginationWithTotal`
7. **Consent Management** - Use `useCRM`, `useFilter`

---

## Step-by-Step: Refactoring One Page

Let's refactor the Leads page as an example:

### Step 1: Add Hook Imports
```typescript
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { useSearch } from '@/hooks/useSearch';
import { usePaginationWithTotal } from '@/hooks/usePagination';
import { useModal } from '@/hooks/useModal';
import { useConfirm } from '@/hooks/useModal';
```

### Step 2: Remove Old State
Delete these:
```typescript
// DELETE ALL OF THESE
const [token, setToken] = useState('');
const [leads, setLeads] = useState<Lead[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [page, setPage] = useState(1);
const [query, setQuery] = useState('');
const [debouncedQuery, setDebouncedQuery] = useState('');
const [addModalOpen, setAddModalOpen] = useState(false);
const [editingLead, setEditingLead] = useState(null);
// etc.
```

### Step 3: Replace with Hooks
```typescript
const token = useAuth();
const crm = useCRM({ token });
const search = useSearch();
const pag = usePaginationWithTotal({ pageSize: 20 });
const modal = useModal();
const confirm = useConfirm();
```

### Step 4: Replace Fetch Logic
```typescript
useEffect(() => {
  crm.fetch(
    `/api/admin/crm/leads?search=${search.debouncedQuery}&skip=${pag.skip}&limit=${pag.pageSize}`
  );
}, [search.debouncedQuery, pag.page]);

useEffect(() => {
  if (crm.data?.total) pag.setTotal(crm.data.total);
}, [crm.data]);
```

### Step 5: Update Template References
```typescript
// OLD: {leads.map(...)}
// NEW:
{crm.data?.data?.map(...)}

// OLD: {loading ? <Spinner /> : ...}
// NEW:
{crm.loading && !crm.data ? <Spinner /> : ...}

// OLD: {error && <Alert>...}
// NEW:
{crm.error && <Alert>...}

// OLD: setAddModalOpen(true)
// NEW:
modal.open()

// OLD: setAddModalOpen(false)
// NEW:
modal.close()

// OLD: if (!confirm('Delete?')) return; await fetch(...)
// NEW:
confirm.show({
  title: 'Delete Lead?',
  onConfirm: async () => {
    await crm.fetch(`/api/admin/crm/leads/${id}`, { method: 'DELETE' });
  },
});
```

### Step 6: Test
- [ ] Page loads correctly
- [ ] Search filters results
- [ ] Pagination works
- [ ] Add/Edit/Delete work
- [ ] Modals open/close
- [ ] Confirm dialog works

---

## Common Patterns After Refactoring

### Pattern 1: List with Search
```typescript
const token = useAuth();
const crm = useCRM({ token });
const search = useSearch();
const pag = usePagination({ pageSize: 20 });

useEffect(() => {
  crm.fetch(`/api/endpoint?search=${search.debouncedQuery}&skip=${pag.skip}`);
}, [search.debouncedQuery, pag.page]);
```

### Pattern 2: CRUD with Modals
```typescript
const modal = useModal();
const confirm = useConfirm();
const crm = useCRM({ token });

const handleDelete = (id: string) => {
  confirm.show({
    title: 'Delete?',
    onConfirm: async () => {
      await crm.fetch(`/api/endpoint/${id}`, { method: 'DELETE' });
    },
  });
};
```

### Pattern 3: Form Submission
```typescript
const crm = useCRM({ token });
const form = useForm({
  initialValues: { name: '', email: '' },
  onSubmit: async (values) => {
    await crm.fetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(values),
    });
  },
});
```

---

## Expected Improvements

After integrating hooks across all 7 pages:

- **Code Reduction**: 40-50% fewer lines per page
- **Consistency**: All pages follow same patterns
- **Maintainability**: Easier to understand and modify
- **Testability**: Hooks are easier to unit test
- **Reusability**: Common logic extracted and reused
- **Performance**: Better caching and optimization

---

## Rollback Plan

If issues arise:

1. Keep original page files as `.backup` copies
2. Commit hooks library separately (already done ✅)
3. Refactor one page at a time
4. Full test after each page
5. If needed, revert individual page to backup

---

**Integration Status**: Ready to begin
**Priority**: Medium (nice to have, not blocking)
**Estimated Time**: 2-3 hours for all 7 pages
**Benefits**: High maintainability, reduced duplication
