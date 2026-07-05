import { supabaseAdmin } from "@/lib/supabase";
import verifyAdmin from "@/lib/verify_admin";

export async function POST(req: Request) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("facilitator-images")
    .upload(path, file);

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from("facilitator-images").getPublicUrl(path);

  return Response.json({ url: data.publicUrl }, { status: 200 });
}
