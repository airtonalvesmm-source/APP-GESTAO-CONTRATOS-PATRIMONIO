// Utilitários de hierarquia de departamentos (árvore flexível via paiId)
import { norm } from "@/lib/dmp-utils";

function porId(departamentos) {
  const m = new Map();
  (departamentos || []).forEach(d => m.set(d.id, d));
  return m;
}

// Caminho completo da raiz até o departamento: "SEDE TERESINA › SEDE LESTE › PROCON..."
export function caminhoDepartamento(dep, departamentos) {
  if (!dep) return "";
  const map = porId(departamentos);
  const partes = [];
  let cur = dep;
  let guard = 0;
  while (cur && guard < 30) {
    partes.unshift(cur.nome);
    cur = cur.paiId ? map.get(cur.paiId) : null;
    guard++;
  }
  return partes.join(" › ");
}

// Rótulo do optgroup: ancestrais sem o próprio nó (ex.: "SEDE TERESINA › SEDE LESTE")
export function grupoDepartamento(dep, departamentos) {
  if (!dep || !dep.paiId) return "Sem hierarquia";
  const map = porId(departamentos);
  const partes = [];
  let cur = map.get(dep.paiId);
  let guard = 0;
  while (cur && guard < 30) {
    partes.unshift(cur.nome);
    cur = cur.paiId ? map.get(cur.paiId) : null;
    guard++;
  }
  return partes.join(" › ") || "Sem hierarquia";
}

// Agrupa departamentos por rótulo de optgroup (ancestrais), ordenado alfabeticamente
export function optgroupsDepartamentos(departamentos) {
  const grupos = new Map();
  (departamentos || []).forEach(d => {
    const g = grupoDepartamento(d, departamentos);
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push(d);
  });
  return Array.from(grupos.entries())
    .sort((a, b) => {
      if (a[0] === "Sem hierarquia") return 1;
      if (b[0] === "Sem hierarquia") return -1;
      return norm(a[0]).localeCompare(norm(b[0]), "pt-BR");
    })
    .map(([label, items]) => ({
      label,
      items: items.slice().sort((a, b) => norm(a.nome).localeCompare(b.nome, "pt-BR"))
    }));
}