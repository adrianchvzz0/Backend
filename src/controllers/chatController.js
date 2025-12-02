const supabase = require("../config/supabaseConfig");


/* ======================================================
   SEND MESSAGE
====================================================== */
// SEND MESSAGE
exports.sendMessage = async (req, res) => {
    const { room_id, sender_id, content } = req.body;

    if (!room_id || !sender_id || !content) {
        return res.status(400).json({ error: "Faltan campos" });
    }

    // 1️⃣ Insertar mensaje
    const { data: message, error } = await supabase
        .from("messages")
        .insert([{ room_id, sender_id, content }])
        .select("*")
        .single();

    if (error) return res.status(400).json({ error });

    // 2️⃣ Actualizar último mensaje en rooms
    await supabase
        .from("rooms")
        .update({
            last_message: content,
            last_message_at: message.created_at,
        })
        .eq("id", room_id);

    res.json({ message: "Mensaje enviado", data: message });
};


/* ======================================================
   GET ROOM MESSAGES
====================================================== */
exports.getRoomMessages = async (req, res) => {
    const { room_id } = req.query;

    if (!room_id) {
        return res.status(400).json({ error: "Falta room_id" });
    }

    const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", room_id)
        .order("created_at", { ascending: true });

    if (error) return res.status(400).json({ error });

    res.json({ messages: data });
};

/* ======================================================
   CREATE ROOM
====================================================== */
// POST /chat/rooms/create
exports.createRoom = async (req, res) => {
    try {
        const { name, type, metadata } = req.body;
        const userId = req.user?.id; // ← viene del token supabase

        if (!userId) {
            return res
                .status(401)
                .json({ error: "No autorizado: falta usuario en la request" });
        }

        const { data: room, error: roomError } = await supabase
            .from("rooms")
            .insert({
                name,
                type,
                metadata,
                created_by: userId,
            })
            .select()
            .single();

        if (roomError)
            return res.status(400).json({ error: roomError.message });

        // agregar creador como miembro
        await supabase.from("room_members").insert({
            room_id: room.id,
            user_id: userId,
            role_in_room: "admin",
        });

        res.status(201).json({ room });
    } catch (err) {
        console.error("Error en createRoom:", err);
        res.status(500).json({ error: err.message });
    }
};


/* ======================================================
   ADD USER TO ROOM
====================================================== */
exports.addUserToRoom = async (req, res) => {
    const { room_id, user_id } = req.body;

    if (!room_id || !user_id) {
        return res.status(400).json({ error: "Faltan campos" });
    }

    // Prevenir duplicados
    const { data: exists } = await supabase
        .from("room_members")
        .select("*")
        .eq("room_id", room_id)
        .eq("user_id", user_id)
        .maybeSingle();

    if (exists) {
        return res.json({ message: "El usuario ya está en el room", member: exists });
    }

    const { data, error } = await supabase
        .from("room_members")
        .insert([{ room_id, user_id }])
        .select("*")
        .single();

    if (error) return res.status(400).json({ error });

    res.json({ message: "Usuario agregado", member: data });
};

/* ======================================================
   GET MY ROOMS
====================================================== */
// GET MY ROOMS
exports.getMyRooms = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: "No autorizado: falta usuario" });
        }

        const { data, error } = await supabase
            .from("room_members")
            .select(`
        room_id,
        role_in_room,
        rooms (
          id,
          name,
          type,
          metadata,
          created_by,
          created_at,
          last_message,
          last_message_at
        )
      `)
            .eq("user_id", userId);

        if (error) {
            console.error("Supabase error getMyRooms:", error);
            return res.status(400).json({
                error: "Error al obtener los grupos",
                details: error.message,
            });
        }

        const roomsMap = new Map();
        (data || []).forEach((row) => {
            if (row.rooms) {
                const room = {
                    ...row.rooms,
                    role_in_room: row.role_in_room,
                };
                roomsMap.set(room.id, room);
            }
        });

        const rooms = Array.from(roomsMap.values());

        return res.json({ rooms });
    } catch (err) {
        console.error("Error en getMyRooms:", err);
        return res
            .status(500)
            .json({ error: "Error interno al obtener los grupos" });
    }
};


/* ======================================================
   GET ROOM MEMBERS
====================================================== */
exports.getRoomMembers = async (req, res) => {
    try {
        const { room_id } = req.query;

        if (!room_id) {
            return res.status(400).json({ error: "Falta room_id" });
        }

        // room_members.user_id → users.id (tabla users propia)
        const { data, error } = await supabase
            .from("room_members")
            .select(`
        user_id,
        role_in_room,
        users (
          id,
          email,
          full_name,
          role,
          meta
        )
      `)
            .eq("room_id", room_id);

        if (error) {
            console.error("Supabase error getRoomMembers:", error);
            return res.status(400).json({
                error: "Error al obtener los miembros",
                details: error.message,
            });
        }

        const members = (data || []).map((row) => ({
            user_id: row.user_id,
            role_in_room: row.role_in_room,
            user: row.users, // datos de la tabla users
        }));

        return res.json({ members });
    } catch (err) {
        console.error("Error en getRoomMembers:", err);
        return res
            .status(500)
            .json({ error: "Error interno al obtener los miembros" });
    }
};
