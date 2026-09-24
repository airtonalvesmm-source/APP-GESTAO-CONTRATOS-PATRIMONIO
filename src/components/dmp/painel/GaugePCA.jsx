import React from "react";
import { calcExecucaoPCA, fmtPct } from "@/lib/painel-calc";

// Ponto sobre o semicírculo: t=0 -> esquerda, t=1 -> direita (passando por cima)
function pt(t, r, cx = 100, cy = 100) {
  const ang = (1 - t) * Math.PI;
  return [cx + r * Math.cos(ang), cy - r * Math.sin(ang)];
}
function arc(t1, t2, r, cx = 100, cy = 100) {
  const [x1, y1] = pt(t1, r, cx, cy);
  const [x2, y2] = pt(t2, r, cx, cy);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
}

export default function GaugePCA({ data, ano, dark }) {
  const { pca, contratos } = data;
  const { total, executados, naoIniciados, sobrestados, pct } = calcExecucaoPCA(pca, contratos, ano);

  const cardBg = dark ? "bg-slate-800/70 border-slate-700" : "bg-white border-slate-300";
  const h3 = dark ? "text-slate-400" : "text-slate-500";
  const txt = dark ? "text-slate-300" : "text-slate-600";
  const strong = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const labelTxt = dark ? "#e2e8f0" : "#212121";
  const needle = dark ? "#94a3b8" : "#757575";
  const pivot = dark ? "#1e293b" : "#37474F";
  const seg = { red: "#A84A4A", gold: "#E2C364", teal: "#00BFA5" };

  const p = Math.max(0, Math.min(100, pct));
  const t = p / 100;
  const [nx, ny] = pt(t, 74);

  return (
    <div className={`${cardBg} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3}`}>Execução do PCA — exercício {ano}</h3>
      </div>
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex-none">
          <svg viewBox="0 0 200 124" className="w-[230px] h-[138px]">
            <path d={arc(0, 1 / 3, 80)} fill="none" stroke={seg.red} strokeWidth={16} />
            <path d={arc(1 / 3, 2 / 3, 80)} fill="none" stroke={seg.gold} strokeWidth={16} />
            <path d={arc(2 / 3, 1, 80)} fill="none" stroke={seg.teal} strokeWidth={16} />
            <line x1="100" y1="100" x2={nx} y2={ny} stroke={needle} strokeWidth={2.5} strokeLinecap="round" />
            <path d={arc(0, 1, 8, 100, 100)} fill="none" stroke={pivot} strokeWidth={4.5} />
            <circle cx="100" cy="100" r="2.6" fill={pivot} />
            <text x="100" y="88" fontSize="19" fontWeight="700" fill={labelTxt} fontFamily="ui-sans-serif, system-ui" textAnchor="middle">{fmtPct(p)}</text>
            <text x="20" y="118" fontSize="9" fill={labelTxt} fontFamily="ui-sans-serif, system-ui" textAnchor="middle">0%</text>
            <text x="180" y="118" fontSize="9" fill={labelTxt} fontFamily="ui-sans-serif, system-ui" textAnchor="middle">100%</text>
          </svg>
        </div>
        <div className="flex-1 min-w-[220px] space-y-1.5">
          <p className={`font-sans text-[13px] ${txt}`}>{total} itens no plano · <b className={`${strong} tabular-nums`}>{executados} executados</b></p>
          <p className={`font-sans text-[12.5px] ${txt}`}>{naoIniciados} não iniciados{sobrestados > 0 ? ` · ${sobrestados} sobrestados` : ""}</p>
          <p className={`font-sans text-[12px] ${muted}`}>Percentual de itens do PCA com ao menos um contrato ou empenho vinculado.</p>
        </div>
      </div>
    </div>
  );
}