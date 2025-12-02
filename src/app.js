const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);
const chatRoutes = require("./routes/chat");
app.use("/api/chat", chatRoutes);
const surveyRoutes = require("./routes/surveys");
app.use("/api/surveys", surveyRoutes);


module.exports = app;
