const dotenv = require('dotenv');
const path = require('path')
var fs = require('fs');
const Documents = require('../services/Documents')
const Team = require('../services/Team')
const Users = require('../services/Users')
const Chat = require('../services/Chat')
dotenv.config();
const { summarizer } = require('../init/summarizer');
const axios = require('axios');
var fs2 = require('fs').promises;
const { createLogger } = require('../init/logger');
const {getAdminSetting}= require('../init/redisUtils');
const { error } = require('console');


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

class DocumentController {
  static async createNewFolder(request, response) {
    try {
      if (!logger) logger = await createLogger();

      const documents = new Documents(knex);
      const { folderName, tooltip = "", parentId = 4 } = request.body;
      const teamId = request.params.teamId

      if (!folderName || !teamId) {
        let details=[];
        if(!folderName){
          details.push({ field: "folderName", issue: "Folder name is required" })
        }else{
          details.push({ field: "teamId", issue: "teamId is required" })
        }
        return response.status(400).send({
          success: false,
          error: "bad_request",
          message: "Missing or invalid fields",
          details
        });
      }

      logger.info(`Creating new folder for team ${teamId}`);

      let created;
      try {
        created = await documents.createFolder(
          folderName,
          tooltip,
          false,
          parentId,
          teamId,
          request.decoded.userId
        );
      } catch (err) {
        logger.warn(`Folder creation failed for team ${teamId}`);
        logger.error(err);
        logger.debug(JSON.stringify({
          success: false,
          error:"server_error",
          message: "An unexpected error occurred",
        }));
        return response.status(500).send({
          success: false,
          error:"server_error",
          message: "An unexpected error occurred",
        });
      }

      logger.info(`Folder created successfully for team ${teamId}`);
      logger.info(`Fetching updated files and folders for team ${teamId}`);

      try {
        const folderId = created[0];
        let folder = await documents.getFolderData(folderId);

        delete folder.size;
        delete folder.creatorId;
        delete folder.isNotAnalyzed;
        delete folder.source;

        folder.isDefault ?folder.isDefault =true : folder.isDefault =false;

        logger.debug(JSON.stringify({
          success: true,
          message: request.t("folderCreationSuccess"),
          folder
        }));

        return response.status(201).send({
          success: true,
          message: request.t("folderCreationSuccess"),
          folder
        });

      } catch (err) {
        logger.warn(`Failed to fetch updated folder data for team ${teamId}`);
        logger.error(err);
        logger.debug(JSON.stringify({
          success: false,
          error:"server_error",
          message: "An unexpected error occurred",
        }));

        return response.status(500).send({
          success: false,
          error:"server_error",
          message: "An unexpected error occurred",
        });
      }

    } catch (error) {
      logger.error("Unexpected error in createNewFolder:", error);
      return response.status(500).send({
        success: false,
        error:"server_error",
        message: "An unexpected error occurred",
      });
    }
  }

  static async getRootFoldersForTeam(request, response) {
    if (!logger) {
      logger = await createLogger();
    }
    const documents = new Documents(knex)

    if (request.body.teamId) {
      logger.info(`Fetching root folders for team ID ${request.body.teamId}`)
      documents.getRootFolders(request.body.teamId)
        .then((_list) => {
          logger.info(`Root folders fetched successfully for team ID ${request.body.teamId}`)
          logger.debug(JSON.stringify({ success: true, filesAndFolders: _list }))
          return response.status(201)
            .send({ success: true, filesAndFolders: _list });
        })
        .catch((err) => {
          logger.warn(`Failed to fetch root folders for team ${request.body.teamId}`)
          logger.error(err)
          logger.debug(JSON.stringify({ success: false }))
          return response.status(201)
            .send({ success: false });
        })
    } else {
      logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
      return response.status(400)
        .send({ success: false, message: "Missing parameters, fill all the required fields" });
    }
  }

static async getFilesAndFoldersForTeam(request, response) {
    if (!logger) logger = await createLogger();

    const documents = new Documents(knex);
    const user = new Users(knex);

    let { teamId } = request.params;
    let { parentId, offset = 0, limit = 20, search = "" } = request.query;

    // normalize parentId
    parentId = parentId === "null" || parentId === undefined ? null : Number(parentId);
    if(parentId =="null" || !parentId ){
      parentId=4;
    }
    if (!teamId) {
        return response.status(400).send({
            success: false,
            message: "Missing parameters"
        });
    }

    try {
        logger.info(`Fetching items for parentId=${parentId} teamId=${teamId}`);

        const result = await documents.getChildFoldersAndFiles2(
            parentId,
            teamId,
            search,
            Number(offset),
            Number(limit)
        );

        const enrichedItems = [];

        for (const item of result.foldersAndFiles) {
            const userDetail = await user.getUserDetailsById(item.creatorId)
            const metaAvatar = await user.getUserMetaValue(item.creatorId, "avatarUrl");
            const avatarUrl = `${process.env.USER_PROFILE_IMAGE_URL}/${metaAvatar}`;

            const ownerName = userDetail.firstname +" "+ userDetail.lastname ;

            enrichedItems.push({
                type: item.type,
                id: item.id,
                teamId: item.teamId,
                parentId: item.parentId,
                name: item.name,
                tooltip: item.tooltip,
                isDefault: Boolean(item.isDefault),
                size: item.size ?? null,
                created: item.created,
                avatarUrl,
                ownerName,
                source: item.source || ""
            });
        }

        return response.status(200).send({
            success: true,
            message: search ? "Search results fetched successfully" : "Items fetched successfully",
            items: enrichedItems,
            pagination: result.pagination
        });

    } catch (err) {
        logger.error(err);
      console.log(err)
        return response.status(500).send({
            success: false,
            error: "server_error",
            message: "An unexpected error occurred"
        });
    }
}


