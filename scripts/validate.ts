import 'dotenv/config';
import { writeFile, mkdir } from 'node:fs/promises';
import { CelesTrakProvider, WhereTheIssProvider, N2yoProvider } from '../src/data/providers';
import { ProviderHttp, RequestGate } from '../src/data/http';
import { orbitalPosition, positionError } from '../src/core/orbital';
import { haversine } from '../src/core/geo';
import { DEFAULT_SETTINGS } from '../src/core/types';
import type { OrbitalObject, ValidationResult } from '../src/core/types';
async function main() {
  const http = (id: string) => new ProviderHttp(new RequestGate(id));
  const ct = new CelesTrakProvider(http('celestrak')),
    iss = new WhereTheIssProvider(http('wheretheiss')),
    n2yo = new N2yoProvider(http('n2yo'), process.env.N2YO_API_KEY || '');
  const object = await ct.getOrbitalData(25544);
  const results: ValidationResult[] = [];
  const failures: string[] = [];
  for (const provider of [iss, ...(process.env.N2YO_API_KEY ? [n2yo] : [])]) {
    for (let i = 0; i < 3; i++)
      try {
        const reference =
          provider.id === 'n2yo'
            ? await (provider as N2yoProvider).getValidationPosition(
                25544,
                DEFAULT_SETTINGS.observer,
              )
            : await (provider as WhereTheIssProvider).getValidationPosition(25544);
        const local = orbitalPosition(object, reference.time, DEFAULT_SETTINGS.observer);
        const result: ValidationResult = {
          id: `${provider.id}-${reference.time}`,
          satelliteId: object.id,
          name: object.name,
          source: provider.id,
          time: reference.time,
          orbitalEpoch: object.epoch,
          orbitalAgeHours: (reference.time - Date.parse(object.epoch)) / 3600000,
          errorKm: positionError(local, reference),
          groundErrorKm: haversine(local, reference),
          altitudeErrorKm: Math.abs(local.altitude - reference.altitude),
          local,
          reference,
        };
        results.push(result);
        console.log(
          provider.id,
          new Date(reference.time).toISOString(),
          result.errorKm.toFixed(4),
          'km',
        );
      } catch (e) {
        failures.push(`${provider.id}: ${(e as Error).message}`);
        break;
      }
  }
  await mkdir('docs/evidence', { recursive: true });
  const metadata = {
    generatedAt: new Date().toISOString(),
    orbitalObject: object,
    results,
    failures,
    n2yoConfigured: !!process.env.N2YO_API_KEY,
  };
  await writeFile('docs/evidence/validation.json', JSON.stringify(metadata, null, 2));
  const csv =
    'NORAD,source,timestamp_UTC,epoch_UTC,age_hours,error_3D_km,ground_error_km,altitude_error_km\n' +
    results
      .map((r) =>
        [
          r.satelliteId,
          r.source,
          new Date(r.time).toISOString(),
          r.orbitalEpoch,
          r.orbitalAgeHours.toFixed(6),
          r.errorKm.toFixed(6),
          r.groundErrorKm.toFixed(6),
          r.altitudeErrorKm.toFixed(6),
        ].join(','),
      )
      .join('\n');
  await writeFile('docs/evidence/validation.csv', csv + '\n');
  const rows = results
    .map(
      (r) =>
        `| ${new Date(r.time).toISOString()} | ${r.source} | ${r.orbitalAgeHours.toFixed(3)} | ${r.errorKm.toFixed(4)} | ${r.groundErrorKm.toFixed(4)} | ${r.altitudeErrorKm.toFixed(4)} |`,
    )
    .join('\n');
  const errors = results.map((r) => r.errorKm);
  const mean = errors.reduce((a, b) => a + b, 0) / Math.max(1, errors.length);
  await writeFile(
    'docs/VALIDACION.md',
    `# Informe de validación\n\nEjecución real: ${metadata.generatedAt}. Satélite: ISS, NORAD 25544. Elementos ${object.format}, fuente CelesTrak, epoch ${object.epoch}.\n\nSe propaga con satellite.js 6.0.2 en el timestamp UTC informado por cada referencia, no al recibir la respuesta. Distancia 3D ECEF sobre WGS84; superficie por haversine; diferencia de altitud absoluta. Unidades: km.\n\n| Timestamp de referencia UTC | Fuente | Edad orbital (h) | Error 3D (km) | Superficie (km) | Altitud (km) |\n|---|---|---:|---:|---:|---:|\n${rows}\n\n${results.length ? `Muestras: ${results.length}; error 3D medio ${mean.toFixed(4)} km, máximo ${Math.max(...errors).toFixed(4)} km. Estas muestras no permiten extrapolar un error global ni separar diferencias de elementos, modelo y precisión de la referencia.` : 'No se obtuvieron muestras; no se inventaron resultados.'}\n\nN2YO: ${metadata.n2yoConfigured ? 'se intentó con credencial del entorno.' : 'pendiente de una API key personal; no se incluyeron resultados ficticios. Configurar N2YO_API_KEY en .env y ejecutar npm run validate.'}\n\n${failures.length ? 'Incidentes: ' + failures.join('; ') + '.' : ''}\n\nLa referencia puede utilizar otros elementos y convenciones de altitud. La antigüedad del TLE/OMM, las maniobras y el redondeo del timestamp afectan el resultado. El modelo no incorpora corrección atmosférica fina ni maniobras no publicadas. Los datos crudos y el catálogo usado están en [evidence/validation.json](evidence/validation.json), y la tabla procesable en [evidence/validation.csv](evidence/validation.csv).\n\nPara repetir: npm run validate (acceso a Internet necesario). El modo Validación de la app permite comparar cualquier objeto con N2YO y exportar las mediciones a CSV.\n`,
  );
  if (!results.length) process.exitCode = 1;
}
main().catch((e) => {
  console.error((e as Error).message);
  process.exitCode = 1;
});
