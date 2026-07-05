import { supabaseAdmin } from "@/lib/supabase";
import verifyAdmin from "@/lib/verify_admin";

export async function GET(req: Request) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [bookingsRes, workshopsRes, usersRes] = await Promise.all([
    supabaseAdmin.from("bookings").select("*").order("booked_at", { ascending: false }),
    supabaseAdmin.from("workshops").select("id, title, date, capacity, seats_booked, status"),
    supabaseAdmin.auth.admin.listUsers(),
  ]);

  const workshopMap = new Map((workshopsRes.data || []).map((w: any) => [w.id, w]));

  const authUserMap = new Map(
    (usersRes.data?.users || []).map((u: any) => [
      u.id,
      {
        id: u.id,
        first_name: u.user_metadata?.first_name || u.email?.split("@")[0] || "Unknown",
        last_name: u.user_metadata?.last_name || "",
        organization_name: u.user_metadata?.organization_name || null,
        email: u.email,
      },
    ])
  );

  const participantRes = await supabaseAdmin.from("participants").select("*");
  const participantMap = new Map(
    (participantRes.data || []).map((p: any) => [p.id, p])
  );

  const bookings = (bookingsRes.data || []).map((b: any) => {
    const fromParticipants = participantMap.get(b.user_id);
    const fromAuth = authUserMap.get(b.user_id);
    return {
      ...b,
      workshops: workshopMap.get(b.workshop_id) || null,
      participants: fromParticipants || fromAuth || null,
    };
  });

  return Response.json({ bookings }, { status: 200 });
}

export async function PATCH(req: Request) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, checked_in, approved } = body;

  if (!id) {
    return Response.json({ error: "Missing booking id" }, { status: 400 });
  }

  const updateData: Record<string, any> = {};
  if (typeof checked_in === "boolean") updateData.checked_in = checked_in;
  if (typeof approved === "boolean") updateData.approved = approved;

  const { error } = await supabaseAdmin
    .from("bookings")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return Response.json({ error: "Could not update booking" }, { status: 500 });
  }

  return Response.json({ success: true }, { status: 200 });
}
