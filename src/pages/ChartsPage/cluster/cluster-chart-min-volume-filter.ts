/** localStorage: карта фильтров мин. объёма по тикеру. */
const BY_SYMBOL_KEY = 'cluster-chart-min-volume-filter-by-symbol';

/** Legacy: один глобальный фильтр на все тикеры. */
const LEGACY_GLOBAL_KEY = 'cluster-chart-min-volume-filter';

/** Карта «тикер → строка фильтра». */
export type ClusterChartMinVolumeFilterBySymbol = Record<string, string>;

/**
 * Нормализует ключ тикера.
 */
function normalizeSymbolKey(symbol: string): string {
  return String(symbol ?? '')
    .trim()
    .toUpperCase();
}

/**
 * Нормализует строку фильтра (> 0 или пусто).
 */
export function normalizeClusterChartMinVolumeFilterInput(raw: unknown): string {
  if (raw == null) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  const n = Number(trimmed.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? trimmed : '';
}

/**
 * Читает legacy-глобальный фильтр (один раз для миграции).
 */
function readLegacyGlobalFilterInput(): string {
  try {
    return normalizeClusterChartMinVolumeFilterInput(localStorage.getItem(LEGACY_GLOBAL_KEY));
  } catch {
    return '';
  }
}

/**
 * Читает карту фильтров по тикерам.
 */
export function readClusterChartMinVolumeFilterBySymbol(): ClusterChartMinVolumeFilterBySymbol {
  try {
    const raw = localStorage.getItem(BY_SYMBOL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: ClusterChartMinVolumeFilterBySymbol = {};
    for (const [symbol, value] of Object.entries(parsed as Record<string, unknown>)) {
      const key = normalizeSymbolKey(symbol);
      if (!key) continue;
      const normalized = normalizeClusterChartMinVolumeFilterInput(value);
      if (normalized) result[key] = normalized;
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Пишет карту фильтров по тикерам.
 */
export function writeClusterChartMinVolumeFilterBySymbol(
  map: ClusterChartMinVolumeFilterBySymbol,
): void {
  try {
    const cleaned: ClusterChartMinVolumeFilterBySymbol = {};
    for (const [symbol, value] of Object.entries(map)) {
      const key = normalizeSymbolKey(symbol);
      if (!key) continue;
      const normalized = normalizeClusterChartMinVolumeFilterInput(value);
      if (normalized) cleaned[key] = normalized;
    }
    if (Object.keys(cleaned).length === 0) {
      localStorage.removeItem(BY_SYMBOL_KEY);
    } else {
      localStorage.setItem(BY_SYMBOL_KEY, JSON.stringify(cleaned));
    }
    localStorage.removeItem(LEGACY_GLOBAL_KEY);
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Читает фильтр для конкретного тикера.
 * Legacy-глобальное значение переносится на первый запрошенный тикер.
 */
export function readClusterChartMinVolumeFilterForSymbol(symbol: string): string {
  const key = normalizeSymbolKey(symbol);
  if (!key) return '';
  const map = readClusterChartMinVolumeFilterBySymbol();
  if (Object.prototype.hasOwnProperty.call(map, key)) {
    return map[key] ?? '';
  }
  const legacy = readLegacyGlobalFilterInput();
  if (!legacy) return '';
  map[key] = legacy;
  writeClusterChartMinVolumeFilterBySymbol(map);
  return legacy;
}

/**
 * Обновляет фильтр одного тикера в карте и сохраняет.
 */
export function writeClusterChartMinVolumeFilterForSymbol(
  symbol: string,
  input: string,
): ClusterChartMinVolumeFilterBySymbol {
  const key = normalizeSymbolKey(symbol);
  const map = { ...readClusterChartMinVolumeFilterBySymbol() };
  if (!key) {
    writeClusterChartMinVolumeFilterBySymbol(map);
    return map;
  }
  const normalized = normalizeClusterChartMinVolumeFilterInput(input);
  if (normalized) {
    map[key] = normalized;
  } else {
    delete map[key];
  }
  writeClusterChartMinVolumeFilterBySymbol(map);
  return map;
}
