import { WorkshopForm } from '@/components/admin/WorkshopForm';

export default async function EditWorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkshopForm mode="edit" workshopId={id} />;
}
