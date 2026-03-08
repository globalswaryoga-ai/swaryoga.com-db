export {};

declare global {
  interface Window {
    Cashfree?: {
      checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<unknown> | unknown;
      PG?: {
        checkout: (config: { paymentSessionId: string; returnUrl?: string }) => { redirect: () => void };
      };
    };
  }
}
