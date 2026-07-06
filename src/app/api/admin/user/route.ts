import { supabase, supabaseAdmin } from "@/lib/supabase";
import verifyAdmin from "@/lib/verify_admin";





export async function GET(req: Request) {
  const isAdmin = await verifyAdmin(req);

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [usersRes, adminsRes] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin.from("admins").select("id"),
  ]);

  if (usersRes.error) {
    return Response.json({ error: "Could not fetch users" }, { status: 500 });
  }

  const adminIds = new Set((adminsRes.data || []).map((a: any) => a.id));
  const normalUsers = (usersRes.data?.users || []).filter((u: any) => !adminIds.has(u.id));

  return Response.json({
    data: { users: normalUsers }
  }, { status: 200 });
}





// export async function POST(req: Request) {
//   const isAdmin = verifyAdmin();

//   if (!isAdmin) {
//     return Response.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   const body = await req.json();

//   const {
//     first_name,
//     last_name,
//     email
//   } = body;

//   const { data, error } = await supabase
//     .from("users")
//     .insert([
//       {
//         first_name,
//         last_name,
//         email
//       },
//     ])
//     .select(); // returns inserted row

//   if (error) {
//     console.error("Error creating user:", error);
//     return Response.json({ error: "Could not create user" }, { status: 500 });
//   }

//   return Response.json({ data }, { status: 200 });
// }





// export async function PUT(req: Request) {
//   const isAdmin = verifyAdmin();

//   if (!isAdmin) {
//     return Response.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   const body = await req.json();

//   const {
//     id,
//     first_name,
//     last_name,
//     email
//   } = body;

//   const { data, error } = await supabase
//     .from("users")
//     .update({
//       first_name,
//       last_name,
//       email
//     })
//     .eq("id", id) // 👈 THIS is the key part
//     .select();

//   if (error) {
//     return Response.json(
//       { error: "Could not update admin" },
//       { status: 500 }
//     );
//   }

//   return Response.json({ data }, { status: 200 });
// }







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

  const { error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .delete()
    .eq("user_id", id);

  if (bookingsError) {
    return Response.json(
      { error: "Could not delete user bookings" },
      { status: 500 }
    );
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (deleteError) {
    return Response.json(
      { error: "Could not delete user" },
      { status: 500 }
    );
  }

  return Response.json({ success: true }, { status: 200 });
}