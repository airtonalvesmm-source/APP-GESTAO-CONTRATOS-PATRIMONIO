import React, { useState, useMemo } from "react";
import { fmtData, norm, baixarCSV } from "@/lib/dmp-utils";
import { caminhoDepartamento } from "@/lib/departamentos";
import { ORDEM } from "@/lib/dmp-data";
import { Modal, Btn, Vazio, Pill, inputCls } from "../ui";
import { Search, Pencil, Download } from "lucide-react";
import EditarRegistro from "./EditarRegistro";

export default function RegistrosEntrada({ data, refresh }) {
  const { catalog, contratos, departamentos, bens, categorias } = data;
  const [termo, setTermo] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [situacao, setSituacao] = useState("");
  const [editId, setEditId] = useState(null);

  const cats = useMemo(() => {
    const c = (categorias || []).slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(c => c.nome);
    return c.length ? c : ORDEM;
  }, [categorias]);

  const linhas = useMemo(() => {
    const t = norm(termo.trim());
    return (bens || []).slice().map(u => {
      const b = catalog.find(x => x.id === u.benId) || {};
      const c = contratos.find(x => x.id === u.contratoId) || {};
      const d = departamentos.find(x => x.id === u.departamentoId);
      return { u, b, c, d };
    }).filter(r => {
      if (categoria !== "Todas" && r.b.categoria !== categoria) return false;
      if (situacao && r.u.situacao !== situacao) return false;
      if (t) {
        const em = norm(r.u.placa).includes(t) || norm(r.b.objeto).includes(t) ||
          String(r.b.catmat || "").includes(t) || norm(r.c.numero || "").includes(t) ||
          norm(r.u.numeroNF || "").includes(t);
        if (!em) return false;
      }
      return true;
    }).sort((a, b) => norm(a.u.placa).localeCompare(norm(b.u.placa), "pt-BR", { numeric: true }));
  }, [bens, catalog, contratos, departamentos, termo, categoria, situacao]);

  function exportCSV() {
    if (!linhas.length) return alert("Não há registros para exportar.");
    const l = [["Placa", "Denominação", "CATMAT", "Categoria", "Contrato", "Nota fiscal", "Emissão", "Entrada", "Situação", "Departamento"]];
    linhas.forEach(({ u, b, c, d }) => {
      l.push([u.placa, b.objeto || "—", b.catmat || "—", b.categoria || "—", c.numero || "—", u.numeroNF || "—", fmtData(u.dataNF), fmtData(u.dataEntrada), u.situacao, d ? caminhoDepartamento(d, departamentos) : ""]);
    });
    baixarCSV("registros-entrada.csv", l);
  }

  const editBem = editId ? (bens || []).find(x => x.id === editId) : null;

  return (
    <div>
      <div className="flex gap-2 items-center flex-wrap mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input type="search" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Buscar por placa, bem, CATMAT, contrato ou NF"
            className="border border-slate-300 rounded-sm pl-8 pr-3 py-2 font-sans text-sm bg-white w-full" />
        </div>
        <select value={categoria} onChange={e => setCategoria(e.target.value)} className="border border-slate-300 rounded-sm px-2.5 py-2 font-sans text-[13px] bg-white cursor-pointer text-slate-700">
          <option value="Todas">Todas as categorias</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={situacao} onChange={e => setSituacao(e.target.value)} className="border border-slate-300 rounded-sm px-2.5 py-2 font-sans text-[13px] bg-white cursor-pointer text-slate-700">
          <option value="">Todas as situações</option>
          <option value="em estoque">Em estoque</option>
          <option value="transferido">Transferido</option>
        </select>
        <Btn onClick={exportCSV} disabled={linhas.length === 0}><Download className="w-4 h-4 inline mr-1" />CSV</Btn>
        <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto">{linhas.length} registro{linhas.length === 1 ? "" : "s"}</span>
      </div>

      {linhas.length === 0 ? (
        <Vazio titulo="Nenhum registro de entrada" texto="Ajuste a busca ou os filtros, ou registre uma entrada a partir de um contrato entregue." />
      ) : (
        <div className="border border-slate-300 rounded-sm overflow-x-auto">
          <table className="w-full border-collapse text-[13px] min-w-[860px]">
            <thead><tr className="bg-stone-50">
              {["Placa", "Denominação", "Contrato", "Nota fiscal", "Emissão", "Entrada", "Situação", "Destino", ""].map((h, i) => (
                <th key={i} className={`text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2 ${i === 8 ? "w-12" : ""}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {linhas.map(({ u, b, c, d }, i) => (
                <tr key={u.id} className={`border-t border-slate-100 ${i % 2 ? "bg-stone-50/40" : ""} hover:bg-amber-50/40`}>
                  <td className="px-3 py-2 font-mono font-semibold text-slate-800">{u.placa}</td>
                  <td className="px-3 py-2 font-sans text-[12.5px] text-slate-700">{b.objeto || "—"}{b.catmat && <span className="block font-mono text-[10px] text-slate-400">{b.catmat}</span>}</td>
                  <td className="px-3 py-2 font-sans text-[12.5px] text-slate-600">{c.numero || "—"}</td>
                  <td className="px-3 py-2 font-sans text-[12.5px] text-slate-600">{u.numeroNF || "—"}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-slate-500">{fmtData(u.dataNF)}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-slate-500">{fmtData(u.dataEntrada)}</td>
                  <td className="px-3 py-2"><Pill tipo={u.situacao === "em estoque" ? "ok" : "neutro"}>{u.situacao}</Pill></td>
                  <td className="px-3 py-2 font-sans text-[12.5px] text-slate-600">{d ? caminhoDepartamento(d, departamentos) : "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => setEditId(u.id)} title="Editar registro"
                      className="text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-sm p-1 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editBem && (
        <EditarRegistro bem={editBem} data={data}
          onClose={async (salvou) => {
            setEditId(null);
            if (salvou) { await refresh(); }
          }} />
      )}
    </div>
  );
}