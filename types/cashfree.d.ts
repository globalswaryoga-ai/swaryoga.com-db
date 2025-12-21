export {};

declare global {
  interface Window {
    Cashfree?: (options: { mode: 'sandbox' | 'production' }) => {
      checkout: (opts: { paymentSessionId: string; redirectTarget?: '_self' | '_blank' | string }) => Promise<unknown> | unknown;
    };
  }
}
