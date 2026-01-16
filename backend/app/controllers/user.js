var jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const qs = require("qs"); 
const Users = require('../services/Users')
const Documents = require('../services/Documents')
const redis = require("./../init/redisClient");
const crypto = require("crypto")
const { emailTransporter } = require('../init/emailTransporter')
const {
    createCheckoutSessionURLForType1,
    createCheckoutSessionURLForType2,
    createCheckoutSessionURLForType3,
    createCheckoutSessionURLForType4
} = require('../init/stripe')
const axios = require('axios')
const fs = require('fs');
const { getAdminSetting } = require('../init/redisUtils');
const { google } = require('googleapis');
const { createLogger } = require('../init/logger');
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

dotenv.config();

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


class UsersController {
    static async  getStoredRefreshToken(userId) {
        const row = await knex("user_tokens")
            .where({ userId: userId })
            .first();
        return row?.refresh_token || null;
    }

    static async  saveRefreshToken(userId, token) {
        return knex("user_tokens")
            .update({ refresh_token: token })
            .where({ userId: userId });
    }
    static createAccessToken(payload) {
        return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "1h" 
        });
    }

    static createRefreshToken(payload) {
        return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: "30d"
        });
    }
    static async generateAccessToken(request, response) {
       if (request.method !== "POST") {
           return response.status(405).json({
               success: false,
               error: "method_not_allowed",
               message: "This endpoint only supports POST",
               details: []
           });
       }

       try {
           const userService = new Users(knex);
           const incomingToken = request.body.refreshToken;

           if (!incomingToken) {
               return response.status(400).json({
                   success: false,
                   error: "bad_request",
                   message: "Missing or invalid parameters",
                   details: [
                       { field: "refreshToken", issue: "refreshToken is required" }
                   ]
               });
           }

           jwt.verify(
               incomingToken,
               process.env.REFRESH_TOKEN_SECRET,
               async (err, decoded) => {

                   if (err) {
                       return response.status(401).json({
                           success: false,
                           error: "unauthorized",
                           message: "Expired refresh token",
                           details: []
                       });
                   }

                   const userId = decoded.userId;

                   const storedToken = await UsersController.getStoredRefreshToken(userId);
                   if (!storedToken || storedToken !== incomingToken) {
                       await UsersController.saveRefreshToken(userId, null); 
                       return response.status(403).json({
                           success: false,
                           error: "forbidden",
                           message: "Refresh token reuse detected — sessions revoked",
                           details: { action: "revoke_all_sessions" }
                       });
                   }

                   const userData = await userService.getUserDetailsById(userId);
                   const companyData = await userService.getCompanyRole(userId);

                   const payload = {
                       userId: userData.id,
                       firstname: userData.firstname,
                       lastname: userData.lastname,
                       email: userData.email,
                       role: companyData.role,
                       company: companyData.company
                   };

                   const accessToken = UsersController.createAccessToken(payload);

                   const newRefreshToken = UsersController.createRefreshToken({ userId });

                   const refreshTokenExpiresAt = new Date();
                   refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 30);

                   await UsersController.saveRefreshToken(userId, newRefreshToken);

                   return response.json({
                       success: true,
                       auth: {
                           accessToken,
                           tokenType: "Bearer",
                           expiresIn: 3600,
                           refreshToken: newRefreshToken,
                           refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString()
                       }
                   });
               }
           );
       }

       catch (err) {
           console.error("Server error:", err);

           if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
               return response.status(503).json({
                   success: false,
                   error: "service_unavailable",
                   message: "Service unavailable, please try again later"
               });
           }

           return response.status(500).json({
               success: false,
               error: "server_error",
               message: "An unexpected error occurred"
           });
       }
    }

    static async verifySocialSignupPKCE({
      request,
      response
    }) {
      const signUpEmail = request.body.email;
      const code = request.body.code;
      const code_verifier = request.body.code_verifier;

      if (!code) {
        response.status(400).json({
          success: false,
          error: "bad_request",
          message: "Invalid or missing fields",
          details: [{ field: "code", issue: "This field is required" }],
        });
        return { success: false };
      }

      if (!code_verifier) {
        response.status(400).json({
          success: false,
          error: "bad_request",
          message: "Invalid or missing fields",
          details: [{ field: "code_verifier", issue: "This field is required" }],
        });
        return { success: false };
      }

      const raw = await redis.get(`login_code:${code}`);

      if (!raw) {
        response.status(401).json({
          success: false,
          error: "unauthorized",
          message: "Invalid or expired signup code",
        });
        return { success: false };
      }

      const record = JSON.parse(raw);

      if (signUpEmail !== record.email) {
        response.status(401).json({
          success: false,
          error: "unauthorized",
          message: "Invalid signup code",
        });
        return { success: false };
      }

      const derivedChallenge = crypto
        .createHash("sha256")
        .update(code_verifier)
        .digest("base64url");

      if (derivedChallenge !== record.pkceChallenge) {
        response.status(401).json({
          success: false,
          error: "unauthorized",
          message: "PKCE verification failed",
        });
        return { success: false };
      }

      await redis.del(`login_code:${code}`);

      return {
        success: true,
        email: record.email,
      };
    }


    static async createSessionURL(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        const paymentMode = await getAdminSetting('PAYMENT_MODE');
        if(request.body.accountType == "invited"){
            const errorResponse = (status, message, details = [], error = "bad_request") => {
                const resObj = { success: false, error, message };
                if (details.length) resObj.details = details;
                logger.debug(JSON.stringify(resObj));
                return response.status(status).send(resObj);
            };

            const validateFields = (required) => {
                const details = [];
                required.forEach(field => {
                    if (!request.body[field]) {
                        details.push({ field, issue: "This field is required" });
                    }
                });
                return details;
            };

            const logDebug = (body) => {
                logger.debug(JSON.stringify({
                    url: request.protocol + '://' + request.get('host') + request.originalUrl,
                    body: body,
                    headers: request.headers
                }));
            };

            const emailSignupRequired = [
                "firstname", "lastname", "email", "mobileCountryCode",
                "mobileNumber", "password", "companyId",
                "role", "token", "signUpMethod"
            ];

            const socialSignupRequired = [
                "firstname", "lastname", "email",
                "companyId", "role", "token",
                "signUpMethod", "avatarUrl", "code","code_verifier"
            ];

            let requiredFields = request.body.signUpMethod === "email"
                ? emailSignupRequired
                : socialSignupRequired;

            const missing = validateFields(requiredFields);

            if (missing.length > 0) {
                return errorResponse(400, "Invalid or missing fields", missing);
            }

            logDebug({ ...request.body, password: "**********" });

            logger.info(`Fetching invitation details for ${request.body.email}`);
            const invitation = await user.getInvitationDetail(request.body.email);

            if (!invitation) {
                return errorResponse(400, request.t("invalidInvitation"), [], "invalid_invitation");
            }

            const tDiff = Date.now() - parseInt(invitation.token_issued);

            if (invitation.status === "Declined") {
                return errorResponse(409, request.t("invitationDeclined"), [], "invitation_declined");
            }

            if (invitation.status === "Registered") {
                return errorResponse(409, request.t("accountAlreadyRegistered"), [], "already_registered");
            }

            if (invitation.status !== "Pending") {
                return errorResponse(400, request.t("invalidInvitation"));
            }

            if (tDiff >= 43200000) {
                return errorResponse(410, request.t("invitationExpired"), [], "expired");
            }
            if (invitation.token != request.body.token) {
                return errorResponse(401, request.t("invalidToken"), [], "unauthorized");
            }
            if (invitation.company != request.body.companyId) {
                return errorResponse(401, "Invalid Company ID provided", [], "unauthorized");
            }

            logger.info(`Fetching company details for companyId ${request.body.companyId}`);
            const company = await user.getCompanyDetails(request.body.companyId);

            if (!company) {
                return errorResponse(400, request.t("accountCreationFailedInvalidCompany"), [], "bad_request");
            }
            if (
              request.body.signUpMethod === "email" &&
              (
                request.body.password.length < 8 ||
                !/[0-9]/.test(request.body.password) ||                // must contain number
                !/[!@#$%^&*(),.?":{}|<>]/.test(request.body.password) || // must contain symbol
                !/[A-Z]/.test(request.body.password) ||                // must contain uppercase
                !/[a-z]/.test(request.body.password)                   // must contain lowercase
              )
            ) {
              return response.status(422).send({
                success: false,
                error: "validation_error",
                message: "Validation failed",
                details: [
                  {
                    field: "password",
                    issue:
                      "Password too weak. Must be at least 8 characters, include uppercase, lowercase, number, and symbol.",
                  }
                ]
              });
            }
            /* -------------------- SOCIAL SIGNUP CODE -------------------- */
            let signUpType = request.body.signUpMethod;
            if (signUpType === "social") {
                const result = await UsersController.verifySocialSignupPKCE({
                  request,
                  response,
                  redis,
                });
                 if (!result.success) {
                  return;
                }
            }

            let created;
            if (request.body.signUpMethod === "email") {
                logger.info(`Creating email-invited user account for ${request.body.email}`);
                created = await user.createNewAccountForInvitedUser(
                    request.body.firstname,
                    request.body.lastname,
                    request.body.email,
                    request.body.mobileCountryCode,
                    request.body.mobileNumber,
                    request.body.password,
                    company.companytwoFactorEnabled,
                    request.body.companyId,
                    request.body.role,
                    request.body.signUpMethod
                );
            } else {
                logger.info(`Creating social-invited user account for ${request.body.email}`);

                created = await user.createNewAccountForSocialInvitedUser(
                    request.body.firstname,
                    request.body.lastname,
                    request.body.email,
                    company.companytwoFactorEnabled,
                    request.body.companyId,
                    request.body.role,
                    request.body.signUpMethod
                );

                logger.info(`Downloading profile image for ${request.body.email}`);
                const img = await axios.get(request.body.avatarUrl, { responseType: "arraybuffer" });
                const fileName = `${request.body.firstname}_${Date.now()}.jpg`;
                fs.writeFileSync(`${process.env.BACKEND_PATH}/uploads/userAvatars/${fileName}`, img.data);

                await user.updateUserMeta(created.userId, "avatarUrl", fileName);
            }

            const userId = created.userId;

            await user.updateInvitationStatusAndUserId("Registered", request.body.email, userId);


            let userData = await user.getUserDetailsById(userId);
            userData = { ...userData, ...company };

            const roleData = await user.getCompanyRole(userId);

            const accessPayload = {
                userId: userData.id,
                firstname: userData.firstname,
                lastname: userData.lastname,
                email: userData.email,
                role: roleData.role,
                company: roleData.company
            };
            const refreshPayload = { 
                userId: userData.id 
            };
            const accessToken =  UsersController.createAccessToken(accessPayload);
            const refreshToken =  UsersController.createRefreshToken(refreshPayload);
            const refreshTokenDecoded = jwt.decode(refreshToken);
            const refreshTokenExpiresAt = new Date(refreshTokenDecoded.exp * 1000)
            await knex('user_tokens').insert({
                userId: userData.id,
                refresh_token: refreshToken,
                expires_at: refreshTokenExpiresAt
            });

            userData = {
                ...userData,
                role: roleData.role,
                 auth: {
                    accessToken,
                    refreshToken,
                    expiresIn:3600,
                    refreshTokenExpiresAt
                },
            };
            const userD = {
                id: userData.id,
                firstname: userData.firstname,
                lastname: userData.lastname,
                email: userData.email,
                accountType: userData.accountType,
                accountStatus:userData.accountStatus,
                currency:userData.currency,
                mobileNumber: userData.mobileNumber,
                mobileCountryCode: userData.mobileCountryCode,
                avatarUrl: userData.avatarUrl,
                twoFactorEnabled: userData.twoFactorEnabled,
                passwordSet: userData.passwordSet,
                userCloudIntegrationWeb: userData.userCloudIntegration == '1' ? true : false,
                userCloudIntegrationMob:userData.userCloudIntegrationMob == '1' ? true : false,
                role: roleData.role,
                auth: userData.auth
            };
            const sender = await user.getUserDetailsById(invitation.sender);
            const template = await user.getMailTemplate(7);
            let subject = template[0].subject.replace("{{name}}", sender.firstname);
            let html = template[0].template
                .replace("{{name}}", sender.firstname)
                .replace("{{email}}", request.body.email);

            const { transporter, mailingAddress } = await emailTransporter();

            transporter.sendMail({
                from: mailingAddress,
                to: sender.email,
                subject,
                html
            }, (err) => {
                if (err) logger.error(err.message);
                logger.info(`Acceptance email sent to ${sender.email}`);
            });

            logger.info(`Account created for ${request.body.email}`);
            return response.status(201).send({
                success: true,
                message: "Account created successfully",
                payment: { required: false, sessionUrl: null },
                user:userD,
                company,
                twoFactorEnabled: company.twoFactorEnabled
            });
        }
        if (paymentMode == 1) {
            if (request.body.accountType == "solo" && request.body.signUpMethod=="email") {
                if (
                    request.body.email &&
                    request.body.firstname &&
                    request.body.lastname &&
                    request.body.mobileCountryCode &&
                    request.body.mobileNumber &&
                    request.body.accountType &&
                    request.body.password &&
                    request.body.signUpMethod &&
                    request.body.currency
                ) {
                    user.checkIfUserExist(request.body.email)
                        .then(async (res) => {
                            if (res.length > 0) {
                                logger.warn(`Account already exists for ${request.body.email}`)
                                return response.status(409)
                                    .send({ success: false, error:"conflict", message: `Email is already registered`,details:{email:request.body.email} });
                            } else {
                                try {
                                    const sessionURL = await createCheckoutSessionURLForType1(
                                        request.body.email,
                                        request.body.firstname,
                                        request.body.lastname,
                                        request.body.mobileCountryCode,
                                        request.body.mobileNumber,
                                        request.body.accountType,
                                        request.body.password,
                                        request.body.signUpMethod,
                                        request.body.currency
                                    )
                                    return response.status(201)
                                        .send({ success: true, payment: {required:true, sessionURL} });
                                } catch (error) {
                                    console.log(error)
                                    logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                                    logger.error(error)
                                    return response.status(500)
                                        .send({ success: false, error:"server_error", message: "An unexpected error occured" });
                                }
                            }
                        })
                        .catch((err) => {
                            console.log(err)
                            logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                            logger.error(err)
                            return response.status(500)
                                .send({ success: false, error:"server_error", message: "An unexpected error occured" });
                        })
                } else {
                    const requiredFields = [
                        "email",
                        "firstname",
                        "lastname",
                        "mobileCountryCode",
                        "mobileNumber",
                        "accountType",
                        "password",
                        "signUpMethod",
                        "currency"
                    ];

                    let errors = [];

                    requiredFields.forEach(field => {
                        if (!request.body[field]) {
                            errors.push({
                                field: field,
                                issue: "This field is required"
                            });
                        }
                    });

                    if (request.body.email && !/^\S+@\S+\.\S+$/.test(request.body.email)) {
                        errors.push({
                            field: "email",
                            issue: "Invalid email format"
                        });
                    }

                    if (request.body.mobileNumber && !/^\d{6,15}$/.test(request.body.mobileNumber)) {
                        errors.push({
                            field: "mobileNumber",
                            issue: "Invalid phone number format"
                        });
                    }

                    if (request.body.password && request.body.password.length < 6) {
                        errors.push({
                            field: "password",
                            issue: "Password must be at least 6 characters"
                        });
                    }

                    if (errors.length > 0) {
                        const errorResponse = {
                            success: false,
                            error: "bad_request",
                            message: "Invalid or missing fields",
                            details: errors
                        };
                    
                        logger.debug(JSON.stringify(errorResponse));
                        return response.status(400).send(errorResponse);
                    }
                }
            } else if (request.body.accountType == "solo" && request.body.signUpMethod!== "email") {
                if (
                    request.body.email &&
                    request.body.firstname &&
                    request.body.lastname &&
                    request.body.avatarUrl &&
                    request.body.accountType &&
                    request.body.signUpMethod &&
                    request.body.currency
                ) {
                    user.checkIfUserExist(request.body.email)
                        .then(async (res) => {
                            if (res.length > 0) {
                                logger.warn(`Account already exists for ${request.body.email}`)
                                return response.status(409)
                                    .send({ success: false,error:"conflict", message: `Email is already registered`,details:{email:request.body.email} });
                            } else {
                                try {
                                    const sessionURL = await createCheckoutSessionURLForType2(
                                        request.body.email,
                                        request.body.firstname,
                                        request.body.lastname,
                                        request.body.avatarUrl,
                                        request.body.accountType,
                                        request.body.signUpMethod,
                                        request.body.currency
                                    )
                                    return response.status(200)
                                        .send({ success: true, payment: {required:true, sessionURL} });
                                } catch (error) {
                                    logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                                    logger.error(error)
                                    return response.status(500)
                                        .send({ success: false, error:"server_error", message: "An unexpected error occured" });
                                }
                            }
                        })
                        .catch((err) => {
                            logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                            logger.error(err)
                            return response.status(500)
                                .send({ success: false, error:"server_error", message: "An unexpected error occured" });
                        })
                } else {
                    const requiredFields = [
                        "email",
                        "firstname",
                        "lastname",
                        "avatarUrl",
                        "accountType",
                        "signUpMethod",
                        "currency"
                    ];

                    let errors = [];

                    requiredFields.forEach(field => {
                        if (!request.body[field]) {
                            errors.push({
                                field: field,
                                issue: "This field is required"
                            });
                        }
                    });

                    if (request.body.email && !/^\S+@\S+\.\S+$/.test(request.body.email)) {
                        errors.push({
                            field: "email",
                            issue: "Invalid email format"
                        });
                    }

                    if (errors.length > 0) {
                        const errorResponse = {
                            success: false,
                            error: "bad_request",
                            message: "Invalid or missing fields",
                            details: errors
                        };
                    
                        logger.debug(JSON.stringify(errorResponse));
                        return response.status(400).send(errorResponse);
                    }
                }
            } else if (request.body.accountType == "team" && request.body.signUpMethod !== "email") {
                if (
                    request.body.firstname &&
                    request.body.lastname &&
                    request.body.email &&
                    request.body.phoneNumber &&
                    request.body.companyName &&
                    request.body.orgType &&
                    request.body.mailingStreetName &&
                    request.body.mailingCountryName &&
                    request.body.mailingCityName &&
                    request.body.mailingStateName &&
                    request.body.mailingZip &&
                    request.body.billingStreetName &&
                    request.body.billngAddCountryName &&
                    request.body.billingCityName &&
                    request.body.billingStateName &&
                    request.body.billingZip &&
                    request.body.avatarUrl &&
                    request.body.accountType &&
                    request.body.signUpMethod &&
                    request.body.currency
                ) {
                    user.checkIfUserExist(request.body.email)
                        .then(async (res) => {
                            if (res.length > 0) {
                                logger.warn(`Account already exists for ${request.body.email}`)
                                return response.status(409)
                                    .send({ success: false,error:"conflict", message: `Email is already registered`,details:{email:request.body.email} });
                            } else {
                                try {
                                    const sessionURL = await createCheckoutSessionURLForType3(
                                        request.body.firstname,
                                        request.body.lastname,
                                        request.body.email,
                                        request.body.phoneNumber,
                                        request.body.companyName,
                                        request.body.orgType,
                                        request.body.mailingStreetName,
                                        request.body.mailingCountryName,
                                        request.body.mailingCityName,
                                        request.body.mailingStateName,
                                        request.body.mailingZip,
                                        request.body.billingStreetName,
                                        request.body.billingCountryName,
                                        request.body.billingCityName,
                                        request.body.billingStateName,
                                        request.body.billingZip,
                                        request.body.isMailAndBillAddressSame,
                                        request.body.avatarUrl,
                                        request.body.accountType,
                                        request.body.signUpMethod,
                                        request.body.currency
                                    )
                                    return response.status(200)
                                        .send({ success: true, payment: {required:true, sessionURL} });
                                } catch (error) {
                                    logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                                    logger.error(error)
                                    return response.status(500)
                                        .send({ success: false, error:"server_error", message: "An unexpected error occured" });
                                }
                            }
                        })
                        .catch((err) => {
                            logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                            logger.error(err)
                            return response.status(500)
                                .send({ success: false, error:"server_error", message: "An unexpected error occured" });
                        })
                } else {
                    const requiredFields = [
                        "firstname",
                        "lastname",
                        "email",
                        "phoneNumber",
                        "companyName",
                        "orgType",
                        "mailingStreetName",
                        "mailingCountryName",
                        "mailingCityName",
                        "mailingStateName",
                        "mailingZip",
                        "billingStreetName",
                        "billingCountryName",
                        "billingCityName",
                        "billingStateName",
                        "billingZip",
                        "avatarUrl",
                        "accountType",
                        "signUpMethod",
                        "currency"
                    ];

                    let errors = [];
                    requiredFields.forEach(field => {
                        if (!request.body[field]) {
                            errors.push({
                                field: field,
                                issue: "This field is required"
                            });
                        }
                    });

                    if (request.body.email && !/^\S+@\S+\.\S+$/.test(request.body.email)) {
                        errors.push({
                            field: "email",
                            issue: "Invalid email format"
                        });
                    }

                    if (errors.length > 0) {
                        const errorResponse = {
                            success: false,
                            error: "bad_request",
                            message: "Invalid or missing fields",
                            details: errors
                        };
                    
                        logger.debug(JSON.stringify(errorResponse));
                        return response.status(400).send(errorResponse);
                    }
                }
            } else {
                if (
                    request.body.email &&
                    request.body.firstname &&
                    request.body.lastname &&
                    request.body.mobileCountryCode &&
                    request.body.mobileNumber &&
                    request.body.accountType &&
                    request.body.password &&
                    request.body.companyName &&
                    request.body.phoneNumber &&
                    request.body.orgType &&
                    request.body.mailingCountryName &&
                    request.body.mailingStreetName &&
                    request.body.mailingCityName &&
                    request.body.mailingStateName &&
                    request.body.mailingZip &&
                    request.body.billingStreetName &&
                    request.body.billingCountryName &&
                    request.body.billingCityName &&
                    request.body.billingStateName &&
                    request.body.billingZip &&
                    request.body.signUpMethod &&
                    request.body.currency
                ) {
                    user.checkIfUserExist(request.body.email)
                        .then(async (res) => {
                            if (res.length > 0) {
                                logger.warn(`Account already exists for ${request.body.email}`)
                                return response.status(409)
                                    .send({ success: false,error:"conflict", message: `Email is already registered`,details:{email:request.body.email} });
                            } else {
                                try {
                                    const sessionURL = await createCheckoutSessionURLForType4(
                                        request.body.email,
                                        request.body.firstname,
                                        request.body.lastname,
                                        request.body.mobileCountryCode,
                                        request.body.mobileNumber,
                                        request.body.accountType,
                                        request.body.password,
                                        request.body.companyName,
                                        request.body.phoneNumberCountryCode,
                                        request.body.phoneNumber,
                                        request.body.orgType,
                                        request.body.mailingStreetName,
                                        request.body.mailingCountryName,
                                        request.body.mailingCityName,
                                        request.body.mailingStateName,
                                        request.body.mailingZip,
                                        request.body.billingStreetName,
                                        request.body.billingCountryName,
                                        request.body.billingCityName,
                                        request.body.billingStateName,
                                        request.body.billingZip,
                                        request.body.isMailAndBillAddressSame,
                                        request.body.signUpMethod,
                                        request.body.currency
                                    )
                                    return response.status(200)
                                        .send({ success: true, payment: {required:true, sessionURL} });
                                } catch (error) {
                                    logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                                    logger.error(error)
                                    return response.status(500)
                                        .send({ success: false, error:"server_error", message: "An unexpected error occured" });
                                }
                            }
                        })
                        .catch((err) => {
                            logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                            logger.error(err)
                            return response.status(500)
                                .send({ success: false, error:"server_error", message: "An unexpected error occured" });
                        })
                } else {
                    const requiredFields = [
                        "email",
                        "firstname",
                        "lastname",
                        "mobileCountryCode",
                        "mobileNumber",
                        "accountType",
                        "password",
                        "companyName",
                        "phoneNumber",
                        "orgType",
                        "mailingCountryName",
                        "mailingStreetName",
                        "mailingCityName",
                        "mailingStateName",
                        "mailingZip",
                        "billingStreetName",
                        "billingCountryName",
                        "billingCityName",
                        "billingStateName",
                        "billingZip",
                        "signUpMethod",
                        "currency"
                    ];

                    let errors = [];

                    requiredFields.forEach(field => {
                        if (!request.body[field]) {
                            errors.push({
                                field: field,
                                issue: "This field is required"
                            });
                        }
                    });

                    if (request.body.email && !/^\S+@\S+\.\S+$/.test(request.body.email)) {
                        errors.push({
                            field: "email",
                            issue: "Invalid email format"
                        });
                    }

                    if (request.body.mobileNumber && !/^\d{6,15}$/.test(request.body.mobileNumber)) {
                        errors.push({
                            field: "mobileNumber",
                            issue: "Invalid mobile number format"
                        });
                    }

                    if (request.body.phoneNumber && !/^\d{6,15}$/.test(request.body.phoneNumber)) {
                        errors.push({
                            field: "phoneNumber",
                            issue: "Invalid phone number format"
                        });
                    }

                    if (request.body.password && request.body.password.length < 6) {
                        errors.push({
                            field: "password",
                            issue: "Password must be at least 6 characters"
                        });
                    }

                    if (errors.length > 0) {
                        const errorResponse = {
                            success: false,
                            error: "bad_request",
                            message: "Invalid or missing fields",
                            details: errors
                        };
                    
                        logger.debug(JSON.stringify(errorResponse));
                        return response.status(400).send(errorResponse);
                    }


                }
            }
        } else {
            if (request.body.accountType == "solo" && request.body.signUpMethod=="email") {
                const requiredFields = [
                  "email",
                  "firstname",
                  "lastname",
                  "mobileCountryCode",
                  "mobileNumber",
                  "password",
                  "accountType",
                  "currency"
                ];

                let errors = [];

                requiredFields.forEach(field => {
                  if (!request.body[field]) {
                    errors.push({
                      field: field,
                      issue: "This field is required"
                    });
                  }
                });

                if (request.body.email) {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(request.body.email)) {
                    errors.push({
                      field: "email",
                      issue: "Invalid email format"
                    });
                  }
                }
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
                if (!passwordRegex.test(request.body.password)) {
                  errors.push({
                    field: "password",
                    issue:
                      "Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol"
                  });
                }

                if (errors.length > 0) {
                  return response.status(400).json({
                    success: false,
                    error: "bad_request",
                    message: "Invalid or missing fields",
                    details: errors
                  });
                }
                const debugData = {
                    url: request.protocol + '://' + request.get('host') + request.originalUrl,
                    body: { ...request.body, password: '*********' },
                    headers: request.headers
                }
                logger.debug(JSON.stringify(debugData))
                logger.info(`Creating new account for ${request.body.email}`)
                logger.info(`Checking if account already exists for ${request.body.email}`)
                user.checkIfUserExist(request.body.email)
                    .then((res) => {
                        if (res.length > 0) {
                            logger.warn(`Account already exists for ${request.body.email}`)
                            return response.status(409)
                                .send({ success: false, message: `Email is already registered`,details:{email:request.body.email} });
                        } else {
                            logger.info(`Account does not exist for ${request.body.email}`)
                            logger.info(`Creating user account for ${request.body.email}`)
                            user.createNewUser(
                                request.body.firstname,
                                request.body.lastname,
                                request.body.email,
                                request.body.mobileCountryCode,
                                request.body.mobileNumber,
                                request.body.password,
                                request.body.accountType,
                                '1',
                                request.body.signUpMethod,
                                request.body.currency
                            ).then(async (res) => {
                                const { userId, token, default2FA, userCloudIntegration,
                                    userCloudIntegrationMob } = res
                                logger.info(`Creating company account for ${request.body.email}`)
                                user.createNewCompany(
                                    userId,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null
                                )
                                    .then(async (res) => {
                                        const { companyId } = res
                                        logger.info(`Company account creation successful for ${request.body.email}`)
                                        const accessPayload = {
                                            userId: userId,
                                            firstname: request.body.firstname,
                                            lastname: request.body.lastname,
                                            email: request.body.email,
                                            role: 1,
                                            company: companyId[0]
                                        };
                                        const refreshPayload = { 
                                            userId: userId 
                                        };
                                        const accessToken = UsersController.createAccessToken(accessPayload);
                                        const refreshToken = UsersController.createRefreshToken(refreshPayload);
                                        const refreshTokenDecoded = jwt.decode(refreshToken);
                                        const refreshTokenExpiresAt = new Date(refreshTokenDecoded.exp * 1000);
                                        await knex('user_tokens').insert({
                                                userId,
                                                refresh_token: refreshToken,
                                                expires_at: refreshTokenExpiresAt
                                            });
                                        const data = {
                                            id: userId,
                                            firstname: request.body.firstname,
                                            lastname: request.body.lastname,
                                            email: request.body.email,
                                            accountStatus: false,
                                            currency:request.body.currency,
                                            role: 1,
                                            mobileCountryCode:request.body.mobileCountryCode,
                                            mobileNumber: request.body.mobileNumber,
                                            auth: {
                                                accessToken,
                                                refreshToken,
                                                expiresIn:3600,
                                                refreshTokenExpiresAt
                                            },
                        
                                            language:'en',
                                            avatarUrl: `${process.env.USER_PROFILE_IMAGE_URL}/default_avatar.png`,
                                            twoFactorEnabled: default2FA == '1' ? true : false,
                                            accountType: request.body.accountType,
                                            userCloudIntegrationWeb: userCloudIntegration == '1' ? true : false,
                                            userCloudIntegrationMob:userCloudIntegration == '1' ? true : false,
                                            passwordSet:true,
                                            company:null
                                        }
                                        user.getMailTemplate(1)
                                            .then(async (data) => {
                                                let subject = data[0].subject
                                                subject = subject.replace("{{name}}", request.body.firstname)
                                                let html = data[0].template 
                                                html = html.replace("{{name}}", request.body.firstname)
                                                var { transporter, mailingAddress } = await emailTransporter()
    
                                                var mailOptions2 = {
                                                    from: mailingAddress,
                                                    to: request.body.email,
                                                    subject: subject,
                                                    html
                                                };
    
                                                transporter.sendMail(mailOptions2, function (error, info) {
                                                    if (error) {
                                                        logger.error(error.message)
                                                        return
                                                    }
                                                    logger.info(`Welcome message successfully sent to ${request.body.email}`)
                                                });
                                                user.getMailTemplate(2)
                                                    .then(async (data) => {
                                                        let subject = data[0].subject
                                                        let html = data[0].template 
                                                        html = html.replace("{{name}}", request.body.firstname)
                                                        html = html.replace("{{link}}", `${process.env.FRONTEND_BASE_URL}/auth/verify?email=${request.body.email}&token=${token}`)
                                                        var mailOptions = {
                                                            from: mailingAddress,
                                                            to: request.body.email,
                                                            subject: subject,
                                                            html
                                                        };
            
                                                        transporter.sendMail(mailOptions, function (error, info) {
                                                            if (error) {
                                                                logger.error(error.message)
                                                                return
                                                            }
                                                            logger.info(`Verification email successfully sent to ${request.body.email}`)
                                                        });
                                                    })
                                            })
                                        logger.debug(JSON.stringify({ success: true, message: request.t('accountCreationSuccess'), user: data }))
                                        return response.status(201)
                                            .send({ success: true, payment: {required:false, sessionURL:null}, message: request.t('accountCreationSuccess'), user: data });
                                    })
                                    .catch((err) => {
                                        console.log(err)
                                        logger.warn(`User account creation failed for ${request.body.email}`)
                                        logger.error(err)
                                        logger.debug(JSON.stringify({ success: false, message: err }))
                                        return response.status(500)
                                            .send({ success: false, message: err });
                                    })
                            })
                                .catch((err) => {
                                    console.log(err)
                                    logger.warn(`User account creation failed for ${request.body.email}`)
                                    logger.error(err)
                                    logger.debug(JSON.stringify({ success: false, message: err }))
                                    return response.status(500)
                                        .send({ success: false, message: err });
                                })
                        }
                    })
            } else if (request.body.accountType == "solo" && request.body.signUpMethod!== "email") {
                let errors = [];

                const requiredFields = [
                  "email",
                  "firstname",
                  "avatarUrl",
                  "accountType",
                  "code",
                  "code_verifier"
                ];

                // Check missing fields
                requiredFields.forEach(field => {
                  if (!request.body[field]) {
                    errors.push({
                      field: field,
                      issue: "This field is required"
                    });
                  }
                });

                // Email validation
                if (request.body.email) {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                
                  if (!emailRegex.test(request.body.email)) {
                    errors.push({
                      field: "email",
                      issue: "Invalid email format"
                    });
                  }
                }

                // Firstname validation (letters only, min 2)
                if (request.body.firstname) {
                  const nameRegex = /^[A-Za-z]{2,}$/;
                
                  if (!nameRegex.test(request.body.firstname)) {
                    errors.push({
                      field: "firstname",
                      issue: "Firstname must contain only letters and be at least 2 characters"
                    });
                  }
                }

                // Avatar URL validation
                if (request.body.avatarUrl) {
                  try {
                    new URL(request.body.avatarUrl);
                  } catch {
                    errors.push({
                      field: "avatarUrl",
                      issue: "Invalid URL format"
                    });
                  }
                }

                // If errors exist → return formatted response
                if (errors.length > 0) {
                  return response.status(400).json({
                    success: false,
                    error: "bad_request",
                    message: "Invalid or missing fields",
                    details: errors
                  });
                }
                /* -------------------- SOCIAL SIGNUP CODE -------------------- */
                let signUpType = request.body.signUpMethod;
                if (signUpType === "social") {
                    const result = await UsersController.verifySocialSignupPKCE({
                      request,
                      response,
                      redis,
                    });
                     if (!result.success) {
                      return;
                    }
                }
                const debugData = {
                    url: request.protocol + '://' + request.get('host') + request.originalUrl,
                    body: { ...request.body, password: '*********' },
                    headers: request.headers
                }
                logger.debug(JSON.stringify(debugData))
                logger.info(`Creating new account for ${request.body.email}`)
                logger.info(`Checking if account already exists for ${request.body.email}`)
                user.checkIfUserExist(request.body.email)
                    .then(async (res) => {
                        if (res.length > 0) {
                            logger.warn(`Account already exists for ${request.body.email}`)
                            return response.status(409)
                                .send({ success: false, message: `Email is already registered`,details:{email:request.body.email} });
                        } else {
                            logger.info(`Account does not exist for ${request.body.email}`)
                            logger.info(`Creating user account for ${request.body.email}`)
                            logger.info(`Uploading Image for ${request.body.email}`)
                            const imageResponse = await axios.get(request.body.avatarUrl, { responseType: 'arraybuffer' });
                            const imageBuffer = Buffer.from(imageResponse.data, 'binary');
                            const fileName = `${request.body.firstname}_${Date.now()}.jpg`;
                            fs.writeFileSync(`${process.env.BACKEND_PATH}/uploads/userAvatars/${fileName}`, imageBuffer);
                            user.createNewUserGoogle(
                                request.body.firstname,
                                request.body.lastname,
                                request.body.email,
                                request.body.accountType,
                                request.body.signUpMethod,
                                request.body.currency
                            ).then(async (res) => {
                                const { userId, default2FA,
                                    userCloudIntegration,
                                    userCloudIntegrationMob } = res
                                logger.info(`Uploading Image for ${userId}`)
                                await user.updateUserMeta(userId, 'avatarUrl', fileName)
                                logger.info(`Image upload successful for ${userId}`)
                                logger.info(`Creating company account for ${request.body.email}`)
                                user.createNewCompany(
                                    userId,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null
                                )
                                    .then(async (res) => {
                                        const { companyId } = res
                                        logger.info(`Company account creation successful for ${request.body.email}`)
                                        const accessPayload = {
                                            userId: userId,
                                            firstname: request.body.firstname,
                                            lastname: request.body.lastname,
                                            email: request.body.email,
                                            role: 1,
                                            company: companyId[0]
                                        };
                                        const refreshPayload = { 
                                            userId: userId 
                                        };
                                        const accessToken = UsersController.createAccessToken(accessPayload);
                                        const refreshToken = UsersController.createRefreshToken(refreshPayload);
                                        const refreshTokenDecoded = jwt.decode(refreshToken);
                                        const refreshTokenExpiresAt = new Date(refreshTokenDecoded.exp * 1000)
                                        await knex('user_tokens').insert({
                                                userId,
                                                refresh_token: refreshToken,
                                                expires_at: refreshTokenExpiresAt
                                            });
                                        const data = {
                                            id: userId,
                                            firstname: request.body.firstname,
                                            lastname: request.body.lastname,
                                            email: request.body.email,
                                            accountStatus: true,
                                            currency:request.body.currency,
                                            role: 1,
                                            mobileCountryCode:null, 
                                            mobileNumber: '(000)-000-0000',
                                            company:null,
                                            
                                             auth: {
                                                accessToken,
                                                refreshToken,
                                                expiresIn:3600,
                                                refreshTokenExpiresAt
                                            },
                                            language:'en',
                                            avatarUrl: `${process.env.USER_PROFILE_IMAGE_URL}/${fileName}`,
                                            twoFactorEnabled: default2FA == '1' ? true : false,
                                            accountType: request.body.accountType,
                                            userCloudIntegrationWeb: userCloudIntegration == '1' ? true : false,
                                            userCloudIntegrationMob:userCloudIntegration == '1' ? true : false,                                                 passwordSet: false
                                        }
                                        user.getMailTemplate(1)
                                            .then(async (data) => {
                                                let subject = data[0].subject
                                                subject = subject.replace("{{name}}", request.body.firstname)
                                                let html = data[0].template 
                                                html = html.replace("{{name}}", request.body.firstname)
                                                var { transporter, mailingAddress } = await emailTransporter()
    
                                                var mailOptions2 = {
                                                    from: mailingAddress,
                                                    to: request.body.email,
                                                    subject: subject,
                                                    html
                                                };
    
                                                transporter.sendMail(mailOptions2, function (error, info) {
                                                    if (error) {
                                                        logger.error(error.message)
                                                        return
                                                    }
                                                    logger.info(`Welcome message successfully sent to ${request.body.email}`)
                                                });
                                            })
                                        logger.debug(JSON.stringify({ success: true, message: request.t('accountCreationSuccess'), userData: data }))
                                        return response.status(201)
                                            .send({ success: true, payment: {required:false, sessionURL:null}, message: request.t('accountCreationSuccess'), user: data });
                                    })
                                    .catch((err) => {
                                        console.log(err)
                                        logger.warn(`User account creation failed for ${request.body.email}`)
                                        logger.error(err)
                                        logger.debug(JSON.stringify({ success: false, message: err }))
                                        return response.status(500)
                                            .send({ success: false,error:"server_error", message: "An unexpected error occured" });
                                    })
                            })
                                .catch((err) => {
                                    console.log(err)
                                    logger.warn(`User account creation failed for ${request.body.email}`)
                                    logger.error(err)
                                    logger.debug(JSON.stringify({ success: false, message: err }))
                                    return response.status(500)
                                        .send({ success: false,error:"server_error", message: "An unexpected error occured" });
                                })
                        }
                    })
            } else if (request.body.accountType == "team" && request.body.signUpMethod !== "email") {
                let errors = [];

                const requiredFields = [
                  "firstname",
                  "email",
                  "phoneNumberCountryCode",
                  "phoneNumber",
                  "companyName",
                  "orgType",
                  "mailingStreetName",
                  "mailingCountryName",
                  "mailingCityName",
                  "mailingStateName",
                  "mailingZip",
                  "billingStreetName",
                  "billingCountryName",
                  "billingCityName",
                  "billingStateName",
                  "billingZip",
                  "avatarUrl",
                  "accountType"
                ];
                
                // Required fields validation
                requiredFields.forEach(field => {
                  if (!request.body[field]) {
                    errors.push({
                      field,
                      issue: "This field is required"
                    });
                  }
                });
                
                // Name validation (letters only, min 2)
                const nameRegex = /^[A-Za-z]{2,}$/;
                
                if (request.body.firstname && !nameRegex.test(request.body.firstname)) {
                  errors.push({
                    field: "firstname",
                    issue: "Firstname must contain only letters and be at least 2 characters"
                  });
                }
                
                // Email validation
                if (request.body.email) {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                
                  if (!emailRegex.test(request.body.email)) {
                    errors.push({
                      field: "email",
                      issue: "Invalid email format"
                    });
                  }
                }
                
                // Phone number validation
                if (request.body.phoneNumberCountryCode) {
                  const countryCodeRegex = /^\+\d{1,4}$/;
                
                  if (!countryCodeRegex.test(request.body.phoneNumberCountryCode)) {
                    errors.push({
                      field: "phoneNumberCountryCode",
                      issue: "Invalid country code format (Example: +1, +44)"
                    });
                  }
                }
                
                if (request.body.phoneNumber) {
                  const phoneRegex = /^[0-9 ()]+$/;
                  if (!phoneRegex.test(request.body.phoneNumber)) {
                    errors.push({
                      field: "phoneNumber",
                      issue: "Phone number must contain only numbers and be 6–15 digits long"
                    });
                  }
                }
                
                // Company name (letters, numbers, spaces allowed)
                if (request.body.companyName) {
                  const companyRegex = /^[A-Za-z0-9\s]{2,}$/;
                
                  if (!companyRegex.test(request.body.companyName)) {
                    errors.push({
                      field: "companyName",
                      issue: "Company name must be at least 2 characters and contain letters or numbers"
                    });
                  }
                }
                
                
                // URL validation for avatar
                if (request.body.avatarUrl) {
                  try {
                    new URL(request.body.avatarUrl);
                  } catch {
                    errors.push({
                      field: "avatarUrl",
                      issue: "Invalid URL format"
                    });
                  }
                }
                
                
                // Address validation (simple non-empty text check)
                const simpleTextRegex = /^.{2,}$/;
                
                [
                  "mailingStreetName",
                  "mailingCountryName",
                  "mailingCityName",
                  "mailingStateName",
                  "billingStreetName",
                  "billingCountryName",
                  "billingCityName",
                  "billingStateName"
                ].forEach(field => {
                  if (request.body[field] && !simpleTextRegex.test(request.body[field])) {
                    errors.push({
                      field,
                      issue: "This field must be at least 2 characters"
                    });
                  }
                });
                
                // ZIP code validation (numbers only)
                const zipRegex = /^\d{3,10}$/;
                
                if (request.body.mailingZip && !zipRegex.test(request.body.mailingZip)) {
                  errors.push({
                    field: "mailingZip",
                    issue: "Invalid ZIP code format"
                  });
                }
                
                if (request.body.billingZip && !zipRegex.test(request.body.billingZip)) {
                  errors.push({
                    field: "billingZip",
                    issue: "Invalid ZIP code format"
                  });
                }
                
                // Return errors if exist
                if (errors.length > 0) {
                  return response.status(400).json({
                    success: false,
                    error: "bad_request",
                    message: "Invalid or missing fields",
                    details: errors
                  });
                }
                /* -------------------- SOCIAL SIGNUP CODE -------------------- */
                let signUpType = request.body.signUpMethod;
                if (signUpType === "social") {
                    const result = await UsersController.verifySocialSignupPKCE({
                      request,
                      response,
                      redis,
                    });
                     if (!result.success) {
                  return;
                    }
                }
                const debugData = {
                    url: request.protocol + '://' + request.get('host') + request.originalUrl,
                    body: { ...request.body, password: '*********' },
                    headers: request.headers
                }
                logger.debug(JSON.stringify(debugData))
                logger.info(`Creating new account for ${request.body.email}`)
                logger.info(`Checking if account already exists for ${request.body.email}`)
                user.checkIfUserExist(request.body.email)
                    .then(async (res) => {
                        if (res.length > 0) {
                            logger.warn(`Account already exists for ${request.body.email}`)
                            return response.status(409)
                                .send({ success: false, message: `Email is already registered`,details:{email:request.body.email} });
                        } else {
                            logger.info(`Account does not exist for ${request.body.email}`)
                            logger.info(`Creating user account for ${request.body.email}`)
                            user.createNewUserGoogle(
                                request.body.firstname,
                                request.body.lastname,
                                request.body.email,
                                request.body.accountType,
                                request.body.signUpMethod,
                                request.body.currency
                            ).then(async (res) => {
                                const { userId, default2FA,
                                    userCloudIntegration,
                                    userCloudIntegrationMob } = res
                                    const url =request.body.avatarUrl;
                                    let fileName="";
                                    if (!url || url === 'https://' || url === 'http://' || url.trim().length <= 8) {
                                } else {
                                logger.info(`Uploading Image for ${userId}`)
                                const imageResponse = await axios.get(request.body.avatarUrl, { responseType: 'arraybuffer' });
                                const imageBuffer = Buffer.from(imageResponse.data, 'binary');
                                 fileName = `${request.body.firstname}_${Date.now()}.jpg`;
                                fs.writeFileSync(`${process.env.BACKEND_PATH}/uploads/userAvatars/${fileName}`, imageBuffer);
                                await user.updateUserMeta(userId, 'avatarUrl', fileName)
                                logger.info(`Image upload successful for ${userId}`)
                                }
                                logger.info(`Creating company account for ${request.body.email}`)
                                user.createNewCompany(
                                    userId,
                                    request.body.companyName,
                                    request.body.phoneNumberCountryCode,
                                    request.body.phoneNumber,
                                    request.body.orgType,
                                    request.body.mailingStreetName,
                                    request.body.mailingCountryName,
                                    request.body.mailingCityName,
                                    request.body.mailingStateName,
                                    request.body.mailingZip,
                                    request.body.billingStreetName,
                                    request.body.billingCountryName,
                                    request.body.billingCityName,
                                    request.body.billingStateName,
                                    request.body.billingZip,
                                    request.body.isMailAndBillAddressSame
                                )
                                    .then(async (res) => {
                                        const { companyId, companyDefault2FA } = res
                                        logger.info(`Company account creation successful for ${request.body.email}`)
                                        const accessPayload = {
                                            userId: userId,
                                            firstname: request.body.firstname,
                                            lastname: request.body.lastname,
                                            email: request.body.email,
                                            role: 1,
                                            company: companyId[0]
                                        };
                                        const refreshPayload = { 
                                            userId: userId 
                                        };
                                        const accessToken = UsersController.createAccessToken(accessPayload);
                                        const refreshToken = UsersController.createRefreshToken(refreshPayload);
                                        const refreshTokenDecoded = jwt.decode(refreshToken);
                                        const refreshTokenExpiresAt = new Date(refreshTokenDecoded.exp * 1000);
                                        await knex('user_tokens').insert({
                                                userId,
                                                refresh_token: refreshToken,
                                                expires_at: refreshTokenExpiresAt
                                            });
                                        const data = {
                                            user: {
                                              id: userId,
                                              firstname: request.body.firstname,
                                              lastname: request.body.lastname,
                                              email: request.body.email,
                                              accountType: request.body.accountType,
                                              currency: "USD", // static or dynamic if you have it
                                              mobileNumber: '(000)-000-0000',
                                              mobileCountryCode: '+1',
                                              avatarUrl: `${process.env.USER_PROFILE_IMAGE_URL}/${fileName}`,
                                              twoFactorEnabled: default2FA === '1',
                                              language: 'en',
                                              passwordSet: false, // set true if password already created
                                              userCloudIntegration: userCloudIntegration === '1',
                                              userCloudIntegrationMob: userCloudIntegration === '1',
                                              role: 1,
                                              auth: {
                                                accessToken,
                                                refreshToken,
                                                expiresIn: 3600,
                                                refreshTokenExpiresAt
                                              }
                                            },
                                        
                                            company: {
                                              id: companyId[0],
                                              companyName: request.body.companyName,
                                              orgType: request.body.orgType,
                                              phoneNumber: request.body.phoneNumber,
                                              phoneNumberCountryCode: request.body.phoneNumberCountryCode,
                                              companyLogo: `${process.env.COMPANY_LOGO_URL}/default_avatar.png`,
                                              companytwoFactorEnabled: companyDefault2FA === '1',
                                              language: 'en',
                                              mailingAddress: {
                                                country: request.body.mailingCountryName,
                                                street: request.body.mailingStreetName,
                                                city: request.body.mailingCityName,
                                                state: request.body.mailingStateName,
                                                zip: request.body.mailingZip
                                              },
                                              billingAddress: {
                                                country: request.body.billingCountryName,
                                                street: request.body.billingStreetName,
                                                city: request.body.billingCityName,
                                                state: request.body.billingStateName,
                                                zip: request.body.billingZip
                                              }
                                            }
                                        };
                                        user.getMailTemplate(1)
                                            .then(async (data) => {
                                                let subject = data[0].subject
                                                subject = subject.replace("{{name}}", request.body.firstname)
                                                let html = data[0].template 
                                                html = html.replace("{{name}}", request.body.firstname)
                                                var { transporter, mailingAddress } = await emailTransporter()
    
                                                var mailOptions2 = {
                                                    from: mailingAddress,
                                                    to: request.body.email,
                                                    subject: subject,
                                                    html
                                                };
    
                                                transporter.sendMail(mailOptions2, function (error, info) {
                                                    if (error) {
                                                        logger.error(error.message)
                                                        return
                                                    }
                                                    logger.info(`Welcome message successfully sent to ${request.body.email}`)
                                                });
                                            })
                                        logger.debug(JSON.stringify({ success: true, message: request.t('accountCreationSuccess'), userData: data }))
                                        return response.status(201)
                                            .send({ success: true, payment: {required:false, sessionURL:null}, message: request.t('accountCreationSuccess'), ...data });
                                    })
                                    .catch((err) => {
                                        console.log(err)
                                        logger.warn(`User account creation failed for ${request.body.email}`)
                                        logger.error(err)
                                        logger.debug(JSON.stringify({ success: false, message: err }))
                                        return response.status(500)
                                            .send({ success: false,error:"server_error", message: "An unexpected error occured" });
                                    })
                            })
                                .catch((err) => {

                                    logger.warn(`User account creation failed for ${request.body.email}`)
                                    logger.error(err)
                                    logger.debug(JSON.stringify({ success: false, message: err }))
                                    return response.status(500)
                                        .send({ success: false,error:"server_error", message: "An unexpected error occured" });
                                })
                        }
                    })
            } else {
               let errors = [];

               const requiredFields = [
                 "email",
                 "firstname",
                 "lastname",
                 "mobileCountryCode",
                 "mobileNumber",
                 "accountType",
                 "password",
                 "companyName",
                 "phoneNumberCountryCode",
                 "phoneNumber",
                 "orgType",
                 "mailingStreetName",
                 "mailingCountryName",
                 "mailingCityName",
                 "mailingStateName",
                 "mailingZip",
                 "billingStreetName",
                 "billingCountryName",
                 "billingCityName",
                 "billingStateName",
                 "billingZip"
               ];
               
               requiredFields.forEach(field => {
                 if (!request.body[field]) {
                   errors.push({
                     field,
                     issue: "This field is required"
                   });
                 }
               });
               
               
               if (request.body.email) {
                 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                 if (!emailRegex.test(request.body.email)) {
                   errors.push({
                     field: "email",
                     issue: "Invalid email format"
                   });
                 }
               }
               
               const nameRegex = /^[A-Za-z]{2,}$/;
               
               if (request.body.firstname && !nameRegex.test(request.body.firstname)) {
                 errors.push({
                   field: "firstname",
                   issue: "Firstname must contain only letters and be at least 2 characters"
                 });
               }
               
               if (request.body.lastname && !nameRegex.test(request.body.lastname)) {
                 errors.push({
                   field: "lastname",
                   issue: "Lastname must contain only letters and be at least 2 characters"
                 });
               }
               
               if (request.body.password) {
                 const passwordRegex =
                   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
               
                 if (!passwordRegex.test(request.body.password)) {
                   errors.push({
                     field: "password",
                     issue:
                       "Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol"
                   });
                 }
               }
               
               if (request.body.mobileCountryCode) {
                 const countryCodeRegex =/^.{1,4}$/;;
                 if (!countryCodeRegex.test(request.body.mobileCountryCode)) {
                   errors.push({
                     field: "mobileCountryCode",
                     issue: "Invalid country code format (Example: +1, +44)"
                   });
                 }
               }
               
               if (request.body.mobileNumber) {
                 const phoneRegex = /^[0-9 ()]+$/;
                 if (!phoneRegex.test(request.body.mobileNumber)) {
                   errors.push({
                     field: "mobileNumber",
                     issue: "Mobile number must be 6–15 digits and numeric only"
                   });
                 }
               }
               
               if (request.body.phoneNumberCountryCode) {
                 const countryCodeRegex = /^.{1,4}$/;;
                 if (!countryCodeRegex.test(request.body.phoneNumberCountryCode)) {
                   errors.push({
                     field: "phoneNumberCountryCode",
                     issue: "Invalid country code format (Example: +1, +44)"
                   });
                 }
               }
               
               if (request.body.phoneNumber) {
                 const phoneRegex = /^[0-9 ()]+$/;
                 if (!phoneRegex.test(request.body.phoneNumber)) {
                   errors.push({
                     field: "phoneNumber",
                     issue: "Phone number must be 6–15 digits and numeric only"
                   });
                 }
               }
                              
               if (request.body.companyName) {
                 const companyRegex = /^[A-Za-z0-9\s]{2,}$/;
                 if (!companyRegex.test(request.body.companyName)) {
                   errors.push({
                     field: "companyName",
                     issue:
                       "Company name must be at least 2 characters and contain letters or numbers"
                   });
                 }
               }
               const streetTextRegex = /^.{2,}$/;
               
               [
                 "mailingStreetName",
                 "mailingCountryName",
                 "mailingCityName",
                 "mailingStateName"
               ].forEach(field => {
                 if (request.body[field] && !streetTextRegex.test(request.body[field])) {
                   errors.push({
                     field,
                     issue: "This field must be at least 2 characters"
                   });
                 }
               });
               
               const zipRegex = /^\d{3,10}$/;
               
               if (request.body.mailingZip && !zipRegex.test(request.body.mailingZip)) {
                 errors.push({
                   field: "mailingZip",
                   issue: "Invalid ZIP code format"
                 });
               }
               
               if (request.body.billingZip && !zipRegex.test(request.body.billingZip)) {
                 errors.push({
                   field: "billingZip",
                   issue: "Invalid ZIP code format"
                 });
               }
               
               [
                 "billingStreetName",
                 "billingCountryName",
                 "billingCityName",
                 "billingStateName"
               ].forEach(field => {
                 if (request.body[field] && !streetTextRegex.test(request.body[field])) {
                   errors.push({
                     field,
                     issue: "This field must be at least 2 characters"
                   });
                 }
               });
               
               if (errors.length > 0) {
                 return response.status(400).json({
                   success: false,
                   error: "bad_request",
                   message: "Invalid or missing fields",
                   details: errors
                 });
               }
                user.checkIfUserExist(request.body.email)
                    .then(async (res) => {
                        if (res.length > 0) {
                            logger.warn(`Account already exists for ${request.body.email}`)
                            return response.status(409)
                                .send({ success: false, message: `Email is already registered`,details:{email:request.body.email} });
                        } else {
                            user.createNewUser(
                                request.body.firstname,
                                request.body.lastname,
                                request.body.email,
                                request.body.mobileCountryCode,
                                request.body.mobileNumber,
                                request.body.password,
                                request.body.accountType,
                                "1",
                                request.body.signUpMethod,
                                request.body.currency
                            ).then((res) => {
                                const { userId, token, default2FA,
                                    userCloudIntegration,
                                    userCloudIntegrationMob } = res
                                logger.info(`User account creation successful for ${request.body.email}`)
                                logger.info(`Creating company account for ${request.body.email}`)
                                user.createNewCompany(
                                    userId,
                                    request.body.companyName,
                                    request.body.phoneNumberCountryCode,
                                    request.body.phoneNumber,
                                    request.body.orgType,
                                    request.body.mailingStreetName,
                                    request.body.mailingCountryName,
                                    request.body.mailingCityName,
                                    request.body.mailingStateName,
                                    request.body.mailingZip,
                                    request.body.billingStreetName,
                                    request.body.billingCountryName,
                                    request.body.billingCityName,
                                    request.body.billingStateName,
                                    request.body.billingZip,
                                    request.body.isMailAndBillAddressSame
                                )
                                    .then(async (res) => {
                                        const { companyId, companyDefault2FA } = res
                                        const accessPayload = {
                                            userId: userId,
                                            firstname: request.body.firstname,
                                            lastname: request.body.lastname,
                                            email: request.body.email,
                                            role: 1,
                                            company: companyId[0]
                                        };
                                        const refreshPayload = { 
                                            userId: userId 
                                        };
                                        const accessToken = UsersController.createAccessToken(accessPayload);
                                        const refreshToken = UsersController.createRefreshToken(refreshPayload);
                                        const refreshTokenDecoded = jwt.decode(refreshToken);
                                        const refreshTokenExpiresAt = new Date(refreshTokenDecoded.exp * 1000);
                                        await knex('user_tokens').insert({
                                                userId,
                                                refresh_token: refreshToken,
                                                expires_at: refreshTokenExpiresAt
                                            });
                                            
                                    
                                        const userData = {
                                            id: userId,
                                            firstname: request.body.firstname,
                                            lastname: request.body.lastname,
                                            email: request.body.email,
                                            accountStatus: false,
                                            role: 1,
                                            mobileCountryCode: request.body.mobileCountryCode,
                                            mobileNumber: request.body.mobileNumber,
                                            currency:request.body.currency,
                                             auth: {
                                                accessToken,
                                                refreshToken,
                                                expiresIn:3600,
                                                refreshTokenExpiresAt
                                            },
                                            language:'en',
                                            avatarUrl: `${process.env.USER_PROFILE_IMAGE_URL}/default_avatar.png`,
                                            twoFactorEnabled: default2FA == '1' ? true : false,
                                            accountType: request.body.accountType,
                                            userCloudIntegrationWeb: userCloudIntegration == '1' ? true : false,
                                            userCloudIntegrationMob:userCloudIntegration == '1' ? true : false,
                                        }
                                        const company  = {
                                            id: companyId[0],
                                            companyName: request.body.companyName,
                                            orgType: request.body.orgType,
                                            phoneNumberCountryCode:request.body.phoneNumberCountryCode,
                                            phoneNumber: request.body.phoneNumber,
                                            mailingAddress: {
                                                addressLine: request.body.mailingStreetName,
                                                country:request.body.mailingCountryName,
                                                city: request.body.mailingCityName,
                                                state: request.body.mailingStateName,
                                                postCode: request.body.mailingZip
                                            },
                                            billingAddress: {
                                                addressLine: request.body.billingStreetName,
                                                country:request.body.billingCountryName,
                                                city: request.body.billingCityName,
                                                state: request.body.billingStateName,
                                                postCode: request.body.billingZip
                                            },
                                            companyLogo: `${process.env.COMPANY_LOGO_URL}/default_avatar.png`,
                                            companytwoFactorEnabled: companyDefault2FA == '1' ? true : false,
                                            language:'en'
                                        }
                                        user.getMailTemplate(1)
                                            .then(async (data) => {
                                                let subject = data[0].subject
                                                subject = subject.replace("{{name}}", request.body.firstname)
                                                let html = data[0].template 
                                                html = html.replace("{{name}}", request.body.firstname)
                                                var { transporter, mailingAddress } = await emailTransporter()
    
                                                var mailOptions2 = {
                                                    from: mailingAddress,
                                                    to: request.body.email,
                                                    subject: subject,
                                                    html
                                                };
    
                                                transporter.sendMail(mailOptions2, function (error, info) {
                                                    if (error) {
                                                        logger.error(error.message)
                                                        console.log(error)
                                                    }
                                                    // console.log(`Message sent ${info}`)
                                                    logger.info(`Welcome message successfully sent to ${request.body.email}`)
                                                });
                                                user.getMailTemplate(2)
                                                    .then(async (data) => {
                                                        let subject = data[0].subject
                                                        let html = data[0].template 
                                                        html = html.replace("{{name}}", request.body.firstname)
                                                        html = html.replace("{{link}}", `${process.env.FRONTEND_BASE_URL}/auth/verify?email=${request.body.email}&token=${token}`)
                                                        var mailOptions = {
                                                            from: mailingAddress,
                                                            to: request.body.email,
                                                            subject: subject,
                                                            html
                                                        };
            
                                                        transporter.sendMail(mailOptions, function (error, info) {
                                                            if (error) {
                                                                console.log(error)
                                                                logger.error(error.message)
                                                            }
                                                            // console.log(`Message sent ${info}`)
                                                            logger.info(`Verification email successfully sent to ${request.body.email}`)
                                                        });
                                                    })
                                            })
                                        logger.info(`Company account creation successful for ${request.body.email}`)
                                        return response.status(201)
                                            .send({ success: true, payment: {required:false, sessionURL:null}, message: request.t('accountCreationSuccess'), user:userData,company });
                                    })
                                    .catch((err) => {
                                        console.log(err)
                                        logger.warn(`Company account creation failed for ${request.body.email}`)
                                        logger.error(err)
                                        logger.debug(JSON.stringify({ success: false, message: request.t('accountCreationFailed') }))
                                    })
                            })
                                .catch((err) => {
                                    logger.warn(`User account creation failed for ${request.body.email}`)
                                    logger.error(err)
                                    logger.debug(JSON.stringify({ success: false, message: err }))
                                })
                        }
                    })
                    .catch((err) => {
                        logger.warn(`User account creation failed for ${request.body.email}`)
                        logger.error(err)
                        logger.debug(JSON.stringify({ success: false, message: err }))
                    })
            }
        }
    }

    static async checkIfEmailExist(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (request.body.email) {
            logger.info('Checking Payment Staius')
            user.checkIfUserExist(request.body.email)
            .then((res) => {
                if (res.length>0) {
                    logger.info('User Exists')
                    return response.status(200)
                        .send({ success: true, exists: true });
                }else {
                    logger.info('User Not Exist')
                    return response.status(200)
                        .send({ success: true, exists:false });
                }
            })
            .catch((err) => {
                console.log(err)
                return response.status(500)
                    .send({ success: false, error: 'server_error', message:"An unexpected error occured" });
            })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing  parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing email" ,details:{field:"email",issue:"missing email"}});
        }
    }

    static async checkPaymentStatus(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (request.query.email) {
            logger.info('Checking Payment Staius')
            user.checkPaymentStatus(request.query.email)
                .then((res) => {
                    if (res == 'success') {
                        logger.info('Success Payment Status')
                        return response.status(200)
                            .send({ success: true, status: 'success' });
                    } else if (res == 'failed') {
                        logger.info('Failed Payment Status')
                        return response.status(200)
                            .send({ success: true, status: 'failed' });
                     } else if (res == 'not-found') {
                        logger.info('Failed Payment Status : user not found')
                        return response.status(200)
                            .send({ success: false, status: 'user not found' });
                            
                    } else {
                        logger.info('Pending Payment Staius')
                        return response.status(201)
                            .send({ success: true, status: 'pending' });
                    }
                })
                .catch((err) => {
                    console.log(err)
                    return response.status(500)
                        .send({ success: false,error:"server_error", status: 'An unexpected error has occured' });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing payment requested parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Invalid request parameters",details:[{field:"email",issue:"Missing email"}] });
        }
    }

    static async verifyUser(request, response) {
        if (!logger) logger = await createLogger();

        const user = new Users(knex);
        const { email, token } = request.body;
        const userExists = await user.checkIfUserExist(email);
        if (!userExists.length>0) {
            return response.status(404).send({ success: false, error: "not_found", message: "User not found" });
        }
        const userData = await user.getUserDetails(email);
        const userId = userData ? userData.id : null;
        if(userData.accountStatus){
            return response.status(409).send({ success: false, error: "conflict", message: "Account already verified" });
        }
        const sendError = (status, error, message, details = undefined) => {
            const body = { success: false, error, message };
            if (details) body.details = details;

            logger.debug(JSON.stringify(body));
            return response.status(status).send(body);
        };

        const missing = [];
        if (!userId) missing.push({ field: "userId", issue: "This field is required" });
        if (!token) missing.push({ field: "token", issue: "This field is required" });

        if (missing.length > 0) {
            return sendError(400, "bad_request", "Invalid or missing fields", missing);
        }

        logger.debug(JSON.stringify({
            url: `${request.protocol}://${request.get("host")}${request.originalUrl}`,
            body: request.body,
            headers: request.headers
        }));

        logger.info(`Validating verification token for user ID ${userId}`);

        try {
            const tokenStatus = await user.validateToken(userId, token);

            if (tokenStatus === "valid") {
                logger.info(`Token valid for user ${userId}. Verifying account...`);

                const result = await user.verifyAccount(userId);

                if (result === 1) {
                    logger.info(`Account successfully verified for user ${userId}`);
                    return response.status(200).send({ success: true, message: "Account verified successfully" });                    
                }

                logger.warn(`User not found while verifying ID ${userId}`);
                    return response.status(404).send({ success: false, error: "not_found", message: "User not found" });
            }

            if (tokenStatus === "expired") {
                logger.warn(`Token expired for user ${userId}`);
                return response.status(400).send({ success: false, error: "token_expired", message: "Verification token has expired" });
            }

            logger.warn(`Invalid token for user ${userId}`);
            return response.status(401).send({ success: false, error: "unauthorized", message: "Invalid verification token" });

        } catch (err) {
            logger.error(err);
            logger.warn(`Unexpected server error for user ${userId}`);

            return sendError(500, "server_error", "An unexpected error occurred");
        }
    }

    static async validateInviteToken(request, response) {
        const redirectBase = process.env.FRONTEND_BASE_URL;
        try {
        const token = request.query.token;
        const email = request.query.email;

        const verifyUrl = `${process.env.BACKEND_URL}/invitations/verify`;

        const res = await axios.post(verifyUrl, { email, token });

        const invitation = res.data.invitationData;

        if (!invitation) {
             const redirectUrl = `${redirectBase}/error/invalid-invitation`;
                return response.redirect(redirectUrl);
        }

        // FIX TYPO: sataus → status
        const status = invitation.status;

        // Platform detection
        const userAgent = request.get("User-Agent")?.toLowerCase() || "";

        // If invitation is pending → redirect depending on platform
        if (status === "Pending") {
            const redirectUrl = `${redirectBase}/auth/register?email=${invitation.email}&token=${token}`;
            return response.redirect(redirectUrl);
        }else if(status === "Expired"){
            const redirectUrl = `${redirectBase}/error/expired-invitation`;
                return response.redirect(redirectUrl);
        }else{
             const redirectUrl = `${redirectBase}/error/invalid-invitation`;
                return response.redirect(redirectUrl);
        }

        } catch (err) {
            if(err.response?.data?.error === "conflict"){
                const redirectUrl = `${redirectBase}/error/expired-invitation`;
                    return response.redirect(redirectUrl);
            }
            const redirectUrl = `${redirectBase}/error/invalid-invitation`;
            return response.redirect(redirectUrl);
        }
    }

static async declineInviteToken(request, response) {
    try {
        const token = request.params.token;
        const email = request.params.email;

        const verifyUrl = `${process.env.BACKEND_URL}/invitation/decline`;

        const res = await axios.post(verifyUrl, { email, token });

        const invitation = res.data.invitationData;
                    const redirectBase = process.env.FRONTEND_BASE_URL;

        const redirectUrl = `${redirectBase}/status/declined`;
                return response.redirect(redirectUrl);

    } catch (err) {
        console.log(err.message);
        return response.status(500).send({ message: "An unexpected error occurred" });
    }
}

    static async getUserUsageData(request, response) {
        try {
            // Initialize logger if not already created
            if (!logger) {
                logger = await createLogger();
            }

            const user = new Users(knex);
            const document = new Documents(knex);
            const userId = request.decoded.userId;
            let { day, month, year } = request.query;

            day = day === "null" ? null : day;
            month = month === "null" ? null : month;
            year = year === "null" ? null : year;

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
            if(month && !year){
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
                    const statistics = await document.getStatisticsDetailForUserForDate(userId,day,month,year);
                    return response.status(200).send({ success: true, ...statistics });
                
            }

            else if (month && year) {
                
                    const statistics = await document.getStatisticsDetailForUserForMonth(userId, month, year);
                    return response.status(200).send({ success: true, ...statistics });
                
            }

            else if (!day && !month && !year) {
                const userFileUploadSources = await knex("documents")
                    .select("source")
                    .count({ count: "source" })
                    .select(knex.raw("SUM(CAST(REGEXP_REPLACE(size, '[^0-9\\.]+', '') AS DECIMAL(10,3))) AS size"))
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
                }

                const queries = { current: currentQueriesCount, limit: queriesLimit };

                const limit = Number(await getAdminSetting("RECORDING_MONTHLY_LIMIT"));
                const recordingCountData = await knex("recordings")
                    .select("*")
                    .where({ userId });

                const recordingDetails = { count: recordingCountData.length, limit };

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
                    noOfTeams :{
                        current:TeamsData.length,
                        limit: Number(teamsLimit)
                    }
                };

                logger.info("Statistics fetched successfully");
                return response.status(200).send({
                    success: true,
                    ...statisticsDetails
                });
            }
        } catch (error) {
            console.error(error);
            logger.error("Error fetching user usage data", error);
            return response.status(500).send({
                success: false,
                error: "server_error",
                message: "An unexpected error occured",
                details: []
            });
        }
    }

    static async resendVerificationMail(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        const userId = request.decoded.userId
        const isVerified = await user.isAccountVerified(userId)
        if(isVerified === "verified"){
            return response.status(409).send({
              success: false,
              error: "conflict",
              message: "User is already verified",
              details: []
            })
        }
        if (userId) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: { ...request.body },
                headers: request.headers
            }
            logger.debug(JSON.stringify(debugData))
            logger.info(`Resending verification link for ${userId}`)
            logger.info(`Resetting verification token for ${userId}`)
            user.resetToken(userId)
                .then((result) => {
                    const { res, token } = result
                    if (res == 1) {
                        logger.info(`Token reset success for ${userId}`)
                        logger.info(`Fetching user information for ${userId}`)
                        user.getUserDetailsById(userId)
                            .then(async (user1) => {
                                user.getMailTemplate(2)
                                    .then(async (data) => {
                                        let html = data[0].template 
                                        html = html.replace("{{name}}", user1.firstname)
                                        html = html.replace("{{link}}", `${process.env.FRONTEND_BASE_URL}/auth/verify?email=${user1.email}&token=${token}`)
                                        var { transporter, mailingAddress } = await emailTransporter()
                                        var mailOptions = {
                                            from: mailingAddress,
                                            to: user1.email,
                                            subject: `${data[0].subject}`,
                                            html
                                        };
        
                                        transporter.sendMail(mailOptions, function (error, info) {
                                            if (error) {
                                                logger.warn(`Failed to resend verification email for ${userId}`)
                                                logger.error(error.message)
                                                logger.debug(JSON.stringify({ success: false, message: request.t('verifyLinkSendFailed') }))
                                                return response.status(500)
                                                    .send({ success: false,error:"server_error", message: "An unexpected error has occured" });
                                            }
                                            logger.info(`Verification email resent successfully for ${userId}`)
        
                                            logger.debug(JSON.stringify({ success: true, message: request.t('verifyLinkSendSuccess') }))
                                            return response.status(200)
                                                .send({ success: true, message: request.t('verifyLinkSendSuccess') });
                                        });
                                    })
                            })
                    } else {
                        logger.warn(`Token reset failed for ${userId}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('verifyLinkSendFailed') }))
                        return response.status(200)
                            .send({ success: false, message: request.t('verifyLinkSendFailed') });
                    }
                })
                .catch((err) => {
                    logger.warn(`Token reset failed for ${userId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('verifyLinkSendFailed') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('verifyLinkSendFailed') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(404)
                .send({ success: false,error:"not_found", message: "User not found",details:[] });
        }
    }

    static async validateGoogleLoginCredentials(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (
            request.body.email
        ) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: { ...request.body, password: '*********' },
                headers: request.headers
            }
            logger.debug(JSON.stringify(debugData))

            logger.info(`Validating login credential for ${request.body.email}`)
            user.validateGoogleLoginCredential(request.body.email)
                .then((res) => {
                    if (res.stat == 'valid') {
                        logger.info(`Valid credentials provided by ${request.body.email}`)
                        user.getUserDetails(request.body.email)
                            .then((data) => {
                                let userData = data
                                logger.info(`Checking if account is blocked for ${request.body.email}`)
                                if (!userData.accountBlocked) {
                                    logger.info(`Account not in block status`)
                                    logger.info(`Checking if 2FA is enabled for ${request.body.email}`)
                                    user.is2FAEnabled(userData.id)
                                        .then((res) => {
                                            if (res == 'disabled') {
                                                logger.info(`2FA is disabled for ${request.body.email}`)
                                                logger.info(`Initiating authentication for ${request.body.email}`)
                                                user.getAccountType(userData.id)
                                                    .then((type) => {
                                                        user.getCompanyRole(userData.id)
                                                            .then((roleData) => {
                                                                user.getCompanyDetails(roleData.company)
                                                                    .then(async(companyData) => {
                                                                        // const jwtToken = jwt.sign({
                                                                        //     userId: userData.id,
                                                                        //     firstname: userData.firstname,
                                                                        //     email: userData.email,
                                                                        //     role: roleData.role,
                                                                        //     company: roleData.company
                                                                        // }, process.env.TOKEN_SECRET, { expiresIn: '30 days' });
                                            const accessPayload = {
                                                userId: userData.id,
                                                firstname: userData.firstname,
                                                lastname: userData.lastname,
                                                email: userData.email,
                                                role: roleData.role,
                                                company: roleData.company
                                            };

                                            const refreshPayload = { 
                                                userId: userData.id 
                                            };
                                            const accessToken = UsersController.createAccessToken(accessPayload);
                                            const refreshToken = UsersController.createRefreshToken(refreshPayload);
                                            const refreshTokenDecoded = jwt.decode(refreshToken);
                                            const refreshTokenExpiresAt = new Date(refreshTokenDecoded.exp * 1000);
                                            await knex('user_tokens').where({userId:userData.id}).delete()
                                            await knex('user_tokens').insert({
                                                userId: userData.id,
                                                refresh_token: refreshToken,
                                                expires_at: refreshTokenExpiresAt
                                            });
                                                                        let _auth = {
                                                                             auth: {
                                                    accessToken,
                                                    refreshToken,
                                                    expiresIn:3600,
                                                    refreshTokenExpiresAt
                                                },
                                                
                                                                        }
                                                                        if(type === "solo"){
                                                                            company=null
                                                                            userData = { ...userData, ..._auth, role: roleData.role, accountType: type,companyLanguage:companyData.language }
                                                                        }else{
                                                                        userData = { ...userData, ...companyData, ..._auth, role: roleData.role, accountType: type,companyLanguage:companyData.language }

                                                                        }
                                                                        logger.info(`Authentication success for ${request.body.email}`)
                                                                        logger.debug(JSON.stringify({ success: true, message: request.t('Authentication Success'), user:userData, twoFactorEnabled: false }))
                                                                        return response.status(200)
                                                                            .send({ success: true, message: 'Login successful', userData, twoFactorEnabled: false });
                                                                    })
                                                            })
                                                    })
                                                    .catch((err) => {
                                                        logger.warn(`Authentication failed for ${request.body.email}`)
                                                        logger.error(err)
                                                        logger.debug(JSON.stringify({ success: false, message: request.t('loginFailed') }))
                                                        return response.status(200)
                                                            .send({ success: false, message: request.t('loginFailed') });
                                                    })

                                            } else {
                                                logger.info(`2FA is enabled for ${request.body.email}`)
                                                logger.info(`Sending OTP to ${request.body.email}`)
                                                let userId = userData.id

                                                user.generateOTP(userId)
                                                    .then(async (otp) => {
                                                        user.getMailTemplate(9)
                                                            .then(async (data) => {
                                                            let subject = data[0].subject
                                                            let html = data[0].template 
                                                            html = html.replace("{{otp}}", otp)
                                                            var { transporter, mailingAddress } = await emailTransporter()
                                                            var mailOptions = {
                                                                from: mailingAddress,
                                                                to: request.body.email,
                                                                subject: subject,
                                                                html
                                                            };

                                                            transporter.sendMail(mailOptions, function (error, info) {
                                                                if (error) {
                                                                    logger.warn(`Failed to send OTP for ${request.body.email}`)
                                                                    logger.error(error.message)
                                                                    return console.log(error);
                                                                }
                                                                logger.info(`OTP sent successfully for ${request.body.email}`)
                                                            });
                                                            })

                                                        logger.debug(JSON.stringify({ success: true, message: 'Two-factor verification required', twoFactorEnabled: true }))
                                                        return response.status(200)
                                                            .send({ success: true, message: 'Two-factor verification required', twoFactorEnabled: true });
                                                    })
                                                    .catch((err) => {
                                                        logger.warn(`Failed to send OTP for ${request.body.email}`)
                                                        logger.error(err)
                                                        logger.debug(JSON.stringify({ success: false, message: request.t('invalidCredential') }))
                                                        return response.status(404)
                                                            .send({ success: false, message: request.t('invalidCredential') });
                                                    })
                                            }
                                        })
                                } else {
                                    logger.warn(`Authentication failed, account marked for deletion for ${request.body.email}`)
                                    logger.debug(JSON.stringify({ success: false, message: request.t('accountDeleted') }))
                                    return response.status(200)
                                        .send({ success: false, message: request.t('accountDeleted') });
                                }
                            })

                    } else if (res.stat == 'locked') {
                        logger.warn(`Authentication failed, account locked for ${request.body.email}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('accountLocked') }))
                        return response.status(200)
                            .send({ success: false, message: request.t('accountLocked') });
                    } else {
                        logger.warn(`Authentication failed, invalid credential provided by ${request.body.email}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('invalidCredential') }))
                        return response.status(404)
                            .send({ success: false, message: request.t('invalidCredential') });
                    }
                })
                .catch((err) => {
                    logger.warn(`Authentication failed for ${request.body.email}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('loginFailed') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('loginFailed') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async validateGoogleOTPAndAuthenticateUser(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (
            request.body.email &&
            request.body.otp
        ) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: { ...request.body, password: '*********' },
                headers: request.headers
            }
            logger.debug(JSON.stringify(debugData))
            logger.info(`Validating OTP sent by ${request.body.email}`)
            user.validateGoogleCredentialAndOtp(
                request.body.email,
                request.body.otp
            )
                .then((res) => {
                    if (res == 'valid') {
                        logger.info(`Valid credentials provided by ${request.body.email}`)
                        user.getUserDetails(request.body.email)
                            .then((data) => {
                                let userData = data
                                logger.info(`Checking if account is blocked for ${request.body.email}`)
                                if (!userData.accountBlocked) {
                                    logger.info(`Account not in block status`)
                                    logger.info(`Initiating authentication for ${request.body.email}`)
                                    user.getAccountType(userData.id)
                                        .then((type) => {
                                            user.getCompanyRole(userData.id)
                                                .then((roleData) => {
                                                    user.getCompanyDetails(roleData.company)
                                                        .then(async(companyData) => {
                                                            const accessPayload = {
                                                userId: userData.id,
                                                firstname: userData.firstname,
                                                lastname: userData.lastname,
                                                email: userData.email,
                                                role: roleData.role,
                                                company: roleData.company
                                            };

                                            const refreshPayload = { 
                                                userId: userData.id 
                                            };
                                            const accessToken = UsersController.createAccessToken(accessPayload);
                                            const refreshToken = UsersController.createRefreshToken(refreshPayload);
                                            const refreshTokenDecoded = jwt.decode(refreshToken);
                                            const refreshTokenExpiresAt = new Date(refreshTokenDecoded.exp * 1000);
                                            await knex('user_tokens').where({userId:userData.id}).delete()
                                            await knex('user_tokens').insert({
                                                userId: userData.id,
                                                refresh_token: refreshToken,
                                                expires_at: refreshTokenExpiresAt
                                            });

                                                            let _auth = {
                                                                 auth: {
                                                    accessToken,
                                                    refreshToken,
                                                    expiresIn:3600,
                                                    refreshTokenExpiresAt
                                                },
                                                            }

                                                            userData = { ...userData, ...companyData, ..._auth, role: roleData.role, accountType: type }
                                                            logger.info(`Authentication success for ${request.body.email}`)
                                                            logger.debug(JSON.stringify({ success: true, message: 'Two-factor verification required', userData, twoFactorEnabled: true }))
                                                            return response.status(200)
                                                                .send({ success: true, message: 'Two-factor verification required', userData, twoFactorEnabled: true });
                                                        })
                                                })
                                        })
                                        .catch((err) => {
                                            logger.warn(`Authentication failed for ${request.body.email}`)
                                            logger.error(err)
                                            logger.debug(JSON.stringify({ success: false, message: request.t('loginFailed') }))
                                            return response.status(200)
                                                .send({ success: false, message: request.t('loginFailed') });
                                        })
                                } else {
                                    logger.warn(`Authentication failed, account marked for deletion for ${request.body.email}`)
                                    logger.debug(JSON.stringify({ success: false, message: request.t('accountDeleted') }))
                                    return response.status(200)
                                        .send({ success: false, message: request.t('accountDeleted') });
                                }
                            })
                    } else if (res == 'expired') {
                        logger.warn(`OTP expired for ${request.body.email}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('OTPExpired') }))
                        return response.status(201)
                            .send({ success: false, message: request.t('OTPExpired') });
                    } else if (res == 'Invalid OTP') {
                        logger.warn(`Invalid OTP provided by ${request.body.email}`)
                        user.getUserDetails(request.body.email)
                            .then(async (data) => {
                                let userData = data
                                user.getMailTemplate(6)
                                    .then(async (data) => {
                                        let subject = data[0].subject
                                        let html = data[0].template 
                                        html = html.replace("{{name}}", userData.firstname)
                                        var { transporter, mailingAddress } = await emailTransporter()
                                        var mailOptions = {
                                            from: mailingAddress,
                                            to: userData.email,
                                            subject: subject,
                                            html
                                        };
        
                                        transporter.sendMail(mailOptions, function (error, info) {
                                            if (error) {
                                                logger.error(error.message)
                                                return console.log(error);
                                            }
                                            // console.log('Message sent: ' + info.response);
                                        });
                                    })
                                logger.debug(JSON.stringify({ success: false, message: request.t('invalidOTP') }))
                                return response.status(201)
                                    .send({ success: false, message: request.t('invalidOTP') });
                            })
                    } else if (res == 'locked') {
                        logger.warn(`Account locked due to multiple incorrect OTP attempt for ${request.body.email}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('accountLocked') }))
                        return response.status(201)
                            .send({ success: false, message: request.t('accountLocked') });
                    } else {
                        logger.warn(`Authentication failed, invalid credential provided by ${request.body.email}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('invalidCredential') }))
                        return response.status(404)
                            .send({ success: false, message: request.t('invalidCredential') });
                    }
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async validateLoginCredentials(req, res) {
        try {
            if (!logger) logger = await createLogger();
            const user = new Users(knex);

            const debugData = {
                url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
                body: { ...req.body, password: '*********' },
                headers: req.headers
            };
            logger.debug(JSON.stringify(debugData));

            const { email, password, loginType, code, code_verifier } = req.body;

            /* -------------------- INPUT VALIDATION -------------------- */
            const errors = [];
            if (!loginType) errors.push({ field: "loginType", issue: "This field is required" });
            if (loginType === "standard" && !email)
                errors.push({ field: "email", issue: "This field is required" });
            if (loginType === "standard" && !password)
                errors.push({ field: "password", issue: "This field is required for standard login" });

            if (errors.length) {
                return res.status(400).send({
                    success: false,
                    error: "bad_request",
                    message: "Missing required fields",
                    details: errors
                });
            }

            /* -------------------- SOCIAL LOGIN CODE -------------------- */
            let loginEmail = email;
            if (loginType === "social") {
                if (!code) {
                  return res.status(400).json({
                    success: false,
                    error: "bad_request",
                    message: "Invalid or missing fields",
                    details: [{ field: "code", issue: "This field is required" }],
                  });
                }

                if (!code_verifier) {
                  return res.status(400).json({
                    success: false,
                    error: "bad_request",
                    message: "Invalid or missing fields",
                    details: [{ field: "code_verifier", issue: "This field is required" }],
                  });
                }

                const raw = await redis.get(`login_code:${code}`);

                if (!raw) {
                  return res.status(401).json({
                    success: false,
                    error: "unauthorized",
                    message: "Invalid or expired login code",
                  });
                }

                const record = JSON.parse(raw);
                const derivedChallenge = crypto
                  .createHash("sha256")
                  .update(code_verifier)
                  .digest("base64url");

                if (derivedChallenge !== record.pkceChallenge) {
                  return res.status(401).json({
                    success: false,
                    error: "unauthorized",
                    message: "PKCE verification failed",
                  });
                }

                await redis.del(`login_code:${code}`);

                loginEmail = record.email;
            }

            logger.info(`Validating login credential for ${loginEmail}`);

            /* -------------------- CREDENTIAL VALIDATION -------------------- */
            const credentialResult =
                loginType === "standard"
                    ? await user.validateLoginCredential(loginEmail, password)
                    : await user.validateGoogleLoginCredential(loginEmail);

            if (credentialResult.stat !== "valid") {
                const statusMap = {
                    locked: [423, "accountLocked", "locked" ],
                    invalid: [401, "Invalid password", "unauthorized"],
                    "not-found": [404, "User account not found", "not_found"]
                };

                const [status, message,error] = statusMap[credentialResult.stat] || [401, "Invalid credentials", "unauthorized"];
                return res.status(status).send({ success: false, error, message });
            }

            /* -------------------- USER DETAILS -------------------- */
            const userData = await user.getUserDetails(loginEmail);
            if (userData.accountBlocked) {
                return res.status(409).send({
                    success: false,
                    error: "conflict",
                    message: "Your account is marked for deletion"
                });
            }

            /* -------------------- 2FA CHECK -------------------- */
            const is2FA = await user.is2FAEnabled(userData.id);
            if (is2FA === "enabled") {
                const otp = await user.generateOTP(userData.id);
                const template = await user.getMailTemplate(9);

                let html = template[0].template.replace("{{otp}}", otp);
                const { transporter, mailingAddress } = await emailTransporter();

                await transporter.sendMail({
                    from: mailingAddress,
                    to: loginEmail,
                    subject: template[0].subject,
                    html
                });

                logger.info(`OTP sent successfully for ${loginEmail}`);
                return res.status(200).send({
                    success: true,
                    message: "Two-factor verification required",
                    twoFactorEnabled: true
                });
            }

            /* -------------------- TOKEN GENERATION -------------------- */
            const accountType = await user.getAccountType(userData.id);
            const roleData = await user.getCompanyRole(userData.id);
            let companyData = await user.getCompanyDetails(roleData.company);

            const accessPayload = {
                userId: userData.id,
                firstname: userData.firstname,
                lastname: userData.lastname,
                email: userData.email,
                role: roleData.role,
                company: roleData.company
            };

            const refreshPayload = { userId: userData.id };
            const accessToken = UsersController.createAccessToken(accessPayload);
            const refreshToken = UsersController.createRefreshToken(refreshPayload);

            const refreshDecoded = jwt.decode(refreshToken);
            const refreshTokenExpiresAt = new Date(refreshDecoded.exp * 1000);

            await knex("user_tokens").where({ userId: userData.id }).delete();
            await knex("user_tokens").insert({
                userId: userData.id,
                refresh_token: refreshToken,
                expires_at: refreshTokenExpiresAt
            });

            if (!userData.language && companyData?.language) {
                userData.language = companyData.language;
            }

            if (accountType === "solo") companyData = null;

            logger.info(`Authentication success for ${loginEmail}`);

            return res.status(200).send({
                success: true,
                message: req.t("Authentication Success"),
                user: {
                    ...userData,
                    role: roleData.role,
                    accountType,
                    auth: {
                        accessToken,
                        refreshToken,
                        expiresIn: 3600,
                        refreshTokenExpiresAt
                    }
                },
                company: companyData,
            });

        } catch (err) {
            logger.error(err);
            return res.status(500).send({
                success: false,
                error: "server_error",
                message: "An unexpected error occurred"
            });
        }
    }

    static async validateOTPAndAuthenticateUser(req, res) {
    if (!logger) logger = await createLogger();

    const userModel = new Users(knex);
    const { email, otp } = req.body;

    const sendError = (status, message, details = null) => {
        const payload = { success: false, message, ...(details && { details }) };
        logger.debug(JSON.stringify(payload));
        return res.status(status).send(payload);
    };

    if (!email || !otp) {
        const details = [];
        if (!email) details.push({ field: "email", issue: "This field is required" });
        if (!otp) details.push({ field: "otp", issue: "This field is required" });

        return sendError(400, "Missing required fields", details);
    }

    logger.info(`Validating OTP for ${email}`);

    try {
        const otpStatus = await userModel.validateCredentialAndOtp(email, otp);

        /* -------------------- OTP FAILURE CASES -------------------- */
        if (otpStatus !== "valid") {
            if (otpStatus === "expired") return sendError(401, req.t("OTPExpired"));
            if (otpStatus === "locked") return sendError(401, req.t("accountLocked"));

            if (otpStatus === "Invalid OTP") {
                await UsersController.sendInvalidOtpMail(userModel, email);
                return sendError(401, req.t("invalidOTP"));
            }

            return sendError(401, req.t("invalidCredential"));
        }

        /* -------------------- USER VALID -------------------- */
        let userData = await userModel.getUserDetails(email);

        if (userData.accountBlocked) {
            return res.status(200).send({
                success: false,
                message: req.t("accountDeleted")
            });
        }

        /* -------------------- USER META -------------------- */
        const [
            cloudWeb,
            cloudMob,
            currency,
            roleData
        ] = await Promise.all([
            userModel.getUserMetaValue(userData.id, "userCloudIntegration"),
            userModel.getUserMetaValue(userData.id, "userCloudIntegrationMob"),
            userModel.getUserMetaValue(userData.id, "currency"),
            userModel.getCompanyRole(userData.id)
        ]);

        const companyData = await userModel.getCompanyDetails(roleData.company);

        if (!userData.language) {
            userData.language = companyData.language;
        }

        userData = {
            ...userData,
            userCloudIntegrationWeb: !!cloudWeb,
            userCloudIntegrationMob: !!cloudMob,
            currency
        };

        /* -------------------- TOKENS -------------------- */
        const { accessToken, refreshToken, refreshTokenExpiresAt } =
            await UsersController.generateTokens(userData, roleData);

        /* -------------------- COMPANY SHAPE -------------------- */
        const finalCompany =
            userData.accountType === "solo" ? null : UsersController.normalizeCompany(companyData);

        /* -------------------- FINAL RESPONSE -------------------- */
        return res.status(200).send({
            success: true,
            message: "Login successful",
            user: {
                ...userData,
                role: roleData.role,
                auth: {
                    accessToken,
                    refreshToken,
                    expiresIn: 3600,
                    refreshTokenExpiresAt
                }
            },
            company: finalCompany
        });

    } catch (err) {
        console.log(err)
        logger.error(err);
        return res.status(500).send({
            success: false,
            error: "server_error",
            message: "An unexpected error occurred"
        });
    }
}

