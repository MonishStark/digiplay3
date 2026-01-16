const SuperAdmin = require('../services/SuperAdmin')
const dotenv = require('dotenv');
const { loadDataToRedis, getAdminSetting } = require('../init/redisUtils')
dotenv.config();
const { Storage } = require('@google-cloud/storage');
const { createLogger } = require('../init/logger');
const Users = require('../services/Users');
const Documents = require('../services/Documents');

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

class SuperAdminController {

    static async getRoles(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const superAdmins = new SuperAdmin(knex)
        superAdmins.getUserRole(request.params.userId)
            .then((res) => {
                if (res == 4) {
                    logger.info('Fetching super admin role');
                    response.status(200).send({
                                               success: true,
                                               userId: request.params.userId,
                                               isSuperAdmin: true
                                             })
                } else {
                    logger.error('Error fetching super admin role');
                    response.status(403).send({
                                               success: true,
                                               userId: request.params.userId,
                                               isSuperAdmin: false
                                             })
                }
            })
            .catch((err) => {
                logger.error('Error fetching user role:', err);
                response.status(500).send('Internal Server Error');
            })
    }

    static async getENV(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const superAdmins = new SuperAdmin(knex)
        superAdmins.getAdminENV()
            .then((env) => {
                logger.info('Fetching super admin settings');
                return response.status(201)
                    .send({ success: true, env });
            })
            .catch((err) => {
                logger.error('Error fetching super admin settings', err);
                return response.status(201)
                    .send({ success: false });
            })
    }

    static async getEmailTemplates(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const superAdmins = new SuperAdmin(knex)
        superAdmins.getAllEmailTemplates()
            .then((res) => {
                logger.info('Fetching email template');
                return response.status(200)
                    .send({ success: true, templates: res });
            })
            .catch((err) => {
                logger.error('Error fetching email template', err);
                return response.status(500)
                    .send({ success: false,error:'server_error', message: 'An unexpected error occured' });
            })
    }

    static async updateTemplate(request, response) {
        if (!logger) {
        logger = await createLogger();
        }

        const superAdmins = new SuperAdmin(knex);

        const { templateId } = request.params;
        const { subject, template, fileName } = request.body;

        let updateFields = {};

        if (subject) updateFields.subject = subject;
        if (template) updateFields.template = template;
        if (fileName) updateFields.name = fileName;

        if (Object.keys(updateFields).length === 0) {
            return response.status(400).send({ success: false, message: 'No fields provided to update.' });
        }

        try {
            await superAdmins.updateEmailTemplate(templateId, updateFields);
            logger.info('Updating email template');
            return response.status(200).send({ success: true, message: 'Email template updated successfully',templateId  });
        } catch (err) {
            logger.error('Error updating email template', err);
            return response.status(500).send({ success: false, message: 'Error updating email template' });
        }
    }

