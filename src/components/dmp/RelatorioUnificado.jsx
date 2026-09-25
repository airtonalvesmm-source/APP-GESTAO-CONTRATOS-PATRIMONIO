import React, { useState, useMemo } from "react";
import { fmtM, fmtData, valorEmpenhado, fimVigente, ocorrenciasDe, totaisPagamento } from "@/lib/dmp-utils";
import { FALTAS } from "@/lib/dmp-data";
import { exportarRelatorioUnificado, imprimirRelatorioUnificado } from "@/lib/relatorio-unificado";
import { Btn, Campo, Modal, inputCls } from "./ui";
import { Printer, Download } from "lucide-react";

export default function RelatorioUnificado({ data, onClose }) {
  const { contratos, pagamentos, ocorrencias, atas } = data;
  const [filtroEntrega, setFiltroEntrega] = useState("");
  const [filtroRisco, setFiltroRisco] = useState("");
  const [filtroAno, setFiltroAno] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");
  const anoDe = (c) => c.inicio?.slice(0, 4) || c.fim?.slice(0, 4) || "";
  const anos = useMemo(() => [...new Set(contratos.map(anoDe).filter(Boolean))].sort((a, b) => b - a), [contratos]);

  const linhas = useMemo(() => {
    return contratos.filter(c => {
      if (filtroAno && anoDe(c) !== filtroAno) return false;
      if (filtroSituacao && (c.situacao || "") !== filtroSituacao) return false;
      if (filtroEntrega && (c.statusEntrega || "Aguardando entrega") !== filtroEntrega) return false;
      if (filtroRisco) {
        const ocs = ocorrenciasDe(c.id, ocorrencias);
        const tp = totaisPagamento(c, pagamentos, ocorrencias);
        const temRisco = ocs.some(o => FALTAS.includes(o.tipo)) || tp.retido > 0;
        if (filtroRisco === "sim" && !temRisco) return false;
        if (filtroRisco === "nao" && temRisco) return false;
      }
      return true;
    });
  }, [contratos, pagamentos, ocorrencias, filtroEntrega, filtroRisco, filtroAno, filtroSituacao]);

  function baixar() { exportarRelatorioUnificado(linhas, pagamentos, ocorrencias, atas); }
  function imprimir() { imprimirRelatorioUnificado(linhas, pagamentos, ocorrencias, atas); }

  const totalRisco = linhas.filter(c => {
    const ocs = ocorrenciasDe(c.id, ocorrencias);
    const tp = totaisPagamento(c, pagamentos, ocorrencias);
    return ocs.some(o => FALTAS.includes(o.tipo)) || tp.retido > 0;
  }).length;

  return (
    <Modal sobre="Contratos e Pagamentos" titulo="Relatório unificado" onClose={onClose}
      footer={<>
        <Btn onClick={onClose}>Fechar</Btn>
        <Btn onClick={baixar}><Download className="w-4 h-4 inline mr-1" />Baixar CSV</Btn>
        <Btn variant="forte" onClick={imprimir}><Printer className="w-4 h-4 inline mr-1" />Imprimir / PDF</Btn>
      </>}>
      <p className="font-sans text-[12px] text-slate-500 mb-3.5">
        Visão consolidada de contratos e pagamentos com status de entrega e indicador de atraso/retenção.
        {totalRisco > 0 && <> · <b className="text-amber-700">{totalRisco} contrato(s) com atraso ou retenção</b></>}
      </p>
      <div className="flex gap-2.5 items-end flex-wrap mb-4">
        <div className="min-w-[120px]"><Campo label="Ano"><select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className={inputCls}><option value="">Todos</option>{anos.map(a => <option key={a} value={a}>{a}</option>)}</select></Campo></div>
        <div className="min-w-[150px]"><Campo label="Situação"><select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)} className={inputCls}><option value="">Todas</option>{["Vigente", "Encerrado", "Rescindido", "Suspenso", "Cancelado"].map(s => <option key={s} value={s}>{s}</option>)}</select></Campo></div>
        <div className="min-w-[160px]"><Campo label="Status de entrega"><select value={filtroEntrega} onChange={e => setFiltroEntrega(e.target.value)} className={inputCls}><option value="">Todos</option><option value="Aguardando entrega">Aguardando entrega</option><option value="Entregue">Entregue</option></select></Campo></div>
        <div className="min-w-[160px]"><Campo label="Atraso / Retenção"><select value={filtroRisco} onChange={e => setFiltroRisco(e.target.value)} className={inputCls}><option value="">Todos</option><option value="sim">Com atraso/retenção</option><option value="nao">Sem atraso/retenção</option></select></Campo></div>
        <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto self-center">{linhas.length} {linhas.length === 1 ? "contrato" : "contratos"}</span>
      </div>
      <div className="overflow-x-auto border border-slate-300 rounded-sm max-h-[55vh] overflow-y-auto">
        <table className="w-full border-collapse text-[12px] min-w-[1100px]">
          <thead className="sticky top-0">
            <tr className="bg-slate-800 text-white">
              {["Tipo", "Número", "Ano", "SEI", "NE", "Ata", "Fornecedor", "Objeto", "Situação", "Início", "Fim", "Itens", "Valor", "STATUS", "Atraso/Ret."].map(h => <th key={h} className="px-2 py-2 text-left font-sans text-[9px] tracking-wide uppercase whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {linhas.map(c => {
              const a = atas.find(x => x.id === c.ataId);
              const ocs = ocorrenciasDe(c.id, ocorrencias);
              const tp = totaisPagamento(c, pagamentos, ocorrencias);
              const temRisco = ocs.some(o => FALTAS.includes(o.tipo)) || tp.retido > 0;
              return (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-stone-50">
                  <td className="px-2 py-2 font-mono text-[11px]">{c.tipo || "Contrato"}</td>
                  <td className="px-2 py-2 font-mono text-[11px] font-semibold">{c.numero}</td>
                  <td className="px-2 py-2 font-mono text-[11px]">{c.inicio?.slice(0, 4) || c.fim?.slice(0, 4) || ""}</td>
                  <td className="px-2 py-2 font-mono text-[10px] max-w-[80px] truncate" title={c.processo || ""}>{c.processo || "—"}</td>
                  <td className="px-2 py-2 font-mono text-[10px]">{c.notaEmpenho || "—"}</td>
                  <td className="px-2 py-2 font-mono text-[11px]">{a?.numero || "—"}</td>
                  <td className="px-2 py-2 font-sans text-[11px] max-w-[120px] truncate" title={c.fornecedor || ""}>{c.fornecedor || "—"}</td>
                  <td className="px-2 py-2 font-sans text-[11px] max-w-[160px] truncate" title={c.objeto || ""}>{c.objeto || "—"}</td>
                  <td className="px-2 py-2 font-sans text-[11px]">{c.situacao || "—"}</td>
                  <td className="px-2 py-2 font-mono text-[10px] whitespace-nowrap">{fmtData(c.inicio)}</td>
                  <td className="px-2 py-2 font-mono text-[10px] whitespace-nowrap">{fmtData(fimVigente(c, ocorrencias))}</td>
                  <td className="px-2 py-2 font-mono text-[11px] text-center">{(c.itens || []).length}</td>
                  <td className="px-2 py-2 font-mono text-[11px] text-right whitespace-nowrap">{fmtM(valorEmpenhado(c, ocorrencias))}</td>
                  <td className="px-2 py-2 font-sans text-[11px] text-center">{c.statusEntrega || "Aguardando entrega"}</td>
                  <td className={`px-2 py-2 text-center font-sans text-[11px] font-semibold ${temRisco ? "bg-orange-500 text-white" : "text-slate-500"}`}>{temRisco ? "Sim" : "Não"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}