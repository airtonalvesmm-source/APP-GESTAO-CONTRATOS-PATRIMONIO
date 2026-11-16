import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { SITUACOES_PAGAMENTO } from "@/lib/dmp-data";
import { fmtM, nVal, totaisPagamento } from "@/lib/dmp-utils";
import { opcoesAgrupadas } from "@/lib/subcat-utils";
import { Modal, Btn, Campo, inputCls, textareaCls } from "../ui";

export default function FormPagamento({ p, contratoId, data, refresh, onClose }) {
  const { contratos, pagamentos, ocorrencias, atas, catalog } = data;
  function catDeC(c) {
    const a = atas.find(x => x.id === c.ataId);
    if (a?.categoria) return a.categoria;
    const cats = (c.itens || []).map(i => catalog.find(b => b.id === i.benId)?.categoria).filter(Boolean);
    if (cats.length) { const counts = {}; cats.forEach(cat => counts[cat] = (counts[cat] || 0) + 1); return Object.entries(counts).sort((x, y) => y[1] - x[1])[0][0]; }
    return "Sem categoria";
  }
  const cid = p?.contratoId || contratoId || contratos[0]?.id;
  const c0 = contratos.find(x => x.id === cid);
  const t0 = c0 ? totaisPagamento(c0, pagamentos, ocorrencias) : null;
  const empenhadoInicial = t0 ? t0.empenhado : 0;
  const [form, setForm] = useState({
    contratoId: cid, nf: p?.nf || "", dataNF: p?.dataNF || "",
    valorNF: p ? p.valorNF : empenhadoInicial,
    valorRetido: p ? Math.max(0, nVal(p.valorNF) - nVal(p.valorPago)) : 0,
    valorPago: p ? p.valorPago : empenhadoInicial,
    dataPagamento: p?.dataPagamento || "", motivo: p?.motivo || (p ? "" : "Atraso na entrega"),
    situacao: p?.situacao || "Pago"
  });
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function setRetido(v) {
    const r = Math.max(0, nVal(v));
    const pago = Math.max(0, nVal(form.valorNF) - r);
    setForm(f => ({ ...f, valorRetido: r, valorPago: pago }));
  }
  function setNota(v) {
    const nf = nVal(v);
    const pago = Math.max(0, nf - nVal(form.valorRetido));
    setForm(f => ({ ...f, valorNF: nf, valorPago: pago }));
  }
  const c = contratos.find(x => x.id === form.contratoId);
  const t = c ? totaisPagamento(c, pagamentos, ocorrencias) : null;

  async function salvar() {
    if (!form.nf.trim()) return alert("Informe o número da nota fiscal.");
    if (!nVal(form.valorNF)) return alert("Informe o valor da nota fiscal.");
    const ret = nVal(form.valorRetido);
    if (ret > 0 && !form.motivo.trim()) return alert(`Há R$ ${fmtM(ret)} retidos: informe o motivo da retenção.`);
    const dados = { contratoId: form.contratoId, nf: form.nf.trim(), dataNF: form.dataNF, valorNF: nVal(form.valorNF), valorPago: nVal(form.valorPago), dataPagamento: form.dataPagamento, motivo: form.motivo.trim(), situacao: form.situacao };
    if (p) await base44.entities.Pagamento.update(p.id, dados);
    else await base44.entities.Pagamento.create(dados);
    await refresh();
    onClose();
    alert(p ? "Nota fiscal atualizada." : "Nota fiscal lançada.");
  }

  return (
    <Modal sobre="Pagamentos" titulo={p ? "Editar nota fiscal" : "Lançar nota fiscal"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar lançamento</Btn></>}>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Contrato ou empenho" ajuda={t ? `Empenhado R$ ${fmtM(t.empenhado)} · já pago R$ ${fmtM(t.pago)} · saldo a pagar R$ ${fmtM(t.aPagar)}` : ""}>
          <select className={inputCls} value={form.contratoId} onChange={e => setF("contratoId", e.target.value)}>
            {opcoesAgrupadas({
              items: contratos,
              grupoFns: [c => (c.inicio || c.fim || "").slice(0, 4) || "Sem ano", c => catDeC(c), c => c.fornecedor || "Sem fornecedor"],
              optionFn: c => <option key={c.id} value={c.id}>{c.tipo} {c.numero}{c.notaEmpenho ? ` · NE ${c.notaEmpenho}` : ""}</option>,
              sortItems: (a, b) => {
                const aa = (a.inicio || a.fim || "").slice(0, 4), ba = (b.inicio || b.fim || "").slice(0, 4);
                return ba.localeCompare(aa) || (catDeC(a) || "").localeCompare(catDeC(b) || "", "pt-BR") || (a.fornecedor || "").localeCompare(b.fornecedor || "", "pt-BR");
              }
            })}
          </select>
        </Campo>
        <Campo label="Número da nota fiscal"><input className={inputCls} value={form.nf} onChange={e => setF("nf", e.target.value)} /></Campo>
        <Campo label="Emissão da nota"><input type="date" className={inputCls} value={form.dataNF} onChange={e => setF("dataNF", e.target.value)} /></Campo>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Valor da nota (R$)"><input type="number" min="0" step="0.01" className={inputCls} value={form.valorNF} onChange={e => setNota(e.target.value)} /></Campo>
        <Campo label="Valor retido (R$)" ajuda="Digite o valor retido. O valor pago é recalculado automaticamente."><input type="number" min="0" step="0.01" className={inputCls} value={form.valorRetido} onChange={e => setRetido(e.target.value)} /></Campo>
        <Campo label="Data do pagamento"><input type="date" className={inputCls} value={form.dataPagamento} onChange={e => setF("dataPagamento", e.target.value)} /></Campo>
        <Campo label="Valor pago (R$)" ajuda="Calculado: valor da nota − retido."><input readOnly className={inputCls + " bg-slate-50"} value={fmtM(form.valorPago)} /></Campo>
        <Campo label="Situação da nota"><select className={inputCls} value={form.situacao} onChange={e => setF("situacao", e.target.value)}>{SITUACOES_PAGAMENTO.map(s => <option key={s}>{s}</option>)}</select></Campo>
      </div>
      <Campo label="Motivo da retenção"><textarea className={textareaCls} value={form.motivo} onChange={e => setF("motivo", e.target.value)} placeholder="ex.: retenção de 2% a título de multa por atraso na entrega, conforme processo de penalidade." /></Campo>
    </Modal>
  );
}