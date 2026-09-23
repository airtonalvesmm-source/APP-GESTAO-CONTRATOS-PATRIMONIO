import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { fmtM, fmtQ, fmtData, nQtd, nVal, situacaoAta, saldoItem, fimVigente, ocorrenciasDe } from "@/lib/dmp-utils";
import { Pill } from "./ui";

export default function Cadeia({ benId, data, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const { catalog, pca, atas, contratos, pagamentos, ocorrencias, licitacoes } = data;
  const bem = catalog.find(b => b.id === benId);
  if (!bem) return null;

  const pcaItems = pca.filter(p => p.benId === benId);
  const atasComItem = atas.filter(a => (a.itens || []).some(it => it.benId === benId));
  const contratosComItem = contratos.filter(c => (c.itens || []).some(i => i.benId === benId || (i.pcaId && pcaItems.some(p => p.id === i.pcaId))));
  const licitacoesComItem = licitacoes.filter(l => atasComItem.some(a => a.licitacaoId === l.id));
  const vazio = pcaItems.length === 0 && atasComItem.length === 0 && contratosComItem.length === 0 && licitacoesComItem.length === 0;

  return (
    <div className="fixed inset-0 bg-slate-900/55 z-[60] flex justify-end">
      <div ref={ref} className="bg-white w-full max-w-[540px] h-full overflow-auto border-l border-slate-300 shadow-xl">
        <header className="flex gap-4 items-start px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-widest uppercase text-amber-700 mb-1">Rastreabilidade</p>
            <h3 className="font-bold text-lg leading-snug text-slate-800">{bem.objeto}</h3>
            <p className="font-mono text-xs text-slate-500 mt-0.5">CATMAT {bem.catmat} · {bem.categoria} · {bem.unidade}</p>
          </div>
          <button onClick={onClose} className="flex-none border border-slate-300 bg-slate-50 w-[34px] h-[34px] rounded-sm flex items-center justify-center text-slate-600 hover:border-slate-500">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="px-5 py-5">
          <Etapa rotulo="Catálogo" cor="bg-slate-700">
            <p className="font-sans text-[13px] text-slate-600">{bem.aplicacao || "Sem aplicação registrada."}</p>
          </Etapa>

          {pcaItems.length > 0 && (
            <Etapa rotulo="Plano Anual" cor="bg-amber-700" count={pcaItems.length}>
              {pcaItems.map(p => (
                <div key={p.id} className="flex justify-between text-[13px] py-1 border-b border-slate-100 last:border-0">
                  <span className="text-slate-600">{p.exercicio}{p.codigo ? ` · ${p.codigo}` : ""}</span>
                  <span className="font-mono text-slate-800">{fmtQ(p.qtd)} un × {fmtM(p.valor)} = <b>{fmtM(nQtd(p.qtd) * nVal(p.valor))}</b></span>
                </div>
              ))}
            </Etapa>
          )}

          {licitacoesComItem.length > 0 && (
            <Etapa rotulo="Licitação" cor="bg-indigo-700" count={licitacoesComItem.length}>
              {licitacoesComItem.map(l => (
                <div key={l.id} className="flex justify-between text-[13px] py-1 border-b border-slate-100 last:border-0">
                  <span className="text-slate-600">{l.modalidade} nº {l.numero}/{l.ano}</span>
                  <span className="flex gap-2 items-center"><Pill tipo="neutro">{l.status}</Pill><span className="font-mono text-slate-800">{fmtM(l.valorGlobal)}</span></span>
                </div>
              ))}
            </Etapa>
          )}

          {atasComItem.length > 0 && (
            <Etapa rotulo="Ata de registro de preços" cor="bg-emerald-700" count={atasComItem.length}>
              {atasComItem.map(a => {
                const item = (a.itens || []).find(it => it.benId === benId);
                const sal = saldoItem(a, item, contratos);
                const consumido = nQtd(item?.qtd) - sal;
                const s = situacaoAta(a);
                return (
                  <div key={a.id} className="py-1.5 border-b border-slate-100 last:border-0">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-600">Ata {a.numero} · {a.fornecedor || "—"}</span>
                      <Pill tipo={s.classe}>{s.txt}</Pill>
                    </div>
                    <div className="flex justify-between text-[12px] mt-0.5">
                      <span className="text-slate-500">Registrado: {fmtQ(item?.qtd)} · Consumido: {fmtQ(consumido)} · Saldo: <b>{fmtQ(sal)}</b></span>
                      <span className="font-mono text-slate-500">{fmtM(item?.valor)}/un</span>
                    </div>
                  </div>
                );
              })}
            </Etapa>
          )}

          {contratosComItem.length > 0 && (
            <Etapa rotulo="Contratos e empenhos" cor="bg-blue-700" count={contratosComItem.length}>
              {contratosComItem.map(c => {
                const item = (c.itens || []).find(i => i.benId === benId || (i.pcaId && pcaItems.some(p => p.id === i.pcaId)));
                const t = nQtd(item?.qtd) * nVal(item?.valor);
                const pgs = pagamentos.filter(p => p.contratoId === c.id);
                const ocs = ocorrenciasDe(c.id, ocorrencias);
                return (
                  <div key={c.id} className="py-1.5 border-b border-slate-100 last:border-0">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-600">{c.tipo} {c.numero} · {c.fornecedor || "—"}</span>
                      <span className="font-mono text-slate-800"><b>{fmtM(t)}</b></span>
                    </div>
                    <div className="text-[12px] mt-0.5 text-slate-500">
                      {fmtQ(item?.qtd)} un × {fmtM(item?.valor)} · vig. {fmtData(c.inicio)} a {fmtData(fimVigente(c, ocorrencias))}
                    </div>
                    {pgs.length > 0 && (
                      <div className="mt-1 pl-3 border-l-2 border-slate-200">
                        {pgs.map(p => (
                          <div key={p.id} className="flex justify-between text-[12px] py-0.5">
                            <span className="text-slate-500">NF {p.nf} · {fmtData(p.dataNF)}</span>
                            <span className="font-mono text-slate-600">{fmtM(p.valorNF)} → <b className="text-slate-800">{fmtM(p.valorPago)}</b>{nVal(p.valorNF) > nVal(p.valorPago) ? ` (R$ ${fmtM(nVal(p.valorNF) - nVal(p.valorPago))} retido)` : ""}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {ocs.length > 0 && (
                      <div className="mt-1 flex gap-1.5 flex-wrap">
                        {ocs.map(o => <Pill key={o.id} tipo="neutro">{o.tipo}</Pill>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </Etapa>
          )}

          {vazio && <p className="font-sans text-sm text-slate-500 text-center py-8">Este item ainda não percorreu nenhuma etapa de contratação.</p>}
        </div>
      </div>
    </div>
  );
}

function Etapa({ rotulo, cor, count, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${cor}`}></span>
        <h4 className="font-sans text-[10px] font-bold tracking-widest uppercase text-slate-500">{rotulo}{count != null ? ` (${count})` : ""}</h4>
      </div>
      <div className="pl-4 border-l-2 border-slate-200 ml-[3px]">{children}</div>
    </div>
  );
}