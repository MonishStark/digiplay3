const Chat = require('./Chat')
const dotenv = require('dotenv');
const { getAdminSetting } = require('../init/redisUtils')
const { GoogleGenAI } = require("@google/genai");
const { BigQuery } = require("@google-cloud/bigquery");
const { createLogger } = require('../init/logger');


dotenv.config();

const projectId = process.env.GOOGLE_PROJECT_ID;
const bigqueryLocation = process.env.BIGQUERY_LOCATION;
const datasetId =process.env.BIGQUERY_DATASET_ID;
const aiModelId = process.env.BIGQUERY_AI_MODEL_ID;
const tableId = process.env.BIGQUERY_TABLE;

const genAI = new GoogleGenAI({
  vertexai: true,
  project: projectId,   
  location: bigqueryLocation,     
});
const bigquery = new BigQuery();

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

class CustomQuerying {

    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }

    async storeUsedToken(chatId, token) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection("tokens_used")
                .insert({
                    chatId,
                    token,
                    created: dateTime
                })
                .then((tokenId) => {
                    resolve(tokenId[0])
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }
    async isFlaggedContent(userQuery) {
      if (!logger) {
          logger = await createLogger();
      }
      const sqlQuery = `
      SELECT *
      FROM ML.GENERATE_TEXT(
        MODEL \`${datasetId}.${aiModelId}\`,
        (
          SELECT
            CONCAT(
              "Please classify the following text for policy violations. Respond with { flagged: true } or { flagged: false } only.\\n\\nText: ",
              @userQuery
            ) AS prompt
        ),
        STRUCT(
          0.0 AS temperature,
          2560 AS max_output_tokens,
          FALSE AS flatten_json_output -- Set to FALSE for a more predictable JSON output
        )
      )
      `;
      logger.info("Checking if the content is flagged under Bigquery policy")
      try {
        const [job] = await bigquery.createQueryJob({
          query: sqlQuery,
          location: process.env.BIGQUERY_LOCATION,
          params: { userQuery },
        });
        logger.info("Checking if the content is flagged under Bigquery policy")
        const [rows] = await job.getQueryResults();
        logger.info("Checking if the content is flagged under Bigquery policy")
        if (!rows || rows.length === 0 || !rows[0].ml_generate_text_result) {
          console.error("No ML.GENERATE_TEXT result found in the BigQuery response.");
          return false;
        }
        logger.info("Checking if the content is flagged under Bigquery policy")
        const mlResult = JSON.parse(rows[0].ml_generate_text_result);
        let resultText = "";
        const candidates = mlResult.candidates || [];
        if (candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
          resultText = candidates[0].content.parts[0].text;
        }
        resultText = resultText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        try{
          return resultText.flagged === true;
        }catch (e) {
          console.error("Failed to parse moderation result:", resultText);
          return false;
        }          
      } catch (error) {
        console.error("Error during moderation check:", error);
        return false;
      }
    }

    async getRelevantDocs(userQuery, namespace, fileIds) {
    try {
      const embeddingResponse = await genAI.models.embedContent({
        model: "text-embedding-004",
        contents: [{ parts: [{ text: userQuery }] }],
      });
      const queryEmbedding = embeddingResponse.embeddings[0].values;

      let  topK = parseInt(await getAdminSetting("NO_OF_CITATIONS") );

      let fileFilter = "";
      if (!(fileIds.length === 1 && fileIds[0] === "team")) {
        const fileIdsStr = fileIds.map((id) => `'${id}'`).join(",");
        fileFilter = `AND base.file_id IN (${fileIdsStr})`;
      }
      const sqlQuery = `
        SELECT *
        FROM VECTOR_SEARCH(
          TABLE \`${projectId}.${datasetId}.${tableId}\`,
          'embedding',
          (SELECT @queryEmbedding AS embedding),
          top_k => @topK
        ) AS vs
        WHERE base.namespace = @namespace
        ${fileFilter}
        LIMIT @topK
      `;

      const [rows] = await bigquery.query({
        query: sqlQuery,
        params: { namespace, queryEmbedding, topK },
      });

      const relevantDocs = rows.map((row) => ({
        pageContent: row.base.content,
        metadata: {
          docId: row.base.docid,
          fileId: row.base.file_id,
          namespace: row.base.namespace,
          similarity: row.distance,
        },
      }));

      return relevantDocs;
    } catch (err) {
      throw err;
    }
  }

    fetchFilesWithinFolder(folderId, teamId) {
        return new Promise(async (resolve, reject) => { 
            try {
                let filesToBeDeleted = []
                let contents = await this.getChildFoldersAndFiles(folderId, teamId)
                let foldersToBeQueried = []
                contents.forEach(content => {
                    if (content.type == "folder") {
                        foldersToBeQueried.push(content)
                    } else {
                        filesToBeDeleted.push(content)
                    }
                });
                contents = foldersToBeQueried

                while (true) {
                    if (contents.length == 0) {
                        break
                    }
                    foldersToBeQueried = []

                    for (const content of contents) {
                        let tempData = await this.getChildFoldersAndFiles(content.id, content.teamId)
                        for (const _content of tempData) {
                            if (_content.type == "folder") {
                                foldersToBeQueried.push(_content)
                            } else {
                                filesToBeDeleted.push(_content)
                            }
                        }
                    }
                    contents = foldersToBeQueried
                }
                resolve(filesToBeDeleted)
            } catch (error) {
                reject(error)
            }
        })
    }
    
    getChildFoldersAndFiles(parentId, teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('documents')
                .select('*')
                .where({ parentId, teamId })
                .andWhere((qb) => {
                    qb.where({ isNotAnalyzed: false }).orWhereNull('isNotAnalyzed');
                })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    extractDocs(sourceDocs) {
        let docs = []
        sourceDocs.map((sourceDoc) => {
            docs.push(sourceDoc.pageContent)
        })
        return docs
    }

    buildPrompt(docs, question, pastMessages, answerFormat) {
        const prompt = `
        """
        Context section:
        ${docs.join("\n-\n")}
        """

        """
        Chat History:
        ${pastMessages.join(" \n")}
        """

        Question: ${question}
        `;

        return prompt
    }

    getPastMessages(chatId) {
        return new Promise((resolve, reject) => {
            const chat = new Chat(this.dbConnection)
            chat.getChatMessagesForAIQuery(chatId)
                .then((messages) => {
                    let pastMessages = []
                    for (const message of messages) {
                        if (message.role == 'user') {
                            pastMessages.push(`Human: ${message.message}`)
                        } else if (message.role == 'bot') {
                            pastMessages.push(`AI: ${message.message}`)
                        }
                    }
                    resolve(pastMessages)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }


    async queryIndexByCustomQuerying(query, namespace, chatId) {
      if (!logger) {
            logger = await createLogger();
        }
        logger.info(`Getting fileIds for scope`)      
        const scope = await knex('chat_scope').select("*").where({chatId})
        let fileIds=[];
        if(scope[0]){
            if(scope[0].type ==='team'){
                fileIds = await knex("documents").where({teamId: scope[0].teamId,type: "file"}).pluck("id");       
            }else if(scope[0].type ==='file'){
                fileIds=[scope[0].fileId]
            }else if(scope[0].type==='folder'){
                const filesWithinFolder = await this.fetchFilesWithinFolder(scope[0].fileId,scope[0].teamId);
                const folderFileIds = filesWithinFolder.map(file => file.id);
                fileIds=[...folderFileIds]
            }
        }
        logger.info(`Checking if the query is flagged`)
        if (await this.isFlaggedContent(query)) {
            logger.warn(`Query flagged under Bigquery policy`)
            return {
                result: "This question violates the Bigquery policy",
                sourceDocuments: []
            }
        }
        logger.info(`Fetching relevant docs for the query from vector database`)
        let relevantDocs =[];        
        if(fileIds.length>0){
            relevantDocs = await this.getRelevantDocs(query, namespace,fileIds)
         }
        logger.info(`Filtering relevant docs from provided scope`)
        logger.info(`Relevant docs fetched for the query from vector database`)
        logger.info(`Building prompt for Bigquery request with relevant context`)
        const context = this.extractDocs(relevantDocs)
        let conversationNumberToPass = await getAdminSetting("CONVERSATION_NUMBER_TO_PASS")
        let pastMessages = await this.getPastMessages(chatId)
        pastMessages = pastMessages.slice(-conversationNumberToPass)
        const isAnswerFormat = await getAdminSetting("FORMAT_CHAT_RESPONSE")
        const isQueryHaveFormat = /format/i.test(query);
        let answerFormat = "";
        if (isAnswerFormat == 1 && !isQueryHaveFormat) {
            answerFormat = await getAdminSetting("FORMAT_SUFFIX")
            logger.info(`Formating answer as per instructions. ${answerFormat}`)
        }
        if (isAnswerFormat == 0 && !isQueryHaveFormat) {
            answerFormat = process.env.DEFAULT_CHAT_RESPONSE_FORMAT
        }
        const prompt = this.buildPrompt(context, query, pastMessages, answerFormat)

        logger.info(`Prompt building success`)
        logger.info(prompt)

        const settings = await knex("super-admin-settings").select('meta_value').where({ meta_key: "CHAT_OUTPUT_TOKEN" });
        const max_tokens = parseInt(settings[0]["meta_value"]) || 2048;
        function escapeForBQ(str) {
          if (!str) return "";
          return str
            .replace(/\\/g, "\\\\")    
            .replace(/'/g, "\\'")      
            .replace(/"/g, '\\"')      
            .replace(/\n/g, "\\n");    
        }
        const escapedPrompt = escapeForBQ(prompt);

        const fileFilter = fileIds && fileIds.length > 0
          ? `AND file_id IN UNNEST([${fileIds.map(f => `'${f}'`).join(",")}])`
          : "";

        const sqlQuery = `
        DECLARE system_prompt STRING DEFAULT """
        Please format your response as a JSON object with the structure:
        {
          answer: "${answerFormat}",
          suggestedQuestions: [q1, q2, q3]
        }
        If the answer cannot be found in the data, write "I could not find an answer from the context."
        """ ;

        WITH context AS (
          SELECT COALESCE(STRING_AGG(content, "\\n"), "No relevant data available.") AS aggregated_content
          FROM \`${datasetId}.${tableId}\`
          WHERE namespace = '${namespace}'
          ${fileFilter}
        )
        SELECT *
        FROM ML.GENERATE_TEXT(
          MODEL \`${datasetId}.${aiModelId}\`,
          (
            SELECT CONCAT(
              (SELECT aggregated_content FROM context),
              "\\n", system_prompt,
              "\\nUser Question: '${escapedPrompt}'"
            ) AS prompt
          ),
          STRUCT(
            0.0 AS temperature,
            ${max_tokens} AS max_output_tokens,
            TRUE AS flatten_json_output
          )
        )
        `;


        const [job] = await bigquery.createQueryJob({
          query: sqlQuery,
          location: process.env.BIGQUERY_LOCATION,
          params: { namespace, prompt },
        });
        
        const [rows] = await job.getQueryResults();
        let responseText = rows[0].ml_generate_text_llm_result || "";
        responseText = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "").replace(/Default Format Suffix:.*$/s, "").trim();
        let completions;
        try {
          completions = JSON.parse(responseText);
        } catch {
          completions = { raw: responseText };
        }
        
        const outputText = completions.answer;
        const suggestedQuestions = completions.suggestedQuestions ;
        const isGreeting = this.checkGreetingByOutput(outputText.toLowerCase())
        const NO_OF_CITATIONS = await getAdminSetting("NO_OF_CITATIONS")
        if (isGreeting) {
            return {
                result: outputText
            }
        } else {
            const stringsToCheck = process.env.NO_CONTEXT_STRING.split(',').map(str => str.trim());
            let isNoContextString = false;
            for (let i = 0; i < stringsToCheck.length; i++) {
                if ((outputText).toLowerCase().includes((stringsToCheck[i]))) {
                    isNoContextString = true;
                    console.log(`The string contains '${stringsToCheck[i]}'.`);
                    break;
                }
            }
            if (isNoContextString) {
                logger.info("Don't have ans from context")
                return {
                    result: outputText,
                    suggestedQuestions
                }
            } else {
                if (NO_OF_CITATIONS == '0') {
                    logger.info("Have ans from context zero")
                    return {
                        result: outputText,
                        suggestedQuestions
                    }
                } else {
                    logger.info("Have ans from context")
                    return {
                        result: outputText,
                        sourceDocuments: relevantDocs,
                        suggestedQuestions
                    }
                }
            }
        }
    }

    async checkGreetingByOutput(output) {
      if (!logger) {
            logger = await createLogger();
        }
        const greetingStrings = process.env.GREETING_STRINGS.split(',').map(str => str.trim());
        const isGreeting = greetingStrings.some(str => output.includes(str));
        logger.info("Query have intent of greeting :-", isGreeting)
        return isGreeting
    }
}

module.exports = CustomQuerying