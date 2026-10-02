import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { fmtData, fmtQ, norm } from "@/lib/dmp-utils";
import { caminhoDepartamento } from "@/lib/departamentos";
import { Modal, Btn, Plaqueta, Vazio, Pill, inputCls, textareaCls } from "../ui";
import { Desenho } from "../Desenho";
import { Check, X } from "lucide-react";

export default function DetalheBem({ benId, data, refresh, onClose }) {
  const { catalog, contratos, departamentos, bens, movimentacoes } = data;
  const b = catalog.find(x => x.id === benId);
  const [sel, setSel] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [salvando, setSalvando] = useState(false);

  const unidades = useMemo(() => (bens || []).filter(u => u.benId === benId).slice().sort((a, c) => norm(a.placa).localeCompare(c.placa, "pt-BR", { numeric: true })), [bens, benId]);
  const movs = useMemo(() => {
    const ids = new Set(unidades.map(u => u.placa));
    return (movimentacoes || []).filter(m => ids.has(m.bemId)).slice().sort((a, c) => String(c.data || "").localeCompare(String(a.data || "")));
  }, [movimentacoes, unidades]);

  useEffect(() => {
    const u = unidades.find(x => x.id === sel);
    setEditVal(u ? String(u.placa) : "");
  }, [sel, unidades]);

  async function salvarPlaca(u) {
    const v = String(editVal ?? "").trim();
    if (!v) return alert("Informe a placa.");
    if (!/^\d+$/.test(v)) return alert("A placa deve conter apenas números.");
    if ((bens || []).some(x => x.id !== u.id && String(x.placa) === v)) return alert(`Já existe um bem com a placa ${v}.`);
    setSalvando(true);
    try {
      await base44.entities.BemPatrimonial.update(u.id, { placa: v });
      setSel(null);
      if (refresh) await refresh();
    } catch (e) {
      alert("Erro ao salvar a placa: " + (e.message || e));
    } finally {
      setSalvando(false);
    }
  }

  if (!b) return <Modal titulo="Bem não encontrado" onClose={onClose}><Vazio titulo="Item removido" texto="Este item não existe mais no catálogo." /></Modal>;

  const disp = unidades.filter(u => u.situacao === "em estoque").length;

  return (
    <Modal sobre={b.categoria} titulo={b.objeto} onClose={onClose}
      footer={<Btn variant="forte" onClick={onClose}>Fechar</Btn>}>
      <div className="grid gap-5 md:grid-cols-[290px_minmax(0,1fr)]">
        <div>
          <div className="aspect-[4/3] border border-slate-300 rounded-sm overflow-hidden bg-[repeating-linear-gradient(45deg,#F4F6F2_0_6px,#EDF0EB_6px_12px)] flex items-center justify-center text-stone-500">
            {b.imagem ? <img src={b.imagem} alt={b.objeto} className="w-full h-full object-cover" /> : <Desenho arte={b.arte} />}
          </div>
          <div className="mt-3">
            <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">Identificação</h4>
            <Plaqueta pdm={b.pdm} catmat={b.catmat} />
            <div className="flex gap-2 flex-wrap mt-2">
              <span className="inline-flex items-center font-mono text-[9.5px] tracking-wider uppercase px-2 py-0.5 rounded-sm border border-slate-300 bg-slate-50 text-slate-600">Unidade: {b.unidade}</span>
              {b.subcategoria && <span className="inline-flex items-center font-mono text-[9.5px] tracking-wider uppercase px-2 py-0.5 rounded-sm border border-amber-300 bg-amber-50 text-amber-800">{b.subcategoria}</span>}
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">Resumo do estoque</h4>
            <div className="flex gap-2 flex-wrap">
              <Pill tipo={disp > 0 ? "ok" : "neutro"}>{disp} em estoque</Pill>
              <Pill tipo={unidades.length - disp > 0 ? "aviso" : "neutro"}>{unidades.length - disp} transferido{unidades.length - disp === 1 ? "" : "s"}</Pill>
              <Pill tipo="neutro">{unidades.length} total</Pill>
            </div>
          </div>
        </div>
        <div>
          <div className="mb-5">
            <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">Aplicação</h4>
            <p className="border-l-[3px] border-amber-700 bg-amber-50/60 px-3 py-2.5 text-sm text-amber-900 rounded-r-sm">{b.aplicacao}</p>
          </div>
          <div className="mb-5">
            <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">Especificação técnica</h4>
            <p className="font-sans text-[13.5px] text-slate-700 whitespace-pre-wrap leading-relaxed">{b.descricao || "—"}</p>
          </div>
          <div className="mb-5">
            <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">Unidades patrimoniadas</h4>
            {unidades.length > 0 && <p className="font-sans text-[11.5px] text-slate-500 mb-2">Clique em uma unidade para editar a placa de tombamento.</p>}
            {unidades.length === 0 ? (
              <Vazio titulo="Sem unidades" texto="Nenhum bem patrimoniado deste tipo." />
            ) : (
              <div className="overflow-x-auto border border-slate-300 rounded-sm">
                <table className="w-full border-collapse text-[13px] min-w-[620px]">
                  <thead><tr className="bg-stone-50">
                    <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Placa</th>
                    <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Contrato</th>
                    <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Nota fiscal</th>
                    <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Emissão</th>
                    <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Situação</th>
                    <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Destino</th>
                  </tr></thead>
                  <tbody>
                    {unidades.map(u => {
                      const c = contratos.find(x => x.id === u.contratoId) || {};
                      const d = departamentos.find(x => x.id === u.departamentoId);
                      return (
                        <tr key={u.id} className="border-t border-slate-100 hover:bg-stone-50 cursor-pointer" onClick={() => setSel(s => s === u.id ? null : u.id)}>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                            {sel === u.id ? (
                              <div className="flex gap-1 items-center" onClick={e => e.stopPropagation()}>
                                <input autoFocus type="text" inputMode="numeric" className={`${inputCls} w-24`} value={editVal} disabled={salvando}
                                  onChange={e => setEditVal(e.target.value.replace(/\D/g, ""))}
                                  onKeyDown={e => { if (e.key === "Enter") salvarPlaca(u); if (e.key === "Escape") setSel(null); }} />
                                <button onClick={() => salvarPlaca(u)} disabled={salvando} className="text-emerald-700 hover:text-emerald-800 disabled:opacity-50" title="Salvar placa"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setSel(null)} disabled={salvando} className="text-slate-400 hover:text-slate-600 disabled:opacity-50" title="Cancelar"><X className="w-4 h-4" /></button>
                              </div>
                            ) : u.placa}
                          </td>
                          <td className="px-3 py-2 font-sans text-[12.5px]">{c.numero || "—"}</td>
                          <td className="px-3 py-2 font-sans text-[12.5px]">{u.numeroNF || "—"}</td>
                          <td className="px-3 py-2 font-mono text-[12px]">{fmtData(u.dataNF)}</td>
                          <td className="px-3 py-2"><Pill tipo={u.situacao === "em estoque" ? "ok" : "neutro"}>{u.situacao}</Pill></td>
                          <td className="px-3 py-2 font-sans text-[12.5px]">{d ? caminhoDepartamento(d, departamentos) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {movs.length > 0 && (
            <div>
              <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">Histórico de movimentações</h4>
              <ul className="border border-slate-300 rounded-sm divide-y divide-slate-100">
                {movs.map((m, i) => {
                  const d = departamentos.find(x => x.id === m.departamentoId);
                  return (
                    <li key={i} className="px-3 py-2 flex gap-3 items-center flex-wrap text-[12.5px]">
                      <Pill tipo={m.tipo === "entrada" ? "ok" : "aviso"}>{m.tipo}</Pill>
                      <span className="font-mono text-slate-700">Placa {m.bemId}</span>
                      <span className="font-mono text-slate-500">{fmtData(m.data)}</span>
                      {d && <span className="font-sans text-slate-600">→ {d.sigla ? d.sigla + " — " : ""}{d.nome}</span>}
                      {m.observacao && <span className="font-sans text-slate-500 italic">{m.observacao}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}