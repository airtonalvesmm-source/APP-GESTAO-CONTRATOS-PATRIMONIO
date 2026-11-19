import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Movimenta o estoque de forma atômica:
//  - entrada: cria os bens patrimoniados a partir de um contrato entregue, conferindo o saldo
//    contratado no momento da gravação e desfazendo tudo se a movimentação falhar;
//  - saida: transfere bens em estoque para um departamento, restaurando o estado anterior em caso de falha.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Somente administradores podem movimentar o estoque.' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const db = base44.asServiceRole.entities;

    if (body.acao === 'entrada') return await entrada(db, body);
    if (body.acao === 'saida') return await saida(db, body);
    return Response.json({ error: 'Ação inválida: use "entrada" ou "saida".' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

const ehInteiroPositivo = (n) => Number.isInteger(n) && n > 0;
const emLotes = (arr, n = 100) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

async function entrada(db, body) {
  const { contratoId, placas, pagamentoId, dataEntrada } = body;
  const itens = Array.isArray(body.itens) ? body.itens : [];

  if (!contratoId) return Response.json({ error: 'Contrato não informado.' }, { status: 400 });
  if (!itens.length) return Response.json({ error: 'Selecione ao menos um item para registrar a entrada.' }, { status: 400 });
  for (const it of itens) {
    if (!it || !it.benId) return Response.json({ error: 'Item da entrada sem identificação do bem.' }, { status: 400 });
    if (!ehInteiroPositivo(Number(it.qtd))) return Response.json({ error: 'Quantidade inválida: informe um número inteiro maior que zero por item.' }, { status: 400 });
  }

  const contrato = await db.Contrato.get(contratoId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!contrato) return Response.json({ error: 'Contrato não encontrado.' }, { status: 404 });
  if (contrato.statusEntrega !== 'Entregue') {
    return Response.json({ error: `O contrato ${contrato.tipo || ''} ${contrato.numero || ''} está como "${contrato.statusEntrega || 'Aguardando entrega'}". Marque a entrega no módulo Contratos antes de patrimoniar os bens.`.replace(/\s+/g, ' ').trim() }, { status: 409 });
  }

  // Saldo contratado por bem (contrato pode ter linhas repetidas do mesmo item)
  const contratado = new Map();
  (contrato.itens || []).forEach((i) => {
    if (!i.benId) return;
    contratado.set(i.benId, (contratado.get(i.benId) || 0) + (Number(i.qtd) || 0));
  });

  const jaPatrimoniado = new Map();
  const existentes = await db.BemPatrimonial.filter({ contratoId }, '-created_date', 5000);
  existentes.forEach((b) => jaPatrimoniado.set(b.benId, (jaPatrimoniado.get(b.benId) || 0) + 1));

  const benIds = itens.map((i) => i.benId);
  const catalogo = await db.CatalogItem.filter({ id: { $in: benIds } }, '-created_date', 500);
  const nomeDe = (id) => catalogo.find((c) => c.id === id)?.objeto || 'item do contrato';

  const problemas = [];
  itens.forEach((it) => {
    const total = Number(it.qtd);
    const limite = contratado.get(it.benId) || 0;
    if (!limite) { problemas.push(`"${nomeDe(it.benId)}" não pertence a este contrato.`); return; }
    const disponivel = limite - (jaPatrimoniado.get(it.benId) || 0);
    if (total > disponivel) problemas.push(`"${nomeDe(it.benId)}": solicitado ${total}, disponível ${Math.max(0, disponivel)} (contratado ${limite}, já patrimoniado ${jaPatrimoniado.get(it.benId) || 0}).`);
  });
  if (problemas.length) {
    return Response.json({ error: 'Entrada bloqueada: ' + problemas.join(' ') }, { status: 409 });
  }

  const totalBens = itens.reduce((t, i) => t + Number(i.qtd), 0);
  const listaPlacas = (Array.isArray(placas) ? placas : []).map((p) => String(p).trim()).filter(Boolean);
  if (listaPlacas.length !== totalBens) {
    return Response.json({ error: `Foram informadas ${listaPlacas.length} placa(s) para ${totalBens} bem(ns). Ajuste a lista de placas.` }, { status: 400 });
  }
  const invalidas = listaPlacas.filter((p) => !/^\d+$/.test(p));
  if (invalidas.length) return Response.json({ error: `Placa(s) inválida(s): ${invalidas.slice(0, 5).join(', ')}. Use apenas números.` }, { status: 400 });
  const repetidas = listaPlacas.filter((p, i) => listaPlacas.indexOf(p) !== i);
  if (repetidas.length) return Response.json({ error: `Placa(s) repetida(s) na lista: ${Array.from(new Set(repetidas)).slice(0, 5).join(', ')}.` }, { status: 400 });

  const ocupadas = await db.BemPatrimonial.filter({ placa: { $in: listaPlacas } }, '-created_date', 500);
  if (ocupadas.length) {
    return Response.json({ error: `Placa(s) já cadastrada(s) no estoque: ${ocupadas.map((b) => b.placa).slice(0, 8).join(', ')}.` }, { status: 409 });
  }

  let nf = { id: '', numero: '', data: '' };
  if (pagamentoId) {
    const pg = await db.Pagamento.get(pagamentoId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!pg || pg.contratoId !== contratoId) return Response.json({ error: 'Nota fiscal inválida para este contrato.' }, { status: 400 });
    nf = { id: pg.id, numero: pg.nf || '', data: pg.dataNF || '' };
  }

  const registro = [];
  let idx = 0;
  itens.forEach((it) => {
    for (let k = 0; k < Number(it.qtd); k++) {
      registro.push({
        benId: it.benId,
        contratoId,
        pagamentoId: nf.id,
        numeroNF: nf.numero,
        dataNF: nf.data,
        placa: listaPlacas[idx++],
        situacao: 'em estoque',
        dataEntrada: dataEntrada || new Date().toISOString().slice(0, 10),
      });
    }
  });

  const criados = [];
  try {
    for (const lote of emLotes(registro)) {
      const res = await db.BemPatrimonial.bulkCreate(lote);
      (Array.isArray(res) ? res : []).forEach((r) => { if (r && r.id) criados.push(r.id); });
    }
    const movs = registro.map((r) => ({ bemId: r.placa, tipo: 'entrada', data: r.dataEntrada, observacao: 'Entrada por contrato' }));
    for (const lote of emLotes(movs)) await db.MovimentacaoEstoque.bulkCreate(lote);
  } catch (e) {
    // Desfaz a entrada parcial para não deixar bens sem movimentação
    if (criados.length) {
      try { await db.BemPatrimonial.deleteMany({ id: { $in: criados } }); } catch (_) { /* melhor esforço */ }
    }
    return Response.json({ error: 'Falha ao registrar a entrada; nenhum bem foi mantido. ' + e.message }, { status: 500 });
  }

  return Response.json({ ok: true, criados: registro.length, placas: [registro[0].placa, registro[registro.length - 1].placa] });
}

async function saida(db, body) {
  const { ids, departamentoId, observacao } = body;
  if (!Array.isArray(ids) || !ids.length) return Response.json({ error: 'Selecione ao menos um bem para dar saída.' }, { status: 400 });
  if (!departamentoId) return Response.json({ error: 'Escolha o departamento de destino.' }, { status: 400 });

  const dep = await db.Departamento.get(departamentoId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!dep) return Response.json({ error: 'Departamento de destino não encontrado.' }, { status: 404 });

  const bens = await db.BemPatrimonial.filter({ id: { $in: ids } }, '-created_date', 1000);
  if (bens.length !== ids.length) return Response.json({ error: 'Alguns bens selecionados não foram encontrados. Atualize a tela e tente novamente.' }, { status: 409 });
  const fora = bens.filter((b) => b.situacao !== 'em estoque');
  if (fora.length) {
    return Response.json({ error: `Saída bloqueada: ${fora.length} bem(ns) já saíram do estoque (placas ${fora.map((b) => b.placa).slice(0, 8).join(', ')}). Atualize a tela para ver o saldo atual.` }, { status: 409 });
  }

  const hojeIso = new Date().toISOString().slice(0, 10);
  try {
    await db.BemPatrimonial.bulkUpdate(bens.map((b) => ({ id: b.id, situacao: 'transferido', departamentoId, dataSaida: hojeIso })));
  } catch (e) {
    return Response.json({ error: 'Falha ao transferir os bens; o estoque não foi alterado. ' + e.message }, { status: 500 });
  }

  try {
    const movs = bens.map((b) => ({
      bemId: b.placa || b.id,
      tipo: 'saida',
      departamentoId,
      data: hojeIso,
      observacao: String(observacao || '').trim() || `Saída para ${dep.nome}`,
    }));
    for (const lote of emLotes(movs)) await db.MovimentacaoEstoque.bulkCreate(lote);
  } catch (e) {
    // Restaura a situação dos bens para manter estoque e histórico coerentes
    try {
      await db.BemPatrimonial.updateMany({ id: { $in: bens.map((b) => b.id) } }, { $set: { situacao: 'em estoque' }, $unset: { departamentoId: '', dataSaida: '' } });
    } catch (_) { /* melhor esforço */ }
    return Response.json({ error: 'Falha ao registrar a movimentação de saída; os bens voltaram ao estoque. ' + e.message }, { status: 500 });
  }

  return Response.json({ ok: true, transferidos: bens.length, departamento: dep.nome });
}