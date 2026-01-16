const express = require('express');
const AppdataController = require('../controllers/appdata');
const router = express.Router()

router.route('/app-data')
    .get(AppdataController.appData)

module.exports = () => router;