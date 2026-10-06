import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, gate, tokenValid } from "@/lib/access";

/*
 * Keeps the app private until the board approves a launch (see lib/access.ts).
 * Pages send a locked visitor to /unlock; API calls answer 401 so nothing runs up the bill.
 */
export async function proxy(request: NextRequest) {
  const g = gate();
  if (g.kind === "open") return NextResponse.next();

  const allowed = g.kind === "code" && (await tokenValid(request.cookies.get(ACCESS_COOKIE)?.value, g.code));
  if (allowed) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    const error = g.kind === "closed" ? "RabAI isn't open yet." : "This preview is private. Enter the access code first.";
    return NextResponse.json({ error }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the unlock page itself and the files every page needs.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|unlock|api/unlock).*)"],
};
