# Draft: a note to Chabad.org's web team

Draft for Josh to send, after Chabad.org's written OK (2026-10-10, `canon/permissions.yaml`,
`chabad-org`). Chabad.org couldn't send an export, and its website shows every robot a Cloudflare
check that a copying program can't pass, and shouldn't try to. This asks them to let RabAI's copier
through. Fill in the bracketed parts, and keep contact details out of this public repo.

If they choose a secret header, they send its name and value to Josh, who adds them as a GitHub
secret. The value is never written in this repository or shared in a chat. Once they reply, the
copier's page reader (`site.from: pages`, not built yet) is finished and Chabad.org's sections are
added to the canon for the board, as Aish.com's were.

---

**Subject:** RabAI: letting our copier through Cloudflare

Shalom [name],

Thank you again for allowing RabAI to use Chabad.org's articles for private study. Since an
export isn't possible, we'd like to copy the articles from the website itself, slowly and
politely. Your site's Cloudflare check stops automated visitors, which is right, so we're asking
you to let ours through.

What it is:

- A small program that reads article pages, one at a time, with at least 5 seconds between
  requests (the pause your robots.txt asks for). It never touches what your robots.txt asks robots
  to leave alone.
- It names itself honestly. Every request carries this user agent:
  `RabAIBot/1.0 (private Torah-learning tool, used with the site's written permission; +https://github.com/KingofHardts/RabAI)`
- It reads only the sections we list, and keeps only each article's text, title, author and
  address, in a private database used by RabAI's locked test app. Nothing is published.
- After the first copy, it only checks for new and changed articles, a few times a month.

Either of these would work on your side:

1. A Cloudflare rule that skips the check (the managed challenge and bot fight mode) for requests
   whose user agent starts with `RabAIBot`.
2. Or, if you'd rather not rely on the user agent, a rule that skips it when a header you choose is
   present, with a value you send only to me.

We can run it at whatever times suit you, for example overnight. Thank you for your help.

[Josh's name and contact details]
