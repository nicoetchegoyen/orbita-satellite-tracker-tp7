import { writeFile, mkdir } from 'node:fs/promises';
import { CelesTrakProvider } from '../src/data/providers';
import { ProviderHttp, RequestGate } from '../src/data/http';
import { GROUPS } from '../src/core/types';
import type { OrbitalObject } from '../src/core/types';
const provider = new CelesTrakProvider(new ProviderHttp(new RequestGate('celestrak')));
const records: OrbitalObject[] = [];
for (const group of GROUPS) {
  try {
    const all = await provider.getCatalog(group);
    const subset = all.slice(0, group === 'starlink' ? 80 : group === 'stations' ? 20 : 12);
    records.push(...subset);
    console.log(group, all.length, 'snapshot', subset.length);
  } catch (e) {
    console.error(group, e instanceof Error ? e.message : e);
  }
}
if (!records.length) throw new Error('No se pudo obtener ningún catálogo real.');
await mkdir('assets', { recursive: true });
await writeFile('assets/catalog-snapshot.json', JSON.stringify(records, null, 2));
await writeFile(
  'assets/snapshot-metadata.json',
  JSON.stringify(
    {
      retrievedAt: new Date().toISOString(),
      description:
        'Datos reales para primer inicio sin red. No se modifica su epoch; la UI alerta sobre antigüedad.',
      counts: GROUPS.map((group) => ({
        group,
        count: records.filter((o) => o.group === group).length,
      })),
    },
    null,
    2,
  ),
);