  static async getChildFoldersAndFiles(request, response) {
    if (!logger) {
      logger = await createLogger();
    }
    const documents = new Documents(knex)

    if (
      request.body.parentId &&
      request.body.teamId
    ) {
      logger.info(`Fetching child folders and files for the folders ID ${request.body.parentId}`)
      documents.getChildFoldersAndFiles(request.body.parentId, request.body.teamId)
        .then((res) => {
          documents.getPredecessorFolders(request.body.parentId)
            .then((predecessFolders) => {
              logger.info(`Files and folders fetched for folder Id ${request.body.parentId}`)
              logger.debug(JSON.stringify({ success: true, filesAndFolders: res, predecessFolders }))
              return response.status(201)
                .send({ success: true, filesAndFolders: res, predecessFolders });
            })
            .catch((err) => {
              logger.info(`Failed to fetch files and folders for folder Id ${request.body.parentId}`)
              logger.error(err)
              logger.debug(JSON.stringify({ success: true, filesAndFolders: res, predecessFolders: [] }))
              return response.status(201)
                .send({ success: true, filesAndFolders: res, predecessFolders: [] });
            })
        })
        .catch((err) => {
          logger.info(`Failed to fetch files and folders for folder Id ${request.body.parentId}`)
          logger.error(err)
          logger.debug(JSON.stringify({ success: false }))
          return response.status(201)
            .send({ success: false });
        })
    } else {
      logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
      return response.status(400)
        .send({ success: false, message: "Missing parameters, fill all the required fields" });
    }
  }

  static async getPreviousFilesAndFolders(request, response) {
    if (!logger) {
      logger = await createLogger();
    }
    const documents = new Documents(knex)

    if (
      request.body.folderId &&
      request.body.teamId
    ) {
      logger.info(`Fetching child folders and files for the folders ID ${request.body.folderId}`)
      documents.getParentId(request.body.folderId)
        .then((parentId) => {
          documents.getParentId(parentId)
            .then((_parentId2) => {
              documents.getChildFoldersAndFiles(_parentId2, request.body.teamId)
                .then((res) => {
                  logger.info(`Files and folders fetched for folder Id ${request.body.folderId}`)
                  logger.debug(JSON.stringify({ success: true, filesAndFolders: res }))
                  return response.status(201)
                    .send({ success: true, filesAndFolders: res });
                })
                .catch((err) => {
                  logger.info(`Failed to fetch files and folders for folder Id ${request.body.folderId}`)
                  logger.error(err)
                  logger.debug(JSON.stringify({ success: false }))
                  return response.status(201)
                    .send({ success: false });
                })
            })
        })
    } else {
      logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
      return response.status(400)
        .send({ success: false, message: "Missing parameters, fill all the required fields" });
    }
  }

  static async deleteFolder(request, response) {
    if (!logger) {
      logger = await createLogger();
    }
    const { deletePermanently } = request.query;
    const teamId = request.params.teamId;
    const folderId = request.params.folderId;
    const documents = new Documents(knex)
    if (
      folderId &&
      teamId 
    ) {
      logger.info(`Deleting folder Id ${folderId}`)
      if(deletePermanently !== 'false' ){
      documents.deleteFolder(folderId, teamId)
        .then((res) => {
          if (res == 1) {
            logger.info(`Folder Id ${folderId} deleted`)
                  return response.status(200)
                    .send({ success: true, message: "Folder permanently deleted (including all child folders and files)" });
          }else{
            return response.status(500)
                    .send({ success: false, message: request.t('folderDeletionSuccess') });
          
          }                
                  })
        .catch((err) => {
          logger.warn(`Failed to delete the folder Id ${folderId}`)
          logger.error(err)
          logger.debug(JSON.stringify({ success: false, message: request.t('folderDeletionFailed') }))
          return response.status(201)
            .send({ success: false, message: request.t('folderDeletionFailed') });
        })
      }else{
        documents.trashFolder(folderId, teamId)
        .then((res) => {
          if (res == 1) {
            logger.info(`Folder Id ${folderId} deleted`)
                  return response.status(200)
                    .send({ success: true, message: "Folder moved to trash successfully" });
          }else{
            return response.status(500)
                    .send({ success: false, message: "Failed to move Folder to trash" });
          
          }                
                  })
        .catch((err) => {
          logger.warn(`Failed to delete the folder Id ${folderId}`)
          logger.error(err)
          logger.debug(JSON.stringify({ success: false, message: request.t('folderDeletionFailed') }))
          return response.status(201)
            .send({ success: false, message: request.t('folderDeletionFailed') });
        })
      }
    } else {
      logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
      return response.status(400)
        .send({ success: false, message: "Missing parameters, fill all the required fields" });
    }
  }

