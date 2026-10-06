/** The testing library's database settings, kept apart so they load without the database client. */
export function testingDbUrl(env: Record<string, string | undefined> = process.env): string | null {
  return env.RABAI_LIBRARY_DB_URL || env.TURSO_DATABASE_URL || null;
}

export const TESTING_LABEL = "Private testing library. Not yet approved by the rabbinic board.";
