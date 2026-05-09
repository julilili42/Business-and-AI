export function resolvePlaceholders(template: string, data: Record<string, string>): string {
  return template.replace(/\[([^\]]+)\]/g, (match, key) => data[key] ?? match);
}

export function findUnknownPlaceholders(template: string, knownKeys: string[]): string[] {
  const matches = [...template.matchAll(/\[([^\]]+)\]/g)];
  return [...new Set(matches.map((m) => m[1]).filter((key) => !knownKeys.includes(key)))];
}
