import puppeteer, { PDFOptions } from 'puppeteer';
import os, { } from "os";
import path, { } from "path";
import fs, { } from "fs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

let DEBUG: boolean = false;

type TmpPDF = {
    path?: string
    pages?: number
    title?: string
    headers?: [string, string][]
}

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

async function renderPages(urls: string[], tmpPath: string, pdfOptions: PDFOptions, returnTmpPDFs: TmpPDF[]) {
    let fileIndex: number = 0;
    const browser = await puppeteer.launch();
    for (const url of urls) {
        const outFileNumber = ("0000" + fileIndex).slice(-3);
        const tmpPDF: TmpPDF = {};

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const outPath = path.join(tmpPath, outFileNumber + ".pdf");
        if (DEBUG) {
            console.log("DEBUG: tmpPDF.path=" + outPath);
        }

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

        // TODO get title from page, put them to tmpPDF
        let tmpHeaders: [string, string][] = [];
        const headers = await page.$$("h1, h2");
        for (let header of headers) {
            const tmpHeader: [string, string] = ["", ""];
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
            const { width, height } = page.getSize();
            if (DEBUG) {
                console.log("DEBUG: width=" + width + ", heigth=" + height);
            }
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

function main(argv: string[]): void {
    const o = argParse(argv);
    // TODO use opts
    const opts: Map<string, string> = o[0];
    if (opts.has("--debug")) {
        DEBUG = true;
        console.log("DEBUG: enabled");
    }

    let urls: string[] = [];
    for (let url of o[1]) {
        if (!(url.startsWith("http://") || url.startsWith("https://"))) {
            if (!path.isAbsolute(url)) {
                url = path.resolve(url);
            }
            url = "file://" + url;
        }
        urls.push(url);

    }
    if (DEBUG) {
        console.log("DEBUG: urls=" + urls);
    }

    let pdfOptions: PDFOptions = {};
    pdfOptions.format = "A4";
    pdfOptions.printBackground = true;

    let tmpDir: string = fs.mkdtempSync(path.join(os.tmpdir(), 'pptrhtmltopdf-'));
    let tmpPDFs: TmpPDF[] = [];
    renderPages(urls, tmpDir, pdfOptions, tmpPDFs).then(() => {
        countPageNumbers(tmpPDFs).then(() => {
            if (DEBUG) {
                for (let tmpPDF of tmpPDFs) {
                    console.log("DEBUG: tmpPDF=");
                    console.log(tmpPDF);
                }
            }
            printHeaderFooter(tmpPDFs).then(() => {
                if (DEBUG) {
                    console.log("DEBUG: ");
                }
            });
        });
    });
}

main(process.argv);
