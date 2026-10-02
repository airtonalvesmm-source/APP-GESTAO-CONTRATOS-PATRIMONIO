import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { parsearCSV, norm, parseDataBR, isoData, hoje } from "@/lib/dmp-utils";
import { Modal, Btn, Campo, inputCls } from "../ui";
import { Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";

// Colunas esperadas (com aliases flexíveis)
function col(row, candidatos) {
  const keys = Object.keys(row);
  for (const esp of candidatos) {
    const k = keys.find(k => norm(k) === norm(esp));
    if (k != null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
}

export default function ImportarBensCSV({ data, refresh, onClose }) {
  const { contratos, pagamentos, catalog, bens } = data;
  const [preview, setPreview] = useState(null); // { nome, total, validas, invalidas, amostra }
  const [status, setStatus] = useState("");
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);
  const fileRef = useRef(null);

  function reset() { setPreview(null); setStatus(""); setErro(""); if (fileRef.current) fileRef.current.value = ""; }

  async function lerArquivo(e) {
    const f = e.target.files[0];
    if (!f) return;
    reset();
    const linhas = parsearCSV(await f.text());
    if (!linhas.length) { setErro("Arquivo vazio."); return; }
    const placasExistentes = new Set((bens || []).map(b => String(b.placa)));
    const placasNoArquivo = new Set();
    const validas = [];
    const invalidas = [];
    linhas.forEach((row, idx) => {
      const placa = col(row, ["Placa", "Placa de tombamento"]);
      const numContrato = col(row, ["Número do contrato", "Contrato", "Numero do contrato"]);
      const nf = col(row, ["Nota fiscal", "NF", "Número da nota fiscal", "Numero da nota fiscal"]);
      const emissaoNF = col(row, ["Emissão da NF", "Emissao da NF", "Data da NF"]);
      const catmat = col(row, ["CATMAT"]);
      const qtd = col(row, ["Quantidade", "Qtd"]);
      const dataEntrada = col(row, ["Data de entrada", "Data de entrada no estoque", "Entrada"]);
      const motivo = [];
      if (!placa) motivo.push("Placa obrigatória");
      else if (!/^\d+$/.test(placa)) motivo.push("Placa deve ser numérica");
      else if (placasExistentes.has(placa)) motivo.push(`Placa ${placa} já cadastrada`);
      else if (placasNoArquivo.has(placa)) motivo.push(`Placa ${placa} duplicada no arquivo`);
      if (!numContrato) motivo.push("Contrato obrigatório");
      if (!catmat) motivo.push("CATMAT obrigatório");
      if (qtd && String(qtd) !== "1") motivo.push("Quantidade deve ser 1 (uma linha por unidade)");
      const contrato = numContrato ? (contratos || []).find(c => norm(String(c.numero)) === norm(numContrato)) : null;
      if (numContrato && !contrato) motivo.push(`Contrato "${numContrato}" não encontrado`);
      if (contrato && contrato.statusEntrega !== "Entregue") motivo.push(`Contrato não está "Entregue" (atual: ${contrato.statusEntrega})`);
      const bem = catmat ? (catalog || []).find(b => norm(String(b.catmat)) === norm(catmat)) : null;
      if (catmat && !bem) motivo.push(`CATMAT ${catmat} não existe no catálogo`);
      // valida vínculo do item ao contrato
      if (contrato && bem) {
        const itensDoBen = (contrato.itens || []).some(it => it.benId === bem.id);
        if (!itensDoBen) motivo.push(`CATMAT ${catmat} não pertence ao contrato ${numContrato}`);
      }
      if (motivo.length) { invalidas.push({ linha: idx + 2, placa: placa || "—", motivo: motivo.join("; ") }); return; }
      placasNoArquivo.add(placa);
      const pagamento = nf ? (pagamentos || []).find(p => p.contratoId === contrato.id && norm(String(p.nf)) === norm(nf)) : null;
      validas.push({
        benId: bem.id, contratoId: contrato.id,
        pagamentoId: pagamento?.id || "",
        numeroNF: nf, dataNF: pagamento?.dataNF || parseDataBR(emissaoNF) || "",
        placa, situacao: "em estoque",
        dataEntrada: parseDataBR(dataEntrada) || isoData(hoje())
      });
    });
    setPreview({ nome: f.name, total: linhas.length, validas, invalidas });
  }

  async function confirmar() {
    if (!preview || !preview.validas.length) return;
    setProcessando(true); setErro(""); setStatus("");
    try {
      const regs = preview.validas;
      for (let i = 0; i < regs.length; i += 100) {
        await base44.entities.BemPatrimonial.bulkCreate(regs.slice(i, i + 100));
      }
      const movs = regs.map(r => ({ bemId: r.placa, tipo: "entrada", data: r.dataEntrada, observacao: "Entrada por CSV" }));
      for (let i = 0; i < movs.length; i += 100) {
        await base44.entities.MovimentacaoEstoque.bulkCreate(movs.slice(i, i + 100));
      }
      setStatus(`${regs.length} bem(ns) patrimoniado(s) com sucesso.`);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch (e) {
      setErro("Erro ao importar: " + (e.message || e));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Modal sobre="Estoque" titulo="Importar entrada de bens via CSV" onClose={onClose}
      footer={<>
        <Btn onClick={onClose}>Fechar</Btn>
        <Btn variant="forte" onClick={confirmar} disabled={!preview || !preview.validas.length || processando}>
          {processando ? "Importando…" : `Importar ${preview?.validas.length ? `${preview.validas.length} bem(ns)` : ""}`}
        </Btn>
      </>}>
      <div className="mb-4">
        <Campo label="Arquivo CSV">
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={lerArquivo} className="text-sm" />
        </Campo>
        <p className="font-sans text-[12px] text-slate-500 mt-1.5">
          Formato: CSV separado por ponto e vírgula (;), primeira linha como cabeçalho.
          Colunas: <b>Placa</b>, <b>Número do contrato</b>, <b>Nota fiscal</b>, <b>Emissão da NF</b>, <b>CATMAT</b>, <b>Quantidade</b>, <b>Data de entrada</b>.
          Uma linha por unidade física (Quantidade deve ser 1).
        </p>
        <p className="font-sans text-[12px] text-slate-500 mt-1.5">
          O contrato deve existir e estar com status "Entregue", e o CATMAT deve pertencer aos itens do contrato.
          Datas em dd/mm/aaaa. A placa precisa ser numérica e única.
        </p>
      </div>

      {preview && (
        <div className="space-y-3">
          <div className="border border-slate-300 rounded-sm p-3 bg-stone-50">
            <p className="font-sans text-[12.5px] text-slate-700 mb-1">
              <FileSpreadsheet className="w-4 h-4 inline mr-1" />
              <b>{preview.nome}</b> — {preview.total} linha(s): <span className="text-emerald-700">{preview.validas.length} válidas</span>, <span className="text-red-700">{preview.invalidas.length} inválidas</span>.
            </p>
          </div>
          {preview.invalidas.length > 0 && (
            <div className="border border-red-300 bg-red-50 rounded-sm p-3 max-h-48 overflow-auto">
              <p className="font-sans text-[12.5px] text-red-800 mb-1.5 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />Linhas rejeitadas (corrija e reenvie):</p>
              <ul className="font-mono text-[11px] text-red-700 space-y-0.5">
                {preview.invalidas.slice(0, 50).map((l, i) => (
                  <li key={i}>Linha {l.linha} · placa {l.placa}: {l.motivo}</li>
                ))}
                {preview.invalidas.length > 50 && <li>… e mais {preview.invalidas.length - 50} linha(s).</li>}
              </ul>
            </div>
          )}
          {preview.validas.length > 0 && (
            <div className="border border-emerald-300 bg-emerald-50 rounded-sm p-3">
              <p className="font-sans text-[12.5px] text-emerald-800">
                {preview.validas.length} bem(ns) serão patrimoniados como "em estoque" com as placas informadas.
              </p>
            </div>
          )}
        </div>
      )}

      {status && <div className="border border-emerald-300 bg-emerald-50 rounded-sm px-3 py-2 text-sm text-emerald-800 mb-3">{status}</div>}
      {erro && <div className="border border-red-300 bg-red-50 rounded-sm px-3 py-2 text-sm text-red-800 mb-3">{erro}</div>}
    </Modal>
  );
}