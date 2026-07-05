import { supabaseAdmin } from "@/lib/supabase";
import verifyAdmin from "@/lib/verify_admin";





export async function GET(req: Request) {
  const isAdmin = await verifyAdmin(req);

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }


  const { data, error } = await supabaseAdmin.from("admins").select("*");

  return Response.json({
    data: data
  }, { status: 200 });
}





export async function POST(req: Request) {
  const isAdmin = await verifyAdmin(req);

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const {
    first_name,
    last_name,
    email
  } = body;

  const { data, error } = await supabaseAdmin
    .from("admins")
    .insert([
      {
        first_name,
        last_name,
        email
      },
    ])
    .select(); // returns inserted row

  if (error) {
    console.error("Error creating admin:", error);
    return Response.json({ error: "Could not create admin" }, { status: 500 });
  }

  return Response.json({ data }, { status: 200 });
}





export async function PUT(req: Request) {
  const isAdmin = await verifyAdmin(req);

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const {
    id,
    first_name,
    last_name,
    email
  } = body;

  const { data, error } = await supabaseAdmin
    .from("admins")
    .update({
      first_name,
      last_name,
      email
    })
    .eq("id", id)
    .select();

  if (error) {
    return Response.json(
      { error: "Could not update admin" },
      { status: 500 }
    );
  }

  return Response.json({ data }, { status: 200 });
}







export async function DELETE(req: Request) {
  const isAdmin = await verifyAdmin(req);

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("admins")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    return Response.json(
      { error: "Could not delete admin" },
      { status: 500 }
    );
  }

  return Response.json({ data }, { status: 200 });
}