    static async getUserUsageDataForSuperAdmin(request, response) {
      try {
        if (!logger) {
          logger = await createLogger();
        }
    
        const user = new Users(knex);
        const document = new Documents(knex);
        const userId = request.params.userId;
        let { day, month, year } = request.query;
        const userExists =await user.isUserExist(userId)
        if(!userExists){
          return response.status(404).send({
            success: false,
            error: "not_found",
            message: "User not found"
          })
        } 
    
        if (day === "null") day = null;
        if (month === "null") month = null;
        if (year === "null") year = null;
    
        if (!userId) {
          logger.debug(JSON.stringify({
            success: false,
            message: "Missing parameters, fill all the required fields"
          }));
          return response.status(404).send({
            success: false,
            error: "not_found",
            message: "User not found",
            details: []
          });
        }
        if (day && (!month || !year)) {
            const details = [];
            if(!month){
                details.push({ field: "month", issue: "Month must be provided when day is specified" })
            }if(!year){
                details.push( { field: "year", issue: "Year must be provided when day is specified" })
            }
                      return response.status(400).send({
                          success: false,
                          error: "bad_request",
                          message: "Month and year are required when day is provided",
                          details
                      });
                  }
    
        if (day && month && year) {
          day = parseInt(day);
          month = parseInt(month);
          year = parseInt(year);
        
          if (isNaN(day) || isNaN(month) || isNaN(year)) {
            return response.status(400).send({
              success: false,
              error: "bad_request",
              message: "Day, month, and year must be valid numbers"
            });
          }
      
          const date = new Date(year, month - 1, day); 
          if (date.getDate() !== day || date.getMonth() + 1 !== month || date.getFullYear() !== year) {
            return response.status(400).send({
              success: false,
              error: "bad_request",
              message: "Invalid day, month, or year combination"
            });
          }
      
          const statistics = await document.getStatisticsDetailForUserForDate(userId, day, month, year);
          return response.status(200).send({ success: true, ...statistics });
        }
        if (month && !year) {
                      return response.status(400).send({
                          success: false,
                          error: "bad_request",
                          message: "Year is required when month is provided",
                          details: [{ field: "year", issue: "Year must be provided when month is specified" }]
                      });
                  }
    
        if (month && year) {
          month = parseInt(month);
          year = parseInt(year);
        
          if (isNaN(month) || isNaN(year)) {
            return response.status(400).send({
              success: false,
              error: "bad_request",
              message: "Month and year must be valid numbers"
            });
          }
      
          const statistics = await document.getStatisticsDetailForUserForMonth(userId, month, year);
          return response.status(200).send({ success: true, ...statistics });
        }
    
        if (!day && !month && !year) {
          const userFileUploadSources = await knex("documents")
            .select("source")
            .count({ count: "source" })
            .select(
              knex.raw(
                "SUM(CAST(REGEXP_REPLACE(size, '[^0-9\\.]+', '') AS DECIMAL(10,3))) AS size"
              )
            )
            .where({ creatorId: userId })
            .groupBy("source")
            .having("count", ">", 0);
        
          const queriesLimit = Number(await getAdminSetting("MAX_QUERY"));
          let currentQueriesCount = 0;
        
          const hasMetaKey = await user.checkMetaKeyExists(userId, "queries");
          if (hasMetaKey?.length) {
            const userMetaQueryCount = await user.getUserMetaValue(userId, "queries");
            currentQueriesCount += parseInt(userMetaQueryCount, 10);
          } else {
            await user._addUserMeta(userId, "queries", 0);
            currentQueriesCount += 0;
          }
      
          const queries = { current: currentQueriesCount, limit: queriesLimit };
      
          const limit = Number(await getAdminSetting("RECORDING_MONTHLY_LIMIT"));
          const recordingCountData = await knex("recordings")
            .select("*")
            .where({ userId });
      
          let recordingDetails = { count: 0, limit };
      
          if (recordingCountData.length > 0) {
            recordingDetails.count = recordingCountData.length;
          }
      
          const TeamsData = await knex("teams")
            .select("*")
            .where({ creatorId: userId });
          const teamsLimit = await getAdminSetting("MAX_TEAMS");
      
          const storageUsed = await document.getStorageOccupationDetailForUser(userId);
          const storageLimit = `${await getAdminSetting("MAX_STORAGE")} GB`;
      
          const totalStorage = { used: storageUsed, limit: storageLimit };
      
          const statisticsDetails = {
            queries,
            fileStorageSize: totalStorage,
            recordings: recordingDetails,
            userFileUploadSources,
            noOfTeams: { current: TeamsData.length,limit: Number(teamsLimit) },
          };
      
          logger.info("Statistics fetched successfully");
          return response.status(200).send({
            success: true,
            ...statisticsDetails
          });
        }
      } catch (error) {
        console.log(error);
        logger.error("Error fetching user usage data", error);
        return response.status(500).send({
          success: false,
          error: "server_error",
          message: "An unexpected error occurred",
          details: []
        });
      }
    }


