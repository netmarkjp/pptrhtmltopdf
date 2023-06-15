import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import puppeteer, {type PuppeteerLaunchOptions, type PDFOptions} from 'puppeteer';
import {PDFDocument, rgb, StandardFonts} from 'pdf-lib';

const extract = require('pdf-text-extract');

type TemporaryPdf = {
	path?: string;
	pages?: number;
	title?: string;
	headers?: Array<[string, string, number]>;
};

type Config = {
	debug: boolean;
	output: string;
	cover?: string;
	backcover?: string;
	tmpPath: string;
	generateToc: boolean;
	noSandbox: boolean;
};

const config: Config = {
	debug: false,
	output: 'output.pdf',
	tmpPath: os.tmpdir(),
	generateToc: false,
	noSandbox: false,
};

function argParse(argv: string[]): [Map<string, string>, string[]] {
	const args: string[] = [];
	const options = new Map<string, string>();
	const argvStartIndex = 2;
	let argvIndex = 0;
	for (const arg of argv) {
		if (argvIndex < argvStartIndex) {
			argvIndex++;
			continue;
		}

		if (arg.startsWith('--')) {
			// Opts
			const key = arg.split('=')[0];
			const value = arg.split('=')[1];
			options.set(key, value);
		} else {
			// Args
			args.push(arg);
		}
	}

	return [options, args];
}

async function renderPages(urls: string[], pdfOptions: PDFOptions, returnTemporaryPDFs: TemporaryPdf[]) {
	let fileIndex = 0;
	const launchOptions: PuppeteerLaunchOptions = {};
	if (config.noSandbox) {
		if (launchOptions.args === undefined) {
			launchOptions.args = [];
		}

		launchOptions.headless = 'new';
		launchOptions.args.push('--no-sandbox', '-disable-setuid-sandbox');
	}

	const browser = await puppeteer.launch(launchOptions);
	for (const url of urls) {
		const outFileNumber = (`0000${fileIndex}`).slice(-3);
		const temporaryPdf: TemporaryPdf = {};

		const page = await browser.newPage();
		await page.goto(url, {waitUntil: 'networkidle2'});

		const outPath = path.join(config.tmpPath, outFileNumber + '.pdf');
		if (config.debug) {
			console.log('DEBUG: tmpPDF.path=' + outPath);
		}

		pdfOptions.margin = {
			top: 20,
			left: 20,
			right: 20,
			bottom: 20, // Bottom is truly required for footer.
		};
		pdfOptions.path = outPath;
		temporaryPdf.path = outPath;
		await page.pdf(pdfOptions);

		let titleText = '';
		const title = await page.$('title');
		if (!(title === null)) {
			const c = await title.getProperty('textContent');
			const v = await c.jsonValue();
			if (typeof v === 'string') {
				titleText = v;
			}
		}

		temporaryPdf.title = titleText;

		const temporaryHeaders: Array<[string, string, number]> = [];
		const headers = await page.$$('h1, h2');
		for (const header of headers) {
			const temporaryHeader: [string, string, number] = ['', '', 0];
			const t = await header.getProperty('tagName');
			const tagName = await t.jsonValue();
			temporaryHeader[0] = typeof tagName === 'string' && tagName.toLowerCase() === 'h1' ? 'h1' : 'h2';

			// HeaderText
			const c = await header.getProperty('textContent');
			const headerText = await c.jsonValue();
			temporaryHeader[1] = typeof headerText === 'string' ? headerText.replace('¶', '') : '';

			temporaryHeaders.push(temporaryHeader);
		}

		await extract(temporaryPdf.path, (error: any, pagesContents: any) => {
			if (error) {
				console.log(error);
			}

			for (let pageNumber = 1; pageNumber <= pagesContents.length; pageNumber++) {
				const perpageContents = pagesContents[pageNumber - 1];
				for (const line of perpageContents.split('\n')) {
					for (const temporaryHeader of temporaryHeaders) {
						if (temporaryHeader[2] !== 0) {
							continue;
						}

						if (line.trim() == temporaryHeader[1]) {
							temporaryHeader[2] = pageNumber;
						}
					}
				}
			}
		});

		temporaryPdf.headers = temporaryHeaders;

		returnTemporaryPDFs.push(temporaryPdf);
		fileIndex++;
	}

	await browser.close();
}

async function countPageNumbers(temporaryPDFs: TemporaryPdf[]) {
	for (const temporaryPdf of temporaryPDFs) {
		if (temporaryPdf.path === undefined) {
			continue;
		}

		const pdf = await PDFDocument.load(fs.readFileSync(temporaryPdf.path));
		temporaryPdf.pages = pdf.getPageCount();
	}
}

