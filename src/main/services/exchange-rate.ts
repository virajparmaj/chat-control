interface CacheEntry {
  rates: Record<string, number>
  fetchedAt: number
}

const CACHE_TTL = 60 * 60 * 1000 // 1 hour
const cache = new Map<string, CacheEntry>()

async function fetchRates(baseCurrency: string): Promise<Record<string, number>> {
  const cached = cache.get(baseCurrency)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.rates
  }

  const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`)

  if (!response.ok) {
    // If we have stale cache, use it
    if (cached) return cached.rates
    throw new Error(`Exchange rate API failed: ${response.status}`)
  }

  const data = (await response.json()) as { result: string; rates: Record<string, number> }

  if (data.result !== 'success') {
    if (cached) return cached.rates
    throw new Error('Exchange rate API returned error')
  }

  cache.set(baseCurrency, {
    rates: data.rates,
    fetchedAt: Date.now()
  })

  return data.rates
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  if (fromCurrency === toCurrency) return amount

  try {
    const rates = await fetchRates(fromCurrency)
    const rate = rates[toCurrency]
    if (!rate) return null
    return Math.round(amount * rate * 100) / 100
  } catch {
    return null
  }
}

export async function getSupportedCurrencies(): Promise<string[]> {
  try {
    const rates = await fetchRates('USD')
    return Object.keys(rates).sort()
  } catch {
    return [
      'USD',
      'EUR',
      'GBP',
      'JPY',
      'CAD',
      'AUD',
      'INR',
      'BRL',
      'KRW',
      'MXN',
      'PHP',
      'THB',
      'TWD',
      'SGD',
      'HKD'
    ]
  }
}
