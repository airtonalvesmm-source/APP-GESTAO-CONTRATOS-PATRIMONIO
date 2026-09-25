import React from "react";

export default function MetricasPCA({ executados, naoIniciados, total, dark }) {
  const div = dark ? "divide-slate-700 border-slate-700" : "divide-slate-200 border-slate-200";
  const lbl = dark ? "text-slate-400" : "text-slate-500";
  const itens = [
    { n: executados, l: "Executados", cls: dark ? "text-emerald-400 text-[26px]" : "text-emerald-700 text-[26px]" },
    { n: naoIniciados, l: "Não iniciados", cls: dark ? "text-amber-300/90 text-[20px]" : "text-amber-700 text-[20px]" },
    { n: total, l: "Total", cls: dark ? "text-slate-200 text-[20px]" : "text-slate-700 text-[20px]" }
  ];
  return (
    <div className={`grid grid-cols-3 divide-x ${div} border-t pt-3`}>
      {itens.map(m => (
        <div key={m.l} className="flex flex-col items-center justify-end px-1 min-w-0">
          <span className={`font-sans font-semibold tabular-nums leading-none ${m.cls}`}>{m.n}</span>
          <span className={`font-sans text-[10px] sm:text-[11px] tracking-wider uppercase mt-1 text-center ${lbl}`}>{m.l}</span>
        </div>
      ))}
    </div>
  );
}