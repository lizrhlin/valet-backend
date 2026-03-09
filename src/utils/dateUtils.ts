/**
 * Utilitários de data para o timezone do Brasil (America/Sao_Paulo).
 * Centraliza todas as operações de data no backend para usar
 * sempre o horário local brasileiro.
 * 
 * REGRA: persistência = UTC, exibição/regras = America/Sao_Paulo.
 */

const BRAZIL_TZ = 'America/Sao_Paulo';

/**
 * Retorna a data de HOJE no formato "YYYY-MM-DD" no fuso horário do Brasil.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.toLocaleString('en-CA', { timeZone: BRAZIL_TZ, year: 'numeric' });
  const month = now.toLocaleString('en-CA', { timeZone: BRAZIL_TZ, month: '2-digit' });
  const day = now.toLocaleString('en-CA', { timeZone: BRAZIL_TZ, day: '2-digit' });
  return `${year}-${month}-${day}`;
}

/**
 * Retorna o horário atual no formato "HH:MM" no fuso horário do Brasil.
 */
export function getNowTimeString(): string {
  const now = new Date();
  return now.toLocaleString('pt-BR', {
    timeZone: BRAZIL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Converte data "YYYY-MM-DD" e horário "HH:MM" no Brasil para Date UTC.
 * Usa Intl.DateTimeFormat para calcular o offset real do Brasil na data específica,
 * evitando hardcode de -03:00 (que falha se DST for reintroduzido).
 */
export function brazilDateTimeToUTC(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Criar uma data "aproximada" em UTC 
  const approxUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  
  // Descobrir o offset real do Brasil nessa data usando Intl
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(approxUTC);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  
  const brazilYear = get('year');
  const brazilMonth = get('month');
  const brazilDay = get('day');
  const brazilHour = get('hour') === 24 ? 0 : get('hour');
  const brazilMinute = get('minute');
  
  // Calcular diferença entre o que queríamos e o que o Brasil mostra para este UTC
  const wantedMinutes = hours * 60 + minutes;
  const brazilMinutes = brazilHour * 60 + brazilMinute;
  
  // Se o dia mudou, ajustar por 24h
  let dayDiff = 0;
  if (brazilDay !== day || brazilMonth !== month || brazilYear !== year) {
    // Calcular diferença em dias
    const wantedDate = new Date(year, month - 1, day);
    const brazilDate = new Date(brazilYear, brazilMonth - 1, brazilDay);
    dayDiff = Math.round((wantedDate.getTime() - brazilDate.getTime()) / (24 * 60 * 60 * 1000));
  }
  
  const offsetMinutes = wantedMinutes - brazilMinutes + dayDiff * 24 * 60;
  
  // Ajustar o UTC pela diferença de offset
  return new Date(approxUTC.getTime() + offsetMinutes * 60 * 1000);
}

/**
 * Retorna o início do dia de hoje (00:00:00) no Brasil como Date UTC.
 * Útil para queries do Prisma que precisam de Date objects.
 */
export function getTodayStartUTC(): Date {
  const todayStr = getTodayDateString();
  return brazilDateTimeToUTC(todayStr, '00:00');
}

/**
 * Retorna o final do dia de hoje (23:59:59.999) no Brasil como Date UTC.
 * Útil para queries do Prisma que precisam de Date objects.
 */
export function getTodayEndUTC(): Date {
  const todayStr = getTodayDateString();
  const end = brazilDateTimeToUTC(todayStr, '23:59');
  end.setSeconds(59, 999);
  return end;
}

/**
 * Converte uma string "YYYY-MM-DD" para o início desse dia no Brasil como Date UTC.
 */
export function dateStringToStartUTC(dateStr: string): Date {
  return brazilDateTimeToUTC(dateStr, '00:00');
}

/**
 * Converte uma string "YYYY-MM-DD" para o final desse dia no Brasil como Date UTC.
 */
export function dateStringToEndUTC(dateStr: string): Date {
  const end = brazilDateTimeToUTC(dateStr, '23:59');
  end.setSeconds(59, 999);
  return end;
}

/**
 * Extrai a parte "YYYY-MM-DD" de qualquer string de data/ISO.
 */
export function extractDateString(dateStr: string): string {
  if (!dateStr) return getTodayDateString();
  return dateStr.split('T')[0];
}

/**
 * Verifica se dateStr é uma data passada (antes de hoje no Brasil).
 */
export function isPastDate(dateStr: string): boolean {
  const today = getTodayDateString();
  return extractDateString(dateStr) < today;
}

/**
 * Retorna a hora atual como número (0-23) no fuso horário do Brasil.
 */
export function getCurrentHour(): number {
  const now = new Date();
  const hourStr = now.toLocaleString('en-US', { timeZone: BRAZIL_TZ, hour: 'numeric', hour12: false });
  return parseInt(hourStr, 10);
}
