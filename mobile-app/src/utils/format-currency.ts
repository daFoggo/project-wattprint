const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 1,
});

export function formatVnd(amount: number): string {
  return vndFormatter.format(amount);
}

export function formatKwh(value: number): string {
  return `${numberFormatter.format(value)} kWh`;
}

export function formatWatts(value: number): string {
  if (value >= 1000) {
    return `${numberFormatter.format(value / 1000)} kW`;
  }
  return `${numberFormatter.format(value)} W`;
}
