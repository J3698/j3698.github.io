#!/usr/bin/env bash

for f in *.tex ; do
    echo $f
    pdflatex "$f"
    basename="${f%.tex}"
    convert -density 1200 "$basename.pdf" \
      -resize 1400 \
      -gravity South -background white -splice 0x1 \
        -background black -splice 0x1 \
        -trim  +repage -chop 0x1 \
      -gravity North -background white -splice 0x1 \
        -background black -splice 0x1 \
        -trim  +repage -chop 0x1 \
      "$basename".png
    rm "$basename.pdf"
    rm "$basename.log"
    rm "$basename.aux"
done
