
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
        .from('workshops')
        .select('id, title, audience, location, category, status, date, start_time, end_time, capacity, seats_booked')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
        
  console.log("Error:", error);
  console.log("Data count:", data?.length);
}

test();