    static async getCompanyUsageDataForSuperAdmin(request, response) {
        try {
          if (!logger) {
            logger = await createLogger();
          }

          const documents = new Documents(knex);
          const users = new Users(knex);
          let { day, month, year } = request.query;

          if (day === "null") day = null;
          if (month === "null") month = null;
          if (year === "null") year = null;

          const { companyId } = request.params;
          if (!companyId) {
            logger.debug(
              JSON.stringify({
                success: false,
                error: "bad_request",
                message: "Invalid companyId",
              })
            );
            return response.status(400).send({
              success: false,
              error: "bad_request",
              message: "Invalid companyId",
            });
          }
          const companyExist =await users.isCompanyExist(companyId)
          if(!companyExist){
                return response.status(404).send({
                  success: false,
                  error: "not_found",
                  message: "Company not found"
                })
          } 
          logger.info(`Fetching company usage data for Id ${companyId}`);

          if (day && month && year) {
            day = parseInt(day);
            month = parseInt(month);
            year = parseInt(year);

            if (isNaN(day) || isNaN(month) || isNaN(year)) {
              return response.status(400).send({
                success: false,
                error: "bad_request",
                message: "Day, month, and year must be valid numbers",
              });
            }

            const date = new Date(year, month - 1, day);
            if (date.getDate() !== day || date.getMonth() + 1 !== month || date.getFullYear() !== year) {
              return response.status(400).send({
                success: false,
                error: "bad_request",
                message: "Invalid day, month, or year combination",
              });
            }

              const statistics = await documents.getStatisticsDetailForCompanyForDate(companyId, day, month, year);
              return response.status(200).send({ success: true, ...statistics });
            
          }

          if (month && year) {
            month = parseInt(month);
            year = parseInt(year);

            if (isNaN(month) || isNaN(year)) {
              return response.status(400).send({
                success: false,
                error: "bad_request",
                message: "Month and year must be valid numbers",
              });
            }

            
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

            const recordingDetails = { count: recordingCountData.length, limit: Number(recordingLimit) };

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

            const teams = await knex('teams').select("id").where({ companyId });
            const teamsLimit = await getAdminSetting("MAX_TEAMS");

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

            return response.status(200).send({
              success: true,
              queries,
              fileStorageSize: { used: storageUsed, limit: storageLimit },
              noOfUsers: { current: userCount, limit: parseInt(usersLimit) },
              recordings: recordingDetails,
              companyFileUploadSources: teamSourceTotals,
              noOfTeams: { current: teams.length,limit: Number(teamsLimit) },
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


    static async deleteUser(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        
        const userId = request.body.id;
        try {
            // Start a transaction to ensure all operations are atomic
            await knex.transaction(async (trx) => {
                 // Check if the user exists
                const user = await trx('users')
                .where({ id: userId })
                .first();

                if (!user) {
                logger.info(`User with ID ${userId} does not exist.`);
                return response.status(200)
                    .send({ success: false, message: "Something went wrong"})
                }

                // Handle chat_histories where the userId matches
                const chatHistories = await trx('chat_histories')
                .where({ userId });
                
                if (chatHistories.length > 0) {
                    for (const chat_messages of chatHistories) {
                        await trx('chat_messages')
                            .where({ chatId: chat_messages.id })
                            .del();
                        await trx('tokens_used')
                            .where({ chatId: chat_messages.id })
                            .del();
                    }
                    
                    await trx('chat_histories')
                        .where({ userId })
                        .del();
                }

                // Handle documents where the teamId matches
                // (Assuming documents have teamId referencing teams)
                const teams = await trx('teams')
                .where({ creatorId: userId });

                for (const team of teams) {
                    const files = await trx("documents").where({ teamId: team.id, type: 'file' })

                    if(files.length > 0) {
                        for(const file of files) {
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
                            }

                            await trx("file_embedding")
                                .where({ fileId: file.id })
                                .del()
                        }
                    }

                    await trx('documents')
                        .where({ teamId: team.id })
                        .del();

                    await trx('summary')
                        .where({ teamId: team.id })
                        .del();
                }

                // Handle companies where the adminId matches
                const companies = await trx('companies')
                .where({ adminId: userId });

                if (companies.length > 0) {
                    for (const company of companies) {
                        await trx("companies_meta")
                        .where({ companyId: company.id })
                        .del()
                    }

                    await trx('companies')
                        .where({ adminId: userId })
                        .del();

                }

                // Handle invitations where the userId or sender matches
                const invitations = await trx('invitations')
                .where({ userId })
                .orWhere({ sender: userId });

                if (invitations.length > 0) {
                await trx('invitations')
                    .where({ userId })
                    .orWhere({ sender: userId })
                    .del();
                }

                // Handle subscriptions where the userId matches
                const subscriptions = await trx('subscriptions')
                .where({ userId });

                if (subscriptions.length > 0) {
                await trx('subscriptions')
                    .where({ userId })
                    .del();
                }

                // Handle users_meta where the userId matches
                const usersMeta = await trx('users_meta')
                .where({ userId });

                if (usersMeta.length > 0) {
                await trx('users_meta')
                    .where({ userId })
                    .del();
                }

                // Handle user_company_role_relationship where the userId matches
                const userCompanyRoleRelationship = await trx('user_company_role_relationship')
                .where({ userId });

                if (userCompanyRoleRelationship.length > 0) {
                await trx('user_company_role_relationship')
                    .where({ userId })
                    .del();
                }

                // Finally, delete the user
                await trx('users')
                .where({ id: userId })
                .del();

              logger.info(`User with ID ${userId} deleted successfully.`);
              return response.status(200)
                    .send({ success: true , message: `Successfully deleted User's account` })
            });
          } catch (error) {
            console.log(error)
            logger.error(`Error deleting user with ID ${userId}:`, error);
            return response.status(200)
            .send({ success: false, message: "Something went wrong"})
          } 
    }

    static async deleteTeamAccount(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        
        const companyId = request.params.companyId;
        logger.info(`Deleting team account with Id ${companyId}`)
        try {
            const users = new Users(knex)
            const companyExist = await users.isCompanyExist(companyId)
            if(!companyExist){
                return response.status(404).send({
                  success: false,
                  error: "not_found",
                  message: "Company not found"
                })
            }
            // Start a transaction to ensure all operations are atomic
            await knex.transaction(async (trx) => {
                 // Check if the user exists
                 const companiess = await trx('user_company_role_relationship')
                 .where({ company: companyId });

                let userIds = []
                 companiess.map((company) => {
                    userIds.push(company.userId)
                 })

                for(const userId of userIds) {

                    const user = await trx('users')
                    .where({ id: userId })
                    .first();
    
                    if (!user) {
                    console.log(`User with ID ${userId} does not exist.`);
                    return response.status(200)
                        .send({ success: false, message: "Something went wrong"})
                    }
    
                    // Handle chat_histories where the userId matches
                    const chatHistories = await trx('chat_histories')
                    .where({ userId });
                    
                    if (chatHistories.length > 0) {
                        for (const chat_messages of chatHistories) {
                            await trx('chat_messages')
                                .where({ chatId: chat_messages.id })
                                .del();
                            await trx('tokens_used')
                                .where({ chatId: chat_messages.id })
                                .del();
                        }
                        
                        await trx('chat_histories')
                            .where({ userId })
                            .del();
                    }
    
                    // Handle documents where the teamId matches
                    // (Assuming documents have teamId referencing teams)
                    const teams = await trx('teams')
                    .where({ creatorId: userId });
    
                    for (const team of teams) {
                        await trx('chat_histories')
                        .where({ teamId: team.id })
                        .del();
                        
                        const files = await trx("documents").where({ teamId: team.id, type: 'file' })
    
                        if(files.length > 0) {
                            for(const file of files) {
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
                                }
                                await trx("file_embedding")
                                    .where({ fileId: file.id })
                                    .del()
                            }
                        }
    
                        await trx('documents')
                            .where({ teamId: team.id })
                            .del();
    
                        await trx('summary')
                            .where({ teamId: team.id })
                            .del();
                    }
    
                    // Handle companies where the adminId matches
                    const companies = await trx('companies')
                    .where({ adminId: userId });
    
                    if (companies.length > 0) {
                        for (const company of companies) {
                            await trx("companies_meta")
                            .where({ companyId: company.id })
                            .del()
                        }
    
                        await trx('companies')
                            .where({ adminId: userId })
                            .del();
    
                    }
    
                    // Handle invitations where the userId or sender matches
                    const invitations = await trx('invitations')
                    .where({ userId })
                    .orWhere({ sender: userId });
    
                    if (invitations.length > 0) {
                    await trx('invitations')
                        .where({ userId })
                        .orWhere({ sender: userId })
                        .del();
                    }
    
                    // Handle subscriptions where the userId matches
                    const subscriptions = await trx('subscriptions')
                    .where({ userId });
    
                    if (subscriptions.length > 0) {
                    await trx('subscriptions')
                        .where({ userId })
                        .del();
                    }
    
                    // Handle users_meta where the userId matches
                    const usersMeta = await trx('users_meta')
                    .where({ userId });
    
                    if (usersMeta.length > 0) {
                    await trx('users_meta')
                        .where({ userId })
                        .del();
                    }
    
                    // Handle user_company_role_relationship where the userId matches
                    const userCompanyRoleRelationship = await trx('user_company_role_relationship')
                    .where({ userId });
    
                    if (userCompanyRoleRelationship.length > 0) {
                    await trx('user_company_role_relationship')
                        .where({ userId })
                        .del();
                    }
    
                    // Finally, delete the user
                    await trx('users')
                    .where({ id: userId })
                    .del();
    
                  logger.info(`User with ID ${userId} deleted successfully.`);
                }    

                logger.info(`Successfully Deleted team account of Id ${companyId}`)
              return response.status(200)
                    .send({ success: true , message: `Company account and all associated users and data deleted successfully` })
            });
          } catch (error) {
            console.log(error)
            logger.error(`Error deleting team account with ID ${request.params.companyId}`);
            logger.error(error)
            return response.status(200)
            .send({ success: false, message: "Something went wrong"})
          } 
    }

    static async updateENV(request, response) { 
    if (!logger) {
        logger = await createLogger();
    }

    const superAdmins = new SuperAdmin(knex);
    
    superAdmins.updateAdminENV(request.body)
        .then(async (env) => {
            // Extract updated keys from the request body or from the response object
            const updatedKeys = Object.keys(request.body);

            if (process.env.CACHE_MODE == '1') {
                console.log('Resetting cache');
                logger.info('Resetting cache, Update super admin settings');
                await loadDataToRedis();
            }

            logger.info('Updating super admin settings');

            return response.status(200).send({
                success: true,
                message: 'Environment settings updated successfully',
                updatedKeys: updatedKeys
            });
        })
        .catch((err) => {
            logger.error('Error updating super admin settings', err);
            return response.status(201).send({
                success: false,
                message: 'Failed to update environment settings'
            });
        });
}

}

module.exports = SuperAdminController