async function printHeaderFooter(temporaryPDFs: TemporaryPdf[]) {
	let totalPages = 0;
	for (const temporaryPdf of temporaryPDFs) {
		if (temporaryPdf.path === undefined) {
			continue;
		}

		if (temporaryPdf.pages) {
			totalPages += temporaryPdf.pages;
		}
	}

	let currentPage = 1;
	for (const temporaryPdf of temporaryPDFs) {
		if (temporaryPdf.path === undefined) {
			continue;
		}

		const pdf = await PDFDocument.load(fs.readFileSync(temporaryPdf.path));
		const font = await pdf.embedFont(StandardFonts.Courier);
		const pages = pdf.getPages();
		for (const page of pages) {
			// Const { width, height } = page.getSize();
			const {width} = page.getSize();
			page.drawText(String(`${String(currentPage)} / ${totalPages}`), {
				x: width - 50,
				y: 10,
				size: 11,
				font,
				color: rgb(0.3, 0.3, 0.3),
			});
			currentPage++;
		}

		const pdfBytes = await pdf.save();
		fs.writeFileSync(temporaryPdf.path, pdfBytes);
	}
}

async function renderPage(url: string, filename: string, pdfOptions: PDFOptions) {
	const launchOptions: PuppeteerLaunchOptions = {};
	if (config.noSandbox) {
		if (launchOptions.args === undefined) {
			launchOptions.args = [];
		}

		launchOptions.headless = 'new';
		launchOptions.args.push('--no-sandbox', '-disable-setuid-sandbox');
	}

	const browser = await puppeteer.launch(launchOptions);
	const page = await browser.newPage();
	await page.goto(url, {waitUntil: 'networkidle2'});

	const outPath = path.join(config.tmpPath, filename);
	pdfOptions.path = outPath;
	await page.pdf(pdfOptions);

	await browser.close();
}

async function renderCovers(pdfOptions: PDFOptions) {
	if (config.cover !== undefined) {
		await renderPage(config.cover, 'cover.pdf', pdfOptions);
	}

	if (config.backcover !== undefined) {
		await renderPage(config.backcover, 'backcover.pdf', pdfOptions);
	}
}

