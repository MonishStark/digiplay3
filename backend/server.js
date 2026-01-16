(async()=>{

const express = require("express");
const app = express();
const parser = require("body-parser");
const useragent = require('express-useragent');
const multer = require("multer");
const usersRoute = require("./app/routes/user");
const teamRoute = require("./app/routes/team");
const documentRoute = require("./app/routes/document");
const chatRoute = require("./app/routes/chat");
const superAdminRoute = require("./app/routes/superAdmin");
const appdataRoute = require("./app/routes/appdata");
const auth = require("./app/middleware/authenticate");
const Users = require("./app/services/Users");
const Documents = require("./app/services/Documents");
const Team = require("./app/services/Team");
const Notification = require("./app/services/Notification");
const Chat = require("./app/services/Chat");
const PDFExtractor = require("./app/services/PDFExtractor");
const { loadDataToRedis, getAdminSetting } = require("./app/init/redisUtils");
const { emailTransporter } = require("./app/init/emailTransporter");
const path = require("path");
const fs = require("fs");
var fs2 = require("fs").promises;
const i18next = require("i18next");
const Backend = require("i18next-fs-backend");
const i18nextMiddleware = require("i18next-http-middleware");
const nfetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const mime = require('mime-types');
const winston = require("winston");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { summarizer } = require("./app/init/summarizer");
const { combine, timestamp, json } = winston.format;
const {
  imageSummary,
  audioSummary,
  videoSummary,
} = require("./app/init/description");
const dotenv = require("dotenv");
const axios = require("axios");
const redis = require("./app/init/redisClient");
const Bull = require("bull");
const cron = require("node-cron");
const querystring = require('querystring');
const rateLimit = require('express-rate-limit');
const { google } = require('googleapis');
const { Storage } = require('@google-cloud/storage');
dotenv.config();
const { createLogger } = require('./app/init/logger');
i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    backend: {
      loadPath: __dirname + "/resources/locales/{{lng}}/{{ns}}.json",
    },
    fallbackLng: "en",
    preload: ["en"],
  });

const knex = require("knex")({
  client: "mysql",
  connection: {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER_NAME,
    password: process.env.DATABASE_PASSWORD
      ? process.env.DATABASE_PASSWORD
      : "",
    database: process.env.DATABASE_NAME,
    charset: "utf8mb4",
    collation: "utf8mb4_unicode_ci",
  },
});
const  logger = await createLogger();
const  {v4}  = require('uuid');

const fileUploadRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1-minute window
    max: process.env.FILE_UPLOAD_RATE_LIMIT || 10, // Limit each user requests per windowMs
    keyGenerator: (req) => req.decoded.userId, // Use user ID from verified token
    message: {
      status: 429,
      error: 'Too many requests, please wait and try again later.',
    },
    standardHeaders: true, // Include rate limit headers in responses
    legacyHeaders: false,  // Disable the deprecated X-RateLimit-* headers
    handler: (req, res) => {
      // Custom handler for rate limit exceeded
      console.log("limiter file upload")
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Only ${process.env.FILE_UPLOAD_RATE_LIMIT} uploads allowed per minute.`,
      });
    },
  });

const userAvatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `${process.env.BACKEND_PATH}/uploads/userAvatars`);
  },
  filename: function (req, file, cb) {
    const fileName =
      req.decoded.userId +
      "-" +
      Math.round(Math.random() * 1e5) +
      path.extname(file.originalname);
    req.fileName = fileName;
    cb(null, fileName);
  },
});

const userAvatarUpload = multer({ storage: userAvatarStorage });

const companyLogosStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `${process.env.BACKEND_PATH}/uploads/companyLogos`);
  },
  filename: function (req, file, cb) {
    const fileName =
      req.params.companyId +
      "-" +
      Math.round(Math.random() * 1e5) +
      path.extname(file.originalname);
    req.fileName = fileName;
    cb(null, fileName);
  },
});

const companyLogoUpload = multer({ storage: companyLogosStorage });

const documentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const team = new Team(knex);
    const documents = new Documents(knex);
    
    const teamId = req.body?.teamId || req.params.teamId;
    if (!teamId) {
      return cb(new Error("teamId is required"));
    }

    team.getTeamUUID(teamId)
      .then((uuid) => {
        req.uuid = uuid;
        req.filePath = path.resolve(`${process.env.DOCUMENT_PATH}/${uuid}`);
        cb(null, `${process.env.BACKEND_PATH}/documents/${uuid}`);
      })
      .catch(err => cb(err)); 
  },
  filename: function (req, file, cb) {
    if (!file.originalname) {
      return cb(new Error("File original name is missing"));
    }

    let parentId = req.body?.parentFolderId;

    if (!parentId || parentId === "null") {
      parentId = 4;
    }
    const teamId = req.params.teamId || req.body.teamId;
    const source = req.query.source || req.body.source || 'Upload';

    const documents = new Documents(knex);

    documents.createFile(file.originalname, parentId, teamId, source)
      .then((fileId) => {
        const fileName = fileId + path.extname(file.originalname);

        req.originalName = file.originalname;
        req.fileName = fileId;
        req.fileFullName = fileName;

        cb(null, fileName);
      })
      .catch(err => cb(err));
  }
});

const documentUpload = multer({ storage: documentStorage });

const audioStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const team = new Team(knex);
    team.getTeamUUID(req.params.teamId)
      .then((uuid) => {
        req.filePath = path.resolve(`${process.env.DOCUMENT_PATH}/${uuid}`);
        cb(null, `${process.env.BACKEND_PATH}/documents/${uuid}`);
      })
      .catch(err => cb(err));
  },
  filename: function (req, file, cb) {
    if (!req.body.fileName) {
      return cb(new Error("fileName is required"));
    }
    let parentId = req.body?.parentFolderId;

    if (!parentId || parentId === "null") {
      parentId = 4;
    }
    const documents = new Documents(knex);
    documents.createFile(
      req.body.fileName,
      parentId,
      req.params.teamId,
      'Local uploads' 
    )
    .then((fileId) => {
      console.log("request body in audio",req.body)
      const fileName = fileId + path.extname(req.body.fileName);
      req.fileName = fileId;
      req.fileFullName = fileName;
      cb(null, fileName);
    })
    .catch(err => cb(err));
  }
});

const audioUpload = multer({ storage: audioStorage });

app.use(i18nextMiddleware.handle(i18next));
app.use(useragent.express());

let credentials;
try {
  credentials = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
} catch (error) {
  logger.info("error getting credentials");
  logger.info(error);
}

let storage;
try {
  storage = new Storage({ credentials });
} catch (error) {
  logger.info("error initializing storage")
  logger.info(error)
}

const sanitizeForLog = (value) => {
  if (typeof value === "string") {
    // Remove line breaks & unwanted characters
    return value.replace(/[\r\n]/g, "").replace(/[^a-zA-Z0-9-_.@ ]/g, "");
  } 
  if (typeof value === "object" && value !== null) {
    const sanitized = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        sanitized[key] = sanitizeForLog(value[key]); // Recursively sanitize
      }
    }
    return sanitized;
  }
  return value ?? ""; // Return empty string if null/undefined
};
async function updateGoogleAvatarUrl(knex, email, avatarUrl) {
  const user = new Users(knex);
  try {
    logger.info(`Uploading Google Image for ${sanitizeForLog(email)}`);

    const imageResponse = await axios.get(avatarUrl, {
      responseType: "arraybuffer",
    });

    const imageBuffer = Buffer.from(imageResponse.data, "binary");
    const fileName = `${email}_${Date.now()}.jpg`;

    fs.writeFileSync(
      `${process.env.BACKEND_PATH}/uploads/userAvatars/${fileName}`,
      imageBuffer
    );

    const userIdResult = await user.getUserIdByEmail(email);
    const userId = userIdResult[0][0]?.id;

    logger.info(`Updating user meta for ${userId}`);

    const updateResult = await user.updateUserMeta(userId, "avatarUrl", fileName);

    if (updateResult[0].affectedRows == 1) {
      logger.info(`Google profile image updated SUCCESS for ${email}`);
      return { success: true };
    }

    throw new Error("Database update failed");
  } catch (err) {
    logger.error(`Google profile image update ERROR for ${email} : ${err.message}`);
    return { success: false, error: err.message };
  }
}
app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    const sig = request.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        sig,
        process.env.STRIPE_ENDPOINT_SECRET
      );
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    response.send();

    const metadata = event.data.object.metadata || {};
    const user = new Users(knex);
    switch (event.type) {
      case "checkout.session.completed":
        const charges = await stripe.charges.list({
          invoice: event.data.object.invoice,
          limit: 1
        });
        const invoices = await stripe.invoices.list({
          subscription: event.data.object.subscription,
          limit: 10
        });
        const paymentHistory = invoices.data.map(inv => ({
          id: inv?.id,
          amount: inv?.amount_paid/100,
          currency: inv?.currency?.toUpperCase(),
          status: inv?.status,
          billing_cycle: "monthly",
          paid_at: new Date(inv?.status_transitions?.paid_at * 1000).toISOString(),
          invoice_url: inv?.hosted_invoice_url
        }));

        if (metadata.accountType == "solo" && metadata.signUpMethod == "email") {
          user
            .createNewUser(
              metadata.firstname,
              metadata.lastname,
              metadata.email,
              metadata.mobileCountryCode,
              metadata.mobileNumber,
              metadata.password,
              metadata.accountType,
              "1",
              metadata.signUpMethod,
              metadata.currency
            )
            .then((res) => {
              const { userId, token } = res;
              logger.info(
                `User account creation successful for ${metadata.email}`
              );
              logger.info(`Creating company account for ${metadata.email}`);
              user
                .createNewCompany(
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
                  null
                )
                .then(async (res) => {
                  logger.info(`Adding subscription for ${metadata.email}`);
                  user
                    .addSubscriptionData(
                      userId,
                      event.id,
                      "solo",
                      parseInt(event.data.object.amount_total) / 100,
                      "1",
                      event.data.object.subscription,
                      event.data.object.customer,
                      event.data.object.currency.toUpperCase(),
                      JSON.stringify(paymentHistory)
                    )
                    .then(async (res) => {
                      user.getMailTemplate(1).then(async (data) => {
                        let subject = data[0].subject;
                        subject = subject.replace(
                          "{{name}}",
                          metadata.firstname
                        );
                        let html = data[0].template;
                        html = html.replace("{{name}}", metadata.firstname);
                        var { transporter, mailingAddress } =
                          await emailTransporter();

                        var mailOptions2 = {
                          from: mailingAddress,
                          to: metadata.email,
                          subject: subject,
                          html,
                        };

                        transporter.sendMail(
                          mailOptions2,
                          function (error, info) {
                            if (error) {
                              logger.error(error.message);
                            }
                            logger.info(
                              `Welcome message successfully sent to ${metadata.email}`
                            );

                            user.getMailTemplate(2).then(async (data) => {
                              let subject = data[0].subject;
                              let html = data[0].template;
                              html = html.replace(
                                "{{name}}",
                                metadata.firstname
                              );
                              html = html.replace(
                                "{{link}}",
                                `${process.env.FRONTEND_BASE_URL}/auth/verify?email=${metadata.email}&token=${token}`
                              );
                              var mailOptions = {
                                from: mailingAddress,
                                to: metadata.email,
                                subject: subject,
                                html,
                              };

                              transporter.sendMail(
                                mailOptions,
                                function (error, info) {
                                  if (error) {
                                    logger.error(error.message);
                                  }
                                  logger.info(
                                    `Verification email successfully sent to ${metadata.email}`
                                  );
                                }
                              );
                              logger.info(
                                `Company account creation successful for ${metadata.email}`
                              );
                            });
                          }
                        );
                      });
                    })
                    .catch((err) => {
                      logger.warn(
                        `Failed to add subscription data for ${metadata.email}`
                      );
                      logger.error(err);
                      logger.debug(
                        JSON.stringify({
                          success: false,
                          message: request.t("accountCreationFailed"),
                        })
                      );
                    });
                })
                .catch((err) => {
                  logger.warn(
                    `Company account creation failed for ${metadata.email}`
                  );
                  logger.error(err);
                  logger.debug(
                    JSON.stringify({
                      success: false,
                      message: request.t("accountCreationFailed"),
                    })
                  );
                });
            })
            .catch((err) => {
              logger.warn(`User account creation failed for ${metadata.email}`);
              logger.error(err);
              logger.debug(JSON.stringify({ success: false, message: err }));
            });
        } else if (
          metadata.accountType == "solo" && metadata.signUpMethod != "email"
        ) {
          logger.info(`Creating new account for ${metadata.email}`);

          user
            .createNewUserGoogle(
              metadata.firstname,
              metadata.lastname,
              metadata.email,
              metadata.accountType,
              metadata.signUpMethod,
              metadata.currency
            )
            .then(async (res) => {
              const { userId } = res;
               if (metadata.avatarUrl) {
                updateGoogleAvatarUrl(knex, metadata.email, metadata.avatarUrl);
              }
              logger.info(
                `User account creation successful for ${metadata.email}`
              );

              logger.info(
                `User account creation successful for ${metadata.email}`
              );
              logger.info(`Creating company account for ${metadata.email}`);
              user
                .createNewCompany(
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
                  null
                )
                .then(async (res) => {
                  logger.info(`Adding subscription for ${metadata.email}`);
                   const invoice = event.data.object;
                  user
                    .addSubscriptionData(
                      userId,
                      event.id,
                      "solo",
                      parseInt(event.data.object.amount_total) / 100,
                      "1",
                      event.data.object.subscription,
                      event.data.object.customer,
                      event.data.object.currency.toUpperCase(),
                      JSON.stringify(paymentHistory),
                    )
                    .then(async (res) => {
                      user.getMailTemplate(1).then(async (data) => {
                        let subject = data[0].subject;
                        subject = subject.replace(
                          "{{name}}",
                          metadata.firstname
                        );
                        let html = data[0].template;
                        html = html.replace("{{name}}", metadata.firstname);
                        var { transporter, mailingAddress } =
                          await emailTransporter();

                        var mailOptions2 = {
                          from: mailingAddress,
                          to: metadata.email,
                          subject: subject,
                          html,
                        };

                        transporter.sendMail(
                          mailOptions2,
                          function (error, info) {
                            if (error) {
                              logger.error(error.message);
                            }
                            logger.info(
                              `Welcome message successfully sent to ${metadata.email}`
                            );
                          }
                        );
                        logger.info(
                          `Company account creation successful for ${metadata.email}`
                        );
                      });
                    })
                    .catch((err) => {
                      logger.warn(
                        `Failed to add subscription data for ${metadata.email}`
                      );
                      logger.error(err);
                      logger.debug(
                        JSON.stringify({
                          success: false,
                          message: request.t("accountCreationFailed"),
                        })
                      );
                    });
                })
                .catch((err) => {
                  logger.warn(
                    `Company account creation failed for ${metadata.email}`
                  );
                  logger.error(err);
                  logger.debug(
                    JSON.stringify({
                      success: false,
                      message: request.t("accountCreationFailed"),
                    })
                  );
                });
            })
            .catch((err) => {
              console.log(err);
              logger.warn(`User account creation failed for ${metadata.email}`);
              logger.error(err);
              logger.debug(JSON.stringify({ success: false, message: err }));
            });
        } else if (metadata.accountType == "team" && metadata.signUpMethod !== "email") {
          logger.info(`Creating user account for ${metadata.email}`);

          user
            .createNewUserGoogle(
              metadata.firstname,
              metadata.lastname,
              metadata.email,
              metadata.accountType,
              metadata.signUpMethod,
              metadata.currency
            )
            .then((res) => {
              const { userId } = res;
               if (metadata.avatarUrl) {
                updateGoogleAvatarUrl(knex, metadata.email, metadata.avatarUrl);
              }
              logger.info(
                `User account creation successful for ${metadata.email}`
              );
              logger.info(`Creating company account for ${metadata.email}`);
              user
                .createNewCompany(
                  userId,
                  metadata.companyName,
                  metadata.phoneNumberCountryCode,
                  metadata.phoneNumber,
                  metadata.orgType,
                  metadata.mailingStreetName,
                  metadata.mailingCountryName,
                  metadata.mailingCityName,
                  metadata.mailingStateName,
                  metadata.mailingZip,
                  metadata.billingStreetName,
                  metadata.billingCountryName,
                  metadata.billingCityName,
                  metadata.billingStateName,
                  metadata.billingZip,
                  metadata.isMailAndBillAddressSame
                )
                .then(async(res) => {
                  logger.info(`Adding subscription for ${metadata.email}`);
                  user
                    .addSubscriptionData(
                      userId,
                      event.id,
                      "team",
                      parseInt(event.data.object.amount_total) / 100,
                      "1",
                      event.data.object.subscription,
                      event.data.object.customer,
                      event.data.object.currency.toUpperCase(),
                      JSON.stringify(paymentHistory)
                    )
                    .then(async (res) => {
                      user.getMailTemplate(1).then(async (data) => {
                        let subject = data[0].subject;
                        subject = subject.replace(
                          "{{name}}",
                          metadata.firstname
                        );
                        let html = data[0].template;
                        html = html.replace("{{name}}", metadata.firstname);
                        var { transporter, mailingAddress } =
                          await emailTransporter();

                        var mailOptions2 = {
                          from: mailingAddress,
                          to: metadata.email,
                          subject: subject,
                          html,
                        };

                        transporter.sendMail(
                          mailOptions2,
                          function (error, info) {
                            if (error) {
                              logger.error(error.message);
                              return;
                            }
                            logger.info(
                              `Welcome message successfully sent to ${metadata.email}`
                            );
                          }
                        );

                        logger.debug(
                          JSON.stringify({
                            success: true,
                            message: request.t("accountCreationSuccess"),
                            userData: data,
                          })
                        );
                      });
                    })
                    .catch((err) => {
                      logger.warn(
                        `Company account creation failed for ${metadata.email}`
                      );
                      logger.error(err);
                      logger.debug(
                        JSON.stringify({
                          success: false,
                          message: request.t("accountCreationFailed"),
                        })
                      );
                    });
                })
                .catch((err) => {
                  logger.warn(
                    `User account creation failed for ${metadata.email}`
                  );
                  logger.error(err);
                  logger.debug(
                    JSON.stringify({ success: false, message: err })
                  );
                });
            })
            .catch((err) => {
              logger.warn(`User account creation failed for ${metadata.email}`);
              logger.error(err);
              logger.debug(JSON.stringify({ success: false, message: err }));
            });
        } else {
          user
            .createNewUser(
              metadata.firstname,
              metadata.lastname,
              metadata.email,
              metadata.mobileCountryCode,
              metadata.mobileNumber,
              metadata.password,
              metadata.accountType,
              "1",
              metadata.signUpMethod,
              metadata.currency
            )
            .then((res) => {
              const { userId, token } = res;
              logger.info(
                `User account creation successful for ${metadata.email}`
              );
              logger.info(`Creating company account for ${metadata.email}`);
              user
                .createNewCompany(
                  userId,
                  metadata.companyName,
                  metadata.phoneNumberCountryCode,
                  metadata.phoneNumber,
                  metadata.orgType,
                  metadata.mailingStreetName,
                  metadata.mailingCountryName,
                  metadata.mailingCityName,
                  metadata.mailingStateName,
                  metadata.mailingZip,
                  metadata.billingStreetName,
                  metadata.billingCountryName,
                  metadata.billingCityName,
                  metadata.billingStateName,
                  metadata.billingZip,
                  metadata.isMailAndBillAddressSame
                )
                .then(async (res) => {
                  logger.info(`Adding subscription for ${metadata.email}`);
                  user
                    .addSubscriptionData(
                      userId,
                      event.id,
                      "team",
                      parseInt(event.data.object.amount_total) / 100,
                      "1",
                      event.data.object.subscription,
                      event.data.object.customer,
                      event.data.object.currency.toUpperCase(),
                      JSON.stringify(paymentHistory)
                    )
                    .then(async (res) => {
                      user.getMailTemplate(1).then(async (data) => {
                        let subject = data[0].subject;
                        subject = subject.replace(
                          "{{name}}",
                          metadata.firstname
                        );
                        let html = data[0].template;
                        html = html.replace("{{name}}", metadata.firstname);
                        var { transporter, mailingAddress } =
                          await emailTransporter();

                        var mailOptions2 = {
                          from: mailingAddress,
                          to: metadata.email,
                          subject: subject,
                          html,
                        };

                        transporter.sendMail(
                          mailOptions2,
                          function (error, info) {
                            if (error) {
                              logger.error(error.message);
                              console.log(error);
                            }
                            logger.info(
                              `Welcome message successfully sent to ${metadata.email}`
                            );

                            user.getMailTemplate(2).then(async (data) => {
                              let subject = data[0].subject;
                              let html = data[0].template;
                              html = html.replace(
                                "{{name}}",
                                metadata.firstname
                              );
                              html = html.replace(
                                "{{link}}",
                                `${process.env.FRONTEND_BASE_URL}/auth/verify?email=${metadata.email}&token=${token}`
                              );
                              var mailOptions = {
                                from: mailingAddress,
                                to: metadata.email,
                                subject: subject,
                                html,
                              };

                              transporter.sendMail(
                                mailOptions,
                                function (error, info) {
                                  if (error) {
                                    console.log(error);
                                    logger.error(error.message);
                                  }
                                  logger.info(
                                    `Verification email successfully sent to ${metadata.email}`
                                  );
                                }
                              );
                              logger.info(
                                `Company account creation successful for ${metadata.email}`
                              );
                            });
                          }
                        );
                      });
                    })
                    .catch((err) => {
                      logger.warn(
                        `Failed to add subscription data for ${metadata.email}`
                      );
                      logger.error(err);
                      logger.debug(
                        JSON.stringify({
                          success: false,
                          message: request.t("accountCreationFailed"),
                        })
                      );
                    });
                })
                .catch((err) => {
                  logger.warn(
                    `Company account creation failed for ${metadata.email}`
                  );
                  logger.error(err);
                  logger.debug(
                    JSON.stringify({
                      success: false,
                      message: request.t("accountCreationFailed"),
                    })
                  );
                });
            })
            .catch((err) => {
              logger.warn(`User account creation failed for ${metadata.email}`);
              logger.error(err);
              logger.debug(JSON.stringify({ success: false, message: err }));
            });
        }
        break;

      case "payment_intent.succeeded":
        try{
        const charge = await stripe.charges.retrieve(event.data.object.latest_charge)
        const card = charge.payment_method_details.card;
        const paymentMethod = {
          provider: card.wallet?.type || 'stripe',
          type: card.wallet?.type === 'link' ? 'link' : 'card',
          brand: card.brand,
          last4: card.last4,
          expiry_month: card.exp_month,
          expiry_year: card.exp_year,
          is_default: event.data.object.latest_charge.setup_future_usage === 'off_session'
        };
        await user.insertPaymentMethod(event.data.object.customer,JSON.stringify(paymentMethod))
        }
        catch(err){
          console.log(err)
          logger.warn(`Error handling payment success: ${err.message}`);
        }
        break;

      case "invoice.payment_succeeded":
        try {
          const customerId = event.data.object.customer;
          const customer = await stripe.customers.retrieve(customerId);
          const email = customer.email;
          logger.info(`Updating subscription for ${email}`);
          user.checkIfUserExist(email).then(async (res) => {
            if (res.length > 0) {
              logger.info(`Fetiching subscription user for ${email}`);
              user
                .getUserIdByEmail(email)
                .then((res) => {
                  user
                    .updateSubscriptionData(res, "0")
                    .then(async (resp) => {
                      if (resp == 1) {
                        logger.info(`Updating subscription for ${email}`);
                        user
                          .addSubscriptionData(
                            res,
                            event.id,
                            "Renewal",
                            parseInt(event.data.object.amount_total) / 100,
                            "1",
                            event.data.object.subscription,
                            event.data.object.customer,
                            event.data.object.currency.toUpperCase()
                          )
                          .then(async (res) => {
                            user.getMailTemplate(1).then(async (data) => {
                              let subject = data[0].subject;
                              let html = data[0].template;
                              html = html.replace("{{name}}", email);
                              var { transporter, mailingAddress } =
                                await emailTransporter();

                              var mailOptions2 = {
                                from: mailingAddress,
                                to: email,
                                subject: subject,
                                html,
                              };

                              transporter.sendMail(
                                mailOptions2,
                                function (error, info) {
                                  if (error) {
                                    logger.error(error.message);
                                  }
                                  logger.info(
                                    `Updated subscription successfully sent to ${email}`
                                  );
                                }
                              );
                            });
                          });
                      }
                    })
                    .catch((err) => {
                      logger.warn(
                        `Failed to update subscription data for ${email}`
                      );
                      logger.error(err);
                      logger.debug(
                        JSON.stringify({
                          success: false,
                          message: "Failed to update subscription.",
                        })
                      );
                    });
                })
                .catch((err) => {
                  logger.warn(`Failed to user Id for ${email}`);
                  logger.error(err);
                  logger.debug(
                    JSON.stringify({
                      success: false,
                      message: "Failed to update subscription.",
                    })
                  );
                });
              logger.info(`Payment succeeded for customer ${customerId}`);
            } else {
              logger.info(`Successfully generate Invoice for ${email}`);
            }
          });
        } catch (err) {
          logger.warn(`Error handling payment success: ${err.message}`);
        }
        break;

      case "customer.subscription.deleted":
        try {
          logger.info(`Subscription Cancel Successfully.`);
        } catch (err) {
          logger.warn(`Error handling payment failure: ${err.message}`);
        }
        break;

      case "invoice.payment_failed":
        try {
          const customerId = event.data.object.customer;
          const customer = await stripe.customers.retrieve(customerId);
          const email = customer.email;
          logger.info(`Updating subscription for ${email} invoice failed`);
          user.checkIfUserExist(email).then(async (res) => {
            if (res.length > 0) {
              logger.info(
                `Fetiching subscription user for ${email} invoice failed`
              );
              user
                .getUserIdByEmail(email)
                .then((res) => {
                  logger.info(
                    `Updating subscription for ${email} invoice failed`
                  );
                  user
                    .updateSubscriptionData(res, "0")
                    .then(async (res) => {
                      user.getMailTemplate(1).then(async (data) => {
                        let subject = data[0].subject;
                        let html = data[0].template;
                        html = html.replace("{{name}}", email);
                        var { transporter, mailingAddress } =
                          await emailTransporter();

                        var mailOptions2 = {
                          from: mailingAddress,
                          to: email,
                          subject: subject,
                          html,
                        };

                        transporter.sendMail(
                          mailOptions2,
                          function (error, info) {
                            if (error) {
                              logger.error(error.message);
                            }
                            logger.info(
                              `Updation message successfully sent to ${email} invoice failed`
                            );
                          }
                        );
                      });
                    })
                    .catch((err) => {
                      logger.warn(
                        `Failed to update subscription data for ${email}`
                      );
                      logger.error(err);
                      logger.debug(
                        JSON.stringify({
                          success: false,
                          message: "Failed to update subscription.",
                        })
                      );
                    });
                })
                .catch((err) => {
                  logger.warn(`Failed to get user Id for ${email}`);
                  logger.error(err);
                  logger.debug(
                    JSON.stringify({
                      success: false,
                      message: "Failed to update subscription.",
                    })
                  );
                });
              logger.info(`Payment Failed for customer ${customerId}`);
            } else {
              logger.info(`Failed to generate Invoice for ${email}`);
            }
          });
        } catch (err) {
          logger.warn(`Error handling subscription deletion: ${err.message}`);
        }
        break;

      default:
        break;
    }
  }
);

const cors = require("cors");

const allowedOrigins = [
  process.env.FRONTEND_BASE_URL,
  process.env.BACKEND_URL,
  "https://accounts.google.com",            
  "https://login.microsoftonline.com",      
  "https://login.live.com" 
];

app.use(
  cors({
    origin: function (origin, callback) {
      // console.log("CORS request from:", origin);
      if (!origin || origin === "null" || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST","PATCH", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"]
  })
);

app.use(parser.urlencoded({ extended: true }));
app.use(parser.json());
app.use(
  "/user-avatars",
  express.static(`${process.env.BACKEND_PATH}/uploads/userAvatars`)
);
app.use(
  "/company-logos",
  express.static(`${process.env.BACKEND_PATH}/uploads/companyLogos`)
);
app.use(
  "/app-logo",
  express.static(`${process.env.BACKEND_PATH}/uploads/appLogo`)
);
app.use(
  "/app-icon",
  express.static(`${process.env.BACKEND_PATH}/uploads/appIcon`)
);

app.use(usersRoute());
app.use(teamRoute());
app.use(documentRoute());
app.use(chatRoute());
app.use(superAdminRoute());
app.use(appdataRoute());

// Google authentication
const session = require("express-session");
const responseGoogle = require("./app/init/responseGoogle");

app.use(
  session({
    secret: process.env.TOKEN_SECRET,
    resave: true,
    saveUninitialized: true,
  })
);
app.use(responseGoogle.initialize());
app.use(responseGoogle.session());

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Internal Server Error");
});

  const GOOGLE_CLIENT_ID =process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  const DROPBOX_CLIENT_ID = process.env.DROPBOX_APP_KEY;
  const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_APP_SECRET;

  const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
  const MICROSOFT_CLIENT_SECRET =process.env.MICROSOFT_CLIENT_SECRET


  const BACKEND_URL = process.env.BACKEND_URL

  const REDIRECT_URI_GOOGLE =
`${BACKEND_URL}/auth/providers/google/callback`;
  const REDIRECT_URI_DROPBOX =
`${BACKEND_URL}/auth/providers/dropbox/callback`;
  const REDIRECT_URI_MICROSOFT =
`${BACKEND_URL}/auth/providers/microsoft/callback`;

const db = {
   google: {},
   dropbox: {},
   microsoft: {}
};

const avatarsDir = path.join(__dirname, "avatars");
if (!fs.existsSync(avatarsDir)) {
   fs.mkdirSync(avatarsDir, { recursive: true });
}

app.use("/avatars", express.static(avatarsDir));


async function downloadAndSaveAvatar(imageUrl, filename) {
   try {
     const avatarPath = path.join(avatarsDir, filename);
     const response = await axios.get(imageUrl, {
       responseType: "arraybuffer",
       timeout: 5000,
       validateStatus: () => true
     });

     if (response.status >= 200 && response.status < 300) {
       fs.writeFileSync(avatarPath, response.data);
       return true;
     } else {
       throw new Error(`HTTP ${response.status}`);
     }
   } catch (err) {
     console.warn("🟨 [Avatar] Failed:", err.message);
     return false;
   }
}


app.get("/auth/providers/:provider", async (req, res) => {
   const provider = req.params.provider;
   const flow = req.query.flow;
   const platform = req.query.platform; 
   const userId = req.query.userId
   const pkceChallenge = req.query.pkce_challenge;
   let authUrl = "";
   if (
    (flow === 'login' || flow === 'registration' || flow === 'invited') &&
    (!pkceChallenge || pkceChallenge === 'null')
    ) {
      return res.status(400).json({
        success: false,
        error: 'bad_request',
        message: 'PKCE challenge is required for login,invitation and registration flow',
      });
    }
    if(flow == "invited") {
      if(!req.query.invite_email ) {
        return res.status(400).json({
          success: false,
          error: 'bad_request',
          message: 'missing or invalid field',
          details: [{ field: 'invite_email', issue: 'This field is required' }]
        })
      }
      if(!req.query.invite_token ) {
        return res.status(400).json({
          success: false,
          error: 'bad_request',
          message: 'missing or invalid field',
          details: [{ field: 'invite_token', issue: 'This field is required' }]
        })
      }
    }    
    const stateObj = {
    platform: platform || "web",
    flow: flow || "integration",
    userId:userId ||"",
    pkceChallenge: pkceChallenge || null,
    invite_email:req.query.invite_email || null,
    invite_token:req.query.invite_token || null
  };
  const state = encodeURIComponent(JSON.stringify(stateObj));

   try {
     if (provider === "google" || provider === "googleDrive") {
      authUrl =
      "https://accounts.google.com/o/oauth2/v2/auth?" +
      new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI_GOOGLE,
        response_type: "code",
        state,
        scope: ["email", "profile"].join(" ")
      }).toString();
    } else if (provider === "microsoft") {
      authUrl =
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" +
      new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        redirect_uri: REDIRECT_URI_MICROSOFT,
        response_type: "code",
        response_mode: "query",
        state,
        scope: [
          "openid",
          "email",
          "profile",
          "User.Read",
        ].join(" ")
      }).toString();
     }
      else {
       return res.status(400).json({
         success: false,
         error: "unsupported_provider",
         message: `Provider '${provider}' is not supported`
       });
     }

     return res.redirect(authUrl);
   } catch (err) {
     console.error("[OAuth] Error building auth URL:", err.message);
     return res.status(500).json({
       success: false,
       error: "oauth_start_failed",
       message: "Failed to start OAuth flow"
     });
   }
});

app.get("/integrations/auth/:integrationId", async (req, res) => {
  const { platform, st: sessionToken } = req.query;
  const { integrationId } = req.params;

  const errors = [];

  /* -------------------- Validation -------------------- */
  if (!integrationId) {
    errors.push({ field: "integrationId", issue: "This field is required" });
  }

  if (!platform) {
    errors.push({ field: "platform", issue: "This field is required" });
  } else if (!["web", "mobile"].includes(platform)) {
    errors.push({ field: "platform", issue: "platform is invalid" });
  }
  const redirectError = (errorCode) => {
    return res.redirect(`${process.env.FRONTEND_BASE_URL}/auth/oauth-complete?status=error&code=invalid_session_token`);
  };
  if (!sessionToken) {
    redirectError("invalid_session_token")
    errors.push({ field: "st", issue: "This field is required" });
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      error: "bad_request",
      message: "Invalid or missing fields",
      details: errors
    });
  }

  /* -------------------- Integration Mapping -------------------- */
  const integrationMap = {
    integration_1: "google",
    integration_2: "dropbox",
    integration_3: "onedrive",
    integration_4: "slack",
    integration_5: "wordpress"
  };

  const provider = integrationMap[integrationId];

  if (!provider) {
    return res.status(400).json({
      success: false,
      error: "bad_request",
      message: "integrationId is invalid",
      details: [{ field: "integrationId", issue: "integrationId is invalid" }]
    });
  }

  /* -------------------- Session Token Check -------------------- */
  const rows = await knex("users_meta")
    .where({ metaKey: "oauth_session_token" });

  const row = rows.find(r => {
    const data = JSON.parse(r.metaValue);
    return data.token === sessionToken;
  });

  if (!row) {
       return redirectError("invalid_session_token")

    return res.status(401).json({
      success: false,
      error: "unauthorized",
      message: "Invalid session token",
      details: [{ field: "st", issue: "Invalid session token" }]
    });
  }

  const tokenData = JSON.parse(row.metaValue);

  if (Date.now() > tokenData.expiresAt) {
    await knex("users_meta")
      .where({ metaKey: "oauth_session_token", userId: row.userId })
      .del();
    redirectError("session_token_expired")

    return res.status(401).json({
      success: false,
      error: "unauthorized",
      message: "Session token expired",
      details: [{ field: "st", issue: "Session token expired" }]
    });
  }

  // One-time token usage
  await knex("users_meta")
    .where({ metaKey: "oauth_session_token", userId: row.userId })
    .del();

  /* -------------------- OAuth State -------------------- */
  const state = encodeURIComponent(
    JSON.stringify({
      platform,
      userId: row.userId
    })
  );

  /* -------------------- OAuth URL Builder -------------------- */
  let authUrl;

  try {
    switch (provider) {
      case "google":
        authUrl =
          "https://accounts.google.com/o/oauth2/v2/auth?" +
          new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: REDIRECT_URI_GOOGLE,
            response_type: "code",
            access_type: "offline",
            prompt: "consent",
            state,
            scope: [
              "email",
              "profile",
              "https://www.googleapis.com/auth/drive.readonly"
            ].join(" ")
          });
        break;

      case "dropbox":
        authUrl =
          "https://www.dropbox.com/oauth2/authorize?" +
          new URLSearchParams({
            client_id: DROPBOX_CLIENT_ID,
            redirect_uri: REDIRECT_URI_DROPBOX,
            response_type: "code",
            token_access_type: "offline",
            state,
            scope:
              "account_info.read files.metadata.read files.content.read"
          });
        break;

      case "onedrive":
        authUrl =
          "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" +
          new URLSearchParams({
            client_id: MICROSOFT_CLIENT_ID,
            redirect_uri: REDIRECT_URI_MICROSOFT,
            response_type: "code",
            response_mode: "query",
            state,
            scope: [
              "openid",
              "email",
              "profile",
              "offline_access",
              "User.Read",
              "Files.Read",
              "Files.Read.All"
            ].join(" ")
          });
        break;

      case "slack":
        authUrl =
          "https://slack.com/oauth/v2/authorize?" +
          new URLSearchParams({
            client_id: process.env.SLACK_CLIENT_ID,
            user_scope: "channels:read,groups:read,files:read,users:read,users:read.email",
            redirect_uri: `${process.env.BACKEND_URL}/auth/providers/slack/callback`,
            state
          });
        break;

      case "wordpress":
        authUrl =
          "https://public-api.wordpress.com/oauth2/authorize?" +
          new URLSearchParams({
            client_id: process.env.WORDPRESS_CLIENT_ID,
            redirect_uri: `${process.env.BACKEND_URL}/auth/providers/wordpress/callback`,
            response_type: "code",
            scope: "global",
            state
          });
        break;

      default:
        return res.status(400).json({
          success: false,
          error: "unsupported_provider",
          message: `Provider '${provider}' is not supported`
        });
    }

    return res.redirect(authUrl);
  } catch (err) {
    console.error("[OAuth] Error building auth URL:", err);
    return redirectError("internal_error")    
    return res.status(500).json({
      success: false,
      error: "oauth_start_failed",
      message: "Failed to start OAuth flow"
    });
  }
});


async function handleGoogleCallback(code) {
   let accessToken = "";
   let refreshToken = "";
   let email = "";
   let firstname = "";
   let lastname = "";
   let avatar = "";

   let tokenRes;
   try {

     tokenRes = await axios.post(
       "https://oauth2.googleapis.com/token",
       {
         code,
         client_id: GOOGLE_CLIENT_ID,
         client_secret: GOOGLE_CLIENT_SECRET,
         redirect_uri: REDIRECT_URI_GOOGLE,
         grant_type: "authorization_code"
       },
       { headers: { "Content-Type": "application/json" } }
     );

     accessToken = tokenRes.data.access_token;
     refreshToken = tokenRes.data.refresh_token || ""; // may be null on subsequent consents

   } catch (err) {
     throw err;
   }

   let profileRes;
   try {

     profileRes = await axios.get(
       "https://www.googleapis.com/oauth2/v2/userinfo",
       { headers: { Authorization: `Bearer ${accessToken}` } }
     );

     email = profileRes.data.email;
     firstname = profileRes.data.given_name;
     lastname = profileRes.data.family_name;

   } catch (err) {
     throw err;
   }

   try {
     if (profileRes.data.picture) {
       const googlePhotoUrl = `${profileRes.data.picture}?sz=256`;
       const fileName = `google-${email.replace(/[^a-zA-Z0-9]/g, "_")}.jpg`;
       await downloadAndSaveAvatar(googlePhotoUrl, fileName);
     } else {
     }
   } catch (err) {
   }

   avatar = `${BACKEND_URL}/avatars/google.png`;

   return { accessToken, refreshToken, email, firstname, lastname, avatar
};
}

async function handleDropboxCallback(code) {
   console.log("[DBX] Starting Dropbox OAuth callback");
   let accessToken = "";
   let refreshToken = "";
   let email = "";
   let firstname = "";
   let lastname = "";
   let avatar = "";

   let tokenRes;
   try {
     console.log("[DBX] Exchanging code for token...");
     tokenRes = await axios.post(
       "https://api.dropboxapi.com/oauth2/token",
       new URLSearchParams({
         code,
         grant_type: "authorization_code",
         client_id: DROPBOX_CLIENT_ID,
         client_secret: DROPBOX_CLIENT_SECRET,
         redirect_uri: REDIRECT_URI_DROPBOX
       }),
       { headers: { "Content-Type": "application/x-www-form-urlencoded" }
}
     );

     accessToken = tokenRes.data.access_token;
     refreshToken = tokenRes.data.refresh_token || "";

   } catch (err) {
     console.error("[DBX] Token exchange failed:", err.message);
     throw err;
   }

   let profileRes;
   try {
     console.log("[DBX] Fetching profile...");

     profileRes = await axios.post(
       "https://api.dropboxapi.com/2/users/get_current_account",
       null,
       {
         headers: {
           Authorization: `Bearer ${accessToken}`,
           "Content-Type": "application/json"
         }
       }
     );

     email = profileRes.data.email;
     firstname = profileRes.data.name.given_name;
     lastname = profileRes.data.name.surname;

     console.log("[DBX] Profile:", { email, firstname, lastname });
   } catch (err) {
     console.error("[DBX] Failed to fetch profile:", err.message);
     throw err;
   }

   try {
     if (profileRes.data.profile_photo_url) {
       console.log("[DBX] Downloading avatar →",
profileRes.data.profile_photo_url);
       await downloadAndSaveAvatar(profileRes.data.profile_photo_url,
"dropbox.png");
     } else {
       console.log("[DBX] No Dropbox avatar URL provided");
     }
   } catch (err) {
     console.warn("[DBX] Failed to download Dropbox profile photo:",
err.message);
   }

   avatar = `${BACKEND_URL}/avatars/dropbox.png`;

   return { accessToken, refreshToken, email, firstname, lastname, avatar
};
}

async function handleMicrosoftCallback(code) {
   console.log("[MS] Starting Microsoft OAuth callback");
   let accessToken = "";
   let refreshToken = "";
   let email = "";
   let firstname = "";
   let lastname = "";
   let avatar = "";

   let tokenRes;
   try {
     console.log("[MS] Exchanging code for token...");
     tokenRes = await axios.post(
       "https://login.microsoftonline.com/common/oauth2/v2.0/token",
       new URLSearchParams({
         client_id: MICROSOFT_CLIENT_ID,
         client_secret: MICROSOFT_CLIENT_SECRET,
         code,
         redirect_uri: REDIRECT_URI_MICROSOFT,
         grant_type: "authorization_code"
       }),
       { headers: { "Content-Type": "application/x-www-form-urlencoded" }
}
     );

     accessToken = tokenRes.data.access_token;
     refreshToken = tokenRes.data.refresh_token || "";
   } catch (err) {
     console.error("[MS] Token exchange failed:", err.message);
     throw err;
   }

   let profileRes;
   try {
     console.log("[MS] Fetching profile from Graph /me");

     profileRes = await axios.get(
       "https://graph.microsoft.com/v1.0/me",
       { headers: { Authorization: `Bearer ${accessToken}` } }
     );

     console.log("[MS] Profile response:", profileRes.data);

     email = profileRes.data.mail || profileRes.data.userPrincipalName;
     firstname = profileRes.data.givenName;
     lastname = profileRes.data.surname;

     console.log("[MS] Parsed profile →", { email, firstname, lastname
});
   } catch (err) {
     console.error("[MS] Failed to fetch profile:", err.message);
     throw err;
   }

   try {
     console.log("[MS] Attempting to download profile photo...");

     const photoRes = await axios.get(
       "https://graph.microsoft.com/v1.0/me/photo/$value",
       {
         headers: { Authorization: `Bearer ${accessToken}` },
         responseType: "arraybuffer"
       }
     );

     const avatarPath = path.join(avatarsDir, "microsoft.png");
     fs.writeFileSync(avatarPath, photoRes.data);
     console.log("[MS] Photo saved successfully:", avatarPath);
   } catch (err) {
     console.warn("[MS] No profile photo found or failed to download:",
err.message);
   }

   avatar = `${BACKEND_URL}/avatars/microsoft.png`;

   return { accessToken, refreshToken, email, firstname, lastname, avatar
};
}

async function handleSlackCallback(code){
  const CLIENT_ID = process.env.SLACK_CLIENT_ID;
  const CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET
  const REDIRECT_URI = `${process.env.BACKEND_URL}/auth/providers/slack/callback`;

  try {
    // Exchange the authorization code for an access token
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      },
    });

    const { authed_user } = response.data;
    const userInfoResponse = await axios.get('https://slack.com/api/users.info', {
      headers: {
        Authorization: `Bearer ${authed_user.access_token}`, // This must be a user token, not bot token
      },
      params: {
        user: authed_user.id,
      },
    });

    const slackUser = userInfoResponse.data.user;
     return { accessToken:authed_user.access_token, refreshToken:'', email:slackUser.profile.email, firstname:"", lastname:"", avatar:''
};
  }
  catch(err){
throw err;
  }
}
//Wordpress
async function handleWordpressCallback(code){
  const CLIENT_ID = process.env.WORDPRESS_CLIENT_ID;
  const CLIENT_SECRET = process.env.WORDPRESS_CLIENT_SECRET
  const REDIRECT_URI = `${process.env.BACKEND_URL}/auth/providers/wordpress/callback`;
  try {
    // Exchange the authorization code for an access token
      const response = await axios.post('https://public-api.wordpress.com/oauth2/token', 
        querystring.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    
    const { access_token } = response.data;

    const userResponse = await axios.get('https://public-api.wordpress.com/rest/v1.1/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    return { accessToken:access_token, refreshToken:'', email:userResponse.data.email, firstname:"", lastname:"", avatar:''
};
}catch(err){
throw err;
}
}

// 2. OAuth Callback (Token Exchange + Fetch Profile)
app.get("/auth/providers/:provider/callback", async (req, res) => {
  const { provider } = req.params;
  const { code, state: rawState } = req.query;
  const user = new Users(knex);

  /* -------------------- Helpers -------------------- */
  const redirectError = (errorCode) => {
    return res.redirect(`${process.env.FRONTEND_BASE_URL}/auth/oauth-complete?status=error&code=${errorCode}`);
  };

  const postMessageAndClose = (payload) => {
    return res.send(`
      <script>
        const targetOrigin = '${process.env.FRONTEND_BASE_URL}';
        window.opener.postMessage(${JSON.stringify(payload)}, targetOrigin);
        window.close();
      </script>
    `);
  };

  /* -------------------- State Parsing -------------------- */
  let stateObj = {};
  if (rawState && rawState !== "undefined") {
    try {
      stateObj = JSON.parse(decodeURIComponent(rawState));
    } catch (err) {
      console.error("[OAuth] Invalid state payload", err);
    }
  }

  const platform = stateObj.platform || "mobile";
  const isMobile = platform === "mobile";
  const loginTime = new Date().toISOString();

  if (!code) {
    console.error("[OAuth] Missing authorization code");
    return redirectError("internal_error");
  }

  /* -------------------- Provider Handlers -------------------- */
  const providerHandlers = {
    google: handleGoogleCallback,
    dropbox: handleDropboxCallback,
    microsoft: handleMicrosoftCallback,
    slack: handleSlackCallback,
    wordpress: handleWordpressCallback
  };

  const handler = providerHandlers[provider];
  if (!handler) {
    console.error("[OAuth] Unsupported provider:", provider);
    return redirectError("unsupported_provider");
  }

  try {
    /* -------------------- OAuth Exchange -------------------- */
    const {
      accessToken,
      refreshToken,
      email,
      firstname,
      lastname,
      avatar
    } = await handler(code);
    
    // Debug storage
    db[provider] = {
      accessToken,
      refreshToken,
      email,
      firstname,
      lastname,
      avatar,
      loginTime
    };

      const params = new URLSearchParams();

    /* -------------------- Integration Persistence -------------------- */
    if (stateObj?.flow !== "registration" &&  stateObj?.flow !== "login" && stateObj?.flow !== "invited" ) {
      const userModel = new Users(knex);
      let userId = stateObj?.userId;

      if (!userId && email) {
        const result = await userModel.getUserIdByEmail(email);
        userId = result?.[0]?.[0]?.id;
      }

      const integrationMap = {
        google: { id: "integration_1", name: "Google" },
        dropbox: { id: "integration_2", name: "Dropbox" },
        microsoft: { id: "integration_3", name: "Onedrive" },
        slack: { id: "integration_4", name: "Slack" },
        wordpress: { id: "integration_5", name: "WordPress" }
      };

      const integration = integrationMap[provider];
      const source = platform === "mobile" ? "Mobile" : "Web";

      if (userId && integration) {
        const existing = await knex("user_integrations")
          .where({ userId, integrationId: integration.id })
          .first();

        const payload = {
          userId,
          integrationId: integration.id,
          name: integration.name,
          accessToken,
          refreshToken,
          account: email,
          source,
          time: new Date(),
          login: true
        };

        if (existing) {
          await knex("user_integrations")
            .where({ userId, integrationId: integration.id })
            .update(payload);
        } else {
          await knex("user_integrations").insert(payload);
        }
        params.append("status", "success");
      }
    }
    const userDetails = await user.getUserIdByEmail(email);
    const userId = userDetails[0]?.[0]?.id;
    let sessionToken =''
    const flow = stateObj?.flow;

    if (!((flow !== 'registration' && flow !== 'login' && flow !=='invited') || (flow === 'registration' && userId) || (flow === 'invited' && userId) ||(flow === 'login' && !userId))){
      
      const ttl = flow === 'registration' ? 500 : 60;

      const loginCode = crypto.randomUUID();
      sessionToken = loginCode;

      await redis.set(
        `login_code:${loginCode}`,
        JSON.stringify({
          email,
          pkceChallenge: stateObj.pkceChallenge,
          used: false,
        }),
        "EX",
        ttl
      );
    }

    /* -------------------- Mobile Redirect -------------------- */
    const normalizeEmail = (value = '') =>
      value
        .trim()
        .toLowerCase()
        .replace(/\u200B|\u00A0/g, '');
    if(['invited'].includes(stateObj?.flow)){
      if(userId){
          if (email) params.append("email", email);
          params.append("status", "email_already_registered");
      }else{
        if (normalizeEmail(stateObj.invite_email) !== normalizeEmail(email)) {
          params.append("status", "invite_email_mismatch");
        }else{

          params.append("status", "success");
          if(stateObj?.flow) params.append("flow",stateObj?.flow)
          if(provider) params.append("provider",provider)
          if (email) params.append("email", email);
          if (firstname) params.append("firstname", firstname);
          if (lastname) params.append("lastname", lastname);
          if (avatar) params.append("avatar", avatar);
          params.append("token", stateObj.invite_token);
          params.append("code", sessionToken);
        } 
      }
    }

      if (["all", "registration"].includes(stateObj?.flow)) {
        if(userId){
          if (email) params.append("email", email);
          params.append("status", "email_already_registered");
        }else{
          params.append("status", "success");
          if(stateObj?.flow) params.append("flow",stateObj?.flow)
          if(provider) params.append("provider",provider)
          if (email) params.append("email", email);
          if (firstname) params.append("firstname", firstname);
          if (lastname) params.append("lastname", lastname);
          if (avatar) params.append("avatar", avatar);
          params.append("code", sessionToken);
        }
      }
      if (stateObj?.flow === "all" && accessToken) {
        params.append("accesstoken", accessToken);
      }

      if (["login"].includes(stateObj?.flow)) {
        if(sessionToken !== ''){
        params.append("status", "success");
        params.append("code", sessionToken);
        }else{
        params.append("status", "email_not_registered");
        }

      }
      return res.redirect(`${process.env.FRONTEND_BASE_URL}/auth/oauth-complete?${params.toString()}`);

  } catch (err) {
    console.error("[OAuth] Callback failed:", err);
    return redirectError("internal_error");
  }
});


app.patch(
  "/me/profile",
  auth.verifyToken,
  auth.userExistsM2,
  async (req, res) => {
    const  language  = req.body.language;
    const userId = req.decoded.userId;
    const user = new Users(knex);

    if (!userId) {
      logger.warn("Profile update failed: Missing userId");
      return res.status(400).send({
        success: false,
        message: "Missing userId",
        details: []
      });
    }

    let updatedFields = [];
    let failedFields = [];

    const cleanList = (arr) =>
      [...new Set(arr.filter((f) => f && typeof f === "string" && f.trim() !== ""))];

    try {
      logger.info(`Profile update request received for user ${sanitizeForLog(userId)}`);

      const updateData = {};
      const allowedFields = ["firstname", "lastname", "mobileNumber", "mobileCountryCode"];
      for (const field of allowedFields) {
        if (req.body[field]) updateData[field] = req.body[field];
      }

      if (Object.keys(updateData).length === 0 && !language) {
        logger.warn("No valid fields provided for update");
        return res.status(400).send({
          success: false,
          error: "bad_request",
          message: "No fields provided for update",
          details: []
        });
      }

      if (Object.keys(updateData).length > 0) {
        try {
          const result = await user.updateUserDynamic(userId, updateData);

          if (result === 1) {
            updatedFields.push(...Object.keys(updateData));
          } else {
            failedFields.push(...Object.keys(updateData));
          }
        } catch (err) {
          logger.error("Error updating user fields: " + err.message);
          failedFields.push(...Object.keys(updateData));
        }
      }

      if (language) {
        try {
          let updated = await knex("users_meta")
            .where({ userId, metaKey: "language" })
            .update({ metaValue: language });

          if (updated === 0) {
            await knex("users_meta").insert({
              userId,
              metaKey: "language",
              metaValue: language,
            });
          }

          updatedFields.push("language");
        } catch (err) {
          logger.error(`Error updating language: ${err.message}`);
          failedFields.push("language");
        }
      }

      updatedFields = updatedFields.filter(field => field.trim().toLowerCase() !== "updatedat");
      updatedFields = cleanList(updatedFields);
      failedFields = cleanList(failedFields);

      const userData = await user.getUserDetailsById2(userId);

      if (failedFields.length > 0) {
        let message = `Failed to update ${failedFields.join(", ")}`;

        if (updatedFields.length > 0) {
          message += `. ${updatedFields.join(", ")} updated successfully`;
        }

        return res.status(400).send({
          success: false,
          message,
          userData,
        });
      }

      return res.status(200).send({
        success: true,
        message: "Profile updated successfully",
        updatedFields,
        user: userData,
      });
    } catch (err) {
      logger.error(`Error updating profile for ${sanitizeForLog(req.body.userId)}: ${err.message}`);
      return res.status(500).send({
        success: false,
        error: "server_error",
        message: "An unexpected error occurred",
      });
    }
  }
);

app.put(
  "/me/avatar",
  auth.verifyToken,
  userAvatarUpload.single("image"),
  auth.userExistsM2,
  async (req, res) => {
    const { userId } = req.decoded;
    const user = new Users(knex);

    if (!userId) {
      return res.status(400).send({
        success: false,
        message: "Missing userId",
        details:[]
      });
    }

    if (!req.file) {
      return res.status(400).send({
        success: false,
        error: "bad_request",
        message: "No image file provided",
        details: []
      });
    }

    try {
      let newImageName = req.file.filename;

      // Get old avatar
      const oldImageName = await user.getUserMetaValue(userId, "avatarUrl");

      if (oldImageName && oldImageName !== "default_avatar.png" && oldImageName !== "default.png") {
        const oldImagePath = path.join(
          process.env.BACKEND_PATH,
          "uploads",
          "userAvatars",
          oldImageName
        );
        fs.unlink(oldImagePath, (err) => {
          if (err) {
            logger.warn(
              `Failed to delete old profile picture ${oldImageName}: ${err.message}`
            );
          } else {
            logger.info(`Old profile picture deleted: ${oldImageName}`);
          }
        });
      }
        if(req.file?.originalname ==="default_avatar.png"){
            newImageName = req.file?.originalname
        }

      const updateResult = await user.updateUserMeta(userId, "avatarUrl", newImageName);
      if (!updateResult.success) {
        return res.status(500).send({
          success: false,
          error:"server_error",
          message: "An unexpected error occured",
        });
      }

      const userData = await user.getUserMetaValue(userId,"avatarUrl");

      return res.status(200).send({
        success: true,
        message: "Profile picture updated successfully",
        avatarUrl:`${process.env.USER_PROFILE_IMAGE_URL}/${userData}`,
      });
    } catch (err) {
      console.log(err)
      logger.error(
        `Error updating avatar for ${sanitizeForLog(userId)}: ${err.message}`
      );
      return res.status(500).send({
        success: false,
        error:"server_error",
        message: "An unexpected error has occured",
      });
    }
  }
);


app.patch(
  "/admin/users/:userId/profile",
  auth.verifyToken,
  auth.adminAccess,
  userAvatarUpload.single("image"),
  auth.userExists,
  auth.companyExist,
  auth.isUserBelongsToCompany,
  auth.isCompanyUser,
  auth.hasUserEditAccess,
  async (req, res) => {
    const user = new Users(knex);
    const userId = req.params.userId;
    let {
      role,
      firstname,
      lastname,
      email,
      mobileCountryCode,
      mobileNumber,
      password,
      language,
    } = req.body;
    const companyId = req.decoded.company;

    const allowedFields = [
      "firstname",
      "lastname",
      "email",
      "mobileNumber",
      "mobileCountryCode",
      "language",
      "role"
    ];
    const requestFields = Object.keys(req.body);

    const invalidFields = requestFields.filter(
      (field) => !allowedFields.includes(field)
    );
    if (invalidFields.length > 0) {
      const errorDetails = invalidFields.map(field => ({
        field: field, 
        issue: "Invalid field", 
      }));
    
      return res.status(400).send({
        success: false,
        error: "bad_request",
        message: "Invalid fields provided.",
        details: errorDetails,
      });
    }

    const hasAtLeastOneAllowedField = requestFields.some((field) =>
      allowedFields.includes(field)
    );

    if (!hasAtLeastOneAllowedField) {
      return res.status(400).send({
        success: false,
        error: "bad_request",
        message: "At least one field must be provided for update",
      });
    }
    const currentData = await user.getUserDetailsById(userId);
    if (!currentData) {
      return res.status(404).send({
        success: false,
        error: "not_found",
        message: "User not found",
      });
    }


    const isValidEmail = (email) => {
      const re =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(String(email).toLowerCase());
    };

    const VALID_ROLES = ['1', '2', '3'];
    const VALID_LANGUAGES = ['en', 'es', 'fr', 'hi'];
    const validationErrors = [];

    if (email !== undefined) {
      if (!isValidEmail(email)) {
        validationErrors.push({
          field: "email",
          issue: "invalid email provided",
        });
      }
    }

    if (role !== undefined) {
      role = String(role);
      if (!VALID_ROLES.includes(role)) {
        validationErrors.push({
          field: "role",
          issue: "invalid role provided, accepted values are 1,2,3",
        });
      }
    }

    if (language !== undefined) {
      if (!VALID_LANGUAGES.includes(language)) {
        validationErrors.push({
          field: "language",
          issue: "invalid language provided, accepted values are en,es,fr,hi",
        });
      }
    }

    if (validationErrors.length > 0) {
      return res.status(422).send({
        success: false,
        error: "validation_error",
        message: "Validation failed",
        details: validationErrors,
      });
    }


    const missingFields = [];
    if (!userId) missingFields.push('userId');
    if (!companyId) missingFields.push('companyId');
    
    if (missingFields.length > 0) {
      return res.status(400).send({
        success: false,
        error: 'bad_request',
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }
    if (role){
          role= role+"";
      if (role !== ''  && !['1', '2', '3'].includes(role)) {
        return res.status(401).send({ success: false, error: 'invalid_role', message: 'Invalid Role Id provided' });
      }
    }

    try {
      logger.info(`Admin updating user ${sanitizeForLog(userId)}`);

      const updatePayload = {
        firstname,
        lastname,
        email,
        mobileCountryCode,
        mobileNumber,
        password,
        language,
      };

      const attemptedFields = Object.keys(updatePayload).filter(
        (key) => updatePayload[key] !== undefined && updatePayload[key] !== null
      );

      const updatedFields = [];
      const failedFields = [];

      if (req.file) {
        const oldImage = await user.getUserMetaValue(userId, "avatarUrl");
        if (oldImage && oldImage !== "default.png") {
          const oldPath = `${process.env.BACKEND_PATH}/uploads/userAvatars/${oldImage}`;
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          logger.info(`Old profile picture deleted: ${oldImage}`);
        }
        updatePayload.avatarUrl = req.fileName;
        updatedFields.push("avatarUrl"); 
      }

      const updateRes = await user.adminUserUpdate(userId, updatePayload);
      if (updateRes !== 1) {
        logger.warn(`User profile update failed for ID ${userId}`);
        failedFields.push(...attemptedFields);
      } else {
        updatedFields.push(...attemptedFields);
      }

      if (role) {
        const roleRes = await user.adminRoleUpdateForUser(userId, companyId, role);
        if (roleRes !== 1) {
          logger.warn(`Failed to update role for user ${userId}`);
          failedFields.push("role");
        } else {
          updatedFields.push("role");
        }
      }

      let message = '';
      if (updatedFields.length > 0) {
        message += `${updatedFields.join(", ")} updated successfully`;
      }

      if (failedFields.length > 0) {
        if (message) message += " , ";
        message += `failed to update ${failedFields.join(" and ")}`;
      }

      const updatedData = await user.getUserDetailsById(userId);
      if (!updatedData) {
        return res.status(404).send({
          success: false,
          error: 'not_found',
          message: 'User not found',
        });
      }

      const roleData = await user.getCompanyRoleForUser(userId, companyId);
      updatedData.role = role || updatedData.role;
      updatedData.companyId = companyId; 
      updatedData.updated = new Date().toISOString(); 

      const responseData = {
        userId: updatedData.id,
        firstname: updatedData.firstname,
        lastname: updatedData.lastname,
        email: updatedData.email,
        mobileCountryCode: updatedData.mobileCountryCode,
        mobileNumber: updatedData.mobileNumber,
        companyId: updatedData.companyId,
        role: roleData,
        language: updatedData.language,
        updated: updatedData.updated,
      };

      if (failedFields.length === 0) {
        return res.status(200).send({
          success: true,
          message: "User profile updated successfully",
          userData: responseData,
        });
      } else {
        return res.status(400).send({
          success: false,
          message,
          userData: responseData,
        });
      }

    } catch (err) {
      logger.error(err);

      if (err.code === "EMAIL_IN_USE") {
        return res.status(409).send({
          success: false,
          error: 'conflict',
          message: err.message,
        });
      }

      return res.status(500).send({
        success: false,
        error: 'server_error',
        message: 'An unexpected error occurred',
      });
    }
  }
);

app.put(
  "/admin/users/:userId/profile/avatar",
  auth.verifyToken,
  auth.adminAccess,
  userAvatarUpload.single("image"),
  auth.userExists,
  auth.companyExist,
  auth.isUserBelongsToCompany,
  auth.isCompanyUser,
  async (req, res) => {
    const user = new Users(knex);
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).send({
        success: false,
        message: "Missing required field: userId",
      });
    }

    try {
      logger.info(`Admin updating avatar for user ${sanitizeForLog(userId)}`);

      const updatePayload = {};
      let newImageName = req.file.filename;

      // If a file is provided (avatar image), handle the update
      if (req.file) {
        const oldImage = await user.getUserMetaValue(userId, "avatarUrl");
        if (oldImage && oldImage !== "default.png" && oldImage !== "default_avatar.png") {
          const oldPath = `${process.env.BACKEND_PATH}/uploads/userAvatars/${oldImage}`;
          if (fs.existsSync(oldPath)) {fs.unlink(oldPath, (err) => {
          if (err) {
            logger.warn(
              `Failed to delete old profile picture ${oldImage}: ${err.message}`
            );
          } else {
            logger.info(`Old profile picture deleted: ${oldImage}`);
          }
        });}
        }
        if(req.file?.originalname ==="default_avatar.png"){
            newImageName = req.file?.originalname
        }

        updatePayload.avatarUrl = req.file.filename; // Save the uploaded file name
      } else {
        return res.status(400).send({
          success: false,
          message: "No image file uploaded",
        });
      }

      // Perform the update in the database
      const updateRes = await user.updateUserMeta(userId, "avatarUrl", newImageName);

      if (!updateRes.success) {
        logger.warn(`Avatar update failed for user ${userId}`);
        return res.status(400).send({
          success: false,
          message: "Failed to update avatar",
        });
      }

      // Fetch the updated user details (including the new avatar)
      const updatedAvatar = await user.getUserMetaValue(userId,"avatarUrl");
      // updatedData.avatarUrl = updatedAvatar.avatarUrl;

      return res.status(200).send({
        success: true,
        message: "Avatar updated successfully",
        avatarUrl: `${process.env.USER_PROFILE_IMAGE_URL}/${updatedAvatar}`,
      });

    } catch (err) {
      logger.error(err);

      if (err.code === "EMAIL_IN_USE") {
        return res.status(409).send({
          success: false,
          message: err.message,
        });
      }

      return res.status(500).send({
        success: false,
        message: err.message,
      });
    }
  }
);

app.patch(
  "/companies/:companyId/profile",
  auth.verifyToken,
  auth.adminAccess,
  auth.companyExist,
  auth.isCompanyUser,
  async (req, res) => {
    const { companyId } = req.params;
    const user = new Users(knex);

    if (!companyId) {
      logger.warn("Missing companyId in update request");
      return res.status(400).send({
        success: false,
        message: "Missing companyId",
      });
    }

    try {
      logger.info(`Updating company profile for id ${sanitizeForLog(companyId)}`);

      const updateData = {};

      // Mailing address mapping
      if (req.body.mailingAddress) {
        const m = req.body.mailingAddress;
        req.body.mailingStreetName = m.addressLine;
        req.body.mailingCountryName = m.country;
        req.body.mailingCityName = m.city;
        req.body.mailingStateName = m.state;
        req.body.mailingZip = m.postCode;
      }

      // Billing address mapping
      if (req.body.billingAddress) {
        const b = req.body.billingAddress;
        req.body.billingStreetName = b.addressLine;
        req.body.billingCountryName = b.country;
        req.body.billingCityName = b.city;
        req.body.billingStateName = b.state;
        req.body.billingZip = b.postCode;
      }

      // Allowed fields
      const allowedFields = [
        "phoneNumber",
        "phoneNumberCountryCode",
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
        "language",
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      // No fields provided
      if (Object.keys(updateData).length === 0) {
        logger.warn("No valid fields provided for company update");
        return res.status(400).send({
          success: false,
          error: "bad_request",
          message: "No fields provided for update"
        });
      }

      // Perform DB update
      const updated = await user.updateCompanyDynamic(companyId, updateData);
      if (updated !== 1) {
        logger.warn(`Company profile update failed for ${sanitizeForLog(companyId)}`);
        return res.status(500).send({
          success: false,
          error:"server_error",
          message: "An unexpected error has occured",
        });
      }

      let isUserLanguageSet = false;
      const companyData = await user.getCompanyDetails(companyId);
      const userLanguage = await user.getUserMetaValue(req.decoded.userId, "language");
console.log(companyData)
      if (userLanguage) {
        isUserLanguageSet = true;
      }

      logger.info(`Company profile updated successfully for ${sanitizeForLog(companyId)}`);

      return res.status(200).send({
        success: true,
        message: req.t("companyProfileUpdateSuccess"),
        companyData,
        isUserLanguageSet
      });

    } catch (err) {
      logger.error(`Error updating company ${sanitizeForLog(req.body.companyId)}: ${err.message}`);
      return res.status(500).send({
        success: false,
        error:"server_error",
        message: "An unexpected error occured",
      });
    }
  }
);



app.put(
  "/companies/:companyId/avatar",
  auth.verifyToken,
  auth.adminAccess,
  companyLogoUpload.single("image"), 
  auth.companyExist,
  auth.isCompanyUser,
  async (req, res) => {
    const { companyId } = req.params;
    const user = new Users(knex);

    if (!companyId) {
      logger.warn("Missing companyId in avatar update request");
      return res.status(400).send({
        success: false,
        message: "Missing companyId",
      });
    }

    if (!req.file) {
      logger.warn("No avatar file provided");
      return res.status(400).send({
        success: false,
        error: "bad_request",
        message: "No image file provided",
      });
    }

    try {
      logger.info(
        `Updating company avatar for id ${sanitizeForLog(companyId)}`
      );

      let newLogoName = req.file.filename;

      const oldLogoName = await user.getCompanyMetaValue(
        companyId,
        "companyLogo"
      );

      if (oldLogoName && oldLogoName !== "default_avatar.png" && oldLogoName !== "default.png") {
        const oldLogoPath = path.join(
          process.env.BACKEND_PATH,
          "uploads",
          "companyLogos",
          oldLogoName
        );

        fs.unlink(oldLogoPath, (err) => {
          if (err) {
            logger.warn(
              `Failed to delete old profile picture : ${err.message}`
            );
          } else {
            logger.info(`Old profile picture deleted:`);
          }
        });
      }
      console.log(req.file)
      if(req.file?.originalname ==="default_avatar.png"){
            newLogoName = req.file?.originalname
        }

      const updated = await user.updateCompanyMeta(companyId, "companyLogo",newLogoName);
      if (!updated) {
        logger.warn(
          `Company avatar update failed for ${sanitizeForLog(companyId)}`
        );

        return res.status(500).send({
          success: false,
          error: "server_error",
          message: "Failed to update avatar",
        });
      }

      const companyLogo = await user.getCompanyMetaValue(companyId,"companyLogo");

      logger.info(
        `Company avatar updated successfully for ${sanitizeForLog(
          companyId
        )}`
      );

      return res.status(200).send({
        success: true,
        message: "Company logo updated successfully", 
        companyLogo:`${process.env.COMPANY_LOGO_URL}/${companyLogo}`
      });
    } catch (err) {
      logger.error(
        `Error updating company avatar ${sanitizeForLog(companyId)}: ${
          err.message
        }`
      );
console.log(err)
      return res.status(500).send({
        success: false,
        error: "server_error",
        message: "An unexpected error occurred",
      });
    }
  }
);

app.get("/notifications", auth.verifyToken, (request, response) => {
  knex("notification")
    .where({ userId: request.decoded.userId })
    .orderBy("id", "desc")
    .then((res) => {
      return response.json({
        success:true,
        notifications:res
      });
    })
    .catch((err) => {
      logger.error(err);
      return response
        .status(500)
        .send({ success: false, message: "database error" });
    });
});

app.delete("/notification/:id", auth.verifyToken, async (request, response) => {
  try {
    const id = request.params.id;
    await knex("notification").where({ id: id }).del();
    
    return response.json({ success: true,message: "Notification deleted" });
  } catch (err) {
    logger.error(err);
    return response
      .status(500)
      .send({ success: false, message: "server error" });
  }
});

app.get("/auth/providers/:provider",(request,response)=>{
   return response.status(500).json({
                     success: false,
                     error: 'server_error',
                     message:"An unexpected error occurred'"
                 });
}
)

app.patch("/notifications/viewed", auth.verifyToken, (request, response) => {
  knex("notification")
    .where({ userId: request.decoded.userId })
    .update({ isViewed: true })
    .then(() => {
      return response.send({
        success: true,
        message: "All notifications marked as viewed",
      });
    })
    .catch((err) => {
      logger.info(err);
      return response
        .status(500)
        .send({ success: false, message: "database error" });
    });
});
let fileUploadQueue;
if (process.env.SEPERATE_FILE_UPLOAD_SERVER === "0") {
  logger.info("Same file upload server used.")
  fileUploadQueue = new Bull("myQueue", {
    redis: {
      host: "127.0.0.1",
      port: 6379,
    },
    concurrency: 1,
  });
}

const deleteFileUpload = async () => {
  try {
    const fileUploadExpiry = await getAdminSetting("FILE_UPLOAD_EXPIRY");
    const now = new Date();
    const filesToDelete = await knex("file_deletions").whereRaw(
      `DATE_ADD(created, INTERVAL ${fileUploadExpiry} HOUR) <= ?`,
      [now]
    );
    logger.info('Files to delete list')
    logger.info(filesToDelete)
    if (filesToDelete[0]) {
      filesToDelete.forEach(async (file) => {
        try {
          const document = await knex("documents").where("id", file.fileId);
          if (document[0].isNotAnalyzed) {
            await knex("notification").where("id", file.notificationId).del();
            fs.access(
              `${process.env.DOCUMENT_PATH}/${file.uuid}/${file.fileFullName}`,
              (err) => {
                if (err === null) {
                  logger.info(`Delete unanalyzed file ${file.fileFullName}`)
                  fs2.unlink(
                    path.resolve(
                      `${process.env.DOCUMENT_PATH}/${file.uuid}/${file.fileFullName}`
                    )
                  );
                }
              }
            );
            await knex("file_deletions")
              .whereRaw(
                `DATE_ADD(created, INTERVAL ${fileUploadExpiry} HOUR) <= ?`,
                [now]
              )
              .del();
            await knex("documents").where("id", file.fileId).del();
          }
        } catch (err) {
          logger.error(err);
        }
      });
    }
  } catch (e) {
    logger.error(e);
  }
};

cron.schedule("0 * * * *", () => {
  // checks every hour
  deleteFileUpload();
});

if (process.env.SEPERATE_FILE_UPLOAD_SERVER === "0") {
  fileUploadQueue.process(async (job, done) => {
    const created = new Date();
    const year = created.getUTCFullYear();
    const month = String(created.getUTCMonth() + 1).padStart(2, '0');
    const day = String(created.getUTCDate()).padStart(2, '0');
    const hours = String(created.getUTCHours()).padStart(2, '0');
    const minutes = String(created.getUTCMinutes()).padStart(2, '0');
    const seconds = String(created.getUTCSeconds()).padStart(2, '0');

    const mysqlTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    
    const newNotification = await knex("notification").insert({
      userId: job.data.jobData.userId,
      title: job.data.jobData.file.originalname+' ('+((job.data.jobData.size / 1000).toFixed(2)+'kb')+')',
      message: "uploading",
      type: "file",
      objectId: job.id,
      created: mysqlTimestamp
    });
    logger.info(`Job Id: ${job.id} - Notification Id: ${newNotification[0]}`)
    await knex("file_deletions").insert({
      fileId: job.data.jobData.fileName[0],
      uuid: job.data.jobData.uuid,
      fileFullName: job.data.jobData.fileFullName,
      created: mysqlTimestamp,
      notificationId: newNotification[0],
    });
    // uncomment to test for error

    // await knex('notification')
    // .where({ jobId: job.id })
    // .update({ message: 'failed' })
    // done(new Error('Testing the error'))
    // return

    const request = job.data.jobData;
    const documents = new Documents(knex);
    const team = new Team(knex);
    const extractor = new PDFExtractor();
    const storageDetails = await documents.getStorageOccupationDetail(
      request.company
    );
    function convertToKilobytes(formattedSize) {
      const sizes = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const [value, unit] = formattedSize.split(' ');
      const index = sizes.indexOf(unit);
  
      return parseFloat(value) * Math.pow(1000, index);
    }
    const usedStorage = convertToKilobytes(storageDetails) || 0;
    const maxStorageSetting = await getAdminSetting("MAX_STORAGE");
    const maxStorage = parseFloat(maxStorageSetting * 1024 * 1024);

    if (usedStorage <= maxStorage) {
      logger.info(
        `Uploading new document on team Id ${request.teamId}`
      );

      let Summary = "";
      let Overview = "";

      try {
        job.progress(25);
        if (
          request.file.mimetype == "image/jpeg" ||
          request.file.mimetype == "image/jpg"
        ) {
          const { summary } = await imageSummary(
            request.file.filename
          );
          Summary = summary;
        } else if (request.file.mimetype == "video/mp4") {
          const { summary } = await videoSummary(
            request.file.filename
          );
          Summary = summary;
        } else if (request.file.mimetype == "audio/mpeg") {
          const { summary } = await audioSummary(
            request.file.filename
          );
          Summary = summary;
        } else if (
          request.file.mimetype == "image/png" ||
          request.file.mimetype == "image/mov"
        ) {
          const { summary } = await imageSummary(
            request.file.filename
          );
          Summary = summary;
        } else if (request.file.mimetype == "video/quicktime") {
          const { summary } = await videoSummary(
            request.file.filename
          );
          Summary = summary;
        }
      } catch (error) {
        logger.error(
          `Error generating description of the multimedia ${request.fileName}`
        );
        logger.error(error);
        console.log(error)
        const document = await knex("documents")
          .where("id", request.fileName[0])
          .del();
        await knex("notification")
          .where({ objectId: job.id })
          .update({ message: "failed" });
        done(new Error(error));
        return;
      }

      if (request.file) {
        logger.info(`Checking if the file uploaded on server`);
        documents
          .checkIfFileExists(request.fileName[0])
          .then(async (res) => {
            if (res == 1) {
              if (
                request.file.mimetype != "image/png" &&
                request.file.mimetype != "audio/mpeg" &&
                request.file.mimetype != "video/mp4" &&
                request.file.mimetype != "image/jpeg" &&
                request.file.mimetype != "image/jpg" &&
                request.file.mimetype != "video/quicktime" &&
                request.file.mimetype != "image/mov"
              ) {
                const summary = await summarizer(
                  path.join(request.filePath, request.fileFullName),
                  request.fileName[0],
                  request.file.originalname,
                  request.userId
                );
                if (summary.success === true) {
                  Summary = summary.outputText;
                  Overview = summary.overviewOutputText;
                  const dateTime = new Date();
                  await knex("summary")
                    .where({
                      fileId: request.fileName[0],
                      fileName: request.file.originalname,
                      teamId: request.teamId,
                    })
                    .then((existingData) => {
                      if (existingData.length === 0) {
                        return knex("summary")
                          .insert({
                            fileId: request.fileName[0],
                            teamId: request.teamId,
                            fileName: request.file.originalname,
                            notes: Summary,
                            overview: Overview,
                            created: dateTime,
                          })
                          .then(() => {
                            logger.info({
                              message: "Summary insertion completed",
                            });
                          })
                          .catch(async (error) => {
                            logger.info({
                              error: "Internal Server Error",
                              error: error,
                            });
                            const document = await knex("documents")
                              .where("id", request.fileName[0])
                              .del();
                            await knex("notification")
                              .where({ objectId: job.id })
                              .update({ message: "failed" });
                            done(new Error(error));
                            return;
                          });
                      } else {
                        logger.info("Data already exists.");
                      }
                    })
                    .catch(async (error) => {
                      logger.error("Error checking data:", error);
                      const document = await knex("documents")
                        .where("id", request.fileName[0])
                        .del();
                      await knex("notification")
                        .where({ objectId: job.id })
                        .update({ message: "failed" });
                      done(new Error(error));
                      return;
                    });
                }
              } else if (Summary.length > 0) {
                const dateTime = new Date();
                await knex("summary")
                  .where({
                    fileId: request.fileName[0],
                    fileName: request.file.originalname,
                    teamId: request.teamId,
                  })
                  .then((existingData) => {
                    if (existingData.length === 0) {
                      return knex("summary")
                        .insert({
                          fileId: request.fileName[0],
                          teamId: request.teamId,
                          fileName: request.file.originalname,
                          notes: Summary,
                          overview: "",
                          created: dateTime,
                        })
                        .then(() => {
                          logger.info({
                            message: "Summary insertion completed",
                          });
                        })
                        .catch(async (error) => {
                          logger.info({
                            error: "Internal Server Error",
                            error: error,
                          });
                          const document = await knex("documents")
                            .where("id", request.fileName[0])
                            .del();
                          await knex("notification")
                            .where({ objectId: job.id })
                            .update({ message: "failed" }); // response.end()
                          done(new Error(error));
                          return;
                        });
                    } else {
                      logger.info("Data already exists.");
                    }
                  })
                  .catch(async (error) => {
                    logger.error("Error checking data:", error);
                    const document = await knex("documents")
                      .where("id", request.fileName[0])
                      .del();
                    await knex("notification")
                      .where({ objectId: job.id })
                      .update({ message: "failed" });
                    done(new Error(error));
                    return;
                  });
              }
              if (
                fs.existsSync(request.filePath + "/" + request.fileFullName)
              ) {
                logger.info(
                  `File uploaded successfully, splitting the document into chunks`
                );
                let docs = [];
                if (
                  request.file.mimetype ==
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ) {
                  job.progress(75);
                  logger.info(`DOCX File uploaded successfully`);
                  docs = await documents.createDocumentFromDocx(
                    path.join(request.filePath, request.fileFullName),
                    request.fileName[0],
                    request.file.originalname,
                    Summary,
                    Overview
                  );
                } else if (request.file.mimetype == "application/pdf") {
                  docs = await documents.createDocumentFromPDF(
                    path.join(request.filePath, request.fileFullName),
                    request.fileName[0],
                    request.file.originalname,
                    Summary,
                    Overview
                  );
                  if (docs.length > 0) {
                    job.progress(50);
                    logger.info(`PDF File uploaded successfully`);
                  } else {
                    job.progress(50);
                    const textURL = await extractor.convertPDFToText(
                      path.join(request.filePath, request.fileFullName),
                      request.userId,
                      request.fileName[0]
                    );
                    docs = await documents.createDocumentFromText(
                      textURL,
                      request.fileName[0],
                      request.file.originalname,
                      Summary,
                      Overview
                    );
                    job.progress(75);
                    logger.info(`PDF_LOW File uploaded successfully`);
                  }
                } else if (request.file.mimetype == "text/plain") {
                  logger.info(`TEXT File uploaded successfully`);
                  job.progress(75);
                  docs = await documents.createDocumentFromText(
                    path.join(request.filePath, request.fileFullName),
                    request.fileName[0],
                    request.file.originalname,
                    Summary,
                    Overview
                  );
                } else if (
                  request.file.mimetype ==
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ) {
                  job.progress(75);
                  logger.info(`XLSX File uploaded successfully`);
                  let isCsvFileCreated =
                    await documents.createTempCSVFileForXLSXFile(
                      request.filePath,
                      request.fileName,
                      "xlsx"
                    );
                  if (isCsvFileCreated == 1) {
                    docs = await documents.createDocumentFromCSV(
                      path.join(
                        path.resolve(`${process.env.TMP_CSV_PATH}`),
                        `${request.fileName[0]}.csv`
                      ),
                      request.fileName[0],
                      request.file.originalname,
                      Summary,
                      Overview
                    );
                  }
                } else if (
                  request.file.mimetype == "application/vnd.ms-excel"
                ) {
                  job.progress(75);
                  logger.info(`XLS File uploaded successfully`);
                  let isCsvFileCreated =
                    await documents.createTempCSVFileForXLSXFile(
                      request.filePath,
                      request.fileName,
                      "xls"
                    );
                  if (isCsvFileCreated == 1) {
                    docs = await documents.createDocumentFromCSV(
                      path.join(
                        path.resolve(`${process.env.TMP_CSV_PATH}`),
                        `${request.fileName[0]}.csv`
                      ),
                      request.fileName[0],
                      request.file.originalname,
                      Summary,
                      Overview
                    );
                  }
                } else if (request.file.mimetype == "application/msword") {
                  job.progress(75);
                  logger.info(`DOC File uploaded successfully`);
                  const textFilePath =
                    await documents.extractTextFromDocAndCreateTextFile(
                      path.join(request.filePath, request.fileFullName),
                      request.userId,
                      request.fileName[0]
                    );
                  docs = await documents.createDocumentFromText(
                    textFilePath,
                    request.fileName[0],
                    request.file.originalname,
                    Summary,
                    Overview
                  );
                } else if (
                  request.file.mimetype ==
                  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                ) {
                  job.progress(75);
                  logger.info(`PPTX File uploaded successfully`);
                  const textFilePath =
                    await documents.extractTextFromPPTXAndCreateTextFile(
                      path.join(request.filePath, request.fileFullName),
                      request.userId,
                      request.fileName[0]
                    );
                  docs = await documents.createDocumentFromText(
                    textFilePath,
                    request.fileName[0],
                    request.file.originalname,
                    Summary,
                    Overview
                  );
                } else if (
                  request.file.mimetype == "image/jpeg" ||
                  request.file.mimetype == "image/jpg" ||
                  request.file.mimetype == "image/png"
                ) {
                  job.progress(75);
                  logger.info(`Image File uploaded successfully`);
                  docs = await documents.createDocumentFromImage(
                    path.join(request.filePath, request.fileFullName),
                    request.fileName[0],
                    request.file.originalname,
                    Summary
                  );
                } else if (request.file.mimetype == "video/mp4") {
                  job.progress(75);
                  logger.info(`Video File uploaded successfully`);
                  docs = await documents.createDocumentFromVideo(
                    path.join(request.filePath, request.fileFullName),
                    request.fileName[0],
                    request.file.originalname,
                    Summary
                  );
                } else if (request.file.mimetype == "audio/mpeg") {
                  logger.info(`Audio File uploaded successfully`);
                  job.progress(75);
                  docs = await documents.createDocumentFromAudio(
                    path.join(request.filePath, request.fileFullName),
                    request.fileName[0],
                    request.file.originalname,
                    Summary
                  );
                } else if (request.file.mimetype == "video/quicktime") {
                  logger.info(`Video File uploaded successfully`);
                  job.progress(75);
                  docs = await documents.createDocumentFromVideo(
                    path.join(request.filePath, request.fileFullName),
                    request.fileName[0],
                    request.file.originalname,
                    Summary
                  );
                } else {
                  logger.info(`File updated failed`);
                  const document = await knex("documents")
                    .where("id", request.fileName[0])
                    .del();
                  await knex("summary")
                    .where("fileId", request.fileName[0])
                    .del();
                  await knex("notification")
                    .where({ objectId: job.id })
                    .update({ message: "failed" });
                  done(new Error("File updated failed"));
                  return;
                }

                if (docs.length > 0) {
                  logger.info(`Document split successfully`);
                  logger.info(
                    `Creating and storing embeddings on vector database`
                  );
                  team
                    .getTeamUUID(request.teamId)
                    .then((uuid) => {
                      documents
                        .createAndStoreEmbeddingsOnIndex(
                          docs,
                          uuid,
                          request.fileName[0],
                          request.originalname.split('.').pop()
                        )
                        .then(async (res) => {
                          documents
                            .checkIfFileExists(request.fileName[0])
                            .then(async (res) => {
                              if (res == 1) {
                                if (
                                  fs.existsSync(
                                    request.filePath +
                                      "/" +
                                      request.fileFullName
                                  )
                                ) {
                                  if(process.env.GOOGLE_CLOUD_STORAGE == 1) {
                                    await fs2.unlink(path.join(request.filePath, request.fileFullName));
                                  }
                                  if (
                                    request.file.mimetype ==
                                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                                    request.file.mimetype ==
                                      "application/vnd.ms-excel"
                                  ) {
                                    documents.removeTempCSVFile(
                                      request.fileName[0]
                                    );
                                  }
                                  if (
                                    request.file.mimetype == "application/pdf"
                                  ) {
                                    extractor.clearTempFiles(request.userId);
                                  }
                                  if (
                                    request.file.mimetype ==
                                      "application/msword" ||
                                    request.file.mimetype ==
                                      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                  ) {
                                    documents.deleteTempTextFile(
                                      request.userId
                                    );
                                  }

                                  logger.info(
                                    `Embeddings created and stored on vector database`
                                  );
                                  await knex("documents")
                                    .where("id", request.fileName[0])
                                    .update({ isNotAnalyzed: false });
                                  await knex("notification")
                                    .where({ objectId: job.id })
                                    .update({ message: "successfull" });
                                  done();
                                } else {
                                  logger.warn(`Failed to create embeddings`);
                                  const document = await knex("documents")
                                    .where("id", request.fileName[0])
                                    .del();
                                  await knex("summary")
                                    .where("fileId", request.fileName[0])
                                    .del();
                                  await knex("notification")
                                    .where({ objectId: job.id })
                                    .update({ message: "failed" });
                                  done(
                                    new Error("Failed to create embeddings")
                                  );
                                  return;
                                }
                              } else {
                                logger.warn(`Failed to create embeddings`);
                                const document = await knex("documents")
                                  .where("id", request.fileName[0])
                                  .del();
                                await knex("summary")
                                  .where("fileId", request.fileName[0])
                                  .del();
                                await knex("notification")
                                  .where({ objectId: job.id })
                                  .update({ message: "failed" });
                                done(new Error("Failed to create embeddings"));
                                return;
                              }
                            })
                            .catch(async (err) => {
                              console.log(err);
                              logger.warn(`Failed to create embeddings`);
                              logger.error(err);
                              const document = await knex("documents")
                                .where("id", request.fileName[0])
                                .del();
                              await knex("summary")
                                .where("fileId", request.fileName[0])
                                .del();
                              await knex("notification")
                                .where({ objectId: job.id })
                                .update({ message: "failed" });
                              one(new Error("Failed to create embeddings"));
                              return;
                            });
                        })
                        .catch(async (err) => {
                          console.log(err);
                          logger.warn(`Failed to create embeddings`);
                          logger.error(err);
                          const document = await knex("documents")
                            .where("id", request.fileName[0])
                            .del();
                          await knex("summary")
                            .where("fileId", request.fileName[0])
                            .del();
                          await knex("notification")
                            .where({ objectId: job.id })
                            .update({ message: "failed" });
                          done(new Error(err));
                          return;
                        });
                    })
                    .catch(async (err) => {
                      console.log(err);
                      logger.warn(`Failed to create embeddings`);
                      logger.error(err);
                      const document = await knex("documents")
                        .where("id", request.fileName[0])
                        .del();
                      await knex("summary")
                        .where("fileId", request.fileName[0])
                        .del();
                      await knex("notification")
                        .where({ objectId: job.id })
                        .update({ message: "failed" });
                      done(new Error(err));
                      return;
                    });
                } else {
                  logger.warn(`File upload failed`);
                  const document = await knex("documents")
                    .where("id", request.fileName[0])
                    .del();
                  await knex("summary")
                    .where("fileId", request.fileName[0])
                    .del();
                  await knex("notification")
                    .where({ objectId: job.id })
                    .update({ message: "failed" });
                  done(new Error(`File upload failed`));
                  return;
                }
              } else {
                logger.warn(`File upload failed`);
                const document = await knex("documents")
                  .where("id", request.fileName[0])
                  .del();
                await knex("summary")
                  .where("fileId", request.fileName[0])
                  .del();
                await knex("notification")
                  .where({ objectId: job.id })
                  .update({ message: "failed" });
                done(new Error(`File upload failed`));
                return;
              }
            } else {
              logger.warn(
                `File upload failed, unable to find the file on server`
              );
              const document = await knex("documents")
                .where("id", request.fileName[0])
                .del();
              await knex("summary").where("fileId", request.fileName[0]).del();
              await knex("notification")
                .where({ objectId: job.id })
                .update({ message: "failed" });
              done(
                new Error(
                  `File upload failed, unable to find the file on server`
                )
              );
              return;
            }
          })
          .catch(async (err) => {
            console.log(err);
            logger.warn(
              `File upload failed, unable to find the file on server`
            );
            logger.error(err);
            const document = await knex("documents")
              .where("id", request.fileName[0])
              .del();

            done(new Error(err));
            return;
          });
      }
    } else {
      if(process.env.GOOGLE_CLOUD_STORAGE == 1) {
        await fs2.unlink(path.join(request.filePath, request.fileFullName));
      }
      logger.info(`You have reached maximum storage capacity`);
      const document = await knex("documents")
        .where("id", request.fileName[0])
        .del();
      await knex("notification")
        .where({ objectId: job.id })
        .update({ message: "failed" });
      done(new Error(`You have reached maximum storage capacity`));
    }
  });
}

const fileUpload = async ({ jobData, response, retry = false }) => {
  const created = new Date();
  const year = created.getUTCFullYear();
  const month = String(created.getUTCMonth() + 1).padStart(2, '0');
  const day = String(created.getUTCDate()).padStart(2, '0');
  const hours = String(created.getUTCHours()).padStart(2, '0');
  const minutes = String(created.getUTCMinutes()).padStart(2, '0');
  const seconds = String(created.getUTCSeconds()).padStart(2, '0');
  response.status(201).send({ jobId: jobData.fileName[0],success:true,status:'pending',message:'File uploaded successfully. Processing has started.' });
  const mysqlTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  if(!retry){
    const newNotification = await knex("notification").insert({
      userId: jobData.userId,
      title: jobData.file.originalname+' ('+((jobData.size / 1000).toFixed(2)+'kb')+')',
      message: "uploading",
      type: "file",
      objectId: jobData.fileName[0],
      created: mysqlTimestamp
    });
    logger.info(`Job Id: ${jobData.fileName[0]} - Notification Id: ${newNotification[0]}`)
    await knex("file_deletions").insert({
      fileId: jobData.fileName[0],
      uuid: jobData.uuid,
      fileFullName: jobData.fileFullName,
      created: mysqlTimestamp,
      notificationId: newNotification[0],
    });
  }

  // await knex('notification')
  //   .where({ jobId: jobData.fileName[0] })
  //   .update({ message: 'failed' })

  // new Error('Testing the error')
  // return;

  const request = jobData;
  const documents = new Documents(knex);
  const team = new Team(knex);
  const extractor = new PDFExtractor();
  const storageDetails = await documents.getStorageOccupationDetail(
    request.company
  );
  function convertToKilobytes(formattedSize) {
    const sizes = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const [value, unit] = formattedSize.split(' ');
    const index = sizes.indexOf(unit);

    return parseFloat(value) * Math.pow(1000, index);
  }
  const usedStorage = convertToKilobytes(storageDetails) || 0;
  const maxStorageSetting = await getAdminSetting("MAX_STORAGE");
  const maxStorage = parseFloat(maxStorageSetting * 1024 * 1024);

  if (usedStorage <= maxStorage) {
    logger.info(
      `Uploading new document on team Id ${request.teamId}`
    );

    let Summary = "";
    let Overview = "";
    let mimetype =request.file.mimetype;
      if(mimetype=='application/octet-stream'){
        mimetype= mime.lookup(request.file.originalname);
      }
    try {
      await knex("notification")
      .where({ objectId: jobData.fileName[0] })
      .update({ message: "Generating Summary" });
      if (
        mimetype == "image/jpeg" ||
        mimetype == "image/jpg"
      ) {
        const { summary } = await imageSummary(
          request.file.filename
        );
        Summary = summary;
      } else if (mimetype == "video/mp4") {
        const { summary } = await videoSummary(
          request.file.filename
        );
        Summary = summary;
      } else if (mimetype == "audio/mpeg") {
        const { summary } = await audioSummary(
          request.file.filename
        );
        Summary = summary;
      } else if (
        mimetype == "image/png" ||
        mimetype == "image/mov"
      ) {
        const { summary } = await imageSummary(
          request.file.filename
        );
        Summary = summary;
      } else if (mimetype == "video/quicktime") {
        const { summary } = await videoSummary(
          request.file.filename
        );
        Summary = summary;
      }
    } catch (error) {
      logger.error(
        `Error generating description of the multimedia ${request.fileName}`
      );
      logger.error(error);
      console.log(error)
      const document = await knex("documents")
        .where("id", request.fileName[0])
        .del();
      await knex("notification")
        .where({ objectId: jobData.fileName[0] })
        .update({ message: "failed" });

      return;
    }

    if (request.file) {
      logger.info(`Checking if the file uploaded on server`);
      documents
        .checkIfFileExists(request.fileName[0])
        .then(async (res) => {
          if (res == 1) {
            if (
              mimetype != "image/png" &&
              mimetype != "audio/mpeg" &&
              mimetype != "video/mp4" &&
              mimetype != "image/jpeg" &&
              mimetype != "image/jpg" &&
              mimetype != "video/quicktime" &&
              mimetype != "image/mov"
            ) {
              const summary = await summarizer(
                path.join(request.filePath, request.fileFullName),
                request.fileName[0],
                request.file.originalname,
                request.userId
              );
              if (summary.success === true) {
                Summary = summary.outputText;
                Overview = summary.overviewOutputText;
                const dateTime = new Date();
                await knex("summary")
                  .where({
                    fileId: request.fileName[0],
                    fileName: request.file.originalname,
                    teamId: request.teamId,
                  })
                  .then((existingData) => {
                    if (existingData.length === 0) {
                      return knex("summary")
                        .insert({
                          fileId: request.fileName[0],
                          teamId: request.teamId,
                          fileName: request.file.originalname,
                          notes: Summary,
                          overview: Overview,
                          created: dateTime,
                        })
                        .then(() => {
                          logger.info({
                            message: "Summary insertion completed",
                          });
                        })
                        .catch(async (error) => {
                          logger.info({
                            error: "Internal Server Error",
                            error: error,
                          });
                          const document = await knex("documents")
                            .where("id", request.fileName[0])
                            .del();
                          await knex("notification")
                            .where({ objectId: jobData.fileName[0] })
                            .update({ message: "failed" });

                          return;
                        });
                    } else {
                      logger.info("Data already exists.");
                      
                    }
                  })
                  .catch(async (error) => {
                    logger.error("Error checking data:", error);
                    const document = await knex("documents")
                      .where("id", request.fileName[0])
                      .del();
                    await knex("notification")
                      .where({ objectId: jobData.fileName[0] })
                      .update({ message: "failed" });

                    return;
                  });
              }
            } else if (Summary.length > 0) {
              const dateTime = new Date();
              await knex("summary")
                .where({
                  fileId: request.fileName[0],
                  fileName: request.file.originalname,
                  teamId: request.teamId,
                })
                .then((existingData) => {
                  if (existingData.length === 0) {
                    return knex("summary")
                      .insert({
                        fileId: request.fileName[0],
                        teamId: request.teamId,
                        fileName: request.file.originalname,
                        notes: Summary,
                        overview: "",
                        created: dateTime,
                      })
                      .then(() => {
                        logger.info({
                          message: "Summary insertion completed",
                        });
                      })
                      .catch(async (error) => {
                        logger.info({
                          error: "Internal Server Error",
                          error: error,
                        });
                        const document = await knex("documents")
                          .where("id", request.fileName[0])
                          .del();
                        await knex("notification")
                          .where({ objectId: jobData.fileName[0] })
                          .update({ message: "failed" }); // response.end()

                        return;
                      });
                  } else {
                    logger.info("Data already exists.");
                  }
                })
                .catch(async (error) => {
                  logger.error("Error checking data:", error);
                  const document = await knex("documents")
                    .where("id", request.fileName[0])
                    .del();
                  await knex("notification")
                    .where({ objectId: jobData.fileName[0] })
                    .update({ message: "failed" });

                  return;
                });
            }
            if (
              fs.existsSync(request.filePath + "/" + request.fileFullName)
            ) {
              logger.info(
                `File uploaded successfully, splitting the document into chunks`
              );
              let docs = [];
              if (
                 mimetype ==
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              ) {
                await knex("notification")
                .where({ objectId: jobData.fileName[0] })
                .update({ message: "Analyzing Document" });
        

                logger.info(`DOCX File uploaded successfully`);
                docs = await documents.createDocumentFromDocx(
                  path.join(request.filePath, request.fileFullName),
                  request.fileName[0],
                  request.file.originalname,
                  Summary,
                  Overview
                );
              } else if (mimetype == "application/pdf") {
                docs = await documents.createDocumentFromPDF(
                  path.join(request.filePath, request.fileFullName),
                  request.fileName[0],
                  request.file.originalname,
                  Summary,
                  Overview
                );
                if (docs.length > 0) {
                  await knex("notification")
                  .where({ objectId: jobData.fileName[0] })
                  .update({ message: "Extracting Data" });
          

                  logger.info(`PDF File uploaded successfully`);
                } else {
                  await knex("notification")
                  .where({ objectId: jobData.fileName[0] })
                  .update({ message: "Extracting Data" });
          

                  const textURL = await extractor.convertPDFToText(
                    path.join(request.filePath, request.fileFullName),
                    request.userId,
                    request.fileName[0]
                  );
                  docs = await documents.createDocumentFromText(
                    textURL,
                    request.fileName[0],
                    request.file.originalname,
                    Summary,
                    Overview
                  );
                  await knex("notification")
                  .where({ objectId: jobData.fileName[0] })
                  .update({ message: "Analyzing Document" });

                  logger.info(`PDF_LOW File uploaded successfully`);
                }
              } else if (mimetype == "text/plain") {
                logger.info(`TEXT File uploaded successfully`);
                await knex("notification")
                .where({ objectId: jobData.fileName[0] })
                .update({ message: "Analyzing Document" });

                docs = await documents.createDocumentFromText(
                  path.join(request.filePath, request.fileFullName),
                  request.fileName[0],
                  request.file.originalname,
                  Summary,
                  Overview
                );
              } else if (
                mimetype ==
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              ) {
                await knex("notification")
                .where({ objectId: jobData.fileName[0] })
                .update({ message: "Analyzing Document" });

                logger.info(`XLSX File uploaded successfully`);
                let isCsvFileCreated =
                  await documents.createTempCSVFileForXLSXFile(
                    request.filePath,
                    request.fileName,
                    "xlsx"
                  );
                if (isCsvFileCreated == 1) {
                  docs = await documents.createDocumentFromCSV(
                    path.join(
                      path.resolve(`${process.env.TMP_CSV_PATH}`),
                      `${request.fileName[0]}.csv`
                    ),
                    request.fileName[0],
                    request.file.originalname,
                    Summary,
                    Overview
                  );
                }
              } else if (
                mimetype == "application/vnd.ms-excel"
              ) {
                await knex("notification")
                .where({ objectId: jobData.fileName[0] })
                .update({ message: "Analyzing Document" });

                logger.info(`XLS File uploaded successfully`);
                let isCsvFileCreated =
                  await documents.createTempCSVFileForXLSXFile(
                    request.filePath,
                    request.fileName,
                    "xls"
                  );
                if (isCsvFileCreated == 1) {
                  docs = await documents.createDocumentFromCSV(
                    path.join(
                      path.resolve(`${process.env.TMP_CSV_PATH}`),
                      `${request.fileName[0]}.csv`
                    ),
                    request.fileName[0],
                    request.file.originalname,
                    Summary,
                    Overview
                  );
                }
              } else if (mimetype == "application/msword") {
                await knex("notification")
                .where({ objectId: jobData.fileName[0] })
                .update({ message: "Analyzing Document" });

                logger.info(`DOC File uploaded successfully`);
                const textFilePath =
                  await documents.extractTextFromDocAndCreateTextFile(
                    path.join(request.filePath, request.fileFullName),
                    request.userId,
                    request.fileName[0]
                  );
                docs = await documents.createDocumentFromText(
                  textFilePath,
                  request.fileName[0],
                  request.file.originalname,
                  Summary,
                  Overview
                );
              } else if (
                mimetype ==
                "application/vnd.openxmlformats-officedocument.presentationml.presentation"
              ) {
                await knex("notification")
                .where({ objectId: jobData.fileName[0] })
                .update({ message: "Analyzing Document" });

                logger.info(`PPTX File uploaded successfully`);
                const textFilePath =
                  await documents.extractTextFromPPTXAndCreateTextFile(
                    path.join(request.filePath, request.fileFullName),
                    request.userId,
                    request.fileName[0]
                  );
                docs = await documents.createDocumentFromText(
                  textFilePath,
                  request.fileName[0],
                  request.file.originalname,
                  Summary,
                  Overview
                );
              } else if (
                mimetype == "image/jpeg" ||
                mimetype == "image/jpg" ||
                mimetype == "image/png"
              ) {
                await knex("notification")
                .where({ objectId: jobData.fileName[0] })
                .update({ message: "Analyzing Document" });
                logger.info(`Image File uploaded successfully`);
                docs = await documents.createDocumentFromImage(
                  path.join(request.filePath, request.fileFullName),
                  request.fileName[0],
                  request.file.originalname,
                  Summary
                );
              } else if (mimetype == "video/mp4") {
                await knex("notification")
                .where({ objectId: jobData.fileName[0] })
                .update({ message: "Analyzing Document" });

                logger.info(`Video File uploaded successfully`);
                docs = await documents.createDocumentFromVideo(
                  path.join(request.filePath, request.fileFullName),
                  request.fileName[0],
                  request.file.originalname,
                  Summary
                );
              } else if (mimetype == "audio/mpeg") {
                logger.info(`Audio File uploaded successfully`);
                await knex("notification")
                .where({ objectId: jobData.fileName[0] })
                .update({ message: "Analyzing Document" });

                docs = await documents.createDocumentFromAudio(
                  path.join(request.filePath, request.fileFullName),
                  request.fileName[0],
                  request.file.originalname,
                  Summary
                );
              } else if (mimetype == "video/quicktime") {
                logger.info(`Video File uploaded successfully`);
                await knex("notification")
                .where({ objectId: jobData.fileName[0] })
                .update({ message: "Analyzing Document" });

                docs = await documents.createDocumentFromVideo(
                  path.join(request.filePath, request.fileFullName),
                  request.fileName[0],
                  request.file.originalname,
                  Summary
                );
              } else {
                logger.info(`File updated failed`);
                const document = await knex("documents")
                  .where("id", request.fileName[0])
                  .del();
                await knex("summary")
                  .where("fileId", request.fileName[0])
                  .del();
                await knex("notification")
                  .where({ objectId: jobData.fileName[0] })
                  .update({ message: "failed" });
                return;
              }

              if (docs.length > 0) {
                logger.info(`Document split successfully`);
                logger.info(
                  `Creating and storing embeddings on vector database`
                );
                team
                  .getTeamUUID(request.teamId)
                  .then((uuid) => {
                    documents
                      .createAndStoreEmbeddingsOnIndex(
                        docs,
                        uuid,
                        parseInt(request.fileName[0]),
                        request.file.originalname.split('.').pop()
                      )
                      .then(async (res) => {
                        documents
                          .checkIfFileExists(request.fileName[0])
                          .then(async (res) => {
                            if (res == 1) {
                              if (
                                fs.existsSync(
                                  request.filePath +
                                    "/" +
                                    request.fileFullName
                                )
                              ) {
                                if(process.env.GOOGLE_CLOUD_STORAGE == 1) {
                                  await fs2.unlink(path.join(request.filePath, request.fileFullName));
                                }
                                if (
                                  mimetype ==
                                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                                  mimetype ==
                                    "application/vnd.ms-excel"
                                ) {
                                  documents.removeTempCSVFile(
                                    request.fileName[0]
                                  );
                                }
                                if (
                                  mimetype == "application/pdf"
                                ) {
                                  extractor.clearTempFiles(request.userId);
                                }
                                if (
                                  mimetype ==
                                    "application/msword" ||
                                  mimetype ==
                                    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                ) {
                                  documents.deleteTempTextFile(
                                    request.userId
                                  );
                                }

                                logger.info(
                                  `Embeddings created and stored on vector database`
                                );
                                await knex("documents")
                                  .where("id", request.fileName[0])
                                  .update({ isNotAnalyzed: false });
                                await knex("notification")
                                  .where({ objectId: jobData.fileName[0] })
                                  .update({ message: "successfull" });
                                if(process.env.CACHE_MODE == 0){
                                  await knex('file_metadata_retries')
                                  .where({ jid: jobData.fileName[0] })
                                  .del()
                                }
                                return 100;
                              } else {
                                logger.warn(`Failed to create embeddings`);
                                const document = await knex("documents")
                                  .where("id", request.fileName[0])
                                  .del();
                                await knex("summary")
                                  .where("fileId", request.fileName[0])
                                  .del();
                                await knex("notification")
                                  .where({ objectId: jobData.fileName[0] })
                                  .update({ message: "failed" });
                              
                                return;
                              }
                            } else {
                              logger.warn(`Failed to create embeddings`);
                              const document = await knex("documents")
                                .where("id", request.fileName[0])
                                .del();
                              await knex("summary")
                                .where("fileId", request.fileName[0])
                                .del();
                              await knex("notification")
                                .where({ objectId: jobData.fileName[0] })
                                .update({ message: "failed" });
                              
                              return;
                            }
                          })
                          .catch(async (err) => {
                            console.log(err);
                            logger.warn(`Failed to create embeddings`);
                            logger.error(err);
                            const document = await knex("documents")
                              .where("id", request.fileName[0])
                              .del();
                            await knex("summary")
                              .where("fileId", request.fileName[0])
                              .del();
                            await knex("notification")
                              .where({ objectId: jobData.fileName[0] })
                              .update({ message: "failed" });
                            return;
                          });
                      })
                      .catch(async (err) => {
                        console.log(err);
                        logger.warn(`Failed to create embeddings`);
                        logger.error(err);
                        const document = await knex("documents")
                          .where("id", request.fileName[0])
                          .del();
                        await knex("summary")
                          .where("fileId", request.fileName[0])
                          .del();
                        await knex("notification")
                          .where({ objectId: jobData.fileName[0] })
                          .update({ message: "failed" });
                        
                        return;
                      });
                  })
                  .catch(async (err) => {
                    console.log(err);
                    logger.warn(`Failed to create embeddings`);
                    logger.error(err);
                    const document = await knex("documents")
                      .where("id", request.fileName[0])
                      .del();
                    await knex("summary")
                      .where("fileId", request.fileName[0])
                      .del();
                    await knex("notification")
                      .where({ objectId: jobData.fileName[0] })
                      .update({ message: "failed" });

                    return;
                  });
              } else {
                logger.warn(`File upload failed`);
                const document = await knex("documents")
                  .where("id", request.fileName[0])
                  .del();
                await knex("summary")
                  .where("fileId", request.fileName[0])
                  .del();
                await knex("notification")
                  .where({ objectId: jobData.fileName[0] })
                  .update({ message: "failed" });

                return;
              }
            } else {
              logger.warn(`File upload failed`);
              const document = await knex("documents")
                .where("id", request.fileName[0])
                .del();
              await knex("summary")
                .where("fileId", request.fileName[0])
                .del();
              await knex("notification")
                .where({ objectId: jobData.fileName[0] })
                .update({ message: "failed" });

              return;
            }
          } else {
            logger.warn(
              `File upload failed, unable to find the file on server`
            );
            const document = await knex("documents")
              .where("id", request.fileName[0])
              .del();
            await knex("summary").where("fileId", request.fileName[0]).del();
            await knex("notification")
              .where({ objectId: jobData.fileName[0] })
              .update({ message: "failed" });

            return;
          }
        })
        .catch(async (err) => {
          console.log(err);
          logger.warn(
            `File upload failed, unable to find the file on server`
          );
          logger.error(err);
          const document = await knex("documents")
            .where("id", request.fileName[0])
            .del();
          
          await knex("notification")
          .where({ objectId: jobData.fileName[0] })
          .update({ message: "failed" });

          return;
        });
    }
  } else {
    if(process.env.GOOGLE_CLOUD_STORAGE == 1) {
      await fs2.unlink(path.join(request.filePath, request.fileFullName));
    }
    logger.info(`You have reached maximum storage capacity`);
    const document = await knex("documents")
      .where("id", request.fileName[0])
      .del();
    await knex("notification")
      .where({ objectId: job.id })
      .update({ message: "failed" });
  }
}

// dropbox

// app.get('/dropbox/auth', (req, res) => {
//   req.session.userId = req.query.userId;
//   const clientId = process.env.DROPBOX_APP_KEY;
//   const redirectUri = `${process.env.BACKEND_URL}/dropbox/callback`;
//   const dropboxAuthUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&token_access_type=offline`;


//   res.redirect(dropboxAuthUrl);
// });

async function getDropboxFiles(accessToken, path = '') {
  try {
    // Step 1: List files from the given path
    const response = await axios.post(
      'https://api.dropboxapi.com/2/files/list_folder',
      {
        path,
        recursive: true,
        include_media_info: true,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        include_mounted_folders: true,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const entries = response.data.entries;

    // Step 2: For each file, fetch a temporary download link
    const enrichedFiles = await Promise.all(
      entries
        .filter(file => file[".tag"] === "file")
        .map(async file => {
          try {
            const tempLinkRes = await axios.post(
              'https://api.dropboxapi.com/2/files/get_temporary_link',
              { path: file.path_lower },
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            return {
              ...file,
              downloadUrl: tempLinkRes.data.link, // Add download link
            };
          } catch (err) {
            logger.error(`Error getting temp link for ${file.name}:`, err.response?.data || err.message);
            return null;
          }
        })
    );

    return enrichedFiles.filter(Boolean); // Remove any nulls
  } catch (error) {
    logger.error('Error fetching Dropbox files:', error.response?.data || error.message);
    throw error;
  }
}

// app.get('/dropbox/callback', async (req, res) => {
//   const code = req.query.code;
//   const userId = req.session.userId
//   const CLIENT_ID = process.env.DROPBOX_APP_KEY;
//   const CLIENT_SECRET = process.env.DROPBOX_APP_SECRET;
//   const REDIRECT_URI = `${process.env.BACKEND_URL}/dropbox/callback`;

//   try {
//     // Exchange code for access and refresh tokens
//     const tokenResponse = await axios.post(
//       'https://api.dropboxapi.com/oauth2/token',
//       querystring.stringify({
//         code,
//         grant_type: 'authorization_code',
//         client_id: CLIENT_ID,
//         client_secret: CLIENT_SECRET,
//         redirect_uri: REDIRECT_URI,
//       }),
//       {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//         },
//       }
//     );

//     const { access_token, refresh_token, account_id } = tokenResponse.data;

//     // Get Dropbox user profile
//     const userInfoRes = await axios.post(
//       'https://api.dropboxapi.com/2/users/get_current_account',
//       null, // no body
//       {
//         headers: {
//           Authorization: `Bearer ${access_token}`,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     const user = userInfoRes.data;

//     const source = req.useragent;
//       const existing = await knex("user_integrations")
//       .where({ userId: userId, integrationId: "integration_2" })
//       .first();

//       if (existing) {
//         // Update existing record
//         await knex("user_integrations")
//           .where({ userId: userId, integrationId: "integration_2" })
//           .update({
//             integrationId: "integration_2",
//             name: "Dropbox",
//             accessToken: access_token,
//             refreshToken: refresh_token,
//             account: user.email,
//             source: source.isMobile ? "Mobile" : "Web",
//             time: new Date(),
//             login: true
//           });
//       } else {
//         // Insert new record
//         await knex("user_integrations")
//           .insert({
//             userId: userId,
//             integrationId: "integration_2",
//             name: "Dropbox",
//             accessToken: access_token,
//             refreshToken: refresh_token,
//             account: user.email,
//             source: source.isMobile ? "Mobile" : "Web",
//             time: new Date(),
//             login: true
//           });
//       }

//     const files = await getDropboxFiles(access_token);

//     if (access_token) {
//       res.send(`
//         <script>
//           const targetOrigin = '${process.env.FRONTEND_BASE_URL}';
//           const dropboxData = {
//             statusRes: true,
//             accessToken: '${access_token}',
//             refreshToken: '${refresh_token}',
//             profile: ${JSON.stringify(user)},
//             files: '${JSON.stringify(files)}',
//             source: '${source.isMobile ? "Mobile" : "Web"}',
//             dropbox: true,
//           };
//           window.opener.postMessage(dropboxData, targetOrigin);
//           window.close();
//         </script>
//       `);
//     } else {
//       res.send(`
//         <script>
//           const targetOrigin = '${process.env.FRONTEND_BASE_URL}';
//           const errorData = {
//             statusRes: false,
//             statusMessage: 'Authentication failed. Please try again.',
//           };
//           window.opener.postMessage(errorData, targetOrigin);
//           window.close();
//         </script>
//       `);
//     }
//   } catch (error) {
//     logger.error(error);
//     res.send(`
//       <script>
//         const targetOrigin = '${process.env.FRONTEND_BASE_URL}';
//         const errorData = {
//           statusRes: false,
//           statusMessage: 'Error during authentication. Please try again.',
//         };
//         window.opener.postMessage(errorData, targetOrigin);
//         window.close();
//       </script>
//     `);
//   }
// });

// app.get('/fetch-dropbox-file', async (req, res) => {
//   const dropboxUrl = req.query.url; // Get the Dropbox URL from the query parameter

//   try {
//       const response = await nfetch(dropboxUrl);
//       logger.info("Fetching file from dropbox")

//       // Check if the response is successful
//       if (!response.ok) {
//         logger.error(response.statusText)
//         logger.error(response)
//       }

//       // Get the data as a stream, so it is not fully loaded into memory
//       const dataStream = response.body;

//       // Extract the file name from the URL
//       const url = new URL(dropboxUrl);
//       const fileName = path.basename(url.pathname); // Get the file name
//       const extension = path.extname(fileName).toLowerCase(); // Get the file extension

//       // Determine the MIME type based on the file extension
//       const contentType = mime.lookup(extension) || 'application/octet-stream'; // Fallback to octet-stream if not found

//       // Set the correct content type and disposition headers
//       res.set('Content-Type', contentType);
//       res.set('Content-Disposition', `attachment; filename="${fileName}"`);

//       // Pipe the data stream directly to the response
//       dataStream.pipe(res);

//   } catch (error) {
//       logger.error('Error fetching file from Dropbox:', error);
//       res.status(500).send('Error fetching file');
//   }
// });

// slack

// app.get('/fetch-slack-file', async (req, res) => {
//   const slackUrl = req.query.url; // Get the Slack URL from the query parameter
//   const fileAccessToken = req.query.accessToken

//   try {
//     // Download the file
//     const fileResponse = await axios({
//       url: slackUrl,
//       method: 'GET',
//       headers: {
//         Authorization: `Bearer ${fileAccessToken}`,
//       },
//       responseType: 'stream',
//     });

//      // Extract the file name from the URL
//     const url = new URL(slackUrl);
//     const fileName = path.basename(url.pathname); // Get the file name
//     const extension = path.extname(fileName).toLowerCase(); // Get the file extension

//     // Determine the MIME type based on the file extension
//     const contentType = mime.lookup(extension) || 'application/octet-stream';
//     // Set the correct content type and disposition headers
//     res.set('Content-Type', contentType);
//     res.set('Content-Disposition', `attachment; filename="${fileName}"`);

//     // Write the file to the local filesystem
//     fileResponse.data.pipe(res);
//   } catch (error) {
//     console.error('Error downloading file from Slack:', error.message);
//   }
// });

// app.get('/slack/files', async (req, res) => {
//   const accessToken = req.headers['authorization']; // Ensure to pass the access token in the headers
//   try {
//     const response = await axios.get('https://slack.com/api/files.list', {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//       },
//       params: {
//         types: 'all',  // Ensure this includes all file types (you can customize this)
//         user: req.query.user
//       }
//     });

//     if (response.data.ok) {
//       const files = response.data.files; // This will contain the list of files
//       res.json({ statusRes: true, files });
//     } else {
//       logger.error('Failed to retrieve files:', response.data.error);
//       res.status(400).json({ statusRes: false, statusMessage: response.data.error });
//     }
//   } catch (error) {
//     logger.error('Error fetching files from Slack:', error);
//     res.status(500).json({ statusRes: false, statusMessage: 'Error fetching files.' });
//   }
// });



// app.get('/slack/callback', async (req, res) => {
//   const code = req.query.code;
//   const CLIENT_ID = process.env.SLACK_CLIENT_ID;
//   const CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET
//   const REDIRECT_URI = `${process.env.BACKEND_URL}/slack/callback`;
//   const userId =  req.query.state;

//   try {
//     // Exchange the authorization code for an access token
//     const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
//       params: {
//         client_id: CLIENT_ID,
//         client_secret: CLIENT_SECRET,
//         code,
//         redirect_uri: REDIRECT_URI,
//       },
//     });

//     const { authed_user } = response.data;
//     const userInfoResponse = await axios.get('https://slack.com/api/users.info', {
//       headers: {
//         Authorization: `Bearer ${authed_user.access_token}`, // This must be a user token, not bot token
//       },
//       params: {
//         user: authed_user.id,
//       },
//     });

//     const slackUser = userInfoResponse.data.user;

//     const source = req.useragent;
//     const existing = await knex("user_integrations")
//     .where({ userId: userId, integrationId: "integration_4" })
//     .first();

//     if (existing) {
//       // Update existing record
//       await knex("user_integrations")
//         .where({ userId: userId, integrationId: "integration_4" })
//         .update({
//           integrationId: "integration_4",
//           name: "Slack",
//           accessToken: authed_user.access_token,
//           refreshToken: authed_user.id,
//           account: slackUser.profile.email,
//           source: source.isMobile ? "Mobile" : "Web",
//           time: new Date(),
//           login: true
//         });
//     } else {
//       // Insert new record
//       await knex("user_integrations")
//         .insert({
//           userId: userId,
//           integrationId: "integration_4",
//           name: "Wordpress",
//           accessToken: authed_user.access_token,
//           refreshToken: authed_user.id,
//           account: slackUser.profile.email,
//           source: source.isMobile ? "Mobile" : "Web",
//           time: new Date(),
//           login: true
//         });
//     }

//     if (authed_user.access_token) {
//       // Send data back to the client in a script
//       res.send(`
//         <script>
//           const targetOrigin = '${process.env.FRONTEND_BASE_URL}';
//           const slackData = {
//             statusRes: true,
//             accessToken: '${authed_user.access_token}',
//             profile: '${slackUser.profile.email}',
//             source: '${source.isMobile ? "Mobile" : "Web"}',
//             user: '${authed_user.id}',
//             slack: true,
//           };
//           window.opener.postMessage(slackData, targetOrigin);
//           window.close();
//         </script>
//       `);
//     } else {
//       // Handle authentication failure
//       res.send(`
//         <script>
//           const targetOrigin = '${process.env.FRONTEND_BASE_URL}';
//           const errorData = {
//             statusRes: false,
//             statusMessage: 'Authentication failed. Please try again.',
//           };
//           window.opener.postMessage(errorData, targetOrigin);
//           window.close();
//         </script>
//       `);
//     }
//   } catch (error) {
//     logger.error(error);
//     // Handle error during the request
//     res.send(`
//       <script>
//         const targetOrigin = '${process.env.FRONTEND_BASE_URL}';
//         const errorData = {
//           statusRes: false,
//           statusMessage: 'Error during authentication. Please try again.',
//         };
//         window.opener.postMessage(errorData, targetOrigin);
//         window.close();
//       </script>
//     `);
//   }
// });

// wordpress

// app.get('/wordpress/auth', (req, res) => {
//   req.session.userId = req.query.userId;
//   const clientId = process.env.WORDPRESS_CLIENT_ID;
//   const redirectUri = `${process.env.BACKEND_URL}/auth/providers/wordpress/callback`;
//   const wordpressAuthUrl = `https://public-api.wordpress.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=global`
  
//   res.redirect(wordpressAuthUrl);
// });

// app.get('/wordpress/callback', async (req, res) => {
//   const code = req.query.code;
//   const CLIENT_ID = process.env.WORDPRESS_CLIENT_ID;
//   const CLIENT_SECRET = process.env.WORDPRESS_CLIENT_SECRET
//   const REDIRECT_URI = `${process.env.BACKEND_URL}/auth/providers/wordpress/callback`;
//   const userId =  req.session.userId
//   try {
//     // Exchange the authorization code for an access token
//       const response = await axios.post('https://public-api.wordpress.com/oauth2/token', 
//         querystring.stringify({
//           client_id: CLIENT_ID,
//           client_secret: CLIENT_SECRET,
//           code,
//           grant_type: 'authorization_code',
//           redirect_uri: REDIRECT_URI,
//         }),
//         {
//           headers: {
//             'Content-Type': 'application/x-www-form-urlencoded',
//           },
//         }
//       );
    
//     const { access_token } = response.data;

//     const userResponse = await axios.get('https://public-api.wordpress.com/rest/v1.1/me', {
//       headers: {
//         Authorization: `Bearer ${access_token}`,
//       },
//     });

//     const source = req.useragent;
//     const existing = await knex("user_integrations")
//     .where({ userId: userId, integrationId: "integration_5" })
//     .first();

//     if (existing) {
//       // Update existing record
//       await knex("user_integrations")
//         .where({ userId: userId, integrationId: "integration_5" })
//         .update({
//           integrationId: "integration_5",
//           name: "WordPress",
//           accessToken: access_token,
//           refreshToken: "",
//           account: userResponse.data.email,
//           source: source.isMobile ? "Mobile" : "Web",
//           time: new Date(),
//           login: true
//         });
//     } else {
//       // Insert new record
//       await knex("user_integrations")
//         .insert({
//           userId: userId,
//           integrationId: "integration_5",
//           name: "WordPress",
//           accessToken: access_token,
//           refreshToken: "",
//           account: userResponse.data.email,
//           source: source.isMobile ? "Mobile" : "Web",
//           time: new Date(),
//           login: true
//         });
//     }

//     if (access_token) {
//       // Send data back to the client in a script
//       res.send(`
//         <script>
//           const targetOrigin = '${process.env.FRONTEND_BASE_URL}';
//           const slackData = {
//             statusRes: true,
//             accessToken: '${access_token}',
//             profile: '${userResponse.data.email}',
//             source: '${source.isMobile ? "Mobile" : "Web"}',
//             wordpress: true,
//           };
//           window.opener.postMessage(slackData, targetOrigin);
//           window.close();
//         </script>
//       `);
//     } else {
//       // Handle authentication failure
//       res.send(`
//         <script>
//           const targetOrigin = '${process.env.FRONTEND_BASE_URL}';
//           const errorData = {
//             statusRes: false,
//             statusMessage: 'Authentication failed. Please try again.',
//           };
//           window.opener.postMessage(errorData, targetOrigin);
//           window.close();
//         </script>
//       `);
//     }
//   } catch (error) {
//     logger.error(error);
//     // Handle error during the request
//     res.send(`
//       <script>
//         const targetOrigin = '${process.env.FRONTEND_BASE_URL}';
//         const errorData = {
//           statusRes: false,
//           statusMessage: 'Error during authentication. Please try again.',
//         };
//         window.opener.postMessage(errorData, targetOrigin);
//         window.close();
//       </script>
//     `);
//   }
// });

// app.get(
//   "/wordpress/files",
//   async (req, res) => {
//     const ACCESS_TOKEN = req.headers['authorization'];
    
//     const response = await axios.get('https://public-api.wordpress.com/rest/v1.1/me/sites', {
//       headers: {
//         Authorization: `Bearer ${ACCESS_TOKEN}`,  // Use the user's access token
//       },
//     });

//     // Extract the list of sites from the response
//     let sites = response.data.sites[0]?.URL?.replace("https://", "") || '';
//     try {

//       let response= ''
//       try {
//         response = await axios.get(`https://public-api.wordpress.com/wp/v2/sites/${sites}/media`, {
//           headers: {
//             Authorization: `Bearer ${ACCESS_TOKEN}`, // Set the access token in the Authorization header
//           },
//         });
        
//       } catch (error) {
//         logger.error(error)
//       }
  
//       // Handle the response data (media files)
//       const mediaFiles = response.data;
//       logger.info("fetched wordpress files successfully")
//       // Optionally, you can return or process the media files as needed
//       res.json({ statusRes: true, files: mediaFiles });
  
//     } catch (error) {
//       console.log("error")
//       logger.error('Error fetching media files:', error.response ? error.response.data : error.message);
//       res.status(400).json({ statusRes: false, statusMessage: error });
//     }
//   }
// )

// app.get('/fetch-wordpress-file', async (req, res) => {
//   const wordpressUrl = req.query.url; // Get the URL from the query parameter
//   const fileAccessToken = req.query.accessToken

//   try {
//     // Download the file
//     const fileResponse = await axios({
//       url: wordpressUrl,
//       method: 'GET',
//       headers: {
//         Authorization: `Bearer ${fileAccessToken}`,
//       },
//       responseType: 'stream',
//     });

//      // Extract the file name from the URL
//     const url = new URL(wordpressUrl);
//     const fileName = path.basename(url.pathname); // Get the file name
//     const extension = path.extname(fileName).toLowerCase(); // Get the file extension

//     // Determine the MIME type based on the file extension
//     const contentType = mime.lookup(extension) || 'application/octet-stream';
//     // Set the correct content type and disposition headers
//     res.set('Content-Type', contentType);
//     res.set('Content-Disposition', `attachment; filename="${fileName}"`);

//     // Write the file to the local filesystem
//     fileResponse.data.pipe(res);
//   } catch (error) {
//     logger.error(error)
//     console.error('Error downloading file from Wordpress:', error.message);
//   }
// });
const parseAndValidateFields = (req, res, next) => {
  const fieldsParser = documentUpload.none();
  next();
}
const testfields = (req, res, next) => {
  console.log(req.body)
}
app.post(
  "/files/upload/:teamId",
  auth.verifyToken,
  fileUploadRateLimiter,
  auth.onlyAdminOrUser,
  documentUpload.single("file"),
  async function (request, response) {
    if(process.env.GOOGLE_CLOUD_STORAGE == 1) {
      try {
        let filePath = path.join(request.filePath, request.fileFullName)
        logger.info(`Uploading file on cloud: FileName: ${sanitizeForLog(request.originalName)} FileId: ${sanitizeForLog(request.fileName[0])}`)
        await storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME).upload(filePath, {
          destination: request.fileName[0],
        });
        logger.info("Successfully uploaded file on cloud")
      } catch (error) {
        console.log(error)
        logger.error("Error uploading file on cloud")
        logger.error(error)
        return response.status(500).json({
          message: "Error uploading file on cloud",
        });
      }
    }
    try {
      const jobData = {
        filePath: request.filePath,
        fileFullName: request.fileFullName,
        mimetype: request.file.mimetype,
        fileName: request.fileName,
        originalname: request.file.originalname,
        teamId: request.params.teamId,
        userId: request.decoded.userId,
        company: request.decoded.company,
        uuid: request.uuid,
        file: request.file,
        size:request.file.size
      };
      if(process.env.CACHE_MODE == 0){
        logger.info("cache mode off so inserting data in file_metadata_retries table")
        await knex('file_metadata_retries').insert(
          {
            jid: request.fileName[0],
            filePath: request.filePath,
            fileFullName: request.fileFullName,
            mimetype: request.file.mimetype,
            fileName: request.fileName,
            originalname: request.file.originalname,
            teamId: request.params.teamId,
            userId: request.decoded.userId,
            company: request.decoded.company,
            uuid: request.uuid,
            size:request.file.size
          }
        )
      }
      await knex('documents').where({id:jobData.fileName[0]}).update({size:((jobData.size / 1000).toFixed(2)+' kb'),creatorId:request.decoded.userId})
      // throw new Error("testing the error")
      if (process.env.SEPERATE_FILE_UPLOAD_SERVER === "1") {
        logger.info(`Passing request to different server for file upload`);
        const seperateServerResponse = await axios({
          method: "post",
          url: `${process.env.SEPERATE_FILE_UPLOAD_SERVER_URL + request.url}`,
          data: jobData,
          headers: { "Content-Type": "application/json" },
        });
        return response.status(200).json({
          message: seperateServerResponse.data.message,
        });
      } else {
        logger.info(`Processing file upload in main server`);
        if(process.env.CACHE_MODE == 1){
          const job = await fileUploadQueue.add({ jobData });
          return response.status(200).json({
            message: `Job ${job.id} added to the queue File upload and analysis initiated`,
            jobId: job.id
          });
        }
        else {
          const nrjob = await fileUpload({ jobData, response })
        }

      }
    } catch (error) {
      console.log(error);
      if (error.code === "ECONNREFUSED") {
        logger.error("Error connecting with seperate file upload server");
      }
      return response.status(500).json({
        message: "Error initiating file upload",
      });
    }
  }
);
const qs = require("qs");

app.post(
  "/integrations/:integrationId/files/:fileId/import/:teamId",
  auth.verifyToken,
  multer().none(),
  async (req, res) => {
          const teamId = req.params?.teamId;

    if(req.params.integrationId == "integration_1") {
    try {
      
      const  integrationFileId  = req.params?.fileId;
      const parentId = req.body?.folderId;
      const userId = req.decoded.userId;
      if (!integrationFileId) {
        return res.status(400).json({ message: "Missing internal file ID" });
      }

      // 1️⃣ Resolve Google fileId from internal ID
      const fileMap = await knex("integrations_files_map")
        .where({ internalId: integrationFileId, userId })
        .first();
      if (!fileMap) {
        return res.status(404).json({ message: "File not found in integration map" });
      }

      const googleFileId = fileMap.integrationFileId; 

      // 2️⃣ Refresh token
      const userIntegration = await knex("user_integrations")
        .where({ userId, integrationId: "integration_1" })
        .first();

      const tokenresponse = await axios.post("https://oauth2.googleapis.com/token", null, {
        params: {
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: userIntegration.refreshToken,
          grant_type: "refresh_token"
        }
      });

      const accessToken = tokenresponse.data.access_token;

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const drive = google.drive({ version: "v3", auth: oauth2Client });

      // 3️⃣ Get metadata
      const meta = await drive.files.get({
        fileId: googleFileId,
        fields: "name, mimeType, size"
      });

      const originalName = meta.data.name;
      const mimeType = meta.data.mimeType;

      // 4️⃣ Get team UUID (same as multer)
      const team = new Team(knex);
      const teamUUID = await team.getTeamUUID(teamId);

      req.uuid = teamUUID;  
      req.filePath = path.resolve(`${process.env.DOCUMENT_PATH}/${teamUUID}`);

      // Ensure folder exists
      const finalFolder = `${process.env.BACKEND_PATH}/documents/${teamUUID}`;
      if (!fs.existsSync(finalFolder)) fs.mkdirSync(finalFolder);

      // 5️⃣ Create file entry in DB (same as documentStorage.filename)
      const documents = new Documents(knex);
      const fileId = await documents.createFile(
        originalName,
        parentId ? parentId : 4,
        teamId,
        "Google Drive"
      );

      const fileFullName = fileId + path.extname(originalName);
      const localFilePath = path.join(finalFolder, fileFullName);

      // 6️⃣ Download file from Google → save into correct storage folder
      const stream = await drive.files.get(
        { fileId: googleFileId, alt: "media" },
        { responseType: "stream" }
      );

      await new Promise((resolve, reject) => {
        const write = fs.createWriteStream(localFilePath);
        stream.data.pipe(write);
        write.on("finish", resolve);
        write.on("error", reject);
      });

      // 7️⃣ Set values that multer sets for normal upload
      req.originalName = originalName;
      req.fileName = fileId;
      req.fileFullName = fileFullName;

      req.file = {
        path: localFilePath,
        originalname: originalName,
        mimetype: mimeType,
        size: meta.data.size,
      };

      // 8️⃣ Now pass to SAME upload processor (no duplication)
      return processUploadedFile(req, res);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ success:false,error:"server_error",message: "An unexpected error occured" });
    }
  }else if(req.params.integrationId == "integration_2"){
  try {
    const internalId = req.params.fileId;
    const parentId = req.body.folderId;
    const userId = req.decoded.userId;
    if(!teamId){
      return res.status(400).send({
        success: false,
        error: "bad_request",
        message: "Invalid or missing fields",
        details: [
          { field: "teamId", issue: "teamId is required" }
        ]
      })
    }

    if (!internalId) {
      return res.status(400).json({ message: "Missing internal file ID" });
    }

    // 1️⃣ Resolve Dropbox fileId
    const fileMap = await knex("integrations_files_map")
      .where({ internalId, userId })
      .first();

    if (!fileMap) {
      return res.status(404).json({ message: "File not found in integration map" });
    }

    const dropboxFileId = fileMap.integrationFileId;

    // 2️⃣ Refresh or use access token
    const userIntegration = await knex("user_integrations")
      .where({ userId, integrationId: "integration_2" })
      .first();

    let accessToken = userIntegration.accessToken;

    if (userIntegration.refreshToken) {
      const tokenRes = await axios.post(
        "https://api.dropboxapi.com/oauth2/token",
        qs.stringify({
          grant_type: "refresh_token",
          refresh_token: userIntegration.refreshToken,
          client_id: process.env.DROPBOX_APP_KEY,
          client_secret: process.env.DROPBOX_APP_SECRET,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      accessToken = tokenRes.data.access_token;
    }

    // 3️⃣ Get file metadata
    const metaRes = await axios.post(
      "https://api.dropboxapi.com/2/files/get_metadata",
      { path: dropboxFileId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    const originalName = metaRes.data.name;
    const mimeType = metaRes.data.mime_type || "application/octet-stream";
    const fileSize = metaRes.data.size;

    // 4️⃣ Get temp download link
    const linkRes = await axios.post(
      "https://api.dropboxapi.com/2/files/get_temporary_link",
      { path: dropboxFileId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    const downloadUrl = linkRes.data.link;

    // 5️⃣ Team UUID (same as multer)
    const team = new Team(knex);
    const teamUUID = await team.getTeamUUID(teamId);

    req.uuid = teamUUID;
    req.filePath = path.resolve(`${process.env.DOCUMENT_PATH}/${teamUUID}`);

    const finalFolder = `${process.env.BACKEND_PATH}/documents/${teamUUID}`;
    if (!fs.existsSync(finalFolder)) fs.mkdirSync(finalFolder);

    // 6️⃣ Create DB file entry
    const documents = new Documents(knex);
    const fileId = await documents.createFile(
      originalName,
      parentId ? parentId : 4,
      teamId,
      "Dropbox"
    );

    const fileFullName = fileId + path.extname(originalName);
    const localFilePath = path.join(finalFolder, fileFullName);

    // 7️⃣ Download file → Save locally
    const fileStream = fs.createWriteStream(localFilePath);

    const downloadStream = await axios.get(downloadUrl, {
      responseType: "stream",
    });

    await new Promise((resolve, reject) => {
      downloadStream.data.pipe(fileStream);
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    // 8️⃣ Set req fields like multer
    req.originalName = originalName;
    req.fileName = fileId;
    req.fileFullName = fileFullName;

    req.file = {
      path: localFilePath,
      originalname: originalName,
      mimetype: mimeType,
      size: fileSize,
    };

    // 9️⃣ Pass into same upload processor
    return processUploadedFile(req, res);

  } catch (err) {
    console.log(err);
    return res.status(500).json({ success:false,error:"server_error",message: "An unexpected error occured" });
  }


  }else if (req.params.integrationId == "integration_3") {
  try {
    const internalId = req.params?.fileId;
    const parentId = req.body?.folderId;
    const userId = req.decoded.userId;

    if(!teamId){
      return res.status(400).send({
      success: false,
      error: "bad_request",
      message: "Invalid or missing fields",
      details: [
        { field: "teamId", issue: "teamId is required" }
      ]
    })
    }
    if (!internalId) {
      return res.status(400).json({ message: "Missing internal file ID" });
    }

    // 1️⃣ Resolve actual OneDrive fileId
    const fileMap = await knex("integrations_files_map")
      .where({ internalId, userId })
      .first();

    if (!fileMap) {
      return res.status(404).json({ message: "File not found in integration map" });
    }

    const oneDriveFileId = fileMap.integrationFileId;

    // 2️⃣ Refresh OneDrive access token
    const userIntegration = await knex("user_integrations")
      .where({ userId, integrationId: "integration_3" })
      .first();

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

    // 3️⃣ Get metadata
    const metaRes = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/items/${oneDriveFileId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const originalName = metaRes.data.name;
    const mimeType = metaRes.data.file?.mimeType || "application/octet-stream";
    const fileSize = metaRes.data.size;

    // 4️⃣ Get download URL
    const dlRes = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/items/${oneDriveFileId}/content`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        maxRedirects: 0,
        validateStatus: (status) => status === 302  // Microsoft redirects to file URL
      }
    );

    const downloadUrl = dlRes.headers.location;

    // 5️⃣ Team UUID (same as multer)
    const team = new Team(knex);
    const teamUUID = await team.getTeamUUID(teamId);

    req.uuid = teamUUID;
    req.filePath = path.resolve(`${process.env.DOCUMENT_PATH}/${teamUUID}`);

    const finalFolder = `${process.env.BACKEND_PATH}/documents/${teamUUID}`;
    if (!fs.existsSync(finalFolder)) fs.mkdirSync(finalFolder);

    // 6️⃣ Create file entry in DB (same as dropbox/google)
    const documents = new Documents(knex);
    const fileId = await documents.createFile(
      originalName,
      parentId ? parentId : 4,
      teamId,
      "OneDrive"
    );

    const fileFullName = fileId + path.extname(originalName);
    const localFilePath = path.join(finalFolder, fileFullName);

    // 7️⃣ Download file → save
    const downloadStream = await axios.get(downloadUrl, { responseType: "stream" });

    await new Promise((resolve, reject) => {
      const fileWrite = fs.createWriteStream(localFilePath);
      downloadStream.data.pipe(fileWrite);
      fileWrite.on("finish", resolve);
      fileWrite.on("error", reject);
    });

    // 8️⃣ Set multer-like fields
    req.originalName = originalName;
    req.fileName = fileId;
    req.fileFullName = fileFullName;

    req.file = {
      path: localFilePath,
      originalname: originalName,
      mimetype: mimeType,
      size: fileSize,
    };

    // 9️⃣ Send into central upload processor
    return processUploadedFile(req, res);

  } catch (err) {
    console.log(err);
    return res.status(500).json({status:false,error:"server_error", message: "An unexpected error occured" });
  }
}else if (req.params.integrationId == "integration_4") {
  try {
    const internalId = req.params.fileId;
    const parentId = req.body.folderId;
    const userId = req.decoded.userId;

    if (!internalId) {
      return res.status(400).json({ message: "Missing internal file ID" });
    }

    // 1️⃣ Resolve real Slack fileId
    const fileMap = await knex("integrations_files_map")
      .where({ internalId, userId })
      .first();

    if (!fileMap) {
      return res.status(404).json({ message: "File not found in integration map" });
    }

    const slackFileId = fileMap.integrationFileId;

    // 2️⃣ Get Slack user integration info
    const userIntegration = await knex("user_integrations")
      .where({ userId, integrationId: "integration_4" })
      .first();

    if (!userIntegration) {
      return res.status(404).json({ message: "Slack integration not found" });
    }

    const accessToken = userIntegration.accessToken;

    // 3️⃣ Fetch Slack file metadata
    const metaRes = await axios.get("https://slack.com/api/files.info", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: { file: slackFileId }
    });

    if (!metaRes.data.ok) {
      return res.status(400).json({ message: "Slack file metadata fetch failed" });
    }

    const file = metaRes.data.file;

    const originalName = file.name;
    const mimeType = file.mimetype || "application/octet-stream";
    const fileSize = file.size;

    // Slack gives `url_private_download` for >90% of files.
    const downloadUrl = file.url_private_download;
    if (!downloadUrl) {
      return res.status(400).json({ message: "Slack cannot provide download URL for this file" });
    }

    // 4️⃣ Team UUID (same as multer)
    const team = new Team(knex);
    const teamUUID = await team.getTeamUUID(teamId);

    req.uuid = teamUUID;
    req.filePath = path.resolve(`${process.env.DOCUMENT_PATH}/${teamUUID}`);

    const finalFolder = `${process.env.BACKEND_PATH}/documents/${teamUUID}`;
    if (!fs.existsSync(finalFolder)) fs.mkdirSync(finalFolder);

    // 5️⃣ Create local DB entry
    const documents = new Documents(knex);
    const fileId = await documents.createFile(
      originalName,
      parentId ? parentId : 4,
      teamId,
      "slack"
    );

    const fileFullName = fileId + path.extname(originalName);
    const localFilePath = path.join(finalFolder, fileFullName);

    // 6️⃣ Download and save the file
    const downloadStream = await axios.get(downloadUrl, {
      responseType: "stream",
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    await new Promise((resolve, reject) => {
      const fileWrite = fs.createWriteStream(localFilePath);
      downloadStream.data.pipe(fileWrite);
      fileWrite.on("finish", resolve);
      fileWrite.on("error", reject);
    });

    // 7️⃣ Set multer-like fields
    req.originalName = originalName;
    req.fileName = fileId;
    req.fileFullName = fileFullName;

    req.file = {
      path: localFilePath,
      originalname: originalName,
      mimetype: mimeType,
      size: fileSize,
    };

    // 8️⃣ Send to main processor
    return processUploadedFile(req, res);

  } catch (err) {
    console.log(err);
    return res.status(500).json({ success:false,error:"server_error",message: "An unexpected error occured" });
  }
}else if (req.params.integrationId == "integration_5") {
  try {
    const internalId = req.params.fileId;
    const userId =req.decoded.userId;
    const teamId = req.params.teamId;
    const parentId = req.body.folderId;
 
if (!internalId) {
      return res.status(400).json({ message: "Missing internal file ID" });
    }
 
// 1️⃣ Resolve real WP Media Library file id
    const fileMap = await knex("integrations_files_map")
      .where({ internalId, userId })
      .first();


    if (!fileMap) {
      return res.status(404).json({ message: "File not found in integration map" });
    }


    const sourceUrl = fileMap.sourceUrl;  // This should be the URL provided by WordPress



    if (!sourceUrl) {
      return res.status(400).json({ message: "Missing WordPress source URL" });
    }


    // 1️⃣ Get WordPress integration access info
    const userIntegration = await knex("user_integrations")
      .where({ userId, integrationId: "integration_5" })
      .first();


    if (!userIntegration) {
      return res.status(404).json({ message: "WordPress integration not found" });
    }


    const accessToken = userIntegration.accessToken;


    // 2️⃣ Get site URL from WordPress API (required! for access)
    const siteResponse = await axios.get(
      "https://public-api.wordpress.com/rest/v1.1/me/sites",
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );


    const siteObj = siteResponse.data.sites[0];


    if (!siteObj?.URL) {
      return res.status(400).json({ message: "Unable to get WordPress site URL" });
    }


    let rawSiteURL = siteObj.URL || siteObj.url;
    let normalizedSite = rawSiteURL
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");

    // Normalize the file's URL (if needed)
    let fileURL = new URL(sourceUrl);
//     if (fileURL.hostname !== normalizedSite) {
//       return res.status(400).json({ message: "File URL does not match the expected WordPress site" });
//     }


    // 3️⃣ Get the file metadata (optional, if you need more details like MIME type, file size)
    const metaRes = await axios.get(sourceUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      }
    });


    const mimeType = metaRes.headers['content-type'] || "application/octet-stream";
    const originalName = path.basename(fileURL.pathname);  // Get file name from URL
    const downloadUrl = sourceUrl;  // Direct download URL


    // 4️⃣ Team UUID
    const team = new Team(knex);
    const teamUUID = await team.getTeamUUID(teamId);


    req.uuid = teamUUID;
    req.filePath = path.resolve(`${process.env.DOCUMENT_PATH}/${teamUUID}`);


    const finalFolder = `${process.env.BACKEND_PATH}/documents/${teamUUID}`;
    if (!fs.existsSync(finalFolder)) fs.mkdirSync(finalFolder);


    // 5️⃣ Create local DB entry
    const documents = new Documents(knex);
    const fileId = await documents.createFile(
      originalName,
      parentId ? parentId : 4,
      teamId,
      "WordPress"
    );


    const fileFullName = fileId + path.extname(downloadUrl);
    const localFilePath = path.join(finalFolder, fileFullName);


    // 6️⃣ Download & store the file
    const downloadStream = await axios.get(downloadUrl, {
      responseType: "stream",
      headers: { Authorization: `Bearer ${accessToken}` }
    });


    await new Promise((resolve, reject) => {
      const fileWrite = fs.createWriteStream(localFilePath);
      downloadStream.data.pipe(fileWrite);
      fileWrite.on("finish", resolve);
      fileWrite.on("error", reject);
    });


    // 7️⃣ Set multer-like fields
    req.originalName = originalName;
    req.fileName = fileId;
    req.fileFullName = fileFullName;


    req.file = {
      path: localFilePath,
      originalname: originalName,
      mimetype: mimeType,
      size: downloadStream.headers['content-length'] || 0
    };


    // 8️⃣ Process by main file processor
    return processUploadedFile(req, res);


  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, error: "server_error", message: "An unexpected error occurred" });
  }
}else{
return res.status(400).send({success:false,message:"Invalid integration Id provided"})
}




  }
);

// app.post(
//   "/integrations/:integrationId/files/:fileId/import",
//   auth.verifyToken,
//   async (req, res,next) => {
//     try {
//       const integrationId = req.params.integrationId;
//       const integrationFileId = req.params.fileId;
//       const teamId = req.body.teamId;
//       const parentId = req.body.parentId;
//       const userId = req.decoded.userId;

//       if (!integrationFileId) {
//         return res.status(400).json({ message: "Missing internal file identifier" });
//       }

//       // Get Google fileId from your mapping table
//       const fileMap = await knex("integrations_files_map")
//         .where({ internalId: integrationFileId, userId })
//         .first();

//       if (!fileMap) {
//         return res.status(404).json({ message: "File not found in integration" });
//       }

//       const googleFileId = fileMap.integrationFileId;

//       // Get Google token using refresh token
//       const userIntegration = await knex("user_integrations")
//         .where({ userId, integrationId: "integration_1" })
//         .first();

//       const tokenresponse = await axios.post("https://oauth2.googleapis.com/token", null, {
//         params: {
//           client_id: process.env.GOOGLE_CLIENT_ID,
//           client_secret: process.env.GOOGLE_CLIENT_SECRET,
//           refresh_token: userIntegration.refreshToken,
//           grant_type: "refresh_token"
//         }
//       });

//       const accessToken = tokenresponse.data.access_token;

//       const oauth2Client = new google.auth.OAuth2();
//       oauth2Client.setCredentials({ access_token: accessToken });

//       const drive = google.drive({ version: "v3", auth: oauth2Client });

//       // Get Metadata
//       const meta = await drive.files.get({
//         fileId: googleFileId,
//         fields: "name, mimeType, size"
//       });

//       const fileName = meta.data.name;
//       const mimeType = meta.data.mimeType;

//       // Create temp folder
//       const tempPath = path.join(__dirname, "../temp_uploads");
//       if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath);

//       const tempFile = path.join(tempPath, fileName);

//       // Download the file from Google → Save locally
//       const fileStream = await drive.files.get(
//         { fileId: googleFileId, alt: "media" },
//         { responseType: "stream" }
//       );

//       await new Promise((resolve, reject) => {
//         const writeStream = fs.createWriteStream(tempFile);
//         fileStream.data.pipe(writeStream);
//         writeStream.on("finish", resolve);
//         writeStream.on("error", reject);
//       });

//       // Now send the file into your existing upload workflow
//       req.file = {
//         path: tempFile,
//         originalname: fileName,
//         mimetype: mimeType,
//         size: fs.statSync(tempFile).size
//       };
//       // Reuse your existing logic (same queue, same GCS upload)
//       return uploadIntegratedFile(req, res);

//     } catch (error) {
//       console.log(error);
//       return res.status(500).json({ message: "Failed to upload integration file" });
//     }
//   }
// );

async function processUploadedFile(request, response) {
  // 🔥 SAME CODE from your current upload endpoint
  // Build jobData, insert DB, upload to GCS, queue, etc
  console.log("req body after multer", request.body)
    if(process.env.GOOGLE_CLOUD_STORAGE == 1) {
      try {
        let filePath = path.join(request.filePath, request.fileFullName)
        logger.info(`Uploading file on cloud: FileName: ${sanitizeForLog(request.originalName)} FileId: ${sanitizeForLog(request.fileName[0])}`)
        await storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME).upload(filePath, {
          destination: request.fileName[0],
        });
        logger.info("Successfully uploaded file on cloud")
      } catch (error) {
        console.log(error)
        logger.error("Error uploading file on cloud")
        logger.error(error)
        return response.status(500).json({
          message: "Error uploading file on cloud",
        });
      }
    }
    try {
      let jobData = {
        filePath: request.filePath,
        fileFullName: request.fileFullName,
        mimetype: request.file.mimetype,
        fileName: request.fileName,
        originalname: request.file.originalname,
        teamId: request.params.teamId || request.body.teamId,
        userId: request.decoded.userId,
        company: request.decoded.company,
        uuid: request.uuid,
        file: request.file,
        size:request.file.size
      };
      console.log("job data", jobData)
      if(!jobData.file.filename){
        jobData.file.filename = jobData.fileFullName
      }
      if(process.env.CACHE_MODE == 0){
        logger.info("cache mode off so inserting data in file_metadata_retries table")
        await knex('file_metadata_retries').insert(
          {
            jid: request.fileName[0],
            filePath: request.filePath,
            fileFullName: request.fileFullName,
            mimetype: request.file.mimetype,
            fileName: request.fileName,
            originalname: request.file.originalname,
            teamId: request.params.teamId,
            userId: request.decoded.userId,
            company: request.decoded.company,
            uuid: request.uuid,
            size:request.file.size
          }
        )
      }
      await knex('documents').where({id:jobData.fileName[0]}).update({size:((jobData.size / 1000).toFixed(2)+' kb'),creatorId:request.decoded.userId})
      // throw new Error("testing the error")
      if (process.env.SEPERATE_FILE_UPLOAD_SERVER === "1") {
        logger.info(`Passing request to different server for file upload`);
        const seperateServerResponse = await axios({
          method: "post",
          url: `${process.env.SEPERATE_FILE_UPLOAD_SERVER_URL + request.url}`,
          data: jobData,
          headers: { "Content-Type": "application/json" },
        });
        return response.status(200).json({
          message: seperateServerResponse.data.message,
        });
      } else {
        logger.info(`Processing file upload in main server`);
        if(process.env.CACHE_MODE == 1){
          const job = await fileUploadQueue.add({ jobData });
          return response.status(200).json({
            message: `Job ${job.id} added to the queue File upload and analysis initiated`,
            fileId: job.id
          });
        }
        else {
          const nrjob = await fileUpload({ jobData, response })
        }

      }
    } catch (error) {
      console.log(error);
      if (error.code === "ECONNREFUSED") {
        logger.error("Error connecting with seperate file upload server");
      }
      return response.status(500).json({
        message: "Error initiating file upload",
      });
    }
}

app.post("/files/jobs/:id/retry", async function (req, res, next) {
  try {
  if(process.env.CACHE_MODE == 1){
    if (process.env.SEPERATE_FILE_UPLOAD_SERVER === "1") {
      logger.info("Sending retry job request to seperate file upload server");
      const serverResponse = await axios({
        method: "get",
        url: `${
          process.env.SEPERATE_FILE_UPLOAD_SERVER_URL +
          `/files/jobs/${req.params.id}/retry`
        }`,
      });
      return res.status(200).json({ message: "Retrying" });
    } else {
      logger.info("retrying file upload job in main server");
      const jobId = req.params.id;
      const job = await fileUploadQueue.getJob(jobId);
      await knex("notification")
        .where({ objectId: jobId })
        .update({ message: "uploading" });

      if (job) {
        await job.retry();
        // console.log(job)
        res.status(200).json({ message: "Retrying" });
      } else {
        res.status(200).json({ error: "Job not found" });
      }
    }
  }
  else {
    logger.info("retrying file upload job without chache in main server");
    const jobId = req.params.id;
    const rawJobData = await knex('file_metadata_retries')
      .select('*')
      .where('jid', jobId)
    rawJobData[0].fileName = [parseInt(rawJobData[0].fileName)]
     const jobData = {...rawJobData[0], file: {mimetype: rawJobData[0].mimetype, originalname: rawJobData[0].originalname}}
    await knex("notification")
      .where({ objectId: jobId })
      .update({ message: "uploading" });

    if (rawJobData.length > 0) {
      logger.info(`File data exists of ${sanitizeForLog(jobId)}, checking file existence`)
      let fileExists = fs.existsSync(path.resolve(jobData.filePath, jobData.fileFullName))
      // return;
      if(fileExists){
        logger.info("file exists trying to process")
        const nrjob = await fileUpload({ jobData, response: res, retry: true })
      }
      else {
        res.status(200).json({ error: "Job not found" });
      }
    } else {
      logger.error(`file data of jid: ${jobId} not found`)
      res.status(200).json({ error: "Job not found" });
    }
  }
  } catch (e) {
    logger.error(e);
    return res.status(500).json("Error while retrying job in Bull queue");
  }
});

// Route to get job status
app.get("/files/jobs/:id/status", async function (req, res, next) {
  try {
    if (process.env.SEPERATE_FILE_UPLOAD_SERVER === "1") {
      logger.info("Getting job status from seperate file upload server");
      const serverResponse = await axios({
        method: "get",
        url: `${
          process.env.SEPERATE_FILE_UPLOAD_SERVER_URL +
          "/file-manager/get-job-status/" +
          req.params.id
        }`,
      });
      return res.status(200).json({
        state: serverResponse.data.state,
        progress: serverResponse.data.progress,
      });
    } else {
      if(process.env.CACHE_MODE == 1){
        logger.info("Getting job status from main server");
        const jobId = req.params.id;
        const job = await fileUploadQueue.getJob(jobId);
        if (job) {
          const state = await job.getState();
          const progress = await job.progress();
          // console.log(job)
          res.status(200).json({ state, progress });
        } else {
          logger.warn("Job not found");
          res.status(200).json({ error: "Job not found" });
        }
      }
      else{
        logger.info("Getting job status from server");
        const jobId = req.params.id;
        const job =  await knex("notification")
          .select("*")
          .where({ objectId: jobId })
        if (job) {
          let state = await job[0].message;
          let progress = 0;
          if(state == "Generating Summary"){
            progress = 25
          }
          else if(state == "Extracting Data"){
            progress = 50
          }
          else if(state == "Analyzing Document"){
            progress = 75
          }
          else if(state == 'successfull'){
            state = 'completed'
            progress = 100
          }
          res.status(200).json({ state, progress });
        } else {
          logger.warn("Job not found");
          res.status(200).json({ error: "Job not found" });
        }
      }

    }
  } catch (e) {
    logger.error(e);
    console.log(e);
    return res
      .status(500)
      .json("Error while fetching job status from Bull queue");
  }
});

app.get("/settings/max-uploads",auth.verifyToken, async function (req, res, next) {
  try {
    const maxFileUploads = await getAdminSetting("MAX_FILE_UPLOADS");
    return res.status(200).json({
      success: true,
      maxUploads: Number(maxFileUploads),
      message: "Maximum file upload limit retrieved successfully"
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json("Error while reading max file uploads");
  }
});

app.get("/settings/recording-prompt-time", async function (req, res, next) {
  try {
    const recordingPromptTime = await getAdminSetting("USER_RECORDING_PROMPT");
    return res.status(200).json( {
      success: true,
      promptTime: Number(recordingPromptTime)
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json("Error while reading Recording Prompt Time");
  }
});

app.post("/teams/:teamId/share",auth.verifyToken,async function(request, response){
  try{
    const user  = new Users()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!request.body.email || !emailRegex.test(request.body.email)) {
    return res.status(400).json({
      success: false,
      error: "bad_request",
      message: "Missing or invalid fields",
      details: [
        { field: "email", issue: "A valid email address is required" }
      ]
    });
  }
    const recieverUserId = await knex('users').select(['id']).where({email:request.body.email}).first();
    if(recieverUserId){
      const recieverCompanyId = await knex('user_company_role_relationship').select(['company']).where({userId:recieverUserId.id}).first();
      if(recieverCompanyId.company == request.decoded.company){
        return response.status(200).json({
          success: true,
          message: "User already has access to this team"
        })
      }else{
        const shared = await knex('shared_teams').insert({teamId:request.params.teamId,sharedUserEmail:request.body.email,ownerId:request.decoded.userId})
        return response.status(200).json({
          success: true,
          message: "Team shared successfully"
        })
      }
    }
    const shared = await knex('shared_teams').insert({teamId:request.params.teamId,sharedUserEmail:request.body.email,ownerId:request.decoded.userId})
    if(!recieverUserId){
      const user = new Users(knex)
        user.getMailTemplate(12)
            .then(async (data) => {
                let subject = data[0].subject
                subject = subject.replace("{{usermail}}", request.body.email)
                let html = data[0].template 
                html = html.replace("{{sender}}", request.decoded.firstname+" "+request.decoded.lastname)
                html = html.replace("{{reciever}}", request.body.email)
                html = html.replace("{{signupLink}}", `${process.env.FRONTEND_BASE_URL}/auth/registration`)
                var { transporter, mailingAddress } = await emailTransporter()
                var mailOptions2 = {
                    from: mailingAddress,
                    to: request.body.email,
                    subject: subject,
                    html
                };
  
                transporter.sendMail(mailOptions2, function (error, info) {
                    if (error) {
                        logger.warn(`Failed to send invitation to ${sanitizeForLog(request.body.email)}`)
                        logger.error(error.message)
                        return console.log(error);
                    }
                    logger.info(`Invitation sent to ${sanitizeForLog(request.body.email)}`)
                    if (info.accepted.length > 0) {
                        logger.debug(JSON.stringify({ success: true, message: request.t('invitationSentSuccess') }))
                        return response.status(200)
                            .send({ success: true, message: request.t('invitationSentSuccess') });
                    } else {
                        logger.warn(`Failed to send invitation mail to ${sanitizeForLog(request.body.email)}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('invitationSentFailed') }))
                        return response.status(200)
                            .send({ success: false, message: request.t('invitationSentFailed') });
                    }
                });
            })
            response.status(200).json({success:true,message:'Invitation sent successfully'})
          }else{
            response.status(403).json({success:false,message:'The email is already registered as a team member.'})
          }
    }catch(error){
      console.log(error)
      logger.error(error);
      response.status(500).json({message:'interenal server error'})
    }
  })

app.post(
  "/user/admin/cancel-subscription",
  auth.verifyToken,
  auth.adminAccess,
  function (request, response) {
    const stripes = require("stripe")(process.env.STRIPE_SECRET_KEY);

    const user = new Users(knex);

    if (request.body.userId) {
      logger.info(`Cancel Subscription for ${request.body.userId}`);
      user
        .updateSubscriptionData(request.body.userId, "0")
        .then((res) => {
          if (res == 1) {
            user.getSubscriptionData(request.body.userId).then(async (sub) => {
              const subscriptionId = sub[0][0].subscriptionId;
              await stripes.subscriptions.cancel(subscriptionId);

              user
                .updateUserMeta(request.body.userId, "accountBlocked", "1")
                .then(() => {
                  logger.info(
                    `Account Cancel Subscription for ${request.body.userId}`
                  );
                  user
                    .getUserDetailsById(request.body.userId)
                    .then(async (user1) => {
                      logger.info(
                        `Sending confirmation mail for, Account Cancel Subscription for ${request.body.userId}`
                      );
                      user.getMailTemplate(5).then(async (data) => {
                        let subject = data[0].subject;
                        let html = data[0].template;
                        html = html.replace("{{name}}", user1.firstname);
                        var { transporter, mailingAddress } =
                          await emailTransporter();

                        var mailOptions2 = {
                          from: mailingAddress,
                          to: user1.email,
                          subject: subject,
                          html,
                        };

                        transporter.sendMail(
                          mailOptions2,
                          function (error, info) {
                            if (error) {
                              logger.error(error);
                            }
                            if (info) {
                              logger.info(
                                `Subscription cancel message successfully sent to ${user1.email}`
                              );
                            }
                          }
                        );
                      });
                    })
                    .catch((err) => {
                      logger.error(err);
                    });
                  logger.debug(
                    JSON.stringify({
                      success: true,
                      message: "Account Cancel Subscription Successful",
                    })
                  );
                  return response.status(200).send({
                    success: true,
                    message: "Account Cancel Subscription Successful",
                  });
                });
            });
          } else {
            logger.warn(
              `Account Cancel Subscription Failed for ${sanitizeForLog(request.body.userId)}`
            );
            logger.debug(
              JSON.stringify({
                success: false,
                message: "Account Cancel Subscription Failed",
              })
            );
            return response.status(200).send({
              success: false,
              message: "Account Cancel Subscription Failed",
            });
          }
        })
        .catch((err) => {
          logger.warn(
            `Account Cancel Subscription Failed for ${sanitizeForLog(request.body.userId)}`
          );
          logger.error(err);
          logger.debug(
            JSON.stringify({
              success: false,
              message: "Account Cancel Subscription Failed",
            })
          );
          return response.status(200).send({
            success: false,
            message: "Account Cancel Subscription Failed",
          });
        });
    } else {
      logger.debug(
        JSON.stringify({
          success: false,
          message: "Missing parameters, fill all the required fields",
        })
      );
      return response.status(400).send({
        success: false,
        message: "Missing parameters, fill all the required fields",
      });
    }
  }
);

app.get(
  "/teams/:teamId/items",
  auth.verifyToken,
  auth.onlyAdminOrUser,
  async (request, response) => {
    try {
      const teamId = Number(request.params.teamId);
      const type = request.query?.type || "folder";

      if (isNaN(teamId)) {
        return response.status(400).json({
          success: false,
          error: "bad_request",
          message: "Missing or invalid parameters",
          details: [
            { field: "teamId", issue: "teamId must be a valid number" }
          ]
        });
      }

      const teamExists = await knex("teams")
        .where({ id: teamId })
        .first();

      if (!teamExists) {
        return response.status(404).json({
          success: false,
          error: "not_found",
          message: "Team not found",
          details: [
            { field: "teamId", issue: "No team exists with this ID" }
          ]
        });
      }

      const items = await knex("documents")
        .select(["id", "name", "parentId"])
        .where({ teamId })
        .andWhere({ type });

      return response.status(200).json({
        success: true,
        message: `${type}s retrieved successfully`,
        items
      });
    } catch (err) {
      console.error(err);

      return response.status(500).json({
        success: false,
        error: "server_error",
        message: "An unexpected error occurred"
      });
    }
  }
);

app.patch(
  "/super-admin/users/:userId/profile",
  auth.verifyToken,
  userAvatarUpload.single("image"),
  auth.userExists,
  async function (req, res) {
    const user = new Users(knex);
    const userId = req.params.userId;
    if (!userId) {
      logger.debug(JSON.stringify({
        success: false,
        error: "bad_request",
        message: "Invalid or missing fields",
        details: [{ field: "userId", issue: "Missing userId in request" }]
      }));
      return res.status(400).json({
        success: false,
        error: "bad_request",
        message: "Invalid or missing fields",
        details: [{ field: "userId", issue: "Missing userId in request" }]
      });
    }

    try {
      logger.info(`Admin update request for user ${sanitizeForLog(userId)}`);

      const existingUser = await user.getUserDetailsById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: "not_found",
          message: "User not found"
        });
      }

      // Check for non-allowed fields in the request body
      const allowedFields = [
        "firstname", "lastname", "email", "mobileCountryCode", "mobileNumber",
        "twoFactorAuth", "language"
      ];
      
      const invalidFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));
      if (invalidFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: "bad_request",
          message: "Invalid or missing fields",
          details: invalidFields.map(field => ({
            field: field,
            issue: "Invalid field"
          }))
        });
      }
      if(Object.keys(req.body).length ==0){
        return res.status(400).json({
          success: false,
          error: "bad_request",
          message: "No fields to update — at least one field must be provided",
          details: []
        });
      }
      if (existingUser.accountType === "solo" && req.body.companyId) {
        return res.status(400).json({
          success: false,
          error: "bad_request",
          message: "Invalid or missing fields",
          details: [{ field: "companyId", issue: "Solo users cannot have companyId" }]
        });
      }

      if (existingUser.accountType === "organization" && !req.body.companyId) {
        return res.status(400).json({
          success: false,
          error: "bad_request",
          message: "Invalid or missing fields",
          details: [{ field: "companyId", issue: "companyId is required for organization users" }]
        });
      }

      if (existingUser.accountType === "solo" && req.body.role && req.body.role !== 1) {
        return res.status(400).json({
          success: false,
          error: "bad_request",
          message: "Invalid role for solo account",
          details: [{ field: "role", issue: "Solo users must have role = 1" }]
        });
      }

      if (req.body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
        return res.status(422).json({
          success: false,
          error: "unprocessable_entity",
          message: "Validation errors",
          details: [{ field: "email", issue: "Invalid email format" }]
        });
      }

      const updateData = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined && req.body[field] !== existingUser[field]) {
          updateData[field] = req.body[field];
        }
      });

      if (req.file) {
        logger.info("Profile picture update detected");

        const oldImageName = await user.getUserMetaValue(userId, "avatarUrl");
        if (oldImageName && oldImageName !== "default.png") {
          try {
            const filePath = `${process.env.BACKEND_PATH}/uploads/userAvatars/${oldImageName}`;
            fs.unlinkSync(filePath);
            logger.info("Old profile picture deleted successfully");
          } catch (err) {
            logger.warn("Failed to delete old profile picture");
            logger.error(err);
          }
        }

        updateData.avatarUrl = req.file.filename || "default.png";
      }

      if (req.body.password) {
        logger.info(`Updating password for user ${userId}`);
        await user.updatePassword(userId, req.body.password);
      }

      if (req.body.language) {
        await user.updateUserMeta(userId, "language", req.body.language);
      }

      if (Object.keys(updateData).length > 0) {
        await user.dynamicUserUpdate(userId, updateData);
      }

      if (req.body.role && req.body.companyId) {
        logger.info(`Updating user role`);
        await user.adminRoleUpdateForUser(userId, req.body.companyId, req.body.role);
      }
      
      const companyId = await user.getCompanyIdForUser(userId);
      const role = await user.getCompanyRoleForUser(userId, companyId);
      const updatedUser = await user.getUserDetailsById(userId);
      const responseData = {
        userId: updatedUser.id.toString(),
        firstname: updatedUser.firstname,
        lastname: updatedUser.lastname,
        email: updatedUser.email,
        countryCode: updatedUser.mobileCountryCode,
        mobileNumber: updatedUser.mobileNumber,
        twoFactorAuth: updatedUser.twoFactorEnabled,
        role,
        language: updatedUser.language,
        updated: new Date().toISOString()
      };

      logger.info(`Admin updated user ${userId} successfully`);

      return res.status(200).json({
        success: true,
        message: req.t("adminAserProfileUpdateSuccess"),
        userData: responseData
      });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({
        success: false,
        error: "server_error",
        message: "An unexpected error occurred"
      });
    }
  }
);


