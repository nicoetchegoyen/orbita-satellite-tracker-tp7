import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('tmp/playwright');
const { chromium } = await import('playwright');
const output = path.resolve('docs/evidence');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  timezoneId: 'America/Argentina/Buenos_Aires',
  recordVideo: { dir: path.join(output, 'recordings'), size: { width: 1440, height: 1050 } },
});
const page = await context.newPage();
const errors = [],
  consoleErrors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
const pause = (ms) => page.waitForTimeout(ms);
const check = async (label, fn) => {
  await fn();
  checks.push({ label, ok: true });
  console.log('PASS', label);
};
try {
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:8081', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.getByRole('heading', { name: /Mirá más allá/ }).waitFor({ timeout: 30000 });
  await pause(4000);
  await check('inicio ISS y motor en vivo', async () => {
    await page.getByText('ISS (ZARYA)', { exact: true }).first().waitFor();
  });
  await page.screenshot({ path: path.join(output, '01-explorar.png') });
  await pause(1500);
  await page.getByRole('button', { name: 'Buscar satélite', exact: true }).click();
  await pause(1000);
  await page.getByRole('textbox', { name: 'Nombre o NORAD ID' }).fill('25544');
  await pause(800);
  await check('búsqueda NORAD y selección real', async () => {
    await page.getByRole('button', { name: /ISS \(ZARYA\).*25544/ }).click();
  });
  await pause(1500);
  await page.getByRole('checkbox', { name: 'Starlink', exact: true }).click();
  await page.getByText(/40 Starlink/).waitFor({ timeout: 60000 });
  await pause(2500);
  await check('capa acotada a 40 Starlink', async () => {});
  await page.screenshot({ path: path.join(output, '02-starlink.png') });
  await page.getByRole('button', { name: 'Acercar mapa' }).click();
  await pause(900);
  await page.getByRole('button', { name: 'Alejar mapa' }).click();
  await pause(900);
  await page.getByRole('tab', { name: 'Próximos pases', exact: true }).click();
  await pause(2000);
  await check('agenda con gráfico polar y AOS/TCA/LOS', async () => {
    await page.getByText('TU MAPA DEL CIELO', { exact: true }).waitFor();
    await page.getByText('LOS', { exact: true }).first().waitFor();
  });
  await page.screenshot({ path: path.join(output, '03-pases.png') });
  await page.getByRole('button', { name: 'Solo ópticos', exact: true }).click();
  await pause(1200);
  await page.getByRole('button', { name: 'Todos los pases', exact: true }).click();
  await pause(1000);
  await page.getByRole('tab', { name: 'Orientación', exact: true }).click();
  await pause(1000);
  await page.getByRole('button', { name: 'Activar brújula', exact: true }).click();
  await pause(1500);
  await check('orientación informa ausencia de sensores web', async () => {
    await page.getByRole('alert').waitFor();
  });
  await page.screenshot({ path: path.join(output, '04-orientacion.png') });
  await page.getByRole('tab', { name: 'Validación', exact: true }).click();
  await pause(1000);
  await page.getByRole('button', { name: 'Comparar posición ahora', exact: true }).click();
  await page.getByText('ERROR 3D', { exact: true }).waitFor({ timeout: 60000 });
  await pause(1500);
  await check('comparación real Where the ISS at?', async () => {});
  await page.screenshot({ path: path.join(output, '05-validacion.png') });
  await page.getByRole('alert').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs(path.join(output, 'ui-validation.csv'));
  checks.push({ label: 'exportación CSV', ok: true });
  await page.getByRole('tab', { name: 'Ajustes', exact: true }).click();
  await pause(900);
  await page.getByRole('textbox', { name: 'Latitud · grados', exact: true }).fill('100');
  await page.getByRole('button', { name: 'Guardar preferencias', exact: true }).click();
  await pause(600);
  await check('validación de coordenadas inválidas', async () => {
    await page.getByRole('alert').filter({ hasText: 'Ingresá latitud' }).waitFor();
  });
  await page.getByRole('alert').click();
  await page.getByRole('textbox', { name: 'Latitud · grados', exact: true }).fill('-34.6037');
  await page.getByRole('button', { name: 'Guardar preferencias', exact: true }).click();
  await pause(1200);
  await page.getByRole('alert').click();
  await page.getByRole('button', { name: 'Probar notificación', exact: true }).click();
  await pause(1500);
  await page.getByRole('alert').waitFor();
  await page.screenshot({ path: path.join(output, '06-aviso-web.png') });
  checks.push({ label: 'vista previa de aviso web (no prueba nativa)', ok: true });
  await page.getByRole('alert').click();
  await page.getByRole('tab', { name: 'Explorar', exact: true }).click();
  await pause(1800);
  await context.close();
  // Real narrow viewport: no data or sensor mocks.
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'America/Argentina/Buenos_Aires',
  });
  const m = await mobile.newPage();
  m.on('pageerror', (e) => errors.push(e.message));
  await m.goto('http://127.0.0.1:8081', { waitUntil: 'domcontentloaded' });
  await m.getByRole('heading', { name: /Mirá más allá/ }).waitFor();
  await m.waitForTimeout(3500);
  await m.screenshot({ path: path.join(output, '07-mobile.png'), fullPage: true });
  await check('viewport móvil 390 px sin desborde horizontal', async () => {
    const overflow = await m.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflow) throw new Error('Horizontal overflow');
  });
  await m.getByText('FICHA ORBITAL', { exact: true }).scrollIntoViewIfNeeded();
  await m.screenshot({ path: path.join(output, '07b-mobile-telemetria.png') });
  await m.getByRole('tab', { name: 'Próximos pases', exact: true }).click();
  await m.waitForTimeout(1000);
  await m.screenshot({ path: path.join(output, '08-mobile-pases.png'), fullPage: true });
  // Fresh context + blocked network after bundle load: bundled real snapshot fallback.
  await mobile.close();
  const offline = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const o = await offline.newPage();
  await o.route('**/api/catalog**', (route) => route.abort());
  await o.route('https://celestrak.org/**', (route) => route.abort());
  await o.goto('http://127.0.0.1:8081', { waitUntil: 'domcontentloaded' });
  await o.getByText('DATOS GUARDADOS', { exact: true }).waitFor({ timeout: 30000 });
  await check('primer inicio sin APIs usa snapshot real y lo identifica', async () => {
    await o.getByText('ISS (ZARYA)', { exact: true }).waitFor();
  });
  await o.screenshot({ path: path.join(output, '09-offline.png') });
  await offline.close();
  if (errors.length || consoleErrors.length)
    throw new Error(`Errores de interfaz: ${JSON.stringify({ errors, consoleErrors })}`);
} catch (e) {
  await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  console.error(e);
  checks.push({ label: e.message, ok: false });
  process.exitCode = 1;
} finally {
  if (!page.isClosed()) {
    const video = page.video();
    await context.close();
    if (video) await video.saveAs(path.join(output, 'demo-web.webm'));
  } else {
    const video = page.video();
    if (video) await video.saveAs(path.join(output, 'demo-web.webm'));
  }
  await browser.close();
  await writeFile(
    path.join(output, 'ui-checks.json'),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), checks, errors, consoleErrors },
      null,
      2,
    ),
  );
}
