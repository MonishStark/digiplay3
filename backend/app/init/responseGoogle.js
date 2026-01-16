const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;

const dotenv = require('dotenv');
dotenv.config();

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_OAUTH_REDIRECT_URL,
        },
        (accessToken, refreshToken, profile, cb) => {
            const gooogleData = {
                profile: profile._json,
                accessToken,
                refreshToken
            }
            return cb(null, gooogleData);
        }
    )
);

passport.use(
    'googleDrive', // unique name for this strategy
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URL, // different redirect URL
            passReqToCallback: true,
        },
        (req, accessToken, refreshToken, profile, cb) => {
            const state = JSON.parse(req.query.state);
            const userId = state.userId;
            const googleData = {
                profile: profile._json,
                accessToken,
                refreshToken,
                userId,
            };
            return cb(null, googleData);
        }
    )
);

passport.use(
    new OIDCStrategy(
        {
            identityMetadata: `https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration`,
            issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/v2.0`,
            clientID: process.env.MICROSOFT_CLIENT_ID,
            responseType: 'code',
            responseMode: 'form_post',
            redirectUrl: process.env.MICROSOFT_OAUTH_REDIRECT_URL,
            allowHttpForRedirectUrl: true,  // for live server redirect url will be false
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            validateIssuer: false,
            passReqToCallback: false,
            scope: ['openid', 'profile'],
            loggingLevel: 'info', // Enable debug-level logs
            loggingNoPII: false,
        },
        (accessToken, refreshToken, profile, cb) => {
            const microsoftData = {
                profile: profile._json,
            }

            return cb(null, microsoftData);
        }
    )
);

passport.use(
  'oneDrive',
  new OIDCStrategy(
    {
      identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
      clientID: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      redirectUrl: process.env.MICROSOFT_OAUTH_REDIRECT_URL,
      responseType: 'code',
      responseMode: 'query',
      allowHttpForRedirectUrl: true, // set to false in production
      validateIssuer: false, // set to true if using a specific tenant
      scope: ['openid', 'profile', 'offline_access', 'Files.Read'],
      loggingLevel: 'info',
      loggingNoPII: false,
      passReqToCallback: true,
    },
    function (req, iss, sub, profile, accessToken, refreshToken, params, done) {
      if (!profile) {
        return done(new Error('No profile found'), null);
      }
      const userId = req.session.userId;

      const microsoftData = {
        profile: profile._json,
        accessToken,
        refreshToken,
        idToken: params.id_token,
        userId
      };

      return done(null, microsoftData);
    }
  )
);


module.exports = passport;