import { duplicateShop } from "@/app/dashboard/actions";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await duplicateShop(id);
}
