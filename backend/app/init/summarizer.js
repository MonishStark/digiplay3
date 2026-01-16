const winston = require('winston');
const { combine, timestamp, json } = winston.format;
const { getAdminSetting } = require('../init/redisUtils')
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
const PDFExtractor = require("../services/PDFExtractor");
const Documents = require("../services/Documents");
const { BigQuery } = require('@google-cloud/bigquery');
const { createLogger } = require('../init/logger');
dotenv.config();

let logger;

const knex = require('knex')({
    client: 'mysql',
    connection: {
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT,
        user: process.env.DATABASE_USER_NAME,
        password: process.env.DATABASE_PASSWORD ? process.env.DATABASE_PASSWORD : '',
        database: process.env.DATABASE_NAME,
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci'
    }
});

const buildSummarizerPrompt = async (fileContent, fileExtension) => {
    let prompt = "";
    if(fileExtension == ".pdf") {
        prompt = await getAdminSetting("PDF_PROMPT")
        prompt = `
        ${prompt}
        
        File Content:
        ${fileContent}

        Instruction: Ensure that the response does not end abruptly.
        `
    }
    else if (fileExtension == ".doc" || fileExtension == ".docx" || fileExtension == ".txt" || fileExtension == ".html") {
        prompt = await getAdminSetting("DOC_PROMPT")
        prompt = `
        ${prompt}
        
        File Content:
        ${fileContent}

        Instruction: Ensure that the response does not end abruptly.
        `
    }
    else if (fileExtension == ".pptx" ) {
        prompt = await getAdminSetting("PPT_PROMPT")
        prompt = `
        ${prompt}
        
        File Content:
        ${fileContent}

        Instruction: Ensure that the response does not end abruptly.
        `
    }
    else if (fileExtension == ".xlsx" || fileExtension == ".xls" || fileExtension == ".csv") {
        prompt = await getAdminSetting("XLSX_PROMPT")
        prompt = `
        ${prompt}
        
        File Content:
        ${fileContent}

        Instruction: Ensure that the response does not end abruptly. Do not add any Inconsistencies or Recommendations.
        `
    }
    return prompt
}

const buildOverviewPrompt = (overview) => {
    let prompt;
    if (overview.length === 0) {
        prompt = `
        Task: Unable to Provide Overview
        Instructions:
           - There is no topic description available to generate an overview.
           - Please provide a valid topic description to proceed.
        `;
    } else {
        prompt = `
        Task: Provide an overview of the given topic.
        Instructions:
           - Below is a brief description of a topic. Your task is to provide an overview based on this description.
           - Read the description carefully and grasp the main aspects of the topic.
           - Summarize the key points and main ideas comprehensively.
           - Aim for clarity and conciseness in your overview.
           - Ensure that your overview captures the essence of the topic.
        Topic Description:
        ${overview}
        `;
    }
    return prompt
}

const readHTMLFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                const textContent = extractTextFromHTML(data);
                resolve(textContent);
            }
        });
    });
};

const extractTextFromHTML = (html) => {
    const regex = /<[^>]*>/g;
    const textContent = html.replace(regex, '');
    return textContent;
};

const concatenatePageContents = (docs, originalName) => {
    let _pageContent = "";
    docs?.forEach(item => _pageContent += item?.pageContent);
    return _pageContent;
}

const removeFileExtension = (filePath) => {
    const lastFileIndex = filePath.lastIndexOf('\\');
    const newFilePath = filePath.substring(0, lastFileIndex);
    return newFilePath;
}

