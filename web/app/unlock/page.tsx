import { redirect } from "next/navigation";
import { gate, safeNext } from "@/lib/access";
import UnlockForm from "./UnlockForm";

export const dynamic = "force-dynamic";

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const g = gate();
  const next = safeNext((await searchParams).next);
  if (g.kind === "open") redirect(next);

  return (
    <main className="unlock">
      <div className="unlock-card">
        <div className="brand">
          <div className="mark" aria-hidden="true">ר</div>
          <h1>RabAI</h1>
        </div>
        {g.kind === "closed" ? (
          <p>RabAI isn&rsquo;t open yet. It is still being reviewed.</p>
        ) : (
          <>
            <p>This is a private preview while RabAI is being reviewed. Please enter the access code you were given.</p>
            <UnlockForm next={next} />
          </>
        )}
      </div>
    </main>
  );
}
