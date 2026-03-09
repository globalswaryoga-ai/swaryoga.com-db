export {};

declare global {
  interface Window {
    Cashfree?: ((config: { mode: 'sandbox' | 'production' }) => {
      checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<unknown>;
    }) & {
      checkout?: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<unknown> | unknown;
      PG?: {
        checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => {
          redirect: () => void;
        };
      };
    };
  }
}
