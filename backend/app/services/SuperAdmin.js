const redis = require("redis");
const Documents = require("../services/Documents")
const dotenv = require('dotenv');
dotenv.config();

class SuperAdmin {
    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }

    getSettings(metaKey) {
        return new Promise((resolve, reject) => {
            this.dbConnection("super-admin-settings")
                .select('*')
                .where({ meta_key: metaKey })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getAllSettings() {
        return new Promise((resolve, reject) => {
            this.dbConnection("super-admin-settings")
                .select('*')
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getAllEmailTemplates() {
        return new Promise((resolve, reject) => {
            this.dbConnection("email_templates")
                .select('*')
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    loadNonResponseIdentifiersToRedis() {
        return new Promise(async (resolve, reject) => {
            try {
                const documents = new Documents(this.dbConnection)
                const regExpString = await documents.buildRegExpFilterString()

                let redisClient = redis.createClient();
                redisClient.on("error", (error) => console.error(`Error : ${error}`));
                await redisClient.connect();

                await redisClient.set(process.env.REDIS_IDENTIFIER_REGEX_STRING_KEY, regExpString)
                await redisClient.quit()
                resolve(1)
            } catch (error) {
                console.log(error)
                reject(error)
            }
        })
    }

    loadSettingsToRedis() {
        return new Promise(async (resolve, reject) => {
            try {
                let redisClient = redis.createClient();
                redisClient.on("error", (error) => console.error(`Error : ${error}`));
                await redisClient.connect();

                const settings = await this.getAllSettings()
                const settingsMap = {}
                settings.map((setting) => {
                    settingsMap[setting.meta_key] = setting.meta_value
                })

                await redisClient.set(process.env.REDIS_SUPER_ADMIN_SETTINGS_KEY, JSON.stringify(settingsMap))
                await redisClient.quit()
                resolve(1)
            } catch (error) {
                console.log(error)
                reject(error)
            }
        })
    }

    getDataFromRedis(dataKey) {
        return new Promise(async (resolve, reject) => {
            try {
                let redisClient = redis.createClient();
                redisClient.on("error", (error) => reject(error));
                await redisClient.connect();
                const data = await redisClient.get(dataKey)
                await redisClient.quit()
                if (dataKey == process.env.REDIS_SUPER_ADMIN_SETTINGS_KEY) resolve(JSON.parse(data))
                resolve(data)
            } catch (error) {
                console.log(error)
                reject(error)
            }
        })
    }

    getUserRole(userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("user_company_role_relationship")
                .select('role')
                .where({ userId })
                .then((results) => {
                    if (results.length === 0) {
                        reject('User not found');
                    } else {
                        resolve(results[0].role);
                    }
                })
                .catch((err) => {
                    console.log(err);
                    reject(err);
                });
        });
    }    

    getAdminENV() {
        return new Promise((resolve, reject) => {
            this.dbConnection("super-admin-settings")
                .select("*")
                .then((env) => {
                    resolve(env)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    updateAdminENV(envUpdates) {
        const promises = Object.entries(envUpdates).map(([envKey, envValue]) => {
            if(envKey == 'ACTIVE_PAYMENT_CURRENCIES'){
                envValue = JSON.stringify(envValue)
            }
            return this.dbConnection("super-admin-settings")
                .where('meta_key', envKey)
                .update({ meta_value: envValue });
        });

        return Promise.all(promises);
    }

    deleteUser(id) {
        return this.dbConnection("users")
            .where({id})
    }

    updateEmailTemplate(id, updateFields) {
        return this.dbConnection('email_templates')
            .where({ id })
            .update(updateFields);
    }
}

module.exports = SuperAdmin