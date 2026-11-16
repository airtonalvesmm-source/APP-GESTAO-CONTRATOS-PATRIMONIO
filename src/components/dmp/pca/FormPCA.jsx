import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { fmtM, fmtQ, nQtd, nVal, anoAtual } from "@/lib/dmp-utils";
import { opcoesBensTodasCategorias } from "@/lib/subcat-utils";
import { Btn, Campo, Modal, inputCls, textareaCls } from "../ui";

export default function FormPCA({ r, data, exercicio, refresh, onClose, benId }) {
  const { catalog, pca } = data;
  const [form, setForm] = useState({
    benId: r?.benId || benId || catalog[0]?.id || "", exercicio: r?.exercicio || exercicio || anoAtual,
    codigo: r?.codigo || "", qtd: r?.qtd || "", valor: r?.valor ? fmtM(r.valor) : "", justificativa: r?.justificativa || ""
  });
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }
  const b = catalog.find(x => x.id === form.benId);

  async function salvar() {
    if (!nQtd(form.qtd)) return alert("Informe uma quantidade maior que zero.");
    if (r && nQtd(r.qtdSobrestada) > nQtd(form.qtd)) return alert(`A quantidade autorizada (${fmtQ(nQtd(form.qtd))}) não pode ser menor que a quantidade sobrestada (${fmtQ(nQtd(r.qtdSobrestada))}). Remova ou ajuste o sobrestamento primeiro.`);
    const dados = { benId: form.benId, exercicio: +form.exercicio || anoAtual, codigo: form.codigo.trim(), qtd: nQtd(form.qtd), valor: nVal(form.valor), justificativa: form.justificativa.trim() };
    const repetido = pca.find(p => p.id !== r?.id && p.benId === dados.benId && +p.exercicio === dados.exercicio);
    if (repetido && !confirm(`Este bem já está no plano de ${dados.exercicio}${repetido.codigo ? ` (código ${repetido.codigo})` : ""}. Incluir mesmo assim como item separado?`)) return;
    if (r) {
      await base44.entities.PCAItem.update(r.id, { ...dados, qtdSobrestada: nQtd(r.qtdSobrestada), motivoSobrestamento: r.motivoSobrestamento || "", dataSobrestamento: r.dataSobrestamento || "" });
    } else {
      await base44.entities.PCAItem.create(dados);
    }
    await refresh();
    onClose();
    alert(r ? "Item atualizado." : "Item incluído no plano de " + dados.exercicio + ".");
  }

  return (
    <Modal sobre="Plano Anual de Contratações" titulo={r ? "Editar item do plano" : "Incluir item no plano"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar item</Btn></>}>
      <div className="grid gap-3 md:grid-cols-2 mb-3">
        <Campo label="Item do catálogo"><select className={inputCls} value={form.benId} onChange={e => setF("benId", e.target.value)}>{opcoesBensTodasCategorias(catalog, form.benId)}</select></Campo>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Exercício"><input type="number" min="2020" max="2099" className={inputCls} value={form.exercicio} onChange={e => setF("exercicio", e.target.value)} /></Campo>
        <Campo label="Código do PCA"><input className={inputCls} value={form.codigo} onChange={e => setF("codigo", e.target.value)} placeholder="ex.: 2027.0031" /></Campo>
        <Campo label="Quantidade"><input type="number" min="1" className={inputCls} value={form.qtd} onChange={e => setF("qtd", e.target.value)} /></Campo>
        <Campo label="Valor unitário estimado (R$)"><input inputMode="decimal" className={inputCls} value={form.valor} onChange={e => setF("valor", e.target.value)} onBlur={e => setF("valor", e.target.value.trim() ? fmtM(nVal(e.target.value)) : "")} placeholder="ex.: 1.500,00" /></Campo>
      </div>
      <Campo label="Justificativa da necessidade"><textarea className={textareaCls} value={form.justificativa} onChange={e => setF("justificativa", e.target.value)} placeholder="ex.: manutenção do sistema de videomonitoramento das sedes das promotorias de justiça do interior." /></Campo>
      {b && <p className="font-sans text-sm text-slate-600 mt-3"><b>Aplicação:</b> {b.aplicacao}</p>}
    </Modal>
  );
}