 static async deleteFile(request, response) {
  try {
    if (!logger) logger = await createLogger();
    const documents = new Documents(knex);

    const fileId = request.params?.fileId;
    let teamId = request.params?.teamId;
    let parentId = request.body?.parentId;

    // Validate required fileId
    if (!fileId) {
      logger.debug({ success: false, message: "Missing parameter: fileId" });
      return response.status(400).send({
        success: false,
        error: "bad_request",
        message: "Missing required parameter: fileId",
        details: [{ field: "fileId", issue: "fileId is required" }]
      });
    }

    // Fetch existing file data if teamId or parentId missing
    const docData = await documents.getFileData(fileId);
    if (!docData) {
      logger.warn(`File not found for fileId ${fileId}`);
      return response.status(404).send({
        success: false,
        error: "not_found",
        message: "File not found",
        details: [{ field: "fileId", issue: "No file exists with this ID" }]
      });
    }

    if (!teamId) teamId = docData.teamId;
    if (!parentId) parentId = docData.parentId;

    if (!teamId || !parentId) {
      logger.debug({ success: false, message: "Missing parameters, fill all the required fields" });
      return response.status(400).send({
        success: false,
        error: "bad_request",
        message: "Missing parameters, fill all the required fields",
        details: [
          !teamId ? { field: "teamId", issue: "teamId is required" } : null,
          !parentId ? { field: "parentId", issue: "parentId is required" } : null
        ].filter(Boolean)
      });
    }

    // Attempt to delete the file
    logger.info(`Deleting file Id ${fileId}`);
    const deleted = await documents.deleteFile(fileId, teamId);

    if (deleted === 1) {
      logger.info(`File Id ${fileId} deleted successfully`);
      logger.debug({ success: true, message: request.t('fileDeletionSuccess') });
      return response.status(200).send({
        success: true,
        message: request.t('fileDeletionSuccess')
      });
    } else {
      logger.warn(`Failed to delete the file Id ${fileId}`);
      logger.debug({ success: false, message: request.t('fileDeletionFailed') });
      return response.status(500).send({
        success: false,
        error: "internal_error",
        message: request.t('fileDeletionFailed')
      });
    }

  } catch (err) {
    console.error(err);
    logger.warn(`Error deleting file Id ${request.params.fileId}`);
    logger.error(err);
    logger.debug({ success: false, message: request.t('fileDeletionFailed') });
    return response.status(500).send({
      success: false,
      error: "internal_error",
      message: request.t('fileDeletionFailed'),
      details: [{ field: "server", issue: err.message }]
    });
  }
}


  static async getFolderData(request, response) {
    if (!logger) {
      logger = await createLogger();
    }
    const documents = new Documents(knex)

    if (request.body.folderId) {
      logger.info(`Fetching folder data for Id ${request.body.folderId}`)
      documents.getFolderData(request.body.folderId)
        .then((folderData) => {
          logger.info(`Folder data fetched successfully for ${request.body.folderId}`)
          logger.debug(JSON.stringify({ success: true, folderData }))
          return response.status(201)
            .send({ success: true, folderData });
        })
        .catch((err) => {
          logger.warn(`Failed to fetch folder data for Id ${request.body.folderId}`)
          logger.error(err)
          logger.debug(JSON.stringify({ success: false }))
          return response.status(201)
            .send({ success: false });
        })
    } else {
      logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
      return response.status(400)
        .send({ success: false, message: "Missing parameters, fill all the required fields" });
    }
  }

  static async updateFolderData(request, response) {
    if (!logger) logger = await createLogger();

    const documents = new Documents(knex);

    const folderId = request.params.folderId;
    const folderName = request.body.folderName;
    const teamId = request.params.teamId;
    const folderDescription = request.body.folderDescription;
    const details = [];

    if (!folderId) {
      details.push({ field: "folderId", issue: "Folder ID is required" });
    }

    if (!folderName && !folderDescription) {
      details.push({
        field: "folderName / folderDescription",
        issue: "At least one field is required"
      });
    }

    if (!teamId) {
      details.push({ field: "teamId", issue: "Team ID is required" });
    }

    if (details.length > 0) {
      logger.debug(JSON.stringify({ success: false, details }));
      return response.status(400).send({
        success: false,
        error: "bad_request",
        message: "Missing or invalid fields",
        details
      });
    }

    logger.info(`Updating folder data for Id ${folderId}`);
  
    try {
      const updateResult = await documents.updateFolder(folderId, folderName,folderDescription);

      if (updateResult === 1) {
        logger.info(`Folder Id ${folderId} updated successfully`);

        let folder = await documents.getFolderData(folderId);

        delete folder.size;
        delete folder.creatorId;
        delete folder.isNotAnalyzed;
        delete folder.source;

        folder.isDefault ?folder.isDefault =true : folder.isDefault =false;

        return response.status(200).send({
          success: true,
          message: request.t("folderUpdateSuccess"),
          folder
        });
      } else {
        return response.status(404).send({
          success: false,
          error: "not_found",
          message: "Folder not found"
        });
      }

    } catch (err) {
      logger.warn(`Failed to update folder`);
      logger.error(err);
      console.log(err)
      return response.status(500).send({
        success: false,
        error: "server_error",
        message: "An unexpected error has occurred"
      });
    }
  }

