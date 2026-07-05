import { supabase } from "@/lib/supabase";






export async function GET(req: Request) {


  const authHeader = req.headers.get("authorization");

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
    return Response.json({ error: "Could not fetch workshops" }, { status: 500 });
  }



  return Response.json({
    data: data
  }, { status: 200 });
}

