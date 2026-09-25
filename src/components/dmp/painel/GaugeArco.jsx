import React, { useEffect, useState } from "react";
import { fmtPct } from "@/lib/painel-calc";

// Anima de 0 até o valor alvo (easeOutCubic), uma vez por mudança do valor
function useAnimado(alvo, duracao = 1300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const passo = (agora) => {
      const t = Math.min(1, (agora - t0) / duracao);
      setV(alvo * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, duracao]);
  return v;
}

const ARCO = "M 20 120 A 100 100 0 0 1 220 120";

export default function GaugeArco({ pct, dark }) {
  const alvo = Math.max(0, Math.min(100, Number(pct) || 0));
  const v = useAnimado(alvo);
  const track = dark ? "#334155" : "#e2e8f0";
  const fill = dark ? "#34d399" : "#047857";
  const num = dark ? "text-slate-50" : "text-slate-900";
  const sub = dark ? "text-slate-400" : "text-slate-500";
  const esc = dark ? "#64748b" : "#94a3b8";
  return (
    <div className="relative w-full max-w-[340px] mx-auto">
      <svg viewBox="0 0 240 136" className="w-full h-auto block">
        <path d={ARCO} fill="none" stroke={track} strokeWidth="16" strokeLinecap="round" />
        {v > 0.05 && <path d={ARCO} fill="none" stroke={fill} strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray={`${v} 100`} />}
        <text x="20" y="134" fontSize="9" fill={esc} textAnchor="middle" fontFamily="ui-sans-serif, system-ui">0%</text>
        <text x="220" y="134" fontSize="9" fill={esc} textAnchor="middle" fontFamily="ui-sans-serif, system-ui">100%</text>
      </svg>
      <div className="absolute inset-x-0 bottom-[6%] flex flex-col items-center pointer-events-none">
        <span className={`font-sans font-semibold tabular-nums leading-none tracking-tight text-[40px] sm:text-[48px] ${num}`}>{fmtPct(v)}</span>
        <span className={`font-sans text-[10.5px] tracking-widest uppercase mt-1.5 ${sub}`}>de execução</span>
      </div>
    </div>
  );
}