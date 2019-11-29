import puppeteer, { PDFOptions } from 'puppeteer';
import os, { } from "os";
import path, { } from "path";
import fs, { } from "fs";

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

async function renderPages(filepaths: string[], tmpPath: string, pdfOptions: PDFOptions) {
    let fileIndex: number = 0;
    const browser = await puppeteer.launch();
    for (let filepath of filepaths) {
        let outFileNumber = ("0000" + fileIndex).slice(-3);

        const page = await browser.newPage();
        let url = "file://" + filepath;
        await page.goto(url, { waitUntil: 'networkidle2' });

        let outPath = path.join(tmpPath, outFileNumber + ".pdf");
        console.log(outPath);

        pdfOptions.path = outPath;
        await page.pdf(pdfOptions);

        fileIndex++;
    }
    await browser.close();
}

function main(argv: string[]): void {
    let o = argParse(argv);
    // TODO use opts
    //let opts = o[0];
    let files: string[] = [];
    for (let file of o[1]) {
        if (!path.isAbsolute(file)) {
            file = path.resolve(file);
        }
        files.push(file);
    }

    let pdfOptions: PDFOptions = {};
    pdfOptions.format = "A4";
    pdfOptions.printBackground = true;

    let tmpDir: string = fs.mkdtempSync(path.join(os.tmpdir(), 'pptrhtmltopdf-'));
    renderPages(files, tmpDir, pdfOptions);
}

main(process.argv);
