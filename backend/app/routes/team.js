const express = require('express');
const router = express.Router()
const TeamController = require('../controllers/team')
const auth = require('../middleware/authenticate')

router.route('/teams')
    .post(auth.verifyToken, auth.adminAccess, auth.companyExist, auth.isCompanyUser, TeamController.createNewTeam)

router.route('/teams/:teamId')
    .put(auth.verifyToken, auth.adminAccess, auth.companyExist, auth.teamExists, auth.isCompanyUser, auth.isMemberOfTeam, TeamController.updateTeam)

router.route('/teams')
    .get(auth.verifyToken, auth.companyExist, auth.isCompanyUser, TeamController.getTeamList)

router.route('/teams/shared')
    .get(auth.verifyToken, TeamController.getSharedTeamList)

router.route('/teams/:teamId/status')
    .patch(auth.verifyToken, auth.adminAccess, auth.companyExist, auth.teamExists, auth.isCompanyUser, auth.isMemberOfTeam, TeamController.updateTeamStatus)

router.route('/teams/active')
    .get(auth.verifyToken, auth.companyExist, auth.isCompanyUser, TeamController.getActiveTeamList)

module.exports = () => router;
