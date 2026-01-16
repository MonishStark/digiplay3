const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Users = require('../services/Users');
const Chat = require('../services/Chat');
const Documents = require('../services/Documents')
const Team = require('../services/Team')
const { createLogger } = require('../init/logger');
const { error } = require('winston');
dotenv.config();

const secret = process.env.ACCESS_TOKEN_SECRET;

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

let logger;

const Auth = {

    async superAdminAccess(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        user.getCompanyRoleForUser(
            request.decoded.userId,
            request.decoded.company
        )
            .then((role) => {
                if (role == 4) {
                    return next()
                } else {
                    logger.debug(JSON.stringify({ message: 'Access Denied' }))
                    return response.status(401)
                        .send({
                          success: false,
                          error: "forbidden",
                          message: "You do not have permission to access this resource",
                          details: [
                            { field: "role", issue: "SuperAdmin role required" }
                          ]
                        });
                }
            })
            .catch((err) => {
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                logger.error(err)
                return response.status(500)
                    .send({ success:false,error:"server_error", message: 'An unexpected error occured' });
            })
    },

    async verifyToken(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        logger.info(`Extracting auth token from request`)

        if (request.body?.password) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: { ...request.body, password: '**********' },
                headers: request.headers
            }
            logger.debug(JSON.stringify(debugData))
        } else if (request.body?.newPassword || request.body?.currentPassword) {
            const hashedPassword = {
                newPassword: '*********',
                currentPassword: '************'
            }
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: { ...request.body, ...hashedPassword },
                headers: request.headers
            }
            logger.debug(JSON.stringify(debugData))
        } else {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: { ...request.body },
                headers: request.headers
            }
            logger.debug(JSON.stringify(debugData))
        }
        let bearerToken = request.headers['authorization'];

        if (!bearerToken) {
            logger.warn(`No auth token present in the request`)
            return response.status(401)
                .send({
                    success:false,
                    error: "unauthorized", 
                    message: 'Missing or invalid authentication token',
                    details:[{
                        field:"Authorization",
                        issue:"Bearer token must be provided in header"
                    }]
                });
        }

        let _bearerToken = bearerToken.split(' ')
        let token = _bearerToken[1]

        logger.info(`Verifying auth token: ${token}`)
        jwt.verify(token, secret, (err, decoded) => {
            // console.log(token, err, decoded, 'token');
        });

        jwt.verify(token, secret, (err, decoded) => {
            if (err) {

                if(err.message =="jwt expired"){
                    return response.status(401)
                    .send({
                      success: false,
                      error: "unauthorized",
                      message: "Expired token provided",
                      details: [
                        { field: "Authorization", issue: "Auth token is expired" }
                    ]
                });
                }
                logger.warn('Invalid token or expired token')
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Token Invalid' }))
                return response.status(401)
                    .send({
                      success: false,
                      error: "unauthorized",
                      message: "Missing or invalid authentication token",
                      details: [
                        { field: "Authorization", issue: "Bearer token must be provided in header" }
                    ]
                });
            }
            logger.info(`Token valid`)
            request.decoded = decoded;
            return next();
        });
    },

    async isSenderOwner(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        if (request.body.userId == request.decoded.userId) {
            return next()
        } else {
            logger.debug(JSON.stringify({ message: 'Access Denied' }))
            return response.status(401)
                .send({ success:false, message: 'Access Denied' });
        }
    },

    async adminAccess(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        user.getCompanyRoleForUser(
            request.decoded.userId,
            request.decoded.company
        )
            .then((role) => {
                if (role == 1) {
                    return next()
                } else {
                    logger.debug(JSON.stringify({ message: 'Access Denied' }))
                    return response.status(401)
                        .send({
                      succesS: false,
                      error: "forbidden",
                      message: "You do not have required permission"
                    });
                }
            })
            .catch((err) => {
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                logger.error(err)
                 return response.status(500).send
                ({
                    success: false,
                    error:"server_error",
                    message: request.t("serverError")
                });
            })
    },
    async adminOrSuperAdminAccess(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        user.getCompanyRoleForUser(
            request.decoded.userId,
            request.decoded.company
        )
            .then((role) => {
                if (role == 1 || role == 4) {
                    return next()
                } else {
                    logger.debug(JSON.stringify({ message: 'Access Denied' }))
                    return response.status(401)
                        .send({
                      succesS: false,
                      error: "forbidden",
                      message: "You do not have required permission"
                    });
                }
            })
            .catch((err) => {
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                logger.error(err)
                 return response.status(500).send
                ({
                    success: false,
                    error:"server_error",
                    message: request.t("serverError")
                });
            })
    },

    async onlyAdminOrUser(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        user.getCompanyRoleForUser(
            request.decoded.userId,
            request.decoded.company
        )
            .then((role) => {
                if (role == 1 || role == 2) {
                    return next()
                } else {
                    logger.debug(JSON.stringify({ message: 'Access Denied' }))
                    return response.status(403)
                        .send({ success:false, message: 'Access Denied' });
                }
            })
            .catch((err) => {
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(401)
                    .send({ success:false, message: 'Access Denied' });
            })
    },

    async isCompanyUser(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        const companyId = request.body?.companyId || request.params?.companyId ||request.query.companyId || request.decoded?.company;
        user.getCompanyRoleForUser(
            request.decoded.userId,
            companyId
        )
            .then(async(role) => {
                if (role && role == 1 || role == 2 || role == 3) {
                    return next()
                } else {
                    const SuperRole =await user.getCompanyRoleForUser(request.decoded.userId,request.decoded?.company)
                    if(SuperRole ==4){
                        return next()
                    }
                    logger.debug(JSON.stringify({ message: 'Access Denied' }))
                    return response.status(403)
                        .send({ success:false,error: "forbidden", message: 'User does not belong to the requested company.' });
                }
            })
            .catch((err) => {
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(500).send
                ({
                    success: false,
                    error:"server_error",
                    message: request.t("serverError")
                });
            })
    },

    async isMemberOfTeam(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const team = new Team(knex)
        const user = new Users(knex)
        const teamId =request.body.teamId || request.params.teamId
        team.getCompanyIdForTeam(teamId)
            .then((companyId) => {
                user.getCompanyRoleForUser(
                    request.decoded.userId,
                    companyId
                )
                    .then((role) => {
                        if (role && role == 1 || role == 2 || role == 3) {
                            return next()
                        } else {
                            logger.debug(JSON.stringify({ message: 'Access Denied' }))
                            return response.status(401)
                                .send({ success:false, message: 'Access Denied' });
                        }
                    })
                    .catch((err) => {
                        logger.error(err)
                        logger.debug(JSON.stringify({ message: 'Access Denied' }))
                        return response.status(401)
                            .send({ success:false, message: 'Access Denied' });
                    })
            })
            .catch((err) => {
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(401)
                    .send({ success:false, message: 'Access Denied' });
            })
    },

    async isMemberOfTeamOrSharedMember(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const teamId = request.body?.teamId || request.params.teamId || request.query.teamId
        const team = new Team(knex)
        const user = new Users(knex)
        team.getCompanyIdForTeam(teamId)
            .then((companyId) => {
                user.getCompanyRoleForUser(
                    request.decoded.userId,
                    companyId
                )
                    .then((role) => {
                        if ( role == 1 || role == 2 || role == 3) {
                            return next()
                        } else if( role == 'no role') {
                            knex('shared_teams')
                                .select('*')
                                .where({sharedUserEmail:request.decoded.email})
                                .andWhere({teamId:teamId})
                                .then(res =>{
                                    
                                    if(res.length>0){
                                        return next();
                                    }else{
                                        logger.debug(JSON.stringify({ message: 'Access Denied' }))
                                        return response.status(403)
                                            .send({
                                                  success: false,
                                                  error: "forbidden",
                                                  message: "User does not have permission",
                                                  details: [
                                                    { field: "teamId", issue: "User does not have permission to access this team" }
                                                  ]
                                                });
                                    }
                                }).catch((err) => {
                                    logger.error(err)
                                    logger.debug(JSON.stringify({ message: 'Access Denied' }))
                                    return response.status(403)
                                        .send({
                                                  success: false,
                                                  error: "forbidden",
                                                  message: "User does not have permission",
                                                  details: [
                                                    { field: "teamId", issue: "User does not have permission to access this team" }
                                                  ]
                                                });
                                })
                        }
                    })
                    .catch((err) => {
                        logger.error(err)
                        logger.debug(JSON.stringify({ message: 'Access Denied' }))
                        return response.status(403)
                            .send({
                                                  success: false,
                                                  error: "forbidden",
                                                  message: "User does not have permission",
                                                  details: [
                                                    { field: "teamId", issue: "User does not have permission to access this team" }
                                                  ]
                                                });
                    })
            })
            .catch((err) => {
                console.log(err)
                logger.error(err)
                logger.debug(JSON.stringify({ success:false,message: 'Access Denied'}))
                return response.status(403)
                    .send({
                                                  success: false,
                                                  error: "forbidden",
                                                  message: "User does not have permission",
                                                  details: [
                                                    { field: "teamId", issue: "User does not have permission to access this team" }
                                                  ]
                                                });
            })
    },
    async isMemberOfTeamOrFileCreatorOfSharedTeam(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const document = new Documents(knex);
        
        let teamId = request.params?.teamId || request.body?.teamId
        const fileId = request.body?.fileId || request.params?.fileId;
        
        if(!teamId){
            const data = await document.getFileData(request.params.fileId)
            teamId = data.teamId;
            if(!teamId){
                return response.status(400).send({success:false,message:"Missing fields "})
            }
        }
        const team = new Team(knex)
        const user = new Users(knex)
        team.getCompanyIdForTeam(teamId)
            .then((companyId) => {
                user.getCompanyRoleForUser(
                    request.decoded.userId,
                    companyId
                )
                    .then((role) => {
                        if ( role == 1 || role == 2 || role == 3) {
                            return next()
                        } else if( role == 'no role') {
                            knex('shared_teams')
                                .select('*')
                                .where({sharedUserEmail:request.decoded.email})
                                .andWhere({teamId:teamId})
                                .then(res =>{
                                    
                                    if(res.length>0){
                                        knex('documents')
                                        .select('*')
                                        .where({id:fileId})
                                        .andWhere({creatorId:request.decoded.userId})
                                        .then(res =>{
                                            if(res.length>0){
                                                return next();
                                            }else{
                                                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                                                return response.status(401)
                                                .send({ success:false, message: 'Access Denied' });
                                            }
                                        }) .catch((err) => {
                                            console.log(err)
                                            logger.error(err)
                                            logger.debug(JSON.stringify({ message: 'Access Denied' }))
                                            return response.status(401)
                                                .send({ success:false, message: 'Access Denied' });
                                        })
                                        
                                    }else{
                                        logger.debug(JSON.stringify({ message: 'Access Denied' }))
                                        return response.status(401)
                                            .send({ success:false, message: 'Access Denied' });
                                    }
                                }).catch((err) => {
                                    logger.error(err)
                                    logger.debug(JSON.stringify({ message: 'Access Denied' }))
                                    return response.status(401)
                                        .send({ success:false, message: 'Access Denied' });
                                })
                        }
                    })
                    .catch((err) => {
                        logger.error(err)
                        logger.debug(JSON.stringify({ message: 'Access Denied' }))
                        return response.status(401)
                            .send({ success:false, message: 'Access Denied' });
                    })
            })
            .catch((err) => {
                console.log(err)
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(401)
                    .send({ success:false, message: 'Access Denied' });
            })
    },
    async isMemberOfTeamOrFolderCreatorOfSharedTeam(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        
        const team = new Team(knex)
        const user = new Users(knex)
        const teamId = request.body?.teamId || request.params.teamId;
        const folderId = request.body?.folderId || request.params.folderId;
        team.getCompanyIdForTeam(teamId)
            .then((companyId) => {
                user.getCompanyRoleForUser(
                    request.decoded.userId,
                    companyId
                )
                    .then((role) => {
                        if ( role == 1 || role == 2 || role == 3) {
                            return next()
                        } else if( role == 'no role') {
                            knex('shared_teams')
                                .select('*')
                                .where({sharedUserEmail:request.decoded.email})
                                .andWhere({teamId})
                                .then(res =>{
                                    
                                    if(res.length>0){
                                        knex('documents')
                                        .select('*')
                                        .where({id:folderId})
                                        .andWhere({creatorId:request.decoded.userId})
                                        .then(res =>{
                                            if(res.length>0){
                                                return next();
                                            }else{
                                                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                                                return response.status(401)
                                                .send({ success:false, message: 'Access Denied' });
                                            }
                                        }) .catch((err) => {
                                            console.log(err)
                                            logger.error(err)
                                            logger.debug(JSON.stringify({ message: 'Access Denied' }))
                                            return response.status(401)
                                                .send({ success:false, message: 'Access Denied' });
                                        })
                                        
                                    }else{
                                        logger.debug(JSON.stringify({ message: 'Access Denied' }))
                                        return response.status(401)
                                            .send({ success:false, message: 'Access Denied' });
                                    }
                                }).catch((err) => {
                                    logger.error(err)
                                    logger.debug(JSON.stringify({ message: 'Access Denied' }))
                                    return response.status(401)
                                        .send({ success:false, message: 'Access Denied' });
                                })
                        }
                    })
                    .catch((err) => {
                        logger.error(err)
                        logger.debug(JSON.stringify({ message: 'Access Denied' }))
                        return response.status(401)
                            .send({ success:false, message: 'Access Denied' });
                    })
            })
            .catch((err) => {
                console.log(err)
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(401)
                    .send({ success:false, message: 'Access Denied' });
            })
    },

    async isMemberOfTeamV2(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const team = new Team(knex)
        const user = new Users(knex)
        team.getCompanyIdForTeam(request.query.teamId)
            .then((companyId) => {
                user.getCompanyRoleForUser(
                    request.decoded.userId,
                    companyId
                )
                    .then((role) => {
                        if (role && role == 1 || role == 2 || role == 3) {
                            return next()
                        } else {
                            logger.debug(JSON.stringify({ message: 'Access Denied' }))
                            return response.status(401)
                                .send({ success:false, message: 'Access Denied' });
                        }
                    })
                    .catch((err) => {
                        logger.error(err)
                        logger.debug(JSON.stringify({ message: 'Access Denied' }))
                        return response.status(401)
                            .send({ success:false, message: 'Access Denied' });
                    })
            })
            .catch((err) => {
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(401)
                    .send({ success:false, message: 'Access Denied' });
            })
    },

    async isMemberOfTeamOrSharedMemberV2(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const team = new Team(knex)
        const user = new Users(knex)
        const teamId = request.query.teamId ||request.params.teamId || request.body.teamId
        if(!teamId){    
            return response.status(400).json({success:false,message:"Missing fields"})
        }
        team.getCompanyIdForTeam(teamId)
            .then((companyId) => {
                user.getCompanyRoleForUser(
                    request.decoded.userId,
                    companyId
                )
                    .then((role) => {
                        if ( role == 1 || role == 2 || role == 3) {
                            return next()
                        } else if( role == 'no role') {
                            knex('shared_teams')
                                .select('*')
                                .where({sharedUserEmail:request.decoded.email})
                                .andWhere({teamId:teamId})
                                .then(res =>{
                                    
                                    if(res.length>0){
                                        return next();
                                    }else{
                                        logger.debug(JSON.stringify({ message: 'Access Denied' }))
                                        return response.status(404)
                                            .send({ message: 'Access Denied' });
                                    }
                                }).catch((err) => {
                                    console.log(err)
                                    logger.error(err)
                                    logger.debug(JSON.stringify({ message: 'Access Denied' }))
                                    return response.status(404)
                                        .send({ message: 'Access Denied' });
                                })
                        }
                    })
                    .catch((err) => {
                        logger.error(err)
                        logger.debug(JSON.stringify({ message: 'Access Denied' }))
                        return response.status(404)
                            .send({ message: 'Access Denied' });
                    })
            })
            .catch((err) => {
                console.log(err)
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(404)
                    .send({ message: 'Access Denied' });
            })
    },

    async hasUserEditAccess(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        const userId = request.decoded?.userId || request.params.userId
        user.getCompanyIdForUser(userId)
            .then((companyId) => {
                user.getCompanyRoleForUser(request.decoded.userId, companyId)
                    .then((role) => {
                        if (role && role == 1) {
                            return next()
                        } else {
                            logger.debug(JSON.stringify({ message: 'Access Denied' }))
                            return response.status(401)
                                .send({ success:false, message: 'Access Denied' });
                        }
                    })
                    .catch((err) => {
                        logger.error(err)
                        logger.debug(JSON.stringify({ message: 'Access Denied' }))
                        return response.status(401)
                            .send({ success:false, message: 'Access Denied' });
                    })
            })
            .catch((err) => {
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(401)
                    .send({ success:false, message: 'Access Denied' });
            })
    },

    async isChatCreator(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const chat = new Chat(knex)
        const chatId =request.body?.chatId || request.params.chatId
        chat.getChatHistoryData(chatId)
            .then((historyData) => {
                if (historyData.userId == request.decoded.userId) {
                    return next()
                } else {
                    logger.debug(JSON.stringify({ message: 'Access Denied' }))
                    return response.status(401)
                        .send({ success:false, message: 'Access Denied' });
                }
            })
            .catch((err) => {
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(401)
                    .send({ success:false, message: 'Access Denied' });
            })
    },

    async isChatIdExist(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const chatId =request.body?.chatId || request.params.chatId 
        const chat = new Chat(knex)
        chat.doesChatIdExists(chatId)
            .then((res) => {
                if (res == 'exists') {
                    return next()
                } else {
                    return response.status(401)
                        .send({ message: 'Invalid chatId provided' });
                }
            })
            .catch((err) => {
                console.log(error)
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(401)
                    .send({ success:false, message: 'Access Denied' });
            })
    },

    async isChatIdBelongsToTeam(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const chat = new Chat(knex)
        const chatId = request.body?.chatId || request.params.chatId
        const teamId = request.body?.teamId || request.params.teamId
        chat.doesChatIdExistsInTeam(chatId, teamId)
            .then((res) => {
                if (res == 'exists') {
                    return next()
                } else {
                    return response.status(401)
                        .send({ message: 'Invalid chat details provided' });
                }
            })
            .catch((err) => {
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(401)
                    .send({ success:false, message: 'Access Denied' });
            })
    },

    async checkForDuplicateFile(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const documents = new Documents(knex)
        let parentId = request.query?.parentId || request.params?.parentId || request.query?.folderId || request.body?.parentId || 4; 
        
        request.query.parentId = parentId;
        request.params.parentId = parentId;
        const fileName = request.query?.fileName
        const teamId = request.query.teamId || request.params.teamId || request.body.teamId
        logger.info(`Check if file is duplicate`)
        console.log(parentId,null)
        if(!fileName || !teamId || !parentId){ 
            return response.status(400).json({success:false,message:"Missing fields"})
        }
        documents.checkIfFileNameExistUnderParentId(
            fileName,
            parentId,
            teamId
        )
            .then((res) => {
                if (res == 1) {
                    logger.warn(`Upload failed due to duplicate file`)
                    return response.status(409).json({success:false,message:`File ${fileName} already exists under current folder`})
                } else {
                    return next()
                }
            })
    },

    async userExists(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        const userId =request.body?.userId ||request.params?.userId || request.decoded?.userId ||request.query?.id
        user.isUserExist(userId)
        .then((res) => {
            if (res) {
                return next()
            } else {
                return response.status(404)
                .send({
                    success: false,
                    error: "not_found",
                    message: "User not found",
                })
            }
        })
        .catch((err) => {
            console.log(err)
            logger.error(err)
            logger.debug(JSON.stringify({ message: 'Access Denied' }))
            return response.status(500)
            .send({
                success: false,
                error: "server_error",
                message: "An unexpected error occurred",
                details: []
            })
        })
    },
    async validateNewPassword(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }

        const newPassword = request.body?.newPassword;

        if (!newPassword) {
            return response.status(400).send({
                success: false,
                error: "validation_error",
                message: "Validation failed",
                details: [
                    { "field": "newPassword", "issue": "Password is required" }
                ]
            });
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            return response.status(422).send({
                success: false,
                error: "validation_error",
                message: "Validation failed",
                details: [
                    { "field": "newPassword", "issue": "Password too weak" }
                ]
            });
        }

        return next();
    },
    async validateNewEmail(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }

        const newEmail = request.body?.newEmail;

        if (!newEmail) {
            return response.status(400).send({
                success: false,
                error: "validation_error",
                message: "Validation failed",
                details: [
                    { field: "newEmail", issue: "Email is required" }
                ]
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(newEmail)) {
            return response.status(400).send({
                success: false,
                error: "validation_error",
                message: "Validation failed",
                details: [
                    { field: "newEmail", issue: "Invalid email format" }
                ]
            });
        }

        return next();
    },

    async userExistsM2(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        user.isUserExist(request.decoded.userId)
            .then((res) => {
                if (res) {
                    return next()
                } else {
                    return response.status(401)
                        .send({ message: 'Invalid userId provided' });
                }
            })
            .catch((err) => {
                console.log(err)
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(401)
                    .send({ success:false, message: 'Access Denied' });
            })
    },

    async teamExists(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const team = new Team(knex)
        const teamId = request?.body?.teamId || request.params.teamId || request.query.teamId
        team.getTeam(teamId)
            .then((res) => {
                if (res.length > 0) {
                    return next()
                } else {
                    return response.status(404)
                        .send({
                                success: false,
                                error: "not_found",
                                message: "invalid fields",
                                details: [
                                  { field: "teamId", issue: "Invalid teamId provided" }
                                ]
                            });
                }
            })
            .catch((err) => {
                console.log(err)
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(401)
                    .send({ success:false, message: 'Access Denied' });
            })
    },

    async companyExist(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        const companyId =
          request?.params?.companyId  ||
           request?.body?.companyId ||
           request?.query?.companyId ||
           request?.decoded?.company ||
          null;
        user.isCompanyExist(companyId)
            .then((res) => {
                if (res) {
                    return next()
                } else {
                    return response.status(401)
                    .send({
                      success: false,
                      error: "bad_request",
                      message: "Invalid or missing fields",
                      details: [
                        { field: "companyId", issue: "Inavalid companyId is provided" }
                      ]
                    });
                }
            })
            .catch((err) => {
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(500)
                .send({
                   success: false,
                   error: "server_error",
                    message: "An unexpected error occurred"
                });
            })
    },

    async isAccountVerified(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        const userId = request.body?.userId || request.decoded.userId
        user.isAccountVerified(userId)
            .then((res) => {
                if (res == 'verified') {
                    return next()
                } else {
                    logger.debug(JSON.stringify({ message: 'Account not verified. Verify your account to modify 2FA settings' }))
                    return response.status(403)
                        .send({ success:false,
                                error: "forbidden",
                                message: 'Account not verified. Verify your account to modify 2FA settings',
                                details:[] 
                            });
                }
            })
    },

    async isUserBelongsToCompany(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const userId = request.body?.userId || request.decoded.userId 
        const company = request.body.companyId || request.params.companyId 

        const user = new Users(knex)
        user.getCompanyIdForUser(userId)
            .then((companyId) => {
                if (companyId == companyId) {
                    return next()
                } else {
                    logger.debug(JSON.stringify({ message: 'Access Denied' }))
                    return response.status(401)
                        .send({ success:false, message: 'Access Denied' });
                }
            })
            .catch((err) => {
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
                return response.status(500)
                .send({
                   success: false,
                   error: "server_error",
                    message: "An unexpected error occurred"
                });
            })
    },

    async isValidParent(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const documents = new Documents(knex)
        if (!request.body?.parentId || !request.params.parentId ) {
            return next()
        } else {
            const parentId = request.body.parentId ;
            const teamId =request.body.teamId || request.params.teamId
            documents.checkIfFolderExistsM2(parentId, teamId)
                .then((res) => {
                    console.log(res)
                    if (res == 'exists') {
                        return next()
                    } else {
                        return response.status(404)
                            .send({
                              success: false,
                              error: "not_found",
                              message: "not found",
                              details: [
                                { field: "parentId", issue: "No folder exists with this parentId" },                            
                              ]
                            });
                    }
                })
        }
    },

    async isValidFolder(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const folderId = request.body?.folderId || request.params.folderId;
        const teamId = request.body?.teamId || request.params.teamId
        const documents = new Documents(knex)
        documents.checkIfFolderExists(folderId, teamId)
            .then((res) => {
                if (res == 'exists') {
                    return next()
                } else {
                    return response.status(401)
                        .send({
                            success: false,
                            error: "not_found",
                            message: "invalid fields",
                            details: [
                                 { field: "folderId", issue: "Folder not found" }
                                ]
                            }
                        );
                    }
                }
            )
    },

    async isValidFile(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const documents = new Documents(knex)
        const fileId = request.params?.fileId || request.body?.fileId
        let parentId = request.body?.parentId || null;
        let teamId = request.body?.teamId || request.params.teamId || null;
        if(!parentId || !teamId){
        const document = new Documents(knex)
        const data = await document.getFileData(fileId)
            teamId = data.teamId;
            parentId = data.parentId;
        }
        if(!teamId || !parentId || !fileId){
            return response.status(400).send({success:false,message:"Missing fields "})
        }
        documents.checkIfFileIsValid(fileId, parentId, teamId)
            .then((res) => {
                if (res == 'exists') {
                    return next()
                } else {
                    return response.status(404)
                        .send({
                            success:false,
                            error:"not_found", 
                            message: 'not found',
                            details: [
                                { 
                                    field: "fileId", 
                                    issue: "No file exists with this fileId"
                                 }
                                ] 
                            });
                }
            })
    },

    isValidFileM2(request, response, next) {
        const documents = new Documents(knex)
        const fileId =request.params?.fileId || request.body?.fileId
        const teamId = request.query?.teamId || request.body?.teamId || request.params?.teamId
        documents.checkIfFileIsValidM2(fileId, teamId)
            .then((res) => {
                if (res == 'exists') {
                    return next()
                } else {
                    return response.status(404)
                        .send({
                              success: false,
                              error: "not_found",
                              message: "not found",
                              details: [
                                    { field: "fileId", issue: "No file exists with this fileId" }                            
                              ]
                            });
                }
            })
    },

    async isValidSenderId(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        if (request.body.senderId == request.decoded.userId) {
            return next()
        } else {
            logger.debug(JSON.stringify({ message: 'Access Denied' }))
            return response.status(401)
                .send({ success:false, message: 'Access Denied' });
        }
    },

    async isValidCreator(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        if (request.body.creatorId == request.decoded.userId) {
            return next()
        } else {
            logger.debug(JSON.stringify({ message: 'Incorrect creatorId Id provided' }))
            return response.status(401)
                .send({ message: 'Incorrect creatorId Id provided' });
        }
    },

    async isValidRole(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        if (request.body.role == 1 || request.body.role == 2 || request.body.role == 3) {
            return next()
        }
        logger.debug(JSON.stringify({ message: 'Invalid Role Id provided' }))
        return response.status(400)
            .send({
                  success: false,
                  error: "bad_request",
                  message: "Invalid or missing fields",
                  details: [
                    { "field": "role", "issue": "Role must be a valid" }
                  ]
                });
    },

    async isValidInvitationId(request, response, next) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        user.isInvitationExist(request.params.invitationId)
            .then((res) => {
                if (res == 'exists') {
                    return next()
                } else {
                    return response.status(401)
                        .send({
                          success: false,
                          error: "not_found",
                          message: "Invalid invitationId provided",
                          details: [
                            { field:"invitationId", issue: "No matching invitation exists" }
                          ]
                        });
                }
            })
            .catch((err) => {
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Access Denied' }))
               return response.status(500).send({
                               success: false,
                               error: "server_error",
                               message: request.t("serverError")
                           });
            })
    },

    isValidFileExtension(request, response, next) {
        if (
            request.body.fileType == "docx" ||
            request.body.fileType == "doc" ||
            request.body.fileType == "xlsx" ||
            request.body.fileType == "xls" ||
            request.body.fileType == "pdf" ||
            request.body.fileType == "txt" ||
            request.body.fileType == "pptx" ||
            request.body.fileType == "html" ||
            request.body.fileType == "jpeg" ||
            request.body.fileType == "jpg" ||
            request.body.fileType == "mp4" ||
            request.body.fileType == "mp3"  ||
            request.body.fileType == "mpeg" ||
            request.body.fileType == "png" ||
            request.body.fileType == "mov" 
        ) {
            return next()
        } else {
            return response.status(401)
                .send({ message: 'Invalid extension provided' });
        }
    }
};

module.exports = Auth;