import { SalesDesk } from "@/components/sales-desk";
import { seedLeads } from "@/lib/seed";

export default function Home() {
  return <SalesDesk initialLeads={seedLeads} />;
}
