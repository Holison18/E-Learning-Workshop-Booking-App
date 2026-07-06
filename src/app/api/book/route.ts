import { supabase, supabaseAdmin } from "@/lib/supabase";






export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return Response.json({ error: "No token" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");

 const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = userData.user.id;

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*, workshops(*)") // pulls in workshop details for each booking
    .eq("user_id", userId);

  if (error) {
    return Response.json({ error: "Could not fetch bookings" }, { status: 500 });
  }

  const filteredData = (data || []).filter(
    (b: any) => b.workshops?.status === "published"
  );

  return Response.json({
    data: filteredData
  }, { status: 200 });
}





export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return Response.json({ error: "No token" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = userData.user.id;
  const body = await req.json();
  const { workshopId } = body;

  if (!workshopId) {
    return Response.json({ error: "Missing workshopId" }, { status: 400 });
  }

  // 1. Get the workshop being booked (need its date/time to check conflicts)
  const { data: targetWorkshop, error: targetError } = await supabaseAdmin
    .from("workshops")
    .select("id, date, start_time, status")
    .eq("id", workshopId)
    .single();

  if (targetError || !targetWorkshop) {
    return Response.json({ error: "Workshop not found" }, { status: 404 });
  }

  if (targetWorkshop.status !== "published") {
    return Response.json({ error: "Workshop not found" }, { status: 404 });
  }

  // 2. Get all of this user's existing bookings, with workshop details joined in
  const { data: existingBookings, error: fetchError } = await supabase
    .from("bookings")
    .select("*, workshops(*)")
    .eq("user_id", userId);

  if (fetchError) {
    return Response.json({ error: "Could not fetch bookings" }, { status: 500 });
  }

  // 3. Already booked this exact workshop -> ignore, just return the existing booking
  const alreadyBooked = existingBookings.find(
    (b: any) => b.workshop_id === workshopId
  );
  if (alreadyBooked) {
    return Response.json({ data: alreadyBooked, message: "Already booked" }, { status: 401 });
  }

  // 4. Check for a scheduling conflict with a *different* workshop
  const conflict = existingBookings.find((b: any) => {
    const w = b.workshops;
    if (!w) return false;
    return (
      w.date === targetWorkshop.date &&
      w.start_time === targetWorkshop.start_time
    );
  });

  if (conflict) {
    return Response.json(
      { error: "You have booked a workshop that coincides with this workshop" },
      { status: 409 }
    );
  }

  // 5. Check overbooking limit (uses capacity as fallback until overbooking_limit column exists)
  const { data: workshopSeats, error: seatsError } = await supabaseAdmin
    .from("workshops")
    .select("seats_booked, capacity")
    .eq("id", workshopId)
    .single();

  if (seatsError) {
    return Response.json({ error: "Could not check availability" }, { status: 500 });
  }

  if (workshopSeats.seats_booked >= workshopSeats.capacity) {
    return Response.json(
      { error: "This workshop is fully booked." },
      { status: 409 }
    );
  }

  // 6. No duplicate, no conflict, under limit -> create the booking
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert([{ user_id: userId, workshop_id: workshopId }])
    .select();

  if (error) {
    console.error("Error creating booking:", error);
    return Response.json({ error: "Could not create booking" }, { status: 500 });
  }

  return Response.json({ data }, { status: 200 });
}



export async function DELETE(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return Response.json({ error: "No token" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");

 const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const userId = userData.user.id;
  const { bookId } = body;

  if (!bookId) {
    return Response.json({ error: "No booking ID provided" }, { status: 400 });
  }

  // Look up the booking first to confirm ownership
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("id, user_id, checked_in")
    .eq("id", bookId)
    .single();

  if (fetchError || !booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.user_id !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (booking.checked_in) {
    return Response.json({ error: "Cannot cancel a checked-in booking." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .delete()
    .eq("id", bookId)
    .select();

  if (error) {
    console.error("Error deleting booking:", error);
    return Response.json({ error: "Could not delete booking" }, { status: 500 });
  }

  return Response.json({ data }, { status: 200 });
}

