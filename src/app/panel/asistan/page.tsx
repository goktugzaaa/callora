import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AgentSettingsForm from "@/components/AgentSettingsForm";

export default async function AsistanPage() {
  const session = (await getSession())!;
  const [agent, services] = await Promise.all([
    db.agentConfig.findUnique({ where: { businessId: session.businessId } }),
    db.service.findMany({
      where: { businessId: session.businessId },
      select: { id: true, name: true, durationMin: true, priceTry: true },
    }),
  ]);

  if (!agent) {
    return <p className="text-muted">Asistan yapılandırması bulunamadı.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Asistan Ayarları</h1>
        <p className="text-sm text-muted mt-1">
          Asistanınızın telefonda nasıl konuşacağını buradan belirleyin.
        </p>
      </div>
      <AgentSettingsForm
        initial={{
          greeting: agent.greeting,
          voice: agent.voice,
          extraNotes: agent.extraNotes,
          workingHours: agent.workingHours,
          services,
        }}
      />
    </div>
  );
}
