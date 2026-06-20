import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-2 text-xl font-bold">This shop has closed.</h1>
      <p className="mt-1 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or its countdown ran out.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Back to Explore</Link>
      </Button>
    </div>
  );
}
