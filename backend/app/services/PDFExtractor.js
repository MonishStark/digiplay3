const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const pdfToPng = require('pdf-to-png-converter').pdfToPng;
const dotenv = require('dotenv');
dotenv.config();

let logger;


class PDFExtractor {

    generateNumbersList(num) {
        let pageList = []
        for (let index = 1; index <= num; index++) {
            pageList.push(index)
        }
        return pageList
    }

    async getPageList(pdfPath) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            try {
                logger.info(`Fetching page numbers for scanned PDF document`)
                const dataBuffer = fs.readFileSync(pdfPath)
                pdf(dataBuffer)
                    .then((data) => {
                        const pageList = this.generateNumbersList(data.numpages)
                        resolve(pageList)
                    })
                    .catch((err) => {
                        logger.warn(`Failed to fetch page numbers`)
                        reject(err)
                    })
            } catch (error) {
                logger.warn(`Failed to fetch page numbers`)
                reject(error)
            }
        })
    }

    async getConverterConfig(buffer, pageList) {
        const pngPage = await pdfToPng(buffer, {
            disableFontFace: false,
            useSystemFonts: false,
            pagesToProcess: pageList,
            viewportScale: 2.0
        });
        return pngPage;
    }

    async checkIfImageDirectoryExist(directoryName) {
        if (!logger) {
            logger = await createLogger();
            }
        logger.info(`Creating temporary image folder for user Id ${directoryName}`)
        try {
            const folderPath = `${process.env.TMP_IMAGE_PATH}/` + directoryName
            if (!fs.existsSync(path.resolve(folderPath))) {
                await fsp.mkdir(folderPath)
                logger.info(`Temporary image folder created successfully`)
            }
            return
        } catch (error) {
            logger.warn(`Failed to create temporary image folder`)
            logger.error(error)
            return
        }
    }

    async checkIfTextDirectoryExist(directoryName) {
        try {
            if (!logger) {
            logger = await createLogger();
            }
            logger.info(`Creating temporary text folder for user Id ${directoryName}`)
            const folderPath = `${process.env.TMP_TXT_PATH}/` + directoryName
            if (!fs.existsSync(path.resolve(folderPath))) {
                await fsp.mkdir(folderPath)
                logger.info(`Temporary text folder created successfully`)
            }
            return
        } catch (error) {
            logger.warn(`Failed to create temporary text folder`)
            logger.error(error)
            return
        }
    }

    async convertPDFtoPNG(pdfPath, userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise(async (resolve, reject) => {
            logger.info(`Converting PDF to PNG`)
            const buffer = fs.readFileSync(pdfPath)
            const pageList = await this.getPageList(pdfPath)
            const imgFileNameList = []

            this.getConverterConfig(buffer, pageList)
                .then(async (res) => {
                    let index = 1;
                    for (const imgData of res) {
                        await this.checkIfImageDirectoryExist(userId)
                        await fsp.writeFile(`${process.env.TMP_IMAGE_PATH}/${userId}/tmp${index}.png`, imgData.content)
                        imgFileNameList.push(`tmp${index}.png`)
                        index++
                    }
                    logger.info(`PDF converted to PNG successfully`)
                    resolve(imgFileNameList)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    async extractTextFromPDF(pdfPath, userId) {
        if (!logger) {
            logger = await createLogger();
            }
        logger.info(`Extracting text from PDF with OCR`)
        let extractedText = []
        const imagePath = `${process.env.TMP_IMAGE_PATH}/${userId}`
        const imageList = await this.convertPDFtoPNG(pdfPath, userId)
        const worker = await createWorker('eng');

        for (const imageName of imageList) {
            const response = await worker.recognize(path.resolve(`${imagePath}/${imageName}`));
            extractedText.push(response.data.text)
        }
        await worker.terminate();
        logger.info(`Text extracted successfully from PDF`)
        logger.info(JSON.stringify(extractedText))
        return extractedText
    }

    async removeLineBreak(text) {
        return text.replace(/\n/g, '')
    }

    async convertPDFToText(pdfPath, userId, fileName) {
        try {
            const extractedTexts = await this.extractTextFromPDF(pdfPath, userId)
            for (const text of extractedTexts) {
                await this.checkIfTextDirectoryExist(userId)
                const cleanedData = await this.removeLineBreak(text)
                await fsp.appendFile(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`, cleanedData)
            }
            return path.resolve(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`)
        } catch (error) {
            console.log(error)
        }
    }

    clearTempFiles(directoryName) {
        return new Promise((resolve, reject) => {
            const imgFolderPath = `${process.env.TMP_IMAGE_PATH}/${directoryName}`;
            const textFolderPath = `${process.env.TMP_TXT_PATH}/${directoryName}`;
    
            const deleteFiles = async (folderPath) => {
                try {
                    const files = await fsp.readdir(folderPath);
                    for (const file of files) {
                        await fsp.unlink(path.join(folderPath, file));
                    }
                    resolve(); 
                } catch (err) {
                    if (err.code === 'ENOENT') {
                        resolve();
                    } else {
                        reject(err); 
                    }
                }
            };
    
            deleteFiles(imgFolderPath)
                .then(() => {
                    return deleteFiles(textFolderPath);
                })
                .then(resolve) 
                .catch(reject); 
        });
    }  
}

module.exports = PDFExtractor