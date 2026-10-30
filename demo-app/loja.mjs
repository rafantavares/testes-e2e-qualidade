// Regras de negócio da loja, compartilhadas pelas páginas e pela API.
// O estado fica em memória e é isolado por sessão: cada login cria um
// carrinho novo, o que permite rodar os testes em paralelo sem interferência.

import { randomUUID } from 'node:crypto';
import { produtos, usuarios } from './dados.mjs';

const sessoes = new Map(); // token -> { usuario, carrinho: Map<produtoId, quantidade> }
const pedidos = new Map(); // id -> pedido
let proximoPedido = 1000;

export class ErroLoja extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export function autenticar(email, senha) {
  const usuario = usuarios.find((u) => u.email === String(email ?? '').trim().toLowerCase());
  if (!usuario || usuario.senha !== senha) {
    throw new ErroLoja(401, 'E-mail ou senha inválidos.');
  }
  const token = randomUUID();
  sessoes.set(token, { usuario: { nome: usuario.nome, email: usuario.email }, carrinho: new Map() });
  return { token, usuario: { nome: usuario.nome, email: usuario.email } };
}

export function sessao(token) {
  return token ? sessoes.get(token) : undefined;
}

export function encerrar(token) {
  sessoes.delete(token);
}

export function buscarProdutos(termo = '') {
  const normalizar = (texto) =>
    texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const alvo = normalizar(String(termo).trim());
  return produtos.filter(
    (p) => !alvo || normalizar(p.nome).includes(alvo) || normalizar(p.categoria).includes(alvo),
  );
}

export function produto(id) {
  return produtos.find((p) => p.id === Number(id));
}

export function carrinho(s) {
  const itens = [...s.carrinho].map(([produtoId, quantidade]) => {
    const p = produto(produtoId);
    return {
      produtoId,
      nome: p.nome,
      precoUnitario: p.preco,
      quantidade,
      subtotal: arredondar(p.preco * quantidade),
    };
  });
  const total = arredondar(itens.reduce((soma, i) => soma + i.subtotal, 0));
  return { itens, quantidadeTotal: itens.reduce((n, i) => n + i.quantidade, 0), total };
}

export function adicionarAoCarrinho(s, produtoId, quantidade = 1) {
  const p = produto(produtoId);
  if (!p) throw new ErroLoja(404, 'Produto não encontrado.');
  const qtd = Number(quantidade);
  if (!Number.isInteger(qtd) || qtd < 1) throw new ErroLoja(400, 'Quantidade inválida.');
  const novaQuantidade = (s.carrinho.get(p.id) ?? 0) + qtd;
  if (novaQuantidade > p.estoque) throw new ErroLoja(409, 'Estoque insuficiente.');
  s.carrinho.set(p.id, novaQuantidade);
  return carrinho(s);
}

export function removerDoCarrinho(s, produtoId) {
  if (!s.carrinho.delete(Number(produtoId))) {
    throw new ErroLoja(404, 'Item não está no carrinho.');
  }
  return carrinho(s);
}

export function finalizarCompra(s, dados) {
  const { nome, cep, endereco, pagamento } = dados ?? {};
  const atual = carrinho(s);
  if (atual.itens.length === 0) throw new ErroLoja(400, 'O carrinho está vazio.');
  const erros = [];
  if (!String(nome ?? '').trim()) erros.push('Informe o nome completo.');
  if (!/^\d{5}-?\d{3}$/.test(String(cep ?? '').trim())) erros.push('Informe um CEP válido (00000-000).');
  if (!String(endereco ?? '').trim()) erros.push('Informe o endereço de entrega.');
  if (!['pix', 'boleto', 'cartao'].includes(pagamento)) erros.push('Escolha a forma de pagamento.');
  if (erros.length) throw new ErroLoja(400, erros.join(' '));

  const pedido = {
    id: proximoPedido++,
    status: 'confirmado',
    cliente: s.usuario.email,
    entrega: { nome: nome.trim(), cep: cep.trim(), endereco: endereco.trim() },
    pagamento,
    itens: atual.itens,
    total: atual.total,
    criadoEm: new Date().toISOString(),
  };
  pedidos.set(pedido.id, pedido);
  s.carrinho.clear();
  return pedido;
}

export function pedidoDoCliente(s, id) {
  const p = pedidos.get(Number(id));
  if (!p || p.cliente !== s.usuario.email) throw new ErroLoja(404, 'Pedido não encontrado.');
  return p;
}

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}
