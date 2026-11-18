import React, { useState, useMemo } from "react";
import { fmtData, norm, baixarCSV } from "@/lib/dmp-utils";
import { caminhoDepartamento } from "@/lib/departamentos";
import { ORDEM } from "@/lib/dmp-data";
import { Vazio, Pill } from "../ui";
import { Search, Download } from "lucide-react";
import { Btn } from "../ui";

export default function RegistrosSaida({ data }) {
  const { catalog, contratos, departamentos, bens, movimentacoes, categorias } = data;
  const [termo, setTermo] = useState("");
  const [categoria, setCategoria] = useState("Todas");

  const cats = useMemo(() => {
    const c = (categorias || []).slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(c => c.nome);
    return c.length ? c : ORDEM;
  }, [categorias]);

  const porPlaca = useMemo(() => {
    const m = new Map();
    (bens || []).forEach(u => m.set(String(u.placa), u));
    return m;
  }, [bens]);

  const linhas = useMemo(() => {
    const t = norm(termo.trim());
    return (movimentacoes || [])
      .filter(m => m.tipo === "saida")
      .map(m => {
        const u = porPlaca.get(String(m.bemId)) || {};
        const b = catalog.find(x => x.id === u.benId) || {};
        const c = contratos.find(x => x.id === u.contratoId) || {};
        const d = departamentos.find(x => x.id === m.departamentoId);
        return { m, u, b, c, d };
      })
      .filter(r => {
        if (categoria !== "Todas" && r.b.categoria !== categoria) return false;
        if (!t) return true;
        return norm(r.m.bemId).includes(t) || norm(r.b.objeto).includes(t) || norm(r.b.catmat || "").includes(t)
          || norm(r.c.numero || "").includes(t) || norm(r.u.numeroNF || "").includes(t)
          || norm(r.d?.nome || "").includes(t) || norm(r.d?.sigla || "").includes(t);
      })
      .slice().sort((a, b) => String(b.m.data || "").localeCompare(String(a.m.data || "")));
  }, [movimentacoes, porPlaca, catalog, contratos, departamentos, termo, categoria]);

  function exportCSV() {
    if (!linhas.length) return alert("Não há registros de saída para exportar.");
    const l = [["Placa", "Denominação", "CATMAT", "Categoria", "Contrato", "Nota fiscal", "Data da saída", "Destino", "Observação"]];
    linhas.forEach(({ m, u, b, c, d }) => {
      l.push([m.bemId, b.objeto || "—", b.catmat || "—", b.categoria || "—", c.numero || "—", u.numeroNF || "—", fmtData(m.data), d ? caminhoDepartamento(d, departamentos) : "", m.observacao || ""]);
    });
    baixarCSV("registros-saida.csv", l);
  }

  return (
    <div>
      <div className="flex gap-2 items-center flex-wrap mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input type="search" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Buscar por placa, bem, CATMAT, contrato, NF ou destino"
            className="border border-slate-300 rounded-sm pl-8 pr-3 py-2 font-sans text-sm bg-white w-full" />
        </div>
        <select value={categoria} onChange={e => setCategoria(e.target.value)} className="border border-slate-300 rounded-sm px-2.5 py-2 font-sans text-[13px] bg-white cursor-pointer text-slate-700">
          <option value="Todas">Todas as categorias</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Btn onClick={exportCSV} disabled={linhas.length === 0}><Download className="w-4 h-4 inline mr-1" />CSV</Btn>
        <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto">{linhas.length} registro{linhas.length === 1 ? "" : "s"}</span>
      </div>

      {linhas.length === 0 ? (
        <Vazio titulo="Nenhum registro de saída" texto="As transferências de bens para os departamentos aparecem aqui." />
      ) : (
        <div className="border border-slate-300 rounded-sm overflow-x-auto">
          <table className="w-full border-collapse text-[13px] min-w-[860px]">
            <thead><tr className="bg-stone-50">
              {["Placa", "Denominação", "Contrato", "Nota fiscal", "Data da saída", "Destino", "Observação"].map((h, i) => (
                <th key={i} className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {linhas.map(({ m, u, b, c, d }, i) => (
                <tr key={m.id || i} className={`border-t border-slate-100 ${i % 2 ? "bg-stone-50/40" : ""} hover:bg-amber-50/40`}>
                  <td className="px-3 py-2 font-mono font-semibold text-slate-800">{m.bemId}</td>
                  <td className="px-3 py-2 font-sans text-[12.5px] text-slate-700">{b.objeto || "—"}{b.catmat && <span className="block font-mono text-[10px] text-slate-400">{b.catmat}</span>}</td>
                  <td className="px-3 py-2 font-sans text-[12.5px] text-slate-600">{c.numero || "—"}</td>
                  <td className="px-3 py-2 font-sans text-[12.5px] text-slate-600">{u.numeroNF || "—"}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-slate-500">{fmtData(m.data)}</td>
                  <td className="px-3 py-2 font-sans text-[12.5px] text-slate-600">{d ? caminhoDepartamento(d, departamentos) : "—"}</td>
                  <td className="px-3 py-2 font-sans text-[12px] text-slate-500 max-w-[240px] truncate" title={m.observacao || ""}>{m.observacao || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}