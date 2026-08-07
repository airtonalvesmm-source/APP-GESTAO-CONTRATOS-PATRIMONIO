import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { fmtM, baixarCSV } from "@/lib/dmp-utils";
import { Btn, MiniBtn, Campo, Vazio, inputCls, Modal } from "./ui";
import { TelaCab } from "./Catalogo";
import ImportarCSV from "./ImportarCSV";
import { valorEmpenhado } from "@/lib/dmp-utils";
import { Plus } from "lucide-react";

export default function Fornecedores({ data, refresh }) {
  const { fornecedores, atas, contratos, ocorrencias } = data;
  const [editId, setEditId] = useState(null);
  const [novo, setNovo] = useState(false);

  async function excluir(f) {
    const usos = [];
    atas.forEach(a => { if (a.fornecedorId === f.id) usos.push("ata " + a.numero); });
    contratos.forEach(c => { if (c.fornecedorId === f.id) usos.push(c.tipo + " " + c.numero); });
    if (usos.length) return alert("Fornecedor vinculado a: " + usos.join(", ") + ".");
    if (!confirm("Excluir este fornecedor?")) return;
    await base44.entities.Fornecedor.delete(f.id);
    await refresh();
  }

  function exportCSV() {
    if (!fornecedores.length) return alert("Não há fornecedores cadastrados.");
    const l = [["Razão social", "CNPJ", "Atas", "Contratos", "Valor contratado (R$)"]];
    fornecedores.forEach(f => {
      const atasN = atas.filter(a => a.fornecedorId === f.id).length;
      const cts = contratos.filter(c => c.fornecedorId === f.id);
      const valor = cts.reduce((t, c) => t + valorEmpenhado(c, ocorrencias), 0);
      l.push([f.razao, f.cnpj || "", atasN, cts.length, fmtM(valor)]);
    });
    baixarCSV("fornecedores.csv", l);
  }

  return (
    <div>
      <TelaCab titulo="Fornecedores" desc="Razão social e CNPJ usados nas atas e nos contratos."
        direita={<>
          <Btn onClick={exportCSV}>Baixar CSV</Btn>
          <ImportarCSV entityName="Fornecedor" refresh={refresh}
            colunas={[
              { header: "Razão social", campo: "razao", obrigatorio: true },
              { header: "CNPJ", campo: "cnpj" }
            ]}
            ajuda="Cadastre fornecedores em lote. A razão social é obrigatória; o CNPJ é opcional." />
          <Btn variant="forte" onClick={() => setNovo(true)}><Plus className="w-4 h-4 inline mr-1" />Cadastrar fornecedor</Btn>
        </>} />

      {fornecedores.length === 0 ? (
        <Vazio titulo="Nenhum fornecedor cadastrado" texto="O cadastro também é criado ao registrar uma ata com fornecedor novo." />
      ) : (
        <div className="overflow-x-auto border border-slate-300 rounded-sm bg-white">
          <table className="w-full border-collapse text-[13.5px] min-w-[680px]">
            <thead>
              <tr className="bg-stone-50">
                <Th>Razão social</Th><Th>CNPJ</Th>
                <Th className="text-right">Atas</Th><Th className="text-right">Contratos</Th>
                <Th className="text-right">Valor contratado (R$)</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {fornecedores.map(f => {
                const atasN = atas.filter(a => a.fornecedorId === f.id).length;
                const cts = contratos.filter(c => c.fornecedorId === f.id);
                const valor = cts.reduce((t, c) => t + valorEmpenhado(c, ocorrencias), 0);
                return (
                  <tr key={f.id} className="border-b border-slate-100 hover:bg-stone-50">
                    <td className="px-3 py-2.5 font-sans font-semibold text-slate-800">{f.razao}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{f.cnpj || "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{atasN}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{cts.length}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(valor)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <MiniBtn onClick={() => setEditId(f.id)}>Editar</MiniBtn>{" "}
                      <MiniBtn variant="risco" onClick={() => excluir(f)}>Excluir</MiniBtn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(novo || editId) && (
        <FormFornecedor f={editId ? fornecedores.find(x => x.id === editId) : null} refresh={refresh} onClose={() => { setNovo(false); setEditId(null); }} />
      )}
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`font-sans text-[9.5px] tracking-widest uppercase text-slate-500 text-left border-b border-slate-300 px-3 py-2.5 bg-stone-50 whitespace-nowrap ${className}`}>{children}</th>;
}

function FormFornecedor({ f, refresh, onClose }) {
  const [razao, setRazao] = useState(f?.razao || "");
  const [cnpj, setCnpj] = useState(f?.cnpj || "");

  async function salvar() {
    if (!razao.trim()) return alert("Informe a razão social.");
    if (f) await base44.entities.Fornecedor.update(f.id, { razao: razao.trim(), cnpj: cnpj.trim() });
    else await base44.entities.Fornecedor.create({ razao: razao.trim(), cnpj: cnpj.trim() });
    await refresh();
    onClose();
    alert(f ? "Fornecedor atualizado." : "Fornecedor cadastrado.");
  }

  return (
    <Modal sobre="Fornecedores" titulo={f ? "Editar fornecedor" : "Cadastrar fornecedor"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar</Btn></>}>
      <div className="grid gap-3 md:grid-cols-2">
        <Campo label="Razão social"><input className={inputCls} value={razao} onChange={e => setRazao(e.target.value)} /></Campo>
        <Campo label="CNPJ"><input className={inputCls} value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" /></Campo>
      </div>
    </Modal>
  );
}