  static async getFile(request, response) {
    if (!logger) {
      logger = await createLogger();
    }
    const documents = new Documents(knex)

    if (
      request.params.fileId &&
      request.params.teamId 
    ) {
      logger.info(`Fetching buffer for file Id ${request.params.fileId}`)
      const mimeTypeMap = {
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'pdf': 'application/pdf',
        'txt': 'text/plain;charset=utf-8',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'html': 'text/html',
        'jpg' : "image/jpg",
        'jpeg' : "image/jpeg",
        "mp4" : "video/mp4",
        "mp3" : "video/mp3",
        "png" : "image/png",
      }

      documents.getDocumentPath(request.params.fileId, request.params.teamId)
        .then(async (res) => {
          if (res == 'file-not-found') {
            logger.warn(`File ${request.params.fileId} does not exist`)
            logger.debug(JSON.stringify({
              success: false,
              error: "not_found",
              message: "not found",
              details: [
                    { field: "fileId", issue: "No file exists with this fileId" },              
              ]
            }))
            return response.status(404)
              .send({
              success: false,
              error: "not_found",
              message: "not found",
              details: [
                    { field: "fileId", issue: "No file exists with this fileId" },              
              ]
            });
          } else if (typeof(res) == "object") {
            // use res.url for sending binary data
            const fileUrl = res.url;

            // If the URL is remote, fetch the file content
            if (fileUrl.startsWith('https')) {
              try {
                const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
                const fileBuffer = fileResponse.data;

                // Set headers and send the binary file data
                response.writeHead(200, {
                  'Content-Type': 'application/octet-stream', // Default mime type
                  'Content-Transfer-Encoding': 'Binary',
                  'Content-Length': fileBuffer.length
                });
                
                response.end(fileBuffer);
                
              } catch (error) {
                logger.error(`Error fetching file from ${fileUrl}: ${error.message}`)
                  return response.status(500)
                  .send({ success: false, message: request.t('documentFetchFailed') });
              }
            }
          }
          else {
            logger.info(`File ${request.params.fileId} exists`)
            const src = fs.createReadStream(res);
            response.writeHead(200, {
              'Content-Transfer-Encoding': 'Binary'
            });

            src.pipe(response);
          }
        })
        .catch((err) => {
          logger.warn(`Failed to fetch buffer file Id ${request.params.fileId}`)
          logger.error(err)
          logger.debug(JSON.stringify({ success: false, message: request.t('documentFetchFailed') }))
          return response.status(500)
            .send({ success: false, message: request.t('documentFetchFailed') });
        })
    } else {
      logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
      return response.status(400)
        .send({ success: false, message: "Missing parameters, fill all the required fields" });
    }
  }

  static async getFolderTreeForFile(request, response) {
    if (!logger) {
      logger = await createLogger();
    }
    const documents = new Documents(knex)
    const parentId = request.params.parentId
    if (parentId) {
      logger.info(`Fetching folder tree for ${parentId}`)
      documents.getPredecessorFolders(parentId)
        .then((predecessFolders) => {
          logger.info(`Folder tree fetched for folder Id ${parentId}`)
          logger.debug(JSON.stringify({ success: true, predecessFolders }))
          return response.status(200)
            .send({ success: true, predecessors:predecessFolders });
        })
        .catch((err) => {
          logger.error(err)
          logger.warn(`Failed to fetch folder tree for folder Id ${parentId}`)
          return response.status(500)
            .send({ success: false, predecessFolders: [] });
        })
    } else {
      logger.debug(JSON.stringify({
        success: false,
        error: "bad_request",
        message: "Invalid or missing fields",
        details: [
          { field: "parentId", issue: "parentId must be provided" }
        ]
      }))
      return response.status(400)
        .send({
        success: false,
        error: "bad_request",
        message: "Invalid or missing fields",
        details: [
          { field: "parentId", issue: "parentId must be provided" }
        ]
      });
    }
  }

