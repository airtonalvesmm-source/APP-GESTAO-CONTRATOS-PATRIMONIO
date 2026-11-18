import React from "react";
import { Modal, Btn, Pill } from "../ui";
import { fmtData, fmtQ } from "@/lib/dmp-utils";
import { caminhoDepartamento } from "@/lib/departamentos";
import { Bookmark } from "lucide-react";

export default function DetalheReserva({ reserva, data, onClose }) {
  const { catalog, departamentos } = data;
  const item = (catalog || []).find(x => x.id === reserva.benId) || {};
  const dep = (departamentos || []).find(x => x.id === reserva.departamentoId);

  const linha = (rotulo, valor) => (
    <div className="border-b border-slate-100 py-2.5 grid grid-cols-[130px_minmax(0,1fr)] gap-3">
      <span className="font-sans text-[10px] font-semibold tracking-widest uppercase text-slate-500 pt-0.5">{rotulo}</span>
      <span className="font-sans text-[13.5px] text-slate-800 break-words">{valor || "—"}</span>
    </div>
  );

  return (
    <Modal sobre="Reserva de estoque" titulo={item.objeto || "Reserva"} onClose={onClose}
      footer={<Btn variant="forte" onClick={onClose}>Fechar</Btn>}>
      <div className="border border-amber-200 bg-amber-50/60 rounded-sm px-3 py-2.5 flex gap-2 items-center mb-4">
        <Bookmark className="w-4 h-4 text-amber-700 flex-none" />
        <span className="font-mono font-bold text-amber-800 text-lg leading-none">{fmtQ(reserva.quantidade)}</span>
        <span className="font-sans text-[12.5px] text-amber-900">unidade(s) reservada(s)</span>
        <span className="ml-auto"><Pill tipo={reserva.situacao === "ativa" ? "aviso" : reserva.situacao === "atendida" ? "ok" : "neutro"}>{reserva.situacao || "ativa"}</Pill></span>
      </div>

      <div>
        {linha("Item", item.objeto)}
        {linha("Destino", dep ? caminhoDepartamento(dep, departamentos) : "—")}
        {linha("Quantidade", fmtQ(reserva.quantidade))}
        {linha("Data da reserva", fmtData(reserva.data))}
        {linha("Observação", reserva.observacao)}
        {reserva.placas?.length ? linha("Placas", reserva.placas.join(", ")) : null}
        {reserva.dataConclusao ? linha("Concluída em", fmtData(reserva.dataConclusao)) : null}
        {reserva.dataCancelamento ? linha("Cancelada em", fmtData(reserva.dataCancelamento)) : null}
      </div>
    </Modal>
  );
}