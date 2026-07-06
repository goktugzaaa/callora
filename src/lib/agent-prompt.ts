type AgentData = {
  businessName: string;
  sector: string;
  greeting: string;
  extraNotes: string;
  workingHours: string;
  services: { name: string; durationMin: number; priceTry: number | null }[];
};

const DAY_LABELS: Record<string, string> = {
  pzt: "Pazartesi",
  sal: "Salı",
  car: "Çarşamba",
  per: "Perşembe",
  cum: "Cuma",
  cmt: "Cumartesi",
  paz: "Pazar",
};

export function buildAgentInstructions(data: AgentData): string {
  let hoursText = "";
  try {
    const hours = JSON.parse(data.workingHours) as Record<string, [string, string] | null>;
    hoursText = Object.entries(hours)
      .map(([day, range]) =>
        range ? `${DAY_LABELS[day] ?? day}: ${range[0]}-${range[1]}` : `${DAY_LABELS[day] ?? day}: Kapalı`
      )
      .join(", ");
  } catch {
    hoursText = "Hafta içi 09:00-18:00";
  }

  const servicesText = data.services
    .map(
      (s) =>
        `- ${s.name} (${s.durationMin} dk${s.priceTry ? `, ${s.priceTry} TL` : ""})`
    )
    .join("\n");

  return `Sen "${data.businessName}" adlı işletmenin telefon resepsiyonistisin. İşletme türü: ${data.sector}.

GÖREVLERİN:
1. Arayanları nazikçe karşıla. Açılış cümlen: "${data.greeting}"
2. Randevu taleplerini al: müşterinin adını, telefon numarasını, istediği hizmeti ve tarih/saati öğren.
3. Tüm bilgiler tamamlanınca book_appointment aracını çağırarak randevuyu kaydet ve müşteriye sözlü onay ver.
4. Hizmetler ve çalışma saatleri hakkındaki soruları aşağıdaki bilgilerle cevapla.
5. Bilmediğin bir şey sorulursa uydurma; "Bu konuda size işletmemiz dönüş yapsın, numaranızı alabilir miyim?" de.

ÇALIŞMA SAATLERİ: ${hoursText}
Çalışma saatleri dışına randevu verme.

HİZMETLER:
${servicesText}

KURALLAR:
- Sadece Türkçe konuş. Kısa, doğal ve sıcak cümleler kur. Telefonda konuşur gibi konuş; uzun listeler sayma.
- Bir seferde tek soru sor.
- Telefon numarasını rakam rakam tekrar ederek teyit et.
- Randevuyu kaydetmeden önce tarih, saat ve hizmeti özetleyip onay al.
${data.extraNotes ? `\nİŞLETME SAHİBİNİN ÖZEL NOTLARI:\n${data.extraNotes}` : ""}`;
}
