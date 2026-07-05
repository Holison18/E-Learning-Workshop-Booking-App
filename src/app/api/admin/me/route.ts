import { supabaseAdmin } from "@/lib/supabase";
import { getAdminFromRequest } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const session = await getAdminFromRequest(req);

  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  console.log("Admin session:", session);
  const { data } = await supabaseAdmin
    .from("admins")
    .select("id, first_name, last_name, email, role")
    .eq("id", session.id)
    .single();

  if (!data) {
    return Response.json({ error: "Admin not found" }, { status: 404 });
  }

  return Response.json({ admin: data }, { status: 200 });
}
