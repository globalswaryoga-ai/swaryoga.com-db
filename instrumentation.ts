/**
 * Next.js startup hook (runs once per server process, before any request).
 *
 * Node.js 24/25 enable the post-quantum hybrid TLS key-exchange group
 * `X25519MLKEM768` by default. Its key share is large, which pushes the
 * TLS ClientHello past a single TCP segment. MongoDB Atlas's TLS frontend
 * intermittently rejects that oversized hello with
 *   "ssl3_read_bytes:tlsv1 alert internal error" (SSL alert number 80),
 * surfacing as random 500s on DB-backed routes.
 *
 * Restricting the offered groups to classic curves keeps the ClientHello
 * small and stable. Atlas fully supports X25519 / P-256 / P-384, so there
 * is no security or compatibility downside.
 *
 * NOTE: the durable fix is to run the server on a Node LTS (20/22), which
 * does not enable the PQ group by default. This guard is harmless there.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    // Runtime require (hidden from webpack's static analysis so it isn't
    // bundled for the edge runtime, where 'tls' does not exist).
    const req: NodeRequire = eval('require');
    const tlsModule = req('tls') as { DEFAULT_ECDH_CURVE: string };
    // Mutating the singleton makes every consumer (mongodb, mongoose, fetch, …)
    // offer only classic curves.
    tlsModule.DEFAULT_ECDH_CURVE = 'X25519:prime256v1:secp384r1';
  } catch {
    /* nothing to do */
  }
}
