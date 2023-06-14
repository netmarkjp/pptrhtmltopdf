import puppeteer, { PuppeteerLaunchOptions, PDFOptions } from 'puppeteer';
import os, { } from "os";
import path, { } from "path";
import fs, { } from "fs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
// import extract, {} from "pdf-text-extract";
const extract = require("pdf-text-extract");

type TmpPDF = {
    path?: string
    pages?: number
    title?: string
    headers?: [string, string, number][]
}

type Config = {
    debug: boolean
    output: string
    cover?: string
    backcover?: string
    tmpPath: string
    generateTOC: boolean
    noSandbox: boolean
}

const CONFIG: Config = {
    debug: false,
    output: "output.pdf",
    tmpPath: os.tmpdir(),
    generateTOC: false,
    noSandbox: false,
};

function argParse(argv: string[]): [Map<string, string>, string[]] {
    let args: string[] = [];
    let opts: Map<string, string> = new Map();
    let argvStartIndex: number = 2;
    let argvIndex: number = 0;
    for (const arg of argv) {
        if (argvIndex < argvStartIndex) {
            argvIndex++;
            continue;
        }
        if (arg.startsWith("--")) {
            // opts
            const key = arg.split("=")[0];
            const value = arg.split("=")[1];
            opts.set(key, value);
        } else {
            // args
            args.push(arg);
        }
    }

    return [opts, args];
}

async function renderPages(urls: string[], pdfOptions: PDFOptions, returnTmpPDFs: TmpPDF[]) {
    let fileIndex: number = 0;
    const launchOptions: PuppeteerLaunchOptions = {};
    if (CONFIG.noSandbox) {
        if (launchOptions.args === undefined) {
            launchOptions.args = [];
        }
        launchOptions.headless = "new";
        launchOptions.args.push('--no-sandbox');
        launchOptions.args.push('-disable-setuid-sandbox');
    }
    const browser = await puppeteer.launch(launchOptions);
    for (const url of urls) {
        const outFileNumber = ("0000" + fileIndex).slice(-3);
        const tmpPDF: TmpPDF = {};

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const outPath = path.join(CONFIG.tmpPath, outFileNumber + ".pdf");
        if (CONFIG.debug) {
            console.log("DEBUG: tmpPDF.path=" + outPath);
        }

        pdfOptions.margin = {
            top: 20,
            left: 20,
            right: 20,
            bottom: 20, // bottom is truly required for footer.
        };
        pdfOptions.path = outPath;
        tmpPDF.path = outPath;
        await page.pdf(pdfOptions);

        let titleText: string = "";
        const title = await page.$("title");
        if (!(title === null)) {
            const c = await title.getProperty("textContent");
            const v = await c.jsonValue();
            if (typeof v === "string") {
                titleText = v;
            }
        }
        tmpPDF.title = titleText;

        let tmpHeaders: [string, string, number][] = [];
        const headers = await page.$$("h1, h2");
        for (let header of headers) {
            const tmpHeader: [string, string, number] = ["", "", 0];
            const t = await header.getProperty("tagName");
            const tagName = await t.jsonValue();
            if (typeof tagName === "string" && tagName.toLowerCase() === "h1") {
                tmpHeader[0] = "h1";
            } else {
                tmpHeader[0] = "h2";
            }

            // headerText
            const c = await header.getProperty("textContent");
            const headerText: string | unknown = await c.jsonValue();
            if (typeof headerText === "string") {
                tmpHeader[1] = headerText.replace("¶", "");
            } else {
                tmpHeader[1] = "";
            }
            tmpHeaders.push(tmpHeader);
        }

        await extract(tmpPDF.path, (err: any, pagesContents: any) => {
            if (err) {
                console.log(err);
            }

            for (let pageNumber = 1; pageNumber <= pagesContents.length; pageNumber++) {
                const perpageContents = pagesContents[pageNumber - 1];
                for (const line of perpageContents.split("\n")) {
                    for (let i = 0; i < tmpHeaders.length; i++) {
                        if (tmpHeaders[i][2] !== 0) {
                            continue
                        }
                        if (line.trim() == tmpHeaders[i][1]) {
                            tmpHeaders[i][2] = pageNumber;
                        }
                    }
                }
            }
        });

        tmpPDF.headers = tmpHeaders;

        returnTmpPDFs.push(tmpPDF);
        fileIndex++;
    }
    await browser.close();
}

