import localFont from "next/font/local";

/*
 * The typefaces of the printed Gemara page, served with the app (SIL Open Font License; the
 * licenses are in app/fonts/ and THIRD-PARTY-NOTICES.md):
 *
 * - Romm Vilna (Ross Ilan Elovitz, 2025), drawn after the square type of the Romm Vilna Shas, for
 *   the Gemara and the commentaries' bold opening words. Its Heading and Title styles are the
 *   larger cuts, for headings and the big opening words of a tractate or chapter.
 * - Mekorot (The Mekorot Project, redrawn by Eli Heuer for Google Fonts), a Rashi script made to
 *   set the Talmud page, for Rashi, Tosafot and the notes around them.
 *
 * Not preloaded: only the page view needs them.
 */
export const vilna = localFont({
  src: "./fonts/RommVilna-Regular.ttf",
  variable: "--font-vilna",
  display: "swap",
  preload: false,
});

export const vilnaHeading = localFont({
  src: "./fonts/RommVilna-Heading.otf",
  variable: "--font-vilna-heading",
  display: "swap",
  preload: false,
});

export const vilnaTitle = localFont({
  src: "./fonts/RommVilna-Title.otf",
  variable: "--font-vilna-title",
  display: "swap",
  preload: false,
});

export const rashiScript = localFont({
  src: [
    { path: "./fonts/Mekorot-Regular.ttf", weight: "400" },
    { path: "./fonts/Mekorot-Bold.ttf", weight: "700" },
  ],
  variable: "--font-rashi",
  display: "swap",
  preload: false,
});

export const dafFontVariables = [vilna, vilnaHeading, vilnaTitle, rashiScript].map((f) => f.variable).join(" ");
