// Exports components that are used by other packages

export { AppRouter } from './trpc/router.js';

export function booBap(a: number): number {
    const b = 3 * 2 * a;
    console.log('booBap', b);
    return b;
}