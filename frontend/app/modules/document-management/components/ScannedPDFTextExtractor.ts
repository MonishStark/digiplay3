import * as PDFJS from 'pdfjs-dist'
import { createWorker } from 'tesseract.js';

export class TextExtractor {
    pdf: any = null

    constructor(pdfFile: any) {
        this.loadPDF(pdfFile)
    }

    private loadPDF = (pdfFile: any) => {
        console.log(pdfFile)
        PDFJS.getDocument(pdfFile).promise.then(pdf => {
            console.log(pdf)
            this.pdf = pdf;
        })
    }

    private getPngImageForPDFPage = () => {
        return new Promise(async (resolve, reject) => {
            try {
                const images = [];
                for (let pageNumber = 1; pageNumber <= this.pdf.numPages; pageNumber++) {
                    const page = await this.pdf.getPage(pageNumber);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement("canvas");
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    await page.render({
                        canvasContext: canvas.getContext("2d"),
                        viewport: viewport,
                    }).promise;
                    images.push(canvas.toDataURL("image/png"));
                }
                resolve(images)
            } catch (error) {
                reject(error)
            }
        })
    }

    public convertPDFToText = () => {
        return new Promise<any>((resolve) => {
            this.getPngImageForPDFPage()
                .then(async (images: any) => {
                    let extractedText = ""
                    const worker = await createWorker('eng');
                    for (const image of images) {
                        const res = await worker.recognize(image);
                        extractedText += res.data.text
                    }
                    await worker.terminate();
                    resolve(extractedText)
                })
                .catch((err) => {
                    console.log(err)
                })
        })
    }
}