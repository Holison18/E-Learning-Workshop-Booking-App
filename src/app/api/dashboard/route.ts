import { supabase } from "@/lib/supabase";





export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  console.log("Authorization Header:", authHeader); // Debugging line

  if (!authHeader) {
    return Response.json({ error: "No token" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");

 const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.from("workshops").select("*");

  if (error) {
    return Response.json({ error }, { status: 500 });
  }


  return Response.json({
    message: "User is logged in",
    user: userData.user,
    result: data,
  });
}



// export async function GET() {
//   const { data, error } = await supabase
//     .from("workshops")
//     .select("*");

//   if (error) {
//     return Response.json({ error }, { status: 500 });
//   }

//   return Response.json({ data });
// }




export async function POST(req: Request) {
  const body = await req.json();

  const { participant_id, workshop_id } = body;

  const { data, error } = await supabase
    .from("bookings")
    .insert([
      {
        participant_id,
        workshop_id,
      },
    ])
    .select();

  if (error) {
    return Response.json({ error }, { status: 500 });
  }

  return Response.json({ data });
}