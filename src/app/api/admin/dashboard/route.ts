import { supabaseAdmin } from "@/lib/supabase";
import verifyAdmin from "@/lib/verify_admin";

export async function GET(req: Request) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [workshopsRes, bookingsRes, usersRes] = await Promise.all([
    supabaseAdmin.from("workshops").select("id, title, date, capacity, seats_booked, status"),
    supabaseAdmin.from("bookings").select("*").order("booked_at", { ascending: false }),
    supabaseAdmin.auth.admin.listUsers(),
  ]);

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

  let totalParticipants = 0;
  let participantMap = new Map();

  const countRes = await supabaseAdmin
    .from("participants")
    .select("id", { count: "exact", head: true });

  if (!countRes.error) {
    totalParticipants = countRes.count || 0;
    const dataRes = await supabaseAdmin.from("participants").select("*");
    if (!dataRes.error && dataRes.data) {
      participantMap = new Map(dataRes.data.map((p: any) => [p.id, p]));
    }
  }

  const workshopMap = new Map((workshopsRes.data || []).map((w: any) => [w.id, w]));

  const bookings = (bookingsRes.data || []).map((b: any) => {
    const fromParticipants = participantMap.get(b.user_id);
    const fromAuth = authUserMap.get(b.user_id);
    return {
      ...b,
      workshops: workshopMap.get(b.workshop_id) || null,
      participants: fromParticipants || fromAuth || null,
    };
  });

  return Response.json({
    workshops: workshopsRes.data || [],
    totalParticipants,
    bookings,
  }, { status: 200 });
}
