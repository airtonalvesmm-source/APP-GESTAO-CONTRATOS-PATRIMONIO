import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { isoData, hoje } from "@/lib/dmp-utils";
import { Modal, Btn, Campo, Vazio, inputCls, textareaCls } from "../ui";
import BuscarDepartamento from "./BuscarDepartamento";

// Mini-modal de saída contextual: transfere um conjunto de unidades (ids) de
// BemPatrimonial para um departamento de destino. Reusa a mesma lógica de
// bulkUpdate + MovimentacaoEstoque do FormSaida, mas parte de uma seleção
// já feita no DetalheBem — pede só destino e observação.
export default function SaidaSelecionados({ unidades, departamentos, refresh, onClose }) {
  const [depId, setDepId] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  const alvo = (unidades || []).filter(u => u.situacao === "em estoque");

  async function confirmar() {
    if (alvo.length === 0) return alert("Nenhuma unidade em estoque selecionada.");
    if (!depId) return alert("Escolha o departamento de destino.");
    const dep = departamentos.find(d => d.id === depId);
    if (!confirm(`Transferir ${alvo.length} bem(ns) para ${dep.sigla ? dep.sigla + " — " : ""}${dep.nome}? Eles sairão do saldo de estoque.`)) return;
    setSalvando(true);
    try {
      const hojeIso = isoData(hoje());
      await base44.entities.BemPatrimonial.bulkUpdate(
        alvo.map(u => ({ id: u.id, situacao: "transferido", departamentoId: depId, dataSaida: hojeIso }))
      );
      const movs = alvo.map(u => ({
        bemId: u.placa || u.id,
        tipo: "saida",
        departamentoId: depId,
        data: hojeIso,
        observacao: obs.trim() || `Saída para ${dep.nome}`
      }));
      for (let i = 0; i < movs.length; i += 100) {
        await base44.entities.MovimentacaoEstoque.bulkCreate(movs.slice(i, i + 100));
      }
      await refresh();
      onClose();
      alert(`${alvo.length} bem(ns) transferido(s) para ${dep.nome}.`);
    } catch (e) {
      alert("Erro ao transferir: " + (e.message || e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal sobre="Estoque" titulo={`Dar saída de ${alvo.length} bem(ns)`} onClose={onClose}
      footer={<>
        <Btn onClick={onClose} disabled={salvando}>Cancelar</Btn>
        <Btn variant="forte" onClick={confirmar} disabled={alvo.length === 0 || !depId || salvando}>
          {salvando ? "Transferindo…" : `Transferir ${alvo.length > 0 ? `${alvo.length} bem(ns)` : ""}`}
        </Btn>
      </>}>
      {departamentos.length === 0 ? (
        <Vazio titulo="Sem departamentos cadastrados" texto="Importe os departamentos antes de dar saída dos bens." />
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <Campo label="Departamento de destino">
            <BuscarDepartamento departamentos={departamentos} value={depId} onChange={setDepId} />
          </Campo>
          <Campo label="Observação (opcional)" ajuda="Ex.: processo, ofício ou justificativa da destinação.">
            <input className={inputCls} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex.: Ofício nº 12/2026" />
          </Campo>
        </div>
      )}
    </Modal>
  );
}