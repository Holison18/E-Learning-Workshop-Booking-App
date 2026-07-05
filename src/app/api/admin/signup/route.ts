import { supabase, supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";
import { createAdminSession, createAdminCookieHeader } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const { first_name, last_name, email, password, role } = await req.json();

    const trimmedFirst = first_name?.trim();
    const trimmedLast = last_name?.trim();

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (!trimmedFirst || !trimmedLast) {
      return Response.json({ error: "First and last name are required and cannot be just spaces." }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    if (role !== 'admin' && role !== 'super_admin') {
      return Response.json({ error: "Role must be admin or super_admin" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: existing } = await supabase
      .from("admins")
      .select("id")
      .eq("email", normalizedEmail)
      .limit(1);

    if (existing && existing.length > 0) {
      return Response.json({ error: "An admin with this email already exists" }, { status: 409 });
    }

    const password_hash = await hashPassword(password.trim());

    const { data, error } = await supabaseAdmin
      .from("admins")
      .insert([{
        first_name: trimmedFirst,
        last_name: trimmedLast,
        email: normalizedEmail,
        role,
        password:password_hash,
      }])
      .select();

    if (error) {
      console.error("Error creating admin:", error);
      const msg = error.message?.includes('password_hash')
        ? 'Database setup needed: add "password_hash" column to the "admins" table. Run: ALTER TABLE admins ADD COLUMN password_hash text;'
        : 'Could not create admin account';
      return Response.json({ error: msg }, { status: 500 });
    }

    const admin = data[0];

    const token = await createAdminSession({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return new Response(JSON.stringify({
      message: "Admin account created successfully",
      admin: {
        id: admin.id,
        first_name: admin.first_name,
        last_name: admin.last_name,
        email: admin.email,
        role: admin.role,
      },
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createAdminCookieHeader(token),
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