app.put(
  "/super-admin/users/:userId/profile/avatar",
  auth.verifyToken,
  userAvatarUpload.single("image"),
  auth.userExists,
  async function (request, response) {
    const user = new Users(knex);
    const userId = request.params.userId;

    if (!userId) {
      logger.debug(
        JSON.stringify({
          success: false,
          message: "Missing userId in request",
        })
      );
      return response.status(400).send({
        success: false,
        message: "Missing userId in request",
      });
    }

    try {
      logger.info(
        `Super-admin avatar update request for user ${sanitizeForLog(userId)}`
      );

      const existingUser = await user.getUserDetailsById(userId);
      if (!existingUser) {
        return response.status(404).send({
          success: false,
          message: "User not found",
        });
      }

      // Ensure file exists
      if (!request.file) {
        return response.status(400).send({
          success: false,
          message: "No image file uploaded",
        });
      }

      // Handle old avatar deletion
      const oldImageName = await user.getUserMetaValue(userId, "avatarUrl");

      if (oldImageName && oldImageName !== "default.png") {
        try {
          const oldPath = `${process.env.BACKEND_PATH}/uploads/userAvatars/${oldImageName}`;
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            logger.info(`Old profile picture removed: ${oldImageName}`);
          }
        } catch (err) {
          logger.warn("Failed to delete old profile picture");
          logger.error(err);
        }
      }

      const newAvatar = request.fileName || request.file.filename;
      const updateData = { avatarUrl: newAvatar };

      const updateResult = await user.dynamicUserUpdate(userId, updateData);
      if (updateResult !== 1) {
        return response.status(400).send({
          success: false,
          message: "Failed to update avatar",
        });
      }

      const updatedUser = await user.getUserDetailsById(userId);

      return response.status(200).send({
        success: true,
        message: "Profile picture updated successfully",
        avatarUrl: updatedUser.avatarUrl,
      });
    } catch (err) {
      logger.error(err);
      return response.status(500).send({
        success: false,
        message: "Failed to update profile picture",
      });
    }
  }
);

