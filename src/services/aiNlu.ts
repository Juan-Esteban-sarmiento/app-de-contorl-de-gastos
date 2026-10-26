const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

const WORD_NUMBERS: Record<string, number> = {
  un: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
};

export const WORD_NUMBER_PATTERN =
  'cien|un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|veinte|veintiuno|veintidos|veintitres|veinticuatro|veinticinco|veintiseis|veintisiete|veintiocho|veintinueve|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa';

const WORD_MONEY_UNIT_PATTERN = 'mil|mill[oó]n(?:es)?|palos?|lucas?';

export interface MoneyToken {
  value: number;
  raw: string;
  index: number;
  end: number;
}

export interface DateRange {
  index: number;
  end: number;
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
    if (Number.isFinite(n)) return n;
    return parseMoney(value);
  }
  return null;
}

export function asBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'si', 'sí', 'yes', 'on', 'activo'].includes(normalize(value));
  }
  return false;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseIso(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) {
    return null;
  }
  return date;
}

function baseDate(today: string): Date {
  return parseIso(today) || new Date();
}

export function toIsoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function addDays(iso: string, days: number): string {
  const date = baseDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function dateFromParts(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month, day, 12);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

function resolveMonthDay(day: number, monthIndex: number, year: number | null, base: Date): string | null {
  let candidate = dateFromParts(year ?? base.getFullYear(), monthIndex, day);
  if (!candidate) return null;
  if (year === null) {
    const forwarded = new Date(candidate);
    forwarded.setFullYear(candidate.getFullYear() + 1);
    const diffPast = base.getTime() - candidate.getTime();
    if (diffPast > 180 * 86400000 && forwarded.getTime() > base.getTime()) {
      candidate = forwarded;
    }
  }
  return toIsoDate(candidate);
}

function resolveWeekday(weekday: number, modifier: string | undefined, base: Date): string {
  let delta = (weekday - base.getDay() + 7) % 7;
  if (modifier && /proximo|proxima|siguiente/.test(modifier)) {
    if (delta === 0) delta = 7;
  } else if (modifier && /pasado|pasada/.test(modifier)) {
    delta = delta === 0 ? -7 : delta - 7;
  } else if (delta > 3) {
    delta -= 7;
  }
  const date = new Date(base);
  date.setDate(date.getDate() + delta);
  return toIsoDate(date);
}

export function resolveDate(raw: unknown, today: string): string | null {
  const text = normalize(asString(raw));
  if (!text) return null;
  const base = baseDate(today);

  const iso = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (iso && parseIso(iso[0])) return iso[0];

  if (/\bpasado\s+manana\b/.test(text)) return addDays(today, 2);
  if (/\banteayer\b|\bantes\s+de\s+ayer\b/.test(text)) return addDays(today, -2);
  if (/\bayer\b/.test(text)) return addDays(today, -1);
  if (/\bhoy\b/.test(text)) return today;
  if (/\bmanana\b/.test(text)) return addDays(today, 1);

  const monthDay = text.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+(\d{4}))?\b/);
  if (monthDay) {
    const day = Number(monthDay[1]);
    const monthIndex = MONTHS.indexOf(monthDay[2]);
    const year = monthDay[3] ? Number(monthDay[3]) : null;
    const resolved = resolveMonthDay(day, monthIndex, year, base);
    if (resolved) return resolved;
  }

  const monthFirst = text.match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{1,2})(?:\s+(?:de|del)\s+(\d{4}))?\b/);
  if (monthFirst) {
    const monthIndex = MONTHS.indexOf(monthFirst[1]);
    const day = Number(monthFirst[2]);
    const year = monthFirst[3] ? Number(monthFirst[3]) : null;
    const resolved = resolveMonthDay(day, monthIndex, year, base);
    if (resolved) return resolved;
  }

  const weekday = text.match(/\b(?:(este|esta|proximo|proxima|siguiente|pasado|pasada)\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/);
  if (weekday) {
    return resolveWeekday(WEEKDAYS.indexOf(weekday[2]), weekday[1], base);
  }

  const relativeDay = text.match(/\b(?:el|dia|del)\s+(\d{1,2})\b(?!\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))(?!\s+(?:al|hasta)\s+\d{1,2}\b)/);
  if (relativeDay) {
    const day = Number(relativeDay[1]);
    const resolved = dateFromParts(base.getFullYear(), base.getMonth(), day);
    if (resolved) return toIsoDate(resolved);
  }

  return null;
}

