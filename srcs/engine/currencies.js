
export const COUNTRIES = [
  
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', flag: '🇺🇸', region: 'destination' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', flag: '🇬🇧', region: 'destination' },
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$', flag: '🇦🇺', region: 'destination' },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'C$', flag: '🇨🇦', region: 'destination' },
  { code: 'DE', name: 'Germany', currency: 'EUR', symbol: '€', flag: '🇩🇪', region: 'destination' },
  { code: 'FR', name: 'France', currency: 'EUR', symbol: '€', flag: '🇫🇷', region: 'destination' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', symbol: '€', flag: '🇳🇱', region: 'destination' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', symbol: '€', flag: '🇮🇪', region: 'destination' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', symbol: 'Fr', flag: '🇨🇭', region: 'destination' },
  { code: 'CN', name: 'China', currency: 'CNY', symbol: '¥', flag: '🇨🇳', region: 'destination' },
  { code: 'JP', name: 'Japan', currency: 'JPY', symbol: '¥', flag: '🇯🇵', region: 'destination' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', symbol: '₩', flag: '🇰🇷', region: 'destination' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', symbol: 'S$', flag: '🇸🇬', region: 'destination' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', symbol: 'RM', flag: '🇲🇾', region: 'destination' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', symbol: 'NZ$', flag: '🇳🇿', region: 'destination' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', symbol: 'kr', flag: '🇸🇪', region: 'destination' },
  { code: 'NO', name: 'Norway', currency: 'NOK', symbol: 'kr', flag: '🇳🇴', region: 'destination' },
  { code: 'IT', name: 'Italy', currency: 'EUR', symbol: '€', flag: '🇮🇹', region: 'destination' },
  { code: 'ES', name: 'Spain', currency: 'EUR', symbol: '€', flag: '🇪🇸', region: 'destination' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', symbol: 'د.إ', flag: '🇦🇪', region: 'destination' },

  
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', flag: '🇮🇳', region: 'source' },
  { code: 'CN', name: 'China', currency: 'CNY', symbol: '¥', flag: '🇨🇳', region: 'source' },
  { code: 'VN', name: 'Vietnam', currency: 'VND', symbol: '₫', flag: '🇻🇳', region: 'source' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', symbol: 'Rp', flag: '🇮🇩', region: 'source' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', symbol: '₱', flag: '🇵🇭', region: 'source' },
  { code: 'TH', name: 'Thailand', currency: 'THB', symbol: '฿', flag: '🇹🇭', region: 'source' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK', symbol: 'K', flag: '🇲🇲', region: 'source' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', symbol: '৳', flag: '🇧🇩', region: 'source' },
  { code: 'NP', name: 'Nepal', currency: 'NPR', symbol: '₨', flag: '🇳🇵', region: 'source' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', symbol: '₨', flag: '🇵🇰', region: 'source' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', symbol: 'Rs', flag: '🇱🇰', region: 'source' },
  { code: 'KH', name: 'Cambodia', currency: 'KHR', symbol: '៛', flag: '🇰🇭', region: 'source' },
  { code: 'LA', name: 'Laos', currency: 'LAK', symbol: '₭', flag: '🇱🇦', region: 'source' },
  { code: 'MN', name: 'Mongolia', currency: 'MNT', symbol: '₮', flag: '🇲🇳', region: 'source' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦', flag: '🇳🇬', region: 'source' },
  { code: 'KE', name: 'Kenya', currency: 'KES', symbol: 'KSh', flag: '🇰🇪', region: 'source' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', symbol: '₵', flag: '🇬🇭', region: 'source' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', symbol: 'R', flag: '🇿🇦', region: 'source' },
  { code: 'EG', name: 'Egypt', currency: 'EGP', symbol: 'E£', flag: '🇪🇬', region: 'source' },
  { code: 'MA', name: 'Morocco', currency: 'MAD', symbol: 'DH', flag: '🇲🇦', region: 'source' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', symbol: 'R$', flag: '🇧🇷', region: 'source' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', symbol: 'Mex$', flag: '🇲🇽', region: 'source' },
  { code: 'CO', name: 'Colombia', currency: 'COP', symbol: 'COL$', flag: '🇨🇴', region: 'source' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', symbol: 'AR$', flag: '🇦🇷', region: 'source' },
  { code: 'PE', name: 'Peru', currency: 'PEN', symbol: 'S/', flag: '🇵🇪', region: 'source' },
  { code: 'TR', name: 'Turkey', currency: 'TRY', symbol: '₺', flag: '🇹🇷', region: 'source' },
  { code: 'RU', name: 'Russia', currency: 'RUB', symbol: '₽', flag: '🇷🇺', region: 'source' },
  { code: 'UA', name: 'Ukraine', currency: 'UAH', symbol: '₴', flag: '🇺🇦', region: 'source' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', symbol: '﷼', flag: '🇸🇦', region: 'source' },
];


export const CURRENCIES = (() => {
  const seen = new Set();
  const list = [];
  for (const c of COUNTRIES) {
    if (!seen.has(c.currency)) {
      seen.add(c.currency);
      list.push({
        code: c.currency,
        symbol: c.symbol,
        name: c.name,
        flag: c.flag,
      });
    }
  }
  return list.sort((a, b) => a.code.localeCompare(b.code));
})();


export function getCountry(code) {
  return COUNTRIES.find((c) => c.code === code) || null;
}

export function getCurrency(code) {
  return CURRENCIES.find((c) => c.code === code) || null;
}


export function formatCurrency(amount, code, decimals = 2) {
  const cur = getCurrency(code);
  const symbol = cur?.symbol || '';
  const num = Number(amount);
  if (isNaN(num)) return `${symbol}0`;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${symbol}${formatted}`;
}


export const DEFAULT_PAIR = {
  from: 'CNY',
  to: 'MMK',
  fromCountry: 'CN',
  toCountry: 'MM',
  label: 'Myanmar student in China',
};