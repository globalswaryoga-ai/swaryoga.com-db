import { createClient, type Client, type InStatement, type ResultSet } from '@libsql/client';

/**
 * Server-side Bunny Database client.
 *
 * This is an application connection layer only. Existing routes continue to use
 * MongoDB until each module has a SQL schema, repository, and verified cutover.
 */
const databaseUrl = process.env.BUNNY_DATABASE_URL?.trim();
const databaseToken = process.env.BUNNY_DATABASE_AUTH_TOKEN?.trim();

let client: Client | null = null;

function getConfig(): { url: string; authToken: string } {
  if (!databaseUrl || !databaseToken) {
    throw new Error(
      'Bunny Database is not configured. Set BUNNY_DATABASE_URL and BUNNY_DATABASE_AUTH_TOKEN.',
    );
  }

  return { url: databaseUrl, authToken: databaseToken };
}

/** Return the shared Bunny Database client, creating it lazily on first use. */
export function getBunnyDatabase(): Client {
  if (!client) {
    client = createClient(getConfig());
  }
  return client;
}

/** Execute a parameterized SQL statement against Bunny Database. */
export async function bunnyExecute(
  statement: InStatement | string,
): Promise<ResultSet> {
  return getBunnyDatabase().execute(statement);
}

/** Execute multiple statements atomically in a Bunny Database transaction. */
export async function bunnyBatch(
  statements: InStatement[],
): Promise<ResultSet[]> {
  if (statements.length === 0) return [];
  return getBunnyDatabase().batch(statements, 'write');
}

/**
 * Close the client during scripts/tests. Request handlers should not call this;
 * the client is intentionally reused for the lifetime of the server process.
 */
export function closeBunnyDatabase(): void {
  if (client) {
    client.close();
    client = null;
  }
}

export function isBunnyDatabaseConfigured(): boolean {
  return Boolean(databaseUrl && databaseToken);
}
