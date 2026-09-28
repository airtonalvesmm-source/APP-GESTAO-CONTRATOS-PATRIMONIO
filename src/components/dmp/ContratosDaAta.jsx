import React from "react";
import { fmtM, nQtd, nVal, valorEmpenhado, contratoAtivo } from "@/lib/dmp-utils";
import { Pill, Vazio } from "./ui";
import { ChevronDown } from "lucide-react";

// Mapeia situação do contrato → classe do Pill
function sitPill(sit) {
  if (sit === "Vigente") return "ok";
  if (sit === "Encerrado") return "neutro";
  if (sit === "Suspenso") return "aviso";
  return "critico"; // Rescindido, Cancelado
}

// Badge de contagem de contratos — vermelho quando não há nenhum
export function BadgeContratos({ ata, contratos }) {
  const n = contratos.filter(c => c.ataId === ata.id).length;
  if (n === 0) return <Pill tipo="critico">Sem contratos</Pill>;
  return <Pill tipo="neutro">{n} {n === 1 ? "contrato" : "contratos"}</Pill>;
}

// Tabela de contratos vinculados a uma ata — usada na aba Atas (seção) e na aba Licitações (expansível)
export function TabelaContratosDaAta({ ata, contratos, ocorrencias }) {
  const lista = contratos.filter(c => c.ataId === ata.id);
  if (!lista.length) {
    return <Vazio titulo="Nenhum contrato vinculado" texto="Esta ata ainda não gerou contratos ou notas de empenho." />;
  }
  return (
    <div className="overflow-x-auto border border-slate-300 rounded-sm">
      <table className="w-full border-collapse text-[13px] min-w-[640px]">
        <thead>
          <tr className="bg-stone-50">
            <Th>Tipo / Número</Th>
            <Th>Fornecedor</Th>
            <Th>Situação</Th>
            <Th className="text-right">Itens</Th>
            <Th className="text-right">Valor empenhado (R$)</Th>
          </tr>
        </thead>
        <tbody>
          {lista.map(c => {
            const emp = ocorrencias ? valorEmpenhado(c, ocorrencias) : (c.itens || []).reduce((t, i) => t + nQtd(i.qtd) * nVal(i.valor), 0);
            const ativo = contratoAtivo(c);
            return (
              <tr key={c.id} className={`border-b border-slate-100 hover:bg-stone-50 ${!ativo ? "opacity-60" : ""}`}>
                <td className="px-3 py-2.5">
                  <span className="font-mono text-xs font-semibold text-slate-800">{c.tipo || "Contrato"} {c.numero}</span>
                  {c.notaEmpenho && <span className="block font-mono text-[10px] text-slate-500">NE {c.notaEmpenho}</span>}
                </td>
                <td className="px-3 py-2.5 font-sans text-[12.5px] text-slate-700">{c.fornecedor || "—"}</td>
                <td className="px-3 py-2.5"><Pill tipo={sitPill(c.situacao)}>{c.situacao || "—"}</Pill></td>
                <td className="px-3 py-2.5 text-right font-mono text-sm">{(c.itens || []).length}</td>
                <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold">{fmtM(emp)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`font-sans text-[9.5px] tracking-widest uppercase text-slate-500 text-left border-b border-slate-300 px-3 py-2.5 bg-stone-50 whitespace-nowrap ${className}`}>{children}</th>;
}

// Bloco expansível: linha clicável (usado na aba Licitações dentro da licitação expandida)
export function LinhaAtaExpansivel({ ata, contratos, ocorrencias, aberto, onToggle }) {
  const n = contratos.filter(c => c.ataId === ata.id).length;
  const reg = (ata.itens || []).reduce((t, it) => t + nQtd(it.qtd) * nVal(it.valor), 0);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button onClick={onToggle} className="w-full px-3 py-2.5 flex gap-3 items-center text-left hover:bg-stone-50 transition-colors">
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-none ${aberto ? "rotate-180" : ""}`} />
        <span className="font-mono text-xs font-semibold text-slate-800">Ata {ata.numero}</span>
        <span className="font-sans text-[12px] text-slate-600">{ata.fornecedor || "—"}</span>
        <span className="font-mono text-[10px] text-slate-500 ml-auto">{(ata.itens || []).length} itens · R$ {fmtM(reg)}</span>
        <BadgeContratos ata={ata} contratos={contratos} />
      </button>
      {aberto && (
        <div className="px-3 pb-3 pt-1 bg-stone-50/60">
          <TabelaContratosDaAta ata={ata} contratos={contratos} ocorrencias={ocorrencias} />
        </div>
      )}
    </div>
  );
}