/**
 * Utilitários de data para o timezone do Brasil (America/Sao_Paulo).
 * Centraliza todas as operações de data no backend para usar
 * sempre o horário local brasileiro.
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
 * Retorna o início do dia de hoje (00:00:00) no Brasil como Date UTC.
 * Útil para queries do Prisma que precisam de Date objects.
 */
export function getTodayStartUTC(): Date {
  const todayStr = getTodayDateString();
  // Cria a data como meia-noite no Brasil (UTC-3 = +03:00 em UTC)
  return new Date(`${todayStr}T00:00:00-03:00`);
}

/**
 * Retorna o final do dia de hoje (23:59:59.999) no Brasil como Date UTC.
 * Útil para queries do Prisma que precisam de Date objects.
 */
export function getTodayEndUTC(): Date {
  const todayStr = getTodayDateString();
  return new Date(`${todayStr}T23:59:59.999-03:00`);
}

/**
 * Converte uma string "YYYY-MM-DD" para o início desse dia no Brasil como Date UTC.
 */
export function dateStringToStartUTC(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00-03:00`);
}

/**
 * Converte uma string "YYYY-MM-DD" para o final desse dia no Brasil como Date UTC.
 */
export function dateStringToEndUTC(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999-03:00`);
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
