import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "What RabAI keeps · RabAI" };

/** What RabAI keeps about a person, where, and how to remove it, in plain English. */
export default function PrivacyPage() {
  return (
    <main className="privacy">
      <article className="privacy-card">
        <p className="privacy-back">
          <Link href="/">← Back to RabAI</Link>
        </p>
        <h1>What RabAI keeps, and why</h1>
        <p className="muted">Last updated 7 October 2026. RabAI is a private preview while the rabbinic board reviews it.</p>

        <h2>On your device</h2>
        <p>
          Your saved chats, the words you save, your marks, where you were reading, and what RabAI knows about you
          (&ldquo;About you&rdquo;) are kept in this browser, on this device. Unless you sign in, they stay there.
        </p>

        <h2>When you ask a question</h2>
        <p>
          Your question and the conversation so far go to RabAI&rsquo;s server and to the AI model that writes the answer
          (Claude, made by Anthropic). If &ldquo;Remember what I learn&rdquo; is on, a few short lines about your learning go
          with it, so RabAI can explain at your level. RabAI&rsquo;s server doesn&rsquo;t keep your questions, except in your
          saved chats when you are signed in.
        </p>

        <h2>If you sign in</h2>
        <p>Signing in is optional. It lets your chats and what RabAI knows about you follow you to your other devices.</p>
        <ul>
          <li>
            <strong>Kept in your account:</strong> what you told RabAI in &ldquo;About you&rdquo;, what it noticed while you
            learned (the books you read and the words you looked up), and your saved chats.
          </li>
          <li>
            <strong>Your email address is not kept.</strong> It is used once, to send you the sign-in link. RabAI keeps only a
            scrambled check value made from it with a secret key, so the same address finds the same account. The address
            can&rsquo;t be read back from it, so RabAI can&rsquo;t email you for anything else.
          </li>
          <li>
            <strong>Where:</strong> in a database at Turso, a hosting service, in the United States. The sign-in email is sent
            by Resend, an email service, which sees your address to deliver it.
          </li>
          <li>
            <strong>With &ldquo;Remember what I learn&rdquo; off,</strong> nothing more about you is noticed, sent with your
            questions, or saved to your account. Chats you save are still kept, because you saved them; you can delete them
            at any time.
          </li>
          <li>
            <strong>How long:</strong> until you delete it. If you don&rsquo;t use RabAI for 60 days you are signed out, and
            your account stays until you delete it.
          </li>
          <li>
            <strong>Signing out</strong> takes your chats and what RabAI knows about you off that device. They stay in your
            account for the next time you sign in.
          </li>
        </ul>

        <h2>Seeing it, and deleting it</h2>
        <p>
          In RabAI, tap the gear at the top, then <strong>Your account</strong>. <strong>Download my data</strong> gives you a
          file with everything kept in your account. <strong>Delete my account</strong> deletes your account, your chats and
          everything RabAI knows about you from the server right away. In <strong>About you</strong> you can see, change and
          forget what RabAI knows about you at any time, signed in or not.
        </p>

        <h2>&ldquo;Was this helpful?&rdquo;</h2>
        <p>
          When you tap it under an answer, RabAI keeps the question, the answer, the sources it cited, and the reason or note
          you add. It is not linked to you or your account, and never includes what RabAI knows about you. The RabAI team
          reads it to make RabAI better.
        </p>

        <h2>What RabAI never keeps</h2>
        <p>
          RabAI notices only what you learn. It doesn&rsquo;t keep anything about your health, your feelings, your observance,
          your family or anything else about your life, even if you mention it in a chat (a chat you save keeps your own words,
          as you wrote them). What is kept is used only for what this page describes.
        </p>
      </article>
    </main>
  );
}
