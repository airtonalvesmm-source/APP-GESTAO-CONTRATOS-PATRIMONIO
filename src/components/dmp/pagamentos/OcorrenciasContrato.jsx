import React from "react";
import { fmtM, fmtData, nVal } from "@/lib/dmp-utils";
import { FALTAS } from "@/lib/dmp-data";
import { Pill, MiniBtn, Vazio, Th } from "../ui";

export default function OcorrenciasContrato({ ocs, onExcluir }) {
  if (!ocs.length) {
    return <Vazio titulo="Sem aditivos ou descumprimentos" texto="Registre prazos, valores, apostilamentos e faltas do fornecedor neste contrato." />;
  }
  return (
    <div className="overflow-x-auto border border-slate-300 rounded-sm">
      <table className="w-full border-collapse text-[13.5px] min-w-[520px]">
        <thead>
          <tr>
            <Th>Data</Th>
            <Th>Tipo</Th>
            <Th>Descrição</Th>
            <Th className="text-right">Efeito</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {ocs.map(o => (
            <tr key={o.id} className="border-b border-slate-100 hover:bg-stone-50">
              <td className="px-3 py-2.5 font-mono text-xs">{fmtData(o.data)}</td>
              <td className="px-3 py-2.5"><Pill tipo={FALTAS.includes(o.tipo) ? "critico" : "neutro"}>{o.tipo}</Pill></td>
              <td className="px-3 py-2.5 text-sm text-slate-600 max-w-[34ch]">{o.descricao || "—"}</td>
              <td className="px-3 py-2.5 text-right font-mono text-sm">
                {o.tipo === "Aditivo de prazo" ? `+${o.dias} dias` : (nVal(o.valor) ? `R$ ${fmtM(nVal(o.valor))}` : "—")}
              </td>
              <td className="px-3 py-2.5"><MiniBtn variant="risco" onClick={() => onExcluir(o)}>Excluir</MiniBtn></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}