function parseRangeStart(aText: string, bText: string, base: Date, today: string): string | null {
  const a = normalize(aText);
  const b = normalize(bText);
  const aHasMonth = MONTHS.some((month) => new RegExp(`\\b${month}\\b`).test(a));
  const aHasRelative = /\b(hoy|ayer|manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.test(a);
  if (aHasMonth || aHasRelative) return resolveDate(a, today);

  const aDay = a.match(/\b(\d{1,2})\b/);
  const bMonth = b.match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/);
  if (aDay && bMonth) {
    const bDay = Number(b.match(/\b(\d{1,2})\b/)?.[1] || 1);
    const bYear = b.match(/\b(\d{4})\b/)?.[1];
    const monthIndex = MONTHS.indexOf(bMonth[1]);
    const year = bYear ? Number(bYear) : base.getFullYear();
    let startMonth = monthIndex;
    if (Number(aDay[1]) > bDay) {
      startMonth -= 1;
      if (startMonth < 0) startMonth = 11;
    }
    const resolved = dateFromParts(year, startMonth, Number(aDay[1]));
    if (resolved) return toIsoDate(resolved);
  }
  return resolveDate(a, today);
}

function expandRange(from: string, to: string): string[] {
  const result: string[] = [];
  const start = parseIso(from);
  const end = parseIso(to);
  if (!start || !end) return result;
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (diff < 0 || diff > 120) return result;
  for (let offset = 0; offset <= diff; offset += 1) {
    result.push(addDays(from, offset));
  }
  return result;
}

