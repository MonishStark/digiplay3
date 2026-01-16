var fs = require('fs');
var fs2 = require('fs').promises;
const path = require('path');
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { TokenTextSplitter } = require("langchain/text_splitter");
const { DocxLoader } = require("@langchain/community/document_loaders/fs/docx");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { CSVLoader } = require("@langchain/community/document_loaders/fs/csv");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const XLSX = require("xlsx");
var reader = require('any-text');
const { convert } = require('html-to-text');
const officeParser = require('officeparser');
const Team = require('./Team');
const Chat = require("./Chat")
const CustomQuerying = require('./CustomQuerying')
const FileEmbedding = require('./FileEmbedding')
const { Storage } = require('@google-cloud/storage');
const dotenv = require('dotenv');
const { GoogleGenAI } = require("@google/genai");
const { BigQuery } = require("@google-cloud/bigquery");
const { createLogger } = require('../init/logger');


dotenv.config();

const genAI = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_PROJECT_ID,   
  location: process.env.BIGQUERY_LOCATION,     
});
const bigquery = new BigQuery();

const { getQueryType, getNonResponseIdentifiers, getAdminSetting } = require('../init/redisUtils');
const Users = require('./Users');

let logger;

let credentials;
(async () => {
  try {
    credentials = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  } catch (error) {
    try {
      if (!logger) {
        logger = await createLogger();
      }
      logger.info("Error getting credentials");
      logger.info(error);
    } catch (logErr) {
      console.error("Error creating or using logger:", logErr);
    }
  }
})();

const storage = new Storage({ credentials });

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

class Documents {
    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }

    buildAbsolutePathWithFoldersArray(foldersArray) {
        let _path = `${process.env.DOCUMENT_PATH}/`
        const reversedFolderArray = foldersArray.reverse()
        reversedFolderArray.forEach(folder => {
            if (folder != "Root") {
                _path += folder + '/'
            }
        });
        return path.resolve(_path)
    }

    getPredecessorFolders(folderId) {
        return new Promise(async (resolve, reject) => {
            try {
                let nextParentId = folderId;
                let folderTrace = [];

                while (nextParentId) {
                    const _data = await this.dbConnection('documents')
                        .select('*')
                        .where({ id: nextParentId });

                    if (_data.length === 0) {
                        break;
                    }

                    folderTrace.push(_data[0]);
                    nextParentId = _data[0]["parentId"];
                }

                resolve(folderTrace.reverse());
            } catch (error) {
                console.log(error)
                reject(error)
            }
        })
    }

    createDefaultFoldersForTeam(teamAlias, defaultFoldersArray) {
        defaultFoldersArray.forEach(folder => {
            const folderPath = `${process.env.DOCUMENT_PATH}/` + teamAlias + '/' + folder
            if (!fs.existsSync(path.resolve(folderPath))) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
        });
    }

    async createTeamFolder(teamAlias) {
        const folderPath = `${process.env.DOCUMENT_PATH}/` + teamAlias
        if (!fs.existsSync(path.resolve(folderPath))) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
    }

