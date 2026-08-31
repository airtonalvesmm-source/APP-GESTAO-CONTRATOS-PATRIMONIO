import React from "react";
import { diasAte, fmtData, resumoAta, situacaoAta } from "@/lib/dmp-utils";
import { fmtCurto, fmtPct, calcAtasVigentesDetalhado } from "@/lib/painel-calc";

function AtasVigentes({ data, setTab }) {
  const { atas, contratos } = data;
  const lista = calcAtasVigentesDetalhado(atas, contratos);
  if (!lista.length) return (
    <div className="bg-white border border-slate-300 rounded-md p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-3">Atas vigentes</h3>
      <p className="text-emerald-700 text-[13px]">✓ Nenhuma ata vigente com saldo.</p>
    </div>
  );
  return (
    <div className="bg-white border border-slate-300 rounded-md p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-3">Atas vigentes — {lista.length}</h3>
      <div className="space-y-3">
        {lista.map((x, i) => {
          const corBarra = x.pctConsumido > 80 ? "bg-amber-500"
            : (x.dias !== null && x.dias < 90 && x.pctConsumido < 50 ? "bg-red-500" : "bg-emerald-500");
          return (
            <div key={i} className="border border-slate-200 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-sans text-[13px] font-semibold text-slate-800">Ata {x.a.numero}</span>
                <span className="font-sans text-[12px] text-slate-500">{(x.a.fornecedor || "—").toUpperCase()}</span>
                {x.a.categoria && <span className="font-sans text-[10px] tracking-wider uppercase text-slate-400 ml-auto">{x.a.categoria}</span>}
              </div>
              <p className="font-sans text-[12px] text-slate-500 mb-1.5">
                Registrado <b className="tabular-nums">{fmtCurto(x.reg)}</b> · consumido <b className="tabular-nums">{fmtCurto(x.cons)}</b>
              </p>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                <div className={`h-full rounded-full ${corBarra}`} style={{ width: `${Math.min(100, x.pctConsumido)}%` }} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-sans text-[11px] text-slate-500">{fmtPct(x.pctConsumido)} consumido</span>
                <span className="font-sans text-[11px] text-slate-500">·</span>
                <span className="font-sans text-[11px] text-slate-500">Saldo <b className="tabular-nums">{fmtCurto(x.sal)}</b> · {x.itens} itens</span>
                <span className="font-sans text-[11px] text-slate-500">·</span>
                <span className="font-sans text-[11px] text-slate-500">vence {fmtData(x.a.fim)} · {x.dias} dias</span>
                <button onClick={() => setTab?.("atas")} className="ml-auto border border-slate-300 text-slate-500 hover:bg-slate-50 rounded px-2 py-0.5 text-[10px] font-sans">Abrir ata</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Timeline({ data }) {
  const { atas, contratos } = data;
  const atasVig = atas
    .map(a => ({ a, sal: resumoAta(a, contratos).sal, dias: diasAte(a.fim), classe: situacaoAta(a).classe }))
    .filter(x => x.sal > 0 && x.dias !== null && x.dias >= 0)
    .sort((a, b) => a.dias - b.dias);
  if (!atasVig.length) return (
    <div className="bg-white border border-slate-300 rounded-md p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-3">Régua de vigência</h3>
      <p className="text-emerald-700 text-[13px]">✓ Nenhuma ata vigente com saldo.</p>
    </div>
  );
  const maxDias = Math.max(...atasVig.map(x => x.dias), 1);
  const maxSaldo = Math.max(...atasVig.map(x => x.sal), 1);
  const corBarra = { critico: "bg-red-500", aviso: "bg-amber-500", ok: "bg-emerald-500", neutro: "bg-slate-400" };
  const cats = [...new Set(atasVig.map(x => x.a.categoria).filter(Boolean))];
  return (
    <div className="bg-white border border-slate-300 rounded-md p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-3">
        Régua de vigência — hoje a {fmtData(atasVig[atasVig.length - 1].a.fim)}
      </h3>
      <div className="relative h-28 border-l border-r border-slate-200 overflow-hidden">
        <div className="absolute top-0 bottom-0 w-px bg-slate-800 z-10" style={{ left: "0%" }}>
          <span className="font-sans text-[9px] text-slate-800 absolute -top-4 -translate-x-1/2">hoje</span>
        </div>
        {atasVig.map((x, i) => {
          const left = (x.dias / maxDias) * 100;
          const w = Math.max(5, Math.min(28, x.sal / maxSaldo * 28));
          const top = (i % 4) * 20 + 4;
          return (
            <div key={i} className={`absolute rounded-sm ${corBarra[x.classe] || corBarra.neutro}`}
              style={{ left: `${left}%`, top: `${top}px`, width: `${w}px`, height: "14px" }}
              title={`Ata ${x.a.numero} · ${x.a.fornecedor || "—"} · saldo ${fmtCurto(x.sal)} · vence ${fmtData(x.a.fim)}`} />
          );
        })}
      </div>
      <div className="flex gap-4 mt-3 font-sans text-[10px] text-slate-500">
        {cats.map(c => <span key={c} className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-600"></span>{c}</span>)}
      </div>
    </div>
  );
}

export default function Vigencia({ data, setTab }) {
  const { atas, contratos } = data;
  const vig = atas.filter(a => { const d = diasAte(a.fim); return d === null || d >= 0; }).filter(a => resumoAta(a, contratos).sal > 0);
  return vig.length < 6 ? <AtasVigentes data={data} setTab={setTab} /> : <Timeline data={data} />;
}