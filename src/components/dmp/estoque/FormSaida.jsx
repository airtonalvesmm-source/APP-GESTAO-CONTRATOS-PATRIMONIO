import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { norm, isoData, hoje } from "@/lib/dmp-utils";
import { optgroupsDepartamentos } from "@/lib/departamentos";
import { Modal, Btn, Campo, Vazio, inputCls, textareaCls } from "../ui";
import { Check, Search } from "lucide-react";

export default function FormSaida({ data, refresh, onClose }) {
  const { catalog, contratos, departamentos, bens } = data;
  const [termo, setTermo] = useState("");
  const [sel, setSel] = useState(new Set());
  const [depId, setDepId] = useState("");
  const [obs, setObs] = useState("");

  const disponiveis = useMemo(() => (bens || []).filter(u => u.situacao === "em estoque"), [bens]);

  const filtrados = useMemo(() => {
    const t = norm(termo.trim());
    return disponiveis.filter(u => {
      const b = catalog.find(x => x.id === u.benId) || {};
      const c = contratos.find(x => x.id === u.contratoId) || {};
      if (!t) return true;
      return norm(u.placa).includes(t) || norm(b.objeto).includes(t) || String(b.catmat).includes(t) || norm(c.numero).includes(t);
    }).slice().sort((a, c) => norm(a.placa).localeCompare(c.placa, "pt-BR", { numeric: true }));
  }, [disponiveis, termo, catalog, contratos]);

  function toggle(id) { setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleAll() {
    setSel(s => {
      if (s.size === filtrados.length) return new Set();
      return new Set(filtrados.map(u => u.id));
    });
  }

  async function confirmar() {
    if (sel.size === 0) return alert("Selecione ao menos um bem para dar saída.");
    if (!depId) return alert("Escolha o departamento de destino.");
    const dep = departamentos.find(d => d.id === depId);
    if (!confirm(`Transferir ${sel.size} bem(ns) definitivamente para ${dep.sigla ? dep.sigla + " — " : ""}${dep.nome}? Eles sairão do saldo de estoque.`)) return;
    const ids = Array.from(sel);
    const hojeIso = isoData(hoje());
    await base44.entities.BemPatrimonial.bulkUpdate(ids.map(id => ({ id, situacao: "transferido", departamentoId: depId, dataSaida: hojeIso })));
    const movs = ids.map(id => {
      const u = bens.find(x => x.id === id);
      return { bemId: u?.placa || id, tipo: "saida", departamentoId: depId, data: hojeIso, observacao: obs.trim() || `Saída para ${dep.nome}` };
    });
    for (let i = 0; i < movs.length; i += 100) {
      await base44.entities.MovimentacaoEstoque.bulkCreate(movs.slice(i, i + 100));
    }
    await refresh();
    onClose();
    alert(`${ids.length} bem(ns) transferido(s) para ${dep.nome}.`);
  }

  return (
    <Modal sobre="Estoque" titulo="Dar saída de bens" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={confirmar} disabled={sel.size === 0 || !depId}>Transferir {sel.size > 0 ? `${sel.size} bem(ns)` : ""}</Btn></>}>
      {departamentos.length === 0 ? (
        <Vazio titulo="Sem departamentos cadastrados" texto="Importe os departamentos antes de dar saída dos bens." />
      ) : (
        <>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] mb-4">
            <Campo label="Departamento de destino">
              <select className={inputCls} value={depId} onChange={e => setDepId(e.target.value)}>
                <option value="">Selecione o departamento</option>
                {optgroupsDepartamentos(departamentos).map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.items.map(d => <option key={d.id} value={d.id}>{d.sigla ? d.sigla + " — " : ""}{d.nome}</option>)}
                  </optgroup>
                ))}
              </select>
            </Campo>
            <Campo label="Observação (opcional)" ajuda="Ex.: processo, ofício ou justificativa da destinação.">
              <input className={inputCls} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex.: Ofício nº 12/2026" />
            </Campo>
          </div>

          <div className="flex gap-2 items-center mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input type="search" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Buscar por placa, bem, CATMAT ou contrato"
                className="border border-slate-300 rounded-sm pl-8 pr-3 py-2 font-sans text-sm bg-white w-full" />
            </div>
            <button onClick={toggleAll} className="border border-slate-300 bg-white rounded-sm px-3 py-2 font-sans font-semibold text-[12.5px] text-slate-700 hover:border-slate-500 cursor-pointer">
              {sel.size === filtrados.length && filtrados.length > 0 ? "Limpar seleção" : "Selecionar todos"}
            </button>
            <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500">{sel.size} selecionado{sel.size === 1 ? "" : "s"} · {disponiveis.length} em estoque</span>
          </div>

          {filtrados.length === 0 ? (
            <Vazio titulo="Nenhum bem em estoque" texto="Não há bens disponíveis para saída com o filtro atual." />
          ) : (
            <div className="border border-slate-300 rounded-sm max-h-[44vh] overflow-auto">
              <table className="w-full border-collapse text-[13px] min-w-[560px]">
                <thead className="sticky top-0"><tr className="bg-stone-50">
                  <th className="w-8 px-2.5 py-2"></th>
                  <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Placa</th>
                  <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Bem</th>
                  <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Contrato</th>
                  <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Entrada</th>
                </tr></thead>
                <tbody>
                  {filtrados.map(u => {
                    const b = catalog.find(x => x.id === u.benId) || {};
                    const c = contratos.find(x => x.id === u.contratoId) || {};
                    const on = sel.has(u.id);
                    return (
                      <tr key={u.id} onClick={() => toggle(u.id)} className={`border-t border-slate-100 cursor-pointer ${on ? "bg-amber-50/60" : "hover:bg-stone-50"}`}>
                        <td className="px-2.5 py-2 text-center">
                          <span className={`inline-flex w-5 h-5 rounded border-2 items-center justify-center transition-colors ${on ? "bg-amber-700 border-amber-700 text-white" : "bg-white border-slate-400"}`}>
                            {on && <Check className="w-3 h-3" />}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 font-mono font-semibold text-slate-800">{u.placa}</td>
                        <td className="px-2.5 py-2 font-sans text-[12.5px] text-slate-700">{b.objeto || "—"}</td>
                        <td className="px-2.5 py-2 font-sans text-[12.5px] text-slate-600">{c.numero || "—"}</td>
                        <td className="px-2.5 py-2 font-mono text-[12px] text-slate-500">{u.dataEntrada || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}