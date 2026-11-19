import { escHtml } from "./dmp-utils";

// Estilos dos documentos auxiliares (ordem de fornecimento e termo de recebimento).
// Todas as classes começam com "doc" para não vazar para o resto da aplicação.
export const CSS_DOC = `
.doc { font-family: Georgia, "Times New Roman", serif; color: #1B2430; font-size: 12.5px; line-height: 1.45; }
.doc h1 { font-family: Arial, Helvetica, sans-serif; font-size: 15px; text-align: center; margin: 0 0 3px; text-transform: uppercase; letter-spacing: .02em; }
.doc .doc-sub { text-align: center; font-family: Arial, sans-serif; font-size: 10.5px; color: #5A6270; margin: 0 0 16px; text-transform: uppercase; letter-spacing: .06em; }
.doc .doc-sec { margin-bottom: 13px; page-break-inside: avoid; }
.doc .doc-tit { font-family: Arial, sans-serif; font-weight: bold; font-size: 10.5px; background: #EDEFEA; border: 1px solid #C7CCC3; padding: 5px 8px; text-transform: uppercase; letter-spacing: .05em; }
.doc .doc-body { border: 1px solid #C7CCC3; border-top: 0; padding: 8px 10px; }
.doc table { width: 100%; border-collapse: collapse; font-size: 12px; }
.doc th, .doc td { border: 1px solid #C7CCC3; padding: 5px 7px; vertical-align: top; text-align: left; }
.doc th { background: #F7F9F5; font-family: Arial, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: .05em; }
.doc .num { text-align: right; white-space: nowrap; font-family: "Courier New", monospace; }
.doc .rot { font-family: Arial, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: .05em; color: #5A6270; display: block; margin-bottom: 2px; }
.doc .destaque { border-left: 3px solid #B45309; background: #FFFBEB; padding: 6px 9px; }
.doc .sub { font-family: Arial, sans-serif; font-size: 9.5px; color: #5A6270; margin-top: 1px; }
.doc .grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
.doc .total { font-family: Arial, sans-serif; font-weight: bold; }
.doc .assin { margin-top: 30px; text-align: center; page-break-inside: avoid; }
.doc .assin .linha { border-top: 1px solid #1B2430; width: 300px; margin: 0 auto 4px; }
.doc .assin .nome { font-weight: bold; }
.doc p { margin: 0 0 5px; }
@media print { .doc-sec, .doc .assin { page-break-inside: avoid; } }
`;

export function imprimirDocumento(titulo, htmlDoc) {
  const w = window.open("", "_blank");
  if (!w) return alert("O navegador bloqueou a nova aba. Permita pop-ups para imprimir.");
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escHtml(titulo)}</title>
    <style>
      body { margin: 0; padding: 14mm; background: #fff; }
      ${CSS_DOC}
    </style></head><body>${htmlDoc}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 300);
}