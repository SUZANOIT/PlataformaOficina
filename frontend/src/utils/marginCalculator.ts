export function calculateMargin(valorCompra: number | null | undefined, valorVenda: number | null | undefined): number {
  if (valorVenda === 0 || !valorVenda) {
    return 0;
  }
  const compra = valorCompra || 0;
  return ((valorVenda - compra) / valorVenda) * 100;
}
