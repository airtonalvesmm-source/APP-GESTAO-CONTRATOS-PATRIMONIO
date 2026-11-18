import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Btn, MiniBtn, Th } from "../ui";
import { fmtData, termosDe } from "@/lib/dmp-utils";
import { usePodeEditar } from "@/lib/permissoes";
import { Plus, Printer } from "lucide-react";
import FormTermo from "./FormTermo";
import TermoDocumento from "./TermoDocumento";

export default function TermosContrato({ c, data, refresh }) {
  const podeEditar = usePodeEditar();
  const [novo, setNovo] = useState(false);
  const [ver, setVer] = useState(null);
  const termos = termosDe(c.id, data.termos).slice().sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")));

  async function excluir(t) {
    if (!confirm("Excluir este termo de recebimento?")) return;
    await base44.entities.TermoRecebimento.delete(t.id);
    await refresh();
  }

  function resumoNotas(t) {
    return (t.pagamentoIds || []).map(id => (data.pagamentos || []).find(p => p.id === id)?.nf).filter(Boolean).join(", ") || "—";
  }

  return (
    <div>
      <div className="flex items-end gap-3 flex-wrap mb-2.5">
        <div>
          <h4 className="font-sans font-semibold text-[10px] font-bold tracking-widest uppercase text-slate-500">Termos de recebimento</h4>
          <p className="font-sans text-[11.5px] text-slate-500 mt-0.5">Termo circunstanciado de recebimento (Lei nº 14.133/2021) das notas fiscais selecionadas.</p>
        </div>
        {podeEditar && (
          <div className="ml-auto">
            <Btn variant="forte" onClick={() => setNovo(true)} className="!px-2.5 !py-1.5 !text-[11.5px]">
              <Plus className="w-3.5 h-3.5 inline mr-1" />Emitir termo de recebimento
            </Btn>
          </div>
        )}
      </div>

      {termos.length === 0 ? (
        <p className="font-sans text-sm text-slate-500">Nenhum termo emitido para este contrato.</p>
      ) : (
        <div className="overflow-x-auto border border-slate-300 rounded-sm">
          <table className="w-full border-collapse text-[13.5px] min-w-[560px]">
            <thead><tr className="bg-stone-50">
              <Th>Notas fiscais</Th><Th>Provisório</Th><Th>Definitivo</Th><Th></Th>
            </tr></thead>
            <tbody>
              {termos.map(t => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-stone-50">
                  <td className="px-3 py-2.5 font-mono text-xs">{resumoNotas(t)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{fmtData(t.dataRecebimentoProvisorio)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{fmtData(t.dataRecebimentoDefinitivo)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <MiniBtn onClick={() => setVer(t)}><Printer className="w-3 h-3 inline mr-1" />Documento</MiniBtn>{" "}
                    {podeEditar && <MiniBtn variant="risco" onClick={() => excluir(t)}>Excluir</MiniBtn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {novo && <FormTermo c={c} data={data} refresh={refresh} onClose={() => setNovo(false)} onSalvo={(t) => { setNovo(false); setVer(t); }} />}
      {ver && <TermoDocumento t={data.termos.find(x => x.id === ver.id) || ver} c={c} data={data} onClose={() => setVer(null)} />}
    </div>
  );
}