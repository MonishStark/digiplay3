const dotenv = require('dotenv');
dotenv.config();
const { getAdminSetting } = require('./redisUtils');
const { BigQuery } = require('@google-cloud/bigquery');
const { createLogger } = require('../init/logger');

const projectId = process.env.GOOGLE_PROJECT_ID; 
const datasetId = process.env.BIGQUERY_DATASET_ID;
const gcsBucketName = process.env.GOOGLE_STORAGE_BUCKET_NAME;
const connectionId = process.env.BIGQUERY_CONNECTION_ID;
const aiModel = process.env.BIGQUERY_AI_MODEL_ID; 

const bigquery = new BigQuery({ projectId });

let logger ;

exports.imageSummary = async (fileName) => {
  if (!logger) {
      logger = await createLogger();
  }
  const max_output_tokens = parseInt(process.env.BIGQUERY_MAX_OUTPUT_TOKEN, 10) || 1024;

  const timestamp = Date.now();
  const tableName = `image_summary_temp_${timestamp}`;
  const gcsFileUri = `gs://${gcsBucketName}/${fileName}`;
  const fullTableName = `${projectId}.${datasetId}.${tableName}`;
  const bigQueryAiModel =  `${projectId}.${datasetId}.${aiModel}`;
  try {
    const createExternalTableQuery = `
      CREATE OR REPLACE EXTERNAL TABLE \`${fullTableName}\`
      WITH CONNECTION \`${connectionId}\`
      OPTIONS (
        object_metadata = 'SIMPLE',
        uris = ['${gcsFileUri}']
      )
    `;
    await bigquery.query({ query: createExternalTableQuery });

    const imagePrompt = await getAdminSetting("IMAGE_PROMPT");
    const escapedPrompt = imagePrompt
      .replace(/'/g, "''")
      .replace(/\r?\n/g, " ");

    const generateSummaryQuery = `
      SELECT
        JSON_VALUE(
          ml_generate_text_result,
          "$.candidates[0].content.parts[0].text"
        ) AS summary
      FROM ML.GENERATE_TEXT(
        MODEL \`${bigQueryAiModel}\`,
        (
          SELECT * FROM \`${fullTableName}\`
        ),
        STRUCT(
          '${escapedPrompt}' AS prompt,
          0.2 AS temperature,
          ${max_output_tokens} AS max_output_tokens   
        )
      )
    `;
    const [rows] = await bigquery.query({ query: generateSummaryQuery });
    if (!rows.length || !rows[0].summary) {
      throw new Error("No summary was returned by the model.");
    }

    const summaryText = rows[0].summary;
    logger.info("Image Summary:", summaryText);
    return { summary: summaryText };

  } catch (error) {
    logger.error("Error generating image summary:", error);
    throw new Error(`Something went wrong: ${error.message}`);
  } finally {
    try {
      const dropTableQuery = `DROP TABLE IF EXISTS \`${fullTableName}\``;
      await bigquery.query({ query: dropTableQuery });
    } catch (cleanupError) {
      logger.error("Cleanup failed:", cleanupError);
    }
  }
};

exports.audioSummary = async (fileName) => {
  if (!logger) {
      logger = await createLogger();
  }
  const max_output_tokens = parseInt(process.env.BIGQUERY_MAX_OUTPUT_TOKEN, 10) || 1024;
  const timestamp = Date.now();
  const tableName = `audio_summary_temp_${timestamp}`;
  const gcsFileUri = `gs://${gcsBucketName}/${fileName}`;
  const fullTableName = `${projectId}.${datasetId}.${tableName}`;
  const bigQueryAiModel =  `${projectId}.${datasetId}.${aiModel}`;
  try {
    const createExternalTableQuery = `
      CREATE OR REPLACE EXTERNAL TABLE \`${fullTableName}\`
      WITH CONNECTION \`${connectionId}\`
      OPTIONS (
        object_metadata = 'SIMPLE',
        uris = ['${gcsFileUri}']
      )
    `;
    await bigquery.query({ query: createExternalTableQuery });

    const audioPrompt = await getAdminSetting("AUDIO_PROMPT");
    const escapedPrompt = audioPrompt
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "''")
      .replace(/\r?\n/g, " ");

    const generateSummaryQuery = `
      SELECT
        JSON_VALUE(
          ml_generate_text_result,
          "$.candidates[0].content.parts[0].text"
        ) AS summary
      FROM ML.GENERATE_TEXT(
        MODEL \`${bigQueryAiModel}\`,
        (SELECT * FROM \`${fullTableName}\`),
        STRUCT('${escapedPrompt}' AS prompt, 0.2 AS temperature, ${max_output_tokens} AS max_output_tokens)
      )
    `;


    const [rows] = await bigquery.query({ query: generateSummaryQuery });
    if (!rows.length || !rows[0].summary) {
      throw new Error("No audio summary was returned by the model.");
    }

    const summaryText = rows[0].summary;
    logger.info("Audio Summary:", summaryText);
    return { summary: summaryText };

  } catch (error) {
    console.error("Error details:", error);
    logger.error("Error generating audio summary:", error);
    throw new Error(`Something went wrong: ${error.message}`);
  } finally {
    try {
      const dropTableQuery = `DROP TABLE IF EXISTS \`${fullTableName}\``;
      await bigquery.query({ query: dropTableQuery });
    } catch (cleanupError) {
      logger.error("Cleanup failed:", cleanupError);
    }
  }
};

