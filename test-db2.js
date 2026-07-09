const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ffbmllwonmglsxmahdax.supabase.co', 'sb_publishable_Dvh8YRZ4YDCawKfWw2VVag_xpMxAkOI');

async function test() {
  const { data, error } = await supabase.from('workshops').select('id, title, description').ilike('description', '%Objectives%').limit(1);
  if (error) console.error(error);
  if (data && data.length > 0) {
    console.log("Raw chars:", data[0].description.substring(0, 30));
    console.log("Encoded:", encodeURIComponent(data[0].description.substring(0, 30)));
  }
}
test();
