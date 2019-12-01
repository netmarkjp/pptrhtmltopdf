# pptrhtmltopdf

Convert HTML to PDF using Chrome (Puppeteer)

Export PDF from Websites or HTML Files.

Alterative of [wkhtmltopdf](https://wkhtmltopdf.org/) but pptrhtmltopdf uses Headless Chrome.

- Add cover page :ok:
- Add backcover page :ok:
- Generate TOC page  :ok:
- Support multi HTML :ok:
- Support local HTML :ok:
- Support Website :ok:

Output PDF Example: [examples/output-examples.pdf](examples/output-example.pdf)

# Install

```bash
npm install pptrhtmltopdf
```

# Usage

```bash
NAME
    pptrhtmltopdf [OPTIONS] [FILE or URL]...

    Convert HTML to PDF using Chrome (Puppeteer)

DESCRIPTION
    --output=[FILE]    Save PDF to [FILE]
    --cover=[FILE]     Use [FILE] to cover
    --backcover=[FILE] Use [FILE] to backcover
    --generate-toc     Generate TOC(Table of Contents)
    --no-sandbox       Disable Chrome's sandboxing
    --debug            Run in DEBUG mode
    --version          Show version
    --help             Show this help
```

Run `pptrhtmltopdf` or `node_modules/.bin/pptrhtmltopdf`

## Example

### Capture https://github.com/netmarkjp/pptrhtmltopdf to `./output.pdf`

```bash
pptrhtmltopdf https://github.com/netmarkjp/pptrhtmltopdf
```

### Capture https://github.com/netmarkjp/pptrhtmltopdf/blob/master/README.md and https://github.com/netmarkjp/pptrhtmltopdf/blob/master/LICENSE to `docs.pdf` with TOC

```bash
pptrhtmltopdf --generate-toc --output=docs.pdf \
    https://github.com/netmarkjp/pptrhtmltopdf/blob/master/README.md \
    https://github.com/netmarkjp/pptrhtmltopdf/blob/master/LICENSE
```

# Run on Docker

```bash
docker run --rm -it -v $(pwd):/mnt -w /mnt netmarkjp/pptrhtmltopdf \
    pptrhtmltopdf --no-sandbox \
        --generate-toc \
        --output=/mnt/output.pdf \
        https://github.com/netmarkjp/pptrhtmltopdf/blob/master/README.md \
        https://github.com/netmarkjp/pptrhtmltopdf/blob/master/LICENSE
```

# Development

```
# build
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

- CI/CD

Moderate

- Footer formatting
- Header
- TOC customise
- PDF page size customise
