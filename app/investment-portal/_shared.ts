// Client-side helpers for the investor portal (not a route)

export const TOKEN_KEY = 'swar_investor_token';

export function getInvestorToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setInvestorToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearInvestorToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function portalFetch(path: string, init: RequestInit = {}) {
  const token = getInvestorToken();
  const res = await fetch(`/api/investment/portal${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || 'Request failed'), { status: res.status });
  return json;
}

export const rupees = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400';
export const labelClass = 'block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5';

/** Load Cashfree's checkout SDK once, then open checkout for this payment session. */
export async function openCashfreeCheckout(sdkUrl: string, mode: string, paymentSessionId: string) {
  const w = window as any;
  if (!w.Cashfree) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = sdkUrl;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load the payment page. Check your connection and try again.'));
      document.head.appendChild(script);
    });
  }
  const cashfree = w.Cashfree({ mode });
  await cashfree.checkout({ paymentSessionId, redirectTarget: '_self' });
}
