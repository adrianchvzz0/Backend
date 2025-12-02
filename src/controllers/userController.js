const supabase = require("../config/supabaseConfig");
const { validateTeacherEmployeeNumber } = require("../services/userRoleService");


exports.getAllUsers = async (req, res) => {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.json({ users: data.users });
};

exports.createUser = async (req, res) => {
    try {
        const { email, password, role, full_name, meta = {}, student, teacher, admin } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: "email, password y role son obligatorios" });
        }

        // 1️⃣ Crear usuario en Auth
        const { data: authUser, error: authError } =
            await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { role, ...meta }
            });

        if (authError) return res.status(400).json({ error: authError.message });

        const userId = authUser.user.id;

        // 2️⃣ Insertar en users
        const { error: userError } = await supabase
            .from("users")
            .insert({
                id: userId,
                email,
                full_name,
                role,
                meta
            });

        if (userError) return res.status(400).json({ error: userError.message });

        // 3️⃣ Insertar según rol
        if (role === "student" && student) {
            const { error } = await supabase
                .from("students")
                .insert({
                    user_id: userId,
                    enrollment_number: student.enrollment_number,
                    course: student.course,
                    year: student.year
                });

            if (error) return res.status(400).json({ error: error.message });
        }

        if (role === "teacher" && teacher) {
            // 🔹 Validar contra el catálogo
            await validateTeacherEmployeeNumber(teacher.employee_number, userId);

            const { error } = await supabase
                .from("teachers")
                .insert({
                    user_id: userId,
                    employee_number: teacher.employee_number,
                    department: teacher.department,
                    bio: teacher.bio
                });

            if (error) {
                return res.status(400).json({ error: error.message });
            }
        }
        if (role === "admin" && admin) {
            const { error } = await supabase
                .from("admins")
                .insert({
                    user_id: userId,
                    admin_level: admin.admin_level,
                    notes: admin.notes
                });

            if (error) return res.status(400).json({ error: error.message });
        }

        return res.status(201).json({
            message: "Usuario creado correctamente",
            id: userId
        });

    } catch (error) {
        console.error("Error en createUser:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.getUsers = async (req, res) => {
    const { role, name } = req.query;

    let query = supabase.auth.admin.listUsers();

    const { data, error } = await query;
    if (error) return res.status(400).json({ error });

    let users = data.users;

    if (role) {
        users = users.filter(u => u.user_metadata?.role?.toLowerCase() === role.toLowerCase());
    }

    if (name) {
        users = users.filter(u => u.user_metadata?.name?.toLowerCase().includes(name.toLowerCase()));
    }

    return res.json({ users });
};

// controllers/userController.js

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;

        const { email, full_name, role, meta } = req.body;

        // Evitar actualizar vacío
        const updates = {};
        if (email) updates.email = email;
        if (full_name) updates.full_name = full_name;
        if (role) updates.role = role;
        if (meta) updates.meta = meta;
        updates.updated_at = new Date();

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user: data,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: error.message,
        });
    }
};


