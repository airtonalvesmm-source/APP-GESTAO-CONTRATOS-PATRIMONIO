import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Modal, Btn, Campo, Pill, inputCls, textareaCls } from "../ui";
import { fmtM, fmtData, nVal, somaDias, pagamentosDe, entregaDaAta, termosDe, anoAtual } from "@/lib/dmp-utils";

export default function FormTermo({ c, data, refresh, onClose, onSalvo }) {
  const { atas, pagamentos, termos } = data;
  const notas = pagamentosDe(c.id, pagamentos).filter(p => p.situacao !== "Cancelado");
  const entrega = entregaDaAta(c, atas);
  const ano = (c.inicio || "").slice(0, 4) || String(anoAtual);
  const [form, setForm] = useState({
    dataConfirmacaoOrdem: "",
    dataLimiteEntrega: "",
    dataRecebimentoProvisorio: "",
    dataRecebimentoDefinitivo: "",
    observacoes: ""
  });
  const [selecionadas, setSelecionadas] = useState([]);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function marcarConfirmacao(v) {
    setForm(f => {
      const novo = { ...f, dataConfirmacaoOrdem: v };
      if (v && entrega.prazoEntrega) novo.dataLimiteEntrega = somaDias(v, entrega.prazoEntrega);
      return novo;
    });
  }

  function toggle(id) {
    setSelecionadas(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  async function salvar() {
    if (!selecionadas.length) return alert("Selecione ao menos uma nota fiscal.");
    if (!form.dataRecebimentoProvisorio) return alert("Informe a data do recebimento provisório.");
    const criado = await base44.entities.TermoRecebimento.create({
      contratoId: c.id,
      pagamentoIds: selecionadas,
      dataConfirmacaoOrdem: form.dataConfirmacaoOrdem,
      dataLimiteEntrega: form.dataLimiteEntrega,
      dataRecebimentoProvisorio: form.dataRecebimentoProvisorio,
      dataRecebimentoDefinitivo: form.dataRecebimentoDefinitivo,
      observacoes: form.observacoes.trim()
    });
    await refresh();
    onSalvo?.(criado);
  }

  const atraso = form.dataRecebimentoProvisorio && form.dataLimiteEntrega && form.dataRecebimentoProvisorio > form.dataLimiteEntrega;

  return (
    <Modal sobre={`${c.tipo} ${c.numero}`} titulo="Emitir termo circunstanciado de recebimento" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar e emitir</Btn></>}>
      <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mb-2">Notas fiscais deste termo</p>
      {notas.length === 0 ? (
        <p className="font-sans text-sm text-slate-500 mb-4">Este contrato não tem notas fiscais lançadas.</p>
      ) : (
        <div className="border border-slate-300 rounded-sm overflow-hidden mb-4">
          {notas.map(p => (
            <label key={p.id} className="flex gap-3 items-center px-3 py-2.5 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-stone-50">
              <input type="checkbox" checked={selecionadas.includes(p.id)} onChange={() => toggle(p.id)} />
              <span className="font-mono text-xs min-w-[110px]">NF {p.nf}</span>
              <span className="font-mono text-xs text-slate-500">{fmtData(p.dataNF)}</span>
              <span className="font-mono text-xs ml-auto">R$ {fmtM(p.valorNF)}</span>
              <Pill tipo={p.situacao === "Pago" ? "ok" : p.situacao === "Retido" ? "aviso" : "neutro"}>{p.situacao || "Pendente"}</Pill>
            </label>
          ))}
        </div>
      )}

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))] mb-3">
        <Campo label="Confirmação do recebimento da ordem" ajuda="Data em que a ordem de fornecimento foi confirmada pela contratada.">
          <input type="date" className={inputCls} value={form.dataConfirmacaoOrdem} onChange={e => marcarConfirmacao(e.target.value)} />
        </Campo>
        <Campo label="Data limite para entrega" ajuda={entrega.prazoEntrega ? `Sugerida com o prazo da ata (${entrega.prazoEntrega} dias).` : "Informe o prazo previsto para a entrega."}>
          <input type="date" className={inputCls} value={form.dataLimiteEntrega} onChange={e => setF("dataLimiteEntrega", e.target.value)} />
        </Campo>
        <Campo label="Recebimento provisório"><input type="date" className={inputCls} value={form.dataRecebimentoProvisorio} onChange={e => setF("dataRecebimentoProvisorio", e.target.value)} /></Campo>
        <Campo label="Recebimento definitivo"><input type="date" className={inputCls} value={form.dataRecebimentoDefinitivo} onChange={e => setF("dataRecebimentoDefinitivo", e.target.value)} /></Campo>
      </div>

      {atraso && <p className="font-sans text-[12px] text-amber-800 bg-amber-50 border border-amber-300 rounded-sm px-3 py-2 mb-3">Recebimento provisório após a data limite: o termo registrará automaticamente a anotação de entrega em atraso.</p>}

      <Campo label="Anotações complementares">
        <textarea className={textareaCls} value={form.observacoes} onChange={e => setF("observacoes", e.target.value)} placeholder="ex.: itens conferidos e em conformidade com a especificação." />
      </Campo>
    </Modal>
  );
}