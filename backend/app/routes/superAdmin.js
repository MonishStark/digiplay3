const express = require('express');
const router = express.Router()
const SuperAdminController = require('../controllers/superAdmin')
const auth = require('../middleware/authenticate')

router.route('/super-admin/users/:userId/role')
    .get(auth.verifyToken, auth.superAdminAccess, SuperAdminController.getRoles)

router.route('/super-admin/environment')
    .get(auth.verifyToken, auth.superAdminAccess, SuperAdminController.getENV)

router.route('/super-admin/environment')
    .patch(auth.verifyToken, auth.superAdminAccess, SuperAdminController.updateENV)

router.route('/super-admin/email/templates')
    .get(auth.verifyToken, auth.superAdminAccess, SuperAdminController.getEmailTemplates)

router.route('/super-admin/email/templates/:templateId')
    .patch(auth.verifyToken, auth.superAdminAccess, SuperAdminController.updateTemplate)

router.route('/super-admin/companies/:companyId/usage')
    .get(auth.verifyToken, auth.superAdminAccess, SuperAdminController.getCompanyUsageDataForSuperAdmin)

router.route('/super-admin/users/:userId/usage')
    .get(auth.verifyToken, auth.superAdminAccess, SuperAdminController.getUserUsageDataForSuperAdmin)

// router.route("/super-admin/delete-user")
//     .post(auth.verifyToken, auth.superAdminAccess, SuperAdminController.deleteUser)

router.route("/super-admin/companies/:companyId")
    .delete(auth.verifyToken, auth.superAdminAccess, SuperAdminController.deleteTeamAccount)

module.exports = () => router;
