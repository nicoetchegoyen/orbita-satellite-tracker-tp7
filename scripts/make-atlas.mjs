import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoPath, geoEquirectangular } from 'd3-geo';
const require = createRequire(import.meta.url);
const world = require('world-atlas/land-110m.json');
const land = feature(world, world.objects.land);
// Preproject to an equirectangular atlas. Natural Earth 1:110m is public domain.
const path = geoPath(
  geoEquirectangular()
    .scale(180 / Math.PI)
    .translate([180, 90]),
).digits(3)(land);
mkdirSync('assets', { recursive: true });
writeFileSync(
  'assets/world-path.json',
  JSON.stringify({ path, source: 'Natural Earth, public domain; world-atlas 110m' }),
);