async function countPageNumbers(tmpPDFs: TmpPDF[]) {
    for (let tmpPDF of tmpPDFs) {
        if (tmpPDF.path === undefined) {
            continue;
        }
        let pdf = await PDFDocument.load(fs.readFileSync(tmpPDF.path));
        tmpPDF.pages = pdf.getPageCount();
    }
}

async function printHeaderFooter(tmpPDFs: TmpPDF[]) {
    let totalPages: number = 0;
    for (let tmpPDF of tmpPDFs) {
        if (tmpPDF.path === undefined) {
            continue;
        }
        if (tmpPDF.pages) {
            totalPages += tmpPDF.pages;
        }
    }

    let currentPage: number = 1;
    for (let tmpPDF of tmpPDFs) {
        if (tmpPDF.path === undefined) {
            continue;
        }
        const pdf = await PDFDocument.load(fs.readFileSync(tmpPDF.path));
        const font = await pdf.embedFont(StandardFonts.Courier);
        const pages = pdf.getPages();
        for (const page of pages) {
            // const { width, height } = page.getSize();
            const { width, } = page.getSize();
            page.drawText("" + currentPage + " / " + totalPages + "", {
                x: width - 50,
                y: 10,
                size: 11,
                font: font,
                color: rgb(0.3, 0.3, 0.3),
            });
            currentPage++;
        }
        const pdfBytes = await pdf.save();
        fs.writeFileSync(tmpPDF.path, pdfBytes);
    }
}

async function renderPage(url: string, filename: string, pdfOptions: PDFOptions) {
    const launchOptions: PuppeteerLaunchOptions = {};
    if (CONFIG.noSandbox) {
        if (launchOptions.args === undefined) {
            launchOptions.args = [];
        }
        launchOptions.headless = "new";
        launchOptions.args.push('--no-sandbox');
        launchOptions.args.push('-disable-setuid-sandbox');
    }
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const outPath = path.join(CONFIG.tmpPath, filename);
    pdfOptions.path = outPath;
    await page.pdf(pdfOptions);

    await browser.close();
}

async function renderCovers(pdfOptions: PDFOptions) {
    if (CONFIG.cover !== undefined) {
        await renderPage(CONFIG.cover, "cover.pdf", pdfOptions);
    }
    if (CONFIG.backcover !== undefined) {
        await renderPage(CONFIG.backcover, "backcover.pdf", pdfOptions);
    }
}

