const dotenv = require('dotenv');
const Users = require('../services/Users');
const winston = require('winston');
dotenv.config();
const { createLogger } = require('../init/logger');
const { getAdminSetting } = require('../init/redisUtils');

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

class AppdataController {
    static async appData(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        const currentDate = new Date();
        const isStartOfMonth = currentDate.getDate() === 1;

        if (isStartOfMonth) {
            user.resetQueriesMetaValueForNewMonth()
                .then((res) => {
                    if (res == 1) {
                        logger.info(`Queries meta Values are updated for ${currentDate}`);
                    }
                })
                .catch((error) => {
                    console.log(error)
                })
        }

        try {
            const appLogo = `app-logo/logo.png`;
            const appIcon = `app-icon/favicon.png`;
            const appName = process.env.APPLICATION_NAME || 'AI Bot';
            const appTagline = process.env.APPLICATION_TAGLINE || 'Tagline';
            const appBotName = process.env.APPLICATION_BOTNAME || 'Bot';
            const chatMessages = process.env.CHAT_MESSAGES.split('|') || '';
            const maxUsers = await getAdminSetting("MAX_USERS")
            const maxQuery = await getAdminSetting("MAX_QUERY") || 1000;
            const maxStorageSetting = await knex("super-admin-settings").select('meta_value').where({ meta_key: "MAX_STORAGE" });
            const maxStorage = maxStorageSetting[0]?.meta_value || 5;
            const defaultResponseSuffix = process.env.DEFAULT_CHAT_RESPONSE_FORMAT
            const settings = await knex("super-admin-settings").select('meta_value').where({ meta_key: "CHAT_OUTPUT_TOKEN" });
            const maxFileUploads = await knex("super-admin-settings").select('meta_value').where({ meta_key: "MAX_FILE_UPLOADS" });
            const activeCurrencies = await knex("super-admin-settings").select('meta_value').where({ meta_key: "ACTIVE_PAYMENT_CURRENCIES" });
            const paymentCurrencies = process.env.PAYMENT_CURRENCIES
            const multilanguage = await knex("super-admin-settings").select('meta_value').where({ meta_key: "MULTILANGUAGE" });
            const paymentMode = await knex("super-admin-settings").select('meta_value').where({ meta_key: "PAYMENT_MODE" });
            const roleData = await user.getUserRoles()
            const appData = {
                appLogo,
                appIcon,
                appName,
                appTagline,
                appBotName,
                paymentMode: (JSON.parse(paymentMode[0].meta_value) == 1) ? true : false,
                socialAuth: (process.env.SOCIAL_AUTH == 1) ? true : false,
                signUpMode: (process.env.SIGN_UP_MODE == 1) ? true : false,
                chatMessages,
                token: settings[0]["meta_value"],
                maxUsers,
                maxQuery,
                maxStorage,
                defaultResponseSuffix,
                isDeleteAccount: (process.env.SUPER_ADMIN_DELETE_ACCOUNT == 1) ? true : false,
                roleData,
                maxFileUploads,
                paymentCurrencies,
                activeCurrencies: activeCurrencies[0].meta_value,
                locationAccessKey: process.env.IPAPI_ACCESS_KEY,
                multilanguage: (JSON.parse(multilanguage[0].meta_value) == 1) ? true : false
            };
            logger.debug(JSON.stringify({ success: true, message: "App data fetched successfully", appData }))
            response.status(200).json({ success: true, message: "App data fetched successfully", appData });
        } catch (error) {
            console.error('Error in getAppData:', error);
            logger.error('Error in getAppData:', error);
            response.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

module.exports = AppdataController