// Workshop Management - .env File Operations Only
// No database needed - reads/writes directly to .env files

// Types
export interface WorkshopSchedule {
  id: string; // Unique identifier
  workshop_id: string;
  workshop_name: string;
  mode: 'online' | 'offline' | 'residential' | 'recorded';
  start_date: string; // DD-MMM format
  end_date: string;
  days: string;
  time: string;
  slots: number;
  registration_close_date: string;
  location: string;
}

export interface PaymentLink {
  id: string; // Unique identifier
  workshop_id: string;
  workshop_name: string;
  language: 'hindi' | 'english' | 'marathi';
  mode: 'online' | 'offline' | 'residential' | 'recorded';
  currency: 'INR' | 'NPR' | 'USD';
  payment_link: string;
}

function resolvePaymentLinkApiUrl(path: string, baseUrl?: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (baseUrl) {
    return new URL(normalizedPath, baseUrl).toString();
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(normalizedPath, window.location.origin).toString();
  }

  throw new Error('Base URL is required when calling workshop payment APIs from the server');
}

// ============================================================================
// WORKSHOP SCHEDULES - .env File Operations
// ============================================================================

export async function getSchedules(
  workshopId?: string,
  baseUrl?: string
): Promise<{ data?: WorkshopSchedule[]; error?: string }> {
  try {
    const url = baseUrl
      ? new URL('/api/admin/workshops/schedules/env', baseUrl).toString()
      : '/api/admin/workshops/schedules/env';
    const response = await fetch(url);
    const { data, error } = await response.json();

    if (error) return { error };

    let schedules = (data || []) as WorkshopSchedule[];

    if (workshopId) {
      schedules = schedules.filter(s => s.workshop_id === workshopId);
    }

    return { data: schedules };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function createSchedule(
  schedule: WorkshopSchedule,
  baseUrl?: string
): Promise<{ data?: WorkshopSchedule; error?: string }> {
  try {
    const url = baseUrl
      ? new URL('/api/admin/workshops/schedules/env', baseUrl).toString()
      : '/api/admin/workshops/schedules/env';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule),
    });

    const { data, error } = await response.json();

    if (error) return { error };
    return { data };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function updateSchedule(
  id: string,
  updates: Partial<WorkshopSchedule>,
  baseUrl?: string
): Promise<{ data?: WorkshopSchedule; error?: string }> {
  try {
    const url = baseUrl
      ? new URL('/api/admin/workshops/schedules/env', baseUrl).toString()
      : '/api/admin/workshops/schedules/env';
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });

    const { data, error } = await response.json();

    if (error) return { error };
    return { data };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function deleteSchedule(id: string, baseUrl?: string): Promise<{ error?: string }> {
  try {
    const url = baseUrl
      ? new URL(`/api/admin/workshops/schedules/env?id=${id}`, baseUrl).toString()
      : `/api/admin/workshops/schedules/env?id=${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
    });

    const { error } = await response.json();

    if (error) return { error };
    return {};
  } catch (err) {
    return { error: String(err) };
  }
}

// ============================================================================
// PAYMENT LINKS - .env File Operations
// ============================================================================

export async function getPaymentLinks(
  workshopId?: string,
  baseUrl?: string
): Promise<{ data?: PaymentLink[]; error?: string }> {
  try {
    const response = await fetch(resolvePaymentLinkApiUrl('/api/admin/workshops/payment-links/env', baseUrl));
    const { data, error } = await response.json();

    if (error) return { error };

    let links = (data || []) as PaymentLink[];

    if (workshopId) {
      links = links.filter(l => l.workshop_id === workshopId);
    }

    return { data: links };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function createPaymentLink(
  link: PaymentLink,
  baseUrl?: string
): Promise<{ data?: PaymentLink; error?: string }> {
  try {
    const response = await fetch(resolvePaymentLinkApiUrl('/api/admin/workshops/payment-links/env', baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(link),
    });

    const { data, error } = await response.json();

    if (error) return { error };
    return { data };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function updatePaymentLink(
  id: string,
  updates: Partial<PaymentLink>,
  baseUrl?: string
): Promise<{ data?: PaymentLink; error?: string }> {
  try {
    const response = await fetch(resolvePaymentLinkApiUrl('/api/admin/workshops/payment-links/env', baseUrl), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });

    const { data, error } = await response.json();

    if (error) return { error };
    return { data };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function deletePaymentLink(id: string, baseUrl?: string): Promise<{ error?: string }> {
  try {
    const url = new URL(resolvePaymentLinkApiUrl('/api/admin/workshops/payment-links/env', baseUrl));
    url.searchParams.append('id', id);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
    });

    const { error } = await response.json();

    if (error) return { error };
    return {};
  } catch (err) {
    return { error: String(err) };
  }
}


