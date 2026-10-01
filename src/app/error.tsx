"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("AI Compare page error:", error); }, [error]);
  return (
    <div className="container-narrow py-20">
      <EmptyState icon={<AlertCircle size={20} />} title="Model data couldn't be loaded." description="Something went wrong on our side. Your favorites and comparisons are safe in your browser.">
        <Button onClick={reset}><RotateCcw size={15} />Retry</Button>
        <Button asChild variant="outline"><Link href="/">Go home</Link></Button>
      </EmptyState>
      {error.digest && <p className="mt-4 text-center font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
    </div>
  );
}
