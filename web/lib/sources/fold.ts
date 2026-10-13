/**
 * Folded for matching names: lower case, no accents, vowels, apostrophes or possessives, and a
 * word's leading Hebrew article dropped ("HaZohar" matches "Zohar", "Ralbag's" matches "Ralbag").
 * Kept apart from the sources list itself, so the Sources page's search box can use it without
 * sending the whole list to the browser.
 */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u0591-\u05c7]/g, "")
    .replace(/['\u2019]s\b/gi, "")
    .replace(/['"`\u05f3\u05f4\u2018\u2019\u201c\u201d]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u05d0-\u05ea]+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w.length > 5 && w.startsWith("ha") ? w.slice(2) : w))
    .join(" ");
}
