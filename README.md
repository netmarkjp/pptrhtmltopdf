# pptrhtmltopdf

# Usage

```
# build
npm run-script build
```

```
# run
npm run-script run -- \
    --debug \
    --output=/path/to/output.pdf \
    --cover=/path/to/cover.html \
    --backcover=/path/to/backcover.html \
    --footer="[currentPage]/[totalPage]" \
    --generate-toc \
    /path/to/i.html \
    /path/to/ii.html \
    /path/to/iii.html
```

NOTE:

- Cover(Back Cover) and TOC are not counted within page number.

# TODO

High

- Generate TOC
- Use h1/h2 in TOC

Moderate

- Footer formatting
- Header
- PDF page size customise
