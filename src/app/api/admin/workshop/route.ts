import { supabase, supabaseAdmin } from "@/lib/supabase";
import verifyAdmin from "@/lib/verify_admin";





export async function GET(req: Request) {
  const isAdmin = await verifyAdmin(req);

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  let query = supabaseAdmin.from("workshops").select("*");
  if (id) query = query.eq("id", id);

  const { data, error } = await query;

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
    title,
    description,
    facilitator,
    location,
    date,
    start_time,
    end_time,
    capacity,
    overbooking_limit,
    category,
    status,
    image_url,
    facilitator_image_url,
  } = body;

  if (overbooking_limit !== undefined && overbooking_limit < capacity) {
    return Response.json({ error: "Overbooking limit cannot be less than capacity" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("workshops")
    .insert([
      {
        title,
        description,
        facilitator,
        location,
        date,
        start_time,
        end_time,
        capacity,
        overbooking_limit: overbooking_limit ?? capacity,
        category,
        status,
        image_url,
        facilitator_image_url,
      },
    ])
    .select();

  if (error) {
    console.error("Error creating workshop:", error);
    return Response.json({ error: "Could not create workshop" }, { status: 500 });
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
    title,
    description,
    facilitator,
    location,
    date,
    start_time,
    end_time,
    capacity,
    overbooking_limit,
    category,
    status,
    image_url,
    facilitator_image_url,
  } = body;

  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  if (overbooking_limit !== undefined && capacity !== undefined && overbooking_limit < capacity) {
    return Response.json({ error: "Overbooking limit cannot be less than capacity" }, { status: 400 });
  }

  const updateFields: Record<string, unknown> = {};
  if (title !== undefined) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (facilitator !== undefined) updateFields.facilitator = facilitator;
  if (location !== undefined) updateFields.location = location;
  if (date !== undefined) updateFields.date = date;
  if (start_time !== undefined) updateFields.start_time = start_time;
  if (end_time !== undefined) updateFields.end_time = end_time;
  if (capacity !== undefined) updateFields.capacity = capacity;
  if (overbooking_limit !== undefined) updateFields.overbooking_limit = overbooking_limit;
  if (category !== undefined) updateFields.category = category;
  if (status !== undefined) updateFields.status = status;
  if (image_url !== undefined) updateFields.image_url = image_url;
  if (facilitator_image_url !== undefined) updateFields.facilitator_image_url = facilitator_image_url;

  const { data, error } = await supabaseAdmin
    .from("workshops")
    .update(updateFields)
    .eq("id", id)
    .select();

  if (error) {
    return Response.json(
      { error: "Could not update workshop" },
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

  const { error: bookingsErr } = await supabaseAdmin
    .from("bookings")
    .delete()
    .eq("workshop_id", id);

  if (bookingsErr) {
    return Response.json(
      { error: "Could not delete associated bookings" },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("workshops")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    return Response.json(
      { error: "Could not delete workshop" },
      { status: 500 }
    );
  }

  return Response.json({ data }, { status: 200 });
}