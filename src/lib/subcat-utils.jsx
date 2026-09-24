import { ORDEM } from "@/lib/dmp-data";

// Utilitários de subcategoria do catálogo

// Lista ordenada de subcategorias em uso dentro de uma categoria (derivada dos itens do catálogo)
export function subcatsDeCategoria(catalog, categoria) {
  const set = new Set();
  (catalog || []).forEach(b => {
    if (b.oculto) return;
    if (categoria && b.categoria !== categoria) return;
    const s = (b.subcategoria || "").trim();
    if (s) set.add(s);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Sugestões de subcategoria para uma categoria: cadastradas na entidade Subcategoria + já usadas no catálogo, dedupliadas e ordenadas
export function sugestoesSubcategoria(subcategorias, catalog, categoria) {
  const set = new Set();
  (subcategorias || []).forEach(s => {
    if (s.categoria === categoria && s.nome) set.add(s.nome.trim());
  });
  (catalog || []).forEach(b => {
    if (b.oculto) return;
    if (b.categoria !== categoria) return;
    const s = (b.subcategoria || "").trim();
    if (s) set.add(s);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Agrupa bens por subcategoria, retornando [{ subcategoria, items }] ordenado por subcategoria,
// com itens ordenados por nome dentro de cada grupo
export function agruparBensPorSubcategoria(bens) {
  const grupos = {};
  (bens || []).forEach(b => {
    const s = (b.subcategoria || "").trim() || "Sem subcategoria";
    if (!grupos[s]) grupos[s] = [];
    grupos[s].push(b);
  });
  return Object.entries(grupos)
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
    .map(([subcategoria, items]) => ({
      subcategoria,
      items: items.slice().sort((a, b) => (a.objeto || "").localeCompare(b.objeto || "", "pt-BR"))
    }));
}

// Renderiza <option> dos bens de uma categoria agrupados por subcategoria (optgroup),
// mantendo o item selecionado visível mesmo se de outra categoria
export function opcoesBensAgrupadas(catalog, categoria, sel) {
  const daCategoria = catalog.filter(b => !b.oculto && (categoria ? b.categoria === categoria : true));
  const grupos = agruparBensPorSubcategoria(daCategoria);
  let extra = null;
  if (sel && !daCategoria.find(b => b.id === sel)) {
    const atual = catalog.find(b => b.id === sel);
    if (atual) extra = atual;
  }
  return (
    <>
      {extra && <option key={extra.id} value={extra.id}>{extra.objeto} (fora da categoria)</option>}
      {grupos.map(g => (
        <optgroup key={g.subcategoria} label={g.subcategoria}>
          {g.items.map(b => <option key={b.id} value={b.id}>{b.objeto}</option>)}
        </optgroup>
      ))}
    </>
  );
}

// Helper genérico: agrupa items por níveis compostos e renderiza <optgroup> com rótulo composto.
// Como o HTML não permite aninhar <optgroup>, os níveis são unidos por " · " no label.
// items: array; grupoFns: array de (item) => string (chave de cada nível);
// optionFn: (item) => <option>; extraOption: <option> extra (renderizado antes dos grupos);
// sortItems: comparator que ordena os items antes de agrupar (define a ordem dos grupos e das opções)
export function opcoesAgrupadas({ items, grupoFns, optionFn, extraOption, sortItems }) {
  const sorted = sortItems ? (items || []).slice().sort(sortItems) : (items || []);
  const map = new Map();
  sorted.forEach(item => {
    const chave = grupoFns.map(fn => fn(item) || "—").join(" · ");
    if (!map.has(chave)) map.set(chave, []);
    map.get(chave).push(item);
  });
  return (
    <>
      {extraOption}
      {Array.from(map.entries()).map(([chave, itens]) => (
        <optgroup key={chave} label={chave}>
          {itens.map(optionFn)}
        </optgroup>
      ))}
    </>
  );
}

// Renderiza <option> de todos os bens do catálogo agrupados por categoria → subcategoria (rótulo composto).
// Mantém o item selecionado visível mesmo se estiver oculto ou fora do filtro.
export function opcoesBensTodasCategorias(catalog, sel) {
  const visiveis = (catalog || []).filter(b => !b.oculto);
  let extra = null;
  if (sel && !visiveis.find(b => b.id === sel)) {
    const atual = (catalog || []).find(b => b.id === sel);
    if (atual) extra = <option key="_extra" value={atual.id}>{atual.objeto} (fora da categoria)</option>;
  }
  const idxCat = (c) => { const i = ORDEM.indexOf(c); return i === -1 ? 999 : i; };
  return opcoesAgrupadas({
    items: visiveis,
    grupoFns: [b => b.categoria || "Sem categoria", b => (b.subcategoria || "").trim() || "Sem subcategoria"],
    optionFn: b => <option key={b.id} value={b.id}>{b.objeto}</option>,
    extraOption: extra,
    sortItems: (a, b) => idxCat(a.categoria) - idxCat(b.categoria) || (a.subcategoria || "").localeCompare(b.subcategoria || "", "pt-BR") || (a.objeto || "").localeCompare(b.objeto || "", "pt-BR")
  });
}