exports.videoSummary = async (fileName) => {
  if (!logger) {
      logger = await createLogger();
  }
  const max_output_tokens = parseInt(process.env.BIGQUERY_MAX_OUTPUT_TOKEN, 10) || 1024;
  const timestamp = Date.now();
  const tableName = `video_summary_temp_${timestamp}`;
  const gcsFileUri = `gs://${gcsBucketName}/${fileName}`;
  const fullTableName = `${projectId}.${datasetId}.${tableName}`;
  const bigQueryAiModel =  `${projectId}.${datasetId}.${aiModel}`;

  try {
    // Step 1: Create external table
    const createExternalTableQuery = `
      CREATE OR REPLACE EXTERNAL TABLE \`${fullTableName}\`
      WITH CONNECTION \`${connectionId}\`
      OPTIONS (
        object_metadata = 'SIMPLE',
        uris = ['${gcsFileUri}']
      )
    `;
    await bigquery.query({ query: createExternalTableQuery });

    // Step 2: Prepare prompt
    const videoPrompt = await getAdminSetting("VIDEO_PROMPT");
    const escapedPrompt = videoPrompt
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "''")
      .replace(/\r?\n/g, " ");

    // Step 3: Generate summary (literal values, no params)
    const generateSummaryQuery = `
      SELECT
        JSON_VALUE(
          ml_generate_text_result,
          "$.candidates[0].content.parts[0].text"
        ) AS summary
      FROM ML.GENERATE_TEXT(
        MODEL \`${bigQueryAiModel}\`,
        (SELECT * FROM \`${fullTableName}\`),
        STRUCT('${escapedPrompt}' AS prompt, 0.2 AS temperature, ${max_output_tokens} AS max_output_tokens)
      )
    `;

    const [rows] = await bigquery.query({ query: generateSummaryQuery });

    if (!rows.length || !rows[0].summary) {
      throw new Error("No video summary was returned by the model.");
    }

    const summaryText = rows[0].summary;
    logger.info("Video Summary:", summaryText);
    return { summary: summaryText };

  } catch (error) {
    logger.error("Error generating video summary:", error);
    throw new Error(`Something went wrong: ${error.message}`);
  } finally {
    try {
      const dropTableQuery = `DROP TABLE IF EXISTS \`${fullTableName}\``;
      await bigquery.query({ query: dropTableQuery });
    } catch (cleanupError) {
      logger.error("Cleanup failed:", cleanupError);
    }
  }
};
