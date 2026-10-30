// Servidor da loja de demonstração: páginas HTML renderizadas no servidor e
// uma API REST em /api. Usa só a biblioteca padrão do Node para subir rápido
// no CI e não depender de nenhum serviço externo.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import * as loja from './loja.mjs';

const PORTA = Number(process.env.PORT ?? 3000);
const COOKIE = 'sessao';
const estilos = await readFile(new URL('./estilos.css', import.meta.url), 'utf8');

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

// ---------- utilitários HTTP ----------

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let corpo = '';
    req.on('data', (parte) => {
      corpo += parte;
      if (corpo.length > 1e5) reject(new loja.ErroLoja(413, 'Corpo muito grande.'));
    });
    req.on('end', () => resolve(corpo));
    req.on('error', reject);
  });
}

async function lerFormulario(req) {
  return Object.fromEntries(new URLSearchParams(await lerCorpo(req)));
}

async function lerJson(req) {
  const corpo = await lerCorpo(req);
  if (!corpo) return {};
  try {
    return JSON.parse(corpo);
  } catch {
    throw new loja.ErroLoja(400, 'JSON inválido.');
  }
}

function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie ?? '')
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([nome]) => nome),
  );
}

function json(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
}

function redirecionar(res, destino, cabecalhos = {}) {
  res.writeHead(303, { Location: destino, ...cabecalhos });
  res.end();
}

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// ---------- layout das páginas ----------

function pagina(res, { titulo, sessao, conteudo, status = 200 }) {
  const qtd = sessao ? loja.carrinho(sessao).quantidadeTotal : 0;
  const conta = sessao
    ? `<span>Olá, ${escapar(sessao.usuario.nome)}</span>
       <form method="post" action="/sair"><button type="submit" class="link">Sair</button></form>`
    : `<a href="/login">Entrar</a>`;
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapar(titulo)} | Loja Demo</title>
  <style>${estilos}</style>
</head>
<body>
  <header class="topo">
    <a class="marca" href="/">Loja Demo</a>
    <nav aria-label="Principal">
      <a href="/carrinho">Carrinho (<span aria-label="${qtd} itens">${qtd}</span>)</a>
      ${conta}
    </nav>
  </header>
  <main>
    ${conteudo}
  </main>
  <footer class="rodape">
    <p>Loja fictícia para testes automatizados. <span class="gerado-em">Página gerada em ${dataHora.format(new Date())}</span></p>
  </footer>
