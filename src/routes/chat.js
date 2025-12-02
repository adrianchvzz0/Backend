const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const supabaseAuth = require("../middlewares/supabaseAuth");

// ✅ Todas las rutas de chat requieren usuario autenticado
router.use(supabaseAuth);

router.post("/rooms/create", chatController.createRoom);           // Crear un grupo
router.post("/rooms/add-user", chatController.addUserToRoom);      // Agregar usuario a grupo
router.get("/rooms/my", chatController.getMyRooms);                // Obtener grupos del usuario
router.get("/rooms/messages", chatController.getRoomMessages);     // Obtener mensajes de un grupo
router.post("/messages/send", chatController.sendMessage);         // Enviar mensaje
router.get("/rooms/members", chatController.getRoomMembers);       // Ver miembros de un room

module.exports = router;