export function extractDates(raw: string, today: string): string[] {
  const text = normalize(raw);
  const base = baseDate(today);
  const dates = new Set<string>();
  const add = (value: string | null) => {
    if (value) dates.add(value);
  };

  const rangeRegex = /\b(?:del|desde(?:\s+el)?|entre(?:\s+el)?)\s+([a-z0-9 ]{1,40}?)\s+(?:al|hasta(?:\s+el)?)\s+([a-z0-9 ]{1,60})/g;
  let rangeMatch: RegExpExecArray | null;
  while ((rangeMatch = rangeRegex.exec(text)) !== null) {
    let from = parseRangeStart(rangeMatch[1], rangeMatch[2], base, today);
    let to = resolveDate(rangeMatch[2], today);
    if (!from || !to) {
      const startDay = Number(rangeMatch[1].match(/\b(\d{1,2})\b/)?.[1]);
      const endDay = Number(rangeMatch[2].match(/\b(\d{1,2})\b/)?.[1]);
      if (startDay && endDay) {
        const anchor = from ? parseIso(from) : null;
        const startMonth = anchor ? anchor.getMonth() : base.getMonth();
        const startYear = anchor ? anchor.getFullYear() : base.getFullYear();
        const start = dateFromParts(startYear, startMonth, startDay);
        if (start) {
          let endMonth = start.getMonth();
          let endYear = start.getFullYear();
          let end = dateFromParts(endYear, endMonth, endDay);
          if (end && end < start) {
            endMonth += 1;
            if (endMonth > 11) {
              endMonth = 0;
              endYear += 1;
            }
            end = dateFromParts(endYear, endMonth, endDay);
          }
          if (!from) from = toIsoDate(start);
          if (!to && end) to = toIsoDate(end);
        }
      }
    }
    if (from && to) expandRange(from, to).forEach(add);
  }

  const weekdayMonth = text.match(/\b(?:todos|cada)\s+(?:los\s+)?((?:(?:domingo|lunes|martes|miercoles|jueves|viernes|sabado)s?\s*(?:,|y|e)?\s*)+)\s+(?:de|del)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+(\d{4}))?\b/);
  const weekdayMonthApplied = Boolean(weekdayMonth);
  if (weekdayMonth) {
    const weekdays = new Set<number>();
    for (const match of weekdayMonth[1].matchAll(/(domingo|lunes|martes|miercoles|jueves|viernes|sabado)s?/g)) {
      weekdays.add(WEEKDAYS.indexOf(match[1]));
    }
    const monthIndex = MONTHS.indexOf(weekdayMonth[2]);
    const year = weekdayMonth[3] ? Number(weekdayMonth[3]) : base.getFullYear();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, monthIndex, day, 12);
      if (weekdays.has(date.getDay())) add(toIsoDate(date));
    }
  }

  for (const match of text.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) {
    if (parseIso(match[0])) add(match[0]);
  }

  for (const match of text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = match[3] ? Number(match[3]) : base.getFullYear();
    if (year < 100) year += 2000;
    const date = dateFromParts(year, month - 1, day);
    if (date) add(toIsoDate(date));
  }

  for (const match of text.matchAll(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+(\d{4}))?\b/g)) {
    const monthIndex = MONTHS.indexOf(match[2]);
    add(resolveMonthDay(Number(match[1]), monthIndex, match[3] ? Number(match[3]) : null, base));
  }

  for (const match of text.matchAll(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{1,2})(?:\s+(?:de|del)\s+(\d{4}))?\b/g)) {
    const monthIndex = MONTHS.indexOf(match[1]);
    add(resolveMonthDay(Number(match[2]), monthIndex, match[3] ? Number(match[3]) : null, base));
  }

  if (/\bpasado\s+manana\b/.test(text)) add(addDays(today, 2));
  if (/\banteayer\b|\bantes\s+de\s+ayer\b/.test(text)) add(addDays(today, -2));
  if (/\bayer\b/.test(text)) add(addDays(today, -1));
  if (/\bhoy\b/.test(text)) add(today);
  if (/\bmanana\b/.test(text)) add(addDays(today, 1));

  if (!weekdayMonthApplied) {
    for (const match of text.matchAll(/\b(?:(este|esta|proximo|proxima|siguiente|pasado|pasada)\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/g)) {
      add(resolveWeekday(WEEKDAYS.indexOf(match[2]), match[1], base));
    }
  }

  for (const match of text.matchAll(/\b(?:el|dia|del)\s+(\d{1,2})\b(?!\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))(?!\s+(?:al|hasta)\s+\d{1,2}\b)/g)) {
    const date = dateFromParts(base.getFullYear(), base.getMonth(), Number(match[1]));
    if (date) add(toIsoDate(date));
  }

  return Array.from(dates).sort();
}

function numericValue(raw: string): number {
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  if (!cleaned) return NaN;
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastDot > lastComma) {
      return parseFloat(cleaned.replace(/,/g, ''));
    }
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  if (lastComma >= 0) {
    const parts = cleaned.split(',');
    const last = parts[parts.length - 1];
    if (parts.length > 2 || (last.length === 3 && parts[0].length <= 3)) {
      return parseFloat(parts.join(''));
    }
    return parseFloat(cleaned.replace(',', '.'));
  }
  if (lastDot >= 0) {
    const parts = cleaned.split('.');
    const last = parts[parts.length - 1];
    if (parts.length > 2 || last.length === 3) {
      return parseFloat(parts.join(''));
    }
    return parseFloat(cleaned);
  }
  return parseFloat(cleaned);
}

function dateRanges(raw: string): DateRange[] {
  const ranges: DateRange[] = [];
  const add = (match: RegExpMatchArray) => {
    if (match.index === undefined) return;
    ranges.push({ index: match.index, end: match.index + match[0].length });
  };
  for (const match of raw.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) add(match);
  for (const match of raw.matchAll(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g)) add(match);
  for (const match of raw.matchAll(/\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/gi)) add(match);
  for (const match of raw.matchAll(/\b(?:el|dia|del)\s+\d{1,2}\b/gi)) add(match);
  return ranges;
}

