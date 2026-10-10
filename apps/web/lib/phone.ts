const DIAL_CODES: [string, string][] = [
  ["971", "AE"],
  ["972", "IL"],
  ["966", "SA"],
  ["1", "US"],
  ["7", "RU"],
  ["20", "EG"],
  ["27", "ZA"],
  ["31", "NL"],
  ["32", "BE"],
  ["33", "FR"],
  ["34", "ES"],
  ["39", "IT"],
  ["44", "GB"],
  ["45", "DK"],
  ["46", "SE"],
  ["47", "NO"],
  ["48", "PL"],
  ["49", "DE"],
  ["52", "MX"],
  ["55", "BR"],
  ["60", "MY"],
  ["61", "AU"],
  ["62", "ID"],
  ["63", "PH"],
  ["64", "NZ"],
  ["65", "SG"],
  ["66", "TH"],
  ["81", "JP"],
  ["82", "KR"],
  ["84", "VN"],
  ["86", "CN"],
  ["90", "TR"],
  ["91", "IN"],
  ["92", "PK"],
];

const flagOf = (iso: string) =>
  String.fromCodePoint(...[...iso].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));

const grouped = (digits: string) => {
  const groups = digits.match(/\d{1,3}/g) ?? [];
  const last = groups.at(-1);

  if (groups.length > 1 && last?.length === 1) {
    groups.splice(-2, 2, `${groups.at(-2)}${last}`);
  }

  return groups.join(" ");
};

export function readPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const international = value.trim().startsWith("+");
  const [dial, iso] = (international
    ? DIAL_CODES.find(([code]) => digits.startsWith(code))
    : undefined) ?? [];

  return {
    flag: iso ? flagOf(iso) : undefined,
    dial: dial ? `+${dial}` : undefined,
    prefix: international ? "+" : "",
    national: grouped(dial ? digits.slice(dial.length) : digits),
  };
}

export const formatPhone = (value: string) => {
  const { dial, prefix, national } = readPhone(value);
  return dial ? `${dial} ${national}` : `${prefix}${national}`;
};
