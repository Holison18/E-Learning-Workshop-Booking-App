import { supabase, supabaseAdmin } from "@/lib/supabase";
import { verifyPassword } from "@/lib/password";
import { createAdminSession, createAdminCookieHeader } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }
    
    const { data: admins, error } = await supabaseAdmin
      .from("admins")
      .select("*")
      .eq("email", email.trim())
      .limit(1);

    if (error) {
      console.error("Admin lookup error:", error);
      return Response.json({ error: "Database error. Ensure 'password_hash' column exists in the admins table." }, { status: 500 });
    }

    
    

    if (!admins || admins.length === 0) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }
    

    const admin = admins[0];
    console.log("Admin found:", admin);
    if (!admin.password) {
      return Response.json({ error: "No password set for this account. Contact super admin." }, { status: 401 });
    }

    const valid = await verifyPassword(password, admin.password);
    if (!valid) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createAdminSession({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return new Response(JSON.stringify({
      admin: {
        id: admin.id,
        first_name: admin.first_name,
        last_name: admin.last_name,
        email: admin.email,
        role: admin.role,
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createAdminCookieHeader(token),
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
