// controllers/surveysController.js
const supabase = require("../config/supabaseConfig");

exports.createSurvey = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "No autorizado" });
        }

        const {
            room_id,
            title,
            description,
            metadata,
            questions = [],
        } = req.body;

        // 1️⃣ Crear encuesta
        const { data: survey, error: surveyError } = await supabase
            .from("surveys")
            .insert({
                room_id,
                title,
                description,
                created_by: userId,
                metadata: metadata || {},
            })
            .select()
            .single();

        if (surveyError) {
            return res.status(400).json({ error: surveyError.message });
        }

        // 2️⃣ Insertar preguntas
        // questions: [{ question_text, question_type, options, ordinal }, ...]
        const questionsToInsert = questions.map((q, idx) => ({
            survey_id: survey.id,
            question_text: q.question_text,
            question_type: q.question_type, // 'rating' | 'text' | 'single_choice' | 'multiple_choice'
            options: q.options || [],
            ordinal: q.ordinal ?? idx,
        }));

        let insertedQuestions = [];
        if (questionsToInsert.length > 0) {
            const { data: qData, error: qError } = await supabase
                .from("survey_questions")
                .insert(questionsToInsert)
                .select();

            if (qError) {
                return res.status(400).json({ error: qError.message });
            }
            insertedQuestions = qData;
        }

        return res.status(201).json({
            survey,
            questions: insertedQuestions,
        });
    } catch (err) {
        console.error("createSurvey error:", err);
        return res.status(500).json({ error: "Error interno al crear encuesta" });
    }
};

exports.getSurveysByRoom = async (req, res) => {
    const { room_id } = req.query;
    if (!room_id) {
        return res.status(400).json({ error: "Falta room_id" });
    }

    const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("room_id", room_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    return res.json({ surveys: data });
};

exports.getSurveyQuestions = async (req, res) => {
    const { id } = req.params;

    const { data, error } = await supabase
        .from("survey_questions")
        .select("*")
        .eq("survey_id", id)
        .order("ordinal", { ascending: true });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    return res.json({ questions: data });
};

exports.submitSurvey = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "No autorizado" });

        const { id: surveyId } = req.params;
        const { answers = [] } = req.body;
        // answers: [{question_id, response}, ...]
        // response será jsonb (puede ser string, número, arreglo, etc.)

        const rows = answers.map((a) => ({
            survey_id: surveyId,
            question_id: a.question_id,
            respondent_id: userId,
            response: a.response,
        }));

        const { data, error } = await supabase
            .from("survey_responses")
            .insert(rows)
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(201).json({ responses: data });
    } catch (err) {
        console.error("submitSurvey error:", err);
        return res.status(500).json({ error: "Error interno al guardar respuestas" });
    }
};

exports.getSurveyResults = async (req, res) => {
    const { id: surveyId } = req.params;

    const { data, error } = await supabase
        .from("survey_responses")
        .select(`
      id,
      question_id,
      respondent_id,
      response,
      responded_at,
      survey_questions (
        question_text,
        question_type,
        options
      )
    `)
        .eq("survey_id", surveyId);

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    return res.json({ responses: data });
};

// GET /api/surveys?room_id=...&active_only=true|false
exports.getAllSurveys = async (req, res) => {
    try {
        const { room_id, active_only } = req.query;

        let query = supabase
            .from("surveys")
            .select(
                `
        id,
        title,
        description,
        is_active,
        room_id,
        created_by,
        created_at,
        starts_at,
        ends_at,
        metadata,
        rooms (
          id,
          name,
          type
        )
      `
            )
            .order("created_at", { ascending: false });

        // 🔹 Si mandas room_id, filtra por ese room
        if (room_id) {
            query = query.eq("room_id", room_id);
        }

        // 🔹 Si pones active_only=true, solo activas
        if (active_only === "true") {
            query = query.eq("is_active", true);
        }

        const { data, error } = await query;

        if (error) {
            console.error("getAllSurveys error:", error);
            return res.status(400).json({ error: error.message });
        }

        return res.json({ surveys: data });
    } catch (err) {
        console.error("getAllSurveys error:", err);
        return res
            .status(500)
            .json({ error: "Error interno al obtener encuestas" });
    }
};
