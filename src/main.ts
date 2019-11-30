import puppeteer, { PDFOptions } from 'puppeteer';
import os, { } from "os";
import path, { } from "path";
import fs, { } from "fs";
import { PDFDocument } from "pdf-lib";

type TmpPDF = {
    path?: string
    pages?: number
    title?: string
}

function argParse(argv: string[]): [Map<string, string>, string[]] {
    let args: string[] = [];
    let opts: Map<string, string> = new Map();
    let argvStartIndex: number = 2;
    let argvIndex: number = 0;
    for (let arg of argv) {
        if (argvIndex < argvStartIndex) {
            argvIndex++;
            continue;
        }
        if (arg.startsWith("--")) {
            // opts
            opts.set(arg.split("=")[0], arg.split("=")[1]);
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
    for (let url of urls) {
        let outFileNumber = ("0000" + fileIndex).slice(-3);
        let tmpPDF: TmpPDF = {};

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        let outPath = path.join(tmpPath, outFileNumber + ".pdf");
        console.log(outPath);

        pdfOptions.path = outPath;
        tmpPDF.path = outPath;
        await page.pdf(pdfOptions);

        // TODO get title from page, put them to tmpPDF
        // TODO get h1, h2 elements from page to tmpPDF

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

function main(argv: string[]): void {
    let o = argParse(argv);
    // TODO use opts
    //let opts = o[0];
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
    console.log("=> urls: " + urls);

    let pdfOptions: PDFOptions = {};
    pdfOptions.format = "A4";
    pdfOptions.printBackground = true;

    let tmpDir: string = fs.mkdtempSync(path.join(os.tmpdir(), 'pptrhtmltopdf-'));
    let tmpPDFs: TmpPDF[] = [];
    renderPages(urls, tmpDir, pdfOptions, tmpPDFs).then(() => {
        countPageNumbers(tmpPDFs).then(() => {
            console.log("---");
            for (let tmpPDF of tmpPDFs) {
                console.log(tmpPDF);
            }
            console.log("---");
        });
    });


}

main(process.argv);
