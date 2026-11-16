import React from "react";
import { fmtM, fmtData, nVal } from "@/lib/dmp-utils";
import { Pill, MiniBtn, Vazio, Th } from "../ui";

const PILL = { Pago: "ok", Cancelado: "critico", Retido: "aviso", Pendente: "neutro" };

export default function NotasFiscais({ t, onEditar, onExcluir }) {
  if (!t.ps.length) {
    return <Vazio titulo="Sem notas fiscais lançadas" texto="Use 'Lançar nota fiscal' para registrar a execução financeira deste contrato." />;
  }
  return (
    <div className="overflow-x-auto border border-slate-300 rounded-sm">
      <table className="w-full border-collapse text-[13.5px] min-w-[800px]">
        <thead>
          <tr>
            <Th>Nota fiscal</Th>
            <Th>Emissão</Th>
            <Th className="text-right">Valor da nota</Th>
            <Th className="text-right">Valor pago</Th>
            <Th className="text-right">Valor retido</Th>
            <Th>Motivo da retenção</Th>
            <Th>Data do pagamento</Th>
            <Th>Situação da nota</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {t.ps.map(p => {
            const ret = Math.max(0, nVal(p.valorNF) - nVal(p.valorPago));
            return (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-stone-50">
                <td className="px-3 py-2.5 font-mono text-xs">{p.nf}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{fmtData(p.dataNF)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(p.valorNF)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(p.valorPago)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-sm">{ret ? <b className="text-red-800">{fmtM(ret)}</b> : "—"}</td>
                <td className="px-3 py-2.5 text-sm text-slate-600 max-w-[34ch]">{ret ? (p.motivo || "não informado") : "—"}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{fmtData(p.dataPagamento)}</td>
                <td className="px-3 py-2.5"><Pill tipo={PILL[p.situacao] || "neutro"}>{p.situacao || "Pendente"}</Pill></td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <MiniBtn onClick={() => onEditar(p.id)}>Editar</MiniBtn>{" "}
                  <MiniBtn variant="risco" onClick={() => onExcluir(p)}>Excluir</MiniBtn>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-300 bg-stone-50">
            <td className="px-3 py-2.5 font-sans font-semibold text-[12.5px]" colSpan={2}>Total das notas</td>
            <td className="px-3 py-2.5 text-right font-mono font-semibold text-sm">{fmtM(t.nf)}</td>
            <td className="px-3 py-2.5 text-right font-mono font-semibold text-sm">{fmtM(t.pago)}</td>
            <td className="px-3 py-2.5 text-right font-mono font-semibold text-sm">{fmtM(t.retido)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}