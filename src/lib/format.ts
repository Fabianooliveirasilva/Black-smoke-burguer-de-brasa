const percent = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * "1 pedido", "0 pedidos", "2 pedidos". Not Intl.PluralRules: CLDR puts 0 in "one" for pt
 * ("0 pedido"), which reads wrong in Brazilian Portuguese.
 */
export function plural(count: number, one: string, other: string): string {
  return `${count.toLocaleString("pt-BR")} ${Math.abs(count) === 1 ? one : other}`;
}

/** Ratio (0–1) as a pt-BR percentage with one decimal: 0.125 -> "12,5%". */
export function formatPercent(ratio: number): string {
  return percent.format(Number.isFinite(ratio) ? ratio : 0).replace(/\s/g, "");
}
