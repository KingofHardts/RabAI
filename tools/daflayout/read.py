"""Reading each printed line with Tesseract.

Every line is read twice: with Tesseract's Hebrew model, for the square letters of the Gemara, and
with a model for Rashi script, for the commentaries. Which reading is more confident tells which
script the line is printed in.

The Rashi-script model (heb_rashi.traineddata) is from the KleiKodesh project (Apache-2.0); see
tools/daflayout/README.md for where to get it.
"""

import os

import numpy as np
from PIL import Image

MODELS = ("heb", "heb_rashi")


def line_image(g, lab, line, pad=6):
    """The line alone: only its own blobs, on white, enlarged when the print is small. Also returns
    where the image starts on the page and how much it was enlarged."""
    x0, y0, x1, y1 = line["box"]
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(g.shape[1], x1 + pad), min(g.shape[0], y1 + pad)
    keep = np.isin(lab[y0:y1, x0:x1], [c[5] for c in line["comps"]])
    im = Image.fromarray(np.where(keep, g[y0:y1, x0:x1], 255).astype(np.uint8))
    scale = 1
    if line["xh"] < 20:  # Tesseract reads best at about 30-pixel letters
        scale = 2
        im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    return im, x0, scale


def line_key(line):
    return (tuple(int(v) for v in line["box"]), tuple(sorted(int(c[5]) for c in line["comps"])))


class Reader:
    """Tesseract with both models loaded once, for many pages."""

    def __init__(self, tessdata=None):
        import tesserocr

        path = tessdata or os.environ.get("TESSDATA", "")
        self.apis = {m: tesserocr.PyTessBaseAPI(path=path, lang=m, psm=tesserocr.PSM.SINGLE_LINE) for m in MODELS}

    def read(self, g, lab, lines, memo=None):
        """Sets line["ocr"] = {model: (text, confidence, words)} on every line, where words are the
        printed words Tesseract found, right to left: (text, left, right) in page pixels. memo:
        readings of lines already read on this page (same box, same blobs), reused instead of read
        again."""
        import tesserocr

        for line in lines:
            key = line_key(line)
            if memo is not None and key in memo:
                line["ocr"] = memo[key]
                continue
            im, ox, scale = line_image(g, lab, line)
            out = {}
            for m, api in self.apis.items():
                api.SetImage(im)
                text = api.GetUTF8Text().strip()
                found = []
                level = tesserocr.RIL.WORD
                for w in tesserocr.iterate_level(api.GetIterator(), level):
                    box = w.BoundingBox(level)
                    if box:
                        found.append([w.GetUTF8Text(level) or "", ox + box[0] / scale, ox + box[2] / scale])
                # The iterator gives each word's letters in the order they are drawn (left to right);
                # the line's text has them in reading order, so take each word's text from there.
                said = text.split()
                if len(said) == len(found):
                    for f, t in zip(found, said):
                        f[0] = t
                else:
                    for f in found:
                        f[0] = f[0][::-1]
                found.sort(key=lambda f: -f[2])
                out[m] = (text, float(api.MeanTextConf()), [tuple(f) for f in found])
            line["ocr"] = out
            if memo is not None:
                memo[key] = out
        return lines

    def close(self):
        for api in self.apis.values():
            api.End()
