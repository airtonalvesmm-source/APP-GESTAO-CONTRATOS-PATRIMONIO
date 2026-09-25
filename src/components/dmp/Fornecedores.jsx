import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { fmtM, baixarCSV, norm, soDigitos, cnpjValido } from "@/lib/dmp-utils";
import { CAT_ARP } from "@/lib/dmp-data";
import { Btn, MiniBtn, Campo, Vazio, inputCls, Modal } from "./ui";
import { TelaCab } from "./Catalogo";
import ImportarCSV from "./ImportarCSV";
import { valorEmpenhado } from "@/lib/dmp-utils";
import { Plus } from "lucide-react";

export default function Fornecedores({ data, refresh }) {
  const { fornecedores, atas, contratos, ocorrencias } = data;
  const [editId, setEditId] = useState(null);
  const [novo, setNovo] = useState(false);
  const [catFiltro, setCatFiltro] = useState("");

  const lista = catFiltro ? fornecedores.filter(f => (f.categoria || "") === catFiltro) : fornecedores;

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
    const l = [["Razão social", "CNPJ", "Categoria", "Atas", "Contratos", "Valor contratado (R$)"]];
    fornecedores.forEach(f => {
      const atasN = atas.filter(a => a.fornecedorId === f.id).length;
      const cts = contratos.filter(c => c.fornecedorId === f.id);
      const valor = cts.reduce((t, c) => t + valorEmpenhado(c, ocorrencias), 0);
      l.push([f.razao, f.cnpj || "", f.categoria || "", atasN, cts.length, fmtM(valor)]);
    });
    baixarCSV("fornecedores.csv", l);
  }

  return (
    <div>
      <TelaCab titulo="Fornecedores" desc="Razão social e CNPJ usados nas atas e nos contratos."
        direita={<>
          <Btn onClick={exportCSV}>Baixar CSV</Btn>
          <ImportarCSV entityName="Fornecedor" refresh={refresh}
            existentes={fornecedores} chave={r => soDigitos(r.cnpj) || norm(r.razao)}
            colunas={[
              { header: "Razão social", campo: "razao", obrigatorio: true },
              { header: "CNPJ", campo: "cnpj" },
              { header: "Categoria", campo: "categoria" }
            ]}
            ajuda="Cadastre fornecedores em lote. A razão social é obrigatória; o CNPJ e a categoria são opcionais. Categoria deve ser: Mobiliário, Segurança, Climatização ou Eletroeletrônicos." />
          <Btn variant="forte" onClick={() => setNovo(true)}><Plus className="w-4 h-4 inline mr-1" />Cadastrar fornecedor</Btn>
        </>} />

      {fornecedores.length === 0 ? (
        <Vazio titulo="Nenhum fornecedor cadastrado" texto="O cadastro também é criado ao registrar uma ata com fornecedor novo." />
      ) : (
        <>
        <div className="flex gap-2.5 items-end flex-wrap mb-4">
          <div className="min-w-[180px]">
            <Campo label="Categoria">
              <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)} className={inputCls}>
                <option value="">Todas</option>
                {CAT_ARP.map(c => <option key={c}>{c}</option>)}
              </select>
            </Campo>
          </div>
          <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto self-center">{lista.length} {lista.length === 1 ? "fornecedor" : "fornecedores"}</span>
        </div>
        <div className="overflow-x-auto border border-slate-300 rounded-sm bg-white">
          <table className="w-full border-collapse text-[13.5px] min-w-[680px]">
            <thead>
              <tr className="bg-stone-50">
                <Th>Razão social</Th><Th>CNPJ</Th><Th>Categoria</Th>
                <Th className="text-right">Atas</Th><Th className="text-right">Contratos</Th>
                <Th className="text-right">Valor contratado (R$)</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {lista.map(f => {
                const atasN = atas.filter(a => a.fornecedorId === f.id).length;
                const cts = contratos.filter(c => c.fornecedorId === f.id);
                const valor = cts.reduce((t, c) => t + valorEmpenhado(c, ocorrencias), 0);
                return (
                  <tr key={f.id} className="border-b border-slate-100 hover:bg-stone-50">
                    <td className="px-3 py-2.5 font-sans font-semibold text-slate-800">{f.razao}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{f.cnpj || "—"}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-600">{f.categoria || "—"}</td>
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
        </>
      )}

      {(novo || editId) && (
        <FormFornecedor f={editId ? fornecedores.find(x => x.id === editId) : null} data={data} refresh={refresh} onClose={() => { setNovo(false); setEditId(null); }} />
      )}
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`font-sans text-[9.5px] tracking-widest uppercase text-slate-500 text-left border-b border-slate-300 px-3 py-2.5 bg-stone-50 whitespace-nowrap ${className}`}>{children}</th>;
}

function FormFornecedor({ f, data, refresh, onClose }) {
  const { fornecedores, atas, contratos } = data;
  const [razao, setRazao] = useState(f?.razao || "");
  const [cnpj, setCnpj] = useState(f?.cnpj || "");
  const [categoria, setCategoria] = useState(f?.categoria || "");

  async function salvar() {
    const r = razao.trim(), c = cnpj.trim();
    if (!r) return alert("Informe a razão social.");
    if (c && !cnpjValido(c)) return alert("CNPJ inválido. Confira os 14 dígitos.");
    if (c && fornecedores.some(x => x.id !== f?.id && soDigitos(x.cnpj) === soDigitos(c))) return alert("Já existe um fornecedor cadastrado com este CNPJ.");
    const dados = { razao: r, cnpj: c, categoria };
    if (!f) {
      await base44.entities.Fornecedor.create(dados);
    } else {
      await base44.entities.Fornecedor.update(f.id, dados);
      const mudou = r !== (f.razao || "") || c !== (f.cnpj || "");
      const atasV = atas.filter(a => a.fornecedorId === f.id);
      const ctsV = contratos.filter(x => x.fornecedorId === f.id);
      if (mudou && (atasV.length || ctsV.length) && confirm(`Aplicar a razão social e o CNPJ corrigidos também em ${atasV.length} ata(s) e ${ctsV.length} contrato(s) vinculados?\n\nCancele para manter os documentos com os dados originais.`)) {
        if (atasV.length) await base44.entities.Ata.bulkUpdate(atasV.map(a => ({ id: a.id, fornecedor: r, cnpj: c })));
        if (ctsV.length) await base44.entities.Contrato.bulkUpdate(ctsV.map(x => ({ id: x.id, fornecedor: r, cnpj: c })));
      }
    }
    await refresh();
    onClose();
    alert(f ? "Fornecedor atualizado." : "Fornecedor cadastrado.");
  }

  return (
    <Modal sobre="Fornecedores" titulo={f ? "Editar fornecedor" : "Cadastrar fornecedor"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar</Btn></>}>
      <div className="grid gap-3 md:grid-cols-3">
        <Campo label="Razão social"><input className={inputCls} value={razao} onChange={e => setRazao(e.target.value)} /></Campo>
        <Campo label="CNPJ"><input className={inputCls} value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" /></Campo>
        <Campo label="Categoria"><select className={inputCls} value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Sem categoria</option>{CAT_ARP.map(c => <option key={c}>{c}</option>)}</select></Campo>
      </div>
    </Modal>
  );
}