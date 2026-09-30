import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="content-width py-20 text-center">
      <div className="empty-icon"><Compass size={30} /></div><span className="eyebrow">404 &middot; A small detour</span>
      <h1 className="mt-5 text-4xl font-medium tracking-tight">Not every path leads to a model.</h1>
      <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-muted-foreground">This page or model could not be found. Comparison links need two to four different model versions from the catalog.</p>
      <Button asChild className="mt-7"><Link href="/models"><ArrowLeft size={14} />Explore the model directory</Link></Button>
    </div>
  );
}