async function buildIntegrationUpdates(integrationDetails) {
    const updates = {};

    // Main flags
    if (integrationDetails.userCloudIntegration !== undefined) {
        updates.userCloudIntegration = integrationDetails.userCloudIntegration;
    }

    if (integrationDetails.userCloudIntegrationMob !== undefined) {
        updates.userCloudIntegrationMob = integrationDetails.userCloudIntegrationMob;
    }

    // Web integrations
    if (integrationDetails.web) {
        Object.entries(integrationDetails.web).forEach(([key, value]) => {
            if (value !== undefined) {
                updates[key] = value;
            }
        });
    }

    // Mobile integrations
    if (integrationDetails.mobile) {
        Object.entries(integrationDetails.mobile).forEach(([key, value]) => {
            if (value !== undefined) {
                updates[`${key}_M`] = value;
            }
        });
    }

    return updates;
}

async function updateUserMetaBulk(userId, updates) {
      const userModel = new Users(knex);
    for (const [key, value] of Object.entries(updates)) {
        await userModel.updateUserMeta(userId, key, value);
    }
}
app.patch(
  "/super-admin/integrations",
  auth.verifyToken,
  async function (req, res) {
    const userModel = new Users(knex);

    const { companyId, userId, integrationDetails } = req.body;
    if ((!companyId && !userId) || (companyId && userId)) {
      return res.status(400).json({
        success: false,
        error: "bad_request",
        message: "Either companyId or userId must be provided",
        details: [
          { field: "companyId/userId", issue: "Provide exactly one identifier" }
        ]
      });
    }

    if (!integrationDetails || typeof integrationDetails !== "object") {
      return res.status(400).json({
        success: false,
        error: "bad_request",
        message: "Invalid or missing integrationDetails"
      });
    }

    try {
      logger.info(
        `Super admin integration update request for ${
          companyId ? `company ${companyId}` : `user ${userId}`
        }`
      );

      if (companyId) {
        const companyExists = await userModel.isCompanyExist(companyId);
        if (!companyExists) {
          return res.status(404).json({
            success: false,
            error: "not_found",
            message: "Company not found"
          });
        }
      }

      if (userId) {
        const userExists = await userModel.checkIfUserExistById(userId);
        if (!userExists) {
          return res.status(404).json({
            success: false,
            error: "not_found",
            message: "User not found"
          });
        }
      }

     const updates = await buildIntegrationUpdates(integrationDetails);

    if (!Object.keys(updates).length) 
      {
        return res.status(401).send({
          success: false,
          error: "bad_request",
          message: "No valid fields provided",
          details: [
            { field: "updatedIntegrations", issue: "No valid fields provided" }
          ]
        })
      }

      
    if (userId) {
        await updateUserMetaBulk(userId, updates);
        return res.status(200).send({
          success: true,
          message: "Integration settings updated for user",
          userId,
          updatedIntegrations: integrationDetails
        })
      }

    const users = await knex('user_company_role_relationship')
        .where({ company: companyId })
        .select('userId');

        console.log(users)

    await Promise.all(
        users.map(u => updateUserMetaBulk(u.userId, updates))
    );

    return res.status(200).send({
          success: true,
          message: "Integration settings updated for Company",
          companyId,
          updatedIntegrations: integrationDetails
        })

    } catch (err) {
      console.log(err)
      logger.error(err);
      return res.status(500).json({
        success: false,
        error: "server_error",
        message: "An unexpected error occurred"
      });
    }
  }
);

