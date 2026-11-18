import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Modal, Btn, Campo, Th, inputCls, textareaCls } from "../ui";
import { fmtM, fmtQ, nQtd, nVal, saldoContrato, ordensDe, entregaDaAta, anoAtual } from "@/lib/dmp-utils";

export default function FormOrdem({ c, data, refresh, onClose, onSalvo }) {
  const { catalog, atas, ordens } = data;
  const linhas = saldoContrato(c, ordens);
  const entrega = entregaDaAta(c, atas);
  const ano = (c.inicio || "").slice(0, 4) || String(anoAtual);
  const [form, setForm] = useState({
    numero: `${ordensDe(c.id, ordens).length + 1}/${ano}`,
    data: new Date().toISOString().slice(0, 10),
    prazoEntrega: entrega.prazoEntrega,
    localEntrega: entrega.localEntrega,
    observacao: entrega.observacao
  });
  const [qtds, setQtds] = useState(() => Object.fromEntries(linhas.map(l => [l.benId, ""])));

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }
  const total = linhas.reduce((t, l) => t + nQtd(qtds[l.benId]) * nVal(l.valor), 0);

  async function salvar() {
    if (!form.numero.trim()) return alert("Informe o número da ordem de fornecimento.");
    const itens = [];
    for (const l of linhas) {
      const q = nQtd(qtds[l.benId]);
      if (!q) continue;
      const nome = catalog.find(b => b.id === l.benId)?.objeto || "item";
      if (q > l.saldo) return alert(`Quantidade acima do saldo de "${nome}": disponível ${fmtQ(l.saldo)}.`);
      itens.push({ benId: l.benId, qtd: q, valor: nVal(l.valor) });
    }
    if (!itens.length) return alert("Informe a quantidade de ao menos um item.");
    const criado = await base44.entities.OrdemFornecimento.create({
      contratoId: c.id,
      numero: form.numero.trim(),
      data: form.data,
      prazoEntrega: Number(form.prazoEntrega) || 0,
      localEntrega: form.localEntrega.trim(),
      observacao: form.observacao.trim(),
      itens,
      situacao: "emitida"
    });
    await refresh();
    onSalvo?.(criado);
  }

  return (
    <Modal sobre={`${c.tipo} ${c.numero}`} titulo="Emitir ordem de fornecimento" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar e emitir</Btn></>}>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-4">
        <Campo label="Número da ordem"><input className={inputCls} value={form.numero} onChange={e => setF("numero", e.target.value)} /></Campo>
        <Campo label="Data de emissão"><input type="date" className={inputCls} value={form.data} onChange={e => setF("data", e.target.value)} /></Campo>
        <Campo label="Prazo de entrega (dias)" ajuda="Herdado da ata — pode ajustar nesta ordem.">
          <input type="number" min="0" className={inputCls} value={form.prazoEntrega} onChange={e => setF("prazoEntrega", e.target.value)} />
        </Campo>
      </div>
      <div className="mb-4">
        <Campo label="Local de entrega" ajuda="Herdado da ata — pode ajustar nesta ordem.">
          <input className={inputCls} value={form.localEntrega} onChange={e => setF("localEntrega", e.target.value)} />
        </Campo>
      </div>
      <div className="mb-4">
        <Campo label="Observação da entrega">
          <textarea className={textareaCls} value={form.observacao} onChange={e => setF("observacao", e.target.value)} />
        </Campo>
      </div>

      <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mb-2">Itens desta ordem</p>
      {linhas.length === 0 ? (
        <p className="font-sans text-sm text-slate-500">Este contrato não tem itens lançados.</p>
      ) : (
        <div className="overflow-x-auto border border-slate-300 rounded-sm">
          <table className="w-full border-collapse text-[13.5px] min-w-[620px]">
            <thead><tr>
              <Th>Item</Th>
              <Th className="text-right">Contratado</Th>
              <Th className="text-right">Já solicitado</Th>
              <Th className="text-right">Saldo</Th>
              <Th className="text-right">Qtd. desta ordem</Th>
            </tr></thead>
            <tbody>
              {linhas.map(l => {
                const b = catalog.find(x => x.id === l.benId) || { objeto: "(item removido)", unidade: "—" };
                return (
                  <tr key={l.benId} className="border-b border-slate-100">
                    <td className="px-3 py-2.5">
                      <span className="font-sans font-semibold text-[12.8px] text-slate-800">{b.objeto}</span><br />
                      <span className="font-mono text-xs text-slate-600">{b.unidade} · R$ {fmtM(l.valor)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(l.contratado)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(l.solicitado)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono text-sm ${l.saldo === 0 ? "text-red-800" : ""}`}>{fmtQ(l.saldo)}</td>
                    <td className="px-3 py-2.5">
                      <input type="number" min="0" max={l.saldo} disabled={l.saldo === 0}
                        className={inputCls + " text-right disabled:bg-slate-50"}
                        value={qtds[l.benId] || ""} onChange={e => setQtds(q => ({ ...q, [l.benId]: e.target.value }))} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr className="border-t border-slate-300 bg-stone-50">
              <td className="px-3 py-2.5 font-sans font-semibold text-[12.5px]" colSpan={4}>Valor total desta ordem</td>
              <td className="px-3 py-2.5 text-right font-mono font-semibold text-sm">R$ {fmtM(total)}</td>
            </tr></tfoot>
          </table>
        </div>
      )}
    </Modal>
  );
}