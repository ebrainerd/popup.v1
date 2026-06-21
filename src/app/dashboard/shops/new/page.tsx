import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ShopForm } from "@/components/shop-form";

export const metadata: Metadata = { title: "Create shop" };

export default function NewShopPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>
      <h1 className="mb-1 text-2xl font-bold">Create a shop</h1>
      <p className="mb-6 text-muted-foreground">
        Three quick steps. Your shop opens and closes automatically on the schedule you set.
      </p>
      <ShopForm />
    </div>
  );
}