app.patch(
  "/super-admin/companies/:companyId/profile",
  auth.verifyToken,
  auth.superAdminAccess,
  companyLogoUpload.single("image"),
  auth.companyExist, // Ensure company exists before proceeding
  async function (request, response) {
    const user = new Users(knex);
    const companyId = request.params.companyId;

    const {
      companytwoFactorEnabled,
      phoneNumberCountryCode,
      phoneNumber,
      companyName,
      orgType,
      billingAddress,
      mailingAddress,
      isMailAndBillAddressSame,
      language,
    } = request.body;

    // ---------------------------
    // 🔹 400 — MISSING PARAMETER
    // ---------------------------
    if (!companyId) {
      return response.status(400).send({
        success: false,
        error: "bad_request",
        message: "Invalid or missing fields",
        details: [
          {
            field: "companyId",
            issue: "Missing required parameter",
          },
        ],
      });
    }
    if(Object.keys(request.body).length ==0){
      return response.status(400).json({
        success: false,
        error: "bad_request",
        message: "No fields to update — at least one field must be provided",
        details: []
      });
    }

    logger.info(`Updating company profile for id ${sanitizeForLog(companyId)}`);

    try {
      // ---------------------------------------
      // 🔹 EXAMPLE VALIDATION FOR BAD REQUEST
      // ---------------------------------------
      const validationErrors = [];

      if (phoneNumber && !/^[0-9+\- ]{6,20}$/.test(phoneNumber)) {
        validationErrors.push({
          field: "phoneNumber",
          issue: "Invalid phone number format",
        });
      }

      if (validationErrors.length > 0) {
        return response.status(400).send({
          success: false,
          error: "bad_request",
          message: "Invalid or missing fields",
          details: validationErrors,
        });
      }

      // Allowed fields for update
      const allowedFields = [
        "companytwoFactorEnabled",
        "phoneNumber",
        "phoneNumberCountryCode",
        "companyName",
        "orgType",
        "billingAddress",
        "mailingAddress",
        "isMailAndBillAddressSame",
        "language",
      ];

      // Check for non-allowed fields
      const invalidFields = Object.keys(request.body).filter(field => !allowedFields.includes(field));
      if (invalidFields.length > 0) {
        return response.status(400).send({
          success: false,
          error: "bad_request",
          message: "Invalid or missing fields",
          details: invalidFields.map(field => ({
            field: field,
            issue: "Invalid field",
          })),
        });
      }

      const companyExists = await user.getCompanyDetails(companyId);
      if (!companyExists) {
        return response.status(404).send({
          success: false,
          error: "not_found",
          message: "Company not found",
        });
      }

      const updateFields = {};

      if (companytwoFactorEnabled !== undefined)
        updateFields.companytwoFactorEnabled = companytwoFactorEnabled;
      if (phoneNumber) updateFields.phoneNumber = phoneNumber;
      if (phoneNumberCountryCode)
        updateFields.phoneNumberCountryCode = phoneNumberCountryCode;
      if (companyName) updateFields.companyName = companyName;
      if (orgType) updateFields.orgType = orgType;

      if (mailingAddress) {
        const { addressLine, country, city, state, postCode } = mailingAddress;
        if (addressLine) updateFields.mailingStreetName = addressLine;
        if (country) updateFields.mailingCountryName = country;
        if (city) updateFields.mailingCityName = city;
        if (state) updateFields.mailingStateName = state;
        if (postCode) updateFields.mailingZip = postCode;
      }

      if (billingAddress) {
        const { addressLine, country, city, state, postCode } = billingAddress;
        if (addressLine) updateFields.billingStreetName = addressLine;
        if (country) updateFields.billingCountryName = country;
        if (city) updateFields.billingCityName = city;
        if (state) updateFields.billingStateName = state;
        if (postCode) updateFields.billingZip = postCode;
      }

      if (isMailAndBillAddressSame !== undefined)
        updateFields.isMailAndBillAddressSame = isMailAndBillAddressSame;

      if (language !== undefined) updateFields.language = language;

      if (request.file) {
        logger.info(`Company logo update detected — deleting old one`);
        const oldLogo = await user.getCompanyMetaValue(companyId, "companyLogo");
        if (oldLogo && oldLogo !== "default.png") {
          const oldPath = `${process.env.BACKEND_PATH}/uploads/companyLogos/${oldLogo}`;
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        updateFields.companyLogo = request.file.filename || "default.png";
      }

      if (Object.keys(updateFields).length === 0) {
        return response.status(200).send({
          success: false,
          message: "No fields to update — no changes detected",
        });
      }

      const result = await user.updateCompany2(
        updateFields.companytwoFactorEnabled ?? "",
        companyId,
        updateFields.phoneNumber ?? "",
        updateFields.phoneNumberCountryCode ?? "",
        updateFields.companyName ?? "",
        updateFields.orgType ?? "",
        updateFields.mailingStreetName ?? "",
        updateFields.mailingCountryName ?? "",
        updateFields.mailingCityName ?? "",
        updateFields.mailingStateName ?? "",
        updateFields.mailingZip ?? "",
        updateFields.billingStreetName ?? "",
        updateFields.billingCountryName ?? "",
        updateFields.billingCityName ?? "",
        updateFields.billingStateName ?? "",
        updateFields.billingZip ?? "",
        updateFields.isMailAndBillAddressSame ?? "",
        updateFields.companyLogo ?? "",
        updateFields.language ?? ""
      );

      if (result !== 1) {
        return response.status(500).send({
          success: false,
          error: "server_error",
          message: "An unexpected error occurred",
        });
      }

      const companyData = await user.getCompanyDetails(companyId);

      return response.status(200).send({
        success: true,
        message: request.t("companyProfileUpdateSuccess"),
        companyData,
      });
    } catch (err) {
      console.log(err)
      logger.error(err);
      return response.status(500).send({
        success: false,
        error: "server_error",
        message: "An unexpected error occurred",
      });
    }
  }
);

app.put(
  "/super-admin/companies/:companyId/profile/avatar",
  auth.verifyToken,
  auth.superAdminAccess,
  companyLogoUpload.single("image"),
  auth.companyExist,
  async function (request, response) {
    const user = new Users(knex);
    const companyId = request.params.companyId;

    if (!companyId) {
      logger.debug(
        JSON.stringify({
          success: false,
          message: "Missing required parameter: companyId",
        })
      );
      return response.status(400).send({
        success: false,
        message: "Missing required parameter: companyId",
      });
    }

    logger.info(`Super-admin company logo update request for id ${sanitizeForLog(companyId)}`);

    try {
      // Verify company exists
      const existingCompany = await user.getCompanyDetails(companyId);
      if (!existingCompany) {
        return response.status(404).send({
          success: false,
          message: "Company not found",
        });
      }

      // Check file upload
      if (!request.file) {
        return response.status(400).send({
          success: false,
          message: "No image file uploaded",
        });
      }

      // 🔹 Get old logo from meta
      const oldLogo = await user.getCompanyMetaValue(companyId, "companyLogo");

      if (oldLogo && oldLogo !== "default.png") {
        const oldPath = `${process.env.BACKEND_PATH}/uploads/companyLogos/${oldLogo}`;
        try {
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            logger.info(`Old company logo deleted: ${oldLogo}`);
          }
        } catch (err) {
          logger.warn("Failed to delete old company logo");
          logger.error(err);
        }
      }

      // Use uploaded filename
      const newLogo = request.fileName || request.file.filename;

      logger.info(`Updating company ${companyId} logo to ${newLogo}`);
      // 🔹 Update company logo via your existing update method
      const result = await user.updateCompanyMeta(companyId, 'companyLogo', newLogo);
      if (!result[0]) {
        logger.warn(`Company logo update failed for id ${companyId}`);
        return response.status(200).send({
          success: false,
          message: "Failed to update company logo",
        });
      }

      // Fetch updated data
      const companyData = await user.getCompanyDetails(companyId);

      logger.info(`Company logo updated successfully`);

      return response.status(200).send({
        success: true,
        message: "Company logo updated successfully",
        avatarUrl:companyData.companyLogo,
      });

    } catch (err) {
      logger.error(err);
      return response.status(500).send({
        success: false,
        message: "Failed to update company logo",
      });
    }
  }
);

