// Backend/src/middlewares/supabaseAuth.js
const supabase = require("../config/supabaseConfig");

async function ensureUserInUsersTable(authUser) {
    const userId = authUser.id;
    const email = authUser.email;
    const meta = authUser.user_metadata || {};
    const role = meta.role || "student"; // valor por defecto
    const fullName = meta.full_name || meta.name || null;

    // 1️⃣ Verificar si ya existe en public.users
    const { data: existing, error: selectError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

    if (selectError) {
        console.error("Error consultando users:", selectError);
        // no lanzamos error fatal; dejamos que pase, pero lo logeamos
        return;
    }

    if (existing) {
        // Ya existe, podríamos opcionalmente sincronizar cambios de metadata, pero no es obligatorio
        return;
    }

    // 2️⃣ Insertar en public.users si no existe
    const { error: insertError } = await supabase.from("users").insert({
        id: userId,
        email,
        full_name: fullName,
        role,
        meta, // guarda todo el user_metadata como jsonb
    });

    if (insertError) {
        console.error("Error insertando en users:", insertError);
        return;
    }

    console.log(`Usuario sincronizado en users: ${userId} (${email})`);

    // 3️⃣ (Opcional) insertar en otras tablas según rol
    // Aquí solo dejo el esqueleto para cuando tengas más datos:
    try {
        if (role === "student") {

            await supabase.from("students").insert({
                user_id: userId,
                enrollment_number: null,
                course: null,
                year: null,
            });
        } else if (role === "teacher") {
            await supabase.from("teachers").insert({
                user_id: userId,
                employee_number: null,
                department: null,
                bio: null,
            });
        } else if (role === "admin") {
            await supabase.from("admins").insert({
                user_id: userId,
                admin_level: null,
                notes: null,
            });
        }
    } catch (e) {
        console.error("Error insertando en tabla específica de rol:", e);
    }
}

async function supabaseAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || "";

        if (!authHeader.startsWith("Bearer ")) {
            return res
                .status(401)
                .json({ error: "No autorizado: falta token Bearer" });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res
                .status(401)
                .json({ error: "No autorizado: token vacío" });
        }

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data?.user) {
            console.error("Error en supabase.auth.getUser:", error);
            return res
                .status(401)
                .json({ error: "No autorizado: token inválido" });
        }

        const authUser = data.user;

        // 🔹 1) Rellenar req.user para los controllers (createRoom, getMyRooms, etc.)
        req.user = authUser;

        // 🔹 2) Asegurar que exista en public.users
        await ensureUserInUsersTable(authUser);

        next();
    } catch (err) {
        console.error("Error en supabaseAuth middleware:", err);
        return res
            .status(500)
            .json({ error: "Error de autenticación interno" });
    }
}

module.exports = supabaseAuth;
