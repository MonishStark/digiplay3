const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
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

exports.emailTransporter = () => {
    return new Promise(async (resolve, reject) => {
        try {
            let isServiceBased = process.env.IS_SERVICE_BASED
            let host = process.env.EMAIL_HOST
            let port = process.env.EMAIL_PORT
            let emailAddress = process.env.EMAIL_ADDRESS
            let emailPassword = process.env.EMAIL_PASSWORD

            let transporter = null

            if (isServiceBased == '0') {
                transporter = nodemailer.createTransport(
                    {
                        host: host,
                        port: port,
                        secure: true,
                        authMethod: 'LOGIN',
                        auth: {
                            user: emailAddress,
                            pass: emailPassword
                        },
                        connectionTimeout: 10000,
                        greetingTimeout: 3000,
                        socketTimeout: 20000
                    }
                );
            } else {
                transporter = nodemailer.createTransport(
                    {
                        service: host,
                        auth: {
                            user: emailAddress,
                            pass: emailPassword
                        }
                    }
                );
            }

            resolve({
                transporter,
                mailingAddress: emailAddress
            })
        } catch (error) {
            console.log(error)
            reject(error)
        }
    })
}