import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Modal, Btn, Campo, inputCls } from "../ui";
import { diasDoPrazo, somaDias, fmtData, prazoTexto } from "@/lib/dmp-utils";

export default function ConfirmarOrdem({ o, c, refresh, onClose }) {
  const [form, setForm] = useState({
    dataConfirmacao: o.dataConfirmacao || "",
    dataLimiteEntrega: o.dataLimiteEntrega || "",
    prazoEntrega: prazoTexto(o.prazoEntrega)
  });

  function setF(k, v) {
    setForm(f => {
      const novo = { ...f, [k]: v };
      if (k === "dataConfirmacao" || k === "prazoEntrega") {
        const dias = diasDoPrazo(novo.prazoEntrega);
        if (novo.dataConfirmacao && dias) novo.dataLimiteEntrega = somaDias(novo.dataConfirmacao, dias);
      }
      return novo;
    });
  }

  async function salvar() {
    await base44.entities.OrdemFornecimento.update(o.id, {
      prazoEntrega: prazoTexto(form.prazoEntrega),
      dataConfirmacao: form.dataConfirmacao,
      dataLimiteEntrega: form.dataLimiteEntrega
    });
    await refresh();
    onClose();
  }

  return (
    <Modal sobre={`Ordem emitida em ${fmtData(o.data)} — ${c.tipo} ${c.numero}`} titulo="Registrar confirmação do recebimento" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar</Btn></>}>
      <p className="font-sans text-[12.5px] text-slate-500 mb-3">
        Estes dados são registrados depois da emissão da ordem e passam a constar no documento.
      </p>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <Campo label="Prazo de entrega" ajuda="Herdado da ata — ajuste se a ordem tiver prazo próprio.">
          <input className={inputCls} value={form.prazoEntrega} onChange={e => setF("prazoEntrega", e.target.value)} placeholder="ex.: 30 dias" />
        </Campo>
        <Campo label="Confirmação do recebimento da ordem" ajuda="Data em que a contratada confirmou o recebimento da ordem.">
          <input type="date" className={inputCls} value={form.dataConfirmacao} onChange={e => setF("dataConfirmacao", e.target.value)} />
        </Campo>
        <Campo label="Data limite para entrega" ajuda="Calculada pelo prazo acima — ajuste se necessário.">
          <input type="date" className={inputCls} value={form.dataLimiteEntrega} onChange={e => setF("dataLimiteEntrega", e.target.value)} />
        </Campo>
      </div>
    </Modal>
  );
}