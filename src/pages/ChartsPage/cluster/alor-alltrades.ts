import type { AlorApi } from 'alor-api';
import type { AlorMoexAlltrade } from './cluster-chart-today';

const ALOR_MD_BASE = 'https://api.alor.ru';
const PAGE_TAKE = 1000;
const MAX_PAGES = 40;

/**
 * REST alltrades Alor MD за интервал [fromSec, toSec].
 */
export async function fetchAlorAlltrades(
  api: AlorApi,
  symbol: string,
  options: {
    /** Unix sec */
    fromSec: number;
    /** Unix sec */
    toSec: number;
    /** Abort */
    signal?: AbortSignal;
  },
): Promise<AlorMoexAlltrade[]> {
  const ticker = symbol.trim();
  if (!ticker) return [];
  const token = api.accessToken?.trim();
  if (!token) {
    throw new Error('Нет Alor accessToken для alltrades');
  }

  const out: AlorMoexAlltrade[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    if (options.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const query = new URLSearchParams({
      format: 'Slim',
      take: String(PAGE_TAKE),
      offset: String(offset),
      descending: 'false',
      includeVirtualTrades: 'false',
      from: String(Math.floor(options.fromSec)),
      to: String(Math.ceil(options.toSec)),
    });
    const url =
      `${ALOR_MD_BASE}/md/v2/Securities/MOEX/` +
      `${encodeURIComponent(ticker)}/alltrades?${query.toString()}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: options.signal,
    });
    if (!res.ok) {
      throw new Error(`Alor alltrades HTTP ${res.status}`);
    }
    const data = (await res.json()) as unknown;
    const batch = Array.isArray(data) ? (data as AlorMoexAlltrade[]) : [];
    if (!batch.length) break;
    out.push(...batch);
    if (batch.length < PAGE_TAKE) break;
    offset += batch.length;
  }

  return out;
}
