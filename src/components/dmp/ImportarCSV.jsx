import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { parsearCSV } from "@/lib/dmp-utils";
import { Modal, Btn, Campo } from "./ui";
import { Upload, FileSpreadsheet } from "lucide-react";

/**
 * Botão que abre um modal de importação CSV.
 * props:
 *  - entityName: nome da entidade (ex.: "CatalogItem")
 *  - colunas: array de { header, campo, tipo } descrevendo o mapeamento
 *  - refresh: função para recarregar dados após importar
 *  - label: texto do botão (default "Importar CSV")
 *  - ajuda: texto extra exibido no modal
 */
export default function ImportarCSV({ entityName, colunas, refresh, label = "Importar CSV", ajuda, preProcess, data }) {
  const [aberto, setAberto] = useState(false);
  const [status, setStatus] = useState("");
  const [erro, setErro] = useState("");
  const [importando, setImportando] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  function reset() {
    setStatus(""); setErro(""); setPreview(null); setImportando(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function lerArquivo(e) {
    const f = e.target.files[0];
    if (!f) return;
    setErro("");
    setStatus("");
    try {
      const texto = await f.text();
      const linhas = parsearCSV(texto);
      if (!linhas.length) { setErro("O arquivo está vazio ou não pôde ser lido."); return; }
      setPreview({ nome: f.name, total: linhas.length, amostra: linhas.slice(0, 3) });
    } catch (err) {
      setErro("Falha ao ler o arquivo: " + (err.message || err));
    }
  }

  async function confirmar() {
    if (!fileRef.current?.files[0]) return;
    setImportando(true); setErro(""); setStatus("");
    try {
      const texto = await fileRef.current.files[0].text();
      const linhas = parsearCSV(texto);
      if (!linhas.length) { setErro("Nenhuma linha de dados encontrada."); setImportando(false); return; }

      const cabecalhos = Object.keys(linhas[0]);
      const registros = [];
      const ignorados = [];

      linhas.forEach((row, idx) => {
        const rec = {};
        let valido = true;
        for (const c of colunas) {
          const headers = [c.header, ...(c.aliases || [])];
          let val = "";
          for (const h of headers) {
            if (row[h] != null && String(row[h]).trim() !== "") { val = row[h]; break; }
          }
          if (val === "") {
            if (c.obrigatorio) { valido = false; }
            rec[c.campo] = c.tipo === "number" ? 0 : "";
            continue;
          }
          let v = String(val).trim();
          if (c.tipo === "number") {
            const t = v.replace(/[^\d,.-]/g, "");
            rec[c.campo] = parseFloat(t.indexOf(",") > -1 ? t.replace(/\./g, "").replace(",", ".") : t) || 0;
          } else if (c.tipo === "date") {
            // aceita dd/mm/aaaa -> aaaa-mm-dd, ou já ISO
            const p = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            rec[c.campo] = p ? `${p[3]}-${p[2]}-${p[1]}` : v;
          } else if (c.tipo === "boolean") {
            rec[c.campo] = /^(sim|true|1|s)$/i.test(v);
          } else {
            rec[c.campo] = v;
          }
        }
        if (valido) {
          const finalRec = preProcess ? preProcess(rec, data) : rec;
          if (finalRec) registros.push(finalRec);
          else ignorados.push(idx + 2);
        } else ignorados.push(idx + 2);
      });

      if (!registros.length) {
        setErro("Nenhuma linha válida. Verifique se as colunas obrigatórias estão preenchidas.");
        setImportando(false);
        return;
      }

      // bulkCreate em lotes de 100
      let criados = 0;
      for (let i = 0; i < registros.length; i += 100) {
        const lote = registros.slice(i, i + 100);
        await base44.entities[entityName].bulkCreate(lote);
        criados += lote.length;
      }
      setStatus(`${criados} registro(s) importado(s)${ignorados.length ? `, ${ignorados.length} ignorado(s) por campos obrigatórios em branco (linhas: ${ignorados.slice(0, 10).join(", ")}${ignorados.length > 10 ? "…" : ""})` : ""}.`);
      await refresh();
    } catch (err) {
      setErro("Erro ao importar: " + (err.message || err));
    } finally {
      setImportando(false);
    }
  }

  return (
    <>
      <Btn onClick={() => { reset(); setAberto(true); }}><Upload className="w-4 h-4 inline mr-1" />{label}</Btn>

      {aberto && (
        <Modal sobre="Importação de dados" titulo={`Importar ${entityName} via CSV`} onClose={() => setAberto(false)}
          footer={<>
            <Btn onClick={() => setAberto(false)}>Fechar</Btn>
            <Btn variant="forte" onClick={confirmar} disabled={importando || !preview}>
              {importando ? "Importando…" : "Confirmar importação"}
            </Btn>
          </>}>
          <div className="mb-4">
            <Campo label="Arquivo CSV">
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={lerArquivo} className="text-sm" />
            </Campo>
            <p className="font-sans text-[12px] text-slate-500 mt-1.5">
              Formato esperado: CSV separado por ponto e vírgula (;), com a primeira linha como cabeçalho.
              Colunas reconhecidas: <b>{colunas.map(c => c.header).join(", ")}</b>.
              {colunas.some(c => c.obrigatorio) && <> Obrigatórias: <b>{colunas.filter(c => c.obrigatorio).map(c => c.header).join(", ")}</b>.</>}
            </p>
            {ajuda && <p className="font-sans text-[12px] text-slate-500 mt-1.5">{ajuda}</p>}
          </div>

          {preview && (
            <div className="border border-slate-300 rounded-sm p-3 mb-3 bg-stone-50">
              <p className="font-sans text-[12.5px] text-slate-700 mb-1">
                <FileSpreadsheet className="w-4 h-4 inline mr-1" />
                <b>{preview.nome}</b> — {preview.total} linha(s) de dados.
              </p>
              <p className="font-mono text-[11px] text-slate-500">Primeiras linhas:</p>
              <pre className="font-mono text-[10.5px] text-slate-600 mt-1 overflow-auto max-h-32 bg-white border border-slate-200 rounded p-2">
{preview.amostra.map(r => JSON.stringify(r, null, 0)).join("\n")}
              </pre>
            </div>
          )}

          {status && <div className="border border-emerald-300 bg-emerald-50 rounded-sm px-3 py-2 text-sm text-emerald-800 mb-3">{status}</div>}
          {erro && <div className="border border-red-300 bg-red-50 rounded-sm px-3 py-2 text-sm text-red-800 mb-3">{erro}</div>}

          <p className="font-sans text-[11.5px] text-slate-500">
            Dica: exporte o CSV pelo botão "Baixar CSV" para obter um modelo com as colunas e o formato corretos, edite-o e reimporte.
          </p>
        </Modal>
      )}
    </>
  );
}