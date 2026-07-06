"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import VoiceCallDemo from "@/components/VoiceCallDemo";

const LINE1 = ["Telefonu", "yapay"];
const LINE2 = ["zekânız", "açsın."];

export default function Hero() {
  const reduce = useReducedMotion();

  const word = (text: string, i: number, accent = false) => (
    <motion.span
      key={text + i}
      className={`inline-block ${accent ? "text-accent-strong" : ""}`}
      initial={reduce ? false : { opacity: 0, y: 28, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.7, delay: 0.08 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
    >
      {text}
    </motion.span>
  );

  return (
    <section className="pt-24 pb-20 md:pt-28 md:pb-24 relative overflow-hidden">
      {/* Arka plan: soluk orb aurası */}
      <div
        aria-hidden
        className="voice-orb orb-idle absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 h-[620px] w-[620px] opacity-[0.08] blur-[90px] pointer-events-none"
      />
      <div className="mx-auto max-w-4xl px-5 text-center relative">
        <h1 className="text-[2.75rem] md:text-6xl lg:text-7xl font-semibold tracking-tighter leading-[1.02]">
          <span className="flex flex-wrap justify-center gap-x-[0.28em]">
            {LINE1.map((w, i) => word(w, i))}
          </span>
          <span className="flex flex-wrap justify-center gap-x-[0.28em]">
            {LINE2.map((w, i) => word(w, i + LINE1.length, w === "zekânız"))}
          </span>
        </h1>
        <motion.p
          className="mt-6 text-lg text-muted leading-relaxed max-w-md mx-auto"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          Callora çağrıyı karşılar, randevuyu bağlar, dökümü panelinize yazar. 7/24, doğal Türkçe.
        </motion.p>
        <motion.div
          className="mt-8 flex flex-wrap justify-center gap-3"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.62, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link href="/kayit" className="btn-primary">
            Ücretsiz Başla
          </Link>
          <a href="#demo" className="btn-ghost">
            Demoyu ara
          </a>
        </motion.div>
        <motion.div
          id="demo"
          className="mt-14 flex justify-center"
          initial={reduce ? false : { opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.72, ease: [0.16, 1, 0.3, 1] }}
        >
          <VoiceCallDemo />
        </motion.div>
      </div>
    </section>
  );
}
