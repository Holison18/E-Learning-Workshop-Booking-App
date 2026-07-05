import { getAdminFromRequest } from '@/lib/admin-auth';
import type { AdminPayload } from '@/lib/admin-auth';

export default async function verifyAdmin(req: Request): Promise<AdminPayload | null> {
  return getAdminFromRequest(req);
}
