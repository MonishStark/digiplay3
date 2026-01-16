const { getNoOfPreviousConversationToPass } = require("../init/redisUtils")

class Chat {
    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }

    createNewChat(chatName, userId, teamId,scope,resourceId) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection("chat_histories")
                .insert({
                    userId,
                    teamId,
                    name: chatName,
                    created: dateTime
                })
                .then((chatId) => {
                    this.dbConnection("chat_scope")
                    .insert({
                        userId,
                        scope,
                        teamId,
                        resourceId,
                        chatId:chatId[0]
                    }).then(res =>{
                        resolve(chatId[0])
                    })
                    .catch(err =>{
                        reject(err)
                    })
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    async getChatHistoriesForUserBySpecificScope(userId, teamId, resourceId, scope, searchString) {
        try {
            resourceId = resourceId || teamId;
            scope = scope || "team";
        
            const chatIds = await this.dbConnection("chat_scope")
                .select("chatId")
                .where({ userId })
                .andWhere({ teamId })
                .andWhere({ resourceId })
                .andWhere({ scope });
        
            const ids = chatIds.map(item => item.chatId);
        
            if (ids.length === 0) return [];
        
            let query = this.dbConnection("chat_histories")
                .select("*")
                .whereIn("id", ids);
        
            if (searchString && searchString.trim() !== "") {
                query = query.andWhere("name", "like", `%${searchString}%`);
            }
        
            const chatHistories = await query;
        
            return chatHistories;
        
        } catch (err) {
            console.error(err);
            throw err;
        }
    }


    renameChat(chatId, newChatName) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection("chat_histories")
                .update({
                    name: newChatName,
                    updated: dateTime
                })
                .where({ id: chatId })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    addMessagesToTheChatHistory(chatId, message, messageType, parent, source) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection("chat_messages")
                .insert({
                    chatId,
                    message,
                    source,
                    role: messageType,
                    parent,
                    created: dateTime
                })
                .then((chatMessageId) => {
                    this.dbConnection("chat_messages").select("*").where({chatId}).then(res =>{
                        if(res.length ==1){
                            let chatName = message;
                            if(chatName.length>50){
                                chatName =chatName.slice(0,50)
                            }
                            this.dbConnection("chat_histories").select("*").where({id:chatId}).update({name:chatName}).then(chatHistory =>{
                                resolve(chatMessageId[0])
                            }).catch(e =>{})
                        }
                        resolve(chatMessageId[0])
                    })
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    async addAIReplyToUserQueries(userQueries, aiQueries) {
        let finalResults = []
        for (const userQuery of userQueries) {
            let temp = {}
            temp.userQuery = userQuery.message
            let replyData = await aiQueries.find((queryData) => queryData.parent == userQuery.id)
            if (replyData) {
                temp.aiAnswer = replyData.message
            }
            finalResults.push(temp)
        }
        return finalResults
    }

    async extractAIAnswers(messages) {
        const aiAnswers = messages.filter((message) => {
            if (message.role == 'bot') {
                return message
            }
        })
        return aiAnswers
    }

    async extractUserQueries(messages) {
        const userQueries = messages.filter((message) => {
            if (message.role == 'user') {
                return message
            }
        })
        return userQueries
    }

    getNoOfPastMessageToBeAdded() {
        return new Promise(async (resolve, reject) => {
            try {
                const numb = await getNoOfPreviousConversationToPass()
                resolve(numb)
            } catch (error) {
                reject(error)
            }
        })
    }

    getChatMessagesForHistory(chatId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_messages")
                .select("*")
                .where({ chatId })
                .then(async (chatMessagesList) => {
                    this.getNoOfPastMessageToBeAdded()
                        .then(async (noOfPastMessageToAdd) => {
                            const listLastIndex = chatMessagesList.length - 1
                            const filteredConversation = chatMessagesList.slice(listLastIndex - parseInt(noOfPastMessageToAdd), listLastIndex + 1)
                            const userQueries = await this.extractUserQueries(filteredConversation)
                            const aiAnswers = await this.extractAIAnswers(filteredConversation)
                            const chatHistories = await this.addAIReplyToUserQueries(userQueries, aiAnswers)
                            resolve(chatHistories)
                        })
                        .catch((err) => {
                            reject(err)
                        })
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

getChatMessages(chatId, before, limit = 50) {
    return new Promise((resolve, reject) => {
        const query = this.dbConnection("chat_messages")
            .select("*")
            .where({ chatId })
            .orderBy("created", "desc") 
            .limit(limit);

        if (before) {
            query.where("created", "<", before);
        }

        query
            .then(messages => resolve(messages.reverse()))
            .catch(reject);
    });
}



    getChatMessagesForAIQuery(chatId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_messages")
                .select("*")
                .where({ chatId })
                .then((messages) => {
                    this.getNoOfPastMessageToBeAdded()
                        .then((noOfPastMessageToAdd) => {
                            const listLastIndex = messages.length - 1
                            const startIndex = Math.max(0, listLastIndex - noOfPastMessageToAdd);
                            const filteredMessages = messages.slice(startIndex, listLastIndex);
                            resolve(filteredMessages)
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

    getChatMessageById(messageId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_messages")
                .select("*")
                .where({ id: messageId })
                .then((message) => {
                    resolve(message[0])
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    getChatHistoriesForUserByTeam(userId, teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_histories")
                .select('*')
                .where({ userId })
                .andWhere({ teamId })
                .orderBy('created', 'desc')
                .then((chatHistories) => {
                    resolve(chatHistories)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getChatHistoryData(chatId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_histories")
                .select("*")
                .where({ id: chatId })
                .then((historyData) => {
                    resolve(historyData[0])
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    doesChatIdExists(chatId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_histories")
                .select("*")
                .where({ id: chatId })
                .then((historyData) => {
                    if (historyData.length > 0) {
                        resolve('exists')
                    } else {
                        resolve('not-exists')
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    doesChatIdExistsInTeam(chatId, teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_histories")
                .select("*")
                .where({ id: chatId })
                .andWhere({ teamId })
                .then((historyData) => {
                    if (historyData.length > 0) {
                        resolve('exists')
                    } else {
                        resolve('not-exists')
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    deleteChatHistory(chatId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_histories")
                .where({ id: chatId })
                .del()
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    console.log(err)
                })
        })
    }

    getChatHistoriesByUser(userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_histories")
                .select('*')
                .where({ userId })
                .orderBy('created', 'desc')
                .then((chatHistories) => {
                    resolve(chatHistories)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    deleteChatHistoriesByUser(userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_histories")
                .where({ userId })
                .delete()
                .then(() => {
                    resolve(1)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }
}

module.exports = Chat