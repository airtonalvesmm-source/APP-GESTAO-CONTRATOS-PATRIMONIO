import React from "react";
import { fmtQ, fmtData, fmtM, baixarCSV, diasAte, resumoAta } from "@/lib/dmp-utils";
import { fmtCurto, calcRiscoVencidas, calcRiscoVencendo, calcPendencias } from "@/lib/painel-calc";

export default function Risco({ data, setTab }) {
  const { atas, contratos, pagamentos, ocorrencias } = data;
  const vencidas = calcRiscoVencidas(atas, contratos);
  const vencendo = calcRiscoVencendo(atas, contratos);
  const pendencias = calcPendencias(contratos, pagamentos, ocorrencias);
  const totalVencidas = vencidas.reduce((t, x) => t + x.sal, 0);
  const totalVencendo = vencendo.reduce((t, x) => t + x.sal, 0);
  const retidoTotal = pendencias.reduce((t, x) => t + x.retido, 0);
  const naoPagos = pendencias.filter(x => x.dias !== null && x.dias < 0 && x.aPagar > 0).sort((a, b) => b.aPagar - a.aPagar);
  const totalNaoPago = naoPagos.reduce((t, x) => t + x.aPagar, 0);

  function exportarCSV() {
    const l = [["Ata", "Fornecedor", "Categoria", "Unidades em saldo", "Valor do saldo", "Vencimento"]];
    vencidas.forEach(x => l.push([x.a.numero, x.a.fornecedor || "", x.a.categoria || "", fmtQ(x.qtdSaldo), fmtM(x.sal), fmtData(x.a.fim)]));
    baixarCSV("saldo-nao-aproveitado.csv", l);
  }

  // Para o estado verde do Card 2
  const vigComSaldo = atas.filter(a => { const d = diasAte(a.fim); return d === null || d >= 0; }).filter(a => resumoAta(a, contratos).sal > 0).sort((a, b) => (diasAte(a.fim) ?? 9999) - (diasAte(b.fim) ?? 9999));
  const saldoVigTotal = vigComSaldo.reduce((t, a) => t + resumoAta(a, contratos).sal, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Card 1: Saldo não aproveitado */}
      <div className="bg-white border-2 border-red-200 rounded-md p-4 flex flex-col">
        <h3 className="font-sans text-[11px] tracking-widest uppercase text-red-700 mb-2">Saldo de ata não aproveitado</h3>
        <p className="font-sans text-[28px] font-semibold text-red-800 leading-none tabular-nums">{fmtCurto(totalVencidas)}</p>
        <p className="font-sans text-[12px] text-slate-600 mt-2 mb-3">Recurso planejado, licitado e registrado em ata que não chegou a virar contrato. {vencidas.length} ata{vencidas.length === 1 ? "" : "s"} encerrada{vencidas.length === 1 ? "" : "s"}.</p>
        {vencidas.length > 0 ? (
          <ul className="space-y-1 mb-3 flex-1">
            {vencidas.slice(0, 3).map((x, i) => (
              <li key={i} className="font-sans text-[12px] text-slate-600 leading-relaxed">
                Ata {x.a.numero} · {(x.a.fornecedor || "—").toUpperCase()} · {fmtQ(x.qtdSaldo)} un. · <b className="text-slate-800 tabular-nums">R$ {fmtM(x.sal)}</b>
              </li>
            ))}
            {vencidas.length > 3 && <li className="font-sans text-[11px] text-slate-400">+ {vencidas.length - 3} outras</li>}
          </ul>
        ) : <p className="text-emerald-700 text-[13px] flex-1">✓ Nenhuma ata encerrada com saldo.</p>}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTab?.("atas")} className="border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-md px-2.5 py-1 text-[11px] font-sans">Ver detalhamento</button>
          {vencidas.length > 0 && <button onClick={exportarCSV} className="border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-md px-2.5 py-1 text-[11px] font-sans">Exportar CSV</button>}
        </div>
      </div>

      {/* Card 2: Em risco 90 dias */}
      <div className={`bg-white border-2 rounded-md p-4 flex flex-col ${vencendo.length > 0 ? "border-amber-200" : "border-emerald-200"}`}>
        <h3 className={`font-sans text-[11px] tracking-widest uppercase mb-2 ${vencendo.length > 0 ? "text-amber-700" : "text-emerald-700"}`}>Em risco — 90 dias</h3>
        {vencendo.length > 0 ? (
          <>
            <p className="font-sans text-[28px] font-semibold text-amber-800 leading-none tabular-nums">{fmtCurto(totalVencendo)}</p>
            <p className="font-sans text-[12px] text-slate-600 mt-2 mb-3">{vencendo.length} ata{vencendo.length === 1 ? "" : "s"} vence em até 90 dias com saldo.</p>
            <ul className="space-y-1 mb-3 flex-1">
              {vencendo.slice(0, 3).map((x, i) => (
                <li key={i} className="font-sans text-[12px] text-slate-600 leading-relaxed">
                  Ata {x.a.numero} · {(x.a.fornecedor || "—").toUpperCase()} · <b className="text-slate-800 tabular-nums">R$ {fmtM(x.sal)}</b> · vence em {fmtData(x.a.fim)}
                </li>
              ))}
            </ul>
            <button onClick={() => setTab?.("atas")} className="self-start border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-md px-2.5 py-1 text-[11px] font-sans">Ver todas</button>
          </>
        ) : (
          <>
            <p className="font-sans text-[18px] font-semibold text-emerald-700 leading-snug">✓ Nenhuma ata em risco nos próximos 90 dias</p>
            {vigComSaldo.length > 0 ? (
              <p className="font-sans text-[12px] text-slate-600 mt-2 flex-1">
                A próxima ata vence em {fmtData(vigComSaldo[0].fim)} — faltam {diasAte(vigComSaldo[0].fim)} dias.<br />
                Saldo protegido: <b className="tabular-nums">{fmtCurto(saldoVigTotal)}</b> em {vigComSaldo.length} atas.
              </p>
            ) : <p className="font-sans text-[12px] text-slate-500 mt-2 flex-1">Nenhuma ata vigente com saldo.</p>}
            <button onClick={() => setTab?.("atas")} className="self-start border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-md px-2.5 py-1 text-[11px] font-sans">Ver atas vigentes</button>
          </>
        )}
      </div>

      {/* Card 3: Pendências financeiras */}
      <div className="bg-white border-2 border-amber-200 rounded-md p-4 flex flex-col">
        <h3 className="font-sans text-[11px] tracking-widest uppercase text-amber-700 mb-2">Pendências financeiras</h3>
        <div className="space-y-1 mb-3">
          <p className="font-sans text-[13px] text-slate-700"><b className="text-[20px] text-amber-800 tabular-nums">{fmtCurto(retidoTotal)}</b> retido em notas fiscais.</p>
          <p className="font-sans text-[13px] text-slate-700"><b className="text-[20px] text-red-800 tabular-nums">{fmtCurto(totalNaoPago)}</b> a pagar com vigência encerrada.</p>
        </div>
        {naoPagos.length > 0 ? (
          <ul className="space-y-1 mb-3 flex-1">
            {naoPagos.slice(0, 3).map((x, i) => (
              <li key={i} className="font-sans text-[12px] text-slate-600 leading-relaxed flex items-center gap-2">
                <span className="flex-1">{x.c.tipo} {x.c.numero} · {(x.c.fornecedor || "—").toUpperCase()} · <b className="text-slate-800 tabular-nums">R$ {fmtM(x.aPagar)}</b></span>
                <button onClick={() => setTab?.("contratos")} className="border border-slate-300 text-slate-500 hover:bg-slate-50 rounded px-2 py-0.5 text-[10px] font-sans">Abrir</button>
              </li>
            ))}
          </ul>
        ) : <p className="text-emerald-700 text-[13px] flex-1">✓ Nenhum contrato com vigência encerrada e valor pendente.</p>}
        <button onClick={() => setTab?.("pagamentos")} className="self-start border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-md px-2.5 py-1 text-[11px] font-sans">Ver pagamentos</button>
      </div>
    </div>
  );
}