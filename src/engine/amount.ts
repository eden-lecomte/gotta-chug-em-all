import type { Amount } from '../data/types';
import type { ResolveCtx } from './types';

/**
 * Evaluate an Amount expression to a concrete number of drinks/turns.
 * Results are clamped at zero — no rule in the game means "drink -1".
 */
export function resolveAmount(amount: Amount, ctx: ResolveCtx): number {
  return Math.max(0, evaluate(amount, ctx));
}

function evaluate(amount: Amount, ctx: ResolveCtx): number {
  switch (amount.kind) {
    case 'fixed':
      return amount.value;
    case 'full':
      return ctx.config.fullDrink;
    case 'perPlayer':
      return ctx.playerCount;
    case 'var': {
      const value = ctx.vars[amount.name];
      if (value === undefined) {
        throw new Error(`Amount referenced unbound variable "${amount.name}"`);
      }
      return value;
    }
    case 'sum':
      return evaluate(amount.a, ctx) + evaluate(amount.b, ctx);
    case 'product':
      return evaluate(amount.a, ctx) * evaluate(amount.b, ctx);
    case 'offset':
      return evaluate(amount.of, ctx) + amount.delta;
    case 'half': {
      const value = evaluate(amount.of, ctx) / 2;
      return amount.round === 'up' ? Math.ceil(value) : Math.floor(value);
    }
  }
}
