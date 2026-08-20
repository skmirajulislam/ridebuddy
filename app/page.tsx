"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("./_components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center text-cyan-400 gap-3">
      <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      <span className="text-sm font-semibold tracking-wide text-slate-300">Initializing Live Radar Map...</span>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden relative">
      <Map />
    </main>
  );
}