const readFile = async (filePath, fileId, originalName, userId) => {
    if (!logger) {
      logger = await createLogger();
    }
    const extractor = new PDFExtractor()
    const documents = new Documents(knex)
    const fileExtension = path.extname(filePath).toLowerCase();
    const fileName = [fileId]
    let docs = []

    switch (fileExtension) {
        case '.pdf':
            logger.info(`Extrating Text from pdf documents for summary.`)
            docs = await documents.createDocumentFromPDF(filePath, fileId, originalName)
            if (docs.length > 0) {
                return concatenatePageContents(docs, originalName)
            } else {
                const textURL = await extractor.convertPDFToText(filePath, userId, fileId)
                docs = await documents.createDocumentFromText(textURL, fileId, originalName)
                return concatenatePageContents(docs, originalName)
            }
        case '.doc':
            logger.info(`Extrating Text from doc documents for summary.`)
            const docFilePath = await documents.extractTextFromDocAndCreateTextFile(filePath, userId, fileId)
            docs = await documents.createDocumentFromText(docFilePath, fileId, originalName)
            return concatenatePageContents(docs, originalName)
        case '.docx':
            logger.info(`Extrating Text from docx documents for summary.`)
            docs = await documents.createDocumentFromDocx(filePath, fileId, originalName)
            return concatenatePageContents(docs, originalName)
        case '.xls':
            logger.info(`Extrating Text from xls documents for summary.`)
            const newXLSPath = removeFileExtension(filePath);
            let isXlsFileCreated = await documents.createTempCSVFileForXLSXFile(newXLSPath, fileName, 'xls')
            if (isXlsFileCreated == 1) {
                docs = await documents.createDocumentFromCSV(filePath, fileId, originalName)
                return concatenatePageContents(docs, originalName)
            }
        case '.xlsx':
            logger.info(`Extrating Text from xlsx documents for summary.`)
            const newXLSXPath = removeFileExtension(filePath);
            let isXlsxFileCreated = await documents.createTempCSVFileForXLSXFile(newXLSXPath, fileName, 'xlsx')
            if (isXlsxFileCreated == 1) {
                docs = await documents.createDocumentFromCSV(path.resolve(`${process.env.TMP_CSV_PATH}/${fileName}.csv`), fileId, originalName)
                return concatenatePageContents(docs, originalName)
            }
        case '.csv':
            logger.info(`Extrating Text from csv documents for summary.`)
            const newCSVPath = removeFileExtension(filePath);
            let isCsvFileCreated = await documents.createTempCSVFileForXLSXFile(newCSVPath, fileName, 'csv')
            if (isCsvFileCreated == 1) {
                docs = await documents.createDocumentFromCSV(filePath, fileId, originalName)
                return concatenatePageContents(docs, originalName)
            }
        case '.pptx':
            logger.info(`Extrating Text from pptx documents for summary.`)
            const textFilePath = await documents.extractTextFromPPTXAndCreateTextFile(filePath, userId, fileId)
            docs = await documents.createDocumentFromText(textFilePath, fileId, originalName)
            return concatenatePageContents(docs, originalName)
        case '.html':
            logger.info(`Extrating Text from html documents for summary.`)
            docs = await readHTMLFile(filePath)
            return docs;
        case '.txt':
            logger.info(`Extrating Text from text documents for summary.`)
            docs = await documents.createDocumentFromText(filePath, fileId, originalName)
            return concatenatePageContents(docs, originalName)
        default:
            logger.info(`Extrating Text from documents for summary (Unsupported file type).`)
            throw new Error('Unsupported file type');
    }
}

function escapeForBigQuery(str) {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")   
    .replace(/"/g, '\\"')     
    .replace(/\r?\n/g, "\\n"); 
}

exports.summarizer = (summary, fileId, originalName, userId) => {
  return new Promise(async (resolve) => {
    try {
       if (!logger) {
        logger = await createLogger();
    }
      const bigquery = new BigQuery();
      logger.info(`Building prompt for BigQuery ML.GENERATE summarizer.`);

      const relevantText = await readFile(summary, fileId, originalName, userId);
      const fileExtension = path.extname(summary).toLowerCase();

      const prompt = await buildSummarizerPrompt(relevantText, fileExtension);
      logger.info("Prompt built successfully");

      const escapedPrompt = escapeForBigQuery(prompt);

      const projectId = process.env.GOOGLE_PROJECT_ID;
      const datasetId = process.env.BIGQUERY_DATASET_ID;
      const modelId = process.env.BIGQUERY_AI_MODEL_ID;

      const query = `
          SELECT
           JSON_VALUE(
            ml_generate_text_result,
            "$.candidates[0].content.parts[0].text"
           ) AS output_text
          FROM
           ML.GENERATE_TEXT(
            MODEL \`${projectId}.${datasetId}.${modelId}\`,
            -- Pass the prompt directly here
            (SELECT "${escapedPrompt}" AS prompt), 
            STRUCT(
             0.2 AS temperature,
             8192 AS max_output_tokens
            )
           )
         `;

        logger.info("Running BigQuery summarizer job...");

        const [job] = await bigquery.createQueryJob({ query, location: process.env.BIGQUERY_LOCATION });
        const [rows] = await job.getQueryResults();

        if (!rows || rows.length === 0) {
          throw new Error("BigQuery ML.GENERATE_TEXT returned no results.");
        }

        const outputText = rows[0].output_text || "";

        logger.info(`Summary built successfully via BigQuery ML.`);
        resolve({
          outputText,
          overviewOutputText: "",
          success: true
        })
        } catch (error) {
          logger.error(`Summary building failed: ${error}`);
          resolve({
            outputText: "Error: Something went wrong. Please try again later.",
            overviewOutputText: "",
            success: false
          });
        }
    })
}
