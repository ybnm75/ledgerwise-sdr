import { SalesDesk } from "@/components/sales-desk";
import { LoginScreen } from "@/components/login-screen";
import { currentSession } from "@/lib/auth";
import { seedLeads } from "@/lib/seed";
import { listResearchedLeads } from "@/lib/research-repository";
import { hydrateLeadDrafts } from "@/lib/drafts";

export default async function Home() {
  const session = await currentSession();
  if (!session) return <LoginScreen />;
  const researched = await listResearchedLeads().catch(() => []);
  const leads = await hydrateLeadDrafts(researched.length ? researched : seedLeads).catch(() => researched.length ? researched : seedLeads);
  return <SalesDesk initialLeads={leads} />;
}
