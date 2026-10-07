import type { LearnerProfile } from "../learner-profile";
import type { PeopleStore } from "./people";
import { currentSession } from "./session";

/*
 * Which profile shapes an answer (docs/learner-profiles.md).
 *
 * - The device sends its profile only when remembering is on there. When it sends none, none is
 *   used, signed in or not.
 * - Signed in, the account's copy is the one used: it is the person's, kept on the server and
 *   checked when it was saved. With remembering off in the account, it yields nothing
 *   (profileSummary is empty).
 * - Not signed in, or if the account can't be read just now, the device's copy is used, as before.
 *
 * Either way it only shapes how RabAI explains, never what the sources say; the server always
 * rebuilds the lines the model sees from a checked copy (profileSummary).
 */
export async function profileForAsk(
  request: Request,
  deviceProfile: LearnerProfile | undefined,
  env: Record<string, string | undefined> = process.env,
  store?: PeopleStore | null,
): Promise<LearnerProfile | undefined> {
  if (!deviceProfile) return undefined;
  try {
    const session = await currentSession(request, env, store);
    if (!session) return deviceProfile;
    return (await session.store.getProfile(session.personId)) ?? deviceProfile;
  } catch (err) {
    console.error("[rabai] reading the account's profile failed:", err instanceof Error ? err.message : err);
    return deviceProfile;
  }
}
