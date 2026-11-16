import React from "react";
import { CAT_ARP } from "@/lib/dmp-data";
import { Campo, inputCls } from "../ui";
import { BotaoAgrupar } from "../Agrupar";
import { Search } from "lucide-react";

export default function BarraFiltros({ termo, setTermo, cat, setCat, ano, setAno, ord, setOrd, anos, total, agrupar, setAgrupar, situacao, setSituacao }) {
  return (
    <div className="bg-white border border-slate-300 rounded-sm mb-5">
      <div className="px-3.5 py-3 flex gap-2.5 items-end flex-wrap border-b border-slate-200">
        <div className="flex-1 min-w-[240px]">
          <Campo label="Buscar">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input type="search" value={termo} onChange={e => setTermo(e.target.value)}
                placeholder="Contrato, fornecedor, nota fiscal ou motivo da retenção"
                className={inputCls + " pl-8"} />
            </div>
          </Campo>
        </div>
        <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto self-center">
          {total} {total === 1 ? "contrato" : "contratos"}
        </span>
      </div>

      <div className="px-3.5 py-3">
        <div className="flex gap-2.5 items-end flex-wrap">
          <div className="min-w-[200px]">
            <Campo label="Situação financeira">
              <select value={situacao} onChange={e => setSituacao(e.target.value)} className={inputCls}>
                <option value="">Todas as situações</option>
                <option value="apagar">Com saldo a pagar</option>
                <option value="retido">Com retenção</option>
                <option value="quitado">Quitados</option>
                <option value="semnotas">Sem notas lançadas</option>
              </select>
            </Campo>
          </div>
          <div className="min-w-[150px]">
            <Campo label="Categoria">
              <select value={cat} onChange={e => setCat(e.target.value)} className={inputCls}>
                <option value="">Todas</option>
                {CAT_ARP.map(c => <option key={c}>{c}</option>)}
              </select>
            </Campo>
          </div>
          <div className="min-w-[105px]">
            <Campo label="Ano">
              <select value={ano} onChange={e => setAno(e.target.value)} className={inputCls}>
                <option value="">Todos</option>
                {anos.map(a => <option key={a}>{a}</option>)}
              </select>
            </Campo>
          </div>

          <div className="hidden md:block w-px self-stretch bg-slate-200 mx-1" />

          <div className="min-w-[170px]">
            <Campo label="Ordenar por">
              <select value={ord} onChange={e => setOrd(e.target.value)} className={inputCls}>
                <option value="retencao">Maior retenção</option>
                <option value="saldo">Maior saldo a pagar</option>
                <option value="numero">Número do contrato</option>
                <option value="fornecedor">Fornecedor (A → Z)</option>
              </select>
            </Campo>
          </div>
          <BotaoAgrupar agrupar={agrupar} setAgrupar={setAgrupar} />
        </div>

        <p className="font-sans text-[11.5px] leading-relaxed text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100">
          <b>Com saldo a pagar</b>: há notas lançadas e ainda falta pagar. <b>Com retenção</b>: alguma nota teve valor retido.{" "}
          <b>Quitados</b>: notas lançadas e nada pendente. <b>Sem notas lançadas</b>: nenhum lançamento fiscal no contrato.
        </p>
      </div>
    </div>
  );
}