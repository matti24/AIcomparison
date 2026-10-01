import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-narrow py-20">
      <EmptyState icon={<Compass size={20} />} title="Page not found" description="This page or model isn't in the catalog. Comparison links need two to four different models.">
        <Button asChild><Link href="/models">Browse all models</Link></Button>
        <Button asChild variant="outline"><Link href="/">Go home</Link></Button>
      </EmptyState>
    </div>
  );
}