// app.patch(
//   "/super-admin/profile",
//   auth.verifyToken,
//   userAvatarUpload.single("image"),
//   async function (request, response) {
//     const user = new Users(knex);
//     const  userId  = request.decoded.userId;
//     const { firstname, lastname, email, mobileCountryCode, mobileNumber,language } = request.body;

//     if (!userId) {
//       logger.debug(
//         JSON.stringify({
//           success: false,
//           message: "Missing parameter: userId",
//         })
//       );
//       return response.status(400).send({
//         success: false,
//         message: "Missing parameter: userId",
//       });
//     }

//     logger.info(`Updating profile for user Id ${sanitizeForLog(userId)} by super admin`);

//     try {
//       // 🔹 Build dynamic update object
//       const updateFields = {};
//       if (firstname) updateFields.firstname = firstname;
//       if (lastname) updateFields.lastname = lastname;
//       if (email) updateFields.email = email;
//       if (mobileCountryCode) updateFields.mobileCountryCode = mobileCountryCode;
//       if (mobileNumber) updateFields.mobileNumber = mobileNumber;

//       // 🔹 Handle avatar upload
//       if (request.file) {
//         logger.info(`Profile update includes new avatar`);
//         const oldImageName = await user.getUserMetaValue(userId, "avatarUrl");
//         if (oldImageName && oldImageName !== "default.png") {
//           const filePath = `${process.env.BACKEND_PATH}/uploads/userAvatars/${oldImageName}`;
//           if (fs.existsSync(filePath)) {
//             fs.unlinkSync(filePath);
//             logger.info(`Old profile picture deleted successfully`);
//           }
//         }
//         updateFields.avatarUrl = request.fileName || "default.png";
//       }
//       if (Object.keys(updateFields).length === 0) {
//         logger.info(`No fields changed for user ${userId}`);
//         return response.status(400).send({
//           success: false,
//           error: "bad_request",
//           message: "Invalid or missing fields",
//           details: [
//           ]
//         });
//       }
//       // 🔹 Execute update (maintain compatibility with your existing DB method)
//       const result = await user.adminUserUpdate(
//         userId,
//         {
//         firstname:updateFields.firstname ?? "",
//         lastname:updateFields.lastname ?? "",
//         email:updateFields.email ?? "",
//         mobileCountryCode:updateFields.mobileCountryCode ?? "",
//         mobileNumber:updateFields.mobileNumber ?? "",
//         avatarUrl:updateFields.avatarUrl ?? ""
//         }
//       );
//        if (language) {
//         try {
//           let updated = await knex("users_meta")
//           .where({
//             userId,
//             metaKey:"language"
//           })
//           .update({
//             metaValue:language
//           })
//           if(updated === 0){
//             await knex("users_meta")
//               .insert({
//                 userId: userId,
//                 metaKey: "language",
//                 metaValue: language
//               })
//             }
//             logger.info("Language preference updated successfully");
//         } catch (err) {
//           logger.error(`Error updating language: ${err.message}`);
//         }
//       }

