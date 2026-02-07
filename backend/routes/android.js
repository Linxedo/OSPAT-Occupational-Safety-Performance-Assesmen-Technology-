const express = require('express');
const { validateApiKey, authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Import controllers
const authController = require('../controllers/android/authController');
const questionsController = require('../controllers/android/questionsController');
const settingsController = require('../controllers/android/settingsController');
const testResultsController = require('../controllers/android/testResultsController');
const userAnswersController = require('../controllers/android/userAnswersController');

const router = express.Router();

// RATE LIMITING
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false,
});

// Biking Verifikasi ke Semua Routes API Android
router.use(validateApiKey);
router.use(apiLimiter);

// API Login
router.post("/login", authController.login);

// API Edit Pertanyaan
router.get("/questions", questionsController.getQuestions);
router.post("/questions", questionsController.createQuestion);
router.put("/questions/:id", questionsController.updateQuestion);
router.delete("/questions/:id", questionsController.deleteQuestion);

// API Routes Android
router.get("/settings", settingsController.getSettings);
router.post("/settings", settingsController.updateSettings);
router.get("/settings/stream", settingsController.streamSettings); //Sync Antara Android Dengan Web

// Protected Routes (Require Token)
router.post("/results", authenticateToken, testResultsController.saveTestResults);
router.post("/user-answers", authenticateToken, userAnswersController.saveUserAnswers);

module.exports = router;