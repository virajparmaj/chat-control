const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  JPY: '\u00A5',
  CAD: 'CA$',
  AUD: 'A$',
  INR: '\u20B9',
  BRL: 'R$',
  KRW: '\u20A9',
  MXN: 'MX$',
  PHP: '\u20B1',
  THB: '\u0E3F',
  TWD: 'NT$',
  SGD: 'S$',
  HKD: 'HK$'
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  } catch {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency
    return `${symbol}${amount.toFixed(2)}`
  }
}

export function formatCompactCurrency(amount: number, currency: string): string {
  if (amount >= 1000) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(amount)
    } catch {
      return formatCurrency(amount, currency)
    }
  }
  return formatCurrency(amount, currency)
}
