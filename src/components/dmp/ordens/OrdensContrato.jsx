import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Btn, MiniBtn, Th } from "../ui";
import { fmtM, fmtQ, fmtData, saldoContrato, ordensDe, valorOrdem } from "@/lib/dmp-utils";
import { textoEmailOrdem } from "@/lib/email-ordem";
import { usePodeEditar } from "@/lib/permissoes";
import { Plus, Printer, Mail, ClipboardCheck } from "lucide-react";
import FormOrdem from "./FormOrdem";
import OrdemDocumento from "./OrdemDocumento";
import AcompanhamentoOrdem from "./AcompanhamentoOrdem";

export default function OrdensContrato({ c, data, refresh }) {
  const podeEditar = usePodeEditar();
  const [nova, setNova] = useState(false);
  const [ver, setVer] = useState(null);
  const [acomp, setAcomp] = useState(null);
  const linhas = saldoContrato(c, data.ordens);
  const ordens = ordensDe(c.id, data.ordens).slice().sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

  async function excluir(o) {
    if (!confirm(`Excluir esta ordem de fornecimento de ${fmtData(o.data)}? As quantidades voltam para o saldo do contrato.`)) return;
    await base44.entities.OrdemFornecimento.delete(o.id);
    await refresh();
  }

  async function copiarEmail(o) {
    const texto = textoEmailOrdem(o, c, data);
    try {
      await navigator.clipboard.writeText(texto);
      alert("Texto de e-mail copiado. Cole na mensagem do seu e-mail.");
    } catch {
      alert(texto);
    }
  }

  return (
    <div>
      <div className="flex items-end gap-3 flex-wrap mb-2.5">
        <div>
          <h4 className="font-sans font-semibold text-[10px] font-bold tracking-widest uppercase text-slate-500">Saldo do contrato e ordens de fornecimento</h4>
          <p className="font-sans text-[11.5px] text-slate-500 mt-0.5">Saldo por item = quantidade contratada menos o que já foi solicitado em ordens emitidas.</p>
        </div>
        {podeEditar && (
          <div className="ml-auto">
            <Btn variant="forte" onClick={() => setNova(true)} className="!px-2.5 !py-1.5 !text-[11.5px]">
              <Plus className="w-3.5 h-3.5 inline mr-1" />Emitir ordem de fornecimento
            </Btn>
          </div>
        )}
      </div>

      {linhas.length === 0 ? (
        <p className="font-sans text-sm text-slate-500">Este contrato não tem itens lançados.</p>
      ) : (
        <div className="overflow-x-auto border border-slate-300 rounded-sm">
          <table className="w-full border-collapse text-[13.5px] min-w-[560px]">
            <thead><tr className="bg-stone-50">
              <Th>Item</Th>
              <Th className="text-right">Contratado</Th>
              <Th className="text-right">Solicitado</Th>
              <Th className="text-right">Saldo</Th>
            </tr></thead>
            <tbody>
              {linhas.map(l => {
                const b = data.catalog.find(x => x.id === l.benId) || { objeto: "(item removido)", unidade: "—" };
                return (
                  <tr key={l.benId} className="border-b border-slate-100 hover:bg-stone-50">
                    <td className="px-3 py-2.5">
                      <span className="font-sans font-semibold text-[12.8px] text-slate-800">{b.objeto}</span><br />
                      <span className="font-mono text-xs text-slate-600">{b.unidade}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(l.contratado)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(l.solicitado)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono text-sm ${l.saldo === 0 ? "text-red-800 font-semibold" : ""}`}>{fmtQ(l.saldo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ordens.length > 0 && (
        <>
          <p className="font-mono text-[10.5px] text-slate-500 mt-3 mb-2">{ordens.length} ordem(ns) de fornecimento emitida(s)</p>
          <div className="overflow-x-auto border border-slate-300 rounded-sm">
            <table className="w-full border-collapse text-[13.5px] min-w-[680px]">
              <thead><tr className="bg-stone-50">
                <Th>Emissão</Th><Th>Confirmação</Th><Th>Limite de entrega</Th><Th>Prazo</Th>
                <Th className="text-right">Valor</Th><Th></Th>
              </tr></thead>
              <tbody>
                {ordens.map(o => (
                  <tr key={o.id} className="border-b border-slate-100 hover:bg-stone-50">
                    <td className="px-3 py-2.5 font-mono text-xs">{fmtData(o.data)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{fmtData(o.dataConfirmacao)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{fmtData(o.dataLimiteEntrega)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{o.prazoEntrega || "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">R$ {fmtM(valorOrdem(o))}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <MiniBtn onClick={() => setVer(o)}><Printer className="w-3 h-3 inline mr-1" />Documento</MiniBtn>{" "}
                      <MiniBtn onClick={() => setAcomp(o)}><ClipboardCheck className="w-3 h-3 inline mr-1" />Acompanhamento</MiniBtn>{" "}
                      <MiniBtn onClick={() => copiarEmail(o)}><Mail className="w-3 h-3 inline mr-1" />Texto de e-mail</MiniBtn>{" "}
                      {podeEditar && <MiniBtn variant="risco" onClick={() => excluir(o)}>Excluir</MiniBtn>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {nova && <FormOrdem c={c} data={data} refresh={refresh} onClose={() => setNova(false)} onSalvo={(o) => { setNova(false); setVer(o); }} />}
      {ver && <OrdemDocumento o={data.ordens.find(x => x.id === ver.id) || ver} c={c} data={data} onClose={() => setVer(null)} />}
      {acomp && <AcompanhamentoOrdem o={data.ordens.find(x => x.id === acomp.id) || acomp} c={c} refresh={refresh} onClose={() => setAcomp(null)} />}
    </div>
  );
}