/** Generates a simple random ID (no external deps required) */
export function newId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