//       if (result !== 1) {
//         logger.warn(`Profile update failed for user ${userId}`);
//         return response.status(500).send({
//           success: false,
//           message: request.t("adminAserProfileUpdateFailed"),
//         });
//       }

//       logger.info(`Profile updated successfully for user ${userId}`);
//       logger.debug(
//         JSON.stringify({
//           success: true,
//           message: request.t("adminAserProfileUpdateSuccess"),
//         })
//       );
//         const userData = await user.getUserDetailsById(userId);
//       const profile ={
//          firstname: userData.firstname,
//          lastname: userData.lastname,
//          email: userData.email,
//          mobileNumber: userData.mobileNumber,
//          updatedAt: new Date()
//       }
//       return response.status(200).send({
//         success: true,
//         message: "Super admin profile updated successfully",
//         profile
//       });
//     } catch (err) {
//       console.error(err);
//       logger.error(err);
//       logger.warn(`Profile update by super admin failed`);
//       return response.status(500).send({
//         success: false,
//         message: request.t("adminAserProfileUpdateFailed"),
//       });
//     }
//   }
// );
// app.put(
//   "/super-admin/profile/avatar",
//   auth.verifyToken,
//   userAvatarUpload.single("image"),
//   async function (request, response) {
//     const user = new Users(knex);
//     const userId = request.decoded.userId;

