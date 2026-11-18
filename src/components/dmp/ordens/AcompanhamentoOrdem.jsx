import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Modal, Btn, Campo, Pill, inputCls } from "../ui";
import { fmtM, fmtData, valorOrdem, diasAte } from "@/lib/dmp-utils";

export default function AcompanhamentoOrdem({ o, c, refresh, onClose }) {
  const [dataConfirmacao, setDataConfirmacao] = useState(o.dataConfirmacao || "");
  const [dataLimiteEntrega, setDataLimiteEntrega] = useState(o.dataLimiteEntrega || "");

  async function salvar() {
    await base44.entities.OrdemFornecimento.update(o.id, { dataConfirmacao, dataLimiteEntrega });
    await refresh();
    onClose();
    alert("Acompanhamento atualizado.");
  }

  const dias = diasAte(dataLimiteEntrega);
  const situacaoLimite = dias === null ? null
    : dias < 0 ? { tipo: "critico", txt: `Limite vencido há ${Math.abs(dias)} dia(s)` }
    : { tipo: "neutro", txt: `Faltam ${dias} dia(s) para o limite` };

  return (
    <Modal sobre={`${c.tipo} ${c.numero}`} titulo="Acompanhamento da ordem de fornecimento" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar acompanhamento</Btn></>}>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-4">
        <Campo label="Data de emissão"><input readOnly className={inputCls + " bg-slate-50"} value={fmtData(o.data)} /></Campo>
        <Campo label="Prazo de entrega"><input readOnly className={inputCls + " bg-slate-50"} value={o.prazoEntrega || "—"} /></Campo>
        <Campo label="Valor da ordem"><input readOnly className={inputCls + " bg-slate-50"} value={"R$ " + fmtM(valorOrdem(o))} /></Campo>
      </div>

      <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mb-2">Eventos posteriores à emissão</p>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Confirmação do recebimento da ordem" ajuda="Data em que a contratada confirmou o recebimento da ordem.">
          <input type="date" className={inputCls} value={dataConfirmacao} onChange={e => setDataConfirmacao(e.target.value)} />
        </Campo>
        <Campo label="Data limite para entrega" ajuda="Informada manualmente.">
          <input type="date" className={inputCls} value={dataLimiteEntrega} onChange={e => setDataLimiteEntrega(e.target.value)} />
        </Campo>
      </div>
      {situacaoLimite && <Pill tipo={situacaoLimite.tipo}>{situacaoLimite.txt}</Pill>}
      <p className="font-sans text-[11.5px] text-slate-500 mt-3">Estes dados são de controle interno e não constam no documento da ordem de fornecimento.</p>
    </Modal>
  );
}