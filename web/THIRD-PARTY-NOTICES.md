# Third-party notices

## daf-renderer

The page layout in `lib/library/daf.ts` (`computeSpacers`) and `components/DafPage.tsx` is ported
from daf-renderer, https://github.com/GT-Jewish-DH/daf-renderer, under the MIT License:

```
MIT License

Copyright (c) 2020 Dan Jutan Shaun Regenbaum

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Fonts on the Gemara page

The printed-page view uses two typefaces under the SIL Open Font License 1.1. The font files and
their full license texts are in `app/fonts/`.

- **Romm Vilna** (`RommVilna-Regular.ttf`, `RommVilna-Heading.otf`, `RommVilna-Title.otf`):
  Copyright (c) 2025, Ross Ilan Elovitz, with Reserved Font Name "Romm Vilna". Obtained from the
  Open Siddur Project's font collection, https://github.com/aharonium/fonts (commit
  `2b5e366ffaa89d42159092fcccd6d027b50a9ef9`). License: `app/fonts/RommVilna-OFL.txt`.
- **Mekorot** (`Mekorot-Regular.ttf`, `Mekorot-Bold.ttf`): Copyright 2021 The Mekorot Project
  Authors, https://github.com/googlefonts/mekorot (commit
  `4e51edad1a265838154e2cae46c28c6a11145c95`). License: `app/fonts/Mekorot-OFL.txt`.

The files are served unchanged.

## Hebcal

The calendar and the day's times (`lib/calendar/calendar.ts`) use the Hebcal libraries, installed
unchanged from npm and run only on the server, never sent to a browser:

- `@hebcal/core` and `@hebcal/hdate`, under the GNU General Public License, version 2 or later
  (https://github.com/hebcal/hebcal-es6, https://github.com/hebcal/hdate-js);
- `@hebcal/noaa`, the solar calculations, under the GNU Lesser General Public License, version 2.1
  (https://github.com/hebcal/noaa), based on the KosherJava zmanim library by Eliyahu Hershfeld;
- `@hebcal/learning` and `@hebcal/leyning`, the daily learning schedules and the Torah readings,
  under the BSD 2-Clause License (https://github.com/hebcal/hebcal-learning,
  https://github.com/hebcal/hebcal-leyning).

Each package's own license text is in its folder under `node_modules/@hebcal/`.
