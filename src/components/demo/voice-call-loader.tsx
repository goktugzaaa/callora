"use client";

import dynamic from "next/dynamic";

// The call widget pulls in the realtime client and the Gemini provider; load
// it after the page is interactive instead of in the initial bundle.
const VoiceCall = dynamic(() => import("./voice-call"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto w-full max-w-[380px]">
      <div className="mb-5 h-[30px]" />
      <div className="h-[470px] animate-pulse rounded-[2rem] border border-border bg-card" />
    </div>
  ),
});

export function VoiceCallLoader() {
  return <VoiceCall />;
}