async getChildFoldersAndFiles2(parentId, teamId, search = '', offset = 0, limit = 20) {
    try {
        offset = parseInt(offset, 10);
        limit = parseInt(limit, 10);

        if (isNaN(offset) || offset < 0) offset = 0;
        if (isNaN(limit) || limit <= 0) limit = 20;

        const baseQuery = this.dbConnection('documents')
            .where({ parentId, teamId, isTrashed: false });

        if (search) {
            baseQuery.andWhere('name', 'like', `%${search}%`);
        }

        const [{ count }] = await baseQuery.clone().count('* as count');
        const totalItems = parseInt(count, 10);

        const results = await baseQuery
            .clone()
            .orderBy('created', 'asc')
            .offset(offset)
            .limit(limit);

        return {
            foldersAndFiles: results,
            pagination: {
                offset,
                limit,
                totalItems,
                hasMore: offset + limit < totalItems
            }
        };
    } catch (err) {
        console.error(err);
        throw err;
    }
}



    getChildFoldersAndFiles(parentId, teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('documents')
                .select('*')
                .where({ parentId, teamId,isTrashed: false })
                .andWhere((qb) => {
                    qb.where({ isNotAnalyzed: false }).orWhereNull('isNotAnalyzed');
                })
                .then((res) => {
                    let foldersAndFiles = [...res];
                    let promises = foldersAndFiles.map((file, index) => {
                        return this.dbConnection('users')
                            .where({ id: file.creatorId })
                            .select('firstname', 'lastname')
                            .first()
                            .then(owner => {
                                const ownerName = (owner?.firstname || "") + " " + (owner?.lastname || "");
                                return this.dbConnection('users_meta')
                                    .where({ userId: file.creatorId, metaKey: 'avatarUrl' })
                                    .select('metaValue')
                                    .first()
                                    .then(userImage => {
                                        foldersAndFiles[index]['avatarUrl'] = `${process.env.USER_PROFILE_IMAGE_URL}/${userImage?.metaValue || "default_avatar.png"}`;
                                        foldersAndFiles[index]['ownerName'] = ownerName.trim() ? ownerName : "root folder";
                                    });
                            });
                    });
                    Promise.all(promises)
                        .then(() => {
                            resolve(foldersAndFiles);
                        })
                        .catch((err) => {
                            console.log(err)
                            reject(err)
                        })
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getRootFolders(teamId) {
        return new Promise((resolve, reject) => {
            const _data = this.dbConnection('documents')
                .select('*')
                .where({ parentId: 4 })
                .andWhere({ teamId })
                .andWhere({isNotAnalyzed:false})
                .then((res) => {
                    let foldersAndFiles = [...res];
                    let promises = foldersAndFiles.map((file, index) => {
                        return this.dbConnection('users')
                            .where({ id: file.creatorId })
                            .select('firstname', 'lastname')
                            .first()
                            .then(owner => {
                                const ownerName = (owner?.firstname || "") + " " + (owner?.lastname || "");
                                return this.dbConnection('users_meta')
                                    .where({ userId: file.creatorId, metaKey: 'avatarUrl' })
                                    .select('metaValue')
                                    .first()
                                    .then(userImage => {
                                        foldersAndFiles[index]['avatarUrl'] = `${process.env.USER_PROFILE_IMAGE_URL}/${userImage?.metaValue || "default_avatar.png"}`;
                                        foldersAndFiles[index]['ownerName'] = ownerName.trim() ? ownerName : "root folder";
                                    });
                            });
                    });
                    Promise.all(promises)
                        .then(() => {
                            resolve(foldersAndFiles);
                        })
                        .catch((err) => {
                            console.log(err)
                            reject(err)
                        })
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getParentId(folderId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('documents')
                .select('parentId')
                .where({ id: folderId })
                .then((res) => {
                    resolve(res[0]["parentId"])
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    createFolder(
        folderName,
        tooltip,
        isDefault,
        parentId,
        teamId,
        userId
    ) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection('documents')
                .insert({
                    parentId,
                    teamId,
                    name: folderName,
                    tooltip,
                    isDefault: isDefault == true ? 1 : 0,
                    type: "folder",
                    created: dateTime,
                    creatorId:userId,
                })
                .then((folderId) => {
                    resolve(folderId)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    createFile(
        fileName,
        parentId,
        teamId,
        source
    ) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection('documents')
                .insert({
                    parentId,
                    teamId,
                    name: fileName,
                    tooltip: "",
                    isDefault: 0,
                    type: "file",
                    created: dateTime,
                    isNotAnalyzed: true,
                    source: source
                })
                .then((fileId) => {
                    resolve(fileId)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    updateFile(
        fileName,
        fileId
    ) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection('documents')
                .update({
                    name: fileName,
                    created: dateTime
                })
                .where({ id: fileId })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    isFileNameSame(newFileName, fileId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .select('name')
                .where({ id: fileId })
                .then((res) => {
                    if (res[0].name == newFileName) {
                        resolve(1)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    checkIfFileExists(fileId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .select('*')
                .where({ id: fileId })
                .then((res) => {
                    if (res.length > 0) {
                        resolve(1)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    checkIfFileNameExistUnderParentId(fileName, parentId, teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .select('*')
                .where({ parentId, name: fileName, teamId })
                .then((res) => {
                    if (res.length > 0) {
                        if(res[0].isNotAnalyzed){
                            // If found and file is not analyzed, delete the file 
                            return this.dbConnection("documents")
                                .where({ parentId, name: fileName, teamId })
                                .del()
                                .then(() => resolve(0))
                                .catch((err) => reject(err));
                            }else{
                                resolve(1);
                            }
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    checkIfFolderExists(folderId, teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .select("*")
                .where({ id: folderId })
                .andWhere({ teamId })
                .then((res) => {
                    if (res.length > 0) {
                        resolve('exists')
                    } else {
                        resolve('not-exists')
                    }
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    checkIfFolderExistsM2(parentId, teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .select("*")
                .where({ id:parentId,teamId,type:"folder" })
                .then((res) => {
                    if (res.length > 0) {
                        resolve('exists')
                    } else {
                        resolve('not-exists')
                    }
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    checkIfFileIsValid(fileId, parentId, teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .select("*")
                .where({ id: fileId })
                .andWhere({ teamId })
                .andWhere({ parentId })
                .andWhere({ type: 'file' })
                .then((res) => {
                    if (res.length > 0) {
                        resolve('exists')
                    } else {
                        resolve('not-exists')
                    }
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    checkIfFileIsValidM2(fileId, teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .select("*")
                .where({ id: fileId })
                .andWhere({ teamId })
                .andWhere({ type: 'file' })
                .then((res) => {
                    if (res.length > 0) {
                        resolve('exists')
                    } else {
                        resolve('not-exists')
                    }
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    isFile(fileName) {
        return fs.lstatSync(fileName).isFile();
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

    async deleteEmbeddingsById(fileId, namespace) {

      const bigquery = new BigQuery();
      const tableId = process.env.BIGQUERY_TABLE;
      const datasetId = process.env.BIGQUERY_DATASET_ID;
      const projectId = process.env.GOOGLE_PROJECT_ID;

      const backgroundDelete = async () => {
        try {
          let streamingRows = 1;
          while (streamingRows > 0) {
            const [tables] = await bigquery.dataset(datasetId).getTables();
            const table = tables.find(t => t.id === tableId);
            const [metadata] = await table.getMetadata();

            if (metadata.streamingBuffer && metadata.streamingBuffer.estimatedRows > 0) {
              streamingRows = parseInt(metadata.streamingBuffer.estimatedRows, 10);
              await new Promise(res => setTimeout(res, 5000));
            } else {
              streamingRows = 0;
            }
          }

          const deleteQuery = `
            DELETE FROM \`${projectId}.${datasetId}.${tableId}\`
            WHERE file_id = @fileId
            AND namespace = @namespace
          `;

          const [job] = await bigquery.createQueryJob({
            query: deleteQuery,
            location: process.env.BIGQUERY_LOCATION,
            params: { fileId: String(fileId), namespace: String(namespace) },
          });

          await job.getQueryResults();
        } catch (err) {
          console.error("Background deletion failed for fileId:", fileId, err);
        }
      };
      backgroundDelete();
      return 1;
    }

    async deleteFiles(filesList, teamId) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            const team = new Team(this.dbConnection);
            team.getTeamUUID(teamId)
                .then(async (uuid) => {
                    if (filesList.length > 0) {
                        const folderPath = path.resolve(`${process.env.DOCUMENT_PATH}/${uuid}`)
                        for (const file of filesList) {
                            const ext = file.name.split('.').pop()
                            const fileName = file.id + '.' + ext

                            let [exists]='';
                            if(process.env.GOOGLE_CLOUD_STORAGE == 1){
                                [exists] = await storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME).file(fileName).exists();
                            }
                            else {
                                exists = false
                            }
                            logger.info(`FIleName: ${file.name} with ID: ${fileName} exists on cloud : ${exists}`)
                            if (exists) {
                                const res = await storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME).file(fileName).delete();
                                logger.info(`${fileName} deleted from cloud`);
                                await this.deleteEmbeddingsById(file.id, uuid)
                            }
                            else {
                                if (fs.existsSync(path.join(folderPath, fileName))) {
                                    logger.info(`${fileName} deleted from server`);
                                    await fs2.unlink(path.join(folderPath, fileName));
                                    await this.deleteEmbeddingsById(file.id, uuid)
                                }
                            }

                        }
                        resolve(1)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    deleteFolderDataFromDatabase(folderId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .where({ id: folderId })
                .del()
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    trashFolderData(folderId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .where({ id: folderId })
                .update({isTrashed:true})
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    deleteFolder(folderId, teamId) {
        return new Promise((resolve, reject) => {
            this.fetchFilesWithinFolder(folderId, teamId)
                .then(async (files) => {
                    if (files.length > 0) {
                        await this.deleteFiles(files, teamId)
                    }
                    this.deleteFolderDataFromDatabase(folderId)
                        .then((res) => {
                            resolve(1)
                        })
                        .catch((err) => {
                            console.log(err)
                            reject(err)
                        })
                })
                .catch((err) => {
                    console.log(err)
                    reject('file-fetch-failed')
                })
        })
    }
    trashFolder(folderId) {
        return new Promise((resolve, reject) => {
                    this.trashFolderData(folderId)
                        .then((res) => {
                            resolve(1)
                        })
                        .catch((err) => {
                            console.log(err)
                            reject(err)
                        })
                })
    }

    getFolderData(folderId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .select('*')
                .where({ id: folderId })
                .then((res) => {
                    resolve(res[0])
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    updateFolder(folderId, folderName, folderDescription) {
        return new Promise((resolve, reject) => {
            const updateData = {};

            if (folderName) {
              updateData.name = folderName;
            }

            if (folderDescription) {
              updateData.tooltip = folderDescription;
            }
            this.dbConnection("documents")
                .update(updateData)
                .where({ id: folderId })
                .then((res) => {
                    if (res == 1) {
                        resolve(1)
                    } else {
                        resolve(2)
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getFileData(fileId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .select("*")
                .where({ id: fileId })
                .then((data) => {
                    resolve(data[0])
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    async deleteSummaryFromDatabase(fileId) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            this.dbConnection("summary")
                .where({ fileId: fileId })
                .first() // Retrieve the first matching record
                .then((record) => {
                    if (record) {
                        // Record exists, proceed to delete
                        logger.info(`Summary Record exist for fileId ${fileId} with fileName ${record.fileName}`)
                        return this.dbConnection("summary")
                            .where({ fileId: fileId })
                            .del()
                            .then((res) => {
                                logger.info(`Summary Record of ${record.fileName} of fileId ${fileId} deleted from database`)
                                resolve(res); // Resolve the promise with the result of the deletion operation
                            });
                    } else {
                        // Record does not exist, resolve with appropriate message
                        logger.info(`Summary Record does not exist for fileId ${fileId}`)
                        resolve({ message: "Record not found" });
                    }
                })
                .catch((err) => {
                    console.log(err); // Log the error to the console
                    logger.info(`Error finding Summary Record for fileId ${fileId}`)
                    reject(err); // Reject the promise with the error
                });
        });
    }    

    async deleteFile(fileId, teamId) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise(async (resolve, reject) => {
            const team = new Team(this.dbConnection)
            team.getTeamUUID(teamId)
                .then(async (uuid) => {
                    this.getFileData(fileId)
                        .then(async (file) => {
                            const folderPath = path.resolve(`${process.env.DOCUMENT_PATH}/${uuid}`)
                            const ext = file.name.split('.').pop()
                            const fileName = file.id + '.' + ext
                            let [exists]='';
                            if(process.env.GOOGLE_CLOUD_STORAGE == 1){
                                [exists] = await storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME).file(fileName).exists();
                            }
                            else {
                                exists = false
                            }
                            logger.info(`FileName: ${file.name} and ID: ${fileName} exists on cloud : ${exists}`)
                            if (exists) {
                                const res = await storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME).file(fileName).delete();
                                logger.info(`${fileName} deleted from cloud`);
                                await this.deleteEmbeddingsById(file.id, uuid)
                                await this.deleteSummaryFromDatabase(fileId)
                            }
                            else {
                                if (fs.existsSync(path.join(folderPath, fileName))) {
                                    logger.info(`${fileName} deleted from server`);
                                    await fs2.unlink(path.join(folderPath, fileName));
                                    await this.deleteEmbeddingsById(file.id, uuid)
                                    await this.deleteSummaryFromDatabase(fileId)
                                }
                            }

                            await this.deleteFolderDataFromDatabase(fileId)
                            resolve(1)
                        })
                        .catch((err) => {
                            console.log(err)
                            reject(err)
                        })
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    async getDocumentPath(fileId, teamId) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {

            const team = new Team(this.dbConnection)
            team.getTeamUUID(teamId)
                .then((uuid) => {
                    this.getFileData(fileId)
                        .then(async (file) => {
                            const folderPath = path.resolve(`${process.env.DOCUMENT_PATH}/${uuid}`)
                            const ext = file.name.split('.').pop()
                            const fileName = file.id + '.' + ext

                            let [exists]='';
                            if(process.env.GOOGLE_CLOUD_STORAGE == 1){
                                [exists] = await storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME).file(fileName).exists();
                            }
                            else {
                                exists = false
                            }
                            logger.info(`FileName: ${file.name} and ID: ${fileName} exists on cloud : ${exists}`)
                            if (exists) {
                                const options = {
                                    version: 'v4',
                                    action: 'read',
                                    expires: Date.now() + 1000 * 60 * 60, // 1 hour
                                };
                                
                                const [url] = await storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME).file(fileName).getSignedUrl(options);
                                if (url) {
                                    resolve({url})
                                } else {
                                    resolve('file-not-found')
                                }
                            }
                            else {
                                if (fs.existsSync(path.join(folderPath, fileName))) {
                                    resolve(path.join(folderPath, fileName))
                                } else {
                                    resolve('file-not-found')
                                }
                            }
                        })
                        .catch((err) => {
                            console.log(err)
                            reject(err)
                        })
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    searchFilesAndFolders(searchString, teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .select("*")
                .where({ teamId })
                .whereILike('name', `%${searchString}%`)
                .then((searchResult) => {
                    let foldersAndFiles = [...searchResult];
                    let promises = foldersAndFiles.map((file, index) => {
                        return this.dbConnection('users')
                            .where({ id: file.creatorId })
                            .select('firstname', 'lastname')
                            .first()
                            .then(owner => {
                                const ownerName = owner.firstname + " " + owner.lastname;
                                return this.dbConnection('users_meta')
                                    .where({ userId: file.creatorId, metaKey: 'avatarUrl' })
                                    .select('metaValue')
                                    .first()
                                    .then(userImage => {
                                        foldersAndFiles[index]['avatarUrl'] = `${process.env.USER_PROFILE_IMAGE_URL}/${userImage.metaValue}`;
                                        foldersAndFiles[index]['ownerName'] = ownerName;
                                    });
                            });
                    });
                    Promise.all(promises)
                        .then(() => {
                            resolve(foldersAndFiles);
                        })
                        .catch((err) => {
                            console.log(err)
                            reject(err)
                        })
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    formatFileSize(kb, decimalPoint = 2) {
      if (kb < 1) return kb.toFixed(decimalPoint) + ' KB';
      if (kb < 1000) return kb.toFixed(decimalPoint) + ' KB';
       
      const mb = kb / 1000;
      if (mb < 1000) return mb.toFixed(decimalPoint) + ' MB';
       
      const gb = mb / 1000;
      return gb.toFixed(decimalPoint) + ' GB';
    }
    getStatisticsDetailForCompanyForDate(companyId, day, month, year) {
        return new Promise(async (resolve, reject) => {
            try {
                // Validate day, month, year
                day = parseInt(day);
                month = parseInt(month);
                year = parseInt(year);

                if (isNaN(day) || isNaN(month) || isNaN(year)) {
                    return reject(new Error("Day, month, and year must be valid numbers"));
                }

                const date = new Date(year, month - 1, day); 
                if (date.getDate() !== day || date.getMonth() + 1 !== month || date.getFullYear() !== year) {
                    return reject(new Error("Invalid day, month, or year combination"));
                }

                const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0); 
                const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999); 

                // Get queries limit
                const queriesLimit = Number(await getAdminSetting("MAX_QUERY"));
                const companyUsers = await this.dbConnection('user_company_role_relationship').where({ company: companyId });
                const userIds = companyUsers.map(user => user.userId);

                // Count queries for the company users
                const chatHistories = await knex('chat_histories').select("id").whereIn('userId', userIds);
                let currentQueriesCount = 0;

                if (chatHistories.length > 0) {
                    for (let chat of chatHistories) {
                        const chatMessages = await knex('chat_messages')
                            .select("id")
                            .where({ chatId: chat.id })
                            .andWhere({ role: "user" })
                            .whereBetween('created', [startOfDay, endOfDay]);
                        currentQueriesCount += chatMessages.length;
                    }
                }

                const queries = { current: currentQueriesCount, limit: queriesLimit };

                // Get storage usage for company users
                const storageLimit = `${await getAdminSetting("MAX_STORAGE")} GB`;
                let storageUsed = 0;

                const documents = await knex("documents")
                    .select('*')
                    .whereIn('creatorId', userIds)
                    .whereBetween('created', [startOfDay, endOfDay]);

                for (const document of documents) {
                    let docSize = document?.size || 0;
                    const numericValue = parseFloat(docSize.toString().match(/[\d.]+/)[0]);
                    storageUsed += numericValue;
                }

                storageUsed = this.formatFileSize(storageUsed);
                const totalStorage = { used: storageUsed, limit: storageLimit };

                // Get recording data
                const limit = Number(await getAdminSetting("RECORDING_MONTHLY_LIMIT"));
                const recordingCountData = await knex("recordings")
                    .select("*")
                    .whereBetween('created', [startOfDay, endOfDay])
                    .whereIn('userId', userIds);

                let recordingDetails = { count: 0, limit };
                if (recordingCountData.length > 0) {
                    recordingDetails.count = recordingCountData.length;
                }

                // Get file upload sources for the company
                const userFileUploadSources = await knex("documents")
                    .select("source")
                    .count({ count: "source" })
                    .select(
                        knex.raw(
                            "SUM(CAST(REGEXP_REPLACE(size, '[^0-9\\.]+', '') AS DECIMAL(10,3))) AS size"
                        )
                    )
                    .whereIn('creatorId', userIds)
                    .whereBetween('created', [startOfDay, endOfDay])
                    .groupBy("source")
                    .having("count", ">", 0);

                // Get user count for the company
                const userCount = await knex('users').whereIn('id', userIds).whereBetween('created', [startOfDay, endOfDay]);
                const usersLimit = await getAdminSetting("MAX_USERS");

                // Get team count for the company
                const teamsCount = await knex('teams').where({ companyId }).whereBetween('created', [startOfDay, endOfDay]);
                const noOfUsers = { current: userCount.length, limit: parseInt(usersLimit) };
                const teamsLimit = await getAdminSetting("MAX_TEAMS");

                // Return the collected statistics
                resolve({
                    queries,
                    fileStorageSize: totalStorage,
                    recordings: recordingDetails,
                    companyFileUploadSources:userFileUploadSources,
                    noOfUsers,
                    noOfTeams: { current: teamsCount.length, limit: Number(teamsLimit) }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    getStatisticsDetailForCompanyForMonth(companyId,month,year) {
        return new Promise(async (resolve, reject) => {
            try {
                const savedData = await knex('usage_statistics').select('*').where({statId:companyId,month,year,type:"company"})
                if(savedData[0]){
                     const parsedData = JSON.parse(savedData[0].data);
                     const result ={
                        queries:parsedData.queries,
                        fileStorageSize:parsedData.fileStorageSize,
                        recordings:parsedData.recordings,
                        companyFileUploadSources:parsedData.companyFileUploadSources,
                        noOfUsers:parsedData.noOfUsers,
                        noOfTeams:parsedData.noOfTeams
                     }
                    resolve(result)
                }else{
                    const companyUsers = await this.dbConnection('user_company_role_relationship').where({ company: companyId })
                    const userIds = companyUsers.map(user => user.userId);
                    const queriesLimit = Number(await getAdminSetting("MAX_QUERY"));
                    const chatHistories = await knex('chat_histories').select("id").whereIn('userId',userIds);
                    let currentQueriesCount = 0;
                    const startOfMonth = new Date(year, month-1, 1, 0, 0, 0, 0);
                    const endOfMonth = new Date(year, month, 1, 0, 0, 0, 0); 

                    if (chatHistories.length > 0) {
                        for (let chat of chatHistories) {
                            const chatMessages = await knex('chat_messages')
                                .select("id")
                                .where({chatId: chat.id})
                                .andWhere({role: "user"})
                                .whereBetween('created', [startOfMonth, endOfMonth])
                            currentQueriesCount += chatMessages.length;
                        }
                    }
                    const queries = {current:currentQueriesCount,limit:queriesLimit}

                    const storageLimit = `${await getAdminSetting("MAX_STORAGE")} GB`;
                    let storageUsed = 0
                        const documents = await knex("documents")
                        .select('*')
                        .whereIn('creatorId', userIds)
                        .whereBetween('created', [startOfMonth, endOfMonth])
                        for (const document of documents) {
                            let docSize = document?.size || 0
                            const numericValue = parseFloat(docSize.toString().match(/[\d.]+/)[0]);
                            storageUsed = storageUsed + numericValue
                        }
                    
                    storageUsed=this.formatFileSize(storageUsed)
                    const totalStorage = { used: storageUsed, limit: storageLimit };
                    const limit = Number(await getAdminSetting("RECORDING_MONTHLY_LIMIT"));
                    const recordingCountData = await knex("recordings")
                        .select("*")
                        .whereBetween('created', [startOfMonth, endOfMonth])
                        .whereIn("userId", userIds );
                    
                    let recordingDetails = { count: 0, limit };
                    
                    if (recordingCountData[0]) {
                        recordingDetails.count = recordingCountData.length;
                    }
                    const TeamsData = await knex("teams")
                    .select("*")
                    .whereIn( "creatorId",userIds )
                    .whereBetween('created', [startOfMonth, endOfMonth]);
                    const teamsLimit = await getAdminSetting("MAX_TEAMS");
                    const noOfTeams = {current:TeamsData.length,limit:Number(teamsLimit)};
                    const companyFileUploadSources = await knex("documents")
                        .select("source")
                        .count({ count: "source" })
                        .select(
                            knex.raw(
                                "SUM(CAST(REGEXP_REPLACE(size, '[^0-9\\.]+', '') AS DECIMAL(10,3))) AS size"
                            )
                        )
                        .whereIn( "creatorId", userIds)
                        .whereBetween('created', [startOfMonth, endOfMonth])
                        .groupBy("source")
                        .having("count", ">", 0);
                        const usersData = await knex('users').select('id').whereIn("id",userIds).whereBetween('created', [startOfMonth, endOfMonth])
                        const usersLimit = await getAdminSetting("MAX_USERS");
                        const noOfUsers={current:usersData.length || 0,limit:Number(usersLimit)}
                        const currentMonth = new Date().getMonth() + 1;
                        const currentYear = new Date().getFullYear();
                        if (!(currentMonth == month && currentYear == year)){
                            await knex("usage_statistics").insert({
                            statId:companyId,
                            month,
                            year,
                            type:"company",
                            data:JSON.stringify({queries,fileStorageSize:totalStorage,recordings:recordingDetails,companyFileUploadSources,noOfTeams:noOfTeams,noOfUsers}),
                            created: new Date()
                            })
                        }
                    resolve({queries,fileStorageSize:totalStorage,recordings:recordingDetails,companyFileUploadSources,noOfUsers,noOfTeams});
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    getStatisticsDetailForUserForDate(userId, day, month, year) {
        return new Promise(async (resolve, reject) => {
            try {
                day = parseInt(day);
                month = parseInt(month);
                year = parseInt(year);

                if (isNaN(day) || isNaN(month) || isNaN(year)) {
                    return reject(new Error("Day, month, and year must be valid numbers"));
                }

                const date = new Date(year, month - 1, day); 
                if (date.getDate() !== day || date.getMonth() + 1 !== month || date.getFullYear() !== year) {
                    return reject(new Error("Invalid day, month, or year combination"));
                }

                const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0); 
                const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999); 

                const queriesLimit = Number(await getAdminSetting("MAX_QUERY"));
                const chatHistories = await knex('chat_histories').select("id").where({ userId });
                let currentQueriesCount = 0;


                if (chatHistories.length > 0) {
                    for (let chat of chatHistories) {
                        const chatMessages = await knex('chat_messages')
                            .select("id")
                            .where({ chatId: chat.id })
                            .andWhere({ role: "user" })
                            .whereBetween('created', [startOfDay, endOfDay]);
                        currentQueriesCount += chatMessages.length;
                    }
                }

                const queries = { current: currentQueriesCount, limit: queriesLimit };

                const storageLimit = `${await getAdminSetting("MAX_STORAGE")} GB`;
                let storageUsed = 0;

                const documents = await knex("documents")
                    .select('*')
                    .where({ creatorId: userId })
                    .whereBetween('created', [startOfDay, endOfDay]);

                for (const document of documents) {
                    let docSize = document?.size || 0;
                    const numericValue = parseFloat(docSize.toString().match(/[\d.]+/)[0]);
                    storageUsed += numericValue;
                }

                storageUsed = this.formatFileSize(storageUsed); 
                const totalStorage = { used: storageUsed, limit: storageLimit };

                const limit = Number(await getAdminSetting("RECORDING_MONTHLY_LIMIT"));
                const recordingCountData = await knex("recordings")
                    .select("*")
                    .whereBetween('created', [startOfDay, endOfDay])
                    .andWhere({ userId });

                let recordingDetails = { count: 0, limit };
                if (recordingCountData.length > 0) {
                    recordingDetails.count = recordingCountData.length;
                }

                const userFileUploadSources = await knex("documents")
                    .select("source")
                    .count({ count: "source" })
                    .select(knex.raw("SUM(CAST(REGEXP_REPLACE(size, '[^0-9\\.]+', '') AS DECIMAL(10,3))) AS size"))
                    .where({ creatorId: userId })
                    .whereBetween('created', [startOfDay, endOfDay])
                    .groupBy("source")
                    .having("count", ">", 0);

                const teams = await knex("teams")
                    .select("id")
                    .where({ creatorId: userId })
                    .whereBetween('created', [startOfDay, endOfDay]);
                const teamsLimit = await getAdminSetting("MAX_TEAMS");

                resolve({
                    queries,
                    fileStorageSize: totalStorage,
                    recordings: recordingDetails,
                    userFileUploadSources,
                    noOfTeams: { current: teams.length,limit: Number(teamsLimit) }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    getStatisticsDetailForUserForMonth(userId,month,year) {
        return new Promise(async (resolve, reject) => {
            try {
                const savedData = await knex('usage_statistics').select('*').where({statId:userId,month,year})
                if(savedData[0]){
                     const parsedData = JSON.parse(savedData[0].data);
                     const result ={
                        queries:parsedData.queries,
                        fileStorageSize:parsedData.fileStorageSize,
                        recordings:parsedData.recordings,
                        userFileUploadSources:parsedData.userFileUploadSources,
                        noOfTeams:parsedData.noOfTeams,
                     }
                    resolve(result)
                }else{
                    const queriesLimit = Number(await getAdminSetting("MAX_QUERY"));
                    const chatHistories = await knex('chat_histories').select("id").where({userId});
                    let currentQueriesCount = 0;
                    const startOfMonth = new Date(year, month-1, 1, 0, 0, 0, 0);
                    const endOfMonth = new Date(year, month, 1, 0, 0, 0, 0); 

                    if (chatHistories.length > 0) {
                        for (let chat of chatHistories) {
                            const chatMessages = await knex('chat_messages')
                                .select("id")
                                .where({chatId: chat.id})
                                .andWhere({role: "user"})
                                .whereBetween('created', [startOfMonth, endOfMonth])
                            currentQueriesCount += chatMessages.length;
                        }
                    }
                    const queries = {current:currentQueriesCount,limit:queriesLimit}

                    const storageLimit = `${await getAdminSetting("MAX_STORAGE")} GB`;
                    let storageUsed = 0
                        const documents = await knex("documents")
                        .select('*')
                        .where({ creatorId: userId })
                        .whereBetween('created', [startOfMonth, endOfMonth])
                        for (const document of documents) {
                            let docSize = document?.size || 0
                            const numericValue = parseFloat(docSize.toString().match(/[\d.]+/)[0]);
                            storageUsed = storageUsed + numericValue
                        }
                    
                    storageUsed=this.formatFileSize(storageUsed)
                    const fileStorageSize = { used: storageUsed, limit: storageLimit };
                    const limit = Number(await getAdminSetting("RECORDING_MONTHLY_LIMIT"));
                    const recordingCountData = await knex("recordings")
                        .select("*")
                        .whereBetween('created', [startOfMonth, endOfMonth])
                        .andWhere({ userId });
                    
                    let recordings = { count: 0, limit };
                    
                    if (recordingCountData[0]) {
                        recordings.count = recordingCountData.length;
                    }
                    const TeamsData = await knex("teams")
                    .select("*")
                    .where({ creatorId:userId })
                    .whereBetween('created', [startOfMonth, endOfMonth]);
                    const teamsLimit = await getAdminSetting("MAX_TEAMS");
                    const noOfTeams = {current:TeamsData.length,limit:Number(teamsLimit)};
                    const userFileUploadSources = await knex("documents")
                        .select("source")
                        .count({ count: "source" })
                        .select(
                            knex.raw(
                                "SUM(CAST(REGEXP_REPLACE(size, '[^0-9\\.]+', '') AS DECIMAL(10,3))) AS size"
                            )
                        )
                        .where({ creatorId: userId })
                        .whereBetween('created', [startOfMonth, endOfMonth])
                        .groupBy("source")
                        .having("count", ">", 0);
                    const currentMonth = new Date().getMonth() + 1;
                    const currentYear = new Date().getFullYear();
                    if (!(currentMonth == month && currentYear == year)){
                        await knex("usage_statistics").insert({
                            statId:userId,
                            month,
                            year,
                            type:"user",
                            data:JSON.stringify({queries,fileStorageSize,recordings,userFileUploadSources,noOfTeams:noOfTeams}),
                            created: new Date()
                        })
                    }
                    resolve({queries,fileStorageSize,recordings,userFileUploadSources,noOfTeams});
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    getStorageOccupationDetailForUser(userId) {
        return new Promise(async(resolve, reject) => {
            const team = new Team(this.dbConnection)

                    let size = 0
                        const documents = await knex("documents").select('*').where(function() {
                            this.where({ creatorId: userId });
                        });
                        for (const document of documents) {
                            let docSize = document?.size || 0
                            const numericValue = parseFloat(docSize.toString().match(/[\d.]+/)[0]);
                            size = size + numericValue
                        }
                    
                    resolve(this.formatFileSize(size))
                
        })
    }
    
    getStorageOccupationDetail(companyId) {
        return new Promise((resolve, reject) => {
            const team = new Team(this.dbConnection)

            team.getAllTeamList(companyId)
                .then(async (teamList) => {
                    let size = 0
                    for (const _team of teamList) {
                        const teamId = _team.id
                        const documents = await knex("documents").select('*').where(function() {
                            this.where({ teamId: teamId });
                        });
                        for (const document of documents) {
                            let docSize = document?.size || 0
                            const numericValue = parseFloat(docSize.toString().match(/[\d.]+/)[0]);
                            size = size + numericValue
                        }
                    }
                    resolve(this.formatFileSize(size))
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getStorageOccupationDetailWithDate(companyId) {
        return new Promise((resolve, reject) => {
            const team = new Team(this.dbConnection);
    
            team.getAllTeamList(companyId)
                .then(async (teamList) => {
                    const docBasePath = path.resolve(`${process.env.DOCUMENT_PATH}/`);
                    let storageDetails = [];
    
                    for (const _team of teamList) {
                        const uuid = await team.getTeamUUID(_team.id);
                        const folderPath = path.join(docBasePath, uuid);
    
                        if (fs.existsSync(folderPath)) {
                            const files = await fs2.readdir(folderPath);
                            for (const file of files) {
                                const filePath = path.join(folderPath, file);
                                const stat = await fs2.lstat(filePath);
                                const createdDate = _team.created;
    
                                storageDetails.push({
                                    size: stat.size,
                                    created: createdDate,
                                });
                            }
                        }
                    }
                    resolve(storageDetails)
                })
                .catch((err) => {
                    console.log(err);
                    reject(err);
                });
        });
    }

    renameTeamDirectory(teamId, newAlias) {
        return new Promise((resolve, reject) => {
            const team = new Team(this.dbConnection)
            const docBasePath = path.resolve(`${process.env.DOCUMENT_PATH}/`)

            team.getTeamAlias(teamId)
                .then(async (oldAlias) => {
                    if (oldAlias != newAlias) {
                        await fs2.rename(path.join(docBasePath, oldAlias), path.join(docBasePath, newAlias))
                        resolve(1)
                    } else {
                        resolve(1)
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    async changeExtension(filePath) {
        return filePath.replace(/\.[^/.]+$/, ".txt");
    }

    // ********************************** AI integration ***************************************************

    async createDocumentFromPDF(file, metaData, fileName, summary, overview) {
        if (!logger) {
            logger = await createLogger();
        }
        const loader = new PDFLoader(file);

        const splitter = new TokenTextSplitter({
            encodingName: "gpt2",
            chunkSize: 1000,
            chunkOverlap: 50,
        });

        const docs = await loader.loadAndSplit(splitter);

        docs.forEach(element => {
            element.metadata['fileId'] = metaData
            let _pageContent = `The content given below belongs to ${fileName} file\n`
            element.pageContent = _pageContent + element.pageContent
        });

        if(summary) {
            let pageContent = `This is the summary of ${fileName} file\n`
            pageContent = pageContent + summary
            docs.push({
                pageContent: pageContent,
                metadata: {
                    fileId: metaData
                }
            })
        }
        if(overview) {
            let pageContent = `This is the overview of ${fileName} file\n`
            pageContent = pageContent + overview
            docs.push({
                pageContent: pageContent,
                metadata: {
                    fileId: metaData
                }
            })
        }

        logger.info(JSON.stringify(docs))

        return docs;
    }

    async createDocumentFromDocx(file, metaData, fileName, summary, overview) {
        if (!logger) {
            logger = await createLogger();
        }
        const loader = new DocxLoader(file);

        const splitter = new TokenTextSplitter({
            encodingName: "gpt2",
            chunkSize: 1000,
            chunkOverlap: 50,
        });

        const docs = await loader.loadAndSplit(splitter);

        docs.forEach(element => {
            element.metadata['fileId'] = metaData
            let _pageContent = `The content given below belongs to ${fileName} file\n`
            element.pageContent = _pageContent + element.pageContent
        });

        if(summary) {
            let pageContent = `This is the summary of ${fileName} file\n`
            pageContent = pageContent + summary
            docs.push({
                pageContent: pageContent,
                metadata: {
                    fileId: metaData
                }
            })
        }
        if(overview) {
            let pageContent = `This is the overview of ${fileName} file\n`
            pageContent = pageContent + overview
            docs.push({
                pageContent: pageContent,
                metadata: {
                    fileId: metaData
                }
            })
        }

        logger.info(JSON.stringify(docs))

        return docs;
    }

    async createDocumentFromText(file, metaData, fileName, summary, overview) {
        if (!logger) {
            logger = await createLogger();
        }
        const loader = new TextLoader(file);

        const splitter = new TokenTextSplitter({
            encodingName: "gpt2",
            chunkSize: 1000,
            chunkOverlap: 50,
        });

        const docs = await loader.loadAndSplit(splitter);

        docs.forEach(element => {
            element.metadata['fileId'] = metaData
            let _pageContent = `The content given below belongs to ${fileName} file\n`
            element.pageContent = _pageContent + element.pageContent
        });

        if(summary) {
            let pageContent = `This is the summary of ${fileName} file\n`
            pageContent = pageContent + summary
            docs.push({
                pageContent: pageContent,
                metadata: {
                    fileId: metaData
                }
            })
        }
        if(overview) {
            let pageContent = `This is the overview of ${fileName} file\n`
            pageContent = pageContent + overview
            docs.push({
                pageContent: pageContent,
                metadata: {
                    fileId: metaData
                }
            })
        }

        logger.info(JSON.stringify(docs))

        return docs;
    }

    async createDocumentFromCSV(file, metaData, fileName, summary, overview) {
        if (!logger) {
            logger = await createLogger();
        }
        const loader = new CSVLoader(file);

        const splitter = new TokenTextSplitter({
            encodingName: "gpt2",
            chunkSize: 1000,
            chunkOverlap: 50,
        });

        const docs = await loader.loadAndSplit(splitter);

        docs.forEach((element, index) => {
            element.metadata['fileId'] = metaData
            let _pageContent = ""
            if (index === 0) {
                _pageContent = `The content given below belongs to ${fileName} file\n`
            }
            else {
                _pageContent = ""
            }
            element.pageContent = _pageContent + element.pageContent
        });

        if(summary) {
            let pageContent = `This is the summary of ${fileName} file\n`
            pageContent = pageContent + summary
            docs.push({
                pageContent: pageContent,
                metadata: {
                    fileId: metaData
                }
            })
        }
        if(overview) {
            let pageContent = `This is the overview of ${fileName} file\n`
            pageContent = pageContent + overview
            docs.push({
                pageContent: pageContent,
                metadata: {
                    fileId: metaData
                }
            })
        }

        logger.info(JSON.stringify(docs))

        return docs;
    }

    async createDocumentFromImage(file, metaData, fileName, summary) {
        if (!logger) {
            logger = await createLogger();
        }

        const docs = []

        if(summary) {
            let pageContent = `This is the summary of ${fileName} file\n`
            pageContent = pageContent + summary
            docs.push({
                pageContent: pageContent,
                metadata: {
                    "source": file,
                    "fileId": metaData
                }
            })
        }

        logger.info(JSON.stringify(docs))

        return docs;
    }

    async createDocumentFromVideo(file, metaData, fileName, summary, overview) {
        if (!logger) {
            logger = await createLogger();
        }

        const docs = []

        if(summary) {
            let pageContent = `This is the summary of ${fileName} file\n`
            pageContent = pageContent + summary
            docs.push({
                pageContent: pageContent,
                metadata: {
                    "source": file,
                    "fileId": metaData
                }
            })
        }

        logger.info(JSON.stringify(docs))

        return docs;
    }

    async createDocumentFromAudio(file, metaData, fileName, summary, overview) {
        if (!logger) {
            logger = await createLogger();
        }
        const docs = []

        if(summary) {
            let pageContent = `This is the summary of ${fileName} file\n`
            pageContent = pageContent + summary
            docs.push({
                pageContent: pageContent,
                metadata: {
                    "source": file,
                    "fileId": metaData
                }
            })
        }

        logger.info(JSON.stringify(docs))

        return docs;
    }

    createTempCSVFileForXLSXFile(filePath, fileName, type) {
        return new Promise(async (resolve, reject) => {
            try {
                const inputFilename = path.join(filePath, `${fileName}.${type}`)
                const outputFilename = path.resolve(`${process.env.TMP_CSV_PATH}/${fileName}.csv`)

                const workBook = XLSX.readFile(inputFilename);
                await XLSX.writeFile(workBook, outputFilename, { bookType: "csv" })
                resolve(1)
            } catch (error) {
                reject(error)
            }
        })
    }

    async buildTextFileFromString(string, userId, fileName) {
        await fsp.appendFile(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`, string)
        return path.resolve(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`)
    }

    extractTextFromDocAndCreateTextFile(filePath, userId, fileName) {
        return new Promise((resolve, reject) => {
            reader.getText(filePath)
                .then(async function (data) {
                    const folderPath = `${process.env.TMP_TXT_PATH}/` + userId
                    if (!fs.existsSync(path.resolve(folderPath))) {
                        await fs2.mkdir(folderPath)
                    }
                    await fs2.appendFile(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`, data)
                    const textFilePath = path.resolve(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`)
                    resolve(textFilePath)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    extractTextFromPPTXAndCreateTextFile(filePath, userId, fileName) {
        return new Promise((resolve, reject) => {
            officeParser.parseOffice(filePath, async function (data, err) {
                if (err) {
                    console.log(err);
                    reject(err)
                }
                const folderPath = `${process.env.TMP_TXT_PATH}/` + userId
                if (!fs.existsSync(path.resolve(folderPath))) {
                    await fs2.mkdir(folderPath)
                }
                await fs2.appendFile(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`, data)
                const textFilePath = path.resolve(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`)
                resolve(textFilePath)
            })
        })
    }

    deleteTempTextFile(userId) {
        const textFolderPath = `${process.env.TMP_TXT_PATH}/${userId}`
        fs.readdir(textFolderPath, async (err, files) => {
            if (err) reject(err);
            for (const file of files) {
                await fs2.unlink(path.join(textFolderPath, file))
            }
        })
    }

    deleteTempMediaTextFile(filePath) {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(err);
                return;
            }
        });
    }

    async saveHtmlStringToFile(uuid, fileName, htmlString) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise(async (resolve, reject) => {
            try {
                const htmlFilePath = path.join(path.resolve(process.env.DOCUMENT_PATH), uuid)
                await fs2.writeFile(path.join(htmlFilePath, `${fileName}.html`), htmlString)

                try {
                    let filePath = path.join(htmlFilePath, `${fileName}.html`)
                    if(process.env.GOOGLE_CLOUD_STORAGE == 1){
                        logger.info(`Uploading file on cloud FileId: ${fileName}.html`)
                        await storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME).upload(filePath, {
                          destination: `${fileName}.html`,
                        });
                        logger.info("Successfully uploaded file on cloud")
                    }
                  } catch (error) {
                    logger.error(error)
                    logger.error("Error uploading file on cloud")
                    logger.error(error)
                    reject(error)
                  }

                resolve(1)
            } catch (error) {
                reject(error)
            }
        })
    }

    extractTextFromHtmlStringAndCreateTextFile(htmlString, userId, fileName) {
        return new Promise(async (resolve, reject) => {
            try {
                const tmpTextFileBasePath = path.join(path.resolve(process.env.TMP_TXT_PATH), `${userId}`)
                const options = {
                    wordwrap: false
                };
                const text = convert(htmlString, options);
                const folderPath = `${process.env.TMP_TXT_PATH}/` + userId
                if (!fs.existsSync(path.resolve(folderPath))) {
                    await fs2.mkdir(folderPath)
                }
                await fs2.writeFile(path.join(tmpTextFileBasePath, `${fileName}.txt`), text)
                resolve(path.join(tmpTextFileBasePath, `${fileName}.txt`))
            } catch (error) {
                reject(error)
            }
        })
    }

    async createAndStoreEmbeddingsOnIndex(documents, namespace, fileId, fileExtension) {
        try {
        async function processEmbeddingBatch(batch, fileId, fileExtension, namespace) {
          try {
            const resultsArray = [];
            const response = await genAI.models.embedContent({
              model: "text-embedding-004",
              contents: batch.map(batchItem => ({ parts: [{ text: batchItem.content }] })),
            });

            batch.forEach((batchItem, idx) => {
              resultsArray.push({
                docid: batchItem.docid,
                namespace,
                file_id: String(fileId),
                content: batchItem.content,
                embedding: (response.embeddings[idx]?.values || []).map(Number),
                object_ref: {
                  uri: `gs://${process.env.GOOGLE_STORAGE_BUCKET_NAME}/${String(fileId)}.${String(fileExtension)}`,
                  version: "",
                  authorizer: process.env.BIGQUERY_CONNECTION_ID,
                  details: JSON.stringify({}),
                },
              });
            });
            return resultsArray;
          } catch (err) {
            console.error(`Error processing embedding batch:`, err.message);
            throw err;
          }
        }

        async function insertBigQueryBatch(batch) {
          const dataset = bigquery.dataset(process.env.BIGQUERY_DATASET_ID);
          const table = dataset.table(process.env.BIGQUERY_TABLE);
          await table.insert(batch);
        }

        const MAX_CHUNK_SIZE = 1500; 
        const BATCH_CHAR_LIMIT = 18000; 
        const allChunks = [];

        documents.forEach((doc) => {
          const content = (doc.pageContent || "").trim();
          if (!content) {
            return;
          }

          const docIdPrefix = `${namespace}_${doc.metadata?.fileId || fileId}_${doc.metadata?.source || "unknown"}`;

          for (let i = 0; i < content.length; i += MAX_CHUNK_SIZE) {
            const chunk = content.substring(i, i + MAX_CHUNK_SIZE);
            allChunks.push({
              docid: `${docIdPrefix}_chunk${Math.floor(i / MAX_CHUNK_SIZE)}`, // âœ… renamed
              content: chunk,
            });
          }
        });

        if (allChunks.length === 0) {
          console.warn("No valid chunks with content to embed.");
          return false;
        }

        const allDocIds = [];
        let currentEmbeddingBatch = [];
        let currentCharCount = 0;

        for (const chunk of allChunks) {
          if (currentCharCount + chunk.content.length > BATCH_CHAR_LIMIT) {
            if (currentEmbeddingBatch.length > 0) {
              const results = await processEmbeddingBatch(currentEmbeddingBatch, fileId, fileExtension, namespace);
              allDocIds.push(...results.map(r => r.docid));
              await insertBigQueryBatch(results);
            }
            currentEmbeddingBatch = [chunk];
            currentCharCount = chunk.content.length;
          } else {
            currentEmbeddingBatch.push(chunk);
            currentCharCount += chunk.content.length;
          }
        }

        if (currentEmbeddingBatch.length > 0) {
          const results = await processEmbeddingBatch(currentEmbeddingBatch, fileId, fileExtension, namespace);
          allDocIds.push(...results.map(r => r.docid));
          await insertBigQueryBatch(results);
        }

        const fileEmbedding = new FileEmbedding(knex);
        await fileEmbedding.createFileEmbeddingMap(fileId, allDocIds);

        return true;
      } catch (error) {
        console.error("BigQuery insert failed:", JSON.stringify(error.errors, null, 2));
        if (error.response && error.response.insertErrors) {
          console.error("Insert Errors:", JSON.stringify(error.response.insertErrors, null, 2));
        }
        throw error;
      }
    }

    removeTempCSVFile(fileName) {
        const filePath = `${process.env.TMP_CSV_PATH}`
        if (fs.existsSync(path.join(filePath, `${fileName}.csv`))) {
            fs.unlinkSync(path.join(filePath, `${fileName}.csv`))
        }
    }

    getPastMessages(chatId) {
        return new Promise((resolve, reject) => {
            const chat = new Chat(this.dbConnection)
            chat.getChatMessages(chatId)
                .then((messages) => {
                    let pastMessages = []
                    for (const message of messages) {
                        if (message.role == 'user') {
                            pastMessages.push(new HumanMessage(message.message))
                        } else if (message.role == 'bot') {
                            pastMessages.push(new AIMessage(message.message))
                        }
                    }
                    resolve(pastMessages)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    combineStrings(strList) {
        let combinedString = ""
        strList.map((str, index) => {
            if (str) {
                if (index != strList.length - 1) {
                    combinedString += str + "$$"
                } else {
                    combinedString += str
                }
            }
        })
        return combinedString
    }

    removeEmptyString(str) {
        const cleanedData = str.map((s) => {
            if (s != "") return s
        })
        return cleanedData
    }

    addDelimiterForAIResponse(response) {
        if (response) {
            const textArr = response.split('\n')
            const cleanedData = this.removeEmptyString(textArr)
            const combinedString = this.combineStrings(cleanedData)

            return combinedString
        }
        return null
    }

    getFileName(fileId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .select('name')
                .where({ id: fileId })
                .then((res) => {
                    if (res.length > 0) {
                        resolve(res[0])
                    }
                    resolve(null)
                })
                .catch((err) => {
                    console.log(err)
                })
        })
    }

    getFilePath(fileId) {
        return new Promise((resolve, reject) => {
            this.checkIfFileExists(fileId)
                .then((res) => {
                    if (res == 1) {
                        this.getPredecessorFolders(fileId)
                            .then((parentFolders) => {
                                let filePath = ""
                                parentFolders.map((fileOrFolderData, index) => {
                                    if (index != 0) {
                                        const pathEnd = index != parentFolders.length - 1 ? '/' : ''
                                        filePath += fileOrFolderData.name + pathEnd
                                    }
                                })
                                resolve(filePath)
                            })
                            .catch((err) => {
                                console.log(err)
                                reject(err)
                            })
                    } else {
                        resolve(null)
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    async extractMetadataFromDocuments(sourceData) {
        try {
            const fileList = []
            if (sourceData) {
                const citationExist = {}
                for (const document of sourceData) {
                    if (document.pageContent.length > 25) {
                        const fileId = document.metadata.fileId
                        const filePath = await this.getFilePath(fileId)
                        if (filePath && !citationExist[filePath]) {
                            fileList.push({ fileName: filePath })
                            citationExist[filePath] = true
                        }
                    }
                }
            }
            return fileList
        } catch (error) {
            console.log(error)
            return []
        }

    }

    getNonResponseIdentifiers() {
        return new Promise((resolve, reject) => {
            this.dbConnection("non-response-identifiers")
                .select('*')
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    buildRegExpFilterString() {
        return new Promise(async (resolve, reject) => {
            try {
                let filterString = ""
                const identifierList = await this.getNonResponseIdentifiers()
                identifierList.map((data, index) => {
                    const stringSuffix = index == identifierList.length - 1 ? '' : '|'
                    filterString += data.identifier + stringSuffix
                })
                resolve(filterString)
            } catch (error) {
                reject(error)
            }
        })
    }

    async isOutOfContextAnswer(aiAnswer) {
        // const superAdmin = new SuperAdmin(this.dbConnection)
        // const filterString = await superAdmin.getDataFromRedis(process.env.REDIS_IDENTIFIER_REGEX_STRING_KEY)
        let filterString = null
        if (process.env.CACHE_MODE == "1") {
            filterString = await getNonResponseIdentifiers()
        } else {
            filterString = await this.getNonResponseIdentifiers()
        }
        const regExp = new RegExp(`(?<text>${filterString})`, 'i')
        const found = aiAnswer.match(regExp)
        if (found && found.length > 0) return true
        return false
    }

    async queryIndex(uuid, parentId, chatId, question) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise(async (resolve, reject) => {
            const chat = new Chat(this.dbConnection)
            const customQuerying = new CustomQuerying(this.dbConnection)

            try {
                // const superAdmin = new SuperAdmin(this.dbConnection)
                // const settings = await superAdmin.getDataFromRedis(process.env.REDIS_SUPER_ADMIN_SETTINGS_KEY)
                // const queryType = settings['queryType']
                const queryType = await getQueryType()
                let res = null
                    console.log("Custom Query")
                    logger.info(`Querying using custom query solution`)
                    res = await customQuerying.queryIndexByCustomQuerying(question, uuid, chatId)
                

                const delimitedText = this.addDelimiterForAIResponse(res.result)
                let fileList = []
                if (!await this.isOutOfContextAnswer(res.result)) {
                    fileList = await this.extractMetadataFromDocuments(res.sourceDocuments)
                }

                logger.info(JSON.stringify(res))

                if (delimitedText) {
                    chat.addMessagesToTheChatHistory(
                        chatId,
                        delimitedText,
                        'bot',
                        parentId,
                        fileList.length > 0 ? JSON.stringify(fileList) : null
                    )
                        .then((messageId) => {
                            resolve({messageId, suggestedQuestions:res?.suggestedQuestions ?? []})
                        })
                        .catch((err) => {
                            console.log(err)
                            reject(err)
                        })
                } else {
                    const BIGQUERY_FAILURE_RESPONSE = await getAdminSetting("BIGQUERY_FAILURE_RESPONSE")
                    chat.addMessagesToTheChatHistory(chatId, BIGQUERY_FAILURE_RESPONSE, 'bot', parentId, null)
                        .then((messageId) => {
                            resolve(messageId)
                        })
                        .catch((err) => {
                            console.log(err)
                            reject(err)
                        })
                }

            } catch (error) {
                console.log(error)
                const BIGQUERY_FAILURE_RESPONSE = await getAdminSetting("BIGQUERY_FAILURE_RESPONSE")
                chat.addMessagesToTheChatHistory(chatId, BIGQUERY_FAILURE_RESPONSE, 'bot', parentId, null)
                    .then((messageId) => {
                        resolve(messageId)
                    })
                    .catch((err) => {
                        console.log(err)
                        reject(err)
                    })
            }
        })
    }

    getFilesAndFolders(teamId) {
        return new Promise((resolve, reject) => {
            const _data = this.dbConnection('documents')
                .select('*')
                .where({ teamId })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getStorageDetails(userId) {
        return new Promise((resolve, reject) => {
            const team = new Team(this.dbConnection)

            team.getTeamCount(userId)
                .then(async (teamList) => {
                    const docBasePath = path.resolve(`${process.env.DOCUMENT_PATH}/`)
                    let storageDetails = [];

                    for (const _team of teamList) {
                        const uuid = await team.getTeamUUID(_team.id)
                        const folderPath = path.join(docBasePath, uuid)
                        if (fs.existsSync(folderPath)) {
                            const files = await fs2.readdir(folderPath)
                            for (const file of files) {
                                const filePath = path.join(folderPath, file);
                                const stat = await fs2.lstat(filePath);
                                const createdDate = _team.created;
    
                                storageDetails.push({
                                    size: stat.size,
                                    created: createdDate,
                                });
                            }
                        }
                    }
                    resolve(storageDetails);
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }
}

module.exports = Documents