/* ===================== HELPERS ===================== */

static async generateTokens(userData, roleData) {
    const accessPayload = {
        userId: userData.id,
        firstname: userData.firstname,
        lastname: userData.lastname,
        email: userData.email,
        role: roleData.role,
        company: roleData.company
    };

    const refreshPayload = { userId: userData.id };

    const accessToken = UsersController.createAccessToken(accessPayload);
    const refreshToken = UsersController.createRefreshToken(refreshPayload);

    const decoded = jwt.decode(refreshToken);
    const expiresAt = new Date(decoded.exp * 1000);

    await knex("user_tokens").where({ userId: userData.id }).delete();
    await knex("user_tokens").insert({
        userId: userData.id,
        refresh_token: refreshToken,
        expires_at: expiresAt
    });

    return {
        accessToken,
        refreshToken,
        refreshTokenExpiresAt: expiresAt
    };
}

static async normalizeCompany(company) {
    company.id = company.companyId;
    delete company.companyId;
    delete company.created;

    ["mailingAddress", "billingAddress"].forEach(type => {
        company[type].street = company[type].addressLine;
        company[type].zip = company[type].postCode;
        delete company[type].addressLine;
        delete company[type].postCode;
    });

    return company;
}
static async sendInvalidOtpMail(userModel, email) {
    const userData = await userModel.getUserDetails(email);
    const template = await userModel.getMailTemplate(6);

    const html = template[0].template.replace("{{name}}", userData.firstname);
    const subject = template[0].subject;

    const { transporter, mailingAddress } = await emailTransporter();

    transporter.sendMail(
        { from: mailingAddress, to: email, subject, html },
        err => err && logger.error(err.message)
    );
}



    static async getUserData (request,response){
        if (!logger) {
            logger = await createLogger();
        }
       const user = new Users(knex)
       const userId = request.decoded.userId
       if(!userId){
           return response.status(400).json({success:false,error:"bad_request",message:"Invalid userId",details:[]})
       }
       try{
           const userDetailsData = await user.getUserDetailsById(userId)
           const roleData =await user.getCompanyRole(userId)
           const userCloudIntegrationWeb = await user.getUserMetaValue(userId,"userCloudIntegration")
           const userCloudIntegrationMob = await user.getUserMetaValue(userId,"userCloudIntegrationMob")
           const userDetails = {
               id: 0,
               firstname: "",
               lastname: "",
               email: "",
               accountStatus: false,
               passwordSet:false,
               mobileCountryCode:"",
               mobileNumber: "",
               accountLockStatus: false,
               avatarUrl: "",
               twoFactorEnabled: false,
               accountBlocked: false,
               accountType: "",
               role:1,
               language:'en'
           }
           if(userDetailsData){
               if(!userDetailsData.language){
                   userDetailsData.language = await user.getCompanyMetaValue(roleData.company,"language")
               }            
               userDetails.id=userDetailsData.id
               userDetails.firstname=userDetailsData.firstname
               userDetails.lastname = userDetailsData.lastname
               userDetails.email = userDetailsData.email
               userDetails.accountStatus = userDetailsData.accountStatus
               userDetails.passwordSet=userDetailsData.passwordSet
               userDetails.mobileCountryCode = userDetailsData.mobileCountryCode
               userDetails.mobileNumber = userDetailsData.mobileNumber
               userDetails.accountLockStatus = userDetailsData.accountLockStatus
               userDetails.avatarUrl = userDetailsData.avatarUrl
               userDetails.twoFactorEnabled = userDetailsData.twoFactorEnabled
               userDetails.accountBlocked = userDetailsData.accountBlocked
               userDetails.accountType = userDetailsData.accountType
               userDetails.role =roleData.role
               userDetails.language=userDetailsData.language
               userDetails.userCloudIntegrationMob=userCloudIntegrationMob == 1 ? true:false;
               userDetails.userCloudIntegrationWeb=userCloudIntegrationWeb == 1 ? true :false;
           }
           return response.status(200).json({success:true,message:"User Data Fetched Successfully",user:userDetails})
       }
       catch(error){
        return response.status(500).json({success:false,error:"server_error",message:"Internal server error"})
       }
    }

