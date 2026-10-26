# Informe de validación

Ejecución real: 2026-10-26T17:15:58.950Z. Satélite: ISS, NORAD 25544. Elementos OMM, fuente CelesTrak, epoch 2026-10-26T05:01:03.508032Z.

Se propaga con satellite.js 6.0.2 en el timestamp UTC informado por cada referencia, no al recibir la respuesta. Distancia 3D ECEF sobre WGS84; superficie por haversine; diferencia de altitud absoluta. Unidades: km.

| Timestamp de referencia UTC | Fuente | Edad orbital (h) | Error 3D (km) | Superficie (km) | Altitud (km) |
|---|---|---:|---:|---:|---:|
| 2026-10-26T17:15:56.000Z | wheretheiss | 12.248 | 0.2992 | 0.2815 | 0.0120 |
| 2026-10-26T17:15:57.000Z | wheretheiss | 12.248 | 0.2992 | 0.2815 | 0.0120 |
| 2026-10-26T17:15:58.000Z | wheretheiss | 12.248 | 0.2992 | 0.2815 | 0.0121 |

Muestras: 3; error 3D medio 0.2992 km, máximo 0.2992 km. Estas muestras no permiten extrapolar un error global ni separar diferencias de elementos, modelo y precisión de la referencia.

N2YO: pendiente de una API key personal; no se incluyeron resultados ficticios. Configurar N2YO_API_KEY en .env y ejecutar npm run validate.



La referencia puede utilizar otros elementos y convenciones de altitud. La antigüedad del TLE/OMM, las maniobras y el redondeo del timestamp afectan el resultado. El modelo no incorpora corrección atmosférica fina ni maniobras no publicadas. Los datos crudos y el catálogo usado están en [evidence/validation.json](evidence/validation.json), y la tabla procesable en [evidence/validation.csv](evidence/validation.csv).

Para repetir: npm run validate (acceso a Internet necesario). El modo Validación de la app permite comparar cualquier objeto con N2YO y exportar las mediciones a CSV.
