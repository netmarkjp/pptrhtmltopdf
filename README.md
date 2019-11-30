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
    --cover=/path/to/cover.html \
    --backcover=/path/to/backcover.html \
    --footer="[currentPage]/[totalPage]" \
    --generate-toc \
    --output=/path/to/output.pdf \
    /path/to/i.html \
    /path/to/ii.html \
    /path/to/iii.html
```

NOTE:

- Cover(Back Cover) and TOC are not counted within page number.

# Process

1. Render pages, set with args.
    1. render /path/to/i.html => [tmp]/0001.pdf
        - pick "title", "h1, h2"
    2. render /path/to/ii.html => [tmp]/0002.pdf
    3. render /path/to/iii.html => [tmp]/0003.pdf
2. Count each PDF's pages
    - 0001.pdf=4pages, 0002.pdf=2pages, ...
3. Find h1, h2 's page number **TODO**
    - 0001.pdf: h1:Abstract: p.1, h2:My Story: p.3, ...
    - 0002.pdf: h1:Beginning: p.1, h2:In my baby days: p.1, ...
    - ...
4. Write footer to contents PDFs
    - Contnets PDFs are [tmp]/0001.pdf, [tmp]/0002.pdf, ...
    - Typically footer includes page number and copyright
5. Generate and render TOC
    - => [tmp]/toc.pdf
6. Render cover
    - /path/to/cover.html => [tmp]/cover.pdf
    - /path/to/backcover.html => [tmp]/backcover.pdf
7. Concat PDF
    - [tmp]/cover.pdf, [tmp]/toc.pdf, [tmp]/0001.pdf, [tmp]/0002.pdf, ..., [tmp]/backcover.pdf

# TODO

- Generate TOC
- Use h1/h2 in TOC
- Footer formatting
- Header
- PDF page size customise
