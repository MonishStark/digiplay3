const SuperAdmin = require('../services/SuperAdmin')
const redis = require("redis");
const dotenv = require('dotenv');
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

exports.getNoOfPreviousConversationToPass = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            if (process.env.CACHE_MODE == "1") {
                let redisClient = redis.createClient();
                redisClient.on("error", (error) => reject(error));
                await redisClient.connect();
                const data = await redisClient.get(process.env.REDIS_SUPER_ADMIN_SETTINGS_KEY)
                await redisClient.quit()
                const parsedData = JSON.parse(data)
                resolve(parsedData["CONVERSATION_NUMBER_TO_PASS"])
            } else {
                const settings = await knex("super-admin-settings").select('*')
                const settingsMap = {}
                settings.map((setting) => {
                    settingsMap[setting.meta_key] = setting.meta_value
                })
                resolve(settingsMap["CONVERSATION_NUMBER_TO_PASS"])
            }
        } catch (error) {
            console.log(error)
            reject(error)
        }
    })
}

exports.getAdminSetting = (metaKey) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (process.env.CACHE_MODE == "1") {
                let redisClient = redis.createClient();
                redisClient.on("error", (error) => reject(error));
                await redisClient.connect();
                const data = await redisClient.get(process.env.REDIS_SUPER_ADMIN_SETTINGS_KEY)
                await redisClient.quit()
                const parsedData = JSON.parse(data)
                resolve(parsedData[metaKey])
            } else {
                const settings = await knex("super-admin-settings").select('meta_value').where({ meta_key: metaKey })
                resolve(settings[0]["meta_value"])
            }
        } catch (error) {
            console.log(error)
            reject(error)
        }
    })
}

exports.getQueryType = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            resolve(process.env.QUERY_TYPE)
        } catch (error) {
            console.log(error)
            reject(error)
        }
    })
}

exports.getNonResponseIdentifiers = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            let redisClient = redis.createClient();
            redisClient.on("error", (error) => reject(error));
            await redisClient.connect();
            const regExpStr = await redisClient.get(process.env.REDIS_IDENTIFIER_REGEX_STRING_KEY)
            await redisClient.quit()
            resolve(regExpStr)
        } catch (error) {
            console.log(error)
            reject(error)
        }
    })
}

exports.loadDataToRedis = async () => {
    try {
        const settings = await knex("super-admin-settings").select('*')
        const nonIdentifiers = await knex("non-response-identifiers").select('*')
        let filterString = ""
        nonIdentifiers.map((data, index) => {
            const stringSuffix = index == nonIdentifiers.length - 1 ? '' : '|'
            filterString += data.identifier + stringSuffix
        })
        const settingsMap = {}
        settings.map((setting) => {
            settingsMap[setting.meta_key] = setting.meta_value
        })

        let redisClient = redis.createClient();
        redisClient.on("error", (error) => console.error(`Error : ${error}`));
        await redisClient.connect();

        await redisClient.set(process.env.REDIS_SUPER_ADMIN_SETTINGS_KEY, JSON.stringify(settingsMap))
        await redisClient.set(process.env.REDIS_IDENTIFIER_REGEX_STRING_KEY, filterString)
        return
    } catch (error) {
        console.log(error)
        return
    }
}