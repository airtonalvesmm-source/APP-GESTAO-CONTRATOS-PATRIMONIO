import React from "react";
import { fmtM, fmtData, fimVigente, valorItensContrato, aditivoValor } from "@/lib/dmp-utils";
import { Pill, Barra, Btn } from "../ui";
import { ChevronDown, Plus } from "lucide-react";
import ResumoFinanceiro from "./ResumoFinanceiro";
import NotasFiscais from "./NotasFiscais";
import OcorrenciasContrato from "./OcorrenciasContrato";

// Classificação única do contrato: uma situação financeira por contrato,
// derivada dos mesmos critérios usados pelos filtros.
export function situacaoFinanceira(t) {
  if (!t.ps.length) return { tipo: "neutro", txt: "Sem notas lançadas" };
  if (t.retido > 0) return { tipo: "critico", txt: `Com retenção · R$ ${fmtM(t.retido)} retido` };
  if (t.aPagar > 0) return { tipo: "aviso", txt: `Com saldo a pagar · R$ ${fmtM(t.aPagar)}` };
  return { tipo: "ok", txt: "Quitado" };
}

function Secao({ titulo, desc, acao, children }) {
  return (
    <section className="mt-5">
      <div className="flex items-end gap-3 flex-wrap mb-2.5">
        <div className="min-w-0">
          <h4 className="font-sans font-semibold text-[10px] font-bold tracking-widest uppercase text-slate-500">{titulo}</h4>
          {desc && <p className="font-sans text-[11.5px] text-slate-500 mt-0.5">{desc}</p>}
        </div>
        {acao && <div className="ml-auto">{acao}</div>}
      </div>
      {children}
    </section>
  );
}

export default function CartaoContrato({ c, t, ocs, aberto, onToggle, onEditarNota, onExcluirNota, onExcluirOcorrencia, onNovaNota, onNovaOcorrencia }) {
  const pct = t.empenhado ? Math.max(0, Math.min(100, (t.pago / t.empenhado) * 100)) : 0;
  const st = situacaoFinanceira(t);
  const aditivos = ocs.filter(o => o.tipo.startsWith("Aditivo") || o.tipo === "Apostilamento");
  const faltas = ocs.filter(o => o.tipo.startsWith("Descumprimento") || o.tipo === "Penalidade aplicada");

  return (
    <div className="bg-white border border-slate-300 rounded-sm overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3.5 flex gap-4 items-center flex-wrap text-left hover:bg-stone-50 transition-colors">
        <span className="flex flex-col min-w-[150px]">
          <span className="font-mono text-[15px] font-semibold text-slate-800">{c.tipo} {c.numero}</span>
          <span className="font-sans text-[12px] text-slate-500 truncate max-w-[260px]">{c.fornecedor || "—"}</span>
        </span>
        <span className="flex flex-col flex-1 min-w-[180px]">
          <span className="font-mono text-[11px] text-slate-500">
            Empenhado R$ {fmtM(t.empenhado)} · pago R$ {fmtM(t.pago)}
          </span>
          <Barra pct={pct} classe={t.retido > 0 ? "critico" : pct >= 100 ? "" : "aviso"} />
        </span>
        <span className="ml-auto flex gap-2 items-center flex-wrap">
          <Pill tipo={st.tipo}>{st.txt}</Pill>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
        </span>
      </button>

      {aberto && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <p className="font-sans text-[12.5px] text-slate-600 mt-3.5">
            Processo {c.processo || "—"} · Nota de empenho {c.notaEmpenho || "—"} · Vigência até {fmtData(fimVigente(c, ocs))}
            {" · Itens R$ " + fmtM(valorItensContrato(c))}
            {aditivoValor(c.id, ocs) ? ` · aditivos de valor R$ ${fmtM(aditivoValor(c.id, ocs))}` : ""}
          </p>

          <Secao titulo="Resumo financeiro do contrato">
            <ResumoFinanceiro t={t} />
          </Secao>

          <Secao
            titulo="Notas fiscais"
            desc="Cada nota tem seus próprios valores; a situação é o estágio do pagamento dela."
            acao={<Btn variant="forte" onClick={onNovaNota} className="!px-2.5 !py-1.5 !text-[11.5px]"><Plus className="w-3.5 h-3.5 inline mr-1" />Lançar nota fiscal</Btn>}
          >
            <NotasFiscais t={t} onEditar={onEditarNota} onExcluir={onExcluirNota} />
          </Secao>

          <Secao
            titulo="Aditivos e descumprimentos"
            desc={
              faltas.length
                ? `${faltas.length} ocorrência(s) de descumprimento registrada(s).`
                : "Alterações de prazo, valor e apostilamentos — não afetam o lançamento das notas."
            }
            acao={<Btn onClick={onNovaOcorrencia} className="!px-2.5 !py-1.5 !text-[11.5px]">Registrar aditivo ou ocorrência</Btn>}
          >
            {aditivos.length > 0 && (
              <p className="font-mono text-[10.5px] text-slate-500 mb-2">{aditivos.length} aditivo(s) ou apostilamento(s) no contrato</p>
            )}
            <OcorrenciasContrato ocs={ocs} onExcluir={onExcluirOcorrencia} />
          </Secao>
        </div>
      )}
    </div>
  );
}