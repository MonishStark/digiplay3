const express = require('express');
const router = express.Router()
const usersController = require('../controllers/user')
const auth = require('../middleware/authenticate');
const SuperAdminController = require('../controllers/superAdmin');


router.route('/auth/register')
    .post(usersController.createSessionURL)

router.route('/auth/refresh')
    .post(usersController.generateAccessToken)

router.route('/auth/email/check')
    .post(usersController.checkIfEmailExist)

router.route('/auth/payment/status')
    .get(usersController.checkPaymentStatus)

router.route('/auth/verify-account')
    .post(usersController.verifyUser)

router.route('/me/verification/resend')
    .post(auth.verifyToken, auth.userExists, usersController.resendVerificationMail)

router.route('/me/usage')
    .get(auth.verifyToken, usersController.getUserUsageData)

router.route('/auth/login')
    .post(usersController.validateLoginCredentials)

router.route('/auth/verify-otp')
    .post(usersController.validateOTPAndAuthenticateUser)

router.route('/integrations')
    .get(auth.verifyToken, auth.userExists, usersController.getUserCloudIntegraion)

router.route('/integrations/:integrationId')
    .patch(auth.verifyToken, auth.userExists, usersController.updateUserCloudIntegration)


router.route('/integrations/:integrationId/files')
    .get(auth.verifyToken, auth.userExists, usersController.getIntegrationFiles)

    router.route('/integrations/:integrationId/files/:fileId/import')
    .get(auth.verifyToken, auth.userExists, auth.isSenderOwner, usersController.getIntegrationFile)

// router.route('/user/googleDrive/files')
//     .post(auth.verifyToken, auth.userExists, usersController.googleDriveFiles)

// router.route('/user/oneDrive/files')
//     .post(auth.verifyToken, auth.userExists, usersController.oneDriveFiles)

// router.route('/user/dropbox/files')
//     .post(auth.verifyToken, auth.userExists, usersController.dropboxFiles)

// router.route('/user/wordpress/files')
//     .post(auth.verifyToken, auth.userExists, usersController.wordpressFiles)

// router.route('/user/slack/files')
//     .post(auth.verifyToken, auth.userExists, usersController.slackFiles)

router.route('/me/profile')
    .get(auth.verifyToken, auth.userExistsM2, usersController.getUserData)

router.route('/auth/password/forgot')
    .post(usersController.sendResetPasswordLink)

router.route('/auth/password/reset')
    .post(usersController.changePassword)

router.route('/auth/reset-password')
    .get(usersController.resetPassword)    

router.route('/me/password')
    .post(auth.verifyToken, auth.validateNewPassword,usersController.changeCurrentPassword) 

router.route('/me/password/set')
    .post(auth.verifyToken, auth.userExistsM2, usersController.setPassword)

router.route('/me/email')
    .post(auth.verifyToken, auth.userExistsM2,auth.validateNewEmail, usersController.updateEmail)

router.route('/me/2fa')
    .post(auth.verifyToken, auth.userExistsM2, auth.isAccountVerified, usersController.updatetwoFactorEnabled)

router.route('/companies/:companyId/2fa')
    .post(auth.verifyToken, auth.adminAccess, auth.userExistsM2, auth.companyExist, auth.isUserBelongsToCompany, auth.isCompanyUser, auth.isAccountVerified, usersController.updateCompanytwoFactorEnabled)

router.route('/invitations')
    .post(auth.verifyToken, auth.adminAccess, auth.isValidRole, auth.companyExist, auth.isCompanyUser, usersController.sendInvitation)

router.route('/invitations')
    .get(auth.verifyToken, auth.adminAccess, auth.companyExist, auth.isCompanyUser, usersController.getInvitationList)

router.route('/invitations/verify')
    .post(usersController.getInvitationData)

router.route('/companies/:companyId/invitations/:invitationId')
    .delete(auth.verifyToken, auth.adminAccess, auth.isValidInvitationId, auth.companyExist, auth.isCompanyUser, usersController.deleteInvitation)

router.route('/companies/:companyId/invitations/:invitationId/resend')
    .post(auth.verifyToken, auth.adminAccess, auth.companyExist, auth.isCompanyUser, usersController.resendInvitation)

// router.route('/auth/invited-user')
//     .post(auth.companyExist, auth.isValidRole, usersController.createAccountForInvitedUser)

router.route('/invitation/decline')
    .post(usersController.declineInvitation)

router.route('/admin/users/:userId')
    .get(auth.verifyToken, auth.adminAccess, auth.userExists, auth.hasUserEditAccess, usersController.getUserDetailsForAdmin)

router.route('/admin/get-superAdmin-detail')
    .post(auth.verifyToken, auth.superAdminAccess, auth.userExists, auth.hasUserEditAccess, usersController.getUserDetailsForAdmin)

router.route('/admin/users/:userId/verify')
    .post(auth.verifyToken, auth.adminAccess, auth.userExists, auth.hasUserEditAccess, usersController.verifyAccountForAdmin)

router.route('/admin/users/:userId/2fa')
    .patch(auth.verifyToken, auth.adminAccess, auth.userExists, auth.hasUserEditAccess, usersController.update2FAFordmin)

// router.route('/admin/change-lock-status')
//     .post(auth.verifyToken, auth.adminAccess, auth.userExists, auth.hasUserEditAccess, usersController.userLockAndUnlockOptionForAdmin)

router.route('/admin/users/:userId/password')
    .patch(auth.verifyToken, auth.adminAccess, auth.userExists, auth.hasUserEditAccess, usersController.adminUpdatePasswordOptionForUser)

// router.route('/admin/blacklist-user')
//     .post(auth.verifyToken, auth.adminAccess, auth.userExists, auth.hasUserEditAccess, usersController.blackListUserAccount)

router.route('/admin/users/:userId/account-status')
    .patch(auth.verifyToken, auth.adminAccess, auth.userExists, auth.hasUserEditAccess, usersController.UpdateUserAccountStatus)

router.route('/me/subscription')
    .get(auth.verifyToken, auth.adminAccess, usersController.getSubscriptionDetails)

router.route('/admin/users/:userId')
    .delete(auth.verifyToken, auth.adminAccess, usersController.removeUserPermanently)

// router.route('/user-role')
//     .post(auth.verifyToken, usersController.getUserDynamicRoles)

router.route('/super-admin/clients')
    .get(auth.verifyToken, auth.superAdminAccess, usersController.getClientsforSuperAdmin)
    router.route('/super-admin/companies')
    .get(auth.verifyToken, auth.superAdminAccess, usersController.getCompaniesforSuperAdmin)

router.route('/get/user/users')
    .post(auth.verifyToken, auth.superAdminAccess, usersController.getUserInvitedDetailsforSuperAdmin)

router.route('/user/create-account-for-super-user')
    .post(usersController.createAccountForSuperUser)

router.route('/super-user-email')
    .post(usersController.getSuperEmail)

router.route('/remove-suoer-user')
    .post(usersController.removeSuperUserPermanently)

router.route("/user/delete-profile")
    .post(auth.verifyToken, auth.userExists, SuperAdminController.deleteUser)

router.route("/user/delete-team-profile")
    .post(auth.verifyToken, auth.userExists, auth.hasUserEditAccess, SuperAdminController.deleteTeamAccount)

router.route('/auth/invite')
    .get(usersController.validateInviteToken)

router.route('/auth/invite/decline/:email/:token')
    .get(usersController.declineInviteToken)

module.exports = () => router;
