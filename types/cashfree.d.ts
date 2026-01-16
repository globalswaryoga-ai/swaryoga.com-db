export {};

declare global {
  interface Window {
    Cashfree?: {
      checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<unknown> | unknown;
    };
  }
}
