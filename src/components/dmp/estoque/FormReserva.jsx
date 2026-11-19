import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { nQtd, isoData, hoje, norm } from "@/lib/dmp-utils";
import { saldoLivre } from "@/lib/reservas-utils";
import { Modal, Btn, Campo, Vazio, ErrosForm, inputCls, textareaCls } from "../ui";
import { inteiroDe } from "@/lib/validacao";
import { Desenho } from "../Desenho";
import BuscarDepartamento from "./BuscarDepartamento";

export default function FormReserva({ data, refresh, onClose, benIdFixo, reserva: reservaEdicao }) {
  const { catalog, departamentos, bens, reservas } = data;
  const editando = !!reservaEdicao;
  const itensComEstoque = useMemo(
    () => (catalog || []).filter(b => !b.oculto && (bens || []).some(u => u.benId === b.id && u.situacao === "em estoque"))
      .slice().sort((a, b) => a.objeto.localeCompare(b.objeto, "pt-BR")),
    [catalog, bens]
  );

  const [benId, setBenId] = useState(reservaEdicao?.benId || benIdFixo || "");
  const [qtd, setQtd] = useState(reservaEdicao ? String(reservaEdicao.quantidade || "") : "");
  const [depId, setDepId] = useState(reservaEdicao?.departamentoId || "");
  const [obs, setObs] = useState(reservaEdicao?.observacao || "");
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState([]);

  const item = catalog.find(x => x.id === benId);
  // Em edição, a quantidade já reservada deste item volta a ficar disponível.
  const livreBase = benId ? saldoLivre(bens, reservas, benId) : 0;
  const livre = editando && reservaEdicao?.benId === benId ? livreBase + nQtd(reservaEdicao.quantidade) : livreBase;

  async function salvar() {
    const lista = [];
    if (!benId) lista.push("Selecione o item a reservar.");
    if (String(qtd ?? "").trim() === "") lista.push("Quantidade a reservar: campo obrigatório.");
    const q = inteiroDe(qtd);
    if (String(qtd ?? "").trim() !== "" && (Number.isNaN(q) || q <= 0)) lista.push("Quantidade a reservar: informe um número inteiro maior que zero.");
    if (!depId) lista.push("Local de destino: escolha o departamento.");
    if (!Number.isNaN(q) && q > livre) lista.push(`Quantidade acima do saldo livre: há ${livre} unidade(s) disponível(is) para reserva deste item.`);
    if (lista.length) { setErros(lista); return; }
    setErros([]);
    const dep = departamentos.find(d => d.id === depId);
    if (!confirm(`${editando ? "Atualizar" : "Reservar"} ${q} unidade(s) de "${item?.objeto}" para ${dep.sigla ? dep.sigla + " — " : ""}${dep.nome}?`)) return;
    setSalvando(true);
    try {
      if (editando) {
        await base44.entities.Reserva.update(reservaEdicao.id, {
          benId,
          quantidade: q,
          departamentoId: depId,
          observacao: obs.trim() || null
        });
      } else {
        await base44.entities.Reserva.create({
          benId,
          quantidade: q,
          departamentoId: depId,
          situacao: "ativa",
          observacao: obs.trim() || null,
          data: isoData(hoje())
        });
      }
      await refresh();
      onClose();
    } catch (e) {
      alert(`Erro ao ${editando ? "atualizar" : "registrar"} reserva: ` + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal sobre="Estoque" titulo={editando ? "Editar reserva" : "Reservar item"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : editando ? "Salvar alterações" : "Reservar"}</Btn></>}>
      <ErrosForm itens={erros} />
      {departamentos.length === 0 ? (
        <Vazio titulo="Sem departamentos cadastrados" texto="Importe os departamentos antes de reservar itens — eles são o destino de cada reserva." />
      ) : itensComEstoque.length === 0 ? (
        <Vazio titulo="Sem itens em estoque" texto="Não há bens patrimoniados disponíveis para reservar." />
      ) : (
        <>
          <Campo label="Item do catálogo" ajuda={benIdFixo ? "Item fixo definido pelo detalhe aberto." : undefined}>
            <select className={inputCls} value={benId} onChange={e => { setBenId(e.target.value); setQtd(""); }} disabled={!!benIdFixo}>
              <option value="">Selecione o item</option>
              {itensComEstoque.map(b => {
                const disp = (bens || []).filter(u => u.benId === b.id && u.situacao === "em estoque").length;
                const res = (reservas || []).filter(r => r.benId === b.id && r.situacao === "ativa").reduce((t, r) => t + nQtd(r.quantidade), 0);
                return <option key={b.id} value={b.id}>{b.objeto} · {disp - res} livre</option>;
              })}
            </select>
          </Campo>

          {item && (
            <div className="my-3 border-l-[3px] border-amber-700 bg-amber-50/60 px-3 py-2.5 rounded-r-sm flex gap-3 items-center">
              <span className="w-12 h-12 border border-slate-200 rounded-sm overflow-hidden flex-none bg-[repeating-linear-gradient(45deg,#F4F6F2_0_6px,#EDF0EB_6px_12px)] flex items-center justify-center">
                {item.imagem ? <img src={item.imagem} alt="" className="w-full h-full object-cover" /> : <Desenho arte={item.arte} />}
              </span>
              <div className="min-w-0">
                <p className="font-sans text-[13px] font-semibold text-amber-900 truncate">{item.objeto}</p>
                <p className="font-mono text-[11px] text-amber-800">{livre} unidade(s) livre(s) para reserva</p>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Campo label="Quantidade a reservar" ajuda={`Máximo ${livre} unidade(s) livre(s).`}>
              <input inputMode="numeric" className={inputCls} value={qtd}
                onChange={e => setQtd(e.target.value.replace(/[^\d]/g, ""))}
                disabled={!benId} placeholder="Ex.: 2" />
            </Campo>
            <Campo label="Local de destino" ajuda="Departamento que receberá o bem quando a saída for concluída.">
              <BuscarDepartamento departamentos={departamentos} value={depId} onChange={setDepId} />
            </Campo>
          </div>

          <Campo label="Observação (opcional)" className="mt-3">
            <textarea className={textareaCls} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex.: processo, ofício ou justificativa da destinação." />
          </Campo>
        </>
      )}
    </Modal>
  );
}