export function moneyTokens(raw: string): MoneyToken[] {
  const ranges = dateRanges(raw);
  const tokens: MoneyToken[] = [];
  const regex = /(\d(?:[\d.,]*\d)?)\s*(mil(?:es)?|millon(?:es)?|palos?|lucas?|mm|m|k)?(?![a-z0-9])/gi;
  for (const match of raw.matchAll(regex)) {
    if (match.index === undefined) continue;
    const index = match.index;
    const end = index + match[0].length;
    if (ranges.some((range) => index < range.end && end > range.index)) continue;
    const base = numericValue(match[1]);
    if (!Number.isFinite(base)) continue;
    const suffix = normalize(match[2] || '');
    let multiplier = 1;
    if (/^millon/.test(suffix)) multiplier = 1_000_000;
    else if (/^mil/.test(suffix)) multiplier = 1_000;
    else if (/^palo/.test(suffix)) multiplier = 1_000_000;
    else if (/^luca/.test(suffix)) multiplier = 1_000;
    else if (suffix === 'mm' || suffix === 'm') multiplier = 1_000_000;
    else if (suffix === 'k') multiplier = 1_000;
    tokens.push({
      value: roundMoney(base * multiplier),
      raw: match[0].trim(),
      index,
      end,
    });
  }
  return tokens;
}

function wordMoney(text: string): number | null {
  const low = normalize(text);
  if (/\bmedio\s+millon\b/.test(low)) return 500_000;
  if (/\bmedio\s+palo\b/.test(low)) return 500_000;
  const match = low.match(new RegExp(`\\b(${WORD_NUMBER_PATTERN})\\s+(${WORD_MONEY_UNIT_PATTERN})\\b`));
  if (!match) return null;
  const amount = WORD_NUMBERS[match[1]];
  if (!amount) return null;
  const unit = match[2];
  if (/^palo/.test(unit)) return amount * 1_000_000;
  if (/^luca/.test(unit)) return amount * 1_000;
  return unit === 'mil' ? amount * 1_000 : amount * 1_000_000;
}

export function parseMoney(text: string): number | null {
  const token = moneyTokens(text)[0];
  if (token) return token.value;
  return wordMoney(text);
}

function distanceToMatch(token: MoneyToken, match: RegExpExecArray): number {
  const index = match.index ?? 0;
  const end = index + match[0].length;
  if (token.end <= index) return index - token.end;
  if (token.index >= end) return token.index - end;
  return 0;
}

function keywordMatches(text: string, keyword: RegExp): RegExpExecArray[] {
  const flags = keyword.flags.includes('g') ? keyword.flags : `${keyword.flags}g`;
  return Array.from(text.matchAll(new RegExp(keyword.source, flags)));
}

function distanceToKeywords(token: MoneyToken, matches: RegExpExecArray[]): number {
  return Math.min(...matches.map((match) => distanceToMatch(token, match)));
}

