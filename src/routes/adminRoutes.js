// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const surveyController = require('../controllers/surveyController');
const { requireAdmin } = require('../middlewares/authMiddleware');

router.get('/users', requireAdmin, userController.getUsersForDashboard);
router.get('/surveys', requireAdmin, surveyController.getSurveys);
router.get('/surveys/responses', requireAdmin, surveyController.getSurveyResponses);

module.exports = router;