async function renderToc(pdfOptions: PDFOptions, temporaryPDFs: TemporaryPdf[]) {
	const tocHtmlFile = path.join(config.tmpPath, 'toc.html');
	const tocElements: string[] = [];

	tocElements.push('<!DOCTYPE html>', '<html lang=\'en\' class=\'no-js\'>', '<head>', '<meta charset=\'utf-8\'>', '<meta name=\'lang:search.language\' content=\'en\'>');
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
    `;
	tocElements.push(style, '</head>', '<body dir=\'ltr\'>', '<h1>Table of Contents</h1>');

	let pageOffset = 0;
	for (const temporaryPdf of temporaryPDFs) {
		let previousHeaderPage = 1;
		if (temporaryPdf.headers === undefined) {
			continue;
		}

		for (const header of temporaryPdf.headers) {
			// If header[2] === 0 (in the case position cannot be detected), set position to previous header position(or the first page of same file)
			let headerPage: number = header[2];
			if (headerPage === 0) {
				headerPage = previousHeaderPage;
			} else {
				previousHeaderPage = headerPage;
			}

			tocElements.push(`<div class='toc toc-${header[0]}'><span class='description'>${header[1]}</span><span class='pageNumber'>${(pageOffset + headerPage)}</span></div>`);
		}

		if (temporaryPdf.pages !== undefined) {
			pageOffset += temporaryPdf.pages;
		}
	}

	tocElements.push('</body>', '</html>');

	const tocHtmlBody = tocElements.join('\n');
	fs.writeFileSync(tocHtmlFile, tocHtmlBody, {encoding: 'utf8'});

	// Render and save PDF
	const launchOptions: PuppeteerLaunchOptions = {};
	if (config.noSandbox) {
		if (launchOptions.args === undefined) {
			launchOptions.args = [];
		}

		launchOptions.headless = 'new';
		launchOptions.args.push('--no-sandbox', '-disable-setuid-sandbox');
	}

	const browser = await puppeteer.launch(launchOptions);
	const page = await browser.newPage();
	await page.goto(reformUrl(tocHtmlFile), {waitUntil: 'networkidle2'});

	const outPath = path.join(config.tmpPath, 'toc.pdf');
	pdfOptions.path = outPath;
	await page.pdf(pdfOptions);

	await browser.close();
}

async function concatPdf(temporaryPDFs: TemporaryPdf[]) {
	let basePdf: PDFDocument;
	const basePdfPath = temporaryPDFs[0].path;
	if (basePdfPath === undefined) {
		basePdf = await PDFDocument.create();
		console.log('INFO: Finally create new PDFDocument!');
	} else {
		// Ususal case
		basePdf = await PDFDocument.load(fs.readFileSync(basePdfPath));
	}

	for (const temporaryPdf of temporaryPDFs) {
		if (temporaryPdf.path === undefined) {
			continue;
		}

		if (temporaryPdf.path === basePdfPath) {
			continue;
		}

		const pdf = await PDFDocument.load(fs.readFileSync(temporaryPdf.path));
		const pageIndexes: number[] = [];
		for (let i = 0; i < pdf.getPageCount(); i++) {
			pageIndexes.push(i);
		}

		const pages = await basePdf.copyPages(pdf, pageIndexes);

		for (const page of pages) {
			basePdf.addPage(page);
		}
	}

	if (config.generateToc) {
		const pdf = await PDFDocument.load(fs.readFileSync(path.join(config.tmpPath, 'toc.pdf')));
		const pageIndexes: number[] = [];
		for (let i = 0; i < pdf.getPageCount(); i++) {
			pageIndexes.push(i);
		}

		const pages = await basePdf.copyPages(pdf, pageIndexes);
		for (let i = pages.length - 1; i >= 0; i--) {
			const page = pages[i];
			basePdf.insertPage(0, page);
		}
	}

	if (config.cover !== undefined) {
		const pdf = await PDFDocument.load(fs.readFileSync(path.join(config.tmpPath, 'cover.pdf')));
		const pageIndexes: number[] = [];
		for (let i = 0; i < pdf.getPageCount(); i++) {
			pageIndexes.push(i);
		}

		const pages = await basePdf.copyPages(pdf, pageIndexes);
		for (let i = pages.length - 1; i >= 0; i--) {
			const page = pages[i];
			basePdf.insertPage(0, page);
		}
	}

	if (config.backcover !== undefined) {
		const pdf = await PDFDocument.load(fs.readFileSync(path.join(config.tmpPath, 'backcover.pdf')));
		const pageIndexes: number[] = [];
		for (let i = 0; i < pdf.getPageCount(); i++) {
			pageIndexes.push(i);
		}

		const pages = await basePdf.copyPages(pdf, pageIndexes);
		for (const page of pages) {
			basePdf.addPage(page);
		}
	}

	const pdfBytes = await basePdf.save();
	fs.writeFileSync(config.output, pdfBytes);
}

function reformUrl(url: string): string {
	if (!(url.startsWith('http://') || url.startsWith('https://'))) {
		if (!path.isAbsolute(url)) {
			url = path.resolve(url);
		}

		url = 'file://' + url;
	}

	return url;
}

function getVersion(): string {
	const packageJsonPath = path.resolve(path.join(__dirname, '..', 'package.json'));
	const jsonObject = JSON.parse(fs.readFileSync(packageJsonPath).toString());
	return jsonObject.version;
}

async function main(argv: string[]) {
	const o = argParse(argv);

	const options: Map<string, string> = o[0];
	if (options.has('--version')) {
		console.log('pptrhtmltopdf version: "' + getVersion() + '"');
		return;
	}

	if (options.has('--help') || o[1].length === 0) {
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

	if (options.has('--debug')) {
		config.debug = true;
		console.log('DEBUG: enabled');
	}

	if (options.has('--output')) {
		const value = options.get('--output');
		if (value !== undefined) {
			config.output = value;
		}
	}

	if (options.has('--cover')) {
		const value = options.get('--cover');
		if (value !== undefined) {
			config.cover = reformUrl(value);
		}
	}

	if (options.has('--backcover')) {
		const value = options.get('--backcover');
		if (value !== undefined) {
			config.backcover = reformUrl(value);
		}
	}

	if (options.has('--generate-toc')) {
		config.generateToc = true;
	}

	if (options.has('--no-sandbox')) {
		config.noSandbox = true;
	}

	const urls: string[] = [];
	for (const url of o[1]) {
		urls.push(reformUrl(url));
	}

	if (config.debug) {
		console.log('DEBUG: urls=', urls);
	}

	const pdfOptions: PDFOptions = {};
	pdfOptions.format = 'A4';
	pdfOptions.printBackground = true;

	config.tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'pptrhtmltopdf-'));
	if (config.debug) {
		console.log('DEBUG: CONFIG=');
		console.log(config);
	}

	const temporaryPdfs: TemporaryPdf[] = [];

	await renderPages(urls, pdfOptions, temporaryPdfs);
	await countPageNumbers(temporaryPdfs);
	if (config.debug) {
		for (const temporaryPdf of temporaryPdfs) {
			console.log('DEBUG: tmpPDF=');
			console.log(temporaryPdf);
		}
	}

	await printHeaderFooter(temporaryPdfs);
	await renderCovers(pdfOptions);
	await renderToc(pdfOptions, temporaryPdfs);
	await concatPdf(temporaryPdfs);
	console.log('Wrote PDF to: ' + config.output);
}

await main(process.argv);
