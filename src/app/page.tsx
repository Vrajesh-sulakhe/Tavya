import { TavyaApp } from "@/components/TavyaApp";
import { getDashboardSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const initialData = getDashboardSnapshot();
  return <TavyaApp initialData={initialData} />;
}
