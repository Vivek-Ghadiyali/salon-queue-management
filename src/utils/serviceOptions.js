export function normalizeServiceName(name) {
  return String(name ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

export function uniqueServiceOptions(services = []) {
  const byName = new Map();
  for (const service of services) {
    const key = normalizeServiceName(service?.name);
    if (!key) continue;
    const existing = byName.get(key);
    if (!existing || (existing.enabled === false && service.enabled !== false)) byName.set(key, service);
  }
  return [...byName.values()];
}
