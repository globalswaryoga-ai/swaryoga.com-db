# CRM Dashboard Hooks Documentation

Complete reference for all custom hooks available in the CRM dashboard. These hooks simplify state management, API communication, and form handling.

## Table of Contents

1. [API Hooks](#api-hooks)
2. [Authentication Hooks](#authentication-hooks)
3. [Pagination Hooks](#pagination-hooks)
4. [Search & Filter Hooks](#search--filter-hooks)
5. [Form Hooks](#form-hooks)
6. [Modal Hooks](#modal-hooks)
7. [Fetch Hooks](#fetch-hooks)
8. [Usage Examples](#usage-examples)

---

## API Hooks

### `useCRM(options?: UseCRMOptions)`

Generic hook for making API requests to CRM endpoints. Handles GET, POST, PUT, DELETE, and PATCH requests with automatic Bearer token injection.

**Location**: `hooks/useCRM.ts`

**Parameters**:
- `options.token?: string` - JWT token for authentication (optional, auto-fetched from localStorage)
- `options.baseURL?: string` - API base URL (default: same origin)
- `options.onError?: (error: Error) => void` - Error callback
- `options.onSuccess?: (data: any) => void` - Success callback

**Returns**:
```typescript
{
  data: any;                                    // Response data
  loading: boolean;                             // Request in progress
  error: Error | null;                          // Error object if failed
  fetch: (endpoint, options) => Promise<any>;   // Main fetch function
  reset: () => void;                            // Clear state
}
```

**Example**:
```typescript
import { useCRM } from '@/hooks/useCRM';

export function LeadsList() {
  const { data: leads, loading, fetch, error } = useCRM({ token: authToken });

  useEffect(() => {
    fetch('/api/admin/crm/leads?limit=20');
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {leads?.map((lead: any) => (
        <div key={lead._id}>{lead.name}</div>
      ))}
    </div>
  );
}
```

**Helper Functions**:
- `crmGet(endpoint, token, params?)` - GET request
- `crmPost(endpoint, token, body)` - POST request
- `crmPut(endpoint, token, body)` - PUT request
- `crmDelete(endpoint, token)` - DELETE request
- `crmPatch(endpoint, token, body)` - PATCH request

---

## Authentication Hooks

### `useAuth()`

Manages JWT authentication tokens and automatically redirects to login if not authenticated.

**Location**: `hooks/useAuth.ts`

**Returns**: `string | null` - JWT token or null if not authenticated

**Side Effects**:
- Auto-redirects to `/admin/login` if no token on mount
- Requires window object (SSR safe)

**Example**:
```typescript
import { useAuth } from '@/hooks/useAuth';

export function ProtectedPage() {
  const token = useAuth(); // Auto-redirects if missing

  return <div>Welcome! Token: {token?.slice(0, 10)}...</div>;
}
```

**Utility Functions**:
```typescript
import { getAuthToken, setAuthToken, clearAuthToken, isAuthenticated } from '@/hooks/useAuth';

// Get token synchronously
const token = getAuthToken();

// Set token (login)
setAuthToken(newToken);

// Clear token (logout)
clearAuthToken();

// Check if authenticated
if (isAuthenticated()) {
  // User is logged in
}
```

---

## Pagination Hooks

### `usePagination(options?: UsePaginationOptions)`

Manages pagination state for lists and tables.

**Location**: `hooks/usePagination.ts`

**Parameters**:
- `options.initialPage?: number` - Starting page (default: 1)
- `options.pageSize?: number` - Items per page (default: 20)

**Returns**:
```typescript
{
  page: number;                  // Current page (1-indexed)
  pageSize: number;              // Items per page
  skip: number;                  // Items to skip (for API)
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  reset: () => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalPages: (total: number) => number;
}
```

**Example**:
```typescript
import { usePagination } from '@/hooks/usePagination';

export function LeadsTable() {
  const pag = usePagination({ pageSize: 10 });
  const { data, fetch } = useCRM({ token });

  useEffect(() => {
    fetch(`/api/admin/crm/leads?limit=${pag.pageSize}&skip=${pag.skip}`);
  }, [pag.page]);

  return (
    <div>
      <table>
        {/* ... */}
      </table>
      <button onClick={pag.previousPage} disabled={!pag.hasPreviousPage}>
        Previous
      </button>
      <span>Page {pag.page}</span>
      <button onClick={pag.nextPage} disabled={!pag.hasNextPage}>
        Next
      </button>
    </div>
  );
}
```

### `usePaginationWithTotal(options?)`

Extended pagination hook that tracks total items.

**Returns** (extends usePagination):
```typescript
{
  // ... all usePagination properties
  total: number;
  setTotal: (total: number) => void;
  startIndex: number;  // First item number on page (1-indexed)
  endIndex: number;    // Last item number on page
  canGoNext: boolean;
  canGoPrevious: boolean;
}
```

**Example**:
```typescript
const pag = usePaginationWithTotal({ pageSize: 20 });

// After fetching
pag.setTotal(150); // Set total items

return (
  <div>
    Showing {pag.startIndex} to {pag.endIndex} of {pag.total}
  </div>
);
```

---

## Search & Filter Hooks

### `useSearch(options?: UseSearchOptions)`

Manages search query state with optional debouncing.

**Location**: `hooks/useSearch.ts`

**Parameters**:
- `options.initialQuery?: string` - Starting search (default: '')
- `options.debounceMs?: number` - Debounce delay in ms (default: 300)

**Returns**:
```typescript
{
  query: string;              // Current search query
  setQuery: (q: string) => void;
  debouncedQuery: string;     // Debounced query (for API calls)
  isSearching: boolean;       // Debounce in progress
  reset: () => void;
  isEmpty: boolean;
}
```

**Example**:
```typescript
import { useSearch } from '@/hooks/useSearch';

export function SearchableList() {
  const search = useSearch({ debounceMs: 500 });
  const { data, fetch } = useCRM({ token });

  useEffect(() => {
    if (search.debouncedQuery) {
      fetch(`/api/admin/crm/leads?search=${search.debouncedQuery}`);
    }
  }, [search.debouncedQuery]);

  return (
    <div>
      <input
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
        placeholder="Search leads..."
      />
      {search.isSearching && <Spinner />}
    </div>
  );
}
```

### `useFilter<T>(initialFilters: T)`

Manages multiple filter values.

**Parameters**:
- `initialFilters` - Initial filter state object

**Returns**:
```typescript
{
  filters: T;
  setFilter: (key: keyof T, value: any) => void;
  setMultipleFilters: (updates: Partial<T>) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}
```

**Example**:
```typescript
import { useFilter } from '@/hooks/useSearch';

interface LeadFilters {
  status: 'all' | 'active' | 'inactive';
  source: 'all' | 'web' | 'referral';
}

export function FilteredLeads() {
  const filters = useFilter<LeadFilters>({
    status: 'all',
    source: 'all',
  });

  return (
    <div>
      <select
        value={filters.filters.status}
        onChange={(e) => filters.setFilter('status', e.target.value)}
      >
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>

      {filters.hasActiveFilters && (
        <button onClick={filters.clearFilters}>Clear Filters</button>
      )}
    </div>
  );
}
```

### `useSearchAndFilter<T>(initialFilters: T)`

Combined search and filter hook for convenience.

**Returns**:
```typescript
{
  search: UseSearchReturn;
  filter: UseFilterReturn<T>;
  reset: () => void;
  hasActiveSearch: boolean;
  hasActiveFilters: boolean;
  hasAnyActive: boolean;
}
```

---

## Form Hooks

### `useForm<T>(options: UseFormOptions<T>)`

Comprehensive form state and validation management.

**Location**: `hooks/useForm.ts`

**Parameters**:
```typescript
{
  initialValues: T;                                      // Form initial state
  onSubmit: (values: T) => Promise<void> | void;        // Submit handler
  onError?: (error: Error) => void;                      // Error handler
}
```

**Returns**:
```typescript
{
  values: T;                                             // Form state
  errors: Record<keyof T, string | undefined>;          // Field errors
  touched: Record<keyof T, boolean>;                     // Touched fields
  isSubmitting: boolean;                                 // Submit in progress
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, value: boolean) => void;
  handleChange: (e: ChangeEvent) => void;
  handleBlur: (e: FocusEvent) => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  resetForm: () => void;
  setValues: (values: Partial<T>) => void;
}
```

**Example**:
```typescript
import { useForm } from '@/hooks/useForm';

interface AddLeadForm {
  name: string;
  email: string;
  source: string;
}

export function AddLeadModal() {
  const form = useForm<AddLeadForm>({
    initialValues: { name: '', email: '', source: '' },
    onSubmit: async (values) => {
      const response = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error('Failed to add lead');
    },
  });

  return (
    <form onSubmit={form.handleSubmit}>
      <input
        name="name"
        value={form.values.name}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
      />
      {form.touched.name && form.errors.name && (
        <span className="error">{form.errors.name}</span>
      )}

      <button type="submit" disabled={form.isSubmitting}>
        {form.isSubmitting ? 'Adding...' : 'Add Lead'}
      </button>
    </form>
  );
}
```

### `useSimpleForm<T>(initialValues: T)`

Lightweight form hook without validation.

**Returns**:
```typescript
{
  values: T;
  handleChange: (e: ChangeEvent) => void;
  reset: () => void;
  setValues: (values: Partial<T>) => void;
  setFieldValue: (field: keyof T, value: any) => void;
}
```

---

## Modal Hooks

### `useModal(options?: UseModalOptions)`

Manages single modal state.

**Location**: `hooks/useModal.ts`

**Parameters**:
- `options.initialOpen?: boolean` - Start open (default: false)
- `options.onOpen?: () => void` - Open callback
- `options.onClose?: () => void` - Close callback

**Returns**:
```typescript
{
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}
```

**Example**:
```typescript
import { useModal } from '@/hooks/useModal';

export function AddLeadButton() {
  const modal = useModal();

  return (
    <>
      <button onClick={modal.open}>Add Lead</button>

      {modal.isOpen && (
        <Modal onClose={modal.close}>
          <AddLeadForm />
        </Modal>
      )}
    </>
  );
}
```

### `useModals(names: string[])`

Manages multiple modals simultaneously.

**Parameters**:
- `names` - Array of modal names/IDs

**Returns**:
```typescript
{
  isOpen: (name: string) => boolean;
  open: (name: string) => void;
  close: (name: string) => void;
  toggle: (name: string) => void;
  closeAll: () => void;
}
```

**Example**:
```typescript
const modals = useModals(['addLead', 'editLead', 'deleteLead']);

return (
  <div>
    <button onClick={() => modals.open('addLead')}>Add</button>
    <button onClick={() => modals.open('editLead')}>Edit</button>

    {modals.isOpen('addLead') && <AddLeadModal onClose={() => modals.close('addLead')} />}
    {modals.isOpen('editLead') && <EditLeadModal onClose={() => modals.close('editLead')} />}
  </div>
);
```

### `useConfirm()`

Manages confirmation dialog state.

**Returns**:
```typescript
{
  isOpen: boolean;
  options: ConfirmOptions | null;
  show: (options: ConfirmOptions) => void;
  confirm: () => Promise<void>;
  cancel: () => void;
  isConfirming: boolean;
}
```

**Example**:
```typescript
const confirm = useConfirm();

async function deleteLead(leadId: string) {
  confirm.show({
    title: 'Delete Lead?',
    message: 'This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDangerous: true,
    onConfirm: async () => {
      await fetch(`/api/admin/crm/leads/${leadId}`, { method: 'DELETE' });
    },
  });
}

return (
  <>
    {confirm.isOpen && (
      <ConfirmDialog
        title={confirm.options?.title}
        onConfirm={confirm.confirm}
        onCancel={confirm.cancel}
        isConfirming={confirm.isConfirming}
      />
    )}
  </>
);
```

---

## Fetch Hooks

### `useFetch<T>(url: string | null, options?: UseFetchOptions)`

Fetches data from API endpoints with optional caching.

**Location**: `hooks/useFetch.ts`

**Parameters**:
- `url` - API endpoint (null to skip)
- `options.token` - JWT token
- `options.skip` - Skip fetch if true
- `options.cache` - Cache duration in ms

**Returns**:
```typescript
{
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**Example**:
```typescript
import { useFetch } from '@/hooks/useFetch';

export function LeadsOverview() {
  const token = getAuthToken();
  const { data: stats, loading, refetch } = useFetch<any>(
    '/api/admin/crm/stats',
    { token, cache: 60000 } // Cache for 1 minute
  );

  return (
    <div>
      {loading && <Spinner />}
      {data && <StatCard label="Total Leads" value={data.totalLeads} />}
    </div>
  );
}
```

### `useInfiniteFetch<T>(urlBuilder, options?)`

Fetches data in pages for infinite scroll.

**Parameters**:
- `urlBuilder` - Function that takes page number and returns URL
- `options` - Same as useFetch

**Returns**:
```typescript
{
  items: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}
```

**Example**:
```typescript
const { items, loading, hasMore, loadMore } = useInfiniteFetch<Lead>(
  (page) => `/api/admin/crm/leads?page=${page}&limit=20`,
  { token }
);

return (
  <InfiniteScroll
    dataLength={items.length}
    next={loadMore}
    hasMore={hasMore}
    loader={<Spinner />}
  >
    {items.map((lead) => <LeadCard key={lead._id} lead={lead} />)}
  </InfiniteScroll>
);
```

---

## Usage Examples

### Complete Lead Management Page

```typescript
import { useState, useEffect } from 'react';
import { useCRM } from '@/hooks/useCRM';
import { useAuth } from '@/hooks/useAuth';
import { useModal } from '@/hooks/useModal';
import { useSearch } from '@/hooks/useSearch';
import { usePaginationWithTotal } from '@/hooks/usePagination';

export default function LeadsPage() {
  const token = useAuth();
  const crm = useCRM({ token });
  const modal = useModal();
  const search = useSearch();
  const pagination = usePaginationWithTotal({ pageSize: 20 });

  useEffect(() => {
    crm.fetch(
      `/api/admin/crm/leads?search=${search.debouncedQuery}&skip=${pagination.skip}&limit=${pagination.pageSize}`
    );
  }, [search.debouncedQuery, pagination.page]);

  useEffect(() => {
    if (crm.data?.total) {
      pagination.setTotal(crm.data.total);
    }
  }, [crm.data]);

  if (crm.loading && !crm.data) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <button
          onClick={modal.open}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Add Lead
        </button>
      </div>

      <input
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
        placeholder="Search leads..."
        className="w-full px-4 py-2 border rounded mb-6"
      />

      <table className="w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {crm.data?.data?.map((lead: any) => (
            <tr key={lead._id}>
              <td>{lead.name}</td>
              <td>{lead.email}</td>
              <td>{lead.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-between items-center">
        <span>
          Showing {pagination.startIndex} to {pagination.endIndex} of{' '}
          {pagination.total}
        </span>
        <div className="space-x-2">
          <button
            onClick={pagination.previousPage}
            disabled={!pagination.canGoPrevious}
          >
            Previous
          </button>
          <span>Page {pagination.page}</span>
          <button
            onClick={pagination.nextPage}
            disabled={!pagination.canGoNext}
          >
            Next
          </button>
        </div>
      </div>

      {modal.isOpen && <AddLeadModal onClose={modal.close} />}
    </div>
  );
}
```

---

## Best Practices

1. **Always use `useAuth()` at page top** for protected routes
2. **Combine `usePaginationWithTotal` with `useCRM`** for paginated lists
3. **Use `useSearch` with debouncing** for large datasets
4. **Use `useModal` for single modals**, `useModals` for multiple
5. **Cache GET requests** with `useFetch` when data doesn't change often
6. **Use `useForm` for complex forms** with validation
7. **Use `useConfirm`** before destructive operations (delete, clear, etc.)
8. **Always cleanup** fetch requests with abort signals (built-in to `useFetch`)

---

**Last Updated**: 2024
**Version**: 1.0.0
**Maintained By**: CRM Team
