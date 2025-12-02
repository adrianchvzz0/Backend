const supabase = require("../config/supabaseConfig");

async function validateTeacherEmployeeNumber(employeeNumber, userId) {
    if (!employeeNumber) {
        throw new Error("Falta employee_number para rol teacher");
    }

    // Formato básico: solo dígitos de 4 a 10 (igual que en Flutter)
    if (!/^\d{4,10}$/.test(employeeNumber)) {
        throw new Error("Número de empleado inválido (formato)");
    }

    // 1️⃣ Validar que exista en el catálogo
    const { data: catalogEntry, error: catalogError } = await supabase
        .from("teacher_catalog")
        .select("*")
        .eq("employee_number", employeeNumber)
        .maybeSingle();

    if (catalogError) {
        console.error("Error consultando teacher_catalog:", catalogError);
        throw new Error("Error validando número de empleado");
    }

    if (!catalogEntry) {
        throw new Error("El número de empleado no está registrado en el catálogo");
    }

    if (catalogEntry.is_active === false) {
        throw new Error("Este número de empleado está inactivo");
    }

    // 2️⃣ Validar que no esté ya vinculado a otro usuario en teachers
    const { data: existingTeacher, error: teacherError } = await supabase
        .from("teachers")
        .select("id, user_id")
        .eq("employee_number", employeeNumber)
        .maybeSingle();

    if (teacherError) {
        console.error("Error consultando teachers:", teacherError);
        throw new Error("Error validando número de empleado");
    }

    if (existingTeacher && existingTeacher.user_id !== userId) {
        throw new Error(
            "Este número de empleado ya está asociado a otro usuario"
        );
    }
}

module.exports = {
    validateTeacherEmployeeNumber,
};
