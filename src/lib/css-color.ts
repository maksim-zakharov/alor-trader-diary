/**
 * Читает CSS-переменную с элемента (по умолчанию `:root`).
 * Для canvas: `fillStyle` не понимает `var(...)`, нужен computed-цвет.
 */
export function readCssVar(
  name: string,
  fallback: string,
  el: Element | null = typeof document !== 'undefined' ? document.documentElement : null,
): string {
  if (!el || typeof getComputedStyle === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || fallback;
}
