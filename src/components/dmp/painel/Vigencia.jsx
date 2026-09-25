import React, { useState } from "react";
import { diasAte, fmtData, fmtM, resumoAta, valorEmpenhado, totaisPagamento } from "@/lib/dmp-utils";
import { fmtCurto, fmtPct, calcTimelineVigencia } from "@/lib/painel-calc";

function urgencia(dias) {
  if (dias === null) return { cor: "neutro", txt: "sem data" };
  if (dias < 0) return { cor: "vermelho", txt: `venceu há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}` };
  if (dias <= 60) return { cor: "ambar", txt: `vence em ${dias} dia${dias === 1 ? "" : "s"}` };
  return { cor: "verde", txt: `vence em ${dias} dias` };
}

function corBarra(cor, dark) {
  const map = {
    verde: dark ? "bg-emerald-400" : "bg-emerald-500",
    ambar: dark ? "bg-amber-400" : "bg-amber-500",
    vermelho: dark ? "bg-red-400" : "bg-red-500",
    neutro: dark ? "bg-slate-500" : "bg-slate-400"
  };
  return map[cor] || map.neutro;
}
function corTxt(cor, dark) {
  const map = {
    verde: dark ? "text-emerald-400" : "text-emerald-700",
    ambar: dark ? "text-amber-400" : "text-amber-700",
    vermelho: dark ? "text-red-400" : "text-red-700",
    neutro: dark ? "text-slate-400" : "text-slate-500"
  };
  return map[cor] || map.neutro;
}

export default function Vigencia({ data, setTab, dark }) {
  const { atas, contratos, pagamentos, ocorrencias, catalog } = data;
  const itens = calcTimelineVigencia(atas, contratos, pagamentos, ocorrencias).map(it => {
    let pct = 0, saldo = it.valor;
    if (it.tipo === "ata") {
      const a = atas.find(x => x.id === it.id);
      if (a) {
        const r = resumoAta(a, contratos);
        pct = r.reg ? r.cons / r.reg * 100 : 0;
        saldo = r.sal;
      }
    } else {
      const c = contratos.find(x => x.id === it.id);
      if (c) {
        const emp = valorEmpenhado(c, ocorrencias);
        const pago = totaisPagamento(c, pagamentos, ocorrencias).pago;
        pct = emp ? pago / emp * 100 : 0;
        saldo = Math.max(0, emp - pago);
      }
    }
    return { ...it, pct: Math.min(100, pct), saldo };
  });
  const [tipo, setTipo] = useState("ata");
  const lista = itens.filter(x => x.tipo === tipo);

  const cardBg = dark ? "bg-slate-800/70 border-slate-700" : "bg-white border-slate-200";
  const innerB = dark ? "border-slate-700" : "border-slate-200";
  const track = dark ? "bg-slate-700" : "bg-slate-100";
  const txt = dark ? "text-slate-300" : "text-slate-600";
  const strong = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-500" : "text-slate-500";
  const badgeAta = dark ? "bg-sky-900/50 text-sky-300 border-sky-700" : "bg-amber-50 text-amber-800 border-amber-300";
  const badgeCont = dark ? "bg-slate-700 text-slate-200 border-slate-600" : "bg-slate-100 text-slate-700 border-slate-300";
  const btn = dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-500 hover:bg-slate-50";
  const h3 = dark ? "text-slate-400" : "text-slate-500";

  return (
    <div className={`${dark ? "bg-slate-800/40 border-slate-700" : "bg-white border-slate-300"} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3}`}>Vigência — atas e contratos</h3>
        <div className={`inline-flex rounded-sm border overflow-hidden ${dark ? "border-slate-600" : "border-slate-300"}`}>
          {[["ata", "Atas"], ["contrato", "Contratos"]].map(([v, l]) => (
            <button key={v} onClick={() => setTipo(v)} className={`px-3 py-1.5 font-sans text-[12px] ${tipo === v ? (dark ? "bg-sky-600 text-white" : "bg-slate-800 text-white") : (dark ? "bg-slate-800 text-slate-300" : "bg-white text-slate-600")}`}>
              {l} ({itens.filter(x => x.tipo === v).length})
            </button>
          ))}
        </div>
      </div>
      {!lista.length ? (
        <p className={`${dark ? "text-emerald-400" : "text-emerald-700"} text-[13px]`}>✓ Nenhum{tipo === "ata" ? "a ata vigente" : " contrato vigente"} com saldo.</p>
      ) : (
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
          {lista.map((it, i) => {
            const u = urgencia(it.dias);
            const cat = it.tipo === "ata" ? (atas.find(a => a.id === it.id)?.categoria) : (() => {
              const c = contratos.find(x => x.id === it.id);
              const a = atas.find(x => x.id === c?.ataId);
              if (a?.categoria) return a.categoria;
              const cats = (c?.itens || []).map(ii => catalog.find(b => b.id === ii.benId)?.categoria).filter(Boolean);
              if (cats.length) { const counts = {}; cats.forEach(cc => counts[cc] = (counts[cc] || 0) + 1); return Object.entries(counts).sort((x, y) => y[1] - x[1])[0][0]; }
              return null;
            })();
            return (
              <div key={i} className={`${cardBg} border rounded-md p-3`}>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`inline-flex items-center font-mono text-[9.5px] tracking-wider uppercase px-2 py-0.5 rounded-sm border ${it.tipo === "ata" ? badgeAta : badgeCont}`}>{it.tipo === "ata" ? "Ata" : "Contrato"}</span>
                  <span className={`font-sans text-[13px] font-semibold ${strong}`}>{it.numero}</span>
                  <span className={`font-sans text-[12px] ${txt}`}>{(it.fornecedor || "—").toUpperCase()}</span>
                  {cat && <span className={`font-sans text-[10px] tracking-wider uppercase ${muted} ml-auto`}>{cat}</span>}
                </div>
                <div className={`h-2.5 ${track} rounded-full overflow-hidden mb-1.5`}>
                  <div className={`h-full rounded-full ${corBarra(u.cor, dark)}`} style={{ width: `${Math.max(2, it.pct)}%` }} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-sans text-[11px] ${txt}`}><b className={`${strong} tabular-nums`}>{fmtPct(it.pct)}</b> consumido</span>
                  <span className={`font-sans text-[11px] ${muted}`}>·</span>
                  <span className={`font-sans text-[11px] ${txt}`}>Saldo <b className={`${strong} tabular-nums`}>{fmtCurto(it.saldo)}</b></span>
                  <span className={`font-sans text-[11px] ${muted}`}>·</span>
                  <span className={`font-sans text-[11px] ${corTxt(u.cor, dark)}`}>{u.txt} · {fmtData(it.fim)}</span>
                  <button onClick={() => setTab?.(it.tipo === "ata" ? "atas" : "contratos")} className={`ml-auto border ${btn} rounded px-2 py-0.5 text-[10px] font-sans`}>Abrir</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}