//     if (!userId) {
//       logger.debug(
//         JSON.stringify({
//           success: false,
//           message: "Missing parameter: userId",
//         })
//       );
//       return response.status(400).send({
//         success: false,
//         message: "Missing parameter: userId",
//       });
//     }

//     logger.info(
//       `Super-admin updating only avatar for userId ${sanitizeForLog(userId)}`
//     );

//     try {
//       // Must have uploaded image
//       if (!request.file) {
//         return response.status(400).send({
//           success: false,
//           message: "No image file uploaded",
//         });
//       }

//       // 🔹 Remove old avatar
//       const oldImage = await user.getUserMetaValue(userId, "avatarUrl");

//       if (oldImage && oldImage !== "default.png") {
//         const oldPath = `${process.env.BACKEND_PATH}/uploads/userAvatars/${oldImage}`;
//         try {
//           if (fs.existsSync(oldPath)) {
//             fs.unlinkSync(oldPath);
//             logger.info(`Old profile picture '${oldImage}' deleted`);
//           }
//         } catch (err) {
//           logger.warn("Failed to delete old profile picture");
//           logger.error(err);
//         }
//       }

//       // 🔹 New avatar filename
//       const newAvatar = request.fileName || request.file.filename;

//       // 🔹 Update avatar using your existing method
//       const updateResult = await user.updateUserMeta(
//         userId,
//         "avatarUrl",
//         newAvatar // avatarUrl updated only
//       );
//       if (!updateResult.success) {
//         logger.warn(`Avatar update failed for super-admin user ${userId}`);
//         return response.status(500).send({
//           success: false,
//           message: "An unexpected error occurred",
//           error: "server_error"
//         });
//       }

//       logger.info(`Avatar updated successfully for super-admin user ${userId}`);

//       return  response.status(200).send({
//           success: true,
//           message: "Avatar updated successfully",
//           avatarUrl: `${process.env.USER_PROFILE_IMAGE_URL}/${newAvatar}`
//         });
//     } catch (err) {
//       console.error(err);
//       logger.error(err);
//       logger.warn(`Super-admin avatar update failed`);

//       return response.status(500).send({
//         success: false,
//         error:"server_error",
//         message: "An unexpected error occurred",
//       });
//     }
//   }
// );


app.delete("/super-admin/users/:userId", async (req, res) => {
  const user = new Users(knex);
  const { userId } = req.params;

  try {
    const exist = await user.checkIfUserExistById(userId);
    if (!exist) {
      return res.status(404).send({
        success: false,
        error: "not_found",
        message: "User not found",
      });
    }

    const accountType = await user.getUserMetaValue(userId, "accountType");

    await knex.transaction(async (trx) => {
      const chatIds = await trx("chat_histories")
        .select("id")
        .where({ userId })
        .pluck("id");

      if (chatIds.length) {
        await trx("tokens_used").whereIn("chatId", chatIds).del();
      }
      await trx("chat_histories").where({ userId }).del();

      if (accountType === "solo") {
        await trx("documents").where({ creatorId: userId }).del();
        await trx("teams").where({ creatorId: userId }).del();
        await trx("users").where({ id: userId }).del();
        await trx("user_company_role_relationship").where({ userId }).del();

        return res.status(200).send({
          success: true,
          message: "Solo user and related data deleted successfully.",
        });
      }

      const companyId = await user.getCompanyIdForUser(userId);
      const role = await user.getCompanyRoleForUser(userId, companyId);

      if (!role) {
        return res.status(400).send({
          success: false,
          message: "User does not have a valid role.",
        });
      }

      if (role === 1) {
        const adminCount = await trx("user_company_role_relationship")
          .count("*")
          .where({ company: companyId, role: 1 })
          .first();

        if (adminCount.count === 1) {
          return res.status(400).send({
            success: false,
            message: "Cannot delete. There is only one Administrator.",
          });
        }

        const newAdmin = await trx("user_company_role_relationship")
          .select("userId")
          .where({ company: companyId, role: 1 })
          .whereNot({ userId })
          .first();

        if (!newAdmin) {
          return res.status(400).send({
            success: false,
            message: "Cannot delete. No other administrator found.",
          });
        }

        const newUserId = newAdmin.userId;

        const teams = await trx("teams").where({ creatorId: userId, companyId });
        for (const team of teams) {
          await trx("teams").where({ id: team.id }).update({ creatorId: newUserId });

          await trx("documents").where({ teamId: team.id }).update({ teamId: team.id });
        }

        await trx("invitations").where({ sender: userId }).update({ sender: newUserId });
        await trx("subscriptions").where({ userId }).update({ userId: newUserId });
      }

      await trx("users").where({ id: userId }).del();
      await trx("user_company_role_relationship").where({ userId }).del();

      return res.status(200).send({
        success: true,
        message: "User and related data deleted successfully.",
      });
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error while deleting user.",
      error: error.message,
    });
  }
});

app.put("/super-admin/usage/last-month", function (request, response) {
  const {
    statId,
    name,
    plan,
    numberofTeams,
    numberofUsers,
    storageUsed,
    numberofQueries,  
    monthName,
    year,
  } = request.body;
  const dateTime = new Date();

  knex("lastmonthusage")
    .where({ monthName, year, statId })
    .then((existingData) => {
      if (existingData.length === 0) {
         knex("lastmonthusage")
          .insert({
            statId,
            name,
            plan,
            numberofTeams,
            numberofUsers: plan == "solo" ? "" : numberofUsers,
            storageUsed,
            numberofQueries,
            monthName,
            year,
            created: dateTime,
          })
          .then(() => {
            return response.status(200).send({
              success: true,
              message: "Last month's usage data inserted successfully"
            });
            logger.info({ message: "Data insertion completed" });
          })
          .catch((error) => {
            return response.status(500).send({
              success: false,
              error:"server_error",
              message: "An unexpected error occured"
            });
            logger.info({ error: "Internal Server Error", error: error });
          });
      } else {
        console.log("Data already exists.");
        return response.status(409).send({
              
              success: false,
              error: "conflict",
              message: "Usage data for this month already exists",
              details: [
                {
                  field: "monthName/year",
                  issue: "A record for this month is already stored"
                }
              ]

            });
      }
    })
    .catch((error) => {
      return response.status(500).send({
              success: false,
              error:"server_error",
              message: "An unexpected error occured"
            });
      logger.error("Error checking data:", error);
    });
});

app.get("/super-admin/companies/:companyId/usage/last-month", function (request, response) {
  if (request.params.companyId) {
    knex("lastmonthusage")
  .select("*")
  .where({ statId: request.params.companyId })   // statId = companyId
  .then((rows) => {
    if (!rows || rows.length === 0) {
      return response.status(200).send({
        success: true,
        usage: null,
      });
    }

    const row = rows[0]; // Only one usage record needed

    logger.info("Usage Data Fetched Successfully");

    const usage = {
      companyId: row.statId, // statId → companyId
      plan: row.plan || null,
      numberOfCollections: Number(row.numberOfCollections) || 0,
      numberOfUsers: Number(row.numberofUsers) || 0,
      storageUsed: row.storageUsed || null,
      numberOfQueries: Number(row.numberofQueries) || 0,
      month: new Date(row.created).getMonth() + 1,
      monthName: row.monthName,
      year: Number(row.year),
      created: new Date(row.created).toISOString()
    };

    return response.status(200).send({
      success: true,
      usage
    });
  })
  .catch((err) => {
    logger.error("Error fetching company usage data", err);
    return response.status(500).send({
      success: false,
      message: "Failed to fetch company usage data",
    });
  });
  } else {
    logger.info("Usage Data Fetched Failed");
    return response.status(200).send({
      success: false,
      message: "No details found",
    });
  }
});
app.get("/super-admin/users/:userId/usage/last-month", function (request, response) {
  if (request.params.userId) {
    knex("lastmonthusage")
  .select("*")
  .where({ statId: request.params.userId })
  .then((rows) => {
    if (!rows || rows.length === 0) {
      return response.status(200).send({
        success: true,
        usage: null,
      });
    }

    const row = rows[0];

    logger.info("Usage Data Fetched Successfully");

    const usage = {
      userId: row.statId,        
      companyId: row.companyId || null, 
      plan: row.plan || null,
      numberofTeams: Number(row.numberofTeams) || 0,
      storageUsed: row.storageUsed || null,
      numberOfQueries: Number(row.numberofQueries) || 0,
      month: new Date(row.created).getMonth() + 1,
      monthName: row.monthName,
      year: Number(row.year),
      created: new Date(row.created).toISOString()
    };

    return response.status(200).send({
      success: true,
      usage
    });
  })
  .catch((err) => {
    logger.error("Error fetching usage data", err);
    return response.status(500).send({
      success: false,
      error:"server_error",
      message: "An unexpected error occured"
    });
  });
  } else {
    logger.info("Usage Data Fetched Failed");
    return response.status(500).send({
      success: false,
      error:"server_error",
      message: "An unexpected error occured",
    });
  }
});

app.post(
  "/user/support-query", 
  auth.verifyToken,
  async function (request, response) {
    const { userId, query } = request.body
  }
)

app.post(
  "/files/upload/audio/:teamId",
  auth.verifyToken,
  
  auth.onlyAdminOrUser,

  audioUpload.single("file"),
  // auth.checkForDuplicateFile,
  // auth.isMemberOfTeamOrSharedMemberV2,
  async function (request, response) {
    const team = new Team(knex);
    const documents = new Documents(knex);

    const storageDetails = await documents.getStorageOccupationDetail(
      request.decoded.company
    );
    function convertToKilobytes(formattedSize) {
      const sizes = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const [value, unit] = formattedSize.split(' ');
      const index = sizes.indexOf(unit);
  
      return parseFloat(value) * Math.pow(1000, index);
    }
    const usedStorage = convertToKilobytes(storageDetails) || 0;
    const maxStorageSetting = await getAdminSetting("MAX_STORAGE");
    const maxStorage = parseFloat(maxStorageSetting * 1024 * 1024);

    if (usedStorage <= maxStorage) {
      if (process.env.GOOGLE_CLOUD_STORAGE == 1) {
        try {
          let filePath = path.join(request.filePath, request.fileFullName);
          logger.info(
            `Uploading file on cloud: FileName: ${sanitizeForLog(
              request.originalName
            )} FileId: ${sanitizeForLog(request.fileName[0])}`
          );
          await storage
            .bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME)
            .upload(filePath, {
              destination: request.fileName[0],
            });
          logger.info("Successfully uploaded file on cloud");
        } catch (error) {
          logger.error("Error uploading file on cloud");
          logger.error(error);
          return response.status(500).json({
            message: "Error uploading file on cloud",
          });
        }
      }

      if (request.file) {
        if (fs.existsSync(request.filePath + "/" + request.fileFullName)) {
          try {
            const audioExt = path.extname(request.fileFullName).toLowerCase();
            const baseFileName = request.fileFullName.replace(audioExt, "");
            const { summary } = await audioSummary(
              request.file.filename
            );
            let folderId = request.body.parentId ||request.body.parentFolderId || 4 ;
            if(folderId == "null"){
              folderId = 4
            }
            const txtContent = summary;
            const txtFilePath = path.join(
              request.filePath,
              `${baseFileName}.txt`
            );
            fs.writeFileSync(txtFilePath, txtContent);
  
            const audioId = parseInt(baseFileName);
            const txtFileName = request.body.fileName.replace(audioExt, ".txt");
  
            if(process.env.GOOGLE_CLOUD_STORAGE == 1){
              try {
                  logger.info(`Uploading text summary on cloud: FileName: ${txtFileName} FileId: ${sanitizeForLog(request.fileName[0])}`)
                  await storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME).upload(txtFilePath, {
                    destination: `${baseFileName}.txt`,
                  });
                  logger.info("Successfully uploaded file on cloud")
                } catch (error) {
                  logger.error("Error uploading file on cloud")
                  logger.error(error)
                  return response.status(500).json({
                    message: "Error uploading file on cloud",
                  });
                }
            }
  
            let teamId;
            try {
              await knex("documents")
                .select("teamId")
                .where({ id: audioId })
                .then((res) => (teamId = res[0]?.teamId));
  
                const fileStat = await fs2.stat(txtFilePath)
    
              await knex("documents").where({ id: audioId }).update({
                name: txtFileName,
                parentId: folderId,
                isNotAnalyzed: false,
                size:(fileStat.size / 1000).toFixed(2)+' kb',
                creatorId:request.decoded.userId
              });

            const now = new Date();
            await knex('recordings').insert({
              companyId:request.decoded.company,
              userId:request.decoded.userId,
              fileId:audioId,
              created:now
            })
            } catch (error) {
              logger.error("Error updating document")
              logger.error(error)
            }
  
  
            if (summary.length > 0) {
              const dateTime = new Date();
              await knex("summary")
                .where({
                  fileId: request.fileName[0],
                  fileName: request.body.fileName,
                  teamId: request.params.teamId,
                })
                .then((existingData) => {
                  if (existingData.length === 0) {
                    return knex("summary")
                      .insert({
                        fileId: request.fileName[0],
                        teamId: request.params.teamId,
                        fileName: request.body.fileName,
                        notes: summary,
                        overview: "",
                        created: dateTime,
                      })
                      .then(() => {
                        logger.info({ message: "Summary insertion completed" });
                      })
                      .catch((error) => {
                        logger.info({
                          error: "Internal Server Error",
                          error: error,
                        });
                      });
                  } else {
                    console.log("Data already exists.");
                  }
                })
                .catch((error) => {
                  logger.error("Error checking data:", error);
                });
  
              const docs = await documents.createDocumentFromText(
                txtFilePath,
                request.fileName[0],
                txtFileName
              );
              team
                .getTeamUUID(request.params.teamId)
                .then((uuid) => {
                  documents
                    .createAndStoreEmbeddingsOnIndex(
                      docs,
                      uuid,
                      request.fileName[0],
                      "txt"
                    )
                    .then(async () => {
                      fs.unlinkSync(
                        path.resolve(
                          request.filePath + "/" + request.fileFullName
                        )
                      );
                      if(process.env.GOOGLE_CLOUD_STORAGE == 1) {
                        await fs2.unlink(txtFilePath);
                      }
                      logger.info(
                        `Embeddings created and stored on vector database`
                      );
                      return response
                        .status(200)
                        .json({ success:true,message: "File uploaded successfully" });
                    })
                    .catch((err) => {
                      logger.warn(`Failed to create embeddings`);
                      logger.error(err);
                      return response.status(500).json({
                        message:
                          "File uploaded successfully, Failed to analyze the file",
                      });
                    });
                })
                .catch((err) => {
                  logger.warn(`Failed to create embeddings`);
                  logger.error(err);
                  return response.status(500).json({
                    message:
                      "File uploaded successfully, Failed to analyze the file",
                  });
                });
            } else {
              return response
                .status(200)
                .json({success:true, message: "File uploaded successfully" });
            }
          } catch (err) {
            console.error("Error during transcription:", err);
            return response
              .status(200)
              .json({ message: "File uploaded successfully" });
          }
        } else {
          logger.warn(`File upload failed`);
          return response.status(500).json({
            message:
              "File uploaded successfully, Failed to analyze the file",
          });
        }
      } else {
        logger.error(`File upload failed! No File`);
      }
    }
    else {
      await fs2.unlink(path.join(request.filePath, request.fileFullName));
      logger.info(`You have reached maximum storage capacity ${sanitizeForLog(request.fileFullName)}`);
      await knex("documents")
        .where("id", request.fileName[0])
        .del();
      return response
        .status(200)
        .send("0&%&You have reached maximum storage capacity$");
    }
  }
);
// Error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === "fileName is required") {
    if(err.message ==="Unexpected field"){
    return res.status(400).json({
      success: false,
      error: "bad_request",
      message: "Missing or invalid parameters",
      details: [
        { field: "image", issue: "File must be provided in the 'image' field, and only one file is allowed." }
      ]
    });
    }
    return res.status(400).json({
      success: false,
      error: "bad_request",
      message: "Missing or invalid parameters",
      details: [
        { field: "fileName", issue: "Must be provided" }
      ]
    });
  }
  next(err);
});
app.get("/settings/recording-limit",
  auth.verifyToken,
  async function (request,response) {
  try{
    if(request.decoded.company){
      const limit = await getAdminSetting("RECORDING_MONTHLY_LIMIT")
      if(request.decoded.company){
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const startFormatted = startOfCurrentMonth.toISOString().split('T')[0];
        const endFormatted = endOfCurrentMonth.toISOString().split('T')[0];
        const recordingCountData = await knex('recordings').select('*').where({companyId:request.decoded.company}).whereBetween('created',[startFormatted, endFormatted])
        if(recordingCountData[0]){
          return response.status(200).json({
            success: true,
            message: "Recording limit fetched successfully",
            data: {
              count: recordingCountData.length,
              limit: Number(limit)
            }
          })
        }else{

          return response.status(200).json({
            success: true,
            message: "Recording limit fetched successfully",
            data: {
              count: 0,
              limit: Number(limit)
            }
          })
        }
      }else{
        return response.status(500).json(
          {
            success: false,
            error:"server_error",
            message:"An unexpected error occured"
          }
        )
      }
    }else{
      return response.status(500).json(
          {
            success: false,
            error:"server_error",
            message:"An unexpected error occured"
          }
        )
    }
  }catch(e){
    console.log(e)
    return response.status(500).json(
          {
            success: false,
            error:"server_error",
            message:"An unexpected error occured"
          }
        )
  }
})

app.post(
  "/summarize-document",
  auth.verifyToken,
  auth.teamExists,
  auth.isMemberOfTeamOrSharedMember,
  auth.isValidFileM2,
  auth.isValidFileExtension,
  function (request, response) {
    const documents = new Documents(knex);

    if (
      request.body.fileId &&
      request.body.teamId &&
      request.body.fileType
    ) {
      logger.info(`Fetching buffer for file Id ${sanitizeForLog(request.body.fileId)}`);
      documents
        .getDocumentPath(request.body.fileId, request.body.teamId)
        .then(async (res) => {
          if (res == "file-not-found") {
            logger.warn(`File ${sanitizeForLog(request.body.fileId)} does not exist`);
            logger.debug(
              JSON.stringify({
                success: false,
                message: request.t("fileNotFound"),
              })
            );
            return response
              .status(201)
              .send({ success: false, message: request.t("fileNotFound") });
          } else {
            logger.info(`File ${sanitizeForLog(request.body.fileId)} exists`);

            let userId;
            await knex("teams")
              .select("creatorId")
              .where({ id: request.body.teamId })
              .then((res) => (userId = res[0]?.creatorId));

            let originalName;
            await knex("documents")
              .select("name")
              .where({ id: request.body.fileId })
              .then((res) => (originalName = res[0]?.name));

            const summary = await summarizer(
              res,
              request.body.fileId,
              originalName,
              userId
            );

            if (summary.success === true) {
              const dateTime = new Date();
              await knex("summary")
                .where({
                  fileId: request.body.fileId,
                  fileName: originalName,
                  teamId: request.body.teamId,
                })
                .then((existingData) => {
                  if (existingData.length === 0) {
                    return knex("summary")
                      .insert({
                        fileId: request.body.fileId,
                        teamId: request.body.teamId,
                        fileName: originalName,
                        notes: summary.outputText,
                        overview: summary.overviewOutputText,
                        created: dateTime,
                      })
                      .then(() => {
                        logger.info({ message: "Summary insertion completed" });
                      })
                      .catch((error) => {
                        logger.info({
                          error: "Internal Server Error",
                          error: error,
                        });
                      });
                  } else {
                    console.log("Data already exists.");
                  }
                })
                .catch((error) => {
                  logger.error("Error checking data:", error);
                });
            }
            return response
              .status(200)
              .send({ success: true, message: summary });
          }
        })
        .catch((err) => {
          logger.warn(`Failed to fetch buffer file Id ${sanitizeForLog(request.body.fileId)}`);
          logger.error(err);
          logger.debug(
            JSON.stringify({
              success: false,
              message: request.t("documentFetchFailed"),
            })
          );
          return response.status(201).send({
            success: false,
            message: request.t("documentFetchFailed"),
          });
        });
    } else {
      logger.debug(
        JSON.stringify({
          success: false,
          message: "Missing parameters, fill all the required fields",
        })
      );
      return response.status(400).send({
        success: false,
        message: "Missing parameters, fill all the required fields",
      });
    }
  }
);

app.get("/teams/:teamId/files/:fileId/summary", async (request, response) => {
  try {
    const { fileId, teamId } = request.params;

    // Validate parameters
    const errors = [];
    if (!fileId) errors.push({ field: "fileId", issue: "fileId is required" });
    else if (isNaN(Number(fileId))) errors.push({ field: "fileId", issue: "fileId must be a valid number" });

    if (!teamId) errors.push({ field: "teamId", issue: "teamId is required" });
    else if (isNaN(Number(teamId))) errors.push({ field: "teamId", issue: "teamId must be a valid number" });

    if (errors.length > 0) {
      logger.warn("Invalid or missing parameters", errors);
      return response.status(400).send({
        success: false,
        error: "bad_request",
        message: "Missing or invalid parameters",
        details: errors
      });
    }

    // Check if file exists
    const fileData = await knex("documents")
      .select("id")
      .where({ id: fileId, teamId })
      .first();

    if (!fileData) {
      logger.info("File not found", { fileId, teamId });
      return response.status(404).send({
        success: false,
        error: "not_found",
        message: "File not found",
        details: [{ field: "fileId", issue: "No file exists with this ID" }]
      });
    }

    // Fetch summary
    const summaryData = await knex("summary")
      .select("*")
      .where({ fileId })
      .first();

    if (!summaryData) {
      logger.info("No summary exists for the file", { fileId, teamId });
      return response.status(404).send({
        success: false,
        error: "not_found",
        message: "No summary exists for this file",
        details: [{ field: "fileId", issue: "No summary exists for this file" }]
      });
    }

    // Success
    logger.info("Summary fetched successfully", { fileId, teamId });
    return response.status(200).send({
      success: true,
      message: "Summary retrieved successfully",
      summary: summaryData
    });

  } catch (error) {
    console.error(error);
    logger.error("Error fetching summary", error);
    return response.status(500).send({
      success: false,
      error: "internal_error",
      message: "Failed to fetch summary",
      details: [{ field: "server", issue: error.message }]
    });
  }
});

app.post("/integrations/auth/oauth-session-token",auth.verifyToken,async(request,response,next)=>{
  try{
    const userId = request.decoded.userId;
    await knex("users_meta").where({userId,metaKey: 'oauth_session_token'}).del();
    const sessionToken = v4();
    const expiresIn = 120;
    const payload = {
      token: sessionToken,
      expiresAt: Date.now() + expiresIn * 1000
    };
    await knex('users_meta')
    .insert({
      userId,
      metaKey: 'oauth_session_token',
      metaValue: JSON.stringify(payload)
    })
    return response.status(200).send({success:true,sessionToken,expiresIn})
  }catch(err){
    return response.status(500).send({
       success: false,
       error: "server_error",
       message: "An unexpected error occurred"
    })
  }
})
app.get("/integrations/auth/oauth-session-token",async(request,response,next)=>{
  try{
        const {sessionToken} =request.query
    const rows = await knex('users_meta')
      .where({ metaKey: 'oauth_session_token' })
      const row = rows.find(r => {
        const data = JSON.parse(r.metaValue);
        return data.token === sessionToken;
      });
      if (!row) {
        return response.status(400).send('No token');
      }


const data = JSON.parse(row.metaValue);
    if (Date.now() > data.expiresAt) {
      await knex('users_meta')
        .where({ metaKey: 'oauth_session_token', userId: row.userId })
        .del();
      return response.status(400).send('Expired token');
    }
    await knex('users_meta')
  .where({ metaKey: 'oauth_session_token', userId: row.userId })
  .del();
    return response.status(200).send({success:true,message:"valid token",userId:row.userId})
  }catch(err){
    console.log(err)
    return response.status(500).send({
       success: false,
       error: "server_error",
       message: "An unexpected error occurred"
    })
  }
})

// app.post("/update-summary-filename",auth.verifyToken,auth.isMemberOfTeamOrFileCreatorOfSharedTeam, async function (request, response) {
//   if (
//     request.body.fileId &&
//     request.body.fileName &&
//     request.body.parentId &&
//     request.body.teamId
//   ) {
//     logger.info(`Changing summary file name for ${sanitizeForLog(request.body.fileId)}`);
//     logger.info(
//       `Update database information for fileId ${sanitizeForLog(request.body.fileId)}`
//     );
//     const dateTime = new Date();
//     await knex("documents")
//       .update({
//         name: request.body.fileName,
//       })
//       .where({ id: request.body.fileId })
//       .then(async (res) => {
//         await knex("summary")
//           .update({
//             fileName: request.body.fileName,
//             createdAt: dateTime,
//           })
//           .where({ fileId: request.body.fileId })
//           .then((res) => {
//             if (res == 1) {
//               logger.info(`Filename updated successfully`);
//               logger.debug(
//                 JSON.stringify({
//                   success: true,
//                   message: "Filename updated successfully",
//                 })
//               );
//               return response.status(200).send({
//                 success: true,
//                 message: "Filename updated successfully",
//               });
//             } else {
//               logger.warn(`Failed to update the filename`);
//               logger.debug(
//                 JSON.stringify({
//                   success: false,
//                   message: "Failed to update the filename",
//                 })
//               );
//               return response.status(200).send({
//                 success: false,
//                 message: "Failed to update the filename",
//               });
//             }
//           })
//           .catch((err) => {
//             console.log(err);
//             logger.warn(`Failed to update the filename`);
//             logger.error(err);
//             logger.debug(
//               JSON.stringify({
//                 success: false,
//                 message: "Failed to update the filename",
//               })
//             );
//             return response.status(200).send({
//               success: false,
//               message: "Failed to update the filename",
//             });
//           });
//       })
//       .catch((err) => {
//         console.log(err);
//         logger.warn(`Failed to update the filename in documents table`);
//         logger.error(err);
//         logger.debug(
//           JSON.stringify({
//             success: false,
//             message: "Failed to update the filename",
//           })
//         );
//         return response
//           .status(200)
//           .send({ success: false, message: "Failed to update the filename" });
//       });
//   } else {
//     logger.debug(
//       JSON.stringify({
//         success: false,
//         message: "Missing parameters, fill all the required fields",
//       })
//     );
//     return response.status(400).send({
//       success: false,
//       message: "Missing parameters, fill all the required fields",
//     });
//   }
// });

const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express");
const opt = require("./docs.json");

const swaggerOptions = {
  swaggerDefinition: opt,
  apis: ["./server.js"],
};

const options = {
  explorer: true,
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerDocs, options));
const PORT = process.env.PORT;
app.listen(PORT, async () => {
  if (process.env.CACHE_MODE == "1") {
    console.log("Enabling caching");
    await loadDataToRedis();
  }
  console.log(`app is listening on port ${PORT}`);
});
})();