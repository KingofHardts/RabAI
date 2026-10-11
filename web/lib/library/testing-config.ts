/** The testing library's database settings, kept apart so they load without the database client. */
export function testingDbUrl(env: Record<string, string | undefined> = process.env): string | null {
  return env.RABAI_LIBRARY_DB_URL || env.TURSO_DATABASE_URL || null;
}

export const TESTING_LABEL = "Private testing library. Not yet approved by the rabbinic board.";

/**
 * The website collections' databases (rabai-collection-<permission>, built by
 * tools/collection_build.py), comma-separated. Each is read like the testing library and has the
 * same standing: private, and labeled not yet approved by the rabbinic board.
 */
export function collectionDbUrls(env: Record<string, string | undefined> = process.env): string[] {
  return (env.RABAI_COLLECTION_DB_URLS || "")
    .split(/[\s,]+/)
    .map((u) => u.trim())
    .filter(Boolean);
}
