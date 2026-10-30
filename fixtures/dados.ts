// Dados de teste espelhando demo-app/dados.mjs. Ficam duplicados de propósito:
// se a aplicação mudar um valor, os testes devem falhar e chamar atenção.

export const clientes = {
  ana: { email: 'cliente@loja.test', senha: 'senha123', nome: 'Ana Cliente' },
  bruno: { email: 'outro@loja.test', senha: 'senha456', nome: 'Bruno Comprador' },
} as const;

export const produtos = {
  teclado: { id: 1, nome: 'Teclado mecânico', preco: 349.9 },
  mouse: { id: 2, nome: 'Mouse sem fio', preco: 129.9 },
  monitor24: { id: 3, nome: 'Monitor 24 polegadas', preco: 899.0 },
  monitor27: { id: 4, nome: 'Monitor 27 polegadas', preco: 1299.0, estoque: 3 },
  headset: { id: 5, nome: 'Headset com microfone', preco: 249.5 },
  caixaDeSom: { id: 6, nome: 'Caixa de som Bluetooth', preco: 199.9, estoque: 0 },
} as const;

export const entrega = {
  nome: 'Ana Cliente',
  cep: '77001-002',
  endereco: 'Quadra 104 Norte, Rua NE 5, Palmas - TO',
} as const;

/** Formata como a loja exibe valores (ex.: "R$ 1.299,00"). */
export function emReais(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}
