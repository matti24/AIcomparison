import type { Metadata } from "next";
import { AdminStudio } from "@/components/admin-studio";

export const metadata: Metadata = {
  title: "Catalog Studio",
  description: "Protected administration for the AI Compare catalog.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminStudio />;
}