export function nearestMoney(text: string, keyword: RegExp): number | null {
  const matches = keywordMatches(text, keyword);
  if (!matches.length) return null;
  const tokens = moneyTokens(text);
  if (!tokens.length) return wordMoney(text);
  let best = tokens[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  tokens.forEach((token) => {
    const distance = distanceToKeywords(token, matches);
    if (distance < bestDistance) {
      best = token;
      bestDistance = distance;
    }
  });
  return best.value;
}

export function parsePercent(text: string, keyword: RegExp): number | null {
  const tokens = moneyTokens(text);
  if (!tokens.length) return null;
  const matches = keywordMatches(text, keyword);
  if (!matches.length) return null;
  let best = tokens[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  tokens.forEach((token) => {
    const distance = distanceToKeywords(token, matches);
    if (distance < bestDistance) {
      best = token;
      bestDistance = distance;
    }
  });
  return best.value > 0 && best.value <= 100 ? best.value : null;
}

export function stripAmounts(text: string): string {
  const tokens = moneyTokens(text);
  let result = text;
  [...tokens].sort((a, b) => b.index - a.index).forEach((token) => {
    result = `${result.slice(0, token.index)} ${result.slice(token.end)}`;
  });
  const wordAmounts = new RegExp(`\\b(?:medio\\s+(?:mill[oó]n|palo)|(?:${WORD_NUMBER_PATTERN})\\s+(?:${WORD_MONEY_UNIT_PATTERN}))\\b`, 'gi');
  return result.replace(wordAmounts, ' ');
}

export function extractQuoted(text: string): string | null {
  const match = text.match(/[«"']([^"'»]+)[»"']/);
  return match ? match[1].trim() : null;
}

function accentPattern(word: string): string {
  const normalizedWord = normalize(word);
  const map: Record<string, string> = {
    a: '[aá]',
    e: '[eé]',
    i: '[ií]',
    o: '[oó]',
    u: '[uúü]',
    n: '[nñ]',
    c: '[cç]',
  };
  return normalizedWord
    .split('')
    .map((char) => {
      if (/\s/.test(char)) return '\\s+';
      return map[char] || char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
}

export function removePhrases(text: string, phrases: string[]): string {
  let result = text;
  phrases.forEach((phrase) => {
    if (!phrase.trim()) return;
    const pattern = phrase
      .trim()
      .split(/\s+/)
      .map(accentPattern)
      .join('\\s+');
    result = result.replace(
      new RegExp(`(^|[^\\p{L}\\p{N}])${pattern}(?=$|[^\\p{L}\\p{N}])`, 'giu'),
      (_match: string, prefix: string) => `${prefix} `
    );
  });
  return result;
}

const LEADING_NOISE = /^\s*(?:puedes|podrias|podrías|me\s+puedes(?:\s+decir)?(?:me)?|me\s+ayudas(?:\s+a)?|ayudame(?:\s+a)?|ayúdame(?:\s+a)?|gast[eé]|pagu[eé]|compr[eé]|compre|registra(?:r)?|añad(?:e|i)|anad(?:e|i)|agrega(?:r)?|crea(?:r)?|suma(?:r)?|carga(?:r)?|anota(?:r)?|apunta(?:r)?|marca(?:r)?|pon(?:er)?|met[ií]|he\s+gastado|acabo\s+de\s+gastar|quiero\s+(?:registrar|anotar|agregar)|necesito\s+(?:registrar|anotar|agregar)|me\s+pagaron|recib[ií]|cobr[eé]|trabaj[eé]|descans[eé]|paga(?:r)?|abona(?:r)?|liquida(?:r)?|saldar|borra(?:r)?|elimina(?:r)?|quita(?:r)?|actualiza(?:r)?|corrige(?:r)?|ajusta(?:r)?|cambia(?:r)?|modifica(?:r)?|edita(?:r)?)\b\s*/i;
const TRAILING_NOISE = /(?:\s+\b(?:de|del|en|por|para|con|a|al|el|la|los|las|un|una|unos|unas)\b)+\s*$/i;
const LEADING_ARTICLE = /^\s*(?:de|del|a|al|el|la|los|las|un|una|unos|unas|en|por|para|con)\b\s*/i;

export function cleanPhrase(text: string, extraWords: string[] = []): string {
  let result = ` ${stripAmounts(text).replace(/[¿¡]/g, ' ')} `;
  result = result
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, ' ')
    .replace(/\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/gi, ' ')
    .replace(/\b(?:hoy|ayer|anteayer|pasado\s+mañana|pasado\s+manana|mañana|manana)\b/gi, ' ')
    .replace(/\b(?:este|esta|proximo|proxima|siguiente|pasado|pasada)?\s*(?:domingo|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado)\b/gi, ' ')
    .replace(/\b(?:el|dia|día|del)\s+\d{1,2}\b/gi, ' ');
  result = removePhrases(result, extraWords);
  let previous = '';
  while (previous !== result) {
    previous = result;
    result = result.replace(LEADING_NOISE, ' ');
  }
  let previousClean = '';
  while (previousClean !== result) {
    previousClean = result;
    result = result.replace(LEADING_ARTICLE, ' ');
  }
  result = result
    .replace(/[.,;:!¡?¿]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(TRAILING_NOISE, '')
    .trim();
  return result;
}
