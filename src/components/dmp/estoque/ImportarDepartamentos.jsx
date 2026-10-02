import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { parsearCSV, norm } from "@/lib/dmp-utils";
import { Modal, Btn, Campo } from "../ui";
import { Upload, FileSpreadsheet, Network } from "lucide-react";

const COL_A = "Localização raiz 1";
const COL_B = "Localização raiz 1.1";
const COL_C = "Localização específica";

function valsLinha(row) {
  const keys = Object.keys(row);
  const find = (esp) => keys.find(k => norm(k) === norm(esp));
  const kA = find(COL_A) || keys[0];
  const kB = find(COL_B) || keys[1];
  const kC = find(COL_C) || keys[2];
  return [(row[kA] || "").trim(), (row[kB] || "").trim(), (row[kC] || "").trim()];
}

function montarMapa(departamentos) {
  const m = new Map();
  (departamentos || []).forEach(d => m.set((d.paiId || "ROOT") + "|" + norm(d.nome), d.id));
  return m;
}

export default function ImportarDepartamentos({ data, refresh }) {
  const { departamentos } = data;
  const [aberto, setAberto] = useState(false);
  const [preview, setPreview] = useState(null);
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
    if (!linhas.length) { setErro("Arquivo vazio ou ilegível."); return; }
    const amostra = linhas.slice(0, 5).map(valsLinha);
    setPreview({ nome: f.name, total: linhas.length, amostra });
  }

  async function confirmar() {
    if (!fileRef.current?.files[0]) return;
    setErro(""); setStatus(""); setProcessando(true);
    try {
      const linhas = parsearCSV(await fileRef.current.files[0].text());
      if (!linhas.length) { setErro("Nenhuma linha de dados."); setProcessando(false); return; }
      const mapa = montarMapa(departamentos);
      let criados = 0, raizes = 0, interm = 0, espec = 0, reusados = 0;
      async function assegurar(nome, paiId) {
        const key = (paiId || "ROOT") + "|" + norm(nome);
        if (mapa.has(key)) { reusados++; return mapa.get(key); }
        const rec = await base44.entities.Departamento.create({ nome, paiId: paiId || "", unidade: "PGJ" });
        mapa.set(key, rec.id);
        criados++;
        return rec.id;
      }
      for (const row of linhas) {
        const [a, b, c] = valsLinha(row);
        if (!a && !b && !c) continue;
        if (!a) continue;
        const idA = await assegurar(a, "");
        raizes++;
        let idPai = idA;
        if (b) { idPai = await assegurar(b, idA); interm++; }
        if (c) { idPai = await assegurar(c, idPai); espec++; }
        void idPai;
      }
      setStatus(`${criados} departamento(s) criado(s) · ${reusados} reutilizado(s). Raízes: ${raizes}, intermediários: ${interm}, específicos: ${espec}.`);
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
    <>
      <Btn onClick={() => { reset(); setAberto(true); }}><Upload className="w-4 h-4 inline mr-1" />Importar departamentos</Btn>
      {aberto && (
        <Modal sobre="Estoque" titulo="Importar hierarquia de departamentos" onClose={() => setAberto(false)}
          footer={<>
            <Btn onClick={() => setAberto(false)}>Fechar</Btn>
            <Btn variant="forte" onClick={confirmar} disabled={!preview || processando}>{processando ? "Importando…" : "Confirmar importação"}</Btn>
          </>}>
          <div className="mb-4">
            <Campo label="Arquivo CSV">
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={lerArquivo} className="text-sm" />
            </Campo>
            <p className="font-sans text-[12px] text-slate-500 mt-1.5">
              Formato esperado: CSV separado por ponto e vírgula (;), com a primeira linha como cabeçalho.
              Colunas: <b>{COL_A}</b>, <b>{COL_B}</b>, <b>{COL_C}</b> — exatamente como na planilha de origem.
            </p>
            <p className="font-sans text-[12px] text-slate-500 mt-1.5">
              <Network className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              Cada linha vira uma cadeia pai→filho: a coluna A vira (ou reusa) um departamento raiz, a B um filho de A, e a C um filho de B.
              O nome final (coluna C) é o departamento que aparece nas saídas de bens. Linhas com B e C iguais criam apenas um nó intermediário.
            </p>
          </div>

          {preview && (
            <div className="border border-slate-300 rounded-sm p-3 mb-3 bg-stone-50">
              <p className="font-sans text-[12.5px] text-slate-700 mb-1">
                <FileSpreadsheet className="w-4 h-4 inline mr-1" />
                <b>{preview.nome}</b> — {preview.total} linha(s) de dados.
              </p>
              <p className="font-mono text-[11px] text-slate-500 mb-1">Raiz 1 › Raiz 1.1 › Específica:</p>
              <ul className="font-mono text-[10.5px] text-slate-600 mt-1 max-h-32 overflow-auto bg-white border border-slate-200 rounded p-2 space-y-0.5">
                {preview.amostra.map((v, i) => (
                  <li key={i}>{v.filter(Boolean).join(" › ") || "(linha vazia)"}</li>
                ))}
              </ul>
            </div>
          )}

          {status && <div className="border border-emerald-300 bg-emerald-50 rounded-sm px-3 py-2 text-sm text-emerald-800 mb-3">{status}</div>}
          {erro && <div className="border border-red-300 bg-red-50 rounded-sm px-3 py-2 text-sm text-red-800 mb-3">{erro}</div>}
        </Modal>
      )}
    </>
  );
}