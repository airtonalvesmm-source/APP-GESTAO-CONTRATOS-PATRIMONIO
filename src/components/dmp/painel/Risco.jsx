import React from "react";
import { fmtQ, fmtData, fmtM, baixarCSV, diasAte, resumoAta } from "@/lib/dmp-utils";
import { fmtCurto, calcRiscoVencendo, calcPendencias } from "@/lib/painel-calc";

function cardBg(dark, ok) {
  if (ok) return dark ? "bg-slate-800/70 border-slate-700" : "bg-white border-emerald-200";
  return dark ? "bg-slate-800/70 border-slate-700" : "bg-white border-amber-200";
}
function h3Cls(dark, ok) {
  if (ok) return dark ? "text-emerald-400" : "text-emerald-700";
  return dark ? "text-amber-400" : "text-amber-700";
}

export default function Risco({ data, setTab, dark }) {
  const { atas, contratos, pagamentos, ocorrencias } = data;
  const vencendo = calcRiscoVencendo(atas, contratos);
  const pendencias = calcPendencias(contratos, pagamentos, ocorrencias);
  const totalVencendo = vencendo.reduce((t, x) => t + x.sal, 0);
  const retidoTotal = pendencias.reduce((t, x) => t + x.retido, 0);
  const naoPagos = pendencias.filter(x => x.dias !== null && x.dias < 0 && x.aPagar > 0).sort((a, b) => b.aPagar - a.aPagar);
  const totalNaoPago = naoPagos.reduce((t, x) => t + x.aPagar, 0);

  const txt = dark ? "text-slate-300" : "text-slate-600";
  const strong = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-500" : "text-slate-400";
  const okTxt = dark ? "text-emerald-400" : "text-emerald-700";
  const numAmber = dark ? "text-amber-400" : "text-amber-800";
  const numRed = dark ? "text-red-400" : "text-red-800";
  const btn = dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-600 hover:bg-slate-50";

  function exportarCSV() {
    const l = [["Ata", "Fornecedor", "Categoria", "Unidades em saldo", "Valor do saldo", "Vencimento", "Dias"]];
    vencendo.forEach(x => l.push([x.a.numero, x.a.fornecedor || "", x.a.categoria || "", fmtQ(x.qtdSaldo), fmtM(x.sal), fmtData(x.a.fim), x.dias]));
    baixarCSV("atas-em-risco.csv", l);
  }

  const vigComSaldo = atas.filter(a => { const d = diasAte(a.fim); return d === null || d >= 0; }).filter(a => resumoAta(a, contratos).sal > 0).sort((a, b) => (diasAte(a.fim) ?? 9999) - (diasAte(b.fim) ?? 9999));
  const saldoVigTotal = vigComSaldo.reduce((t, a) => t + resumoAta(a, contratos).sal, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={`bg-white border-2 rounded-lg p-4 flex flex-col ${vencendo.length > 0 ? (dark ? "border-slate-700 bg-slate-800/70" : "border-amber-200") : (dark ? "border-slate-700 bg-slate-800/70" : "border-emerald-200")}`}>
        <h3 className={`font-sans text-[11px] tracking-widest uppercase mb-2 ${h3Cls(dark, vencendo.length === 0)}`}>Atas em risco — 90 dias</h3>
        {vencendo.length > 0 ? (
          <>
            <p className={`font-sans text-[28px] font-semibold ${numAmber} leading-none tabular-nums`}>{fmtCurto(totalVencendo)}</p>
            <p className={`font-sans text-[12px] ${txt} mt-2 mb-3`}>{vencendo.length} ata{vencendo.length === 1 ? "" : "s"} vence em até 90 dias com saldo.</p>
            <ul className="space-y-1 mb-3 flex-1">
              {vencendo.slice(0, 4).map((x, i) => (
                <li key={i} className={`font-sans text-[12px] ${txt} leading-relaxed`}>
                  Ata {x.a.numero} · {(x.a.fornecedor || "—").toUpperCase()} · <b className={`${strong} tabular-nums`}>R$ {fmtM(x.sal)}</b> · vence em {x.dias}d ({fmtData(x.a.fim)})
                </li>
              ))}
              {vencendo.length > 4 && <li className={`font-sans text-[11px] ${muted}`}>+ {vencendo.length - 4} outras</li>}
            </ul>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setTab?.("atas")} className={`border ${btn} rounded-md px-2.5 py-1 text-[11px] font-sans`}>Ver todas</button>
              <button onClick={exportarCSV} className={`border ${btn} rounded-md px-2.5 py-1 text-[11px] font-sans`}>Exportar CSV</button>
            </div>
          </>
        ) : (
          <>
            <p className={`font-sans text-[18px] font-semibold ${okTxt} leading-snug`}>✓ Nenhuma ata em risco nos próximos 90 dias</p>
            {vigComSaldo.length > 0 ? (
              <p className={`font-sans text-[12px] ${txt} mt-2 flex-1`}>
                A próxima ata vence em {fmtData(vigComSaldo[0].fim)} — faltam {diasAte(vigComSaldo[0].fim)} dias.<br />
                Saldo protegido: <b className="tabular-nums">{fmtCurto(saldoVigTotal)}</b> em {vigComSaldo.length} atas.
              </p>
            ) : <p className={`font-sans text-[12px] ${txt} mt-2 flex-1`}>Nenhuma ata vigente com saldo.</p>}
            <button onClick={() => setTab?.("atas")} className={`self-start border ${btn} rounded-md px-2.5 py-1 text-[11px] font-sans`}>Ver atas vigentes</button>
          </>
        )}
      </div>

      <div className={`border-2 rounded-lg p-4 flex flex-col ${dark ? "border-slate-700 bg-slate-800/70" : "border-amber-200 bg-white"}`}>
        <h3 className={`font-sans text-[11px] tracking-widest uppercase ${dark ? "text-amber-400" : "text-amber-700"} mb-2`}>Pendências financeiras</h3>
        <div className="space-y-1 mb-3">
          <p className={`font-sans text-[13px] ${txt}`}><b className={`text-[20px] ${numAmber} tabular-nums`}>{fmtCurto(retidoTotal)}</b> retido em notas fiscais.</p>
          <p className={`font-sans text-[13px] ${txt}`}><b className={`text-[20px] ${numRed} tabular-nums`}>{fmtCurto(totalNaoPago)}</b> a pagar com vigência encerrada.</p>
        </div>
        {naoPagos.length > 0 ? (
          <ul className="space-y-1 mb-3 flex-1">
            {naoPagos.slice(0, 4).map((x, i) => (
              <li key={i} className={`font-sans text-[12px] ${txt} leading-relaxed flex items-center gap-2`}>
                <span className="flex-1">{x.c.tipo} {x.c.numero} · {(x.c.fornecedor || "—").toUpperCase()} · <b className={`${strong} tabular-nums`}>R$ {fmtM(x.aPagar)}</b></span>
                <button onClick={() => setTab?.("contratos")} className={`border ${dark ? "border-slate-600 text-slate-400 hover:bg-slate-700" : "border-slate-300 text-slate-500 hover:bg-slate-50"} rounded px-2 py-0.5 text-[10px] font-sans`}>Abrir</button>
              </li>
            ))}
            {naoPagos.length > 4 && <li className={`font-sans text-[11px] ${muted}`}>+ {naoPagos.length - 4} outros</li>}
          </ul>
        ) : <p className={`${okTxt} text-[13px] flex-1`}>✓ Nenhum contrato com vigência encerrada e valor pendente.</p>}
        <button onClick={() => setTab?.("pagamentos")} className={`self-start border ${btn} rounded-md px-2.5 py-1 text-[11px] font-sans`}>Ver pagamentos</button>
      </div>
    </div>
  );
}