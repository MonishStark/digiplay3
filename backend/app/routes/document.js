const express = require('express');
const router = express.Router()
const DocumentController = require('../controllers/documents')
const auth = require('../middleware/authenticate')


router.route('/teams/:teamId/folders')
    .post(auth.verifyToken, auth.onlyAdminOrUser, auth.teamExists, auth.isMemberOfTeamOrSharedMember, auth.isValidParent, DocumentController.createNewFolder)

router.route('/teams/:teamId/files')
    .post(auth.verifyToken, auth.onlyAdminOrUser, auth.teamExists, auth.isMemberOfTeamOrSharedMember, auth.isValidParent, DocumentController.createTextDocument)

router.route('/teams/:teamId/files/:fileId')
    .patch(auth.verifyToken, auth.onlyAdminOrUser, auth.teamExists, auth.isMemberOfTeamOrFileCreatorOfSharedTeam, auth.isValidParent, auth.isValidFile, DocumentController.updateDocument)

router.route('/companies/:companyId/usage')
    .get(auth.verifyToken, auth.adminOrSuperAdminAccess, auth.companyExist, auth.isCompanyUser, DocumentController.getCompanyUsageData)

router.route('/companies/:companyId/profile')
    .get(auth.verifyToken, auth.adminAccess, auth.companyExist, auth.isCompanyUser, DocumentController.getCompanyData)

router.route('/teams/:teamId/files/:fileId')
    .get(auth.verifyToken, auth.teamExists, auth.isMemberOfTeamOrSharedMember, auth.isValidFileM2, DocumentController.getFile)

router.route('/teams/:teamId/folders/:folderId')
    .put(auth.verifyToken, auth.onlyAdminOrUser, auth.teamExists, auth.isMemberOfTeamOrFolderCreatorOfSharedTeam, auth.isValidFolder, DocumentController.updateFolderData)

router.route('/teams/:teamId/files/:fileId/name')
    .patch(auth.verifyToken, auth.onlyAdminOrUser, auth.teamExists, auth.isMemberOfTeamOrFileCreatorOfSharedTeam, auth.isValidFile, DocumentController.changeFileName)

    // router.route('/file-manager/update-file')
    // .patch(auth.verifyToken, auth.onlyAdminOrUser, auth.teamExists, auth.isMemberOfTeamOrFileCreatorOfSharedTeam, auth.isValidFile, DocumentController.changeFileName)

router.route('/teams/:teamId/folders/:folderId')
    .delete(auth.verifyToken,auth.isValidFolder, DocumentController.deleteFolder)

router.route('/teams/:teamId/files/:fileId')
    .delete(auth.verifyToken, auth.onlyAdminOrUser, auth.isMemberOfTeamOrFileCreatorOfSharedTeam, auth.isValidFile, DocumentController.deleteFile)

router.route('/teams/:teamId/folders')
    .get(auth.verifyToken, auth.teamExists, auth.isMemberOfTeamOrSharedMember, DocumentController.getFilesAndFoldersForTeam)

router.route('/teams/:teamId/folders/:parentId/tree')
    .get(auth.verifyToken, DocumentController.getFolderTreeForFile)

module.exports = () => router;

