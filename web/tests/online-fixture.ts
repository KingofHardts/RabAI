import type { ResearchBlock } from "../lib/engine/online";

/*
 * A lookup's reply, for tests: a search, one page read in full, cited sentences, and the closing
 * JSON. The pages and sentences are test fixtures, not real pages.
 */

export const PAGE_URL = "https://www.torah.org/test/evening-shema";
export const PAGE_TEXT = [
  "Menu Home Learn Donate",
  "A test page about the evening Shema.",
  "The Mishnah opens the Talmud with a question: from when may one read the Shema in the evening?",
  "The evening Shema may be read from the time the kohanim go in to eat their terumah, as the Mishnah teaches at the start of Berakhot.",
  "Many follow the custom of reading it again at bedtime.",
  "Footer Contact Privacy",
].join(" ");

export function shemaLookup(): ResearchBlock[] {
  return [
    { type: "server_tool_use", name: "web_search", input: { query: "evening Shema time" } },
    {
      type: "web_search_tool_result",
      content: [
        { type: "web_search_result", url: PAGE_URL, title: "The Evening Shema (test page)" },
        { type: "web_search_result", url: "https://dinonline.org/test/shema-again", title: "Saying Shema Again (test page)" },
      ],
    },
    { type: "server_tool_use", name: "web_fetch", input: { url: PAGE_URL } },
    {
      type: "web_fetch_tool_result",
      content: {
        type: "web_fetch_result",
        url: PAGE_URL,
        content: { type: "document", title: "The Evening Shema (test page)", source: { type: "text", data: PAGE_TEXT } },
      },
    },
    {
      type: "text",
      text: "Torah.org says the evening Shema may be read from when the kohanim eat terumah.",
      citations: [
        {
          type: "char_location",
          cited_text: "The evening Shema may be read from the time the kohanim go in to eat their terumah",
          document_title: "The Evening Shema (test page)",
        },
      ],
    },
    {
      type: "text",
      text: " Din Online adds a note about bedtime.",
      citations: [
        // A search citation cut short ends in "...", which the page itself does not have.
        { type: "web_search_result_location", url: "https://dinonline.org/test/shema-again", title: "Saying Shema Again (test page)", cited_text: "Reading the Shema again before going to sleep is a widespread custom..." },
        // A page off the list can't come from a search limited to the list; if one did, it is dropped.
        { type: "web_search_result_location", url: "https://example.com/shema", title: "Elsewhere", cited_text: "Some other page says something else entirely." },
      ],
    },
    { type: "text", text: '\n{"found": "yes", "texts": ["Berakhot 2a", "Mishnah Berakhot 1:1", 7]}' },
  ];
}
