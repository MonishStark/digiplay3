const user = require("../routes/user")
const SuperAdmin = require('./SuperAdmin')
const winston = require('winston');
const { combine, timestamp, json } = winston.format;
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { getAdminSetting } = require("../init/redisUtils");
dotenv.config();
const { createLogger } = require('../init/logger');


let logger;

class Users {

    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }

    getUserRoles() {
        return new Promise((resolve, reject) => {
            this.dbConnection('roles')
                .select('id', 'role')
                .whereNot('role', '=', 'System Administrator')
                .then((data) => {
                    resolve(data)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    async getMailTemplate (id) {
        if (!logger) {
          logger = await createLogger();
        }
        return new Promise ((resolve, reject) => {
            this.dbConnection('email_templates')
                .select('*')
                .where({id})
                .then((data) => {
                    resolve(data)
                })
                .catch((err) => {
                    console.log(err)
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async createNewUserGoogle(
        firstname,
        lastname,
        email,
        accountType,
        signUpMethod,
        currency
    ) {
        if (!logger) {
          logger = await createLogger();
        }
        return new Promise((resolve, reject) => {

            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()
            const dateTime = new Date()

            this.dbConnection('users').insert(
                {
                    firstname,
                    lastname,
                    email,
                    mobileNumber: '(000)-000-0000',
                    password: '',
                    accountStatus: 1,
                    token,
                    token_issued,
                    created: dateTime,
                    updated: dateTime
                }
            ).then(async (userId) => {
                try {
                    await this._addUserMeta(userId[0], 'otp', '')
                    await this._addUserMeta(userId[0], 'otp_issued', '')
                    await this._addUserMeta(userId[0], 'incorrect_attempt_count', 0)
                    await this._addUserMeta(userId[0], 'attempt_timestamp', '')
                    await this._addUserMeta(userId[0], 'accountLockStatus', 0)
                    await this._addUserMeta(userId[0], 'avatarUrl', 'default_avatar.png')
                    await this._addUserMeta(userId[0], 'accountBlocked', '0')
                    await this._addUserMeta(userId[0], 'queries', '0')

                    const superAdmin = new SuperAdmin(this.dbConnection)
                    const default2FA = process.env.DEFAULT_2FA
                    await this._addUserMeta(userId[0], 'currency', currency)
                     await this._addUserMeta(userId[0], '2FA', default2FA)
                    await this._addUserMeta(userId[0], 'accountType', accountType)
                    await this._addUserMeta(userId[0], 'signUpMethod', signUpMethod)
                    const userCloudIntegration = await getAdminSetting("DEFAULT_CLOUD_INTEGRATION")
                    const userCloudIntegrationMob = userCloudIntegration
                    await this._addUserMeta(userId[0], 'userCloudIntegration', userCloudIntegration)
                    await this._addUserMeta(userId[0], 'userCloudIntegrationMob', userCloudIntegrationMob)

                    await this._addUserMeta(userId[0], 'GoogleDrive', userCloudIntegration)
                    await this._addUserMeta(userId[0], 'Dropbox', userCloudIntegration)
                    await this._addUserMeta(userId[0], 'OneDrive', userCloudIntegration)
                    await this._addUserMeta(userId[0], 'Slack', userCloudIntegration)
                    await this._addUserMeta(userId[0], 'Wordpress', userCloudIntegration)

                    await this._addUserMeta(userId[0], 'GoogleDrive_M', userCloudIntegrationMob)
                    await this._addUserMeta(userId[0], 'Dropbox_M', userCloudIntegrationMob)
                    await this._addUserMeta(userId[0], 'OneDrive_M', userCloudIntegrationMob)
                    await this._addUserMeta(userId[0], 'Slack_M', userCloudIntegrationMob)
                    await this._addUserMeta(userId[0], 'Wordpress_M', userCloudIntegrationMob)

                    resolve({
                        userId: userId[0],
                        token,
                        default2FA: default2FA
                    })
                } catch (error) {
                    console.log(error)
                    logger.error(error)
                    reject(error)
                }
            })
        })
    }

    async validateGoogleLoginCredential(email) {
        if (!logger) {
          logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                email: email
            }).select('id')
                .then((res) => {
                    if (res.length > 0) {
                        this.isAccountLockedForIncorrectOtpAccount(res[0].id)
                            .then((stat) => {
                                if (stat == 0) {
                                    resolve(
                                        {
                                            stat: 'valid',
                                            userId: res[0].id,
                                        }
                                    )
                                } else {
                                    resolve(
                                        {
                                            stat: 'locked'
                                        }
                                    )
                                }
                            })
                            .catch((err) => {
                                console.log(err)
                                reject(err)
                            })
                    } else {
                        resolve({ stat: 'invalid' })
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    validateGoogleCredentialAndOtp(email, otp) {
        return new Promise((resolve, reject) => {
            this.validateGoogleLoginCredential(email).then((res) => {
                const currentTimestamp = Date.now()
                if (res.stat == 'valid') {
                    this.isAccountLockedForIncorrectOtpAccount(res.userId)
                        .then((stat) => {
                            if (stat == 0) {
                                this.getUserMetaValue(res.userId, 'otp').then((otpInRecord) => {
                                    if (otpInRecord == otp) {
                                        this.getUserMetaValue(res.userId, 'otp_issued').then((otpIssuedTime) => {
                                            const tDiff = currentTimestamp - otpIssuedTime
                                            if (tDiff <= 600000) {
                                                resolve('valid')
                                            } else {
                                                resolve('expired')
                                            }
                                        })
                                    } else {
                                        this.updateIncorrectOTPAttemptRecord(res.userId)
                                        resolve('Invalid OTP')
                                    }
                                })
                            } else {
                                resolve('locked')
                            }
                        })
                } else if (res.stat == 'locked') {
                    resolve('locked')
                } else {
                    resolve('Invalid Credential')
                }
            })
        })
    }

    getAccountType(userId) {
        return new Promise((resolve, reject) => {
            this.getUserMetaValue(userId, 'accountType')
                .then((accountType) => {
                    resolve(accountType)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    async createNewUser(
        firstname,
        lastname,
        email,
        mobileCountryCode,
        mobileNumber,
        password,
        accountType,
        paidStatus,
        signUpMethod,
        currency,
        avatarUrl
    ) {
        if (!logger) {
          logger = await createLogger();
        }
        return new Promise((resolve, reject) => {

            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()
            const dateTime = new Date()

            this.generateHash(password)
                .then((hashedPassword) => {
                    this.dbConnection('users').insert(
                        {
                            firstname,
                            lastname,
                            email,
                            mobileCountryCode,
                            mobileNumber,
                            password: hashedPassword,
                            accountStatus: 0,
                            token,
                            token_issued,
                            created: dateTime,
                            updated: dateTime
                        }
                    ).then(async (userId) => {
                        try {
                            await this._addUserMeta(userId[0], 'otp', '')
                            await this._addUserMeta(userId[0], 'otp_issued', '')
                            await this._addUserMeta(userId[0], 'incorrect_attempt_count', 0)
                            await this._addUserMeta(userId[0], 'attempt_timestamp', '')
                            await this._addUserMeta(userId[0], 'accountLockStatus', 0)
                            await this._addUserMeta(userId[0], 'avatarUrl', 'default_avatar.png')
                            await this._addUserMeta(userId[0], 'accountBlocked', paidStatus == '1' ? '0' : '1')
                            await this._addUserMeta(userId[0], 'queries', '0')

                            const superAdmin = new SuperAdmin(this.dbConnection)
                            const default2FA = process.env.DEFAULT_2FA
                            await this._addUserMeta(userId[0], '2FA', default2FA)
                            await this._addUserMeta(userId[0], 'accountType', accountType)
                            await this._addUserMeta(userId[0], 'signUpMethod', signUpMethod)
                            await this._addUserMeta(userId[0], 'currency', currency)
                            const userCloudIntegration = await getAdminSetting("DEFAULT_CLOUD_INTEGRATION")
                            const userCloudIntegrationMob = userCloudIntegration
                            await this._addUserMeta(userId[0], 'userCloudIntegration', userCloudIntegration)
                            await this._addUserMeta(userId[0], 'userCloudIntegrationMob', userCloudIntegrationMob)

                            await this._addUserMeta(userId[0], 'GoogleDrive', userCloudIntegration)
                            await this._addUserMeta(userId[0], 'Dropbox', userCloudIntegration)
                            await this._addUserMeta(userId[0], 'OneDrive', userCloudIntegration)
                            await this._addUserMeta(userId[0], 'Slack', userCloudIntegration)
                            await this._addUserMeta(userId[0], 'Wordpress', userCloudIntegration)

                            await this._addUserMeta(userId[0], 'GoogleDrive_M', userCloudIntegrationMob)
                            await this._addUserMeta(userId[0], 'Dropbox_M', userCloudIntegrationMob)
                            await this._addUserMeta(userId[0], 'OneDrive_M', userCloudIntegrationMob)
                            await this._addUserMeta(userId[0], 'Slack_M', userCloudIntegrationMob)
                            await this._addUserMeta(userId[0], 'Wordpress_M', userCloudIntegrationMob)

                            resolve({
                                userId: userId[0],
                                token,
                                default2FA: default2FA,
                                userCloudIntegration,
                                userCloudIntegrationMob
                            })
                        } catch (error) {
                            console.log(error)
                            logger.error(error)
                            reject(error)
                        }
                    })
                        .catch((err) => {
                            console.log(err)
                            logger.error(err)
                            reject(err)
                        })
                })
        })
    }


    async createNewAccountForInvitedUser(
        firstname,
        lastname,
        email,
        mobileCountryCode,
        mobileNumber,
        password,
        companytwoFactorEnabled,
        companyId,
        role,
        signUpMethod
    ) {
        if (!logger) {
          logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()
            const dateTime = new Date()

            this.generateHash(password)
                .then((hashedPassword) => {
                    this.dbConnection('users').insert(
                        {
                            firstname,
                            lastname,
                            email,
                            mobileCountryCode,
                            mobileNumber,
                            password: hashedPassword,
                            accountStatus: 1,
                            token,
                            token_issued,
                            created: dateTime,
                            updated: dateTime
                        }
                    ).then(async (userId) => {
                        try {
                            await this._addUserMeta(userId[0], 'otp', '')
                            await this._addUserMeta(userId[0], 'otp_issued', '')
                            await this._addUserMeta(userId[0], 'incorrect_attempt_count', 0)
                            await this._addUserMeta(userId[0], 'attempt_timestamp', '')
                            await this._addUserMeta(userId[0], 'accountLockStatus', 0)
                            await this._addUserMeta(userId[0], 'avatarUrl', 'default_avatar.png')
                            await this._addUserMeta(userId[0], '2FA', companytwoFactorEnabled ? '1' : '0')
                            await this._addUserMeta(userId[0], 'accountBlocked', '0')
                            await this._addUserMeta(userId[0], 'accountType', 'invited')
                            await this._addUserMeta(userId[0], 'signUpMethod', signUpMethod)
                            await this._addUserMeta(userId[0], 'queries', '0')
                            const companyCloudIntegrationData = await this.getCloudIntegrationsOfCompany(companyId)

                            const userCloudIntegration = await getAdminSetting("DEFAULT_CLOUD_INTEGRATION")
                            const userCloudIntegrationMob = userCloudIntegration
                            await this._addUserMeta(userId[0], 'userCloudIntegration', userCloudIntegration)
                            await this._addUserMeta(userId[0], 'userCloudIntegrationMob', userCloudIntegrationMob)

                            await this._addUserMeta(userId[0], 'GoogleDrive', companyCloudIntegrationData.GoogleDrive)
                            await this._addUserMeta(userId[0], 'Dropbox', companyCloudIntegrationData.Dropbox)
                            await this._addUserMeta(userId[0], 'OneDrive', companyCloudIntegrationData.OneDrive)
                            await this._addUserMeta(userId[0], 'Slack', companyCloudIntegrationData.Slack)
                            await this._addUserMeta(userId[0], 'Wordpress', companyCloudIntegrationData.Wordpress)

                            await this._addUserMeta(userId[0], 'GoogleDrive_M', companyCloudIntegrationData.GoogleDrive_M)
                            await this._addUserMeta(userId[0], 'Dropbox_M', companyCloudIntegrationData.Dropbox_M)
                            await this._addUserMeta(userId[0], 'OneDrive_M', companyCloudIntegrationData.OneDrive_M)
                            await this._addUserMeta(userId[0], 'Slack_M', companyCloudIntegrationData.Slack_M)
                            await this._addUserMeta(userId[0], 'Wordpress_M', companyCloudIntegrationData.Wordpress_M)

                            await this.addRoleAndCompanyToUser(userId, companyId, role)

                            resolve({
                                userId: userId[0]
                            })
                        } catch (error) {
                            logger.error(error)
                            reject(error)
                        }
                    })
                        .catch((err) => {
                            logger.error(err)
                            reject(err)
                        })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async createNewAccountForSocialInvitedUser(
        firstname,
        lastname,
        email,
        companytwoFactorEnabled,
        companyId,
        role,
        signUpMethod
    ) {
        if (!logger) {
          logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()
            const dateTime = new Date()

            this.dbConnection('users').insert(
                {
                    firstname,
                    lastname,
                    email,
                    mobileNumber: '(000)-000-0000',
                    password: '',
                    accountStatus: 1,
                    token,
                    token_issued,
                    created: dateTime,
                    updated: dateTime
                }
            ).then(async (userId) => {
                try {
                    await this._addUserMeta(userId[0], 'otp', '')
                    await this._addUserMeta(userId[0], 'otp_issued', '')
                    await this._addUserMeta(userId[0], 'incorrect_attempt_count', 0)
                    await this._addUserMeta(userId[0], 'attempt_timestamp', '')
                    await this._addUserMeta(userId[0], 'accountLockStatus', 0)
                    await this._addUserMeta(userId[0], 'avatarUrl', 'default_avatar.png')
                    await this._addUserMeta(userId[0], '2FA', companytwoFactorEnabled ? '1' : '0')
                    await this._addUserMeta(userId[0], 'accountBlocked', '0')
                    await this._addUserMeta(userId[0], 'accountType', 'invited')
                    await this._addUserMeta(userId[0], 'signUpMethod', signUpMethod)
                    await this._addUserMeta(userId[0], 'queries', '0')
                    await this.addRoleAndCompanyToUser(userId, companyId, role)
                    const userCloudIntegration = await getAdminSetting("DEFAULT_CLOUD_INTEGRATION")
                    const userCloudIntegrationMob = userCloudIntegration
                    await this._addUserMeta(userId[0], 'userCloudIntegration', userCloudIntegration)
                    await this._addUserMeta(userId[0], 'userCloudIntegrationMob', userCloudIntegrationMob)

                    await this._addUserMeta(userId[0], 'GoogleDrive', userCloudIntegration)
                    await this._addUserMeta(userId[0], 'Dropbox', userCloudIntegration)
                    await this._addUserMeta(userId[0], 'OneDrive', userCloudIntegration)
                    await this._addUserMeta(userId[0], 'Slack', userCloudIntegration)
                    await this._addUserMeta(userId[0], 'Wordpress', userCloudIntegration)

                    await this._addUserMeta(userId[0], 'GoogleDrive_M', userCloudIntegrationMob)
                    await this._addUserMeta(userId[0], 'Dropbox_M', userCloudIntegrationMob)
                    await this._addUserMeta(userId[0], 'OneDrive_M', userCloudIntegrationMob)
                    await this._addUserMeta(userId[0], 'Slack_M', userCloudIntegrationMob)
                    await this._addUserMeta(userId[0], 'Wordpress_M', userCloudIntegrationMob)
                    resolve({
                        userId: userId[0]
                    })
                } catch (error) {
                    logger.error(error)
                    reject(error)
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    generateHash(password) {
        return new Promise((resolve, reject) => {
            bcrypt.hash(password, parseInt(process.env.SALT_ROUND))
                .then(function (hash) {
                    resolve(hash)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    async comparePassword(password, userId) {
        if (!logger) {
          logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                id: userId
            }).select('password')
                .then((res) => {
                    if (res.length > 0) {
                        bcrypt.compare(password, res[0].password)
                            .then((isValidPassword) => {
                                if (isValidPassword) {
                                    resolve(1)
                                } else {
                                    resolve(0)
                                }
                            })
                            .catch((err) => {
                                console.log(err)
                                reject(err)
                            })
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async createNewCompany(
        userId,
        companyName,
        phoneNumberCountryCode,
        phoneNumber,
        companyType,
        mailingStreetName,
        mailingCountryName,
        mailingState,
        mailingCityName,
        mailingZip,
        billingStreetName,
        billingCountryName,
        billingCityName,
        billingState,
        billingZip,
        isMailAndBillAddressSame
    ) {
        if (!logger) {
          logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection('companies').insert(
                {
                    adminId: userId,
                    company_name: companyName,
                    company_phone_country_code:phoneNumberCountryCode,
                    company_phone: phoneNumber,
                    company_type: companyType,
                    created: dateTime,
                    updated: dateTime
                }
            ).then(async (_companyId) => {
                try {
                    await this.addCompanyMeta(_companyId[0], 'mailingStreetName', mailingStreetName)
                    await this.addCompanyMeta(_companyId[0], 'mailingCountryName', mailingCountryName)
                    await this.addCompanyMeta(_companyId[0], 'mailingCityName', mailingCityName)
                    await this.addCompanyMeta(_companyId[0], 'mailingState', mailingState)
                    await this.addCompanyMeta(_companyId[0], 'mailingZip', mailingZip)
                    await this.addCompanyMeta(_companyId[0], 'billingStreetName', billingStreetName)
                    await this.addCompanyMeta(_companyId[0], 'billingCountryName', billingCountryName)
                    await this.addCompanyMeta(_companyId[0], 'billingCityName', billingCityName)
                    await this.addCompanyMeta(_companyId[0], 'billingState', billingState)
                    await this.addCompanyMeta(_companyId[0], 'billingZip', billingZip)
                    await this.addCompanyMeta(_companyId[0], 'companyLogo', 'default_avatar.png')

                    const superAdmin = new SuperAdmin(this.dbConnection)
                    const default2FA = process.env.DEFAULT_2FA
                    await this.addCompanyMeta(_companyId[0], '2FA', default2FA)
                    await this.addCompanyMeta(_companyId[0], 'isMailAndBillAddressSame', isMailAndBillAddressSame == true ? '1' : '0')
                    await this.addCompanyMeta(_companyId[0], 'language', 'en')
                    // if(companyName){
                        await this.addRoleAndCompanyToUser(userId, _companyId, 1)
                    // }else{
                        // await this.addRoleAndCompanyToUser(userId, _companyId, 2)
                    // }
                    resolve({
                        companyId: _companyId,
                        companyDefault2FA: default2FA
                    })
                } catch (error) {
                    logger.error(error)
                    reject(error)
                }
            })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

     async addSubscriptionData(
        userId,
        paymentId,
        subscriptionType,
        subscriptionAmount,
        paymentStatus,
        subscriptionId,
        customerId,
        currency,
        paymentHistoryJson
    ) {
        if (!logger) {
              logger = await createLogger();
        }
        try{
            const dateTime = new Date()

            const updated = await this.dbConnection('subscriptions')
                .where({ customerId })
                .update({
                    userId,
                    payment_id: paymentId,
                    subscription_type: subscriptionType,
                    subscription_amount: subscriptionAmount,
                    payment_status: paymentStatus,
                    subscriptionId,
                    currency,
                    paymentHistory: paymentHistoryJson,
                    updated: dateTime
                })

            if (!updated) {
                await this.dbConnection('subscriptions').insert({
                    userId,
                    payment_id: paymentId,
                    subscription_type: subscriptionType,
                    subscription_amount: subscriptionAmount,
                    payment_status: paymentStatus,
                    subscriptionId,
                    currency,
                    customerId,
                    created: dateTime,
                    paymentHistory: paymentHistoryJson
                })
            }
            return true;
        }catch(err){
            logger.error(err)
            return false;
        }
    }

    async insertPaymentMethod(customerId, paymentMethodJson) {
        try{
            const updated = await this.dbConnection('subscriptions')
                .where({ customerId })
                .update({ paymentMethod: paymentMethodJson })
            
            if (!updated) {
                await this.dbConnection('subscriptions')
                    .insert({ 
                        customerId, 
                        paymentMethod: paymentMethodJson,
                        userId:null,
                        payment_id:'',
                        subscription_type:'',
                        subscription_amount:0,
                        payment_status:1,
                        subscriptionId:'',
                        currency:'',
                        paymentHistory:'[]' 
                    })
            }
            return true;
        }catch(err){
            logger.error(err)
            return false;
        }
    }

    updateSubscriptionData(
        userId,
        paymentStatus
    ) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection('subscriptions')
                .where({ userId: userId })
                .update({
                    payment_status: paymentStatus,
                    deactivated: dateTime
                })
                .then(() => {
                    resolve(1)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    async getSubscriptionData(userId) {
        if (!logger) {
          logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Select * from subscriptions where userId = ?',
                [userId]
            )
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getUserIdByEmail(userEmail) {
        if (!logger) {
          logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Select id from users where email = ?',
                [userEmail]
            )
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    checkPaymentStatus(email) {
        return new Promise((resolve, reject) => {
            this.dbConnection("users")
                .select('id')
                .where({ email })
                .then((res) => {
                    if (res.length > 0) {
                        this.dbConnection('subscriptions')
                            .select('payment_status')
                            .where({ userId: res[0]['id'] })
                            .then((res) => {
                                if (res.length > 0) {
                                    if (res[0]['payment_status'] == '1') {
                                        resolve('success')
                                    } else {
                                        resolve('failed')
                                    }
                                } else {
                                    resolve('pending')
                                }
                            })
                    } else {
                        resolve('not-found')
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getCloudIntegrationsOfCompany(companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("user_company_role_relationship")
                .select('userId')
                .where({ company: companyId, role: 1 })
                .then(async (res) => {
                    if (res.length > 0) {
                        let data = await this.getUserMetaDetails(res[0].userId)
                        resolve({
                            GoogleDrive: data.GoogleDrive,
                            Dropbox: data.Dropbox,
                            OneDrive: data.OneDrive,
                            Slack: data.Slack,
                            Wordpress: data.Wordpress,
                            GoogleDrive_M: data.GoogleDrive_M,
                            Dropbox_M: data.Dropbox_M,
                            OneDrive_M: data.OneDrive_M,
                            Slack_M: data.Slack_M,
                            Wordpress_M: data.Wordpress_M
                        })
                    } else {
                        resolve('pending')
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    addRoleAndCompanyToUser(userId, companyId, role) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection('user_company_role_relationship')
                .insert({
                    userId,
                    company: companyId,
                    role,
                    created: dateTime,
                    updated: dateTime
                })
                .then((res) => {
                    if (res) {
                        resolve(res)
                    } else {
                        reject(false)
                    }
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    adminRoleUpdateForUser(userId, companyId, role) {
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Update user_company_role_relationship set role = ? where userId = ? and company = ?',
                [role, userId, companyId]
            )
                .then(() => {
                    resolve(1)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })

            this.dbConnection.raw(
                'Update invitations set role = ? where userId = ?',
                [role, userId]
            )
                .then(() => {
                    resolve(1)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    async addCompanyMeta(
        companyId,
        metaKey,
        metaValue
    ) {
        if (companyId) {
            if (!logger) {
                logger = await createLogger();
            }
            return new Promise((resolve, reject) => {
                this.dbConnection('companies_meta').insert(
                    {
                        companyId,
                        metaKey,
                        metaValue
                    }
                ).then((result) => {
                    if (result) {
                        resolve(true)
                    } else {
                        reject(false)
                    }
                }).catch((err) => {
                    logger.error(err)
                    reject(false)
                })
            })
        }
    }

    async updateUser(
        userId,
        firstname,
        lastname,
        mobileCountryCode,
        mobileNumber,
        avatarUrl
    ) {
        if (!logger) {
          logger = await createLogger();
        }
        return new Promise((resolve, reject) => {

            const dateTime = new Date()

            this.dbConnection('users')
                .where({ id: userId })
                .update(
                    {
                        firstname,
                        lastname,
                        mobileCountryCode,
                        mobileNumber,
                        updated: dateTime
                    }
                ).then(async (res) => {
                    if (res == 1) {
                        if (avatarUrl && avatarUrl != '') {
                            await this.updateUserMeta(userId, 'avatarUrl', avatarUrl)
                        }

                        resolve(1)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async updateUserDynamic(userId, fields = {}) {
        if (!logger) {
          logger = await createLogger();
        }
        return new Promise(async (resolve, reject) => {
            try {
              if (!userId || Object.keys(fields).length === 0) {
                logger.warn("updateUserDynamic called with empty fields or invalid userId");
                return resolve(0);
              }
          
              const dateTime = new Date();
              fields.updated = dateTime; 
          
              const { avatarUrl, ...userFields } = fields;
          
              const res = await this.dbConnection("users")
                .where({ id: userId })
                .update(userFields);
          
              if (res === 1) {
                if (avatarUrl && avatarUrl !== "") {
                  await this.updateUserMeta(userId, "avatarUrl", avatarUrl);
                }
            
                resolve(1);
              } else {
                resolve(0);
              }
            } catch (err) {
              logger.error(`updateUserDynamic failed for userId ${userId}: ${err.message}`);
              reject(err);
            }
          });
        }


    async adminUserUpdate(userId, data) {
  if (!logger) {
    logger = await createLogger();
  }

  return new Promise(async (resolve, reject) => {
    try {
      const dateTime = new Date();
      const updateData = { updated: dateTime };

      if (data.email) {
        const existingUser = await this.dbConnection('users')
          .where({ email: data.email })
          .andWhereNot({ id: userId }) // exclude the current user
          .first();

        if (existingUser) {
            const error = new Error("Email already exists.");
            error.code = "EMAIL_IN_USE";
            logger.warn(`Update failed for user ${userId}: Email ${data.email} is already in use.`);
            reject(error);
            return;
        } else {
          updateData.email = data.email;
          updateData.accountStatus =false
        }
      }

      if (data.firstname) updateData.firstname = data.firstname;
      if (data.lastname) updateData.lastname = data.lastname;
      if (data.mobileCountryCode) updateData.mobileCountryCode = data.mobileCountryCode;
      if (data.mobileNumber) updateData.mobileNumber = data.mobileNumber;

      const res = await this.dbConnection('users')
        .where({ id: userId })
        .update(updateData);

      if (res === 1) {
        if (data.password && data.password.trim() !== '') {
          try {
            const passRes = await this.updatePassword(userId, data.password);
            if (passRes === 1) logger.info(`Password updated for user ${userId}`);
            else logger.warn(`Password update failed for user ${userId}`);
          } catch (err) {
            logger.error(err);
          }
        }

        if (data.avatarUrl && data.avatarUrl !== '') {
          await this.updateUserMeta(userId, 'avatarUrl', data.avatarUrl);
        }
        if(typeof data.userCloudIntegrationWeb  === 'boolean'){
            await this.updateUserMeta(userId, 'userCloudIntegration', data.userCloudIntegrationWeb);
        }
        if (typeof data.userCloudIntegrationMob === 'boolean') {
            await this.updateUserMeta(userId, 'userCloudIntegrationMob', data.userCloudIntegrationMob);
        }
        if (data.language) {
          const [updateResult] = await this.dbConnection.raw(
            'UPDATE users_meta SET metaValue = ? WHERE userId = ? AND metaKey = ?',
            [data.language, userId, 'language']
          );
          const affectedRows = updateResult.affectedRows || updateResult.rowCount || 0;

          if (affectedRows === 0) {
            await this.dbConnection.raw(
              'INSERT INTO users_meta (userId, metaKey, metaValue) VALUES (?, ?, ?)',
              [userId, 'language', data.language]
            );
          }
        }

        resolve(1);
      } else {
        resolve(0);
      }
    } catch (err) {
        console.log(err)
      logger.error(err);
      reject(err);
    }
  });
}


    async superAdminUserUpdate(
        userId,
        firstname,
        lastname,
        email,
        mobileCountryCode,
        mobileNumber,
        avatarUrl,
        twoFactorEnabled,
        password,
        userCloudIntegration,
        userCloudIntegrationMob,
        Dropbox,
        Dropbox_M,
        GoogleDrive,
        GoogleDrive_M,
        OneDrive,
        OneDrive_M,
        Slack,
        Slack_M,
        Wordpress,
        Wordpress_M,
    ) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            
            const dateTime = new Date()

            this.dbConnection('users')
                .where({ id: userId })
                .update(
                    {
                        firstname,
                        lastname,
                        email,
                        mobileCountryCode,
                        mobileNumber,
                        updated: dateTime
                    }
                ).then(async (res) => {
                    if (res == 1) {
                        if(password != null && password != '' && password.length > 0) {
                            this.updatePassword(userId, password)
                            .then((res) => {
                                if (res == 1) {
                                    logger.info(`Password update successful for user ID ${userId}`)
                                } else {
                                    logger.warn(`Password update failed for user ID ${userId}`)
                                }
                            })
                            .catch((err) => {
                                logger.error(err)
                            })
                        }
                        if (avatarUrl && avatarUrl != '') {
                            await this.updateUserMeta(userId, 'avatarUrl', avatarUrl)
                        }
                        if (twoFactorEnabled) {
                            await this.updateUserMeta(userId, '2FA', twoFactorEnabled)
                        }
                        if(userCloudIntegration){
                            await this.updateUserMeta(userId, 'userCloudIntegration', userCloudIntegration)
                            await this.updateUserMeta(userId, 'userCloudIntegrationMob', userCloudIntegrationMob)
                            await this.updateUserMeta(userId, 'Dropbox', Dropbox)
                            await this.updateUserMeta(userId, 'Dropbox_M', Dropbox_M)
                            await this.updateUserMeta(userId, 'GoogleDrive', GoogleDrive)
                            await this.updateUserMeta(userId, 'GoogleDrive_M', GoogleDrive_M)
                            await this.updateUserMeta(userId, 'OneDrive', OneDrive)
                            await this.updateUserMeta(userId, 'OneDrive_M', OneDrive_M)
                            await this.updateUserMeta(userId, 'Slack', Slack)
                            await this.updateUserMeta(userId, 'Slack_M', Slack_M)
                            await this.updateUserMeta(userId, 'Wordpress', Wordpress)
                            await this.updateUserMeta(userId, 'Wordpress_M', Wordpress_M)
                        }

                        resolve(1)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

async dynamicUserUpdate(userId, updateData) {
  const userFields = ['firstname', 'lastname', 'email', 'mobileCountryCode', 'mobileNumber'];
  const metaUpdates = {};
  const userUpdates = {};

  for (const [key, value] of Object.entries(updateData)) {
    if (userFields.includes(key)) {
      userUpdates[key] = value;
    } else {
      metaUpdates[key] = value;
    }
  }

  if (Object.keys(userUpdates).length > 0) {
    await this.dbConnection('users').where({ id: userId }).update(userUpdates);
  }

  for (const [key, value] of Object.entries(metaUpdates)) {
    if(key=="userCloudIntegrationWeb"){
        await this.updateUserMeta(userId, "userCloudIntegration", value);
    }if(key=="twoFactorAuth"){
        await this.updateUserMeta(userId, "2FA", value);
    }else{
    await this.updateUserMeta(userId, key, value);
    }
  }

  return 1;
}



    async updateCompanyDynamic(companyId, fields = {}) {
        if (!logger) {
            logger = await createLogger();
        }
        if(fields.billingStateName){
            fields.billingState = fields.billingStateName
        }
        if(fields.mailingStateName){
            fields.mailingState = fields.mailingStateName
        }
        return new Promise(async (resolve, reject) => {
        try {
          if (!companyId || Object.keys(fields).length === 0) {
            logger.warn("updateCompanyDynamic called with empty fields or invalid companyId");
            return resolve(0);
          }

          const dateTime = new Date();
          const companyFields = {};
          const metaFields = {};
          let companyLogo = null;

          if (fields.companyName) companyFields.company_name = fields.companyName;
          if (fields.phoneNumberCountryCode) companyFields.company_phone_country_code = fields.phoneNumberCountryCode;
          if (fields.phoneNumber) companyFields.company_phone = fields.phoneNumber;
          if (fields.orgType) companyFields.company_type = fields.orgType;
          companyFields.updated = dateTime;

          const possibleMeta = [
            "mailingStreetName",
            "mailingCountryName",
            "mailingCityName",
            "mailingState",
            "mailingZip",
            "billingStreetName",
            "billingCountryName",
            "billingCityName",
            "billingState",
            "billingZip",
            "isMailAndBillAddressSame",
            "language"
          ];

          for (const key of possibleMeta) {
            if (fields[key] !== undefined && fields[key] !== null) {
              if (key === "isMailAndBillAddressSame") {
                metaFields[key] = fields[key] === "true" || fields[key] === true ? "1" : "0";
              } else {
                metaFields[key] = fields[key];
              }
            }
          }

          if (fields.companyLogo && fields.companyLogo !== "") {
            companyLogo = fields.companyLogo;
          }

          if (Object.keys(companyFields).length > 1) { 
            await this.dbConnection("companies")
              .where({ id: companyId })
              .update(companyFields);
          }

          for (const [key, value] of Object.entries(metaFields)) {
            await this.updateCompanyMeta(companyId, key, value);
          }

          if (companyLogo) {
            await this.updateCompanyMeta(companyId, "companyLogo", companyLogo);
          }

          resolve(1);
        } catch (err) {
          logger.error(`updateCompanyDynamic failed for companyId ${companyId}: ${err.message}`);
          reject(err);
        }
    });
}


    async updateCompany(
        companyId,
        phoneNumber,
        phoneNumberCountryCode,
        companyName,
        companyType,
        mailingStreetName,
        mailingCountryName,
        mailingCityName,
        mailingState,
        mailingZip,
        billingStreetName,
        billingCountryName,
        billingCityName,
        billingState,
        billingZip,
        isMailAndBillAddressSame,
        companyLogo,
        language
    ) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {

            const dateTime = new Date()

            this.dbConnection('companies')
                .where({ id: companyId })
                .update(
                    {
                        company_name: companyName,
                        company_phone_country_code:phoneNumberCountryCode,
                        company_phone: phoneNumber,
                        company_type: companyType,
                        updated: dateTime
                    }
                ).then(async (res) => {
                    if (res == 1) {
                        await this.updateCompanyMeta(companyId, 'mailingStreetName', mailingStreetName)
                        await this.updateCompanyMeta(companyId, 'mailingCountryName', mailingCountryName)
                        await this.updateCompanyMeta(companyId, 'mailingCityName', mailingCityName)
                        await this.updateCompanyMeta(companyId, 'mailingState', mailingState)
                        await this.updateCompanyMeta(companyId, 'mailingZip', mailingZip)
                        await this.updateCompanyMeta(companyId, 'billingStreetName', billingStreetName)
                        await this.updateCompanyMeta(companyId, 'billingCountryName', billingCountryName)
                        await this.updateCompanyMeta(companyId, 'billingCityName', billingCityName)
                        await this.updateCompanyMeta(companyId, 'billingState', billingState)
                        await this.updateCompanyMeta(companyId, 'billingZip', billingZip)
                        await this.updateCompanyMeta(companyId, 'isMailAndBillAddressSame', isMailAndBillAddressSame == 'true' ? '1' : '0')
                        await this.updateCompanyMeta(companyId, 'language', language)

                        if (companyLogo && companyLogo != '') {
                            await this.updateCompanyMeta(companyId, 'companyLogo', companyLogo)
                        }

                        resolve(1)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async updateCompany2(
        companytwoFactorEnabled,
        companyId,
        phoneNumber,
        phoneNumberCountryCode,
        companyName,
        companyType,
        mailingStreetName,
        mailingCountryName,
        mailingCityName,
        mailingState,
        mailingZip,
        billingStreetName,
        billingCountryName,
        billingCityName,
        billingState,
        billingZip,
        isMailAndBillAddressSame,
        companyLogo,
        
        language
    ) {
        if (!logger) logger = await createLogger();
    
        try {
            const dateTime = new Date();
        
            let updateData = { updated: dateTime };
        
            if (companyName) updateData.company_name = companyName;
            if (phoneNumberCountryCode) updateData.company_phone_country_code = phoneNumberCountryCode;
            if (phoneNumber) updateData.company_phone = phoneNumber;
            if (companyType) updateData.company_type = companyType;
        
            const result = await this.dbConnection("companies")
                .where({ id: companyId })
                .update(updateData);
        
            if (result !== 1) return 0;
        
            const safeUpdateMeta = async (key, value) => {
                if (value !== undefined && value !== null && value !== "") {
                    await this.updateCompanyMeta(companyId, key, value);
                }
            };
        
            await safeUpdateMeta("mailingStreetName", mailingStreetName);
            await safeUpdateMeta("mailingCountryName", mailingCountryName);
            await safeUpdateMeta("mailingCityName", mailingCityName);
            await safeUpdateMeta("mailingState", mailingState);
            await safeUpdateMeta("mailingZip", mailingZip);
        
            await safeUpdateMeta("billingStreetName", billingStreetName);
            await safeUpdateMeta("billingCountryName", billingCountryName);
            await safeUpdateMeta("billingCityName", billingCityName);
            await safeUpdateMeta("billingState", billingState);
            await safeUpdateMeta("billingZip", billingZip);
        
            await safeUpdateMeta(
                "isMailAndBillAddressSame",
                isMailAndBillAddressSame === "true" ? "1" : "0"
            );
        
            await safeUpdateMeta("2FA", companytwoFactorEnabled);
            await safeUpdateMeta("language", language);
        
            
            if (companyLogo && companyLogo !== "") {
                await this.updateCompanyMeta(companyId, "companyLogo", companyLogo);
            }
            return 1;
        } catch (err) {
            console.log(err);
            logger.error(err);
            throw err;
        }
    }

    async _addUserMeta(userId, metaKey, metaValue) {
        if (!logger) {
            logger = await createLogger();
        }
        if (userId) {
            return new Promise((resolve, reject) => {
                this.dbConnection('users_meta').insert(
                    {
                        userId,
                        metaKey,
                        metaValue
                    }
                ).then((result) => {
                    if (result) {
                        resolve(true)
                    } else {
                        reject(false)
                    }
                }).catch((err) => {
                    logger.error(err)
                    reject(false)
                })
            })
        }
    }

    async updateUserMeta(userId, metaKey, metaValue) {
        if (!logger) {
        logger = await createLogger();
        }

        if (!userId) {
            throw new Error("userId is required");
        }

        try {
            const result = await this.dbConnection.raw(
                'UPDATE users_meta SET metaValue = ? WHERE userId = ? AND metaKey = ?',
                [metaValue, userId, metaKey]
            );
            if (result[0].rowCount == 0 || result[0].affectedRows == 0) {
                const insert =await this.dbConnection.raw(
                    'INSERT INTO users_meta (userId, metaKey, metaValue) VALUES (?, ?, ?)',
                    [userId, metaKey, metaValue]
                );
            }

            return { success: true };
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

    async updateCompanyMeta(companyId, metaKey, metaValue) {
        if (!logger) {
            logger = await createLogger();
            }
        if (companyId) {
            return new Promise((resolve, reject) => {
                this.dbConnection.raw(
                    'Update companies_meta set metaValue = ? where companyId = ? and metaKey = ?',
                    [metaValue, companyId, metaKey]
                )
                    .then((result) => {
                        resolve(result)
                    }).catch((err) => {
                        logger.error(err)
                        reject(err)
                    })
            })
        }
    }

    async checkIfUserExist(email) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                email
            }).then((res) => {
                resolve(res)
            })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }
    async checkIfUserExistById(id) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                id
            }).then((res) => {
                if(res.length>0){
                    resolve(true)
                }else{
                resolve(false)

                }
            })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    getRandomIntInclusive() {
        const min = Math.ceil(1000);
        const max = Math.floor(9999);
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    async getUserMetaValue(userId, metaKey) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Select metaValue from users_meta where userId = ? and metaKey = ?',
                [userId, metaKey]
            )
                .then((res) => {
                    if (res[0].length > 0) {
                        resolve(res[0][0].metaValue)
                    } else {
                        resolve('')
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getCompanyMetaValue(companyId, metaKey) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Select metaValue from companies_meta where companyId = ? and metaKey = ?',
                [companyId, metaKey]
            )
                .then((res) => {
                    resolve(res[0][0].metaValue)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async validateToken(userId, token) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                id: userId
            }).select('token', 'token_issued')
                .then(async(res) => {
                    const tnow = Date.now()
                    const tDiff = tnow - parseInt(res[0].token_issued)
                    if (tDiff < 43200000) {
                        await this.dbConnection('users').where({
                            id: userId
                        }).update({token: ''})
                        if (token == res[0].token) {
                            resolve('valid')
                        } else {
                            resolve('invalid token')
                        }
                    } else {
                        resolve('expired')
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async validatePasswordByUserId(userId, password) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                id: userId
            }).select('password')
                .then((res) => {
                    if (res.length > 0) {
                        this.comparePassword(password, userId)
                            .then((isValid) => {
                                if (isValid) {
                                    resolve('valid')
                                } else {
                                    resolve('invalid')
                                }
                            })
                    } else {
                        resolve('not-found')
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

   async verifyAccount(userId) {
    if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users')
                .where({ id: userId })
                .update({
                    accountStatus: 1
                })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async resetToken(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()

            this.dbConnection('users')
                .where({ id: userId })
                .update({
                    token,
                    token_issued
                }).then((res) => {
                    resolve({
                        res,
                        token,
                    })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async generateOTP(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise(async (resolve, reject) => {
            try {
                const otp = this.getRandomIntInclusive()
                const otp_issued = Date.now()

                await this.updateUserMeta(userId, 'otp', otp)
                await this.updateUserMeta(userId, 'otp_issued', otp_issued)

                resolve(otp)
            } catch (error) {
                logger.error(err)
                reject(error)
            }
        })
    }

    async isCompanyAdmin(userId, companyId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Select role from user_company_role_relationship where userId = ? and company = ?',
                [userId, companyId]
            )
                .then((res) => {
                    resolve(res[0][0].role)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getCompanyIdForUser(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Select company from user_company_role_relationship where userId = ?',
                [userId]
            )
                .then((res) => {
                    resolve(res[0][0].company)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getCompanyRoleForUser(userId, companyId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Select role from user_company_role_relationship where userId = ? and company = ?',
                [userId, companyId]
            )
                .then((res) => {
                    if(res[0][0]){
                        resolve(res[0][0].role)
                    }
                    else {
                        resolve('no role')
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getUserDetails(email) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            logger.info('Fetching user details')
            this.dbConnection('users').where({
                email: email
            }).select('*')
                .then((res) => {
                    const userId = res[0].id
                    let user = {
                        id: res[0].id,
                        firstname: res[0].firstname,
                        lastname: res[0].lastname,
                        email: res[0].email,
                        accountStatus: res[0].accountStatus == 1 ? true : false,
                        mobileCountryCode:res[0].mobileCountryCode,
                        mobileNumber: res[0].mobileNumber,
                        passwordSet:res[0].password.length>0

                    }
                    this.getUserMetaDetailsLogin(userId)
                        .then((metaData) => {
                            if (metaData) {
                                user = { ...user, ...metaData }
                            }
                            resolve(user)
                        })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getUserCloudIntegrationData(userId){
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve,reject)=>{
            this.dbConnection('user_integrations')
            .where({userId:userId})
            .select("*")
            .then((res)=>{
                resolve(res)
            }).catch((err=>{
                logger.error(err)
                reject(err)
            }))
        })
    }

    async getUserMetaDetailsLogin(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users_meta')
                .where({ userId: userId })
                .select('*')
                .then((res) => {
                    let temp = {}
                    res.forEach(element => {
                        temp[element.metaKey] = element.metaValue
                    });

                    let data = {
                        accountLockStatus: temp['accountLockStatus'] == 1 ? true : false,
                        avatarUrl: `${process.env.USER_PROFILE_IMAGE_URL}/${temp['avatarUrl']}`,
                        twoFactorEnabled: temp['2FA'] == 1 ? true : false,
                        accountBlocked: temp['accountBlocked'] == 1 ? true : false,
                        accountType: temp['accountType'],   
                    }
                    if (temp['language'] !== undefined) {
                        data.language = temp['language'];
                    }
                    resolve(data)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async isUserExist(userId) {
        if (!logger) {
            logger = await createLogger();
        }
        try {
            const exists = await this.dbConnection('users')
                .where({ id: userId })   
                .select('id')            
                .first();

            return !!exists;
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }


    async isCompanyExist(companyId) {
        if (!logger) {
            logger = await createLogger();
        }
        try {
            const exists = await this.dbConnection('companies')
                .where({ id: companyId })
                .select('id')
                .first();

            return !!exists;
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

    async getCompanyDetails(companyId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('companies').where({
                id: companyId
            }).select('*')
                .then(async (res) => {
                    const companyId = res[0].id
                    let company = {
                        companyId: res[0].id,
                        phoneNumber: res[0].company_phone,
                        phoneNumberCountryCode:res[0].company_phone_country_code,
                        companyName: res[0].company_name,
                        orgType: res[0].company_type,
                        created: res[0].created
                    }
                    this.getCompanyMetaDetails(companyId)
                        .then((metaData) => {
                            if (metaData) {
                                company = { ...company, ...metaData }
                            }
                            resolve(company)
                        })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getCompanyDetailsByUserId(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('companies').where({
                adminId: userId
            }).select('*')
                .then((res) => {
                    const companyId = res[0].id
                    let company = {
                        companyId: res[0].id,
                        phoneNumber: res[0].company_phone,
                        companyName: res[0].company_name,
                        orgType: res[0].company_type,
                        created: res[0].created
                    }
                    this.getCompanyMetaDetails(companyId)
                        .then((metaData) => {
                            if (metaData) {
                                company = { ...company, ...metaData }
                            }
                            resolve(company)
                        })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getUserDetailsById(userId) {
        try {
            if (!logger) {
                logger = await createLogger();
            }

            const res = await this.dbConnection('users')
                .where({ id: userId })
                .select('*');

            if (!res || res.length === 0) {
                throw new Error(`User with id ${userId} not found`);
            }

            const userRecord = res[0];

            let user = {
                id: userRecord.id,
                firstname: userRecord.firstname,
                lastname: userRecord.lastname,
                email: userRecord.email,
                accountStatus: userRecord.accountStatus === 1,
                passwordSet: userRecord.password && userRecord.password.length > 0,
                mobileCountryCode: userRecord.mobileCountryCode,
                mobileNumber: userRecord.mobileNumber,
                created: userRecord.created
            };

            const metaData = await this.getUserMetaDetails(userId);

            if (metaData) {
                if (!metaData.language) {
                    const companyId = await this.getCompanyIdForUser(userId);
                    const language = await this.getCompanyLanguage(companyId);
                    metaData.language = language?.metaValue || null;
                }
                user = { ...user, ...metaData };
            }

            return user;

        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

        async getUserDetailsById2(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                id: userId
            }).select('*')
                .then((res) => {
                    const userId = res[0].id
                    let user = {
                        id: res[0].id,
                        firstname: res[0].firstname,
                        lastname: res[0].lastname,
                        mobileCountryCode: res[0].mobileCountryCode,
                        mobileNumber: res[0].mobileNumber,
                    }
                    this.getUserMetaValue(userId,"language")
                        .then((metaData) => {
                            if (metaData) {
                                const language = metaData||'en';
                                user = { ...user,language }
                            }
                            resolve(user)
                        })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getUserMetaDetails(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users_meta')
                .where({ userId: userId })
                .select('*')
                .then((res) => {
                    let temp = {}
                    res.forEach(element => {
                        temp[element.metaKey] = element.metaValue
                    });

                    let data = {
                        accountLockStatus: temp['accountLockStatus'] == 1 ? true : false,
                        avatarUrl: `${process.env.USER_PROFILE_IMAGE_URL}/${temp['avatarUrl']}`,
                        twoFactorEnabled: temp['2FA'] == 1 ? true : false,
                        accountBlocked: temp['accountBlocked'] == 1 ? true : false,
                        accountType: temp['accountType'],
                        userCloudIntegration: temp['userCloudIntegration']== 1 ? true : false,
                        userCloudIntegrationMob: temp['userCloudIntegrationMob']== 1 ? true : false,
                        GoogleDrive: temp['GoogleDrive'],
                        Dropbox: temp['Dropbox'],
                        OneDrive: temp['OneDrive'],
                        Slack: temp['Slack'],
                        Wordpress: temp['Wordpress'],

                        GoogleDrive_M: temp['GoogleDrive_M'],
                        Dropbox_M: temp['Dropbox_M'],
                        OneDrive_M: temp['OneDrive_M'],
                        Slack_M: temp['Slack_M'],
                        Wordpress_M: temp['Wordpress_M'],
                        language: temp['language'],
                    }
                    resolve(data)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

   async getCompanyMetaDetails(companyId) {
    if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('companies_meta')
                .where({ companyId: companyId })
                .select('*')
                .then((res) => {
                    let temp = {}
                    res.forEach(element => {
                        temp[element.metaKey] = element.metaValue
                    });

                    let data = {
                        mailingAddress: {
                            addressLine: temp['mailingStreetName'],
                            country:temp['mailingCountryName'],
                            city: temp['mailingCityName'],
                            state: temp['mailingState'],
                            postCode: temp['mailingZip']
                        },
                        billingAddress: {
                            addressLine: temp['billingStreetName'],
                            country:temp['billingCountryName'],
                            city: temp['billingCityName'],
                            state: temp['billingState'],
                            postCode: temp['billingZip']
                        },
                        companyLogo: temp['companyLogo'] ? `${process.env.COMPANY_LOGO_URL}/${temp['companyLogo']}` : null,
                        companytwoFactorEnabled: temp['2FA'] == 1 ? true : false,
                        language: temp['language'] || 'en'
                    }
                    resolve(data)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getCompanyRole(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('user_company_role_relationship')
                .where({ userId })
                .select('*')
                .then((roleData) => {
                    resolve(roleData[0])
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getCompanyLanguage(companyId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('companies_meta')
                .where({ companyId,metaKey:'language' })
                .select('*')
                .then((languageData) => {
                    resolve(languageData[0])
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getIncorrectOTPAttemptRecord(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.getUserMetaValue(userId, 'incorrect_attempt_count')
                .then((count) => resolve(count))
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async isAccountLockedForIncorrectOtpAccount(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.getUserMetaValue(userId, 'accountLockStatus')
                .then((status) => {
                    if (status == 0) {
                        resolve(0)
                    } else {
                        const currentTimestamp = Date.now()
                        this.getUserMetaValue(userId, 'attempt_timestamp')
                            .then((time) => {
                                if (time) {
                                    let tDiff = currentTimestamp - parseInt(time)
                                    if (tDiff < 43200000) {
                                        resolve(1)
                                    } else {
                                        this.updateUserMeta(userId, 'incorrect_attempt_count', 0)
                                        this.updateUserMeta(userId, 'accountLockStatus', 0)
                                        resolve(0)
                                    }
                                }
                            })
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async updateIncorrectOTPAttemptRecord(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            const currentTimestamp = Date.now()
            this.getUserMetaValue(userId, 'attempt_timestamp')
                .then((time) => {
                    if (time) {
                        let tDiff = currentTimestamp - parseInt(time)
                        if (tDiff < 43200000) {
                            this.getIncorrectOTPAttemptRecord(userId)
                                .then((count) => {
                                    let countInt = parseInt(count)
                                    countInt += 1
                                    if (countInt <= 3) {
                                        this.updateUserMeta(userId, 'incorrect_attempt_count', countInt)
                                    } else {
                                        this.updateUserMeta(userId, 'accountLockStatus', 1)
                                    }

                                })
                        } else {
                            this.updateUserMeta(userId, 'incorrect_attempt_count', 1)
                            this.updateUserMeta(userId, 'attempt_timestamp', currentTimestamp)
                        }
                    } else {
                        this.updateUserMeta(userId, 'incorrect_attempt_count', 1)
                        this.updateUserMeta(userId, 'attempt_timestamp', currentTimestamp)
                    }

                })
        })
    }
    async validateLoginCredential2(email) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                email: email
            })
            .then((res) => {
                if (res.length > 0) {
                    this.isAccountLockedForIncorrectOtpAccount(res[0].id)
                    .then((stat) => {
                        if (stat == 0) {
                            resolve(
                                {
                                    stat: 'valid',
                                    userId: res[0].id,
                                }
                            )
                        } else {
                            resolve(
                                {
                                    stat: 'locked'
                                }
                            )
                        }
                    })
                    .catch((err) => {
                        console.log(err)
                        reject(err)
                    })
                } else {
                    resolve({ stat: 'not-found' })
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }
    async validateLoginCredential(email, password) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                email: email
            }).select('id', 'password')
                .then((res) => {
                    if (res.length > 0) {
                        this.comparePassword(password, res[0].id)
                            .then((isValid) => {
                                if (isValid) {
                                    this.isAccountLockedForIncorrectOtpAccount(res[0].id)
                                        .then((stat) => {
                                            if (stat == 0) {
                                                resolve(
                                                    {
                                                        stat: 'valid',
                                                        userId: res[0].id,
                                                    }
                                                )
                                            } else {
                                                resolve(
                                                    {
                                                        stat: 'locked'
                                                    }
                                                )
                                            }
                                        })
                                        .catch((err) => {
                                            console.log(err)
                                            reject(err)
                                        })
                                } else {
                                    resolve({ stat: 'invalid' })
                                }
                            })
                            .catch((err) => {
                                console.log(err)
                                reject(err)
                            })
                    } else {
                        resolve({ stat: 'not-found' })
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async validateCredentialAndOtp(email, otp) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.validateLoginCredential2(email).then((res) => {
                const currentTimestamp = Date.now()
                if (res.stat == 'valid') {
                    this.isAccountLockedForIncorrectOtpAccount(res.userId)
                        .then((stat) => {
                            if (stat == 0) {
                                this.getUserMetaValue(res.userId, 'otp').then((otpInRecord) => {
                                    if (otpInRecord == otp) {
                                        this.getUserMetaValue(res.userId, 'otp_issued').then((otpIssuedTime) => {
                                            const tDiff = currentTimestamp - otpIssuedTime
                                            if (tDiff <= 600000) {
                                                resolve('valid')
                                            } else {
                                                resolve('expired')
                                            }
                                        })
                                    } else {
                                        this.updateIncorrectOTPAttemptRecord(res.userId)
                                        resolve('Invalid OTP')
                                    }
                                })
                            } else {
                                resolve('locked')
                            }
                        })
                } else if (res.stat == 'locked') {
                    resolve('locked')
                } else {
                    resolve('Invalid Credential')
                }
            })
        })
    }

    async validatePassword(userId, password) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users')
                .where({ id: userId })
                .select('password')
                .then((res) => {
                    this.comparePassword(password, userId)
                        .then((isValid) => {
                            if (isValid) {
                                resolve('valid')
                            } else {
                                resolve('invalid')
                            }
                        })
                        .catch((err) => {
                            console.log(err)
                            reject(err)
                        })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async updatePassword(userId, password) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.generateHash(password)
                .then((hashedPassword) => {
                    this.dbConnection('users')
                        .where({ id: userId })
                        .update({ password: hashedPassword })
                        .then((res) => {
                            resolve(res)
                        })
                        .catch((err) => {
                            reject(err)
                            logger.error(err)
                        })
                })
                .catch((err) => {
                    reject(err)
                    logger.error(err)
                })
        })
    }

    async updateEmail(userId, email) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users')
                .where({ id: userId })
                .update({
                    email,
                    accountStatus: 0
                })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async isUpdatingSameEmail(userId, newEmail) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users')
                .where({ id: userId })
                .select('email')
                .then((res) => {
                    if (res[0].email == newEmail) {
                        resolve('yes')
                    } else {
                        resolve('no')
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async isAccountVerified(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users')
                .where({ id: userId })
                .select('accountStatus')
                .then((res) => {
                    if (res[0].accountStatus == 1) {
                        resolve('verified')
                    } else {
                        resolve('not verified')
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async is2FAEnabled(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.getUserMetaValue(userId, '2FA')
                .then((res) => {
                    if (res == 1) {
                        resolve('enabled')
                    } else {
                        resolve('disabled')
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async isCompany2FAEnabled(companyId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.getCompanyMetaValue(companyId, '2FA')
                .then((res) => {
                    if (res == 1) {
                        resolve('enabled')
                    } else {
                        resolve('disabled')
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async enable2FA(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.isAccountVerified(userId)
                .then(async (res) => {
                    if (res == 'verified') {
                        await this.updateUserMeta(userId, '2FA', 1)

                        resolve(1)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }
        async update2FA(userId,enabled) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.isAccountVerified(userId)
                .then(async (res) => {
                    if (res == 'verified') {
                        const current= await this.getUserMetaValue(userId, '2FA')

                        if(current==1 && enabled){
                            resolve("already-enabled")
                        }else if(current==0 && !enabled) {
                            resolve("already-disabled")
                        }  
                        if(enabled){
                            await this.updateUserMeta(userId, '2FA', 1)
                            resolve('enabled')
                        }else{
                            await this.updateUserMeta(userId, '2FA', 0)
                            resolve('disabled')
                        }

                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    console.log(err)
                    logger.error(err)
                    reject(err)
                })
        })
    }

    disable2FA(userId) {
        return new Promise(async (resolve, reject) => {
            await this.updateUserMeta(userId, '2FA', 0)
            resolve(1)
        })
    }

    async enableCompany2FA(companyId, userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.isAccountVerified(userId)
                .then(async (res) => {
                    if (res == 'verified') {
                        await this.updateCompanyMeta(companyId, '2FA', 1)

                        resolve(1)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async updateCompany2FA(companyId, userId,enabled) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.isAccountVerified(userId)
                .then(async (res) => {
                    if (res == 'verified') {
                        if(enabled){
                            await this.updateCompanyMeta(companyId, '2FA', 1)
                        }else{
                             await this.updateCompanyMeta(companyId, '2FA', 0)
                        }
                        resolve(1)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    disableCompany2FA(companyId) {
        return new Promise(async (resolve, reject) => {
            await this.updateCompanyMeta(companyId, '2FA', 0)
            resolve(1)
        })
    }

    async enable2FAForAllCompanyUsers(companyId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('user_company_role_relationship')
                .where({ company: companyId })
                .select('userId')
                .then(async (res) => {
                    if (res.length > 0) {
                        await res.forEach(data => {
                            this.isAccountVerified(data.userId)
                                .then(async (res) => {
                                    if (res == 'verified') {
                                        await this.updateUserMeta(data.userId, '2FA', 1)
                                    }
                                })
                                .catch((err) => {
                                    logger.error(err)
                                })
                        });
                        resolve(1)
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }
    async update2FAForAllCompanyUsers(companyId, enabled) {
        if (!logger) logger = await createLogger();

        try {
            const users = await this.dbConnection('user_company_role_relationship')
                .where({ company: companyId })
                .select('userId');

            if (!users.length) {
                return { status: 1, warnings: [] };
            }

            const warnings = [];
            const updatePromises = [];

            for (const { userId } of users) {
                updatePromises.push(
                    this.isAccountVerified(userId)
                        .then(async (status) => {
                            const userCurrent = await this.getUserMetaValue(userId,"2FA")
                            if (status === 'verified') {
                                if(userCurrent != enabled){
                                    await this.updateUserMeta(userId, '2FA', enabled ? 1 : 0);
                                }else{
                                    warnings.push({
                                    userId,
                                    reason: `User already ${enabled == 1 ? "enabled" : "disabled"}`
                                });
                                }
                            } else {
                                warnings.push({
                                    userId,
                                    reason: "User is not verified"
                                });
                            }
                        })
                        .catch((err) => {
                            logger.error(err);
                            warnings.push({
                                userId,
                                reason: "Update failed"
                            });
                        })
                );
            }

            await Promise.all(updatePromises);

            return { status: 1, warnings };

        } catch (err) {
            logger.error(err);
            return { status: 0, warnings: [] };
        }
    }

    async disable2FAForAllCompanyUsers(companyId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('user_company_role_relationship')
                .where({ company: companyId })
                .select('userId')
                .then(async (res) => {
                    if (res.length > 0) {
                        res.forEach(data => {
                            this.updateUserMeta(data.userId, '2FA', 0)
                        });
                        resolve(1)
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async updateCloudIntegrationForAllCompanyUsers(companyId, userCloudIntegration, userCloudIntegrationMob,
        Dropbox,
        Dropbox_M,
        GoogleDrive,
        GoogleDrive_M,
        OneDrive,
        OneDrive_M,
        Slack,
        Slack_M,
        Wordpress,
        Wordpress_M,
    ) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('user_company_role_relationship')
                .where({ company: companyId })
                .select('userId')
                .then(async (res) => {
                    if (res.length > 0) {
                        await res.forEach(async data => {
                            await this.updateUserMeta(data.userId, 'userCloudIntegration', userCloudIntegration)
                            await this.updateUserMeta(data.userId, 'userCloudIntegrationMob', userCloudIntegrationMob)
                            await this.updateUserMeta(data.userId, 'Dropbox', Dropbox)
                            await this.updateUserMeta(data.userId, 'Dropbox_M', Dropbox_M)
                            await this.updateUserMeta(data.userId, 'GoogleDrive', GoogleDrive)
                            await this.updateUserMeta(data.userId, 'GoogleDrive_M', GoogleDrive_M)
                            await this.updateUserMeta(data.userId, 'OneDrive', OneDrive)
                            await this.updateUserMeta(data.userId, 'OneDrive_M', OneDrive_M)
                            await this.updateUserMeta(data.userId, 'Slack', Slack)
                            await this.updateUserMeta(data.userId, 'Slack_M', Slack_M)
                            await this.updateUserMeta(data.userId, 'Wordpress', Wordpress)
                            await this.updateUserMeta(data.userId, 'Wordpress_M', Wordpress_M)
                        });
                        resolve(1)
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getAccountStatistic(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users_meta')
                .where({ userId: userId })
                .select('*')
                .then((res) => {
                    let temp = {}
                    res.forEach(element => {
                        temp[element.metaKey] = element.metaValue
                    });

                    let stat = {
                        noOfQueriesMaxLimit: temp['queries_max_limit'],
                        noOfQueriesDone: temp['no_of_queries'],
                        noOfUsersMaxLimit: temp['users_max_limit'],
                        noOfUsers: temp['no_of_users'],
                        storageSizeMaxLimit: temp['storage_size_max_limit'],
                        storageSizeOccupied: temp['file_size']
                    }
                    resolve(stat)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async addInvitationDetails(
        email,
        senderId,
        role,
        companyId
    ) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()
            const dateTime = new Date()

            this.dbConnection('invitations')
                .insert({
                    sender: senderId,
                    company: companyId,
                    email,
                    role,
                    status: 'Pending',
                    token,
                    token_issued,
                    created: dateTime,
                    updated: dateTime
                })
                .then((invitationId) => {
                    resolve({
                        invitationId,
                        token
                    })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async updateInvitationDetails(
        email,
        companyId,
    ) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()
            const dateTime = new Date()

            this.dbConnection('invitations')
                .where({ email, company: companyId })
                .update({
                    status: 'Pending',
                    token,
                    token_issued,
                    created: dateTime,
                    updated: dateTime
                })
                .then((result) => {
                    if (result > 0) {
                        return this.dbConnection('invitations')
                            .select('id')
                            .where({ email, company: companyId })
                            .first()
                            .then(({ id }) => resolve({ invitationId: id, token }));
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getTotalNumberOfPageForInvitationList(limit, companyId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection
                .select('*')
                .from('invitations')
                .where({ company: companyId })
                .then((_list) => {
                    resolve({
                        totalPageNum: Math.ceil(_list.length / limit),
                        noOfRecords: _list.length
                    })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getTotalNumberOfPageForFilteredInvitationList(limit, companyId, email) {
      if (!logger) logger = await createLogger();
      try {
        const [{ total }] = await this.dbConnection('invitations')
          .count('* as total')
          .where({ company: companyId })
          .whereRaw("LOWER(email) LIKE ?", [`%${email.toLowerCase()}%`]);

        const totalPageNum = Math.ceil(total / limit);

        return {
          totalPageNum,
          noOfRecords: total,
        };

      } catch (err) {
        logger.error(err);
        throw err;
      }
    }


    async getInvitationList(offset, limit, companyId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection
                .select('*')
                .from('invitations')
                .where({ company: companyId })
                .limit(limit)
                .offset(offset)
                .then(async (invitationList) => {
                    await invitationList.map((invitation) => {
                        invitation.selected = false
                    })
                    resolve(invitationList)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async searchUser(email, offset, limit, companyId) {
      if (!logger) logger = await createLogger();

      try {
        const invitationList = await this.dbConnection('invitations')
          .whereRaw("LOWER(email) LIKE ?", [`%${email.toLowerCase()}%`])
          .andWhere({ company: companyId })
          .limit(limit)
          .offset(offset);

        invitationList.forEach(i => i.selected = false);
        return invitationList;
      } catch (err) {
        logger.error(err);
        throw err;
      }
    }

    async deleteInvitations(invitationIds) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise(async (resolve, reject) => {
            try {
                await invitationIds.map(async (invId) => {
                    await this.dbConnection.raw(
                        'Delete from invitations where id = ?',
                        [invId]
                    )
                })
                resolve(1)
            } catch (error) {
                logger.error(error)
                reject(error)
            }
        })
    }

    async deleteInvitation(invitationId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            try {
                this.dbConnection.raw(
                    'Delete from invitations where id = ?',
                    [invitationId]
                )
                    .then((res) => {
                        resolve(1)
                    })
                    .catch((err) => {
                        logger.error(err)
                        reject(err)
                    })
            } catch (error) {
                logger.error(error)
                reject(error)
            }
        })
    }

    async getInvitationDetail(email) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('invitations')
                .where({ email: email })
                .select('*')
                .then((res) => {
                    if (res.length > 0) {
                        resolve(res[0])
                    } else {
                        resolve(false)
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    console.log(err)
                    reject(err)
                })
        })
    }

    async isInvitationExist(invitationId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('invitations')
                .where({ id: invitationId })
                .select('*')
                .then((res) => {
                    if (res.length > 0) {
                        resolve('exists')
                    } else {
                        resolve('not-exists')
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    console.log(err)
                    reject(err)
                })
        })
    }

    async isInvitationSent(email) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('invitations')
                .where({ email: email })
                .select('*')
                .then((res) => {
                    if (res.length > 0) {
                        resolve('yes')
                    } else {
                        resolve('no')
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    console.log(err)
                    reject(err)
                })
        })
    }

    async isPreviousInvitationExpired(email) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('invitations')
                .where({ email: email })
                .select('*')
                .then((res) => {
                    const tnow = Date.now()
                    const tDiff = tnow - parseInt(res[0].token_issued)

                    if (tDiff < 600000) {
                        resolve('not-expired')
                    } else {
                        resolve('expired')
                    }
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    async updateInvitationToken(email) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()
            const dateTime = new Date()

            this.dbConnection('invitations')
                .where({ email: email })
                .update({
                    status: 'Pending',
                    token,
                    token_issued,
                    created: dateTime,
                    updated: dateTime
                }).then((res) => {
                    resolve({
                        res,
                        token,
                    })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async updateInvitationStatusAndUserId(status, email, userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {

            this.dbConnection('invitations')
                .where({ email: email })
                .update({
                    status,
                    userId
                }).then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async declineInvitation(email) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('invitations')
                .where({ email: email })
                .update({
                    status: 'Declined'
                }).then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async userLockAndUnlockOptionForAdmin(userId, status) {
        if (!logger) {
            logger = await createLogger();
            }
            let lock =0;
            if(status =='lock'){
                lock=1
            }

        return new Promise((resolve, reject) => {
            this.updateUserMeta(userId, 'accountLockStatus', lock)
                .then((res) => {
                    resolve(1)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    async blackListAccount(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.updateUserMeta(userId, 'accountBlocked', '1')
                .then((res) => {
                    resolve(1)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    whiteListAccount(userId) {
        return new Promise((resolve, reject) => {
            this.updateUserMeta(userId, 'accountBlocked', '0')
                .then((res) => {
                    resolve(1)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getCompanyUserCount(companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('user_company_role_relationship')
                .where({ company: companyId })
                .then((users) => {
                    resolve(users.length)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    async removeUser(
        userId
    ) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            const dateTime = new Date()

            this.dbConnection('users')
                .where({ id: userId })
                .del().then(async () => {
                    try {
                        this.dbConnection('user_company_role_relationship')
                            .where({ userId: userId })
                            .delete()
                            .then(() => {
                                this.dbConnection('invitations')
                                    .where({ userId: userId })
                                    .delete()
                                    .then(() => {
                                        resolve(1)
                                    })
                            })
                    } catch (error) {
                        console.log(error)
                        logger.error(error)
                        reject(error)
                    }
                })
        })
    }

    async getUserDetailsforSuperAdmin() {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users').select('id', 'firstname', 'lastname', 'email', 'mobileCountryCode', 'mobileNumber', 'accountStatus', 'created')
            .whereNotNull('email') 
            .andWhere('email', '<>', '')
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getInvitaionDetailsforSuperAdmin(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('invitations').where({ userId }).select('*')
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getInvitaionsDetailsforSuperAdmin(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('invitations').where({ sender: userId }).select('*')
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getUserTokenDetails(chatId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('tokens_used')
                .select('*')
                .where({ chatId })
                .then((data) => {
                    resolve(data)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    async getUserInvitedDetailforSuperAdmin(userId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({ id: userId }).select('id', 'firstname', 'lastname', 'email', 'mobileCountryCode','mobileNumber', 'accountStatus', 'created')
                .then((res) => {
                    const userId = res[0].id
                    this.getUserMetaDetails(userId)
                        .then((metaData) => {
                            if (metaData) {
                                resolve({ ...res[0], ...metaData })
                            }
                        })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    getCompanyUsers(companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('user_company_role_relationship')
                .where({ company: companyId })
                .then((users) => {
                    resolve(users)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    async createNewAccountForSuperUser(
        firstname,
        lastname,
        email,
        mobileCountryCode,
        mobileNumber,
        password,
        companytwoFactorEnabled,
        companyId,
        role
    ) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()
            const dateTime = new Date()

            this.generateHash(password)
                .then((hashedPassword) => {
                    this.dbConnection('users').insert(
                        {
                            firstname,
                            lastname,
                            email,
                            mobileCountryCode,
                            mobileNumber,
                            password: hashedPassword,
                            accountStatus: 1,
                            token,
                            token_issued,
                            created: dateTime,
                            updated: dateTime
                        }
                    ).then(async (userId) => {
                        try {
                            await this._addUserMeta(userId[0], 'otp', '')
                            await this._addUserMeta(userId[0], 'otp_issued', '')
                            await this._addUserMeta(userId[0], 'incorrect_attempt_count', 0)
                            await this._addUserMeta(userId[0], 'attempt_timestamp', '')
                            await this._addUserMeta(userId[0], 'accountLockStatus', 0)
                            await this._addUserMeta(userId[0], 'avatarUrl', 'default_avatar.png')
                            await this._addUserMeta(userId[0], '2FA', companytwoFactorEnabled ? '1' : '0')
                            await this._addUserMeta(userId[0], 'accountBlocked', '0')
                            await this._addUserMeta(userId[0], 'accountType', 'Team')
                            await this._addUserMeta(userId[0], 'signUpMethod', 'email')
                            const userCloudIntegration = await getAdminSetting("CLOUD_INTEGRATION")
                            const userCloudIntegrationMob = userCloudIntegration
                            await this._addUserMeta(userId[0], 'userCloudIntegration', userCloudIntegration)
                            await this._addUserMeta(userId[0], 'userCloudIntegrationMob', userCloudIntegrationMob)

                            await this._addUserMeta(userId[0], 'GoogleDrive', userCloudIntegration)
                            await this._addUserMeta(userId[0], 'Dropbox', userCloudIntegration)
                            await this._addUserMeta(userId[0], 'OneDrive', userCloudIntegration)
                            await this._addUserMeta(userId[0], 'Slack', userCloudIntegration)
                            await this._addUserMeta(userId[0], 'Wordpress', userCloudIntegration)

                            await this._addUserMeta(userId[0], 'GoogleDrive_M', userCloudIntegrationMob)
                            await this._addUserMeta(userId[0], 'Dropbox_M', userCloudIntegrationMob)
                            await this._addUserMeta(userId[0], 'OneDrive_M', userCloudIntegrationMob)
                            await this._addUserMeta(userId[0], 'Slack_M', userCloudIntegrationMob)
                            await this._addUserMeta(userId[0], 'Wordpress_M', userCloudIntegrationMob)

                            await this.addRoleAndCompanyToUser(userId, companyId, role)

                            resolve({
                                userId: userId[0]
                            })
                        } catch (error) {
                            logger.error(error)
                            reject(error)
                        }
                    })
                        .catch((err) => {
                            logger.error(err)
                            reject(err)
                        })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async removeSuperUser(
        userId
    ) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {

            this.dbConnection('users')
                .where({ id: userId })
                .delete()
                .then(async () => {
                    resolve(1)
                })
                .catch((error) => {
                    console.log(error)
                    logger.error(error)
                    reject(error)
                })
        })
    }

    async getCompanyUserRole(companyId) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection('user_company_role_relationship')
                .where({ company: companyId })
                .select('*')
                .then((roleData) => {
                    resolve(roleData)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async updateUserMetaQueries(userId, metaKey = "queries") {
        if (!logger) {
            logger = await createLogger();
            }
        if (userId) {
            return new Promise((resolve, reject) => {
                this.dbConnection.raw(
                    'UPDATE users_meta SET metaValue = metaValue + 1 WHERE userId = ? AND metaKey = ?',
                    [userId, metaKey]
                )
                    .then((result) => {
                        resolve(result);
                    })
                    .catch((err) => {
                        logger.error(err);
                        reject(err);
                    });
            });
        }
    }

    async checkMetaKeyExists(userId, metaKey) {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'SELECT * FROM users_meta WHERE userId = ? AND metaKey = ?',
                [userId, metaKey]
            )
                .then((result) => {
                    resolve(result[0]);
                })
                .catch((err) => {
                    logger.error(err);
                    reject(err);
                });
        });
    }

    async shouldResetQueriesMetaValue() {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise(async (resolve, reject) => {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;

            const userId = await this.dbConnection('users_meta').select('userId').first().then(row => row.userId);
            const lastCheckedMonth = await this.getUserMetaValue(userId, "lastCheckedMonth");
            if (lastCheckedMonth == currentMonth) {
                resolve(0);
                return;
            }

            this.dbConnection('users_meta')
                .where('metaKey', 'queries')
                .pluck('metaValue')
                .then(allQueriesMetaValues => {
                    const allZeroValues = allQueriesMetaValues.every(value => value == 0);
                    if (allZeroValues) {
                        resolve(0);
                    } else {
                        resolve(1);
                    }
                })
                .catch(error => {
                    logger.error(error);
                    reject(error);
                });
        });
    }

    async resetQueriesMetaValueForNewMonth() {
        if (!logger) {
            logger = await createLogger();
            }
        return new Promise(async (resolve, reject) => {
            this.shouldResetQueriesMetaValue()
                .then(async (res) => {
                    if(res == 0) {
                        resolve(0);
                    } else {
                        const currentMonth = new Date().getMonth() + 1;
                        try {
                            const userIds = await this.dbConnection('users_meta')
                                .distinct('userId')
                                .pluck('userId');
            
                            for (const userId of userIds) {
                                await this.dbConnection('users_meta')
                                    .where({
                                        userId: userId,
                                        metaKey: 'queries'
                                    })
                                    .update({
                                        metaValue: 0,
                                    });
                                
                                const lastCheckedMonth = await this.getUserMetaValue(userId, "lastCheckedMonth");
                                if(!lastCheckedMonth) {
                                    await this._addUserMeta(userId, 'lastCheckedMonth', currentMonth)
                                } else {
                                    await this.updateUserMeta(userId, 'lastCheckedMonth', currentMonth)
                                }
                            }
                            resolve(1);
                        } catch (error) {
                            logger.error(error);
                            reject(error);
                        }
                    }
                })
                .catch((error) => {
                    logger.error(error);
                    reject(error);
                })
        });
    }
}

module.exports = Users