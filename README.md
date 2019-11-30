# pptrhtmltopdf

Export PDF from Websites or HTML Files.

Alterative of [wkhtmltopdf](https://wkhtmltopdf.org/) but pptrhtmltopf uses Headless Chrome.

- Add cover page :ok:
- Add backcover page :ok:
- Generate TOC page  :ok:
- Support multi HTML :ok:
- Support local HTML :ok:
- Support Website :ok:

Output PDF Example: [examples/output.pdf](examples/output.pdf)

# Usage

```
# build
npm install
npm run-script build
```

```
# run
npm run-script run -- \
    --debug \
    --generate-toc \
    --output=/path/to/output.pdf \
    --cover=/path/to/cover.html \
    --backcover=/path/to/backcover.html \
    /path/to/i.html \
    /path/to/ii.html \
    /path/to/iii.html
```

NOTE:

- Cover(Back Cover) and TOC are not counted within page number.

# Stack

- Node 12
- Puppeteer 2.0
- pdf-lib 1.2
- pdf-tex-extract 1.5
- TypeScript 3.7

# TODO

High

- Release as CLI command
- CI/CD

Moderate

- Footer formatting
- Header
- TOC customise
- PDF page size customise