  static async searchFilesAndFolder(request, response) {
    if (!logger) {
      logger = await createLogger();
    }
    const documents = new Documents(knex)

    if (request.body.teamId) {
      request.body.searchString = request.body.searchString ? request.body.searchString : ""
      logger.info(`Searching files and folders for search string ${request.body.searchString} on team Id ${request.body.teamId}`)
      documents.searchFilesAndFolders(request.body.searchString, request.body.teamId)
        .then((searchResult) => {
          logger.info(`Matching data fetched successfully for serahc string ${request.body.searchString}`)
          logger.debug(JSON.stringify({ success: true, filesAndFolders: searchResult, predecessFolders: [] }))
          return response.status(200)
            .send({ success: true, filesAndFolders: searchResult, predecessFolders: [] });
        })
        .catch((err) => {
          logger.warn(`Failed to fetch matching data for search string ${request.body.searchString}`)
          logger.error(err)
          logger.debug(JSON.stringify({ success: false }))
          return response.status(201)
            .send({ success: false });
        })
    } else {
      logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
      return response.status(400)
        .send({ success: false, message: "Missing parameters, fill all the required fields" });
    }
  }
  static async getCompanyUsageData(request, response) {
      try {
          if (!logger) {
              logger = await createLogger();
          }

          const documents = new Documents(knex);
          const users = new Users(knex);
          let { day, month, year } = request.query;

          day = day === "null" ? null : day;
          month = month === "null" ? null : month;
          year = year === "null" ? null : year;

          const { companyId } = request.params;
          if (!companyId) {
              logger.debug(
                  JSON.stringify({
                      success: false,
                      error: "bad_request",
                      message: "Invalid companyId"
                  })
              );
              return response
                  .status(400)
                  .send({ success: false, error: "bad_request", message: "Invalid companyId" });
          }

          logger.info(`Fetching company usage data for Id ${companyId}`);

          if (year && !month) {
              return response.status(400).send({
                  success: false,
                  error: "bad_request",
                  message: "Month is required when year is provided",
                  details: [{ field: "month", issue: "Month must be provided when year is specified" }]
              });
          }

          if (day && (!month || !year)) {
              return response.status(400).send({
                  success: false,
                  error: "bad_request",
                  message: "Month and year are required when day is provided",
                  details: [{ field: "month, year", issue: "Month and year must be provided when day is specified" }]
              });
          }

          if (month && !year) {
              return response.status(400).send({
                  success: false,
                  error: "bad_request",
                  message: "Year is required when month is provided",
                  details: [{ field: "year", issue: "Year must be provided when month is specified" }]
              });
          }

          if (day) {
              day = parseInt(day);
              if (isNaN(day) || day < 1 || day > 31) {
                  return response.status(400).send({
                      success: false,
                      error: "bad_request",
                      message: "Day must be a valid number between 1 and 31",
                      details: [{ field: "day", issue: "Day must be a valid number between 1 and 31" }]
                  });
              }
          }

          if (month) {
              month = parseInt(month);
              if (isNaN(month) || month < 1 || month > 12) {
                  return response.status(400).send({
                      success: false,
                      error: "bad_request",
                      message: "Month must be a valid number between 1 and 12",
                      details: [{ field: "month", issue: "Month must be a valid number between 1 and 12" }]
                  });
              }
          }

          if (year) {
              year = parseInt(year);
              if (isNaN(year) || year < 1000 || year > 9999) {
                  return response.status(400).send({
                      success: false,
                      error: "bad_request",
                      message: "Year must be a valid four-digit number",
                      details: [{ field: "year", issue: "Year must be a valid four-digit number" }]
                  });
              }
          }

          if (day && month && year) {
              const statistics = await documents.getStatisticsDetailForCompanyForDate(companyId, day, month, year);
              return response.status(200).send({ success: true, ...statistics });
          }

          if (month && year) {
                  const statistics = await documents.getStatisticsDetailForCompanyForMonth(companyId, month, year);
                  return response.status(200).send({ success: true, ...statistics });
          }

          if (!day && !month && !year) {
              const storageUsed = await documents.getStorageOccupationDetail(companyId);
              let storageLimit = await getAdminSetting("MAX_STORAGE");
              storageLimit += " GB";

              const userCount = await users.getCompanyUserCount(companyId);
              const usersLimit = await getAdminSetting("MAX_USERS");

              const now = new Date();
              const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              const startFormatted = startOfCurrentMonth.toISOString().split("T")[0];
              const endFormatted = endOfCurrentMonth.toISOString().split("T")[0];

              const recordingLimit = await getAdminSetting("RECORDING_MONTHLY_LIMIT");
              const recordingCountData = await knex("recordings")
                  .select("*")
                  .whereBetween("created", [startFormatted, endFormatted])
                  .where({ companyId });

              const recordingDetails = await (async () => {
                  if (recordingCountData[0]) {
                      return { count: recordingCountData.length, limit: Number(recordingLimit) };
                  }
                  return { count: 0, limit: Number(recordingLimit) };
              })();

              const userRoles = await users.getCompanyUserRole(companyId);
              const userIds = userRoles.map((u) => u.userId);
              const queriesLimit = await getAdminSetting("MAX_QUERY");

              const queryCounts = await knex('chat_messages as m')
                  .join('chat_histories as c', 'm.chatId', 'c.id')
                  .whereIn('c.userId', userIds)
                  .andWhere('m.created', '>=', startOfCurrentMonth)
                  .groupBy('c.userId')
                  .select('c.userId')
                  .count('m.id as messageCount');

              const queryCountMap = {};
              queryCounts.forEach((row) => {
                  queryCountMap[row.userId] = Math.floor(Number(row.messageCount) / 2);
              });

              let totalQueries = 0;

              const existingMeta = await knex('users_meta')
                  .select('userId', 'metaValue')
                  .whereIn('userId', userIds)
                  .andWhere('metaKey', 'queries');

              const metaMap = {};
              existingMeta.forEach(row => {
                  metaMap[row.userId] = parseInt(row.metaValue, 10);
              });

              const rowsToInsert = [];

              for (const userId of userIds) {
                  if (metaMap[userId] !== undefined) {
                      totalQueries += metaMap[userId];
                  } else {
                      const newCount = queryCountMap[userId] || 0;

                      rowsToInsert.push({
                          userId,
                          metaKey: 'queries',
                          metaValue: newCount
                      });

                      totalQueries += newCount;
                  }
              }

              if (rowsToInsert.length > 0) {
                  await knex('users_meta').insert(rowsToInsert);
              }

              const queries = {
                  current: totalQueries,
                  limit: Number(queriesLimit),
              };

              logger.info(`Company usage data fetched successfully for ${companyId}`);
              logger.debug(
                  JSON.stringify({
                      success: true,
                      queries,
                      fileStorageSize: { used: storageUsed, limit: storageLimit },
                      noOfUsers: { current: userCount, limit: usersLimit },
                      recordings: recordingDetails,
                  })
              );

              let teamSourceTotals = [];
              const teamSourcePromises = knex("documents")
                  .select('source')
                  .count('source as count')
                  .select(knex.raw("SUM(CAST(REGEXP_REPLACE(size, '[^0-9\\.]+', '') AS DECIMAL(10,3))) AS size"))
                  .whereIn('creatorId', userRoles.map((user) => user.userId))
                  .groupBy('source')
                  .havingRaw("count > 0");

              await teamSourcePromises
                  .then((results) => {
                      teamSourceTotals = results.map((row) => ({
                          source: row.source,
                          count: parseInt(row.count || 0),
                          size: parseFloat(row.size || 0),
                      }));
                  });
                  const teams = await knex("teams")
                    .select("id")
                    .whereIn('creatorId', userRoles.map((user) => user.userId))
                  const teamsLimit = await getAdminSetting("MAX_TEAMS");

              return response.status(200).send({
                  success: true,
                  queries,
                  fileStorageSize: { used: storageUsed, limit: storageLimit },
                  noOfUsers: { current: userCount, limit: Number(usersLimit) },
                  recordings: recordingDetails,
                  companyFileUploadSources: teamSourceTotals,
                  noOfTeams: {current:teams.length,limit:Number(teamsLimit)},
              });
          }
      } catch (err) {
          logger.warn(`Failed to fetch company usage data for Id ${request.body?.companyId}`);
          logger.error(err);
          logger.debug(JSON.stringify({ success: false, error: err.message }));
          console.log(err);
          return response.status(500).send({
              success: false,
              error: "server_error",
              message: "An unexpected error has occurred",
          });
      }
  }

