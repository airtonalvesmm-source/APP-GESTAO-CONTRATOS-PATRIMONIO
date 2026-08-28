import React from "react";
import { fmtQ, fmtData } from "@/lib/dmp-utils";
import { fmtCurto, calcRiscoAtas, calcPendencias } from "@/lib/painel-calc";

export default function Risco({ data, onVerAtas }) {
  const { atas, contratos, pagamentos, ocorrencias } = data;
  const riscoAtas = calcRiscoAtas(atas, contratos);
  const pendencias = calcPendencias(contratos, pagamentos, ocorrencias);

  const vencidas = riscoAtas.filter(x => x.dias < 0).sort((a, b) => b.sal - a.sal);
  const vence30 = riscoAtas.filter(x => x.dias >= 0 && x.dias <= 30).sort((a, b) => b.sal - a.sal);
  const vence90 = riscoAtas.filter(x => x.dias > 30 && x.dias <= 90).sort((a, b) => b.sal - a.sal);
  const totalRisco = [...vencidas, ...vence30, ...vence90].reduce((t, x) => t + x.sal, 0);

  const retidoTotal = pendencias.reduce((t, x) => t + x.retido, 0);
  const naoPagos = pendencias.filter(x => x.dias !== null && x.dias < 0 && x.aPagar > 0).sort((a, b) => b.aPagar - a.aPagar);
  const totalNaoPago = naoPagos.reduce((t, x) => t + x.aPagar, 0);

  function Faixa({ titulo, cor, itens }) {
    if (!itens.length) return null;
    const total = itens.reduce((t, x) => t + x.sal, 0);
    return (
      <div className="mb-3 last:mb-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${cor} flex-none`}></span>
          <span className="font-sans text-[12px] font-semibold text-slate-700">{titulo}</span>
          <span className="font-mono text-[12px] text-slate-500 ml-auto">{fmtCurto(total)} · {itens.length} caso{itens.length === 1 ? "" : "s"}</span>
        </div>
        <ul className="space-y-0.5 pl-4">
          {itens.slice(0, 3).map((x, i) => (
            <li key={i} className="font-sans text-[12px] text-slate-600 leading-relaxed">
              Ata {x.a.numero} · {(x.a.fornecedor || "—").toUpperCase()} · {fmtQ(x.qtdSaldo)} un. · <b className="text-slate-800">{fmtCurto(x.sal)}</b> · vence em {fmtData(x.a.fim)}
            </li>
          ))}
          {itens.length > 3 && (
            <li>
              <button onClick={onVerAtas} className="font-sans text-[12px] text-amber-700 hover:underline cursor-pointer">+ {itens.length - 3} outras</button>
            </li>
          )}
        </ul>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="bg-white border-2 border-red-200 rounded-sm p-4">
        <h3 className="font-sans text-[10px] tracking-widest uppercase text-red-700 mb-2">Recursos em risco de perda</h3>
        <p className="font-sans text-[13px] text-slate-700 mb-3">
          <b className="font-mono text-[20px] text-red-800">{fmtCurto(totalRisco)}</b> em saldo de ata pode expirar sem ser empenhado.
        </p>
        <Faixa titulo="Já vencido" cor="bg-red-600" itens={vencidas} />
        <Faixa titulo="Vence em até 30 dias" cor="bg-red-600" itens={vence30} />
        <Faixa titulo="Vence em 31 a 90 dias" cor="bg-amber-500" itens={vence90} />
        {riscoAtas.length === 0 && <p className="font-sans text-sm text-slate-500">Nenhuma ata com saldo em risco.</p>}
      </div>
      <div className="bg-white border-2 border-amber-200 rounded-sm p-4">
        <h3 className="font-sans text-[10px] tracking-widest uppercase text-amber-700 mb-2">Pendências financeiras</h3>
        <div className="mb-3 space-y-1">
          <p className="font-sans text-[13px] text-slate-700"><b className="font-mono text-[20px] text-amber-800">{fmtCurto(retidoTotal)}</b> retido em notas fiscais.</p>
          <p className="font-sans text-[13px] text-slate-700"><b className="font-mono text-[20px] text-red-800">{fmtCurto(totalNaoPago)}</b> a pagar em contratos com vigência encerrada.</p>
        </div>
        {naoPagos.length > 0 && (
          <div>
            <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mb-1">Vigência encerrada — 3 maiores</p>
            <ul className="space-y-0.5 pl-4">
              {naoPagos.slice(0, 3).map((x, i) => (
                <li key={i} className="font-sans text-[12px] text-slate-600 leading-relaxed">
                  {x.c.tipo} {x.c.numero} · {(x.c.fornecedor || "—").toUpperCase()} · <b className="text-slate-800">{fmtCurto(x.aPagar)}</b> · encerrado em {fmtData(x.fim)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {retidoTotal === 0 && totalNaoPago === 0 && <p className="font-sans text-sm text-slate-500">Sem pendências financeiras.</p>}
      </div>
    </div>
  );
}