import RabaiApp from "@/components/RabaiApp";
import { libraryMode } from "@/lib/library";

export const dynamic = "force-dynamic";

export default function Home() {
  return <RabaiApp libraryMode={libraryMode()} connected={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
