export function formatINR(amount: number | undefined | null): string {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: num % 1 === 0 ? 0 : 2
  }).format(num);
}

export function formatIndianDateTime(isoString?: string): string {
  if (!isoString) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function formatIndianTime(isoString?: string): string {
  if (!isoString) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export const BENGALURU_PRESET_LOCATIONS = [
  {
    label: "Majestic Kempegowda Interchange",
    latitude: 12.9767,
    longitude: 77.5713
  },
  {
    label: "MG Road Metro & Mobility Hub",
    latitude: 12.9756,
    longitude: 77.6068
  },
  {
    label: "Indiranagar Metro Station",
    latitude: 12.9784,
    longitude: 77.6387
  },
  {
    label: "Koramangala Sony World Hub",
    latitude: 12.9352,
    longitude: 77.6245
  },
  {
    label: "Jayanagar 4th Block TTMC",
    latitude: 12.9299,
    longitude: 77.5839
  },
  {
    label: "Silk Board Multi-Modal Junction",
    latitude: 12.9172,
    longitude: 77.6227
  },
  {
    label: "Bellandur EcoSpace ORR Bus Stop",
    latitude: 12.9304,
    longitude: 77.6784
  },
  {
    label: "Whitefield (Kadugodi) Metro Terminal",
    latitude: 12.9850,
    longitude: 77.7100
  }
];
