// Dados fixos da loja de demonstração. Nada aqui é real: os usuários existem
// só para os testes e as senhas são valores de exemplo.

export const usuarios = [
  { email: 'cliente@loja.test', senha: 'senha123', nome: 'Ana Cliente' },
  { email: 'outro@loja.test', senha: 'senha456', nome: 'Bruno Comprador' },
];

export const produtos = [
  { id: 1, nome: 'Teclado mecânico', categoria: 'Periféricos', preco: 349.9, estoque: 12 },
  { id: 2, nome: 'Mouse sem fio', categoria: 'Periféricos', preco: 129.9, estoque: 30 },
  { id: 3, nome: 'Monitor 24 polegadas', categoria: 'Monitores', preco: 899.0, estoque: 5 },
  { id: 4, nome: 'Monitor 27 polegadas', categoria: 'Monitores', preco: 1299.0, estoque: 3 },
  { id: 5, nome: 'Headset com microfone', categoria: 'Áudio', preco: 249.5, estoque: 18 },
  { id: 6, nome: 'Caixa de som Bluetooth', categoria: 'Áudio', preco: 199.9, estoque: 0 },
  { id: 7, nome: 'Webcam Full HD', categoria: 'Periféricos', preco: 279.0, estoque: 9 },
  { id: 8, nome: 'Cadeira ergonômica', categoria: 'Escritório', preco: 1499.9, estoque: 4 },
];