static async getIntegrationFiles(request, response) {
    if (!logger) logger = await createLogger();

    const integrationId = request.params.integrationId;
    const userId = request.decoded.userId;
    let provider ='';
    if(integrationId =="integration_1"){
        provider='google'
    }
    if(integrationId =="integration_2"){
        provider='dropbox'
    }
    if(integrationId =="integration_3"){
        provider='onedrive'
    }
    if(integrationId =="integration_4"){
        provider='slack'
    }
    if(integrationId =="integration_5"){
        provider='wordpress'
    }
    // UTILITY: Insert file mapping safely
    const saveFileMap = async (internalId, realId, extra = {}) => {
        return knex("integrations_files_map").insert({
            userId,
            internalId,
            integrationFileId: realId,
            sourceUrl:extra.url || null,
        });
    };

    // 🚨 Fetch stored integration info
    const userIntegration = (await knex("user_integrations")
        .select("*")
        .where({ userId, integrationId }))[0];

    if (!userIntegration || userIntegration.login !== 1) {
        return response.status(409).send({
          success: false,
          error: "conflict",
          message: "Integration login required",
          details: [
            {
              IntegrationId: integrationId,
              issue: "No valid tokens found. User must log in to this integration."
        //  "IntegrationId": "integrationId",
        //      "issue": "Token refreshed failed. User must log in to this integration."
            }
          ],
          OAuth: `/auth/providers/${provider}`,
        }
        );
    }

    // -----------------------------------------------------------------------------------------------------
    //
    //  GOOGLE DRIVE  →  HAS RESOURCES
    //
    // -----------------------------------------------------------------------------------------------------
    if (integrationId === "integration_1") {
    try {
        // 1. Refresh Google token
        const tokenRes = await axios.post("https://oauth2.googleapis.com/token", null, {
            params: {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                refresh_token: userIntegration.refreshToken,
                grant_type: "refresh_token",
            }
        });

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
            access_token: tokenRes.data.access_token,
            refresh_token: userIntegration.refreshToken
        });

        const drive = google.drive({
            version: "v3",
            auth: oauth2Client
        });
        let allFiles = [];
        let pageToken = null;

        // 2. Fetch files from Google Drive
        do {
            const resFiles = await drive.files.list({
                fields: "nextPageToken, files(id,name,mimeType,size,createdTime,modifiedTime)",
                pageSize: 1000,
                pageToken
            });
        
            allFiles = allFiles.concat(resFiles.data.files || []);
            pageToken = resFiles.data.nextPageToken;
        } while (pageToken);

        const googleFiles = allFiles || [];

        // Supported file extensions
        const supportedExtensions = [
            "doc", "docx", "xlsx", "pdf", "pptx", "txt",
            "mp3", "mp4", "jpg", "jpeg", "png", "mov"
        ];

        // Helper: file filter (no folders + supported files only)
        function isSupportedFile(file) {
            if (!file || !file.name) return false;

            // Exclude Google Drive folders
            if (file.mimeType === "application/vnd.google-apps.folder") return false;

            const parts = file.name.split(".");
            if (parts.length < 2) return false;

            const ext = parts.pop().toLowerCase();
            return supportedExtensions.includes(ext);
        }

        // Filter only supported files
        const filteredFiles = googleFiles.filter(isSupportedFile);

        // 3. Build resources[] format
        const resources = [{
            id: `gd_res_${Date.now()}`,
            name: "My Drive",
            type: "folder",
            files: []
        }];

        for (const f of filteredFiles) {
            const internalId = `gf_${f.id.slice(0, 6)}_${Date.now()}`;

            // Save mapping in DB
            await saveFileMap(internalId, f.id);

            // Push formatted file
            resources[0].files.push({
                id: internalId,
                name: f.name,
                mimeType: f.mimeType,
                size: f.size ? Number(f.size) : null,
                createdTime: f.createdTime,
                modifiedTime: f.modifiedTime,
                importUrl: `/integrations/${integrationId}/files/${internalId}/import`,
                extra: {}
            });
        }

        return response.status(200).send({
            success: true,
            login: true,
            mode: "resources",
            message: "Resources and files fetched successfully",
            resources
        });

    } catch (error) {
        console.log(error);
        logger.error(error);
        return response.status(500).send({ success: false, error:"server_error", message:"An unexpected error occured" });
    }

    }

    // -----------------------------------------------------------------------------------------------------
    //
    //  DROPBOX  →  NO RESOURCES  (Case 2)
    //
    // -----------------------------------------------------------------------------------------------------
    if (integrationId === "integration_2") {
    try {
        let accessToken = userIntegration.accessToken;

        // 1. Refresh token
        if (userIntegration.refreshToken) {
            const tokenRes = await axios.post(
                "https://api.dropbox.com/oauth2/token",
                qs.stringify({
                    grant_type: "refresh_token",
                    refresh_token: userIntegration.refreshToken,
                    client_id: process.env.DROPBOX_APP_KEY,
                    client_secret: process.env.DROPBOX_APP_SECRET
                }),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }
            );

            accessToken = tokenRes.data.access_token;
        }

        // 2. List files
        const resList = await axios.post(
            "https://api.dropboxapi.com/2/files/list_folder",
            { path: "", recursive: false },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        // Only items that are files
        const files = resList.data.entries.filter(f => f[".tag"] === "file");

        // Allowed file extensions
        const allowedExt = [
            "doc", "docx", "xlsx", "pdf", "pptx", "txt",
            "mp3", "mp4", "jpg", "jpeg", "png", "mov"
        ];

        // Filter files by extension
        const filteredFiles = files.filter(file => {
            const ext = file.name.split(".").pop().toLowerCase();
            return allowedExt.includes(ext);
        });

        // Build response file list
        const fileList = [];

        for (const file of filteredFiles) {
            const internalId = `dbx_${file.id.slice(-6)}_${Date.now()}`;

            await saveFileMap(internalId, file.id);
            fileList.push({
                id: internalId,
                name: file.name,
                size: file.size,
                mimeType: file.mime_type || "unknown",
                importUrl: `/integrations/${integrationId}/files/${internalId}/import`,
                createdTime: file.client_modified,
                modifiedTime: file.server_modified,
            });
        }

        return response.status(200).send({
            success: true,
            login: true,
            mode: "files",
            message: "Files fetched successfully",
            files: fileList
        });

    } catch (err) {
        logger.error(err);
        return response.status(500).send({
            success: false,
            error: "server_error",
            message: "An unexpected error occured"
        });
    }
}


    // -----------------------------------------------------------------------------------------------------
    //
    //  ONEDRIVE  →  NO RESOURCES (Case 2)
    //
    // -----------------------------------------------------------------------------------------------------
    if (integrationId === "integration_3") {
    try {
        const tokenRes = await axios.post(
            "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            qs.stringify({
                client_id: process.env.MICROSOFT_CLIENT_ID,
                client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                refresh_token: userIntegration.refreshToken,
                grant_type: "refresh_token",
                scope: "https://graph.microsoft.com/.default",
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const accessToken = tokenRes.data.access_token;

        // Fetch OneDrive root files
        const resDrive = await axios.get(
            "https://graph.microsoft.com/v1.0/me/drive/root/children",
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        // Only files, not folders
        const files = resDrive.data.value.filter(f => f.file);

        // Allowed extensions
        const allowedExt = [
            "doc", "docx", "xlsx", "pdf", "pptx", "txt",
            "mp3", "mp4", "jpg", "jpeg", "png", "mov"
        ];

        // Filter by extension
        const filteredFiles = files.filter(f => {
            const ext = f.name.split(".").pop().toLowerCase();
            return allowedExt.includes(ext);
        });

        const fileList = [];

        for (const f of filteredFiles) {
            const internalId = `od_${f.id.slice(-6)}_${Date.now()}`;

            await saveFileMap(internalId, f.id);
            fileList.push({
                id: internalId,
                name: f.name,
                size: f.size,
                mimeType: f.file.mimeType,
                importUrl: `/integrations/${integrationId}/files/${internalId}/import`,
                createdTime: f.createdDateTime,
                modifiedTime: f.lastModifiedDateTime,
            });
        }

        return response.status(200).send({
            success: true,
            login: true,
            mode: "files",
            message: "Files fetched successfully",
            files: fileList
        });

    } catch (err) {
        console.log(err)
        logger.error(err);
        return response.status(500).send({
            success: false,
            error:"server_error",
            message:"An unexpected error occured"
        });
    }
}


    // -----------------------------------------------------------------------------------------------------
    //
    //  SLACK  →  HAS RESOURCES (channels)
    //
    // -----------------------------------------------------------------------------------------------------
    if (integrationId === "integration_4") {
        try {
            const token = userIntegration.accessToken;

            const toISO = (unixSeconds) =>
                unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;

            // Fetch channels
            const channelsRes = await axios.get(
                "https://slack.com/api/conversations.list",
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (!channelsRes.data.ok) {
                throw new Error("Slack channel fetch failed");
            }

            const channels = channelsRes.data.channels;
            const resources = [];

            // Fetch files once for all channels
            const filesRes = await axios.get(
                "https://slack.com/api/files.list",
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { count: 200 }
                }
            );

            if (!filesRes.data.ok) {
                throw new Error("Slack files fetch failed");
            }

            const allFiles = filesRes.data.files || [];

            // Allowed file extensions
            const allowedExt = [
                "doc", "docx", "xlsx", "pdf", "pptx", "txt",
                "mp3", "mp4", "jpg", "jpeg", "png", "mov"
            ];

            for (const ch of channels) {
                const resource = {
                    id: `slack_${ch.id}`,
                    name: ch.name,
                    type: "channel",
                    files: []
                };

                // Files posted to this channel
                let channelFiles = allFiles.filter(
                    f => f.channels?.includes(ch.id)
                );

                // Filter by extension
                channelFiles = channelFiles.filter(f => {
                    if (!f.name) return false;
                    const ext = f.name.split(".").pop().toLowerCase();
                    return allowedExt.includes(ext);
                });

                if (channelFiles.length === 0) {
                    resource.resourceError = {
                        issue: "Bot is not added to this channel or no supported files found"
                    };
                }

                for (const f of channelFiles) {
                    const internalId = `sl_${f.id.slice(-6)}_${Date.now()}`;

                    await saveFileMap(
                        internalId,
                        f.id
                    );

                    resource.files.push({
                        id: internalId,
                        name: f.name,
                        size: f.size,
                        mimeType: f.mimetype,
                        createdTime: toISO(f.created),
                        modifiedTime: toISO(f.timestamp),
                        importUrl: `/integrations/${integrationId}/files/${internalId}/import`,
                        extra: {}
                    });
                }

                resources.push(resource);
            }

            return response.status(200).json({
                success: true,
                login: true,
                mode: "resources",
                message: "Slack channels and files fetched successfully",
                resources
            });

        } catch (error) {
            logger.error(error);
            return response.status(500).json({
                success: false,
                error: "server_error",
                message: "An unexpected error occurred"
            });
        }
    }



    // -----------------------------------------------------------------------------------------------------
    //
    //  WORDPRESS  →  MULTI-SITE + RESOURCES
    //
    // -----------------------------------------------------------------------------------------------------
   if (integrationId === "integration_5") {
    try {
        const token = userIntegration.accessToken;

        // 1. Get list of sites
        const sitesRes = await axios.get(
            "https://public-api.wordpress.com/rest/v1.1/me/sites",
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const sites = sitesRes.data.sites || [];
        const resources = [];

        // Allowed extensions
        const allowedExt = [
            "doc", "docx", "xlsx", "pdf", "pptx", "txt",
            "mp3", "mp4", "jpg", "jpeg", "png", "mov"
        ];

        for (const site of sites) {
            const siteSlug = site.URL.replace("https://", "");

            const resource = {
                id: `wp_site_${site.blogid}`,
                name: site.name || siteSlug,
                type: "site",
                files: []
            };

            try {
                // Fetch MEDIA
                const mediaRes = await axios.get(
                    `https://public-api.wordpress.com/wp/v2/sites/${siteSlug}/media`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const mediaFiles = mediaRes.data || [];

                // FIX → Extract extension from file.source_url
                const filteredMedia = mediaFiles.filter(file => {
                    const url = file.source_url || "";
                    const ext = url.split(".").pop().toLowerCase().split("?")[0];
                    return allowedExt.includes(ext);
                });

                for (const file of filteredMedia) {
                    const wpFileId = file.id;
                    const internalId = `wp_${wpFileId}_${Date.now()}`;
                    let name = file.title?.rendered || file.slug
                    name= name+"."+file.source_url.split(".").pop().toLowerCase().split("?")[0]

                    await saveFileMap(
                        internalId,
                        wpFileId,
                        {
                            section: "media",
                            url: file.source_url,
                            author: file.author
                        }
                    );

                    resource.files.push({
                        id: internalId,
                        name: name,
                        mimeType: file.mime_type,
                        size: file.media_details?.filesize,
                        createdTime: file.date,
                        modifiedTime: file.modified,
                        importUrl: `/integrations/${integrationId}/files/${internalId}/import`,
                        extra: {
                            section: "media",
                            url: file.source_url,
                            author: file.author
                        }
                    });
                }

            } catch (e) {
                resource.resourceError = {
                    issue: "API key does not have permission to read media or posts"
                };
            }

            resources.push(resource);
        }

        return response.status(200).json({
            success: true,
            login: true,
            mode: "resources",
            message: "WordPress content fetched successfully",
            resources
        });

    } catch (error) {
        logger.error(error);
        return response.status(500).send({
            success: false,
            error:"server_error",
            message:"An unexpected error occured"
        });
    }
}



    // Unknown integration
    return response.status(400).send({ success: false, message: "Invalid integration ID" });
}


        static async getIntegrationFile(request,response){
            return response.status(500).json({
                   success: false,
                   error: 'server_error',
                   message:"An unexpected error occurred'"
               });
        }
   
static async updateUserCloudIntegration(request, response) {
    if (!logger) {
        logger = await createLogger();
    }

    const userId = request.decoded?.userId;
    const integrationId = request.params.integrationId;

    if ( !integrationId) {
        logger.info("Required fields are missing to update user integrations");
        return response.status(400).json({
            success: false,
            error: 'bad_request',
            message: 'IntegrationId are required'
        });
    }

    const integrationMap = {
        "integration_1": "google",
        "integration_2": "dropbox",
        "integration_3": "microsoft",
        "integration_4": "slack",
        "integration_5": "wordpress"
    };

    const integrationName = integrationMap[integrationId];
    if (!integrationName) {
        return response.status(400).json({
            success: false,
            error: 'bad_request',
            message: 'Invalid integration ID'
        });
    }

    try {
        const { accessToken = '', refreshToken = '', login = false, account = '' } = request.body;

        const updateData = { accessToken, refreshToken, login, account };

        const updatedRows = await knex('user_integrations')
            .where({ userId, integrationId })
            .update(updateData);

        if (!updatedRows) {
            return response.status(404).json({
                success: false,
                error: 'not_found',
                message: 'User integration not found'
            });
        }

        logger.info(`User integration updated for userId: ${userId}, integration: ${integrationName}`);

        return response.status(200).json({
            success: true,
            message: 'Integration updated successfully',
            loginUri: `/auth/providers/${integrationName}`
        });

    } catch (error) {
        logger.error(`Error updating user integration for userId ${userId}:`, error);
        return response.status(500).json({
            success: false,
            error: 'server_error',
            message: 'Error updating cloud integration details'
        });
    }
}
       
    static async getUserIntegrations (request,response) {
        if (!logger) {
            logger = await createLogger();
        }
        const { userId, id, fields,source } = request.body;
        if (!userId || !id || !source || !Array.isArray(fields) || fields.length === 0) {
            logger.info("Required fieldss are missing to fetch user integrations")
            return response.status(401).json({
                success: false,
                message: 'userId, integrationId, and a non-empty fields array are required',
            });
        }
        try{
            logger.info("Fetching user integrations")
            const validFields = ['accessToken', 'refreshToken', 'account', "source", 'time', 'login','name'];
            const requestedFields = fields.filter(f => validFields.includes(f));
            if (requestedFields.length === 0) {
                logger.info('None of the requested fields are valid')
                return response.status(402).json({
                    success: false,
                    message: 'None of the requested fields are valid',
                });
            }
            const record = await knex('user_integrations')
            .where({ userId: userId, integrationId: id })
            .first(requestedFields);
            if (!record) {
                logger.info('Integration not found for the user')
                const isCloudIntegrationsActiveForUser = await knex("users_meta").where({
                    userId:userId,metaKey:"userCloudIntegration"
                })
                if(isCloudIntegrationsActiveForUser[0].metaValue == 1){
                    let dummyRecord =requestedFields.reduce((acc,key) => {
                        acc[key]=
                        key ==='accessToken'?"":
                        key ==='refreshToken'?"":
                        key ==='login'?false:
                        key ==='time'?"000-00-00 00:00:00":null;
                        return acc
                    },{})

                    return response.status(200).json({
                        success: true,
                        message: 'Requested fields fetched successfully',
                        data: {
                            id,
                            fields: dummyRecord,
                        },
                    })
                }else{
                    return response.status(403).json
                    ({
                        success: false,
                        message: 'Integration not found for the user',
                    });
                }
            }
            return response.status(200).json({
                success: true,
                message: 'Requested fields fetched successfully',
                data: {
                    id,
                    fields: record,
                },
            });
        }
        catch(error){
            response.status(500).json({
                success: false,
                message: 'Failed to fetch requested fields',
            });
        }
    }

    static async getUserCloudIntegraion(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const source = request.useragent;
        const user = new Users(knex)

        const userId = request.decoded.userId
        const isMobile = source.isMobile
        if(userId){
            const isCIA = await getAdminSetting("CLOUD_INTEGRATION")
            const isCIAM = await getAdminSetting("CLOUD_INTEGRATION_MOBILE")
            const isGDActive = (process.env.GOOGLE_DRIVE_INTEGRATION == 1) ? true : false
            const isDBActive = (process.env.DROPBOX_INTEGRATION == 1) ? true : false
            const isODActive = (process.env.ONEDRIVE_INTEGRATION == 1) ? true : false
            const isSLActive = (process.env.SLACK_INTEGRATION == 1) ? true : false
            const isWPActive = (process.env.WORDPRESS_INTEGRATION == 1) ? true : false
            logger.info("Getting user specific cloud integration configurations")
            
            try {
                return user.getUserMetaDetails(userId)
                    .then(async (metaData) => {
                        user.getUserCloudIntegrationData(userId)
                        .then(async (cloudData)=>{

                            let data = {
                                cloudIntegrations: [
                                    {
                                        id: "integration_1",
                                        name: "GoogleDrive",
                                        active : false,
                                        
                                    },
                                    {
                                        id: "integration_3",
                                        name: "OneDrive",
                                        active : false,
                                        
                                    },
                                    {
                                        id: "integration_2",
                                        name: "Dropbox",
                                        active : false,
                                       
                                    },
                                    {
                                        id: "integration_4",
                                        name: "Slack",
                                        active : false,
                                        
                                    },
                                    {
                                        id: "integration_5",
                                        name: "WordPress",
                                        active : false,
                                        
                                    },
                                ]
                            }
                        
                       
                        
                        if (isMobile){
                            if(isCIAM){
                                if(metaData.userCloudIntegrationMob == 1){
                                    if(isGDActive){
                                        if(metaData.GoogleDrive_M == 1){
                                            data.cloudIntegrations.find(i => i.name === "GoogleDrive").active = true;
                                        }
                                    }
                                    if(isDBActive){
                                        if(metaData.Dropbox_M == 1){
                                            data.cloudIntegrations.find(i => i.name === "Dropbox").active = true;
                                            const DbIndex = cloudData.findIndex(i => i.integrationId === "integration_2");

                                        }
                                    }
                                    if(isODActive){
                                        if(metaData.OneDrive_M == 1){
                                            data.cloudIntegrations.find(i => i.name === "OneDrive").active = true;
                                        }
                                    }
                                    if(isSLActive){
                                        if(metaData.Slack_M == 1){
                                            data.cloudIntegrations.find(i => i.name === "Slack").active = true;
                                           const slIndex = cloudData.findIndex(i => i.integrationId === "integration_4");
                                            if(slIndex!== -1) {
                                                }
                                        }
                                    }
                                    if(isWPActive){
                                        if(metaData.Wordpress_M == 1){
                                            data.cloudIntegrations.find(i => i.name === "WordPress").active = true;
                                            const wpIndex = cloudData.findIndex(i => i.integrationId === "integration_5");

                                        }
                                    }
                                }
                            }
                        }
                        else {
                            if(isCIA){
                                if(metaData.userCloudIntegration == 1){
                                    if(isGDActive){
                                        if(metaData.GoogleDrive == 1){
                                            data.cloudIntegrations.find(i => i.name === "GoogleDrive").active = true;
                
                                        }
                                    }
                                    if(isDBActive){
                                        if(metaData.Dropbox == 1){
                                            data.cloudIntegrations.find(i => i.name === "Dropbox").active = true;

                                            
                                        }
                                    }
                                    if(isODActive){
                                        if(metaData.OneDrive == 1){
                                            data.cloudIntegrations.find(i => i.name === "OneDrive").active = true;
                                            
                                        }
                                    }
                                    if(isSLActive){
                                        if(metaData.Slack == 1){
                                            data.cloudIntegrations.find(i => i.name === "Slack").active = true;
                                            
                                        }
                                    }
                                    if(isWPActive){
                                        if(metaData.Wordpress == 1){
                                            data.cloudIntegrations.find(i => i.name === "WordPress").active = true;
                                           
                                        }
                                    }
                                }
                            }
                        }
                        logger.info('Successfully fetched user specific cloud integration configurations')
                        return response.status(200)
                        .send({ success: true, integrations:[...data.cloudIntegrations] });
                        })
                    })
            } catch (error) {
                logger.info(`Error processing user details for user ID`);
                console.log("error in abra",error)
                console.error(`Error processing user details for user ID ${userId}: ${error}`);
                return response.status(200)
                    .send({ success: false, message: 'Error getting cloud integration details' });
            }
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async googleDriveFiles(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        if(request.body.userId){
            try {
                const user_integrations = await knex("user_integrations").select("*").where({ userId:request.body.userId, integrationId: "integration_1" })
                if(user_integrations[0].login == 1){
                    const tokenresponse = await axios.post('https://oauth2.googleapis.com/token', null, {
                    params: {
                        client_id: process.env.GOOGLE_CLIENT_ID,
                        client_secret: process.env.GOOGLE_CLIENT_SECRET,
                        refresh_token: user_integrations[0].refreshToken,
                        grant_type: 'refresh_token',
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    });

                    const newAccessToken = tokenresponse.data.access_token
                    const oauth2Client = new google.auth.OAuth2();
                    oauth2Client.setCredentials({ access_token: newAccessToken });
                    const drive = google.drive({ version: 'v3', auth: oauth2Client });
                    const res = await drive.files.list({
                        fields: 'files(id, name, mimeType, size, createdTime)',
                    });
                    logger.info("Google Drive files fetched successfully")
                    return response.status(200)
                    .send({ success: true, login: true, files: res.data.files, accessToken: newAccessToken })
                }
                else {
                    return response.status(200)
                    .send({ success: true, login: false })
                }
            } catch (error) {
                logger.error(error)
                return response.status(200)
                .send({ success: true, login: false })
            }
        }
        else {
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async oneDriveFiles(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        if(request.body.userId){
            try {
                const user_integrations = await knex("user_integrations").select("*").where({ userId:request.body.userId, integrationId: "integration_3" })
                if(user_integrations[0].login == 1){
                    const tokenResponse = await axios.post(
                    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                    qs.stringify({
                        client_id: process.env.MICROSOFT_CLIENT_ID,
                        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                        refresh_token: user_integrations[0].refreshToken,
                        grant_type: "refresh_token",
                        scope: "https://graph.microsoft.com/.default",
                    }),
                    {
                        headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        },
                    }
                    );

                    const newAccessToken = tokenResponse.data.access_token;
               
                    // Step 2: Use Microsoft Graph API to fetch OneDrive files
                    const driveResponse = await axios.get('https://graph.microsoft.com/v1.0/me/drive/root/children', {
                    headers: {
                        Authorization: `Bearer ${newAccessToken}`,
                    },
                    });

                    // Output OneDrive file list
                    logger.info("One Drive files fetched successfully")
                    return response.status(200)
                    .send({ success: true, login: true, files: driveResponse.data.value, accessToken: newAccessToken })
                }
                else {
                    return response.status(200)
                    .send({ success: true, login: false })
                }
            } catch (error) {
                logger.error(error)
                return response.status(200)
                .send({ success: true, login: false })
            }
        }
        else {
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }

    }

    static async wordpressFiles(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        if (request.body.userId) {
            try {
                // Step 1: Fetch the user's integration record for WordPress
                const user_integrations = await knex("user_integrations")
                    .select("*")
                    .where({
                        userId: request.body.userId,
                        integrationId: "integration_5"
                    });

                const integration = user_integrations[0];

                if (integration?.login == 1) {
                    const accessToken = integration.accessToken;

                    // Step 2: Get site URL
                    const siteResponse = await axios.get('https://public-api.wordpress.com/rest/v1.1/me/sites', {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    });

                    const siteURL = siteResponse.data.sites[0]?.URL?.replace("https://", "") || '';

                    // Step 3: Fetch media files
                    let mediaResponse = null;
                    try {
                        mediaResponse = await axios.get(`https://public-api.wordpress.com/wp/v2/sites/${siteURL}/media`, {
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                            },
                        });
                    } catch (error) {
                        logger.error("Error fetching media:", error.response?.data || error.message);
                        return response.status(400).json({
                            success: false,
                            login: true,
                            message: "Failed to fetch media files.",
                        });
                    }

                    const mediaFiles = mediaResponse.data;
                    logger.info("Wordpress files fetched successfully")

                    return response.status(200).json({
                        success: true,
                        login: true,
                        files: mediaFiles,
                        accessToken: accessToken
                    });

                } else {
                    return response.status(200).json({ success: true, login: false });
                }
            } catch (error) {
                logger.error("Unexpected error:", error.message);
                return response.status(200).json({ success: false, login: false, error: error.message });
            }
        } else {
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    
    }

    static async slackFiles(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        if (request.body.userId) {
            try {
                // Step 1: Fetch the user's Slack integration record
                const user_integrations = await knex("user_integrations")
                    .select("*")
                    .where({
                        userId: request.body.userId,
                        integrationId: "integration_4"
                    });

                const integration = user_integrations[0];

                if (integration?.login == 1) {
                    const accessToken = integration.accessToken;

                    // Step 2: Fetch Slack files
                    const slackResponse = await axios.get('https://slack.com/api/files.list', {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                        params: {
                            types: 'all',  // fetch all file types
                            user: integration.refreshToken
                        }
                    });

                    if (slackResponse.data.ok) {
                        const files = slackResponse.data.files;

                    logger.info("Slack files fetched successfully")

                        return response.status(200).json({
                            success: true,
                            login: true,
                            files: files,
                            accessToken: accessToken
                        });
                    } else {
                        logger.error('Failed to retrieve Slack files:', slackResponse.data.error);
                        return response.status(400).json({
                            success: false,
                            login: true,
                            message: slackResponse.data.error
                        });
                    }

                } else {
                    return response.status(200).json({ success: true, login: false });
                }
            } catch (error) {
                logger.error("Unexpected error:", error.message);
                return response.status(200).json({
                    success: false,
                    login: false,
                    message: error.message
                });
            }
        } else {
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async dropboxFiles(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        if (!request.body.userId) {
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }

        try {
            const user_integrations = await knex("user_integrations")
            .select("*")
            .where({
                userId: request.body.userId,
                integrationId: "integration_2", // Dropbox
            });

            const userIntegration = user_integrations[0];

            if (userIntegration && userIntegration.login === 1) {

            let accessToken = userIntegration.accessToken;

            if (userIntegration.refreshToken) {
                const tokenResponse = await axios.post(
                "https://api.dropbox.com/oauth2/token",
                qs.stringify({
                    grant_type: "refresh_token",
                    refresh_token: userIntegration.refreshToken,
                    client_id: process.env.DROPBOX_APP_KEY,
                    client_secret: process.env.DROPBOX_APP_SECRET,
                }),
                {
                    headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
                );

                accessToken = tokenResponse.data.access_token;
            }

            // Step 1: List files from the given path
            const listResponse = await axios.post(
                "https://api.dropboxapi.com/2/files/list_folder",
                {
                path: "",
                recursive: true,
                include_media_info: true,
                include_deleted: false,
                include_has_explicit_shared_members: false,
                include_mounted_folders: true,
                },
                {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                }
            );

            const entries = listResponse.data.entries;

            // Step 2: For each file, fetch a temporary download link
            const enrichedFiles = await Promise.all(
                entries
                .filter(file => file[".tag"] === "file")
                .map(async file => {
                    try {
                    const tempLinkRes = await axios.post(
                        "https://api.dropboxapi.com/2/files/get_temporary_link",
                        { path: file.path_lower },
                        {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                        },
                        }
                    );

                    logger.info("Dropbox files fetched successfully")

                    return {
                        ...file,
                        downloadUrl: tempLinkRes.data.link,
                    };
                    } catch (err) {
                    logger.error(`Error getting temp link for ${file.name}:`, err.response?.data || err.message);
                    return null;
                    }
                })
            );

            return response.status(200).send({
                success: true,
                login: true,
                files: enrichedFiles.filter(Boolean),
                accessToken,
            });
            } else {
            return response.status(200).send({ success: true, login: false });
            }
        } catch (error) {
            logger.error("Dropbox error:", error.response?.data || error.message);
            return response.status(200).send({ success: true, login: false });
        }
    }
      
    static async sendResetPasswordLink(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        const userAgent = request.get('User-Agent') || '';
        const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
        if (request.body.email) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: { ...request.body },
                headers: request.headers
            }
            logger.debug(JSON.stringify(debugData))
            logger.info(`Sending password reset link for ${request.body.email}`)
            logger.info(`Checking if account exists for ${request.body.email}`)
            user.checkIfUserExist(request.body.email)
                .then((res) => {
                    if (res.length > 0) {
                        logger.warn(`Account exists for ${request.body.email}`)
                        user.getUserDetails(request.body.email)
                            .then((data) => {
                                const userData = data

                                user.resetToken(userData.id)
                                    .then(async (result) => {
                                        const { res, token } = result
                                        if (res == 1) {
                                            user.getMailTemplate(4)
                                                .then(async (data) => {
                                                    let subject = data[0].subject
                                                    let html = data[0].template 
                                                    html = html.replace("{{name}}", userData.firstname)
                                                    html = html.replace("{{link}}", `${process.env.FRONTEND_BASE_URL}/auth/reset-password?email=${request.body.email}&token=${token}`)
                                                    html = html.replace("{{token}}", token)
                                                    var { transporter, mailingAddress } = await emailTransporter()
                                                    var mailOptions = {
                                                        from: mailingAddress,
                                                        to: userData.email,
                                                        subject: subject,
                                                        html
                                                    };
        
                                                    transporter.sendMail(mailOptions, function (error, info) {
                                                        if (error) {
                                                            logger.warn(`Failed send password reset email for ${request.body.email}`);
                                                            logger.error(error.message)
                                                            logger.debug(JSON.stringify({ success: false, message: request.t('resetPassLinkSendFailed') }))
                                                            return response.status(500)
                                                                .send({ success: false,error:"server_error", message:"An unexpected error occured" });
                                                        }
                                                        logger.info(`Password reset email sent successfully for ${request.body.email}`)
                                                })

                                                logger.debug(JSON.stringify({ success: true, message: request.t('resetPassLinkSendSuccess') }))
                                                return response.status(200)
                                                    .send({ success: true, message: request.t('resetPassLinkSendSuccess') });
                                            });
                                        } else {
                                            logger.warn(`Failed to send password reset email for ${request.body.email}`)
                                            logger.debug(JSON.stringify({ success: false, message: request.t('resetPassLinkSendFailed') }))
                                            return response.status(200)
                                                .send({ success: false, message: request.t('resetPassLinkSendFailed') });
                                        }
                                    })
                                    .catch((err) => {
                                        logger.warn(`Failed to send password reset email for ${request.body.email}`)
                                        logger.error(err)
                                        logger.debug(JSON.stringify({ success: false, message: request.t('resetPassLinkSendFailed') }))
                                        return response.status(500)
                                            .send({ success: false,error:"server_error", message:"An unexpected error occured" });
                                    })
                            })
                    } else {
                        logger.warn(`Cannot find account registered under ${request.body.email}`)
                        logger.debug(JSON.stringify({ success: false, message: `${request.body.email} ${request.t('emailNotExist')}` }))
                        return response.status(404)
                            .send({ success: false,error:"not_found", message: `No account found for the provided email` });
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to send password reset email for ${request.body.email}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('resetPassLinkSendFailed') }))
                    return response.status(500)
                        .send({ success: false,error:"server_error", message:"An unexpected error occured" });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false,error:'bad_request', message: "Invalid or missing input",details:[{field:"email",issue:"Missing email"}] });
        }
    }

    static async resetPassword(request,response) {
        if (!logger) {
            logger = await createLogger();
        }
        const {token,email} =request.query;
        const userAgent = request.get('User-Agent') || '';
        response.redirect(`${process.env.FRONTEND_BASE_URL}/auth/reset-password?&email=${email}&token=${token}`)
        
    }

    static async changePassword(request, response) {
        try {
            if (!logger) {
                logger = await createLogger();
            }
        
            const user = new Users(knex);
            const { email, token, password } = request.body;
        
            if (!email || !token || !password) {
                const missingFields = [];
                if (!email) missingFields.push("email");
                if (!token) missingFields.push("token");
                if (!password) missingFields.push("password");
            
                logger.debug(JSON.stringify({
                    success: false,
                    message: "Missing required fields",
                    details: missingFields
                }));
            
                return response.status(400).send({
                    success: false,
                    error: "bad_request",
                    message: "Missing required fields",
                    details: missingFields.map(field => ({
                        field,
                        issue: "This field is required"
                    }))
                });
            }
        
            const passwordWeak =
                password.length < 8 ||
                !/[0-9]/.test(password) ||
                !/[!@#$%^&*(),.?":{}|<>]/.test(password) ||
                !/[A-Z]/.test(password) ||
                !/[a-z]/.test(password);
        
            if (passwordWeak) {
                return response.status(422).send({
                    success: false,
                    error: "validation_error",
                    message: "Validation failed",
                    details: [{
                        field: "password",
                        issue:
                            "Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol."
                    }]
                });
            }
        
            logger.debug(JSON.stringify({
                url: `${request.protocol}://${request.get('host')}${request.originalUrl}`,
                body: { ...request.body, password: "**********" },
                headers: request.headers
            }));
        
            logger.info(`Initiating password change for ${email}`);
        
            const userData = await user.getUserDetails(email);
            const userId = userData.id;
        
            const tokenStatus = await user.validateToken(userId, token);
        
            if (tokenStatus === "invalid token") {
                logger.warn(`Invalid token for ${email}`);
                return response.status(401).send({
                    success: false,
                    error: "invalid_token",
                    message: "The reset token is invalid"
                });
            }
        
            if (tokenStatus === "expired") {
                logger.warn(`Expired token for ${email}`);
                return response.status(410).send({
                    success: false,
                    error: "token_expired",
                    message: "The password reset token has expired"
                });
            }
        
            if (tokenStatus !== "valid") {
                throw new Error("Unexpected token validation result");
            }
        
            const isSamePassword = await user.comparePassword(password, userId);
            if (isSamePassword) {
                return response.status(422).send({
                    success: false,
                    error: "validation_error",
                    message: "Validation failed",
                    details: [{
                        field: "password",
                        issue: "New password cannot be the same as the previous password."
                    }]
                });
            }
        
            const updateResult = await user.updatePassword(userId, password);
            
        
            if (updateResult === 1) {
                await knex('users').where({
                    id: userId
                }).update({token:''})
                logger.info(`Password updated successfully for ${email}`);
                return response.status(200).send({
                    success: true,
                    message: request.t('passChangeSuccess')
                });
            }
        
            logger.warn(`Password update failed for ${email}`);
            return response.status(500).send({
                success: false,
                error: "server_error",
                message: "An unexpected error occurred"
            });
        
        } catch (err) {
            logger.error(`Password change error`, err);
            return response.status(500).send({
                success: false,
                error: "server_error",
                message: "An unexpected error occurred"
            });
        }
    }

    static async changeCurrentPassword(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        if (
            request.decoded.userId &&
            request.body.newPassword &&
            request.body.currentPassword
        ) {
            logger.info(`Initiating password change for user ID ${request.decoded.userId}`)
            logger.info(`Validating current password for user ID ${request.decoded.userId}`)
            user.validatePasswordByUserId(request.decoded.userId, request.body.currentPassword)
                .then((res) => {
                    if (res == 'valid') {
                        logger.info(`Valid password provided by user ID ${request.decoded.userId}`)
                        user.updatePassword(request.decoded.userId, request.body.newPassword)
                            .then((res) => {
                                if (res == 1) {
                                    logger.info(`Password update successful for user ID ${request.decoded.userId}`)
                                    logger.debug(JSON.stringify({ success: true, message: request.t('passwordUpdateSuccess') }))
                                    return response.status(200)
                                        .send({ success: true, message: request.t('passwordUpdateSuccess') });
                                } else {
                                    logger.warn(`Password update failed for user ID ${request.decoded.userId}`)
                                    logger.debug(JSON.stringify({ success: false, message: request.t('passwordUpdateFailed') }))
                                    return response.status(500)
                                        .send({ success: false, error: "server_error",message: "An unexpected error occurred" });
                                }
                            })
                    }else if(res == 'not-found'){
                        return response.status(404)
                                        .send({ success: false,error:"not_found", message: "User not found",details:["Invalid userId provided"] });
                    } else {
                        logger.warn(`Invalid password provided by user ID ${request.decoded.userId}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('invalidPassword') }))
                        return response.status(409)
                            .send({success: false,error: "conflict", message: request.t('invalidPassword'),details:[] });
                    }
                })
                .catch((err) => {
                    logger.warn(`Password update failed for user ID ${request.decoded.userId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('passwordUpdateFailed') }))
                    return response.status(500)
                        .send({ success: false, error: "server_error",message: "An unexpected error occurred" });
                })
        } else {
                let errors = [];

                if (!request.decoded.userId) {
                    errors.push({
                        field: "userId",
                        issue: "This field is required"
                    });
                }

                if (!request.body.newPassword) {
                    errors.push({
                        field: "newPassword",
                        issue: "This field is required"
                    });
                }

                if (!request.body.currentPassword) {
                    errors.push({
                        field: "currentPassword",
                        issue: "This field is required"
                    });
                }

                if (request.body.newPassword && request.body.newPassword.length < 8) {
                    
                     const errorResponse = {
                        success: false,
                        error: "validation_error",
                        message: "Validation failed",
                        details: [{
                        field: "newPassword",
                        issue: "Password too weak"
                    }]
                    };
                    return response.status(422).send(errorResponse);

                    
                }

                if (request.body.currentPassword && request.body.currentPassword.length < 6) {
                    errors.push({
                        field: "currentPassword",
                        issue: "Password must be at least 6 characters"
                    });
                }

                if (errors.length > 0) {
                    const errorResponse = {
                        success: false,
                        error: "bad_request",
                        message: "Invalid or missing fields",
                        details: errors
                    };
                
                    logger.debug(JSON.stringify(errorResponse));
                    return response.status(400).send(errorResponse);
                }
            }
        }
    static async setPassword(request, response) 
    {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        let errors = [];

        if (!request.decoded.userId) {
            errors.push({
                field: "userId",
                issue: "This field is required"
            });
        }
        if (!request.body.password) {
            errors.push({
                field: "password",
                issue: "This field is required"
            });
        }
        if (request.body.password && request.body.password.length < 8) {
            return response.status(422).send({
              success: false,
              error: "validation_error",
              message: "Validation failed",
              details: [
                {
                  field: "password",
                  issue: "Password too weak"
                }
              ]
            });
        }
        if (errors.length > 0) {
            const errorResponse = {
                success: false,
                error: "bad_request",
                message: "Invalid or missing fields",
                details: errors
            };
        
            logger.debug(JSON.stringify(errorResponse));
            return response.status(400).send(errorResponse);
        }
        const passwordSet = await knex("users").select("password").where({id:request.decoded.userId}).first()
        if(passwordSet.password){
            return response.status(409).send({success:false,error:"conflict",message:"Password already set",details:[]})
        }
        else{
            logger.info(`Initiating password change for user ID ${request.decoded.userId}`)
            logger.info(`Valid password provided by user ID ${request.decoded.userId}`)
            user.updatePassword(request.decoded.userId, request.body.password)
            .then((res) => {
                if (res == 1) {
                    logger.info(`Password update successful for user ID ${request.decoded.userId}`)
                    logger.debug(JSON.stringify({ success: true, message: request.t('passwordUpdateSuccess') }))
                    return response.status(200)
                        .send({ success: true, message: "Password setup successful", passwordSet: true });
                } else {
                    logger.warn(`Password setup failed for user ID ${request.decoded.userId}`)
                    logger.debug(JSON.stringify({ success: false, message: "Password setup successful",passwordSet:false }))
                    return response.status(500)
                        .send({ success: false,error:"server_error", message: "An unexpected error occured",passwordSet:false });
                }
            
            })
            .catch((err) => {
                logger.warn(`Password update failed for user ID ${request.decoded.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify({ success: false, message: request.t('passwordUpdateFailed') }))
                return response.status(500)
                .send({ success: false,error:"server_error", message: "An unexpected error occured",passwordSet:false });
            })
        }
    }

    static async updateEmail(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        const userId=request.decoded.userId;
        const newEmail = request.body.newEmail;
        const password = request.body.password;
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        let missingFields = [];
        if (!newEmail) {
            missingFields.push({ field: "newEmail", issue: "This field is required" });
        } else if (!emailRegex.test(newEmail)) {
            missingFields.push({ field: "newEmail", issue: "Invalid email format" });
        }
        if (!password) {
            missingFields.push({ field: "password", issue: "This field is required" });
        }
        if (missingFields.length > 0) {
            logger.debug(JSON.stringify({
                success: false,
                error: "bad_request",
                message: "Missing or invalid fields",
                details: missingFields
            }));
        
            return response.status(400)
                .send({
                    success: false,
                    error: "bad_request",
                    message: "Missing or invalid fields",
                    details: missingFields
                });
        }        
        if (
            userId &&
            password &&
            newEmail
        ) {
            logger.info(`Updating email for user ID ${userId}`)
            user.isUpdatingSameEmail(userId, newEmail)
                .then((isSameEmail) => {
                    if (isSameEmail == 'no') {
                        user.validatePasswordByUserId(userId, password)
                            .then((res) => {
                                if (res == 'valid') {
                                    user.checkIfUserExist(newEmail)
                                    .then(async (res) => {
                                        if (res.length > 0) {
                                            logger.warn(`Failed to update email to ${newEmail}`);
                                            logger.debug(JSON.stringify({ success: false, message: request.t('verifyLinkSendFailed') }))
                                            return response.status(409)
                                            .send({ success: false,error:"conflict", message: "Email already in use",details:[] });
                                                                                
                                        }else{
                                    user.updateEmail(userId, newEmail)
                                        .then((res) => {
                                            if (res == 1) {
                                                logger.info(`Email update success for user ID ${userId}`)
                                                user.resetToken(userId)
                                                    .then(async (result) => {
                                                        const { res, token } = result
                                                        if (res == 1) {
                                                            await user.updateUserMeta(userId, '2FA', 0)
                                                            user.getUserDetailsById(userId)
                                                                .then(async (user1) => {
                                                                    user.getMailTemplate(2)
                                                                        .then(async (data) => {
                                                                            let subject = data[0].subject
                                                                            let html = data[0].template 
                                                                            html = html.replace("{{name}}", user1.firstname)
                                                                            html = html.replace("{{link}}", `${process.env.FRONTEND_BASE_URL}/auth/verify?email=${newEmail}&token=${token}`)
                                                                            var { transporter, mailingAddress } = await emailTransporter()
                                                                            var mailOptions = {
                                                                                from: mailingAddress,
                                                                                to: user1.email,
                                                                                subject: subject,
                                                                                html
                                                                            };
        
                                                                            transporter.sendMail(mailOptions, function (error, info) {
                                                                                if (error) {
                                                                                    logger.warn(`Failed to send email verification to ${newEmail}`);
                                                                                    logger.error(error.message)
                                                                                    logger.debug(JSON.stringify({ success: false,error:"server_error", message: request.t('serverError') }))
                                                                                    return response.status(500)
                                                                                        .send({ success: false,error:"server_error", message: request.t('serverError') });
                                                                                }
                                                                                logger.info(`Email verification sent to ${newEmail}`)
                                                                        })

                                                                        logger.debug(JSON.stringify({
                                                                            success: true,
                                                                            message: request.t('emailUpdateSuccess'),
                                                                            email: newEmail,
                                                                            accountStatus: false
                                                                        }))
                                                                        return response.status(200)
                                                                            .send({
                                                                                success: true,
                                                                                message: request.t('emailUpdateSuccess'),
                                                                                email: newEmail,
                                                                                accountStatus: false
                                                                            });
                                                                    });
                                                                })
                                                        } else {
                                                            logger.warn(`Email update failed for ${newEmail}`)
                                                            logger.debug(JSON.stringify({ success: false,error:"server_error", message: request.t('serverError') }))
                                                            return response.status(500)
                                                                .send({ success: false,error:"server_error", message: request.t('serverError') });
                                                        }
                                                    })
                                                    .catch((err) => {
                                                        logger.warn(`Email update failed for ${newEmail}`)
                                                        logger.error(err)
                                                        logger.debug(JSON.stringify({ success: false,error:"server_error", message: request.t('serverError') }))
                                                        return response.status(500)
                                                            .send({ success: false,error:"server_error", message: request.t('serverError') });
                                                    })
                                            }
                                        })
                                    }
                                })
                                .catch((err) => {
                                    logger.warn(`Email update failed for ${newEmail}`)
                                    logger.error(err)
                                    logger.debug(JSON.stringify({ success: false, message: request.t('emailUpdateFailed') }))
                                    return response.status(500)
                                        .send({ success: false,error:"server_error", message: request.t('serverError') });
                                })
                                } else if(res == 'not-found'){
                                    logger.warn(`Email update failed due to user not found for provided ${newEmail}`)
                                    logger.debug(JSON.stringify({ success: false,error:"not_found", message: request.t('userNotFound'),details:[] }))
                                    return response.status(401)
                                        .send({ success: false,error:"not_found", message: request.t('userNotFound'),details:[] });
                                }else {
                                    logger.warn(`Email update failed due to invalid password provided by ${newEmail}`)
                                    logger.debug(JSON.stringify({ success: false, message: "Invalid password provided" }))
                                    return response.status(422)
                                        .send({ success: false, error: "validation_error", message: "Invalid password provided" });
                                }
                            })
                            .catch((err) => {
                                logger.warn(`Email update failed for ${newEmail}`)
                                logger.error(err)
                                logger.debug(JSON.stringify({ success: false,error:"server_error", message: request.t('serverError') }))
                                return response.status(500)
                                    .send({ success: false,error:"server_error", message: request.t('serverError') });
                            })
                    } else {
                        logger.warn(`Email update failed, current email and new email are same`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('sameEmail') }))
                        return response.status(409)
                            .send({ success: false, error:"conflict", message: request.t('sameEmail'),details:[] });
                    }
                })
                .catch((err) => {
                    logger.warn(`Email update failed for ${newEmail}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('emailUpdateFailed') }))
                    return response.status(500)
                        .send({ success: false,error:"server_error", message: request.t('serverError') });
                })
        }
    }

    static async updatetwoFactorEnabled(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        const userId = request.decoded.userId;
        const enabled= request.body?.enabled;
        const password =request.body?.password;
        const userPasswordData = await knex("users").select("password").where({ id: request.decoded.userId }).first();
        let validationErrors = [];

        if (!userId) {
            validationErrors.push({
                field: "userId",
                issue: "This field is required"
            });
        }
        if (!password) {
                 if(userPasswordData.password.length>0){   
            validationErrors.push({
                field: "password",
                issue: "Password is required"
            });
        }
        }


        if (enabled === undefined) {
            validationErrors.push({
                field: "enabled",
                issue: "This field is required"
            });
        } else if (typeof enabled !== "boolean") {
            validationErrors.push({
                field: "enabled",
                issue: "Invalid value, must be a boolean (true or false)"
            });
        }

        if (validationErrors.length > 0) {
            logger.debug(JSON.stringify({
                success: false,
                error: "bad_request",
                message: "Missing or invalid fields",
                details: validationErrors
            }));
        
            return response.status(400).send({
                success: false,
                error: "bad_request",
                message: "Missing or invalid fields",
                details: validationErrors
            });
        } 
        if(userPasswordData.password.length>0){
            const userEmail = await user.getUserDetailsById(request.decoded.userId)
            const valid = await user.validateLoginCredential(userEmail.email,request.body.password)
            if(valid.stat !=="valid"){
                return response.status(422).send({
                    success: false,
                    error: "validation_error",
                    message: "Invalid password provided",
                    details: []
                })
            }
        }        
        
        logger.info(`Enabling 2FA for ${userId}`)
        user.update2FA(userId,enabled)
            .then((res) => {
                if (res == 'enabled') {
                    logger.info(`2FA enabled for ${userId}`)
                    logger.debug(JSON.stringify({ success: true, message: request.t('2FAEnableSuccess'),twoFactorEnabled:true }))
                    return response.status(200)
                        .send({ success: true, message: request.t('2FAEnableSuccess'),twoFactorEnabled:true });
                }else if(res == 'disabled'){
                    logger.info(`2FA disabled for ${userId}`)
                    logger.debug(JSON.stringify({ success: true, message: request.t('2FADisableSuccess') }))
                    return response.status(200)
                        .send({ success: true, message: request.t('2FADisableSuccess'),twoFactorEnabled:false });
                
                }else if(res == 'already-disabled'){
                    logger.info(`2FA is already disabled for ${userId}`)
                    logger.debug(JSON.stringify({
                      success: false,
                      error: "conflict",
                      message: "Two-factor authentication is already disabled",
                      details: []
                    }))
                    return response.status(409)
                        .send({
                      success: false,
                      error: "conflict",
                      message: "Two-factor authentication is already disabled",
                      details: []
                    });
                }else if(res == 'already-enabled'){
                    logger.info(`2FA is already enabled for ${userId}`)
                    logger.debug(JSON.stringify({
                      success: false,
                      error: "conflict",
                      message: "Two-factor authentication is already enabled",
                      details: []
                    }))
                    return response.status(409)
                        .send({
                      success: false,
                      error: "conflict",
                      message: "Two-factor authentication is already enabled",
                      details: []
                    });
                } else {
                    logger.warn(`Failed to enable 2FA for ${userId}`)
                    logger.debug(JSON.stringify({ success: false, message: request.t('2FAEnableFailed') }))
                    return response.status(500)
                        .send({ success: false,error:"server_error", message:"An unexpected error occurred" });
                }
            })
            .catch((err) => {
                console.log(err)
                logger.warn(`Failed to enable 2FA for ${userId}`)
                logger.error(err)
                logger.debug(JSON.stringify({ success: false, message: request.t('2FAEnableFailed') }))
                return response.status(500)
                    .send({ success: false,error:"server_error", message:"An unexpected error occurred" });
            })
    }

    static async disabletwoFactorEnabled(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (request.body.userId) {
            logger.info(`Disabling 2FA for ${request.body.userId}`)
            user.disable2FA(request.body.userId)
                .then((res) => {
                    if (res == 1) {
                        logger.info(`2FA disabled for ${request.body.userId}`)
                        logger.debug(JSON.stringify({ success: true, message: request.t('2FADisableSuccess') }))
                        return response.status(200)
                            .send({ success: true, message: request.t('2FADisableSuccess') });
                    } else {
                        logger.warn(`Failed to disable 2FA for ${request.body.userId}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('2FADisableFailed') }))
                        return response.status(200)
                            .send({ success: false, message: request.t('2FADisableFailed') });
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to disable 2FA for ${request.body.userId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('2FADisableFailed') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('2FADisableFailed') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async enableCompanytwoFactorEnabled(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (request.body.companyId && request.body.userId) {
            logger.info(`Enabling company 2FA for ${request.body.companyId}`)
            logger.warn(`Failed to enable company 2FA for ${request.body.companyId}`)
            user.enableCompany2FA(request.body.companyId, request.body.userId)
                .then((res) => {
                    if (res == 1) {
                        logger.info(`Company 2FA enabled for ${request.body.companyId}`)
                        logger.info(`Enabling 2FA for company users`)
                        user.enable2FAForAllCompanyUsers(request.body.companyId)
                            .then((res) => {
                                if (res == 1) {
                                    logger.info(`2FA enabled for all company users`)
                                    logger.debug(JSON.stringify({ success: true, message: request.t('company2FAEnableSuccess') }))
                                    return response.status(200)
                                        .send({ success: true, message: request.t('company2FAEnableSuccess') });
                                } else {
                                    logger.warn(`Failed to enable 2FA for company users`)
                                    logger.debug(JSON.stringify({ success: false, message: request.t('company2FAEnableSuccessUsers2FAFailed') }))
                                    return response.status(200)
                                        .send({ success: false, message: request.t('company2FAEnableSuccessUsers2FAFailed') });
                                }
                            })
                    } else {
                        logger.warn(`Failed to enable 2FA for company Id ${request.body.companyId}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('company2FAEnableFailed') }))
                        return response.status(200)
                            .send({ success: false, message: request.t('company2FAEnableFailed') });
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to enable 2FA for company Id ${request.body.companyId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('company2FAEnableFailed') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('company2FAEnableFailed') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async updateCompanytwoFactorEnabled(request, response) {
        if (!logger) logger = await createLogger();
        const user = new Users(knex);
        const userId = request.decoded.userId;
        const companyId = request.params.companyId;
        const enabled = request.body?.enabled;
        const password =request.body?.password;
        const userPasswordData = await knex("users").select("password").where({ id: request.decoded.userId }).first();
        let validationErrors = [];
        if (!userId) validationErrors.push({ field: "userId", issue: "This field is required" });
        if (!companyId) validationErrors.push({ field: "companyId", issue: "This field is required" });
        if (enabled === undefined) {
            validationErrors.push({ field: "enabled", issue: "This field is required" });
        } else if (typeof enabled !== "boolean") {
            validationErrors.push({ field: "enabled", issue: "Invalid value, must be a boolean" });
        }
        if (!password) {
                 if(userPasswordData.password.length>0){   
            validationErrors.push({
                field: "password",
                issue: "Password is required"
            });
        }
        }
        if (validationErrors.length > 0) {
            return response.status(400).send({
                success: false,
                error: "bad_request",
                message: "Missing or invalid fields",
                details: validationErrors
            });
        }
        if(userPasswordData.password.length>0){
            const userEmail = await user.getUserDetailsById(request.decoded.userId)
            const valid = await user.validateLoginCredential(userEmail.email,request.body.password)
            if(valid.stat !=="valid"){
                return response.status(422).send({
                    success: false,
                    error: "validation_error",
                    message: "Invalid password provided",
                    details: []
                })
            }
        }
        try {
            const current = await user.getCompanyMetaValue(companyId,"2FA")
            if(current == enabled){
                if(enabled){
                return response.status(409).send({
                  success: false,
                  error: "conflict",
                  message: "Two-factor authentication is already enabled for company",
                  details: []
                })
            }else{
                return response.status(409).send({
                  success: false,
                  error: "conflict",
                  message: "Two-factor authentication is already disabled for company",
                  details: []
                })
            }
            }
            const updated = await user.updateCompany2FA(companyId, userId, enabled);
            if (updated !== 1) {
                
                return response.status(500).send({
                    success: false,
                    error:"server_error",
                    message: request.t('serverError')
                });
            }
            const result = await user.update2FAForAllCompanyUsers(companyId, enabled);
            console.log(result)
            const warnings = result.warnings || [];
            if (warnings.length === 0) {
                if(enabled){
                return response.status(200).send({
                    success: true,
                    message: "Two-factor authentication enabled for all company users",
                    twoFactorEnabled:true
                });
            }else{
                return response.status(200).send({
                    success: true,
                    message: "Two-factor authentication disabled for all company users",
                    twoFactorEnabled:false
                });
            }
            }
            return response.status(200).send({
                success: true,
                message: "Two-factor authentication updated for the some company users. Some users could not be updated.",
                warnings,
                twoFactorEnabled:enabled==1?true:false
            });
        } catch (err) {
            logger.error(err);
            return response.status(500).send({
                success: false,
                error:"server_error",
                message: "An unexpected error occured"
            });
        }
    }


    static async disableCompanytwoFactorEnabled(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (request.body.companyId) {
            logger.info(`Disabling company 2FA for ${request.body.companyId}`)
            logger.warn(`Failed to disable company 2FA for ${request.body.companyId}`)
            user.disableCompany2FA(request.body.companyId)
                .then((res) => {
                    if (res == 1) {
                        logger.info(`Company 2FA disabled for ${request.body.companyId}`)
                        logger.info(`Disabling 2FA for company users`)
                        user.disable2FAForAllCompanyUsers(request.body.companyId)
                            .then((res) => {
                                if (res == 1) {
                                    logger.info(`2FA disabled for all company users`)
                                    logger.debug(JSON.stringify({ success: true, message: request.t('company2FADisableSuccess') }))
                                    return response.status(200)
                                        .send({ success: true, message: request.t('company2FADisableSuccess') });
                                } else {
                                    logger.warn(`Failed to disable 2FA for company users`)
                                    logger.debug(JSON.stringify({ success: false, message: request.t('company2FADisableSuccessUsers2FAFailed') }))
                                    return response.status(200)
                                        .send({ success: false, message: request.t('company2FADisableSuccessUsers2FAFailed') });
                                }
                            })
                    } else {
                        logger.warn(`Failed to disable 2FA for company Id ${request.body.companyId}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('company2FADisableFailed') }))
                        return response.status(200)
                            .send({ success: false, message: request.t('company2FADisableFailed') });
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to disable 2FA for company Id ${request.body.companyId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('company2FADisableFailed') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('company2FADisableFailed') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async getAccountStatictic(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        logger.info(`Fetching account statistics for user ID ${request.body.userId}`)
        user.getAccountStatistic(request.body.userId)
            .then((statData) => {
                if (statData) {
                    logger.info(`Account stat fetched successfully for user ID ${request.body.userId}`)
                    return response.status(200)
                        .send({ success: true, message: request.t('accountStatFetchSuccess'), statData });
                } else {
                    logger.warn(`Failed to fetch account stat for user ID ${request.body.userId}`)
                    return response.status(200)
                        .send({ success: false, message: request.t('accountStatFetchFailed') });
                }
            })
            .catch((err) => {
                logger.warn(`Failed to fetch account stat for user ID ${request.body.userId}`)
                logger.error(err)
                return response.status(200)
                    .send({ success: false, message: request.t('accountStatFetchFailed') });
            })
    }

    static async sendInvitation(request, response) {
        try {
            if (!logger) logger = await createLogger();

            const user = new Users(knex);
            const validationErrors = [];

            if (!request.body.email)
                validationErrors.push({ field: "email", issue: "Email is required" });


            if (!request.body.role) {
                validationErrors.push({
                    field: "role",
                    issue: "Role is required"
                });
            } else if (![1, 2, 3, 4].includes(Number(request.body.role))) {
                validationErrors.push({
                    field: "role",
                    issue: "Role must be 1, 2, 3, or 4"
                });
            }

            if (!request.decoded.company)
                validationErrors.push({ field: "company", issue: "Company not found in token" });

            if (validationErrors.length > 0) {
                logger.debug(JSON.stringify({
                    success: false,
                    error: "bad_request",
                    message: "Invalid or missing fields",
                    details: validationErrors
                }));

                return response.status(400).send({
                    success: false,
                    error: "bad_request",
                    message: "Invalid or missing fields",
                    details: validationErrors
                });
            }


            const { email, role } = request.body;
            const { company } = request.decoded;
            const senderId = request.decoded.userId
            logger.info(`Sending invitation to ${email}`);
            logger.info(`Checking if account registered under ${email}`);

            const userExists = await user.checkIfUserExist(email);
            if (userExists.length > 0) {
                logger.info(`Account exists under ${email}`);
                return response.status(409).send({
                    success: false,
                    error: "conflict",
                    message: request.t("invtiationAlreadyExist"),
                    details:[]
                });
            }

            const userCount = await user.getCompanyUserCount(company);
            logger.info(`User count fetched: ${userCount}`);

            const maxInvite = await getAdminSetting("MAX_USERS");
            if (userCount > maxInvite) {
                return response.status(409).send({
                    success: false,
                    error: "conflict",
                    message: "You have reached the maximum number of users",
                    details:[]
                });
            }

            const inviteSent = await user.isInvitationSent(email);
            if (inviteSent !== "no") {
                logger.info(`Invitation already exists for ${email}`);
                return response.status(409).send({
                    success: false,
                    error: "conflict",
                    message: request.t("invitationAlreadySent"),
                        details: [
                            { field: "email", issue: "An invitation already exists for this email" }
                          ]
                });
            }

            const { invitationId, token } = await user.addInvitationDetails(
                email,
                senderId,
                role,
                company
            );

            const senderDetails = await user.getUserDetailsById(senderId);
            const senderName = senderDetails.firstname;

            const companyData = await user.getCompanyDetails(company);
            if (!companyData) {
                logger.warn(`No company data found.`);
                return response.status(500).send({
                    success: false,
                    error:"server_error",
                    message: request.t("serverError")
                });
            }

            const templateData = await user.getMailTemplate(3);
            let subject = templateData[0].subject.replace("{{usermail}}", email);

            let html = templateData[0].template
                .replace("{{sender}}", senderName)
                .replace("{{usermail}}", email)
                .replace(
                    "{{acceptLink}}",
                    `${process.env.FRONTEND_BASE_URL}/auth/invite?email=${email}&token=${token}`
                )
                .replace(
                    "{{denyLink}}",
                    `${process.env.FRONTEND_BASE_URL}/auth/invite/decline/${email}/${token}`
                );

            const { transporter, mailingAddress } = await emailTransporter();

            const mailOptions = {
                from: mailingAddress,
                to: email,
                subject,
                html
            };

            const info = await transporter.sendMail(mailOptions);

            if (!info.accepted || info.accepted.length === 0) {
                logger.warn(`Failed to send invitation mail to ${email}`);
                return response.status(500).send({
                    success: false,
                    error:"server_error",
                    message: request.t("serverError")
                });
            }

            logger.info(`Invitation sent to ${email}`);

            return response.status(201).send({
                success: true,
                message: request.t("invitationSentSuccess"),
                data: {
                    invitationId:invitationId[0],
                    email,
                    companyId: request.body.companyId,
                    role,
                    status: "pending",
                    sentAt: new Date()
                }
            });

        } catch (err) {
            logger.warn(`Failed to send invitation to ${request.body.email}`);
            logger.error(err);

            return response.status(500).send({
                    success: false,
                    error:"server_error",
                    message: request.t("serverError")
                });
        }
    }

    static async getInvitationList(request, response) {
        try {
            if (!logger) logger = await createLogger();
            const user = new Users(knex);

            const { limit=50, offset = 0, companyId, searchString } = request.query;

            if ( !companyId) {
                logger.debug(JSON.stringify({
                    success: false,
                    error: "bad_request",
                    message: "Invalid or missing fields",
                    details: [
                        !companyId && { field: "companyId", issue: "companyId is required" }
                    ].filter(Boolean)
                }));

                return response.status(400).send({
                    success: false,
                    error: "bad_request",
                    message: "Invalid or missing fields",
                    details: [
                        !companyId && { field: "companyId", issue: "companyId is required" }
                    ].filter(Boolean)
                });
            }

            logger.info(`Fetching invitation list for company Id ${companyId}`);

            

            let invitationList, recordCounts;

            if (searchString && searchString.trim() !== "") {
                invitationList = await user.searchUser(searchString, offset, limit, companyId);
                recordCounts = await user.getTotalNumberOfPageForFilteredInvitationList(
                    limit,
                    companyId,
                    searchString
                );

            } else {
                invitationList = await user.getInvitationList(offset, limit, companyId);
                recordCounts = await user.getTotalNumberOfPageForInvitationList(limit, companyId);
            }

            const { totalPageNum, noOfRecords } = recordCounts;

            logger.info(`Invitation list successfully fetched for company Id ${companyId}`);

            return response.status(200).send({
                success: true,
                invitationList,
                totalPageNum,
                noOfRecords
            });

        } catch (error) {
            logger.error("Unexpected server error", error);

            return response.status(500).send({
                success: false,
                error: "server_error",
                message: "An unexpected error occurred"
            });
        }
    }


    static async deleteInvitations(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (
            request.body.invitationIds &&
            request.body.limit &&
            request.body.companyId
        ) {
            logger.info(`Deleting invitations for company ID ${request.body.companyId}`)
            user.deleteInvitations(
                request.body.invitationIds
            )
                .then((res) => {
                    if (res == 1) {
                        logger.info(`Invitations deleted successfully for ${request.body.companyId}`)
                        logger.info(`Fetching updated list for company ID ${request.body.companyId}`)
                        user.getInvitationList(
                            0,
                            request.body.limit,
                            request.body.companyId
                        )
                            .then((invitationList) => {
                                user.getTotalNumberOfPageForInvitationList(request.body.limit, request.body.companyId)
                                    .then((recordCounts) => {
                                        const { totalPageNum, noOfRecords } = recordCounts
                                        logger.info(`Updated invitation list fetched successfully for ${request.body.companyId}`)
                                        logger.debug(JSON.stringify({ success: true, invitationList, totalPageNum, noOfRecords, message: request.t('userDeletionSuccess') }))
                                        return response.status(200)
                                            .send({ success: true, invitationList, totalPageNum, noOfRecords, message: request.t('userDeletionSuccess') });
                                    })
                            })
                            .catch((err) => {
                                logger.error(err)
                                logger.warn(`Failed to fetch the updated the invitation list for company ID ${request.body.companyId}`)
                                logger.debug(JSON.stringify({ success: false, message: request.t('userDeletionFailed1') }))
                                return response.status(200)
                                    .send({ success: false, message: request.t('userDeletionFailed1') });
                            })
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to delete the invitations for ${request.body.companyId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('userDeletionFailed2') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('userDeletionFailed2') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async deleteInvitation(request, response) {
        try {
        if (!logger) logger = await createLogger();

        const user = new Users(knex);

        const { invitationId, companyId } = request.params;

        const validationErrors = [];

        if (!companyId) {
            validationErrors.push({
                field: "companyId",
                issue: "Company ID is required"
            });
        } else if (isNaN(Number(companyId))) {
            validationErrors.push({
                field: "companyId",
                issue: "Must be a valid number"
            });
        }

        if (!invitationId) {
            validationErrors.push({
                field: "invitationId",
                issue: "Invitation ID is required"
            });
        } else if (isNaN(Number(invitationId))) {
            validationErrors.push({
                field: "invitationId",
                issue: "Must be a valid number"
            });
        }

        if (validationErrors.length > 0) {
            logger.debug(JSON.stringify({
                success: false,
                error: "bad_request",
                message: "Invalid or missing fields",
                details: validationErrors
            }));

            return response.status(400).send({
                success: false,
                error: "bad_request",
                message: "Invalid or missing fields",
                details: validationErrors
            });
        }

        logger.info(`Deleting invitation ${invitationId} for company ${companyId}`);

        const deleted = await user.deleteInvitation(invitationId);

        if (deleted === 1) {
            logger.info(`Invitation ${invitationId} deleted successfully for company ${companyId}`);
            return response.status(200).send({
                success: true,
                message: request.t("invitaionDeletionSuccess")
            });
        }

        logger.warn(`Invitation not found or already deleted: ${invitationId}`);

        return response.status(404).send({
            success: false,
            error: "not_found",
            message: "Invitation not found"
        });

        } catch (err) {
            logger.warn(`Failed to delete invitation for ${request.params.companyId}`);
            logger.error(err);

            return response.status(500).send({
                success: false,
                error: "server_error",
                message: request.t("serverError")
            });
        }
    }


    static async resendInvitation(request, response) {
        try {
            if (!logger) logger = await createLogger();

            const user = new Users(knex);
            const { companyId, invitationId } = request.params;

            const errors = [];
            if (!companyId || isNaN(+companyId)) {
                errors.push({ field: "companyId", issue: "Must be a valid number" });
            }
            if (!invitationId || isNaN(+invitationId)) {
                errors.push({ field: "invitationId", issue: "Must be a valid number" });
            }

            if (errors.length) {
                return response.status(400).json({
                    success: false,
                    error: "bad_request",
                    message: "Invalid or missing fields",
                    details: errors,
                });
            }

            const invitation = await knex("invitations")
                .select("*")
                .where({ id: invitationId })
                .first();

            if (!invitation) {
                return response.status(404).send({
                    success: false,
                    error: "not_found",
                    message: "Invitation not found"
                });
            }

            const { userId,email, role } = invitation;
            const senderId = invitation.sender
            if(userId){
                const userExists = await user.checkIfUserExist(userId);
                if (userExists.length > 0) {
                    logger.info(`Account already exists for user: ${userId}`);
                    return response.status(409).send({
                        success: false,
                        error: "conflict",
                        message: request.t("invitationResendFailedAlreadyRegistered")
                    });
                }
            }

            const userCount = await user.getCompanyUserCount(companyId);
            const maxUsers = +await getAdminSetting("MAX_USERS") || 0;

            if (userCount >= maxUsers) {
                return response.status(400).send({
                    success: false,
                    message: "You have reached the maximum number of users."
                });
            }


            const invitationStatus = await user.isInvitationSent(email);
            let invitationRecord;

            if (invitationStatus === "no") {
                invitationRecord = await user.addInvitationDetails(
                    email,
                    senderId,
                    role,
                    companyId
                );
            } else {
                invitationRecord = await user.updateInvitationDetails(email, companyId);
            }

            const { token } = invitationRecord;


            const sender = await user.getUserDetailsById(senderId);
            const senderName = sender.firstname;

            const companyData = await user.getCompanyDetails(companyId);
            if (!companyData) {
                return response.status(404).send({
                    success: false,
                    error: "not_found",
                    message: "Company data not found"
                });
            }

            const templateData = await user.getMailTemplate(3);
            const template = templateData[0];


            let subject = template.subject.replace("{{usermail}}", email);

            let html = template.template
                .replace("{{username}}", email)
                .replace("{{usermail}}", email)
                .replace("{{sender}}", senderName)
                .replace(
                    "{{acceptLink}}",
                    `${process.env.FRONTEND_BASE_URL}/auth/invite?email=${email}&token=${token}`
                )
                .replace(
                    "{{denyLink}}",
                    `${process.env.FRONTEND_BASE_URL}/auth/invite/decline/${email}/${token}`
                );


            const { transporter, mailingAddress } = await emailTransporter();

            const mailOptions = {
                from: mailingAddress,
                to: email,
                subject,
                html
            };

            const info = await transporter.sendMail(mailOptions);
            const successType =
                invitationStatus === "no"
                    ? "invitationSentSuccess"
                    : "invitationResentSuccess";

            if (info.accepted.length > 0) {
                return response.status(200).send({
                    success: true,
                    message: request.t(successType)
                });
            } else {
                return response.status(500).send({
                    success: false,
                    error: "server_error",
                    message: request.t("invitationSentFailed")
                });
            }
        } catch (err) {
            console.log(err)
            logger.error(err);
            return response.status(500).send({
                success: false,
                error: "server_error",
                message: request.t("serverError")
            });
        }
    }


    static async getInvitationData(request, response) {
        const user = new Users(knex);

        try {
            if (!logger) logger = await createLogger();

            const { email, token } = request.body;
            if (!email || !token) {
                return response.status(400).send({
                    success: false,
                    error: "bad_request",
                    message: "Invalid or missing fields",
                    details: [
                        !email && { field: "email", issue: "This field is required" },
                        !token && { field: "token", issue: "This field is required" }
                    ].filter(Boolean)
                });
            }
            const rows = await knex("invitations").where({ email,token }).select("*");

            if (!rows.length) {
                return response.status(404).send({
                    success: false,
                    error: "not_found",
                    message: "Invitation not found or does not match the provided email"
                });
            }

            const invitationRecord = rows[0];

            const invitationData = await user.getInvitationDetail(email);

            if (!invitationData) {
                return response.status(404).send({
                    success: false,
                    error: "not_found",
                    message: "Invitation not found or does not match the provided email"
                });
            }

            const now = Date.now();
            const issuedAt = parseInt(invitationData.token_issued);
            const expiresAt = issuedAt + 43_200_000; 
            const isExpired = now > expiresAt;

            const sender = await knex("users")
                .select("email")
                .where({ id: invitationRecord.sender });

            const invitedBy = sender?.[0]?.email;

            const clean = {
                id:invitationData.id,
                email:invitationData.email,
                companyId: invitationData.company,
                role:invitationData.role,
                status: invitationData.status,
                tokenIssued: invitationData.created,
                expiresAt: new Date(expiresAt),
                invitedBy
            };

            if (invitationData.status === "Pending") {

                if (isExpired) {
                    return response.status(410).send({
                        success: false,
                        error: "expired",
                        message: "This invitation link has expired"
                    });
                }

                if (invitationData.token != token) {
                    console.log(invitationData.token,token)
                    return response.status(422).send({
                        success: false,
                        error: "invalid_token",
                        message: "The invitation token is invalid"
                    });
                }

                return response.status(200).send({
                    success: true,
                    invitationData: clean
                });
            }
            if (invitationData.status === "Declined") {
                return response.status(200).send({
                    success: false,
                    error: "declined",
                    message: "This invitation was declined by the sender"
                });
            }

            if (invitationData.status === "Registered") {
                return response.status(409).send({
                    success: false,
                    error: "conflict",
                    message: "This invitation has already been used to register"
                });
            }

            return response.status(404).send({
                success: false,
                error: "not_found",
                message: "Invitation not found or does not match the provided email"
            });

        } catch (err) {
            logger?.error(err);

            return response.status(500).send({
                success: false,
                error: "server_error",
                message: "An unexpected error occurred"
            });
        }
    }

    static async createAccountForInvitedUser(request, response) {
        if (!logger) logger = await createLogger();
        const user = new Users(knex);

        try {

            const errorResponse = (status, message, details = [], error = "bad_request") => {
                const resObj = { success: false, error, message };
                if (details.length) resObj.details = details;
                logger.debug(JSON.stringify(resObj));
                return response.status(status).send(resObj);
            };

            const validateFields = (required) => {
                const details = [];
                required.forEach(field => {
                    if (!request.body[field]) {
                        details.push({ field, issue: "This field is required" });
                    }
                });
                return details;
            };

            const logDebug = (body) => {
                logger.debug(JSON.stringify({
                    url: request.protocol + '://' + request.get('host') + request.originalUrl,
                    body: body,
                    headers: request.headers
                }));
            };

            const emailSignupRequired = [
                "firstname", "lastname", "email", "mobileCountryCode",
                "mobileNumber", "password", "companyId",
                "role", "token", "signUpMethod"
            ];

            const socialSignupRequired = [
                "firstname", "lastname", "email",
                "companyId", "role", "token",
                "signUpMethod", "avatarUrl"
            ];

            let requiredFields = request.body.signUpMethod === "email"
                ? emailSignupRequired
                : socialSignupRequired;

            const missing = validateFields(requiredFields);

            if (missing.length > 0) {
                return errorResponse(400, "Invalid or missing fields", missing);
            }

            logDebug({ ...request.body, password: "**********" });

            logger.info(`Fetching invitation details for ${request.body.email}`);
            const invitation = await user.getInvitationDetail(request.body.email);

            if (!invitation) {
                return errorResponse(400, request.t("invalidInvitation"), [], "invalid_invitation");
            }

            const tDiff = Date.now() - parseInt(invitation.token_issued);

            if (invitation.status === "Declined") {
                return errorResponse(409, request.t("invitationDeclined"), [], "invitation_declined");
            }

            if (invitation.status === "Registered") {
                return errorResponse(409, request.t("accountAlreadyRegistered"), [], "already_registered");
            }

            if (invitation.status !== "Pending") {
                return errorResponse(400, request.t("invalidInvitation"));
            }

            if (tDiff >= 43200000) {
                return errorResponse(410, request.t("invitationExpired"), [], "expired");
            }
            if (invitation.token != request.body.token) {
                return errorResponse(401, request.t("invalidToken"), [], "unauthorized");
            }

            logger.info(`Fetching company details for companyId ${request.body.companyId}`);
            const company = await user.getCompanyDetails(request.body.companyId);

            if (!company) {
                return errorResponse(400, request.t("accountCreationFailedInvalidCompany"), [], "bad_request");
            }
            if (
  request.body.signUpMethod === "email" &&
  (
    request.body.password.length < 8 ||
    !/[0-9]/.test(request.body.password) ||                // must contain number
    !/[!@#$%^&*(),.?":{}|<>]/.test(request.body.password) || // must contain symbol
    !/[A-Z]/.test(request.body.password) ||                // must contain uppercase
    !/[a-z]/.test(request.body.password)                   // must contain lowercase
  )
) {
  return response.status(422).send({
    success: false,
    error: "validation_error",
    message: "Validation failed",
    details: [
      {
        field: "password",
        issue:
          "Password too weak. Must be at least 8 characters, include uppercase, lowercase, number, and symbol.",
      }
    ]
  });
}


            let created;
            if (request.body.signUpMethod === "email") {
                logger.info(`Creating email-invited user account for ${request.body.email}`);
                created = await user.createNewAccountForInvitedUser(
                    request.body.firstname,
                    request.body.lastname,
                    request.body.email,
                    request.body.mobileCountryCode,
                    request.body.mobileNumber,
                    request.body.password,
                    company.companytwoFactorEnabled,
                    request.body.companyId,
                    request.body.role,
                    request.body.signUpMethod
                );
            } else {
                logger.info(`Creating social-invited user account for ${request.body.email}`);

                created = await user.createNewAccountForSocialInvitedUser(
                    request.body.firstname,
                    request.body.lastname,
                    request.body.email,
                    company.companytwoFactorEnabled,
                    request.body.companyId,
                    request.body.role,
                    request.body.signUpMethod
                );

                logger.info(`Downloading profile image for ${request.body.email}`);
                const img = await axios.get(request.body.avatarUrl, { responseType: "arraybuffer" });
                const fileName = `${request.body.firstname}_${Date.now()}.jpg`;
                fs.writeFileSync(`${process.env.BACKEND_PATH}/uploads/userAvatars/${fileName}`, img.data);

                await user.updateUserMeta(created.userId, "avatarUrl", fileName);
            }

            const userId = created.userId;

            await user.updateInvitationStatusAndUserId("Registered", request.body.email, userId);


            let userData = await user.getUserDetailsById(userId);
            userData = { ...userData, ...company };

            const roleData = await user.getCompanyRole(userId);

            const accessPayload = {
                                                userId: userData.id,
                                                firstname: userData.firstname,
                                                lastname: userData.lastname,
                                                email: userData.email,
                                                role: roleData.role,
                                                company: roleData.company
                                            };

                                            const refreshPayload = { 
                                                userId: userData.id 
                                            };
                                            const accessToken = UsersController.createAccessToken(accessPayload);
                                            const refreshToken = UsersController.createRefreshToken(refreshPayload);
                                            const refreshTokenDecoded = jwt.decode(refreshToken);
                                            const refreshTokenExpiresAt = new Date(refreshTokenDecoded.exp * 1000);
                                            
                                            await knex('user_tokens').insert({
                                                userId: userData.id,
                                                refresh_token: refreshToken,
                                                expires_at: refreshTokenExpiresAt
                                            });
                                            userData = {
                                                    ...userData,
                                                    role: roleData.role,
                                            auth: {
                                                    accessToken,
                                                    refreshToken,
                                                    expiresIn:3600,
                                                    refreshTokenExpiresAt
                                                },
            };
            const userD = {
                id: userData.id,
                firstname: userData.firstname,
                lastname: userData.lastname,
                email: userData.email,
                accountType: userData.accountType,
                accountStatus:userData.accountStatus,
                currency:userData.currency,
                mobileNumber: userData.mobileNumber,
                mobileCountryCode: userData.mobileCountryCode,
                avatarUrl: userData.avatarUrl,
                twoFactorEnabled: userData.twoFactorEnabled,
                passwordSet: userData.passwordSet,
                userCloudIntegrationWeb: userData.userCloudIntegration == '1' ? true : false,
                userCloudIntegrationMob:userData.userCloudIntegrationMob == '1' ? true : false,
                role: roleData.role,
                auth: userData.auth
            };
            const sender = await user.getUserDetailsById(invitation.sender);
            const template = await user.getMailTemplate(7);
            let subject = template[0].subject.replace("{{name}}", sender.firstname);
            let html = template[0].template
                .replace("{{name}}", sender.firstname)
                .replace("{{email}}", request.body.email);

            const { transporter, mailingAddress } = await emailTransporter();

            transporter.sendMail({
                from: mailingAddress,
                to: sender.email,
                subject,
                html
            }, (err) => {
                if (err) logger.error(err.message);
                logger.info(`Acceptance email sent to ${sender.email}`);
            });

            logger.info(`Account created for ${request.body.email}`);
            return response.status(201).send({
                success: true,
                message: "Account created successfully",
                payment: { required: false, sessionUrl: null },
                user:userD,
                company,
                twoFactorEnabled: company.twoFactorEnabled
            });

        } catch (err) {
            console.log(err)
            logger.error(err);
            return response.status(500).send({
                success: false,
                error: "server_error",
                message: "An unexpected error occured"
            });
        }
    }

    static async declineInvitation(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (
            request.body.email &&
            request.body.token
        ) {
            logger.info(`Declining invitation for ${request.body.email}`)
            user.getInvitationDetail(request.body.email)
                .then((invitationData) => {
                    if (invitationData) {
                        const tnow = Date.now()
                        const tDiff = tnow - parseInt(invitationData.token_issued)

                        if (invitationData.status == 'Pending') {
                            if (tDiff < 600000) {
                                if (invitationData.token == request.body.token) {
                                    user.getCompanyDetails(invitationData.company)
                                        .then((companyData) => {
                                            if (companyData) {
                                                user.declineInvitation(request.body.email)
                                                    .then((res) => {
                                                        if (res == 1) {
                                                            user.getUserDetailsById(invitationData.sender)
                                                                .then(async (senderData) => {
                                                                    user.getMailTemplate(8)
                                                                        .then(async (data) => {
                                                                            let subject = data[0].subject
                                                                            let html = data[0].template 
                                                                            html = html.replace("{{name}}", senderData.firstname)
                                                                            html = html.replace("{{email}}", request.body.email)
                                                                            var { transporter, mailingAddress } = await emailTransporter()
                                                                            var mailOptions2 = {
                                                                                from: mailingAddress,
                                                                                to: senderData.email,
                                                                                subject: subject,
                                                                                html
                                                                            };
        
                                                                            transporter.sendMail(mailOptions2, function (error, info) {
                                                                                if (error) {
                                                                                    logger.error(error.message)
                                                                                }
                                                                                logger.info(`Decline mail sent to invitation sender ${senderData.email}`)
                                                                            });
                                                                        })
                                                                })
                                                            logger.info(`Invitation declined for ${request.body.email}`)
                                                            logger.debug(JSON.stringify({ success: true, message: request.t('invitationDeclineSuccess') }))
                                                            return response.status(200)
                                                                .send({ success: true, message: request.t('invitationDeclineSuccess') })
                                                        } else {
                                                            logger.warn(`Failed to decline invitation for ${request.body.email}`)
                                                            logger.debug(JSON.stringify({ success: true, status: 'failed', message: request.t('invitationDeclineFailed') }))
                                                            return response.status(200)
                                                                .send({ success: true, status: 'failed', message: request.t('invitationDeclineFailed') })
                                                        }
                                                    })
                                            } else {
                                                logger.warn(`Failed to decline invitation for ${request.body.email}`)
                                                logger.debug(JSON.stringify({ success: false, status: 'failed', message: request.t('invitationDeclineFailed') }))
                                                return response.status(200)
                                                    .send({ success: false, status: 'failed', message: request.t('invitationDeclineFailed') })
                                            }
                                        })
                                        .catch((err) => {
                                            logger.warn(`Failed to decline invitation for ${request.body.email}`)
                                            logger.error(err)
                                            logger.debug(JSON.stringify({ success: false, status: 'failed', message: request.t('invitationDeclineFailed') }))
                                            return response.status(200)
                                                .send({ success: false, status: 'failed', message: request.t('invitationDeclineFailed') })
                                        })
                                } else {
                                    logger.warn(`Failed to decline invitation for ${request.body.email} due to invalid token`)
                                    logger.debug(JSON.stringify({ success: false, status: 'invalid-token', message: request.t('invitationDeclineFailedInvalidToken') }))
                                    return response.status(200)
                                        .send({ success: false, status: 'invalid-token', message: request.t('invitationDeclineFailedInvalidToken') });
                                }
                            } else {
                                logger.warn(`Failed to decline invitation for ${request.body.email} due to expired invitation`)
                                logger.debug(JSON.stringify({ success: false, status: 'expired', message: request.t('invitationExpired') }))
                                return response.status(200)
                                    .send({ success: false, status: 'expired', message: request.t('invitationExpired') });
                            }
                        } else if (invitationData.status == 'Declined') {
                            logger.warn(`Failed to decline invitation for ${request.body.email} due to declined invitation`)
                            logger.debug(JSON.stringify({ success: false, status: 'declined', message: request.t('invitationDeclined') }))
                            return response.status(200)
                                .send({ success: false, status: 'declined', message: request.t('invitationDeclined') });
                        } else if (invitationData.status == 'Registered') {
                            logger.warn(`Failed to decline invitation for ${request.body.email} due to registered invitation`)
                            logger.debug(JSON.stringify({ success: false, status: 'registered', message: request.t('accountAlreadyRegistered') }))
                            return response.status(200)
                                .send({ success: false, status: 'registered', message: request.t('accountAlreadyRegistered') });
                        }
                    } else {
                        logger.warn(`Failed to decline invitation for ${request.body.email} due to invalid invitation`)
                        logger.debug(JSON.stringify({ success: false, status: 'invalid', message: request.t('invalidInvitation') }))
                        return response.status(200)
                            .send({ success: false, status: 'invalid', message: request.t('invalidInvitation') });
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to decline invitation for ${request.body.email} due to invalid invitation`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, status: 'invalid', message: request.t('invalidInvitation') }))
                    return response.status(200)
                        .send({ success: false, status: 'invalid', message: request.t('invalidInvitation') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async getUserDetailsForAdmin(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (request.params.userId) {
            logger.info(`Fetching user details for user ID ${request.params.userId}`)
            user.getUserDetailsById(request.params.userId)
                .then((userData) => {
                    user.getCompanyRole(request.params.userId)
                        .then(async(roleData) => {
                            if(!userData.language || userData.language == null){
                            userData = { ...userData, language: 'en'}
                            }
                            const userD = await knex("users").select("password").where({id:userData.id})
                            userData = { ...userData, role: roleData.role }
                            const user ={
                              id: userData.id,
                              firstname: userData.firstname,
                              lastname: userData.lastname,
                              email: userData.email,
                              role: userData.role, 
                              mobileCountryCode:userData.mobileCountryCode,
                              mobileNumber:userData.mobileNumber ,
                              avatarUrl:userData.avatarUrl ,
                              passwordSet:userD[0].password.length>0 ,
                              language: userData.language,   
                              accountVerified: userData.accountStatus,
                              accountLocked:userData.accountLockStatus ,
                              accountBlocked:userData.accountBlocked ,
                              twoFactorEnabled: userData.twoFactorEnabled,
                              userCloudIntegrationWeb:userData.userCloudIntegration,
                              userCloudIntegrationMob:userData.userCloudIntegrationMob, 
                              created:userData.created,
                            }                                
                            logger.info(`User details successfully fethced for ${request.params.userId}`)
                            logger.debug(JSON.stringify({ success: true, message: request.t('adminUserDetailFetchSuccess'), userData:user }))
                            return response.status(200)
                                .send({ success: true, message: request.t('adminUserDetailFetchSuccess'), userData:user });
                        
                            }).catch((err) => {
                            logger.warn(`User details successfully fethced but failed to fetch role data for ${request.params.userId}`)
                            logger.error(err)
                            userData = { ...userData, role: '3' }
                            logger.debug(JSON.stringify({ success: true, message: request.t('adminUserDetailFetchFailed1'), userData }))
                            return response.status(200)
                                .send({ success: true, message: request.t('adminUserDetailFetchFailed1'), userData });

                            })
                        .catch((err) => {
                            logger.warn(`User details successfully fethced but failed to fetch role data for ${request.params.userId}`)
                            logger.error(err)
                            userData = { ...userData, role: '3' }
                            logger.debug(JSON.stringify({ success: true, message: request.t('adminUserDetailFetchFailed1'), userData }))
                            return response.status(200)
                                .send({ success: true, message: request.t('adminUserDetailFetchFailed1'), userData });
                        })
                })
                .catch((err) => {
                    logger.warn(`Failed to fetch user details for user ID ${request.params.userId}`)
                    logger.debug(JSON.stringify({ success: false, message: request.t('adminUserDetailFetchFailed2') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('adminUserDetailFetchFailed2') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async getUserDetailsForSuperAdmin(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (request.body.userId) {
            logger.info(`Fetching user details for user ID ${request.body.userId}`)
            user.getUserDetailsById(request.body.userId)
                .then((userData) => {
                    userData = { ...userData, role: '4' }
                    return response.status(200)
                })
                .catch((err) => {
                    logger.warn(`Failed to fetch user details for user ID ${request.body.userId}`)
                    logger.debug(JSON.stringify({ success: false, message: request.t('adminUserDetailFetchFailed2') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('adminUserDetailFetchFailed2') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async verifyAccountForAdmin(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (request.params.userId) {
            logger.info(`Verifying account for user Id ${request.params.userId}`)
            const data = await user.getUserDetailsById(request.params.userId)
            if(data.accountStatus){
                return response.status(409).send({
                  success: false,
                  error: "conflict",
                  message: "User already Verified"
                })
            }
            user.verifyAccount(request.params.userId)
                .then((res) => {
                    if (res == 1) {
                        logger.info(`Account verification success for ${request.params.userId}`)
                        logger.debug(JSON.stringify({ success: true, message: request.t('accountVerificationSuccess') }))
                        return response.status(200)
                            .send({ success: true, message: request.t('accountVerificationSuccess') });
                    } else {
                        logger.warn(`Account verification failed for ${request.params.userId}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('accountVerificationFailed') }))
                        return response.status(200)
                            .send({ success: false, message: request.t('accountVerificationFailed') });
                    }
                })
                .catch((err) => {
                    logger.warn(`Account verification failed for ${request.params.userId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('accountVerificationFailed') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('accountVerificationFailed') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async update2FAFordmin(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        const userId  = request.params.userId
        if(request.body?.enabled === "true"){
            request.body.enabled =true
        }
        if(request.body?.enabled === "false"){
            request.body.enabled =false
        }
        if(typeof request.body?.enabled !== "boolean"){
            return response.status(400).send({
              success: false,
              error: "bad_request",
              message: "Invalid or missing fields",
              details: [
                {
                  field: "enabled",
                  issue: "This field is required and must be boolean"
                }
              ]
            })
        }
        if (userId) {
            logger.info(`Enabling 2FA for user Id ${userId}`)
            user.update2FA(userId,request.body.enabled)
                .then((res) => {
                    if (res == 'enabled') {
                    logger.info(`2FA enabled for ${userId}`)
                    logger.debug(JSON.stringify({ success: true, message: request.t('2FAEnableSuccess') }))
                    return response.status(200)
                        .send({ success: true, message: request.t('2FAEnableSuccess') });
                }else if(res == 'disabled'){
                    logger.info(`2FA disabled for ${userId}`)
                    logger.debug(JSON.stringify({ success: true, message: request.t('2FADisableSuccess') }))
                    return response.status(200)
                        .send({ success: true, message: request.t('2FADisableSuccess') });
                
                }else if(res == 'already-disabled'){
                    logger.info(`2FA is already disabled for ${userId}`)
                    logger.debug(JSON.stringify({
                      success: false,
                      error: "conflict",
                      message: "Two-factor authentication is already disabled",
                      details: []
                    }))
                    return response.status(409)
                        .send({
                      success: false,
                      error: "conflict",
                      message: "Two-factor authentication is already disabled",
                      details: []
                    });
                }else if(res == 'already-enabled'){
                    logger.info(`2FA is already enabled for ${userId}`)
                    logger.debug(JSON.stringify({
                      success: false,
                      error: "conflict",
                      message: "Two-factor authentication is already enabled",
                      details: []
                    }))
                    return response.status(409)
                        .send({
                      success: false,
                      error: "conflict",
                      message: "Two-factor authentication is already enabled",
                      details: []
                    });
                }else if(res ==0){
                    return response.status(403)
                        .send({
                          success: false,
                          error: "forbidden",
                          message: "Account not verified. Verify account to modify 2FA settings.",
                          "details": []
                        });

                }else{
                    return response.status(500)
                        .send({
                      success: false,
                      error: "server_error",
                      message: "An unexpected error occured",
                      details: []
                    });
                }
                })
                .catch((err) => {
                    console.log(err)
                    logger.warn(`Failed to enable 2FA for ${userId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('2FAEnableFailed') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('2FAEnableFailed') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async disable2FAFordmin(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (request.body.userId) {
            logger.info(`Disabling 2FA for ${request.body.userId}`)
            user.disable2FA(request.body.userId)
                .then((res) => {
                    if (res == 1) {
                        logger.info(`2FA disabled successfully for ${request.body.userId}`)
                        logger.debug(JSON.stringify({ success: true, message: request.t('2FADisableSuccess') }))
                        return response.status(200)
                            .send({ success: true, message: request.t('2FADisableSuccess') });
                    } else {
                        logger.warn(`Failed to disable 2FA for ${request.body.userId}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('2FADisableFailed') }))
                        return response.status(200)
                            .send({ success: false, message: request.t('2FADisableFailed') });
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to disable 2FA for ${request.body.userId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('2FADisableFailed') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('2FADisableFailed') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async userLockAndUnlockOptionForAdmin(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (request.body.userId) {
            request.body.status = request.body.status ? request.body.status : 0
            logger.info(`Changing account status for user Id ${request.body.userId}`)
            user.userLockAndUnlockOptionForAdmin(request.body.userId, request.body.status)
                .then((res) => {
                    if (res == 1) {
                        if (request.body.status == '1') {
                            logger.info(`Account status changed to locked for ${request.body.userId}`)
                            logger.debug(JSON.stringify({ success: true, message: request.t('userAccountLockedSuccess') }))
                            return response.status(200)
                                .send({ success: true, message: request.t('userAccountLockedSuccess') });
                        } else {
                            logger.info(`Account status changed to unlocked for ${request.body.userId}`)
                            logger.debug(JSON.stringify({ success: true, message: request.t('userAccountUnlockedSuccess') }))
                            return response.status(200)
                                .send({ success: true, message: request.t('userAccountUnlockedSuccess') });
                        }
                    } else {
                        logger.warn(`Failed to change the account status for ${request.body.userId}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('userAccountLockFailed') }))
                        return response.status(200)
                            .send({ success: false, message: request.t('userAccountLockFailed') });
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to change the account status for ${request.body.userId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('userAccountLockFailed') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('userAccountLockFailed') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

static async adminUpdatePasswordOptionForUser(request, response) {
    try {
        if (!logger) logger = await createLogger();
        const user = new Users(knex);

        const { userId } = request.params;
        const { newPassword } = request.body;

        // -----------------------------
        //  🔍 Validate Required Fields
        // -----------------------------
        const missingFields = [];
        if (!userId) missingFields.push({ field: "userId", issue: "userId is required" });
        if (!newPassword) missingFields.push({ field: "newPassword", issue: "newPassword is required" });

        if (missingFields.length > 0) {
            logger.debug(JSON.stringify({
                success: false,
                error: "bad_request",
                message: "Invalid or missing fields",
                details: missingFields
            }));

            return response.status(400).send({
                success: false,
                error: "bad_request",
                message: "Invalid or missing fields",
                details: missingFields
            });
        }

        const passwordIssues = [];
        const password = request.body.newPassword;
            
        if (password.length < 8) {
          passwordIssues.push({
            field: "password",
            issue: "Password must be at least 8 characters long"
          });
        }
        
        if (!/[A-Z]/.test(password)) {
          passwordIssues.push({
            field: "password",
            issue: "Password must include at least one uppercase letter"
          });
        }
        
        if (!/[a-z]/.test(password)) {
          passwordIssues.push({
            field: "password",
            issue: "Password must include at least one lowercase letter"
          });
        }
        
        if (!/\d/.test(password)) {
          passwordIssues.push({
            field: "password",
            issue: "Password must include at least one number"
          });
        }
        
        if (!/[!@#$%^&*]/.test(password)) {
          passwordIssues.push({
            field: "password",
            issue: "Password must include at least one symbol (!@#$%^&*)"
          });
        }
        
        if (passwordIssues.length > 0) {
          logger.warn(`Weak password provided for userId ${userId}`);
        
          return response.status(422).send({
            success: false,
            error: "validation_error",
            message: "Validation failed",
            details: passwordIssues.map(issue => ({
              field: "newPassword",
              issue: issue.issue
            }))
          });
        }

        logger.info(`Updating password for userId ${userId}`);

        // -----------------------------
        //  🔍 Validate User Exists (404)
        // -----------------------------
        const userExists = await user.checkIfUserExistById(userId);
        if (!userExists) {
            logger.warn(`Attempted password update for non-existing userId ${userId}`);

            return response.status(404).send({
                success: false,
                error: "not_found",
                message: "Invalid userId provided",
                details: [
                    { field: "userId", issue: "No matching user exists" }
                ]
            });
        }

        // -----------------------------
        //  🔐 Update Password
        // -----------------------------
        const updateResult = await user.updatePassword(userId, newPassword);

        if (updateResult === 1) {
            logger.info(`Password updated successfully for ${userId}`);

            return response.status(200).send({
                success: true,
                message: request.t("adminPasswordUpdateSuccess")
            });
        }

        logger.warn(`Password update failed for ${userId}`);

        return response.status(500).send({
            success: false,
            error: "server_error",
            message: request.t("adminPasswordUpdateFailed")
        });

    } catch (error) {
        console.log(error)
        logger.error(`Unexpected error updating password for ${request.params.userId}`, error);

        return response.status(500).send({
            success: false,
            error: "server_error",
            message: "An unexpected error occurred"
        });
    }
}
    static async UpdateUserAccountStatus(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)
        if (request.params.userId) {
            if(request.body.status == 'block'){
                const current = await user.getUserMetaValue(request.params.userId,"accountBlocked")
                if(current == '1'){
                    return response.status(409).send({
                      success: false,
                      error: "conflict",
                      message: "Account is already blocked"
                    })
                }else{
                  await user.updateUserMeta(request.params.userId,"accountBlocked",1)
                  return response.status(200).send({
                      "success": true,
                      "message": "User account status updated successfully",
                      "status": "blocked",
                      "accountBlocked": true
                    })
                }
            }else if(request.body.status == 'unblock'){
                const current = await user.getUserMetaValue(request.params.userId,"accountBlocked")
                if(current == '0'){
                    return response.status(409).send({
                      success: false,
                      error: "conflict",
                      message: "Account is already unblocked"
                    })
                }else{
                  await user.updateUserMeta(request.params.userId,"accountBlocked",0)
                  return response.status(200).send({
                      "success": true,
                      "message": "User account status updated successfully",
                      "status": "unblocked",
                      "accountBlocked": false
                    })
                }
            }else if(request.body.status == 'lock'){
                const current = await user.getUserMetaValue(request.params.userId,"accountLockStatus")
                if(current == '1'){
                    return response.status(409).send({
                      success: false,
                      error: "conflict",
                      message: "Account is already locked"
                    })
                }else{
                  await user.updateUserMeta(request.params.userId,"accountLockStatus",1)
                  return response.status(200).send({
                      "success": true,
                      "message": "User account status updated successfully",
                      "status": "locked",
                      "accountLocked": true
                    })
                }
            }else if(request.body.status == 'unlock'){
                const current = await user.getUserMetaValue(request.params.userId,"accountLockStatus")
                if(current == '0'){
                    return response.status(409).send({
                      success: false,
                      error: "conflict",
                      message: "Account is already unlocked"
                    })
                }else{
                  await user.updateUserMeta(request.params.userId,"accountLockStatus",0)
                  return response.status(200).send({
                      "success": true,
                      "message": "User account status updated successfully",
                      "status": "unlocked",
                      "accountLocked": false
                    })
                }
            }else{
            return response.status(400).send({
              "success": false,
              "error": "bad_request",
              "message": "Invalid or missing fields",
              "details": [
                {
                  "field": "status",
                  "issue": "Must be one of: lock, unlock, block, unblock"
                }
              ]
            })
        }
            
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing fields",error:"missing_fields",details:[{field:"userId",message:"this field is required"}] });
        }
    }
    // static async UpdateUserAccountStatus(request, response) {
    //     if (!logger) {
    //         logger = await createLogger();
    //     }
    //     const user = new Users(knex)
    //     if (request.params.userId) {
    //         if(request.body.status == 'whitelist'){
    //             logger.info(`Whitelisting account for ${request.params.userId}`)
    //             user.whiteListAccount(request.params.userId)
    //             .then((res) => {
    //                 if (res == 1) {
    //                     logger.info(`Account whitelisted for ${request.params.userId}`)
    //                     logger.debug(JSON.stringify({ success: true, message: request.t('accountWhitelistedSuccess') }))
    //                     return response.status(200)
    //                         .send({ success: true,status: "unblocked",accountBlocked: false, message: "User account status updated successfully" });
    //                 } else {
    //                     logger.warn(`Failed to whitelist account for ${request.params.userId}`)
    //                     logger.debug(JSON.stringify({ success: false, message: request.t('accountWhitelistedFailed') }))
    //                     return response.status(200)
    //                         .send({ success: false, message: request.t('accountWhitelistedFailed') });
    //                 }
    //             })
    //             .catch((err) => {
    //                 logger.warn(`Failed to whitelist account for ${request.params.userId}`)
    //                 logger.error(err)
    //                 logger.debug(JSON.stringify({ success: false, message: request.t('accountWhitelistedFailed') }))
    //                 return response.status(500)
    //                     .send({ success: false, message: "An unexpected error occured" });
    //             })    
    //         }else if(request.body.status == 'block'){
    //             user.blackListAccount(request.params.userId)
    //                 .then((res) => {
    //                     if (res == 1) {
    //                         logger.info(`Account blacklisted for ${request.params.userId}`)
    //                         logger.debug(JSON.stringify({ success: true,status: "blocked",accountBlocked: true, message: "User account status updated successfully" }))
    //                         return response.status(200)
    //                             .send({ success: true,status: "blocked",accountBlocked: true, message: "User account status updated successfully" });
    //                     } else {
    //                         logger.warn(`Failed to blacklist the account for ${request.params.userId}`)
    //                         logger.debug(JSON.stringify({ success: false, message: request.t('accountBlacklistedFailed') }))
    //                         return response.status(200)
    //                             .send({ success: false, message: request.t('accountBlacklistedFailed') });
    //                     }
    //                 })
    //                 .catch((err) => {
    //                     logger.warn(`Failed to blacklist the account for ${request.params.userId}`)
    //                     logger.error(err)
    //                     logger.debug(JSON.stringify({ success: false, message: request.t('accountBlacklistedFailed') }))
    //                     return response.status(200)
    //                         .send({ success: false, message: request.t('accountBlacklistedFailed') });
    //                 })

    //         }else if(request.body.status == 'lock' || request.body.status == 'unlock'){ 
    //             user.userLockAndUnlockOptionForAdmin(request.params.userId, request.body.status)
    //             .then((res) => {
    //                 if (res == 1) {
    //                     if (request.body.status == 'unlock') {
    //                         logger.info(`Account status changed to locked for ${request.params.userId}`)
    //                         logger.debug(JSON.stringify({ success: true, message: request.t('userAccountLockedSuccess') }))
    //                         return response.status(200)
    //                             .send({ success: true,status: "unlocked",accountLocked: false, message: request.t('userAccountUnlockedSuccess') });
    //                     } else {
    //                         logger.info(`Account status changed to unlocked for ${request.params.userId}`)
    //                         logger.debug(JSON.stringify({ success: true, message: request.t('userAccountUnlockedSuccess') }))
    //                         return response.status(200)
    //                             .send({ success: true,status: "locked",accountLocked: true, message: request.t('userAccountLockedSuccess') });
    //                     }
    //                 } else {
    //                     logger.warn(`Failed to change the account status for ${request.params.userId}`)
    //                     logger.debug(JSON.stringify({ success: false, message: request.t('userAccountLockFailed') }))
    //                     return response.status(200)
    //                         .send({ success: false, message: request.t('userAccountLockFailed') });
    //                 }
    //             })
    //             .catch((err) => {
    //                 logger.warn(`Failed to change the account status for ${request.params.userId}`)
    //                 logger.error(err)
    //                 logger.debug(JSON.stringify({ success: false, message: request.t('userAccountLockFailed') }))
    //                 return response.status(200)
    //                     .send({ success: false, message: request.t('userAccountLockFailed') });
    //             })
            
    //     }else{
    //         return response.status(400).send({
    //           "success": false,
    //           "error": "bad_request",
    //           "message": "Invalid or missing fields",
    //           "details": [
    //             {
    //               "field": "status",
    //               "issue": "Must be one of: locked, unlocked, blacklisted, whitelisted"
    //             }
    //           ]
    //         })
    //     }
            
    //     } else {
    //         logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
    //         return response.status(400)
    //             .send({ success: false, message: "Missing parameters, fill all the required fields" });
    //     }
    // }

    static async blackListUserAccount(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (request.body.userId) {
            logger.info(`Blacklisting account for ${request.body.userId}`)
            user.blackListAccount(request.body.userId)
                .then((res) => {
                    if (res == 1) {
                        logger.info(`Account blacklisted for ${request.body.userId}`)
                        logger.debug(JSON.stringify({ success: true, message: request.t('accountBlacklistedSuccess') }))
                        return response.status(200)
                            .send({ success: true, message: request.t('accountBlacklistedSuccess') });
                    } else {
                        logger.warn(`Failed to blacklist the account for ${request.body.userId}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('accountBlacklistedFailed') }))
                        return response.status(200)
                            .send({ success: false, message: request.t('accountBlacklistedFailed') });
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to blacklist the account for ${request.body.userId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('accountBlacklistedFailed') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('accountBlacklistedFailed') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async getSubscriptionDetails(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const subscriptionDefaultPlans = {
            "solo": [
              {
                "subscription_plan": "basic",
                "amount": 776,
                "currency": "INR",
                "billing_cycle": "monthly",
                "max_users": 1,
                "features": [
                  "Single user access",
                  "AI document summaries",
                  "Standard support"
                ],
            },
            ],
                "organization": [
              {
                "subscription_plan": "basic",
                "amount": 2499,
                "currency": "INR",
                "billing_cycle": "monthly",
                "max_users": 10,
                "features": [
                  "Team workspace",
                  "Shared documents",
                  "Role-based access",
                  "Priority support"
                ]
              }
            ]
        }
    

        const user = new Users(knex);

        if (!request.decoded.userId) {
            logger.debug(JSON.stringify({
                success: false,
                message: "Missing parameters, fill all the required fields"
            }));
            return response.status(400).send({
                success: false,
                message: "Missing parameters, fill all the required fields"
            });
        }

        const userId = request.decoded.userId;
        logger.info(`Fetching subscription details for userId ${userId}`);

        try {
            const res = await user.getSubscriptionData(userId);

            if (!res[0] || res[0].length === 0) {
                logger.info(`No subscription data found for userId ${userId}`);
                return response.status(200).send({
                    success: true,
                    subscriptionData: [],
                    paymentMethod: null,
                    paymentHistory: []
                });
            }
            const symbol =
                JSON.parse(process.env.PAYMENT_CURRENCIES)
                  .find(c => c.currency === res[0][0].currency)?.symbol
            const subscriptionData =
            {
                id:res[0][0].id,
                userId: res[0][0].userId,
                subscription_type: res[0][0].subscription_type == "team" ? "organization" : "solo",
                subscription_plan: res[0][0].subscription_plan,
                max_users: res[0][0].max_users,
                subscription_amount:res[0][0].subscription_amount,
                currency: res[0][0].currency,
                currencySymbol:symbol,
                billing_cycle: "monthly",
                payment_status: res[0][0].payment_status,
                subscriptionId: res[0][0].subscriptionId,
                customerId: res[0][0].customerId,
                created: res[0][0].created,
                next_billing_date: res[0][0].next_billing_date,
                deactivated: res[0][0].deactivated
                
            };
            let paymentMethod = null;
            let paymentHistory = [];
            let subscriptionPlans={};

            if (subscriptionData.customerId && subscriptionData.subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(
                subscriptionData.subscriptionId,
                { expand: ["default_payment_method"] }
            );

            subscriptionData.next_billing_date = subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null;
                paymentMethod=JSON.parse(res[0][0].paymentMethod)
                paymentHistory=JSON.parse(res[0][0].paymentHistory)
        }
        subscriptionData.subscription_plan="basic"
        
        if(subscriptionData.subscription_type =='organization'){
            subscriptionPlans.organization=subscriptionDefaultPlans.organization
            subscriptionPlans.organization[0].currency=subscriptionData.currency
            subscriptionPlans.organization[0].amount=subscriptionData.subscription_amount
            subscriptionData.max_users= Number(await getAdminSetting("MAX_USERS"))
        }else{
            subscriptionPlans.solo=subscriptionDefaultPlans.solo;
            subscriptionPlans.solo[0].currency=subscriptionData.currency
            subscriptionPlans.solo[0].amount=subscriptionData.subscription_amount
            subscriptionData.max_users=1;
        }
        if(subscriptionData.payment_status==1){
            subscriptionData.payment_status="active"
        }
        const date = new Date(paymentHistory[0]?.paid_at);
        date.setMonth(date.getMonth() + 1);
        
        subscriptionData.next_billing_date=date
            logger.info(
                `Subscription data fetched successfully for userId ${userId}`
            );

            return response.status(200).send({
                success: true,
                subscriptionData,
                subscriptionPlans,
                paymentMethod,
                paymentHistory
            });
        } catch (err) {
            console.log(err)
            logger.warn(
                `Failed to fetch subscription details for userId ${userId}`
            );
            logger.error(err);

            return response.status(500).send({
                success: false,
                error:"server_error",
                message: "An unexpected error occured"
            });
        }
    }

    static async removeUserPermanently(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (request.params.userId) {
            logger.info(`Account Delete for ${request.params.userId}`)
            const exist =await user.isUserExist(request.params.userId)
            if(!exist){
                return response.status(404).send({ success: false, error: "not_found", message: "User not found" })
            }
            const userCompany = await user.getCompanyIdForUser(request.params.userId)
            if(userCompany !==request.decoded.company ){
                return response.status(404).send({ success: false, error: "not_found", message: "User not found" })
            }
            user.removeUser(
                request.params.userId,
            )
                .then((res) => {
                    if (res == 1) {
                        logger.info(`Account Deleted for ${request.params.userId}`)
                        logger.debug(JSON.stringify({ success: true, message: 'Account Deletion Successful' }))
                        return response.status(200)
                            .send({ success: true, message: 'Account Deletion Successful.' });

                    } else {
                        logger.warn(`Account Deletion Failed for ${request.params.userId}`)
                        logger.debug(JSON.stringify({ success: false, message: 'Account Deletion Failed' }))
                        return response.status(200)
                            .send({ success: false, message: 'Account Deletion Failed' });
                    }
                })
                .catch((err) => {
                    logger.warn(`Account Deletion Failed for ${request.params.userId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: 'Account Deletion Failed' }))
                    return response.status(200)
                        .send({ success: false, message: 'Account Deletion Failed' });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static async getUserDynamicRoles(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        user.getUserRoles()
            .then((roleData) => {
                logger.debug(JSON.stringify("Role data fetched successfully"))
                return response.status(200)
                    .send({ success: true, roleData: roleData });
            })
            .catch((err) => {
                logger.error(`Error getting roles for user data: ${err}`);
                return response.status(200).json({ success: false, message: "Failed to fetch role data" });
            })
    }

    static async getClientsforSuperAdmin(request, response) {
    try {
        if (!logger) {
            logger = await createLogger();
        }

        const user = new Users(knex);
        logger.info("Fetching clients for super admin");

        const users = await user.getUserDetailsforSuperAdmin();

        if (!users?.length) {
            logger.warn("No subscriptions found for Super Admin");
            return response.status(200).send({
                success: true,
                message: "No subscriptions found for Super Admin",
                clientDetails: []
            });
        }

        const clientDetails = await Promise.all(
            users.map(async (userDetails) => {
                try {
                    const userId = userDetails.id;

                    const [
                        metaData,
                        subscriptionDetails,
                        invitationDetails,
                        roleDetails
                    ] = await Promise.all([
                        user.getUserMetaDetails(userId),
                        user.getSubscriptionData(userId),
                        user.getInvitaionDetailsforSuperAdmin(userId),
                        user.getCompanyRole(userId)
                    ]);

                    // Skip invited users
                    // if (invitationDetails?.[0]?.userId === userId) {
                    //     return null;
                    // }

                    let company = null;
                    
                    const companyData = roleDetails?.company
                        ? await user.getCompanyDetails(roleDetails.company)
                        : {};
                        if(metaData.accountType!="solo"){
                            company=companyData
                    }
                    return {
                        user: {
                            id: userDetails.id,
                            firstname: userDetails.firstname,
                            lastname: userDetails.lastname,
                            email: userDetails.email,
                            mobileCountryCode: userDetails.mobileCountryCode,
                            mobileNumber: userDetails.mobileNumber,
                            accountStatus: userDetails.accountStatus,
                            created: userDetails.created,
                            avatarUrl: metaData?.avatarUrl,
                            twoFactorEnabled: metaData?.twoFactorEnabled,
                            accountBlocked: metaData?.accountBlocked,
                            accountLockStatus: metaData?.accountLockStatus,
                            accountType: metaData?.accountType,
                            language: metaData?.language || companyData?.language,
                            role: roleDetails.role
                        },
                        company,
                        integrationDetails: {
                            userCloudIntegration: metaData?.userCloudIntegration,
                            userCloudIntegrationMob: metaData?.userCloudIntegrationMob,

                            web: {
                                GoogleDrive: metaData?.GoogleDrive === '1',
                                Dropbox: metaData?.Dropbox === '1',
                                OneDrive: metaData?.OneDrive === '1',
                                Slack: metaData?.Slack === '1',
                                Wordpress: metaData?.Wordpress === '1'
                            },

                            mobile: {
                                GoogleDrive: metaData?.GoogleDrive_M === '1',
                                Dropbox: metaData?.Dropbox_M === '1',
                                OneDrive: metaData?.OneDrive_M === '1',
                                Slack: metaData?.Slack_M === '1',
                                Wordpress: metaData?.Wordpress_M === '1'
                            }
                        }
                    };
                } catch (err) {
                    console.log(err)
                    logger.error(`Error processing user ID ${userDetails.id}`, err);
                    return null;
                }
            })
        );
        const filteredClients = clientDetails.filter(Boolean);

        logger.info("Clients fetched successfully for super admin");
        return response.status(200).send({
            success: true,
            message: "Successfully fetched client details",
            clientDetails: filteredClients
        });

    } catch (error) {
        logger.error("Failed to fetch client details for Super Admin", error);
        return response.status(500).send({
            success: false,
            error:"server_error",
            message: "An unexpected error occured"
        });
    }
}

static async getCompaniesforSuperAdmin(request, response) {
    try {
        if (!logger) {
            logger = await createLogger();
        }

        const user = new Users(knex);
        logger.info("Fetching companies for super admin");

        // Fetch company id + adminId
        const companies = await knex("companies").select("id", "adminId");

        if (!companies.length) {
            return response.status(200).send({
                success: true,
                companiesData: []
            });
        }

        const companiesData = await Promise.all(
            companies.map(async ({ id, adminId }) => {
                try {
                    const companyDetails = await user.getCompanyDetails(id);
                     if (companyDetails?.orgType === null) {
                        return null;
                    }

                    let integrationDetails = null;

                    if (adminId) {
                        const metaData = await user.getUserMetaDetails(adminId);

                        integrationDetails = {
                            userCloudIntegration: metaData?.userCloudIntegration ,
                            userCloudIntegrationMob: metaData?.userCloudIntegrationMob ,

                            web: {
                                GoogleDrive: metaData?.GoogleDrive === '1',
                                Dropbox: metaData?.Dropbox === '1',
                                OneDrive: metaData?.OneDrive === '1',
                                Slack: metaData?.Slack === '1',
                                Wordpress: metaData?.Wordpress === '1'
                            },

                            mobile: {
                                GoogleDrive: metaData?.GoogleDrive_M === '1',
                                Dropbox: metaData?.Dropbox_M === '1',
                                OneDrive: metaData?.OneDrive_M === '1',
                                Slack: metaData?.Slack_M === '1',
                                Wordpress: metaData?.Wordpress_M === '1'
                            }
                        };
                    }

                    return {
                        ...companyDetails,
                        integrationDetails: integrationDetails
                    };
                } catch (err) {
                    logger.error(`Error processing company ID ${id}`, err);
                    return null;
                }
            })
        );

        const filteredCompanies = companiesData.filter(Boolean);

        logger.info("Companies fetched successfully for super admin");
        return response.status(200).send({
            success: true,
            message: "Successfully fetched companies",
            companies: filteredCompanies
        });

    } catch (error) {
        logger.error("Failed to fetch companies for super admin", error);
        return response.status(200).send({
            success: false,
            message: "Failed to fetch companies"
        });
    }
}



    //     static async getCompaniesforSuperAdmin(request, response) {
    //     if (!logger) {
    //         logger = await createLogger();
    //     }
    //     const user = new Users(knex)

    //     logger.info(`Fetching companies for super admin`);
    //     user.getUserDetailsforSuperAdmin()
    //         .then((res) => {
    //             if (res.length > 0) {
    //                 logger.info(`Fetching all client details for super admin`);
    //                 const userIds = res.map(user => user.id);
    //                 const userDetailsPromises = userIds.map(userId => {
    //                     try {
    //                         return user.getUserMetaDetails(userId)
    //                             .then(async (metaData) => {
    //                                 const userDetails = res.find(user => user.id === userId);
    //                                 const subscriptionDetails = await user.getSubscriptionData(userId);

    //                                 const invitationDetails = await user.getInvitaionDetailsforSuperAdmin(userId);

    //                                 const roleDetails = await user.getCompanyRole(userId);

    //                                 const companyDetails = await user.getCompanyDetails(roleDetails?.company);

    //                                 if (userDetails.id !== invitationDetails[0]?.userId) {





    //                                     // const userData = { user:{...userDetails,...metaData}, 
    //                                     // ...subscriptionDetails[0], roleDetails, company:{...companyDetails} };
    //                                     const userData = {user:{
    //                                         id: userDetails.id,
    //                                         firstname: userDetails.firstname,
    //                                         lastname: userDetails.lastname,
    //                                         email: userDetails.email,
    //                                         mobileCountryCode: userDetails.mobileCountryCode,
    //                                         mobileNumber: userDetails.mobileNumber,
    //                                         accountStatus: userDetails.accountStatus,
    //                                         createdAt: userDetails.createdAt,
    //                                         avatarUrl: metaData.avatarUrl,
    //                                         twoFactorEnabled: metaData.twoFactorEnabled,
    //                                         accountBlocked: metaData.accountBlocked,
    //                                         accountLockStatus: metaData.accountLockStatus,
    //                                         accountType: metaData.accountType,
    //                                         language: metaData.language || companyDetails.language
    //                                     },
    //                                     // company:{
    //                                     //   companyId: companyDetails.companyId,
    //                                     //   companyName: companyDetails.companyName,
    //                                     //   orgType: companyDetails.orgType,
    //                                     //   companyLogo: companyDetails.companyLogo,
    //                                     //   companytwoFactorEnabled: companyDetails.companytwoFactorEnabled,
    //                                     //   language:companyDetails.language,
    //                                     //   mailingAddress: companyDetails.mailingAddress,
    //                                     //   billingAddress: companyDetails.billingAddress,
    //                                     //   phoneNumber: companyDetails.phoneNumber,
    //                                     //   phoneNumberCountryCode: companyDetails.phoneNumberCountryCode
    //                                     // },
    //                                     role: {
    //                                            roleId: roleDetails.id,
    //                                            role: roleDetails.role,
    //                                            company: roleDetails.company,
    //                                            createdAt: roleDetails.createdAt,
    //                                            updatedAt: roleDetails.updatedAt
    //                                          },
    //                                       integrationDetails: {
    //                                         userCloudIntegration: metaData.userCloudIntegration =='1'? true:false,
    //                                         userCloudIntegrationMob: metaData.userCloudIntegrationMob =='1'? true:false,

    //                                           web: {
    //                                             GoogleDrive: metaData.GoogleDrive =='1'? true:false,
    //                                             Dropbox: metaData.Dropbox =='1'? true:false,
    //                                             OneDrive: metaData.OneDrive =='1'? true:false,
    //                                             Slack: metaData.Slack =='1'? true:false,
    //                                             Wordpress: metaData.Wordpress =='1'? true:false
    //                                           },
                                          
    //                                           mobile: {
    //                                              GoogleDrive: metaData.GoogleDrive_M =='1'? true:false,
    //                                               Dropbox: metaData.Dropbox_M =='1'? true:false,
    //                                               OneDrive: metaData.OneDrive_M =='1'? true:false,
    //                                               Slack: metaData.Slack_M =='1'? true:false,
    //                                               Wordpress: metaData.Wordpress_M =='1'? true:false
    //                                             }
    //                                     }
    //                                 }
    //                                     return userData;
    //                                 } else {
    //                                     return null;
    //                                 }
    //                             })
    //                     } catch (error) {

    //                         logger.info(`Error processing user details for user ID`);
    //                         console.error(`Error processing user details for user ID ${userId}: ${error}`);
    //                         return null;
    //                     }
    //                 });

    //                 Promise.all(userDetailsPromises)
    //                     .then((userDetailsArray) => {
    //                         const filteredUserDetailsArray = userDetailsArray.filter(userDetails => userDetails !== null);
    //                         logger.info(`Clients are fetched for super admin`);
    //                         return response.status(200).send({
    //                             success: true,
    //                             message: "Successfully fetched client details",
    //                             clientDetails: filteredUserDetailsArray
    //                         });
    //                     })
    //                     .catch((error) => {
    //                         console.log(error)
    //                         logger.warn(`Failed to fetch client details`)
    //                         console.error(`Error fetching user details: ${error}`);
    //                         logger.debug(JSON.stringify({ success: false, message: "Error fetching client details" }))
    //                         return response.status(200)
    //                             .send({ success: false, message: "Failed to fetch client details" });
    //                     });
    //             } else {
    //                 logger.warn(`No subscriptions found for Super Admin`)
    //                 return response.status(200).send({
    //                     success: true,
    //                     message: "No subscriptions found for Super Admin",
    //                     clientDetails: []
    //                 });
    //             }
    //         })
    //         .catch((err) => {
    //             logger.warn(`Failed to fetch subscription details for Super Admin`)
    //             logger.error(err)
    //             logger.debug(JSON.stringify({ success: false, message: "Failed to fetch subscription details" }))
    //             return response.status(200)
    //                 .send({ success: false, message: "Failed to fetch subscription details" });
    //         })
    // }

    static async getUserInvitedDetailsforSuperAdmin(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        logger.info(`Fetching invited users for super admin`);
        if (request.body.companyId) {
            user.getCompanyUsers(request.body.companyId)
                .then((res) => {
                    const userIds = res.map(user => user.userId);
                    const usersDetailsPromises = userIds.map(userId => {
                        return user.getUserInvitedDetailforSuperAdmin(userId)
                            .then(async (userData) => {
                                const userRoles = await user.getCompanyRole(userId)
                                const userRole = userRoles?.role
                                return { ...userData, userRole };
                            })
                    });

                    Promise.all(usersDetailsPromises)
                        .then((userDetailsArray) => {
                            logger.info(`Invited users are fetched for super admin`);
                            return response.status(200).send({
                                success: true,
                                userDetails: userDetailsArray
                            });
                        })
                        .catch((error) => {
                            logger.error(`Failed to fetch client details`, error)
                            return response.status(200)
                                .send({ success: false, message: "Failed to fetch user details" });
                        });
                })
        } else {
            logger.warn(`No invited users for super admin`)
        }
    }

    static async createAccountForSuperUser(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (
            request.body.firstname &&
            request.body.lastname &&
            request.body.email &&
            request.body.mobileCountryCode &&
            request.body.mobileNumber &&
            request.body.password &&
            request.body.companyId &&
            request.body.role
        ) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: { ...request.body, password: '**********' },
                headers: request.headers
            }
            logger.debug(JSON.stringify(debugData))
            logger.info(`Creating account for super user ${request.body.email}`)
            user.checkIfUserExist(request.body.email)
                .then(async (res) => {
                    if (res.length > 0) {
                        logger.warn(`Account already exists for ${request.body.email}`)
                        return response.status(409)
                                    .send({ success: false,error:"conflict", message: `Email is already registered`,details:{email:request.body.email} });
                    } else {
                        user.getCompanyDetails(request.body.companyId)
                            .then((companyData) => {
                                if (companyData) {
                                    user.createNewAccountForSuperUser(
                                        request.body.firstname,
                                        request.body.lastname,
                                        request.body.email,
                                        request.body.mobileCountryCode,
                                        request.body.mobileNumber,
                                        request.body.password,
                                        companyData.companytwoFactorEnabled,
                                        request.body.companyId,
                                        request.body.role
                                    )
                                        .then((res) => {
                                            const { userId } = res
                                            user.getUserDetailsById(userId)
                                                .then((data) => {
                                                    let userData = data
                                                    userData = { ...userData, ...companyData }
                                                    user.getCompanyRole(userData.id)
                                                        .then(async(roleData) => {
                                                            const accessPayload = {
                                                userId: userData.id,
                                                firstname: userData.firstname,
                                                lastname: userData.lastname,
                                                email: userData.email,
                                                role: roleData.role,
                                                company: roleData.company
                                            };

                                            const refreshPayload = { 
                                                userId: userData.id 
                                            };
                                            const accessToken = UsersController.createAccessToken(accessPayload);
                                            const refreshToken = UsersController.createRefreshToken(refreshPayload);
                                            const refreshTokenDecoded = jwt.decode(refreshToken);
                                            const refreshTokenExpiresAt = new Date(refreshTokenDecoded.exp * 1000);
                                            await knex('user_tokens').insert({
                                                userId,
                                                refresh_token: refreshToken,
                                                expires_at: refreshTokenExpiresAt
                                            });
                                                            let _auth = {
                                                                 auth: {
                                                    accessToken,
                                                    refreshToken,
                                                    expiresIn:3600,
                                                    refreshTokenExpiresAt
                                                },
                                                            }
                                                            userData = { ...userData, ..._auth, role: roleData.role }
                                                            user.getUserDetailsById(userId)
                                                                .then(async (senderData) => {
                                                                    user.getMailTemplate(10)
                                                                        .then(async (data) => {
                                                                            let subject = data[0].subject
                                                                            let html = data[0].template 
                                                                            html = html.replace("{{name}}", senderData.firstname)
                                                                            html = html.replace("{{email}}", request.body.email)
                                                                            var { transporter, mailingAddress } = await emailTransporter()
                                                                            var mailOptions2 = {
                                                                                from: mailingAddress,
                                                                                to: senderData.email,
                                                                                subject: subject,
                                                                                html
                                                                            };
        
                                                                            transporter.sendMail(mailOptions2, function (error, info) {
                                                                                if (error) {
                                                                                    logger.error(error.message)
                                                                                }
                                                                                logger.info(`Acceptance mail sent to super sender ${senderData.email}`)
                                                                            });
                                                                        })
                                                                })

                                                            logger.info(`Account created for ${request.body.email}`)
                                                            logger.debug(JSON.stringify({ success: true, message: request.t('Authentication success'), userData, twoFactorEnabled: companyData.twoFactorEnabled }))
                                                            return response.status(200)
                                                                .send({ success: true, message: request.t('Authentication success'), userData, twoFactorEnabled: companyData.twoFactorEnabled });
                                                        })
                                                })
                                                .catch((err) => {
                                                    logger.warn(`Account creation failed for ${request.body.email}`)
                                                    logger.error(err)
                                                    logger.debug(JSON.stringify({ success: false, message: request.t('accountCreationFailed') }))
                                                    return response.status(200)
                                                        .send({ success: false, message: request.t('accountCreationFailed') })
                                                })
                                        })
                                        .catch((err) => {
                                            logger.warn(`Account creation failed for ${request.body.email}`)
                                            logger.error(err)
                                            logger.debug(JSON.stringify({ success: false, message: request.t('accountCreationFailed') }))
                                            return response.status(200)
                                                .send({ success: false, message: request.t('accountCreationFailed') })
                                        })
                                } else {
                                    logger.warn(`Account creation failed for ${request.body.email} due to invalid company`)
                                    logger.debug(JSON.stringify({ success: false, message: request.t('accountCreationFailedInvalidCompany') }))
                                    return response.status(200)
                                        .send({ success: false, message: request.t('accountCreationFailedInvalidCompany') })
                                }
                            })
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                    logger.error(err)
                    return response.status(500)
                        .send({ success: false, error:"server_error", message: "An unexpected error occured" });
                })
        }
    }

    static getSuperEmail(request, response) {
        return response.status(200)
            .send({ success: true, superEmail: process.env.SUPER_ADMIN_EMAIL_DOMAIN_NAME });
    }

    static async removeSuperUserPermanently(request, response) {
        if (!logger) {
            logger = await createLogger();
        }
        const user = new Users(knex)

        if (request.body.userId && request.body.companyId) {
            logger.info(`Account Delete for ${request.body.userId}`)

            const userCountWithRole = await knex("companies")
                .count("*")
                .where({ id: request.body.companyId, adminId: request.body.userId })
                .first();

            if (userCountWithRole.count == 0) {
                logger.info(`Account Delete for ${request.body.userId} shared company details.`)

                user.removeSuperUser(
                    request.body.userId,
                )
                    .then((res) => {
                        if (res == 1) {
                            logger.info(`Account Deleted for ${request.body.userId}`)
                            logger.debug(JSON.stringify({ success: true, message: 'Account Deletion Successful' }))
                            return response.status(200)
                                .send({ success: true, message: 'Account Deletion Successful.' });

                        } else {
                            logger.warn(`Account Deletion Failed for ${request.body.userId}`)
                            logger.debug(JSON.stringify({ success: false, message: 'Account Deletion Failed' }))
                            return response.status(200)
                                .send({ success: false, message: 'Account Deletion Failed' });
                        }
                    })
                    .catch((err) => {
                        logger.warn(`Account Deletion Failed for ${request.body.userId}`)
                        logger.error(err)
                        logger.debug(JSON.stringify({ success: false, message: 'Account Deletion Failed' }))
                        return response.status(200)
                            .send({ success: false, message: 'Account Deletion Failed' });
                    })
            } else {
                logger.info(`Account Delete for ${request.body.userId} non shared company details.`)

                const newUserIdObject = await knex("user_company_role_relationship")
                    .select("userId")
                    .where({ company: request.body.companyId, role: 4 })
                    .whereNot({ userId: request.body.userId })
                    .first();

                if (!newUserIdObject) {
                    console.log("Do not delete. There's only one Administrator.")
                }

                const newUserId = newUserIdObject.userId;

                await knex("companies")
                    .where({ id: request.body.companyId })
                    .update({ adminId: newUserId })
                    .then(() => {
                        user.removeSuperUser(
                            request.body.userId,
                        )
                            .then((res) => {
                                if (res == 1) {
                                    logger.info(`Account Deleted for ${request.body.userId}`)
                                    logger.debug(JSON.stringify({ success: true, message: 'Account Deletion Successful' }))
                                    return response.status(200)
                                        .send({ success: true, message: 'Account Deletion Successful.' });

                                } else {
                                    logger.warn(`Account Deletion Failed for ${request.body.userId}`)
                                    logger.debug(JSON.stringify({ success: false, message: 'Account Deletion Failed' }))
                                    return response.status(200)
                                        .send({ success: false, message: 'Account Deletion Failed' });
                                }
                            })
                            .catch((err) => {
                                logger.warn(`Account Deletion Failed for ${request.body.userId}`)
                                logger.error(err)
                                logger.debug(JSON.stringify({ success: false, message: 'Account Deletion Failed' }))
                                return response.status(200)
                                    .send({ success: false, message: 'Account Deletion Failed' });
                            })
                    })
            }
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }
}

module.exports = UsersController