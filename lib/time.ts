const ZONE = 'Europe/Chisinau'

/** YYYY-MM-DD in Chișinău. */
export function localDate(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(at)
}

/** HH:MM (24 h) in Chișinău. */
export function localTime(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at)
}
