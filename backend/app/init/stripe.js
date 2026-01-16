const dotenv = require('dotenv');
dotenv.config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const knex = require('knex')({
    client: 'mysql',
    connection: {
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT,
        user: process.env.DATABASE_USER_NAME,
        password: process.env.DATABASE_PASSWORD ? process.env.DATABASE_PASSWORD : '',
        database: process.env.DATABASE_NAME
    }
});

exports.createCheckoutSessionURLForType1 = async (
    email,
    firstname,
    lastname,
    mobileCountryCode,
    mobileNumber,
    accountType,
    password,
    signUpMethod,
    currency
) => {
    const packageData = await knex("subscription-packages").select('*').where({ name: 'solo', currency })
    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price: packageData[0].priceId,
                quantity: 1
            },
        ],
        metadata: {
            email,
            firstname,
            lastname,
            mobileCountryCode,
            mobileNumber,
            accountType,
            password,
            signUpMethod
        },
        mode: 'subscription',
        currency,
        success_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${true}&email=${email}`,
        cancel_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${false}`,
        customer_email: email,
        allow_promotion_codes: true,
        payment_method_types: ['card']
    });
    // console.log(session)
    return session.url
}

exports.createCheckoutSessionURLForType2 = async (
    email,
    firstname,
    lastname,
    avatarUrl,
    accountType,
    signUpMethod,
    currency
) => {
    const packageData = await knex("subscription-packages").select('*').where({ name: 'solo', currency })
    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price: packageData[0].priceId,
                quantity: 1
            }
        ],
        metadata: {
            email,
            firstname,
            lastname,
            avatarUrl,
            accountType,
            signUpMethod
        },
        mode: 'subscription',
        currency,
        success_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${true}&email=${email}`,
        cancel_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${false}`,
        customer_email: email,
        allow_promotion_codes: true,
        payment_method_types: ['card']
    });
    // console.log(session)
    return session.url
}

exports.createCheckoutSessionURLForType3 = async (
    firstname,
    lastname,
    email,
    phoneNumberCountryCode,
    phoneNumber,
    companyName,
    orgType,
    mailingStreetName,
    mailingCountryName,
    mailingCityName,
    mailingStateName,
    mailingZip,
    billingStreetName,
    billingCountryName,
    billingCityName,
    billingStateName,
    billingZip,
    isMailAndBillAddressSame,
    avatarUrl,
    accountType,
    signUpMethod,
    currency
) => {
    const packageData = await knex("subscription-packages").select('*').where({ name: 'team', currency })
    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price: packageData[0].priceId,
                quantity: 1
            }
        ],
        metadata: {
            firstname,
            lastname,
            email,
            phoneNumberCountryCode,
            phoneNumber,
            companyName,
            orgType,
            mailingStreetName,
            mailingCountryName,
            mailingCityName,
            mailingStateName,
            mailingZip,
            billingStreetName,
            billingCountryName,
            billingCityName,
            billingStateName,
            billingZip,
            isMailAndBillAddressSame,
            // avatarUrl,  (Images or Google Image URLs, were not directly supported in the metadata of a Stripe Checkout Session. Metadata is typically used for storing additional information about a session in a only text format.)
            accountType,
            signUpMethod
        },
        mode: 'subscription',
        currency,
        success_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${true}&email=${email}`,
        cancel_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${false}`,
        customer_email: email,
        allow_promotion_codes: true,
        payment_method_types: ['card']
    });
    // console.log(session)
    return session.url
}

exports.createCheckoutSessionURLForType4 = async (
    email,
    firstname,
    lastname,
    mobileCountryCode,
    mobileNumber,
    accountType,
    password,
    companyName,
    phoneNumberCountryCode,
    phoneNumber,
    orgType,
    mailingStreetName,
    mailingCountryName,
    mailingCityName,
    mailingStateName,
    mailingZip,
    billingStreetName,
    billingCountryName,
    billingCityName,
    billingStateName,
    billingZip,
    isMailAndBillAddressSame,
    signUpMethod,
    currency
) => {
    const packageData = await knex("subscription-packages").select('*').where({ name: 'team', currency })
    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price: packageData[0].priceId,
                quantity: 1
            }
        ],
        metadata: {
            email,
            firstname,
            lastname,
            mobileCountryCode,
            mobileNumber,
            accountType,
            password,
            companyName,
            phoneNumberCountryCode,
            phoneNumber,
            orgType,
            mailingStreetName,
            mailingCountryName,
            mailingCityName,
            mailingStateName,
            mailingZip,
            billingStreetName,
            billingCountryName,
            billingCityName,
            billingStateName,
            billingZip,
            isMailAndBillAddressSame,
            signUpMethod
        },
        mode: 'subscription',
        currency,
        success_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${true}&email=${email}`,
        cancel_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${false}`,
        customer_email: email,
        allow_promotion_codes: true,
        payment_method_types: ['card']
    });
    // console.log(session)
    return session.url
}