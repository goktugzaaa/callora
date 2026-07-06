import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalı"),
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
  businessName: z.string().min(2, "İşletme adı en az 2 karakter olmalı"),
  sector: z.string().default("klinik"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, email, password, businessName, sector } = parsed.data;

  const exists = await db.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json(
      { error: "Bu e-posta ile kayıtlı bir hesap zaten var" },
      { status: 409 }
    );
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      business: {
        create: {
          name: businessName,
          sector,
          agent: { create: {} },
          services: {
            create: [{ name: "Genel Randevu", durationMin: 30 }],
          },
        },
      },
    },
    include: { business: true },
  });

  await createSession({
    userId: user.id,
    businessId: user.business!.id,
    email: user.email,
  });

  return NextResponse.json({ ok: true });
}
