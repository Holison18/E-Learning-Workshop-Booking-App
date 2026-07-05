import { createClearCookieHeader } from "@/lib/admin-auth";

export async function POST() {
  return new Response(JSON.stringify({ message: "Logged out" }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': createClearCookieHeader(),
    },
  });
}
