import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ADITIVOS, FALTAS } from "@/lib/dmp-data";
import { fmtM, fmtData, nVal, norm, totaisPagamento, ocorrenciasDe, valorEmpenhado, baixarCSV } from "@/lib/dmp-utils";
import { Btn, Vazio } from "./ui";
import { TelaCab } from "./Catalogo";
import ImportarCSV from "./ImportarCSV";
import { usePodeEditar } from "@/lib/permissoes";
import { FormOcorrencia } from "./Contratos";
import { Plus } from "lucide-react";
import { GrupoAnoCategoria, agruparPorAnoCategoria } from "./Agrupar";
import BarraFiltros from "./pagamentos/BarraFiltros";
import CartaoContrato from "./pagamentos/CartaoContrato";
import FormPagamento from "./pagamentos/FormPagamento";

export default function Pagamentos({ data, refresh }) {
  const podeEditar = usePodeEditar();
  const { contratos, ocorrencias, pagamentos, atas, catalog } = data;
  const [nfContratoId, setNfContratoId] = useState(null);
  const [editNfId, setEditNfId] = useState(null);
  const [ocorrContratoId, setOcorrContratoId] = useState(null);
  const [abertos, setAbertos] = useState(new Set());
  const [termo, setTermo] = useState("");
  const [cat, setCat] = useState("");
  const [ano, setAno] = useState("");
  const [ord, setOrd] = useState("retencao");
  const [agrupar, setAgrupar] = useState(true);
  const [situacao, setSituacao] = useState("");

  function catDoContrato(c) {
    const a = atas.find(x => x.id === c.ataId);
    if (a?.categoria) return a.categoria;
    const cats = (c.itens || []).map(i => catalog.find(b => b.id === i.benId)?.categoria).filter(Boolean);
    if (cats.length) {
      const counts = {};
      cats.forEach(cat => counts[cat] = (counts[cat] || 0) + 1);
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }
    return "Sem categoria";
  }
  function anoDoContrato(c) { return c.inicio?.slice(0, 4) || c.fim?.slice(0, 4) || ""; }
  const anos = Array.from(new Set(contratos.map(anoDoContrato).filter(Boolean))).sort().reverse();

  const lista = useMemo(() => {
    const t = norm(termo.trim());
    let res = contratos.filter(c => {
      if (cat && catDoContrato(c) !== cat) return false;
      if (ano && String(anoDoContrato(c)) !== String(ano)) return false;
      const txtPag = pagamentos.filter(p => p.contratoId === c.id).map(p => p.nf + " " + (p.motivo || "")).join(" ");
      if (t && norm([c.tipo, c.numero, c.processo, c.notaEmpenho, c.fornecedor, c.objeto, txtPag].join(" ")).indexOf(t) < 0) return false;
      if (situacao) {
        const tp = totaisPagamento(c, pagamentos, ocorrencias);
        if (situacao === "quitado" && (tp.aPagar > 0 || tp.ps.length === 0)) return false;
        if (situacao === "apagar" && (tp.aPagar === 0 || tp.retido > 0 || tp.ps.length === 0)) return false;
        if (situacao === "retido" && tp.retido === 0) return false;
        if (situacao === "semnotas" && tp.ps.length > 0) return false;
      }
      return true;
    });
    const ordFn = {
      retencao: (a, b) => totaisPagamento(b, pagamentos, ocorrencias).retido - totaisPagamento(a, pagamentos, ocorrencias).retido,
      saldo: (a, b) => totaisPagamento(b, pagamentos, ocorrencias).aPagar - totaisPagamento(a, pagamentos, ocorrencias).aPagar,
      numero: (a, b) => norm(b.numero).localeCompare(norm(a.numero)),
      fornecedor: (a, b) => norm(a.fornecedor || "").localeCompare(norm(b.fornecedor || ""))
    }[ord];
    if (ordFn) res = res.slice().sort(ordFn);
    return res;
  }, [contratos, termo, cat, ano, ord, situacao, pagamentos, ocorrencias, atas]);

  function temAditivo(id) { return ocorrenciasDe(id, ocorrencias).some(o => ADITIVOS.includes(o.tipo)); }
  function temFalta(id) { return ocorrenciasDe(id, ocorrencias).some(o => FALTAS.includes(o.tipo)); }

  async function excluirNF(p) {
    if (!confirm("Excluir esta nota fiscal?")) return;
    await base44.entities.Pagamento.delete(p.id);
    await refresh();
  }

  async function excluirOcorrencia(o) {
    if (!confirm("Excluir esta ocorrência?")) return;
    await base44.entities.Ocorrencia.delete(o.id);
    await refresh();
  }

  function toggle(id) { setAbertos(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  function exportCSV() {
    if (!pagamentos.length) return alert("Não há notas fiscais lançadas.");
    const l = [["Contrato", "Nota de empenho", "Fornecedor", "CNPJ", "Valor empenhado", "Nota fiscal", "Emissão", "Valor da nota", "Valor pago", "Valor retido", "Motivo da retenção", "Data do pagamento", "Situação", "Aditivos", "Descumprimento"]];
    pagamentos.forEach(p => {
      const c = contratos.find(x => x.id === p.contratoId); if (!c) return;
      l.push([`${c.tipo} ${c.numero}`, c.notaEmpenho || "", c.fornecedor || "", c.cnpj || "", fmtM(valorEmpenhado(c, ocorrencias)), p.nf, fmtData(p.dataNF), fmtM(p.valorNF), fmtM(p.valorPago), fmtM(Math.max(0, nVal(p.valorNF) - nVal(p.valorPago))), p.motivo || "", fmtData(p.dataPagamento), p.situacao || "", temAditivo(c.id) ? "Sim" : "Não", temFalta(c.id) ? "Sim" : "Não"]);
    });
    baixarCSV("pagamentos.csv", l);
  }

  const grupos = useMemo(() => agrupar ? agruparPorAnoCategoria(lista, c => anoDoContrato(c), c => catDoContrato(c)) : [], [lista, agrupar]);

  function renderItem(c) {
    return (
      <CartaoContrato
        key={c.id}
        c={c}
        t={totaisPagamento(c, pagamentos, ocorrencias)}
        ocs={ocorrenciasDe(c.id, ocorrencias)}
        aberto={abertos.has(c.id)}
        onToggle={() => toggle(c.id)}
        onEditarNota={setEditNfId}
        onExcluirNota={excluirNF}
        onExcluirOcorrencia={excluirOcorrencia}
        onNovaNota={() => setNfContratoId(c.id)}
        onNovaOcorrencia={() => setOcorrContratoId(c.id)}
        data={data}
        refresh={refresh}
      />
    );
  }

  return (
    <div>
      <TelaCab titulo="Pagamentos" desc="Execução financeira de cada contrato: valor empenhado, notas fiscais, valores pagos e retidos. Aditivos e descumprimentos ficam em seção própria."
        direita={<>
          <Btn onClick={exportCSV}>Baixar CSV</Btn>
          <ImportarCSV entityName="Pagamento" refresh={refresh} data={data}
            existentes={pagamentos} chave={r => r.contratoId + "|" + norm(r.nf)}
            colunas={[
              { header: "Contrato", campo: "_contratoNum", obrigatorio: true },
              { header: "Nota fiscal", campo: "nf", obrigatorio: true },
              { header: "Emissão", campo: "dataNF", tipo: "date" },
              { header: "Valor da nota", campo: "valorNF", tipo: "number", obrigatorio: true },
              { header: "Valor pago", campo: "valorPago", tipo: "number" },
              { header: "Data do pagamento", campo: "dataPagamento", tipo: "date" },
              { header: "Motivo da retenção", campo: "motivo" },
              { header: "Situação", campo: "situacao" }
            ]}
            preProcess={(rec, data) => {
              const c = (data.contratos || []).find(x => norm(x.tipo + " " + x.numero) === norm(rec._contratoNum) || norm(x.numero) === norm(rec._contratoNum));
              if (!c) return null;
              return { contratoId: c.id, nf: rec.nf, dataNF: rec.dataNF, valorNF: rec.valorNF, valorPago: rec.valorPago || 0, dataPagamento: rec.dataPagamento, motivo: rec.motivo, situacao: rec.situacao || "Pendente" };
            }}
            ajuda="O campo 'Contrato' deve conter o número do contrato/empenho já cadastrado (ex.: '45/2026'). Linhas sem contrato correspondente serão ignoradas. Datas no formato dd/mm/aaaa." />
          {podeEditar && <Btn variant="forte" onClick={() => setNfContratoId(contratos[0]?.id || null)} disabled={contratos.length === 0}><Plus className="w-4 h-4 inline mr-1" />Lançar nota fiscal</Btn>}
        </>} />

      {contratos.length === 0 ? (
        <Vazio titulo="Nenhum contrato lançado" texto="Cadastre um contrato ou empenho para registrar as notas fiscais e os pagamentos." />
      ) : (
        <>
          <BarraFiltros termo={termo} setTermo={setTermo} cat={cat} setCat={setCat} ano={ano} setAno={setAno} ord={ord} setOrd={setOrd} anos={anos} total={lista.length} agrupar={agrupar} setAgrupar={setAgrupar} situacao={situacao} setSituacao={setSituacao} />
          {lista.length === 0 ? (
            <Vazio titulo="Nenhum contrato corresponde aos filtros" texto="Ajuste os termos ou limpe os filtros." />
          ) : agrupar ? (
            <GrupoAnoCategoria grupos={grupos} renderItem={renderItem} />
          ) : (
            <div className="space-y-3.5">
              {lista.map(renderItem)}
            </div>
          )}
        </>
      )}

      {(nfContratoId || editNfId) && <FormPagamento p={editNfId ? pagamentos.find(x => x.id === editNfId) : null} contratoId={nfContratoId} data={data} refresh={refresh} onClose={() => { setNfContratoId(null); setEditNfId(null); }} />}
      {ocorrContratoId && <FormOcorrencia contratoId={ocorrContratoId} data={data} refresh={refresh} onClose={() => setOcorrContratoId(null)} />}
    </div>
  );
}