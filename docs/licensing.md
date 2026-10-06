# Licensing

A text can be religiously approved and still not usable, because we lack permission to use
it. Both checks have to pass before a text enters the library.

## The rule

An edition goes into retrieval only when:

1. the board has approved the work and the edition, and
2. its license is `cleared`, which means one of:
   - written permission from the publisher, covering how we use it, or
   - verified public domain, or
   - an open license that allows our use (check the commercial-use terms).

Record the evidence in the edition's `notes` (for example, "Permission letter from Koren,
2026-11-02, saved in the shared drive").

## Every license in canon.yaml is a starting point

The `license` values in `canon.yaml` today are first guesses for what to check. None has been
confirmed.

## Things to check

**Sefaria.** Sefaria lists a license for each text and translation on the text's "About"
page. They vary: public domain, open licenses that allow commercial use, open licenses that
forbid it (CC BY-NC), and texts used by special permission. A non-commercial license does not
cover a paid product. If the assistant will ever charge, or be part of anything that charges,
non-commercial texts need a separate agreement with the publisher.

**Public domain.** The printed Vilna Shas or Mikraot Gedolot may be public domain, but a
digital edition of it may carry its own license. Check the source you actually download.

**Publishers to contact.** Most of the Orthodox translations in the canon are under
copyright. Expect to need agreements with:

- ArtScroll/Mesorah
- Koren / Maggid
- Feldheim
- Kehot (Chabad)
- Moznaim
- Mossad HaRav Kook
- OU Press and the Toras HoRav Foundation
- Aish HaTorah (48 Ways)

Ask each one what they allow for an AI assistant specifically: storing the text, retrieving
passages, quoting them in answers, and whether attribution or links are required.

**Quoting vs. storing.** Some publishers may allow short quotations in answers but not
storing the full text. The library design should be able to store a passage for retrieval
and limit how much of it appears in an answer.
