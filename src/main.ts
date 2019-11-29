import puppeteer, { PDFOptions } from 'puppeteer';

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
    if (tmpPath === "") {
        tmpPath = "/tmp";
    }

    let fileIndex: number = 0;
    const browser = await puppeteer.launch();
    for (let filepath of filepaths) {
        console.log("filepath: "+filepath);
        let outFileNumber = ("0000" + fileIndex).slice(-3);

        const page = await browser.newPage();
        // TODO Convert relative path to real path
        let url = "file://" + filepath;
        console.log(url);
        await page.goto(url, { waitUntil: 'networkidle2' });

        // TODO join path separator with collect way ( if exists )
        let outPath = tmpPath + "/" + outFileNumber + ".pdf";
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
    let opts = o[0];
    let args = o[1];

    let pdfOptions: PDFOptions = {};
    pdfOptions.format = "A4";
    pdfOptions.printBackground = true;

    renderPages(args, "tmp", pdfOptions);
}

main(process.argv);
