import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { nQtd, fmtData, isoData, hoje, norm } from "@/lib/dmp-utils";
import { saldoLivre } from "@/lib/reservas-utils";
import { caminhoDepartamento } from "@/lib/departamentos";
import { Modal, Btn, Campo, Vazio, Pill, inputCls } from "../ui";
import { Desenho } from "../Desenho";
import { Plus, Search, Bookmark, XCircle, CheckCircle2, Trash2 } from "lucide-react";
import FormReserva from "./FormReserva";

export default function Reservas({ data, refresh }) {
  const { catalog, departamentos, bens, reservas } = data;
  const [termo, setTermo] = useState("");
  const [filtro, setFiltro] = useState("ativa");
  const [criar, setCriar] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [concluindo, setConcluindo] = useState(null);

  const lista = useMemo(() => {
    const t = norm(termo.trim());
    return (reservas || [])
      .filter(r => {
        if (filtro !== "todas" && r.situacao !== filtro) return false;
        if (!t) return true;
        const b = catalog.find(x => x.id === r.benId) || {};
        const d = departamentos.find(x => x.id === r.departamentoId) || {};
        return norm(b.objeto).includes(t) || norm(d.nome).includes(t) || String(r.id).includes(t);
      })
      .slice().sort((a, b) => String(b.data || b.created_date || "").localeCompare(String(a.data || a.created_date || "")));
  }, [reservas, filtro, termo, catalog, departamentos]);

  const totais = useMemo(() => {
    const ativas = (reservas || []).filter(r => r.situacao === "ativa");
    const itens = new Set(ativas.map(r => r.benId)).size;
    const qtd = ativas.reduce((t, r) => t + nQtd(r.quantidade), 0);
    return { ativas: ativas.length, itens, qtd };
  }, [reservas]);

  async function cancelar(r) {
    if (!confirm(`Cancelar a reserva de ${nQtd(r.quantidade)} unidade(s)?\n\nA quantidade volta ao saldo livre e a reserva fica registrada como cancelada.`)) return;
    await base44.entities.Reserva.update(r.id, { situacao: "cancelada", dataCancelamento: isoData(hoje()) });
    await refresh();
  }

  return (
    <div>
      <div className="flex gap-2 items-center flex-wrap mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input type="search" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Buscar por item ou destino"
            className="border border-slate-300 rounded-sm pl-8 pr-3 py-2 font-sans text-sm bg-white w-full" />
        </div>
        <div className="flex gap-1.5">
          {[
            { v: "ativa", l: "Ativas" },
            { v: "atendida", l: "Atendidas" },
            { v: "cancelada", l: "Canceladas" },
            { v: "todas", l: "Todas" }
          ].map(o => (
            <button key={o.v} onClick={() => setFiltro(o.v)} aria-pressed={filtro === o.v}
              className={`border rounded-sm px-3 py-1.5 cursor-pointer font-sans font-semibold text-[12.5px] transition-colors
                ${filtro === o.v ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-slate-500"}`}>
              {o.l}
            </button>
          ))}
        </div>
        <Btn variant="forte" onClick={() => setCriar(true)} disabled={departamentos.length === 0}>
          <Plus className="w-4 h-4 inline mr-1" />Reservar
        </Btn>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] mb-5">
        <div className="border border-slate-300 rounded-sm bg-white px-4 py-3">
          <p className="font-mono text-[9.5px] tracking-widest uppercase text-slate-500">Reservas ativas</p>
          <p className="font-mono font-bold text-2xl text-amber-700 mt-1">{totais.ativas}</p>
        </div>
        <div className="border border-slate-300 rounded-sm bg-white px-4 py-3">
          <p className="font-mono text-[9.5px] tracking-widest uppercase text-slate-500">Itens reservados</p>
          <p className="font-mono font-bold text-2xl text-slate-800 mt-1">{totais.itens}</p>
        </div>
        <div className="border border-slate-300 rounded-sm bg-white px-4 py-3">
          <p className="font-mono text-[9.5px] tracking-widest uppercase text-slate-500">Unidades reservadas</p>
          <p className="font-mono font-bold text-2xl text-slate-800 mt-1">{totais.qtd}</p>
        </div>
      </div>

      {lista.length === 0 ? (
        <Vazio titulo="Nenhuma reserva" texto={filtro === "ativa" ? "Crie uma reserva para separar unidades com destinação definida." : "Não há reservas neste filtro."} />
      ) : (
        <div className="border border-slate-300 rounded-sm overflow-x-auto">
          <table className="w-full border-collapse text-[13px] min-w-[820px]">
            <thead><tr className="bg-stone-50">
              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Item</th>
              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Qtd</th>
              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Destino</th>
              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Data</th>
              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Situação</th>
              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Obs.</th>
              <th className="text-right font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2 w-32">Ações</th>
            </tr></thead>
            <tbody>
              {lista.map(r => {
                const b = catalog.find(x => x.id === r.benId) || {};
                const d = departamentos.find(x => x.id === r.departamentoId);
                return (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-stone-50">
                    <td className="px-3 py-2 font-sans text-[12.5px] text-slate-800">{b.objeto || "—"}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-slate-700">{nQtd(r.quantidade)}</td>
                    <td className="px-3 py-2 font-sans text-[12.5px] text-slate-600">{d ? caminhoDepartamento(d, departamentos) : "—"}</td>
                    <td className="px-3 py-2 font-mono text-[12px] text-slate-500">{fmtData(r.data)}</td>
                    <td className="px-3 py-2"><Pill tipo={r.situacao === "ativa" ? "aviso" : r.situacao === "atendida" ? "ok" : "neutro"}>{r.situacao}</Pill></td>
                    <td className="px-3 py-2 font-sans text-[12px] text-slate-500 max-w-[220px] truncate" title={r.observacao || ""}>{r.observacao || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {r.situacao === "ativa" && (
                        <div className="inline-flex gap-1.5 justify-end">
                          <Btn variant="forte" onClick={() => setConcluindo(r)} className="!px-2 !py-1 !text-[11.5px]"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Concluir</Btn>
                          <Btn variant="risco" onClick={() => cancelar(r)} className="!px-2 !py-1 !text-[11.5px]"><XCircle className="w-3.5 h-3.5 inline mr-1" />Cancelar</Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {criar && <FormReserva data={data} refresh={refresh} onClose={() => setCriar(false)} />}
      {concluindo && <ConcluirReserva reserva={concluindo} data={data} refresh={refresh} onClose={() => setConcluindo(null)} />}
    </div>
  );
}

function ConcluirReserva({ reserva, data, refresh, onClose }) {
  const { catalog, departamentos, bens } = data;
  const item = catalog.find(x => x.id === reserva.benId);
  const dep = departamentos.find(x => x.id === reserva.departamentoId);
  const [obs, setObs] = useState(reserva.observacao || "");
  const [salvando, setSalvando] = useState(false);

  const disp = (bens || []).filter(u => u.benId === reserva.benId && u.situacao === "em estoque")
    .slice().sort((a, b) => norm(a.placa).localeCompare(b.placa, "pt-BR", { numeric: true }));
  const qtd = nQtd(reserva.quantidade);

  async function confirmar() {
    if (disp.length < qtd) return alert(`Há apenas ${disp.length} unidade(s) em estoque para este item. Não é possível concluir a reserva de ${qtd}.`);
    if (!confirm(`Concluir a reserva de ${qtd} unidade(s) de "${item?.objeto}"?\n\nSerá registrada a saída para ${dep?.nome} e as ${qtd} unidades sairão do estoque.`)) return;
    setSalvando(true);
    try {
      const alvos = disp.slice(0, qtd);
      const hojeIso = isoData(hoje());
      await base44.entities.BemPatrimonial.bulkUpdate(
        alvos.map(u => ({ id: u.id, situacao: "transferido", departamentoId: reserva.departamentoId, dataSaida: hojeIso }))
      );
      const movs = alvos.map(u => ({
        bemId: u.placa,
        tipo: "saida",
        departamentoId: reserva.departamentoId,
        data: hojeIso,
        observacao: obs.trim() || `Saída por conclusão de reserva para ${dep?.nome}`
      }));
      for (let i = 0; i < movs.length; i += 100) {
        await base44.entities.MovimentacaoEstoque.bulkCreate(movs.slice(i, i + 100));
      }
      await base44.entities.Reserva.update(reserva.id, { situacao: "atendida", dataConclusao: hojeIso, observacao: obs.trim() || reserva.observacao || null });
      await refresh();
      onClose();
      alert(`${qtd} unidade(s) transferida(s) para ${dep?.nome}. Reserva concluída.`);
    } catch (e) {
      alert("Erro ao concluir reserva: " + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal sobre="Concluir reserva" titulo={`Saída de ${qtd} unidade(s)`} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={confirmar} disabled={salvando}>{salvando ? "Concluindo..." : "Confirmar saída"}</Btn></>}>
      {item && (
        <div className="mb-4 border-l-[3px] border-amber-700 bg-amber-50/60 px-3 py-2.5 rounded-r-sm">
          <p className="font-sans text-[13px] font-semibold text-amber-900">{item.objeto}</p>
          <p className="font-mono text-[11px] text-amber-800 mt-0.5">Destino: {dep ? caminhoDepartamento(dep, departamentos) : "—"}</p>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2 mb-3">
        <Campo label="Quantidade da reserva"><input className={inputCls} value={qtd} disabled /></Campo>
        <Campo label="Disponível em estoque" ajuda={disp.length < qtd ? "Saldo insuficiente para concluir a reserva." : undefined}>
          <input className={inputCls} value={disp.length} disabled />
        </Campo>
      </div>
      {disp.length > 0 && disp.length >= qtd && (
        <div className="mb-3">
          <p className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-1.5">Placas que serão transferidas</p>
          <div className="flex gap-1.5 flex-wrap">
            {disp.slice(0, qtd).map(u => (
              <span key={u.id} className="font-mono text-[11.5px] px-2 py-0.5 rounded-sm border border-slate-300 bg-slate-50 text-slate-700">{u.placa}</span>
            ))}
          </div>
        </div>
      )}
      <Campo label="Observação da saída (opcional)">
        <textarea className={inputCls + " font-serif text-[14.5px] min-h-[60px] resize-y"} value={obs} onChange={e => setObs(e.target.value)} />
      </Campo>
    </Modal>
  );
}