import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { norm } from "@/lib/dmp-utils";
import { optgroupsDepartamentos } from "@/lib/departamentos";
import { Modal, Btn, Campo, inputCls } from "../ui";

export default function EditarRegistro({ bem, data, onClose }) {
  const { catalog, contratos, departamentos, bens } = data;
  const item = catalog.find(x => x.id === bem.benId);
  const [form, setForm] = useState({
    contratoId: bem.contratoId || "",
    numeroNF: bem.numeroNF || "",
    dataNF: bem.dataNF || "",
    placa: String(bem.placa || ""),
    dataEntrada: bem.dataEntrada || "",
    situacao: bem.situacao || "em estoque",
    departamentoId: bem.departamentoId || ""
  });
  const [salvando, setSalvando] = useState(false);

  const contratosEntregues = (contratos || []).filter(c => c.statusEntrega === "Entregue");
  const contratoAtual = contratos.find(c => c.id === bem.contratoId);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function salvar() {
    const placa = String(form.placa || "").trim();
    if (!placa) return alert("Informe a placa de tombamento.");
    if (!/^\d+$/.test(placa)) return alert("A placa deve conter apenas números.");
    const dup = (bens || []).some(x => x.id !== bem.id && String(x.placa) === placa);
    if (dup) return alert(`Já existe um bem com a placa ${placa}.`);

    const payload = {
      contratoId: form.contratoId || null,
      numeroNF: form.numeroNF.trim() || null,
      dataNF: form.dataNF || null,
      placa,
      dataEntrada: form.dataEntrada || null,
      situacao: form.situacao,
      departamentoId: form.situacao === "transferido" ? (form.departamentoId || null) : null
    };
    if (form.situacao === "transferido" && !form.departamentoId) {
      return alert("Para a situação 'transferido', informe o departamento de destino.");
    }

    setSalvando(true);
    try {
      await base44.entities.BemPatrimonial.update(bem.id, payload);
      // consistência: atualiza o bemId (placa) nas movimentações de entrada associadas
      if (placa !== String(bem.placa)) {
        try {
          await base44.entities.MovimentacaoEstoque.updateMany(
            { bemId: String(bem.placa), tipo: "entrada" },
            { $set: { bemId: placa } }
          );
        } catch (_) { /* não bloqueia a edição se falhar */ }
      }
      onClose(true);
    } catch (e) {
      alert("Erro ao salvar: " + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal sobre={item?.categoria || "Estoque"} titulo={`Editar registro · placa ${bem.placa}`} onClose={() => onClose(false)}
      footer={<><Btn onClick={() => onClose(false)}>Cancelar</Btn><Btn variant="forte" onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar alterações"}</Btn></>}>
      {item && (
        <div className="mb-4 border-l-[3px] border-amber-700 bg-amber-50/60 px-3 py-2.5 rounded-r-sm">
          <p className="font-sans text-[13px] font-semibold text-amber-900">{item.objeto}</p>
          <p className="font-mono text-[11px] text-amber-800 mt-0.5">CATMAT {item.catmat || "—"} · {item.unidade || "UNIDADE"}</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Campo label="Contrato de origem" className="md:col-span-2">
          <select className={inputCls} value={form.contratoId} onChange={e => set("contratoId", e.target.value)}>
            <option value="">{contratoAtual && !contratosEntregues.find(c => c.id === contratoAtual.id) ? `${contratoAtual.numero} (não entregue)` : "Selecione o contrato entregue"}</option>
            {contratosEntregues.map(c => (
              <option key={c.id} value={c.id}>{c.numero}{c.fornecedor ? ` — ${c.fornecedor}` : ""}</option>
            ))}
          </select>
        </Campo>

        <Campo label="Número da nota fiscal">
          <input className={inputCls} value={form.numeroNF} onChange={e => set("numeroNF", e.target.value)} placeholder="Ex.: 000.123" />
        </Campo>
        <Campo label="Emissão da NF">
          <input type="date" className={inputCls} value={form.dataNF} onChange={e => set("dataNF", e.target.value)} />
        </Campo>

        <Campo label="Placa de tombamento" ajuda="Apenas números. Não pode duplicar uma placa existente.">
          <input inputMode="numeric" className={inputCls} value={form.placa}
            onChange={e => set("placa", e.target.value.replace(/\D/g, ""))} />
        </Campo>
        <Campo label="Data de entrada no estoque">
          <input type="date" className={inputCls} value={form.dataEntrada} onChange={e => set("dataEntrada", e.target.value)} />
        </Campo>

        <Campo label="Situação">
          <select className={inputCls} value={form.situacao} onChange={e => set("situacao", e.target.value)}>
            <option value="em estoque">Em estoque</option>
            <option value="transferido">Transferido</option>
          </select>
        </Campo>
        <Campo label="Departamento de destino" ajuda="Obrigatório quando a situação for 'transferido'.">
          <select className={inputCls} value={form.departamentoId} onChange={e => set("departamentoId", e.target.value)} disabled={form.situacao !== "transferido"}>
            <option value="">Selecione o departamento</option>
            {optgroupsDepartamentos(departamentos).map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map(d => <option key={d.id} value={d.id}>{d.sigla ? d.sigla + " — " : ""}{d.nome}</option>)}
              </optgroup>
            ))}
          </select>
        </Campo>
      </div>
    </Modal>
  );
}