   static async getCompanyData(request, response) {
  try {
    if (!logger) {
      logger = await createLogger();
    }

    const documents = new Documents(knex);
    const user = new Users(knex);
    const chat = new Chat(knex);

    const { companyId } = request.params;
    if (!companyId) {
      logger.debug(
        JSON.stringify({
          success: false,
          message: "Missing parameters, fill all the required fields",
        })
      );
      return response
        .status(400)
        .send({ success: false, message: "Missing parameters, fill all the required fields" });
    }
          const companyData = await user.getCompanyDetails(companyId);

          return response.status(201)
            .send({ success: true,message:"Company profile fetched successfully",companyData });
          }catch(err){

  }
  }

static async createTextDocument(request, response) {
  if (!logger) logger = await createLogger();
  const documents = new Documents(knex);
  const team = new Team(knex);

  try {
    const storageDetails = await documents.getStorageOccupationDetail(request.decoded.company);
    const numbers = storageDetails.match(/[0-9.]+/g).map(parseFloat);

    const maxStorageSetting = await getAdminSetting("MAX_STORAGE");
    const maxStorage = maxStorageSetting * 1024 * 1024;
    const usedStorage = numbers[0];

    const parentId = request.body.parentId || 4;
    const teamId = request.params.teamId;

    const missing = [];
    if (!request.body.fileName)
      missing.push({ field: "fileName", issue: "fileName is required" });
    if (!request.body.htmlString)
      missing.push({ field: "htmlString", issue: "htmlString is required" });
    if (!parentId)
      missing.push({ field: "parentId", issue: "parentId is required" });
    if (!teamId)
      missing.push({ field: "teamId", issue: "teamId is required" });

    if (missing.length > 0) {
      return response.status(400).send({
        success: false,
        error: "bad_request",
        message: "Missing or invalid parameters",
        details: missing
      });
    }

    if (isNaN(Number(teamId))) {
      return response.status(400).send({
        success: false,
        error: "bad_request",
        message: "Missing or invalid parameters",
        details: [{ field: "teamId", issue: "teamId must be a valid number" }]
      });
    }

    if (usedStorage > maxStorage) {
      return response.status(400).send({
        success: false,
        message: "Max Storage quota exhausted"
      });
    }

    const fileName = `${request.body.fileName}.html`;

    const exists = await documents.checkIfFileNameExistUnderParentId(
      fileName, parentId, teamId
    );

    if (exists === 1) {
      return response.status(409).send({
        success: false,
        message: `File ${fileName} already exists under current folder`
      });
    }

    const uuid = await team.getTeamUUID(teamId);

    const fileIdArr = await documents.createFile(fileName, parentId, teamId);
    const fileId = fileIdArr[0];

    const htmlFilePath = path.join(
      path.resolve(`${process.env.DOCUMENT_PATH}/${uuid}`),
      `${fileId}.html`
    );

    const saved = await documents.saveHtmlStringToFile(
      uuid, fileId, request.body.htmlString
    );

    if (saved !== 1) {
      throw new Error("Failed to save HTML file");
    }

    const tmpTextFile = await documents.extractTextFromHtmlStringAndCreateTextFile(
      request.body.htmlString,
      request.body.userId,
      fileId
    );

    const fileExists = await documents.checkIfFileExists(fileId);
    if (fileExists !== 1 || !fs.existsSync(htmlFilePath)) {
      throw new Error("HTML file does not exist");
    }

    const summary = await summarizer(
      htmlFilePath,
      fileId,
      fileName,
      request.body.userId
    );

    if (summary.success) {
      const existing = await knex("summary").where({
        fileId,
        fileName,
        teamId
      });

      if (existing.length === 0) {
        await knex("summary").insert({
          fileId,
          teamId,
          fileName,
          notes: summary.outputText,
          overview: summary.overviewOutputText,
          created: new Date()
        });
      }
    }

    const docs = await documents.createDocumentFromText(
      tmpTextFile,
      fileId,
      fileName,
      summary.outputText,
      summary.overviewOutputText
    );

    await documents.createAndStoreEmbeddingsOnIndex(
      docs,
      uuid,
      fileId
    );

    const fileStats = await fs2.stat(tmpTextFile);

    await knex("documents")
      .where({ id: fileId })
      .update({
        isNotAnalyzed: false,
        creatorId: request.decoded.userId,
        size: (fileStats.size / 1000).toFixed(2) + " kb"
      });

    await fs2.unlink(tmpTextFile);

    return response.status(201).send({
      success: true,
      message: "File created successfully, File analyzed successfully"
    });

  } catch (err) {
    console.log(err);
    logger.error(err);

    return response.status(500).send({
      success: false,
      message: "File upload failed, Failed to analyze the file"
    });
  }
}

static async updateDocument(request, response) {
  try {
    if (!logger) logger = await createLogger();

    const documents = new Documents(knex);
    const team = new Team(knex);

    const { fileName, htmlString, parentId=4 } = request.body;
    const {fileId,teamId} = request.params;
    const userId =request.decoded.userId;

    if (!fileName || !fileId || !teamId || !htmlString || !userId) {
      logger.debug({ success: false, message: "Missing parameters" });
      return response.status(400).send({
        success: false,
        error: "bad_request",
        message: "Missing or invalid parameters",
        details: [
          !fileName && { field: "fileName", issue: "fileName is required" },
          !fileId && { field: "fileId", issue: "fileId is required" },
          !teamId && { field: "teamId", issue: "teamId is required" },
          !htmlString && { field: "htmlString", issue: "htmlString is required" },
          !userId && { field: "userId", issue: "userId is required" }
        ].filter(Boolean)
      });
    }

    logger.info(`Updating ${fileName}.html file`);

    
    logger.info("Checking if new name is same as old name");
    const isSame = await documents.isFileNameSame(`${fileName}.html`, fileId);

    if (isSame !== 1) {
      logger.info(`Checking if ${fileName}.html already exists under parent`);

      const exists = await documents.checkIfFileNameExistUnderParentId(
        `${fileName}.html`,
        parentId,
        teamId
      );

      if (exists === 1) {
        return response.status(409).send({
          success: false,
          message: `File ${fileName}.html already exists under current folder`
        });
      }
    }

    logger.info(`Checking if fileId ${fileId} exists`);
    const existsInDb = await documents.checkIfFileExists(fileId);
    if (existsInDb !== 1) {
      return response.status(404).send({
        success: false,
        message: "File not found"
      });
    }

    const uuid = await team.getTeamUUID(teamId);
    const htmlFilePath = path.join(
      path.resolve(`${process.env.DOCUMENT_PATH}/${uuid}`),
      `${fileId}.html`
    );

    if (!fs.existsSync(htmlFilePath)) {
      return response.status(404).send({
        success: false,
        message: "Source file not found on server"
      });
    }

    logger.info(`Deleting old file + embeddings`);
    await fs2.unlink(htmlFilePath);
    await documents.deleteEmbeddingsById(fileId, uuid);
    await documents.deleteSummaryFromDatabase(fileId);

    const updated = await documents.updateFile(`${fileName}.html`, fileId);
    if (updated !== 1) {
      return response.status(500).send({
        success: false,
        message: "Failed to update file in database"
      });
    }

    const saved = await documents.saveHtmlStringToFile(uuid, fileId, htmlString);
    if (saved !== 1 || !fs.existsSync(htmlFilePath)) {
      return response.status(500).send({
        success: false,
        message: "Failed to write updated HTML file"
      });
    }

    logger.info(`File updated successfully on server`);
    logger.info(`Generating summary for ${fileName}.html`);

    const summary = await summarizer(htmlFilePath, fileId, `${fileName}.html`, userId);

    if (summary.success === true) {
      const existing = await knex("summary").where({
        fileId,
        fileName: `${fileName}.html`,
        teamId
      });

      if (existing.length === 0) {
        await knex("summary").insert({
          fileId,
          teamId,
          fileName: `${fileName}.html`,
          notes: summary.outputText,
          overview: summary.overviewOutputText,
          created: new Date()
        });
      }
    }

    logger.info(`Summary generated successfully`);

    const tmpTextFilePath =
      await documents.extractTextFromHtmlStringAndCreateTextFile(htmlString, userId, fileId);

    const docs = await documents.createDocumentFromText(
      tmpTextFilePath,
      fileId,
      `${fileName}.html`,
      summary.outputText,
      summary.overviewOutputText
    );

    if (docs.length === 0) {
      return response.status(500).send({
        success: false,
        message: "Document split failed"
      });
    }

    logger.info(`Document split successful. Creating embeddings...`);

    await documents.createAndStoreEmbeddingsOnIndex(docs, uuid, fileId);

    await fs2.unlink(tmpTextFilePath);

    logger.info(`Embeddings created successfully`);

    return response.status(200).send({
      success: true,
      message: "File updated successfully, File analyzed successfully"
    });

  } catch (err) {
    console.error(err);
    logger.error(err);

    return response.status(500).send({
      success: false,
      message: "Internal server error",
      error: err.message
    });
  }
}


static async changeFileName(request, response) {
  try {
    if (!logger) logger = await createLogger();
    const documents = new Documents(knex);

    const { fileId, teamId } = request.params;
    const { fileName: newFileName, parentId=4 } = request.body;

    // ---------------------------
    // Validate required fields
    // ---------------------------
    const errors = [];

    if (!newFileName || typeof newFileName !== 'string' || newFileName.trim() === '') {
      errors.push({ field: 'newFileName', issue: 'newFileName is required' });
    }

    if (!teamId || isNaN(Number(teamId))) {
      errors.push({ field: 'teamId', issue: 'teamId must be a valid number' });
    }

    // Only check parentId if it's not the root folder
    if (parentId === undefined || parentId === null) {
      errors.push({ field: 'parentId', issue: 'parentId must be provided' });
    }

    if (errors.length > 0) {
      logger.debug({ success: false, message: 'Missing or invalid parameters', details: errors });
      return response.status(400).send({
        success: false,
        error: 'bad_request',
        message: 'Missing or invalid parameters',
        details: errors
      });
    }

    logger.info(`Changing file name for fileId ${fileId}`);
    logger.info("Checking if the new name is the same as the old name");

    // ---------------------------
    // Check if filename is the same
    // ---------------------------
    const isSameName = await documents.isFileNameSame(`${newFileName}.html`, fileId);
    if (isSameName === 1) {
      logger.warn(`New name ${newFileName}.html is the same as the old name.`);
      return response.status(400).send({
        success: false,
        error: 'bad_request',
        message: 'Old filename is the same as new filename',
        details: [{ field: 'newFileName', issue: 'New filename matches the current filename' }]
      });
    }

    // ---------------------------
    // Check if file exists under parent
    // ---------------------------
    logger.info(`Checking if ${newFileName}.html already exists under parent`);
    const existsUnderParent = await documents.checkIfFileNameExistUnderParentId(
      `${newFileName}.html`,
      parentId,
      teamId
    );

    if (existsUnderParent === 1) {
      logger.warn(`${newFileName}.html already exists under the parent folder`);
      return response.status(409).send({
        success: false,
        error: 'conflict',
        message: `${newFileName}.html already exists under current folder`,
        details: [{ field: 'newFileName', issue: 'Filename already exists under parent folder' }]
      });
    }

    // ---------------------------
    // Update file in DB
    // ---------------------------
    logger.info(`Updating database information for fileId ${fileId}`);
    const name  = await documents.getFileName(fileId)
    const extension = name?.name.split('.').pop();    
    const updated = await documents.updateFile(`${newFileName}.${extension}`, fileId);

    if (updated === 1) {
      logger.info(`Filename updated successfully`);
      return response.status(200).send({
        success: true,
        message: 'Filename updated successfully'
      });
    } else {
      logger.warn(`Failed to update the filename`);
      return response.status(500).send({
        success: false,
        error: 'internal_error',
        message: 'Failed to update the filename'
      });
    }

  } catch (err) {
    console.error(err);
    logger.warn("Failed to update the filename");
    logger.error(err);
    return response.status(500).send({
      success: false,
      error: 'internal_error',
      message: 'Failed to update the filename',
      details: [{ field: 'server', issue: err.message }]
    });
  }
}


}

module.exports = DocumentController