async function renderTOC(pdfOptions: PDFOptions, tmpPDFs: TmpPDF[]) {
    const tocHTMLFile = path.join(CONFIG.tmpPath, "toc.html");
    // TODO generate TOC HTML

    const tocElements: string[] = [];

    tocElements.push("<!DOCTYPE html>");
    tocElements.push("<html lang='en' class='no-js'>");
    tocElements.push("<head>");
    tocElements.push("<meta charset='utf-8'>");
    tocElements.push("<meta name='lang:search.language' content='en'>");
    const style = `
        <style>
        h1 {
            text-align:center;
        }
        .toc {
            margin: 0.5em;
            border-bottom: dotted 2px;
        }
        .toc-h1 {
            font-size: larger;
            margin-left: 2em;
        }
        .toc-h2 {
            margin-left: 3em;
        }
        .toc .pageNumber {
            float:right
        }
        </style>
    `
    tocElements.push(style);
    tocElements.push("</head>");
    tocElements.push("<body dir='ltr'>");
    tocElements.push("<h1>Table of Contents</h1>");

    let pageOffset: number = 0;
    for (const tmpPDF of tmpPDFs) {
        let prevHeaderPage: number = 1;
        if (tmpPDF.headers === undefined) {
            continue
        }
        for (const header of tmpPDF.headers) {
            // if header[2] === 0 (in the case position cannot be detected), set position to previous header position(or the first page of same file)
            let headerPage: number = header[2];
            if (headerPage === 0) {
                headerPage = prevHeaderPage;
            } else {
                prevHeaderPage = headerPage;
            }
            tocElements.push("<div class='toc toc-" + header[0] + "'><span class='description'>" + header[1] + "</span><span class='pageNumber'>" + (pageOffset + headerPage) + "</span></div>");
        }
        if (tmpPDF.pages !== undefined) {
            pageOffset += tmpPDF.pages;
        }
    }
    tocElements.push("</body>");
    tocElements.push("</html>");

    const tocHTMLBody = tocElements.join("\n");
    fs.writeFileSync(tocHTMLFile, tocHTMLBody, { encoding: "utf-8" });

    // render and save PDF
    const launchOptions: PuppeteerLaunchOptions = {};
    if (CONFIG.noSandbox) {
        if (launchOptions.args === undefined) {
            launchOptions.args = [];
        }
        launchOptions.headless = "new";
        launchOptions.args.push('--no-sandbox');
        launchOptions.args.push('-disable-setuid-sandbox');
    }
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.goto(reformURL(tocHTMLFile), { waitUntil: 'networkidle2' });

    const outPath = path.join(CONFIG.tmpPath, "toc.pdf");
    pdfOptions.path = outPath;
    await page.pdf(pdfOptions);

    await browser.close();
}

async function concatPDF(tmpPDFs: TmpPDF[]) {
    let basePDF: PDFDocument;
    let basePDFpath = tmpPDFs[0].path;
    if (basePDFpath === undefined) {
        basePDF = await PDFDocument.create();
        console.log("INFO: Finally create new PDFDocument!");
    } else {
        // ususal case
        basePDF = await PDFDocument.load(fs.readFileSync(basePDFpath));
    }

    for (const tmpPDF of tmpPDFs) {
        if (tmpPDF.path === undefined) {
            continue;
        }
        if (tmpPDF.path === basePDFpath) {
            continue;
        }
        const pdf = await PDFDocument.load(fs.readFileSync(tmpPDF.path));
        let pageIndexes: number[] = [];
        for (let i = 0; i < pdf.getPageCount(); i++) {
            pageIndexes.push(i);
        }
        const pages = await basePDF.copyPages(pdf, pageIndexes);

        for (const page of pages) {
            basePDF.addPage(page);
        }
    }

    if (CONFIG.generateTOC) {
        const pdf = await PDFDocument.load(fs.readFileSync(path.join(CONFIG.tmpPath, "toc.pdf")));
        let pageIndexes: number[] = [];
        for (let i = 0; i < pdf.getPageCount(); i++) {
            pageIndexes.push(i);
        }

        const pages = await basePDF.copyPages(pdf, pageIndexes);
        for (let i = pages.length - 1; i >= 0; i--) {
            const page = pages[i];
            basePDF.insertPage(0, page);
        }
    }

    if (CONFIG.cover !== undefined) {
        const pdf = await PDFDocument.load(fs.readFileSync(path.join(CONFIG.tmpPath, "cover.pdf")));
        let pageIndexes: number[] = [];
        for (let i = 0; i < pdf.getPageCount(); i++) {
            pageIndexes.push(i);
        }

        const pages = await basePDF.copyPages(pdf, pageIndexes);
        for (let i = pages.length - 1; i >= 0; i--) {
            const page = pages[i];
            basePDF.insertPage(0, page);
        }
    }

    if (CONFIG.backcover !== undefined) {
        const pdf = await PDFDocument.load(fs.readFileSync(path.join(CONFIG.tmpPath, "backcover.pdf")));
        let pageIndexes: number[] = [];
        for (let i = 0; i < pdf.getPageCount(); i++) {
            pageIndexes.push(i);
        }
        const pages = await basePDF.copyPages(pdf, pageIndexes);
        for (const page of pages) {
            basePDF.addPage(page);
        }
    }

    const pdfBytes = await basePDF.save();
    fs.writeFileSync(CONFIG.output, pdfBytes);
}

