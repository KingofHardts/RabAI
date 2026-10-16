# How RabAI should feel: research and changes (October 2026)

Josh asked (2026-10-16) for three things: pictures that RabAI can read, answers that are never
lost when you leave the page, and a careful look at how the app feels, with research behind it,
so that what should be obvious is obvious. This document records what we read, what we
concluded, and what changed. The earlier study of the reading screens is in
[`ui-research.md`](ui-research.md).

## What we read

Read in full:

- How Claude reads pictures: Anthropic's [vision guide](https://platform.claude.com/docs/en/build-with-claude/vision)
  (the size limits, pictures before the question, labeling several pictures, what it won't do).

Seen only through web search summaries, not read in full (so treat the details as reported, not
checked):

- How AI chat apps keep an answer going when the page is reloaded: the Vercel AI SDK's guide to
  [resuming streams](https://ai-sdk.dev/v5/docs/ai-sdk-ui/chatbot-resume-streams), and Ably's
  [account of what that covers and what it doesn't](https://ably.com/vercel/vercel-ai-sdk-resumable-stream-what-it-covers-and-what-it-doesnt)
  and of [why chat history disappears between sessions](https://ably.com/vercel/vercel-why-ai-chat-history-disappears-between-sessions).
  (Ably sells an alternative, so we weighed its claims accordingly.)
- How a chat should scroll while an answer is written: a
  [Telerik feature request](https://feedback.telerik.com/blazor/1712929-implement-correct-auto-scroll-behavior-in-chat-control)
  describing what people expect from ChatGPT-style apps, a developer's write-up of
  [the scroll problem in AI chat](https://medium.com/@disgcfrguy/the-scroll-problem-nobody-talks-about-when-building-ai-chat-interface-987c223cafc0),
  the [shadcn message scroller](https://ui.shadcn.com/docs/components/message-scroller), the
  [TanStack Virtual chat guide](https://tanstack.com/virtual/latest/docs/chat), and a
  [WeWeb community thread](https://community.weweb.io/t/auto-scroll-to-latest-message-in-ai-chat/17579)
  asking for the new question to sit at the top with its answer below.
- Waiting: Microsoft's [Fluent guidance on wait states](https://fluent2.microsoft.design/wait-ux),
  [the waiting problem in AI products](https://uxdesign.cc/the-waiting-problem-in-ai-products-e7c11fd5a825),
  and Smashing Magazine's "Designing Stable Interfaces For Streaming Content" (Joas Pambou, May
  2026, listed in [Smashing's UI feed](https://www.smashingmagazine.com/category/ui/index.xml);
  layout shifts, reduced motion, interrupted streams, keyboard and screen readers). We could not
  open the article itself.
- Feeling calm rather than busy: Amber Case's
  [principles of calm technology](https://calmtech.institute/calm-tech-principles) (technology
  should ask for as little of a person's attention as it can, and should still work when it
  fails), and the [IEEE Spectrum interview](https://spectrum.ieee.org/calm-tech) about them.
- Mistakes and second chances: Google PAIR's People + AI Guidebook chapters on
  [Errors + Graceful Failure](https://pair.withgoogle.com/chapter/People%20+%20AI%20Guidebook%20-%20Errors%20+%20Graceful%20Failure.pdf)
  ("provide paths forward") and
  [Feedback + Control](https://pair.withgoogle.com/chapter/People%20+%20AI%20Guidebook%20-%20Feedback%20+%20Control.pdf).
- Showing a little at a time: Nielsen Norman Group on
  [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/).
- Attaching pictures in a chat: the design systems of
  [Siemens iX](https://ix.siemens.io/docs/components/chat-attachment/guide),
  [UGA Online](https://design.online.uga.edu/components/chat/attachment/),
  [SAP Joule](https://www.sap.com/design-system/fiori-design-ios/v26-4/joule/patterns/joule-persistent-attachment),
  and [AI Elements](https://elements.ai-sdk.dev/components).

Most of what we changed came from using the app ourselves, on a phone and a computer, and
writing down every place we hesitated; the sources above mostly confirmed it.

## What we concluded

1. **Never lose what the person did.** A question is theirs the moment they press Ask. Nothing they
   do afterwards (reloading, closing the tab, locking the phone, losing the signal) should cost
   them the answer. As the summaries above describe it, the usual approach only reconnects to an
   answer still being written, and leaves keeping the finished answer to the app. We do both, and
   the answer is written even when nobody is listening.
2. **Hold the reader's place.** When an answer appears, the question goes to the top of the screen
   and the answer grows underneath it, as in a book. The screen never moves under someone who is
   reading. Following the end of a growing answer, which many apps do, pushes the beginning off
   the screen while the person is reading it.
3. **Calm, not busy.** Show what RabAI is doing in plain words, not a spinner. Say "you can
   leave" only after a few seconds, when it is useful. Mark a finished answer quietly ("Answered
   while you were away", "New answer" in the list of chats) instead of interrupting.
4. **Always a way forward.** Stop puts the question back in the box, so it can be changed and
   asked again. An answer that failed has "Try again". A good answer can be copied.
5. **One thing at a time.** The welcome and the suggested questions belong to an empty chat;
   an open chat shows only the conversation.
6. **Pictures the way people already know them.** A picture button beside the box, paste, or drag
   a picture in; small previews above the box, each with a remove button named for it ("Remove
   picture 2"); problems explained under the box; in the conversation, the picture shown above
   the question it came with, and tappable to see it large.
7. **Send pictures the way Claude reads them best.** Claude's newer models read a picture at up to
   2576 pixels on the long side, which matters for a photo of a whole page of small print. Pictures
   come before the question, each labeled when there are several. Claude doesn't name people in
   pictures, and can misread blurry, rotated or very small pictures, so the core premises ask
   RabAI to say what it reads and what it can't make out.

## What changed

**Answers that wait for you.** The question is saved on the device the moment it is asked, with a
place kept for its answer. The server writes the answer whether or not the page is open, and keeps
its progress and the finished answer (never the question or the pictures) under a random number
only the asking device knows, for at most a day (`web/lib/answer-jobs.ts`, `/api/ask/job`).
Reloading the page reopens the chat it had open; opening the app again opens a chat whose answer
is still on its way; the answer takes its place when it is ready. Several chats can wait for
answers at once, and the list of chats says which are still answering and which have a new answer.
Stop stops the answer on the server too, and keeps nothing of it.

**Pictures.** Up to four pictures with a question, from the picture button, paste, or drag and
drop. Each is made smaller on the device (sharp enough for small print), checked again on the
server, read with the question by RabAI and by its planning step, and sent again with the next
few questions in the chat while the page is open. The server never keeps a picture; the chat keeps
a small preview on the device. The rules RabAI follows with pictures are drafted for the board in
the core premises ("Pictures the person sends").

**The chat.**
- The question goes to the top when asked; nothing moves while the answer is written. "Back to the
  answer" brings back an answer you scrolled away from.
- Ask turns into Stop while the answer is written. Stopping returns the question to the box.
- "Try again" under an answer that failed, "Copy" under every answer, "Tell me more" and "Say it
  more simply" only under the latest one.
- After a few seconds of waiting: "You can leave this page. The answer will be here when you come
  back."
- The welcome shows only in a new chat, starting at its first line, and on a phone it uses the
  whole width. It now mentions that you can send a picture of a page.
- On a phone, "not a rav" appears once at the top of an open chat (a computer shows it under the
  box).

**Moving around.**
- The button for your chats shows a list, so it isn't mistaken for the Chat tab beside it, and has
  a dot when an answer arrived in another chat.
- A New chat button (a pencil) stays in the bar on phones and tablets, where the chat's own
  heading scrolls away.
- Switching chats or starting a new one no longer waits for an answer to finish.
- Opening a text from an answer on a phone no longer hides the reader's bar.
- The reader's title gets two lines on a phone (the book's name, then its Hebrew name), so neither
  is cut short.
- With a text open beside the chat on a computer, the bar drops the tagline and badge so it fits on
  one line.

## Ideas not built yet

- An answer still being written follows the person only on the device that asked. Their other
  devices see the question, and the answer once the asking device has it.
- A follow-up question sends the earlier pictures again. Anthropic's Files API could send each
  picture once, but it would keep the picture with Anthropic until deleted, so we haven't used it.
- Speech recognition on iPhones is unreliable in the browser; a transcription service on the
  server would fix it, and needs the maintainer's choice of provider.