</body>
</html>`);
}

function formularioBusca(termo = '') {
  return `<form class="busca" role="search" method="get" action="/busca">
    <label for="q">Buscar produtos</label>
    <input id="q" name="q" type="search" value="${escapar(termo)}">
    <button type="submit">Buscar</button>
  </form>`;
}

function listaProdutos(itens) {
  if (itens.length === 0) return '<p>Nenhum produto encontrado.</p>';
  return `<ul class="produtos">${itens
    .map(
      (p) => `<li class="produto">
        <h2>${escapar(p.nome)}</h2>
        <p class="categoria">${escapar(p.categoria)}</p>
        <p class="preco">${moeda.format(p.preco)}</p>
        ${
          p.estoque > 0
            ? `<form method="post" action="/carrinho/adicionar">
                 <input type="hidden" name="produtoId" value="${p.id}">
                 <button type="submit">Adicionar ao carrinho<span class="sr-only"> ${escapar(p.nome)}</span></button>
               </form>`
            : '<p class="esgotado">Esgotado</p>'
        }
      </li>`,
    )
    .join('')}</ul>`;
}

function alerta(mensagem) {
  return mensagem ? `<div class="alerta" role="alert">${escapar(mensagem)}</div>` : '';
}

// ---------- páginas ----------

const paginas = {
  'GET /': (req, res, { sessao }) =>
    pagina(res, {
      titulo: 'Início',
      sessao,
      conteudo: `<h1>Produtos</h1>${formularioBusca()}${listaProdutos(loja.buscarProdutos())}`,
    }),

  'GET /busca': (req, res, { sessao, url }) => {
    const termo = url.searchParams.get('q') ?? '';
    const itens = loja.buscarProdutos(termo);
    pagina(res, {
      titulo: `Busca: ${termo}`,
      sessao,
      conteudo: `<h1>Resultados para “${escapar(termo)}”</h1>${formularioBusca(termo)}
        <p role="status">${itens.length} produto(s) encontrado(s)</p>${listaProdutos(itens)}`,
    });
  },

  'GET /login': (req, res, { sessao, url }) => telaLogin(res, sessao, url.searchParams.get('destino')),

  'POST /login': async (req, res) => {
    const { email, senha, destino } = await lerFormulario(req);
    try {
      const { token } = loja.autenticar(email, senha);
      redirecionar(res, destinoSeguro(destino), {
        'Set-Cookie': `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/`,
      });
    } catch (erro) {
      if (!(erro instanceof loja.ErroLoja)) throw erro;
      telaLogin(res, undefined, destino, erro.message, email, 401);
    }
  },

  'POST /sair': (req, res, { token }) => {
    loja.encerrar(token);
    redirecionar(res, '/', { 'Set-Cookie': `${COOKIE}=; Max-Age=0; Path=/` });
  },

  'POST /carrinho/adicionar': async (req, res, { sessao }) => {
    const { produtoId } = await lerFormulario(req);
    if (!sessao) return redirecionar(res, '/login?destino=/carrinho');
    try {
      loja.adicionarAoCarrinho(sessao, produtoId, 1);
      redirecionar(res, '/carrinho');
    } catch (erro) {
      if (!(erro instanceof loja.ErroLoja)) throw erro;
      telaCarrinho(res, sessao, erro.message, erro.status);
    }
  },

  'POST /carrinho/remover': async (req, res, { sessao }) => {
    if (!sessao) return redirecionar(res, '/login?destino=/carrinho');
    const { produtoId } = await lerFormulario(req);
    try {
      loja.removerDoCarrinho(sessao, produtoId);
    } catch (erro) {
      if (!(erro instanceof loja.ErroLoja)) throw erro;
    }
    redirecionar(res, '/carrinho');
  },

  'GET /carrinho': (req, res, { sessao }) => {
    if (!sessao) return redirecionar(res, '/login?destino=/carrinho');
    telaCarrinho(res, sessao);
  },

  'GET /checkout': (req, res, { sessao }) => {
    if (!sessao) return redirecionar(res, '/login?destino=/checkout');
    if (loja.carrinho(sessao).itens.length === 0) return redirecionar(res, '/carrinho');
    telaCheckout(res, sessao, {});
  },

  'POST /checkout': async (req, res, { sessao }) => {
    if (!sessao) return redirecionar(res, '/login?destino=/checkout');
    const dados = await lerFormulario(req);
    try {
      const pedido = loja.finalizarCompra(sessao, dados);
      redirecionar(res, `/pedidos/${pedido.id}`);
    } catch (erro) {
      if (!(erro instanceof loja.ErroLoja)) throw erro;
      telaCheckout(res, sessao, dados, erro.message, erro.status);
    }
  },
};

function destinoSeguro(destino) {
  // Só aceita caminhos internos para evitar redirecionamento aberto.
  return typeof destino === 'string' && /^\/(?!\/)/.test(destino) ? destino : '/';
}

function telaLogin(res, sessao, destino, erro = '', email = '', status = 200) {
  pagina(res, {
    titulo: 'Entrar',
    sessao,
    status,
    conteudo: `<h1>Entrar</h1>${alerta(erro)}
      <form class="formulario" method="post" action="/login">
        <input type="hidden" name="destino" value="${escapar(destinoSeguro(destino))}">
        <label for="email">E-mail</label>
        <input id="email" name="email" type="email" autocomplete="username" required value="${escapar(email)}">
        <label for="senha">Senha</label>
        <input id="senha" name="senha" type="password" autocomplete="current-password" required>
        <button type="submit">Entrar</button>
      </form>`,
  });
}

function telaCarrinho(res, sessao, erro = '', status = 200) {
  const { itens, total } = loja.carrinho(sessao);
  const corpo =
    itens.length === 0
      ? '<p>Seu carrinho está vazio.</p><p><a href="/">Continuar comprando</a></p>'
      : `<table>
          <caption class="sr-only">Itens no carrinho</caption>
          <thead><tr><th scope="col">Produto</th><th scope="col">Quantidade</th><th scope="col">Preço unitário</th><th scope="col">Subtotal</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
          <tbody>${itens
            .map(
              (i) => `<tr>
                <td>${escapar(i.nome)}</td><td>${i.quantidade}</td>
                <td>${moeda.format(i.precoUnitario)}</td><td>${moeda.format(i.subtotal)}</td>
                <td><form method="post" action="/carrinho/remover">
                  <input type="hidden" name="produtoId" value="${i.produtoId}">
                  <button type="submit" class="secundario" aria-label="Remover ${escapar(i.nome)}">Remover</button>
                </form></td>
              </tr>`,
            )
            .join('')}</tbody>
        </table>
        <p class="total">Total: <strong>${moeda.format(total)}</strong></p>
        <p><a class="botao" href="/checkout">Finalizar compra</a></p>`;
  pagina(res, { titulo: 'Carrinho', sessao, status, conteudo: `<h1>Carrinho</h1>${alerta(erro)}${corpo}` });
}

function telaCheckout(res, sessao, dados, erro = '', status = 200) {
  const { total } = loja.carrinho(sessao);
  const marcado = (valor) => (dados.pagamento === valor ? 'checked' : '');
  pagina(res, {
    titulo: 'Finalizar compra',
    sessao,
    status,
    conteudo: `<h1>Finalizar compra</h1>${alerta(erro)}
      <p>Total a pagar: <strong>${moeda.format(total)}</strong></p>
      <form class="formulario" method="post" action="/checkout">
        <label for="nome">Nome completo</label>
        <input id="nome" name="nome" autocomplete="name" required value="${escapar(dados.nome ?? '')}">
        <label for="cep">CEP</label>
        <input id="cep" name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" required value="${escapar(dados.cep ?? '')}">
        <label for="endereco">Endereço</label>
        <input id="endereco" name="endereco" autocomplete="street-address" required value="${escapar(dados.endereco ?? '')}">
        <fieldset>
          <legend>Forma de pagamento</legend>
          <label><input type="radio" name="pagamento" value="pix" ${marcado('pix')}> Pix</label>
          <label><input type="radio" name="pagamento" value="boleto" ${marcado('boleto')}> Boleto</label>
          <label><input type="radio" name="pagamento" value="cartao" ${marcado('cartao')}> Cartão de crédito</label>
        </fieldset>
        <button type="submit">Confirmar pedido</button>
      </form>`,
  });
}

function telaPedido(res, sessao, id) {
  const pedido = loja.pedidoDoCliente(sessao, id);
  pagina(res, {
    titulo: 'Pedido confirmado',
    sessao,
    conteudo: `<h1>Pedido confirmado</h1>
      <p role="status">Obrigado! Seu pedido <strong class="numero-pedido">nº ${pedido.id}</strong> foi recebido.</p>
      <p>Total: <strong>${moeda.format(pedido.total)}</strong></p>
      <p><a href="/">Voltar à loja</a></p>`,
  });
}

// ---------- API REST ----------

function exigirSessao(sessao) {
  if (!sessao) throw new loja.ErroLoja(401, 'Autenticação necessária.');
  return sessao;
}

async function api(req, res, { sessao, url, caminho }) {
  const rota = `${req.method} ${caminho}`;
  let m;
  if (rota === 'GET /api/saude') return json(res, 200, { status: 'ok' });
  if (rota === 'POST /api/login') {
    const { email, senha } = await lerJson(req);
    return json(res, 200, loja.autenticar(email, senha));
  }
  if (rota === 'GET /api/produtos') {
    const itens = loja.buscarProdutos(url.searchParams.get('q') ?? '');
    return json(res, 200, { total: itens.length, itens });
  }
  if (req.method === 'GET' && (m = caminho.match(/^\/api\/produtos\/(\d+)$/))) {
    const p = loja.produto(m[1]);
    if (!p) throw new loja.ErroLoja(404, 'Produto não encontrado.');
    return json(res, 200, p);
  }
  if (rota === 'GET /api/carrinho') return json(res, 200, loja.carrinho(exigirSessao(sessao)));
  if (rota === 'POST /api/carrinho/itens') {
    const s = exigirSessao(sessao);
    const { produtoId, quantidade = 1 } = await lerJson(req);
    return json(res, 201, loja.adicionarAoCarrinho(s, produtoId, quantidade));
  }
  if (req.method === 'DELETE' && (m = caminho.match(/^\/api\/carrinho\/itens\/(\d+)$/))) {
    return json(res, 200, loja.removerDoCarrinho(exigirSessao(sessao), m[1]));
  }
  if (rota === 'POST /api/pedidos') {
    const s = exigirSessao(sessao);
    return json(res, 201, loja.finalizarCompra(s, await lerJson(req)));
  }
  if (req.method === 'GET' && (m = caminho.match(/^\/api\/pedidos\/(\d+)$/))) {
    return json(res, 200, loja.pedidoDoCliente(exigirSessao(sessao), m[1]));
  }
  throw new loja.ErroLoja(404, 'Rota não encontrada.');
}

// ---------- servidor ----------

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const caminho = url.pathname.replace(/\/+$/, '') || '/';
  const bearer = (req.headers.authorization ?? '').match(/^Bearer (.+)$/)?.[1];
  const token = caminho.startsWith('/api/') ? bearer : cookies(req)[COOKIE];
  const contexto = { url, caminho, token, sessao: loja.sessao(token) };

  try {
    if (caminho.startsWith('/api/')) return await api(req, res, contexto);
    const m = caminho.match(/^\/pedidos\/(\d+)$/);
    if (req.method === 'GET' && m) {
      if (!contexto.sessao) return redirecionar(res, '/login');
      return telaPedido(res, contexto.sessao, m[1]);
    }
    const manipulador = paginas[`${req.method} ${caminho}`];
    if (!manipulador) throw new loja.ErroLoja(404, 'Página não encontrada.');
    await manipulador(req, res, contexto);
  } catch (erro) {
    const status = erro instanceof loja.ErroLoja ? erro.status : 500;
    if (status === 500) console.error(erro);
    const mensagem = status === 500 ? 'Erro interno.' : erro.message;
    if (caminho.startsWith('/api/')) return json(res, status, { erro: mensagem });
    pagina(res, {
      titulo: 'Erro',
      sessao: contexto.sessao,
      status,
      conteudo: `<h1>${status === 404 ? 'Página não encontrada' : 'Algo deu errado'}</h1>${alerta(mensagem)}<p><a href="/">Voltar à loja</a></p>`,
    });
  }
});

servidor.listen(PORTA, () => console.log(`Loja Demo em http://localhost:${PORTA}`));
