"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("AI Compare page error:", error); }, [error]);
  return (
    <div className="content-width py-20 text-center">
      <div className="empty-icon"><AlertCircle size={28} /></div><h1 className="text-3xl font-medium tracking-tight">A little turbulence.</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">We couldn&apos;t load this page. Your saved watchlist is still in your browser. Please try again in a moment.</p>
      {error.digest && <p className="mt-3 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
      <Button className="mt-7" onClick={reset}><RotateCcw size={14} />Try again</Button>
    </div>
  );
}
