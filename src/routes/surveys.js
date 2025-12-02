// src/routes/surveys.js
const express = require("express");
const router = express.Router();
const supabaseAuth = require("../middlewares/supabaseAuth");
const surveysController = require("../controllers/surveysController");

// Todas las rutas requieren usuario autenticado
router.use(supabaseAuth);

// Crear encuesta + preguntas
router.post("/create", surveysController.createSurvey);

// Listar encuestas activas de un room
router.get("/by-room", surveysController.getSurveysByRoom);

// Obtener preguntas de una encuesta
router.get("/:id/questions", surveysController.getSurveyQuestions);

// Enviar respuestas
router.post("/:id/submit", surveysController.submitSurvey);

// (Opcional) Ver resultados agregados
router.get("/:id/results", surveysController.getSurveyResults);

router.get("/", surveysController.getAllSurveys);


module.exports = router;