function reformURL(url: string): string {
    if (!(url.startsWith("http://") || url.startsWith("https://"))) {
        if (!path.isAbsolute(url)) {
            url = path.resolve(url);
        }
        url = "file://" + url;
    }
    return url;
}

function getVersion(): string {
    const packageJSONPath = path.resolve(path.join(__dirname, "..", "package.json"));
    const jsonObject = JSON.parse(fs.readFileSync(packageJSONPath).toString());
    return jsonObject["version"];
}

async function main(argv: string[]) {
    const o = argParse(argv);

    const opts: Map<string, string> = o[0];
    if (opts.has("--version")) {
        console.log("pptrhtmltopdf version: \"" + getVersion() + "\"");
        return;
    }
    if (opts.has("--help") || o[1].length === 0) {
        const helpText = `
NAME
    pptrhtmltopdf [OPTIONS] [FILE or URL]...

    Convert HTML to PDF using Chrome (Puppeteer)

DESCRIPTION
    --output=[FILE]    Save PDF to [FILE]
    --cover=[FILE]     Use [FILE] to cover
    --backcover=[FILE] Use [FILE] to backcover
    --generate-toc     Generate TOC(Table of Contents)
    --debug            Run in DEBUG mode
    --version          Show version
    --help             Show this help
`;
        console.log(helpText);
        return;
    }
    if (opts.has("--debug")) {
        CONFIG.debug = true;
        console.log("DEBUG: enabled");
    }
    if (opts.has("--output")) {
        const val = opts.get("--output");
        if (val !== undefined) {
            CONFIG.output = val;
        }
    }
    if (opts.has("--cover")) {
        const val = opts.get("--cover");
        if (val !== undefined) {
            CONFIG.cover = reformURL(val);
        }
    }
    if (opts.has("--backcover")) {
        const val = opts.get("--backcover");
        if (val !== undefined) {
            CONFIG.backcover = reformURL(val);
        }
    }
    if (opts.has("--generate-toc")) {
        CONFIG.generateTOC = true;
    }
    if (opts.has("--no-sandbox")) {
        CONFIG.noSandbox = true;
    }

    const urls: string[] = [];
    for (const url of o[1]) {
        urls.push(reformURL(url));
    }
    if (CONFIG.debug) {
        console.log("DEBUG: urls=" + urls);
    }

    let pdfOptions: PDFOptions = {};
    pdfOptions.format = "A4";
    pdfOptions.printBackground = true;

    CONFIG.tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'pptrhtmltopdf-'));
    if (CONFIG.debug) {
        console.log("DEBUG: CONFIG=");
        console.log(CONFIG);
    }

    let tmpPDFs: TmpPDF[] = [];

    await renderPages(urls, pdfOptions, tmpPDFs);
    await countPageNumbers(tmpPDFs);
    if (CONFIG.debug) {
        for (let tmpPDF of tmpPDFs) {
            console.log("DEBUG: tmpPDF=");
            console.log(tmpPDF);
        }
    }
    await printHeaderFooter(tmpPDFs);
    await renderCovers(pdfOptions);
    await renderTOC(pdfOptions, tmpPDFs);
    await concatPDF(tmpPDFs);
    console.log("Wrote PDF to: " + CONFIG.output);
}

main(process.argv);