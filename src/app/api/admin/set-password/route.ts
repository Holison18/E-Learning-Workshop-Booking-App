import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";
import { getAdminFromRequest } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password, adminId } = await req.json();
    const targetId = adminId || admin.id;

    if (!password || password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    if (admin.role !== 'super_admin' && targetId !== admin.id) {
      return Response.json({ error: "Only super admins can set passwords for other admins" }, { status: 403 });
    }

    const password_hash = await hashPassword(password);

    const { error } = await supabase
      .from("admins")
      .update({ password_hash })
      .eq("id", targetId);

    if (error) {
      console.error("Error setting password:", error);
      return Response.json({ error: "Could not set password" }, { status: 500 });
    }

    return Response.json({ message: "Password set successfully" }, { status: 200 });
  } catch (err) {
    console.error("Set password error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
