import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Grava contrato/empenho validando o saldo da ata no servidor.
// Consolida linhas repetidas do mesmo item e desfaz a gravação se outra
// gravação simultânea consumir o mesmo saldo.

const INATIVAS = ['Cancelado', 'Rescindido'];
const LOTE = 500;

const qtd = (v) => {
  const n = Number(String(v ?? '').toString().replace(',', '.'));
  return isFinite(n) && n > 0 ? n : 0;
};

async function listarContratosDaAta(entity, ataId) {
  const out = [];
  let cursor;
  for (;;) {
    const opts = { limit: LOTE, sort: '-created_date' };
    if (cursor) opts.cursor = cursor;
    const page = await entity.filter({ ataId }, opts);
    out.push(...(page.items || []));
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return out;
}

function consumirMapa(contratos, ignorarId) {
  const consumido = new Map();
  contratos.forEach(c => {
    if (c.id === ignorarId) return;
    if (INATIVAS.includes(c.situacao)) return;
    (c.itens || []).forEach(i => {
      if (!i.itemAtaId) return;
      consumido.set(i.itemAtaId, (consumido.get(i.itemAtaId) || 0) + qtd(i.qtd));
    });
  });
  return consumido;
}

function limpar(r) {
  const { id, created_date, updated_date, created_by_id, created_by, ...resto } = r;
  return resto;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Somente administradores podem gravar lançamentos.' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const contratoId = body.contratoId || null;
    const dados = body.dados || {};
    if (!String(dados.numero || '').trim()) {
      return Response.json({ error: 'Informe o número do contrato ou empenho.' }, { status: 400 });
    }

    // Consolida linhas repetidas do mesmo item antes de validar
    const consolidados = [];
    const porChave = new Map();
    (dados.itens || []).forEach(i => {
      const q = qtd(i.qtd);
      if (!q) return;
      const chave = i.itemAtaId ? `ata:${i.itemAtaId}` : `bem:${i.benId}`;
      const atual = porChave.get(chave);
      if (atual) {
        atual.qtd += q;
      } else {
        const novo = { ...i, qtd: q, valor: Number(i.valor) || 0 };
        porChave.set(chave, novo);
        consolidados.push(novo);
      }
    });
    if (!consolidados.length) {
      return Response.json({ error: 'Informe ao menos um item com quantidade.' }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;
    const ataId = dados.ataId || '';
    let ata = null;

    if (ataId) {
      ata = await db.Ata.get(ataId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!ata) return Response.json({ error: 'Ata vinculada não encontrada.' }, { status: 404 });

      const contratos = await listarContratosDaAta(db.Contrato, ataId);
      const consumido = consumirMapa(contratos, contratoId);

      const benIds = Array.from(new Set(consolidados.map(i => i.benId).filter(Boolean)));
      const bens = benIds.length ? await db.CatalogItem.filter({ id: { $in: benIds } }, { limit: 500 }) : { items: [] };
      const nomes = new Map(((bens && bens.items) || []).map(b => [b.id, b.objeto]));

      for (const it of consolidados) {
        const orig = (ata.itens || []).find(x => x.id === it.itemAtaId);
        if (!orig) {
          return Response.json({ error: 'Há item sem vínculo com a ata selecionada. Recarregue os dados e tente novamente.' }, { status: 400 });
        }
        const disponivel = qtd(orig.qtd) - (consumido.get(orig.id) || 0);
        if (it.qtd > disponivel + 1e-9) {
          const nome = nomes.get(orig.benId) || 'item';
          return Response.json({ error: `Saldo insuficiente em "${nome}": disponível ${disponivel.toLocaleString('pt-BR')}, solicitado ${it.qtd.toLocaleString('pt-BR')}.` }, { status: 409 });
        }
      }
    }

    const dadosFinais = { ...dados, itens: consolidados };

    let anterior = null;
    let salvo = null;
    if (contratoId) {
      anterior = await db.Contrato.get(contratoId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!anterior) return Response.json({ error: 'Lançamento não encontrado.' }, { status: 404 });
      salvo = await db.Contrato.update(contratoId, dadosFinais);
    } else {
      salvo = await db.Contrato.create(dadosFinais);
    }

    // Reconferência: detecta gravações simultâneas que ultrapassaram o saldo
    if (ataId) {
      const contratos = await listarContratosDaAta(db.Contrato, ataId);
      const consumido = consumirMapa(contratos, null);
      const ataAtual = await db.Ata.get(ataId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      const estourou = (ataAtual?.itens || []).some(x => (consumido.get(x.id) || 0) > qtd(x.qtd) + 1e-9);
      if (estourou) {
        if (contratoId && anterior) await db.Contrato.update(contratoId, limpar(anterior));
        else if (salvo?.id) await db.Contrato.delete(salvo.id);
        return Response.json({ error: 'Outra gravação consumiu o mesmo saldo ao mesmo tempo. Nada foi alterado: recarregue os dados e tente novamente.' }, { status: 409 });
      }
    }

    return Response.json({ ok: true, id: salvo?.id || contratoId, itens: consolidados.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}