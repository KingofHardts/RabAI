/*
 * Short names for long references, so buttons and cards read cleanly: "Siddur Ashkenaz, Weekday,
 * Shacharit, Pesukei Dezimra, Barukh She'amar 1" is shown as "Siddur Ashkenaz · Barukh She'amar 1",
 * with the full reference kept for a tooltip. References with fewer parts ("Genesis 1:3",
 * "Shulchan Arukh, Orach Chayim 1:1", "Berakhot 2a") are left as they are. Safe on the device.
 */

/** The book and the last part of a long reference; the reference itself when it is short. */
export function shortRef(ref: string): string {
  const parts = ref.split(", ");
  if (parts.length < 3) return ref;
  const book = parts[0].replace(/^The /, "");
  return `${book} · ${parts[parts.length - 1]}`;
}

/** A place inside a book, without the book ("Weekday, Shacharit, Modeh Ani" -> "Modeh Ani"). */
export function shortPlace(place: string): string {
  const parts = place.split(", ");
  return parts.length >= 2 ? parts[parts.length - 1] : place;
}
