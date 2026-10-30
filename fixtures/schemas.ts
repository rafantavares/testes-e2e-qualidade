// Contratos (JSON Schema) das respostas da API. `additionalProperties: false`
// faz o teste falhar também quando a API passa a expor um campo novo sem aviso.

import Ajv, { type JSONSchemaType } from 'ajv';

export interface Erro {
  erro: string;
}

export interface Produto {
  id: number;
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
}

export interface ListaProdutos {
  total: number;
  itens: Produto[];
}

export interface Login {
  token: string;
  usuario: { nome: string; email: string };
}

export interface ItemCarrinho {
  produtoId: number;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  subtotal: number;
}

export interface Carrinho {
  itens: ItemCarrinho[];
  quantidadeTotal: number;
  total: number;
}

export interface Pedido {
  id: number;
  status: 'confirmado';
  cliente: string;
  entrega: { nome: string; cep: string; endereco: string };
  pagamento: 'pix' | 'boleto' | 'cartao';
  itens: ItemCarrinho[];
  total: number;
  criadoEm: string;
}

const ajv = new Ajv({ allErrors: true });

const texto = { type: 'string', minLength: 1 } as const;
const dinheiro = { type: 'number', minimum: 0 } as const;

const erro: JSONSchemaType<Erro> = {
  type: 'object',
  properties: { erro: texto },
  required: ['erro'],
  additionalProperties: false,
};

const produto: JSONSchemaType<Produto> = {
  type: 'object',
  properties: {
    id: { type: 'integer', minimum: 1 },
    nome: texto,
    categoria: texto,
    preco: dinheiro,
    estoque: { type: 'integer', minimum: 0 },
  },
  required: ['id', 'nome', 'categoria', 'preco', 'estoque'],
  additionalProperties: false,
};

const listaProdutos: JSONSchemaType<ListaProdutos> = {
  type: 'object',
  properties: { total: { type: 'integer', minimum: 0 }, itens: { type: 'array', items: produto } },
  required: ['total', 'itens'],
  additionalProperties: false,
};

const login: JSONSchemaType<Login> = {
  type: 'object',
  properties: {
    token: { type: 'string', pattern: '^[0-9a-f-]{36}$' },
    usuario: {
      type: 'object',
      properties: { nome: texto, email: { type: 'string', pattern: '^[^@\\s]+@[^@\\s]+$' } },
      required: ['nome', 'email'],
      additionalProperties: false,
    },
  },
  required: ['token', 'usuario'],
  additionalProperties: false,
};

const itemCarrinho: JSONSchemaType<ItemCarrinho> = {
  type: 'object',
  properties: {
    produtoId: { type: 'integer', minimum: 1 },
    nome: texto,
    precoUnitario: dinheiro,
    quantidade: { type: 'integer', minimum: 1 },
    subtotal: dinheiro,
  },
  required: ['produtoId', 'nome', 'precoUnitario', 'quantidade', 'subtotal'],
  additionalProperties: false,
};

const carrinho: JSONSchemaType<Carrinho> = {
  type: 'object',
  properties: {
    itens: { type: 'array', items: itemCarrinho },
    quantidadeTotal: { type: 'integer', minimum: 0 },
    total: dinheiro,
  },
  required: ['itens', 'quantidadeTotal', 'total'],
  additionalProperties: false,
};

const pedido: JSONSchemaType<Pedido> = {
  type: 'object',
  properties: {
    id: { type: 'integer', minimum: 1 },
    status: { type: 'string', const: 'confirmado' },
    cliente: texto,
    entrega: {
      type: 'object',
      properties: { nome: texto, cep: { type: 'string', pattern: '^\\d{5}-?\\d{3}$' }, endereco: texto },
      required: ['nome', 'cep', 'endereco'],
      additionalProperties: false,
    },
    pagamento: { type: 'string', enum: ['pix', 'boleto', 'cartao'] },
    itens: { type: 'array', items: itemCarrinho, minItems: 1 },
    total: dinheiro,
    // Data ISO 8601 em UTC, como `new Date().toISOString()`.
    criadoEm: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$' },
  },
  required: ['id', 'status', 'cliente', 'entrega', 'pagamento', 'itens', 'total', 'criadoEm'],
  additionalProperties: false,
};

export const schemas = {
  erro: ajv.compile(erro),
  produto: ajv.compile(produto),
  listaProdutos: ajv.compile(listaProdutos),
  login: ajv.compile(login),
  carrinho: ajv.compile(carrinho),
  pedido: ajv.compile(pedido),
};
