const dotenv = require('dotenv');
const Chat = require('../services/Chat')
const Documents = require('../services/Documents')
const Team = require('../services/Team')
const { getAdminSetting } = require('../init/redisUtils')
const Users = require('../services/Users');
const { createLogger } = require('../init/logger');
dotenv.config();

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

class ChatController {
    static async createNewChat(request, response) {
        if (!logger) {
            logger = await createLogger();
        }

        const chat = new Chat(knex);

        const { teamId } = request.params;
        if (!teamId) {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }));
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }

        const userId = request.decoded.userId;
        logger.info(`Creating new chat for user Id ${userId}`);

        try {
            const DEFAULT_CHAT_NAME = await getAdminSetting('DEFAULT_CHAT_NAME');

            const chatId = await chat.createNewChat(
                DEFAULT_CHAT_NAME, 
                userId, 
                teamId,
                request.body.scope,
                request.body.resourceId
            );

            const newChat = {
                id: chatId,
                scope: request.body.scope,
                resourceId: request.body.resourceId,
                teamId,
                name: DEFAULT_CHAT_NAME,
                created: new Date(),
            };

            logger.info(`New chat created for user Id ${userId}`);
            logger.info(`Fetching updated chat histories for user Id ${userId}`);
            logger.info(`Updated chat histories fetched for user Id ${userId}`);
            logger.debug(JSON.stringify({ success: true }));

            return response.status(201).send({ success: true, chat: newChat });
        } catch (err) {
            console.log(err);
            logger.warn(`Failed to create new chat for user Id ${userId}`);
            logger.debug(JSON.stringify({ success: false }));
            return response.status(500).send({ success: false });
        }
    }

    static async getChatHistoriesForUserBySpecificScope(request, response) {
        if (!logger) {
            logger = await createLogger(); 
        }        
        const chat = new Chat(knex)
        if (
            request.decoded.userId &&
            request.params.teamId
        ) {
            logger.info(`Fetching chat histories for user Id ${request.decoded.userId}`)
            chat.getChatHistoriesForUserBySpecificScope(request.decoded.userId, request.params.teamId,request.query.resourceId,request.query.scope,request.query.search)
                .then((userChatHistories) => {
                    logger.info(`Chat histories fetched successfully for user Id ${request.decoded.userId}`)
                    logger.debug(JSON.stringify({ success: true, userChatHistories }))
                    return response.status(200)
                        .send({ success: true, userChatHistories });
                })
                .catch((err) => {
                    console.log(err)
                    logger.warn(`Failed fecth chat histories for user Id ${request.body.userId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false }))
                    return response.status(500)
                        .send({ success: false });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(500)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

static async addMessageToConversation(request, response) {
    const sendError = (res, status, error, message, details = []) => {
        return res.status(status).json({ success: false, error, message, details });
    };

    try {
        if (!logger) {
            logger = await createLogger();
        }

        const chat = new Chat(knex);
        const documents = new Documents(knex);
        const team = new Team(knex);
        const user = new Users(knex);

        const { message, role = 'user' } = request.body;
        const userId = request.decoded?.userId;
        const { chatId, teamId } = request.params;

        const missingFields = [];
        if (!message) missingFields.push({ field: 'message', issue: 'This field is required' });
        if (!chatId) missingFields.push({ field: 'chatId', issue: 'This field is required' });
        if (!teamId) missingFields.push({ field: 'teamId', issue: 'This field is required' });
        if (!userId) missingFields.push({ field: 'userId', issue: 'This field is required' });

        if (missingFields.length > 0) {
            return sendError(response, 400, 'bad_request', 'Missing or invalid fields', missingFields);
        }

        const userRoles = await user.getCompanyUserRole(request.decoded.company);
        const userIds = userRoles.map(u => u.userId);
        let totalQueries = 0;
        for (const uid of userIds) {
            try {
                const chatHistories = await chat.getChatHistoriesByUser(uid);
                
                const chatIds = chatHistories.map(c => c.id);

                let usedQueries = 0;
                for (const cid of chatIds) {
                    const messages = await chat.getChatMessages(cid);
                    const currentMonthMessages = messages.filter(msg => {
                        const msgDate = new Date(msg.created);
                        const now = new Date();
                        return msgDate.getMonth() === now.getMonth() && msgDate.getFullYear() === now.getFullYear();
                    });
                    usedQueries += Math.floor(currentMonthMessages.length / 2);
                }

                const metaExists = await user.checkMetaKeyExists(uid, 'queries');
                if(uid == userId){
                if (!metaExists?.length) {
                    await user._addUserMeta(uid, 'queries', usedQueries);
                } else {
                    await user.updateUserMetaQueries(uid);
                }
            }
                const metaCount = await user.getUserMetaValue(uid, 'queries');
                totalQueries += parseInt(metaCount);

            } catch (err) {
                logger.error(`Error calculating queries for user ${uid}:`, err);
            }
        }

        const maxQueries = parseInt(await getAdminSetting("MAX_QUERY"));
        if (totalQueries > maxQueries) {
            return sendError(response, 405, 'bad_request', 'You have reached maximum number of queries.');
        }

        const parentId = await chat.addMessagesToTheChatHistory(chatId, message, role, null);

        const aiDisabled =
            String(process.env.DISABLE_AI || '').toLowerCase() === '1' ||
            String(process.env.DISABLE_AI || '').toLowerCase() === 'true';

        if (aiDisabled) {
            const assistantMessageId = await chat.addMessagesToTheChatHistory(
                chatId,
                'AI is disabled.',
                'assistant',
                parentId
            );
            const assistantMessage = await chat.getChatMessageById(assistantMessageId);
            if (!assistantMessage) {
                return sendError(response, 500, 'server_error', 'Failed to create AI stub answer');
            }
            assistantMessage.showFullCitation = false;
            assistantMessage.replyTo = parentId || null;

            return response
                .status(200)
                .json({ success: true, messageData: assistantMessage, suggestedQuestions: [] });
        }

        const teamUUID = await team.getTeamUUID(teamId);

        const { messageId, suggestedQuestions } = await documents.queryIndex(teamUUID, parentId, chatId, message);
        const _message = await chat.getChatMessageById(messageId);
        if (!_message) {
            return sendError(response, 500, 'server_error', 'Failed to retrieve AI answer');
        }

        _message.showFullCitation = false;
        _message.replyTo = parentId || null;

        return response.status(201).json({ success: true, messageData: _message, suggestedQuestions });

    } catch (err) {
        console.log(err)
        logger.error('Unexpected server error:', err);
        return sendError(response, 500, 'server_error', 'An unexpected error occurred');
    }
}

static async retrieveChatMessages(request, response) {
    if (!logger) {
        logger = await createLogger(); 
    }

    const chat = new Chat(knex);

    const chatId = request.params.chatId;
    const before = request.query.before || null;
    const limit = parseInt(request.query.limit) || 50;

    if (!chatId) {
        logger.debug(JSON.stringify({ 
            success: false, 
            message: "Missing chatId parameter" 
        }));
        return response.status(400).send({
            success: false, 
            message: "Missing parameters, fill all the required fields"
        });
    }

    logger.info(`Fetching chat messages for chatId ${chatId}, before=${before}, limit=${limit}`);

    try {
        const _chatMessages = await chat.getChatMessages(chatId, before, limit);

        const chatMessages = _chatMessages.map(msg => ({
            ...msg,
            showFullCitation: false
        }));

        logger.info(`Chat messages fetched successfully for chatId ${chatId}`);
        logger.debug(JSON.stringify({ success: true, chatMessages }));

        return response.status(200).send({ success: true, chatMessages });

    } catch (err) {
        logger.error(err);
        logger.warn(`Failed to fetch messages for chatId ${chatId}`);

        return response.status(500).send({ success: false });
    }
}


    static async getChatHistoriesForUserByTeam(request, response) {
        if (!logger) {
            logger = await createLogger(); 
        }
        const chat = new Chat(knex)

        if (
            request.body.userId &&
            request.body.teamId
        ) {
            logger.info(`Fetching chat histories for user Id ${request.body.userId}`)
            chat.getChatHistoriesForUserByTeam(request.body.userId, request.body.teamId)
                .then((userChatHistories) => {
                    logger.info(`Chat histories fetched successfully for user Id ${request.body.userId}`)
                    logger.debug(JSON.stringify({ success: true, userChatHistories }))
                    return response.status(201)
                        .send({ success: true, userChatHistories });
                })
                .catch((err) => {
                    console.log(err)
                    logger.warn(`Failed fecth chat histories for user Id ${request.body.userId}`)
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

    static async renameChatHistory(request, response) {
        if (!logger) {
            logger = await createLogger(); 
        }
        const chat = new Chat(knex)

        if (
            request.params.chatId &&
            request.body.name &&
            request.params.teamId
        ) {
            logger.info(`Renaming chat Id ${request.params.chatId}`)
            chat.renameChat(request.params.chatId, request.body.name)
                .then((res) => {
                    if (res == 1) {
                        const chat ={
                          id: request.params.chatId,
                          name: request.body.name,
                          teamId:  request.params.teamId,
                          updated: new Date()
                        }
                        logger.info(`Chat history ${request.params.chatId} renamed`)
                                logger.info(`Updated chat history fetched successfully`)
                                logger.debug(JSON.stringify({ success: true, chat, message: request.t('chatHistoryUpdateSuccess') }))
                                return response.status(201)
                                    .send({ success: true, chat });
                    } else {
                        logger.warn(`Failed to rename chat history`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('chatHistoryUpdateFailed') }))
                        return response.status(201)
                            .send({ success: false, message: request.t('chatHistoryUpdateFailed') });
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to rename chat history`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('chatHistoryUpdateFailed') }))
                    return response.status(201)
                        .send({ success: false, message: request.t('chatHistoryUpdateFailed') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async deleteChatHistory(request, response) {
        if (!logger) {
            logger = await createLogger(); 
        }
        const chat = new Chat(knex)

        if (
            request.params.chatId &&
            request.params.teamId
        ) {
            logger.info(`Deleting chat Id ${request.params.chatId}`)
            chat.deleteChatHistory(request.params.chatId)
                .then((res) => {
                    logger.info(`Deleted chat Id ${request.params.chatId}`)
                    // logger.info(`Fetching updated chat histories`)
                    // chat.getChatHistoriesForUserBySpecificScope(request.decoded.userId, request.body.teamId,request.body.fileId,request.body.type)
                        // .then((userChatHistories) => {
                            // logger.info(`Updated chat history fetched successfully`)
                            logger.debug(JSON.stringify({ success: true, message: request.t('chatHistoryDeleteSuccess') }))
                            return response.status(200)
                                .send({ success: true, message: request.t('chatHistoryDeleteSuccess') });
                        })
                .catch((err) => {
                    logger.warn(`Failed to delete the chat Id ${request.body.chatId}`)
                    logger.error(err)
                    console.log(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('chatHistoryDeleteSuccessFailed') }))
                    return response.status(500)
                        .send({ success: false, message: request.t('chatHistoryDeleteSuccessFailed') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }
}

module.exports = ChatController