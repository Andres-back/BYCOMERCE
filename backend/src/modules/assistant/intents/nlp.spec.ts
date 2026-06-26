import { findBestIntent, tokenize } from './nlp';

describe('assistant NLP', () => {
  const intents = [
    {
      name: 'inventory.low_stock',
      examples: ['productos con poco stock', 'que productos estan agotados'],
      keywords: ['productos', 'stock', 'agotados'],
    },
    {
      name: 'finance.cash',
      examples: ['estado de mi caja', 'gastos del mes'],
      keywords: ['caja', 'gastos', 'ingresos'],
    },
  ];

  it('normalizes Spanish accents before matching', () => {
    expect(tokenize('¿Qué productos están agotados?')).toEqual(['que', 'productos', 'estan', 'agotados']);
  });

  it('matches a strong inventory question', () => {
    expect(findBestIntent('productos con poco stock', intents)?.intent).toBe('inventory.low_stock');
  });

  it('does not match weak unrelated questions', () => {
    expect(findBestIntent('cuentame un chiste de futbol', intents)).toBeNull();
  });
});
