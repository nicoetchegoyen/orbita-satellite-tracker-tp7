# Fuentes de datos y decisiones

## Interfaz común y orquestación

`DataProvider` define `getCatalog`, `getOrbitalData` y `getValidationPosition`. Implementaciones: `CelesTrakProvider`, `SpaceTrackProvider`, `N2yoProvider`, `WhereTheIssProvider`. Las operaciones que una API no ofrece devuelven un error explícito (por ejemplo, Where the ISS at? no tiene catálogo de Starlink).

El proxy utiliza CelesTrak como catálogo principal y Space-Track como alternativa. La obtención de un objeto tiene respaldo N2YO TLE y, para ISS, Where the ISS at?. El cliente intenta el proxy, caché local y acceso público directo; si no tiene ninguna descarga, dispone de un snapshot real con epoch original y advertencia de antigüedad. Los elementos elegidos, fuente y formato son visibles. Un fallback GP de Starlink nunca se etiqueta como SupGP.

## Por qué Starlink SupGP

Las APIs Enterprise de Starlink están destinadas a cuentas/terminales/telemetría; no son un catálogo público de posiciones de la constelación. Space Traffic Coordination exige acceso de operadores y certificados mTLS. No se utiliza ni se simula un acceso a esos servicios.

La fuente implementada es:

`https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=JSON`

CelesTrak ajusta elementos suplementarios a las efemérides publicadas por SpaceX. Si el set suplementario falla, se intenta el grupo GP estándar `GROUP=starlink&FORMAT=JSON`; luego Space-Track configurado. OMM/JSON conserva IDs de seis y más dígitos, a diferencia del TLE clásico. Cuando hay varios arcos para el mismo objeto, se toma el epoch más reciente que ya comenzó o el futuro más cercano si todos son futuros.

## Caché y presupuesto de consultas

| Fuente | Uso | Política implementada |
|---|---|---|
| CelesTrak | GP/OMM y Starlink SupGP | TTL 18 h por grupo; deduplicación; >=2 s entre requests, <=20/min y <=120/h como protección adicional |
| Space-Track | GP alternativo | credenciales solo servidor; >=2,2 s, <=28/min, <=280/h, por debajo de 30/min y 300/h |
| N2YO | TLE y posiciones de validación | API key solo servidor; >=1,2 s; <=60/min y <=950/h, bajo 1.000/h para los endpoints usados |
| Where the ISS at? | TLE y posición ISS | >=1,1 s; <=55/min; solo NORAD 25544 |

No se implementan llamadas N2YO visualpasses/radiopasses/above: el predictor es local. Si se agregan, deben tener su propio presupuesto <=100/h.

Las cuotas de ventana móvil se serializan por proveedor y se conservan en disco en el servidor; el acceso directo público las guarda en AsyncStorage. Las peticiones pendientes se encolan. No se descarga un catálogo en cada frame ni al pulsar actualizar si sigue dentro del TTL. Las llamadas concurrentes al mismo grupo comparten una sola promesa.

Para errores temporales de red o 5xx hay como máximo tres intentos con backoff 0,5/1 s (además del espaciado del proveedor). Se respeta Retry-After en segundos o fecha. Si la espera excede 15 s, se registra el enfriamiento y se devuelve control para usar fallback/caché. No se reintentan 4xx permanentes como 401/403. Timeout de proveedor 15 s por intento. El proxy cachea posiciones de validación por 10 s para evitar duplicados accidentales.

## Antigüedad

La fecha de descarga determina el TTL; el epoch indica la edad física del modelo. No son intercambiables. Un catálogo recién descargado puede contener elementos viejos: la interfaz alerta sobre epochs de más de 48 h y marca cualquier caché vencida. El snapshot no cambia su epoch para parecer actual. Su procedencia y cantidades se conservan en `assets/snapshot-metadata.json`.

## Credenciales y despliegue

Las credenciales se leen con dotenv en `server/index.ts`. No se incluyen en el código de React ni en variables públicas de Expo. La cookie de Space-Track se extrae de Set-Cookie, vive en memoria y se invalida al fallar la consulta; el login también pasa por el limitador. Los errores HTTP no contienen URL ni cuerpo remoto. El proxy solo permite endpoints y grupos predeterminados, valida IDs y coordenadas, restringe CORS y añade un límite de entrada por IP.

La implementación es para una instancia de proxy. Un despliegue con varias instancias debe sustituir el archivo local por un limitador/caché compartidos, además de HTTPS y autenticación. CORS no reemplaza autenticación.

## Referencias oficiales consultadas

- [CelesTrak GP y formatos](https://celestrak.org/NORAD/documentation/gp-data-formats.php)
- [Consultas SupGP y significado de FILE/SOURCE](https://celestrak.org/NORAD/documentation/sup-gp-queries.php)
- [Política de uso CelesTrak](https://celestrak.org/usage-policy.php)
- [API N2YO y presupuestos por endpoint](https://www.n2yo.com/api/)
- [Where the ISS at?](https://wheretheiss.at/w/developer)
- [Space-Track API](https://www.space-track.org/documentation)
- [satellite.js, código y releases](https://github.com/shashwatak/satellite-js)
- [Vallado, revisiting Spacetrack Report #3 y vectores de verificación](https://celestrak.org/publications/AIAA/2006-6753/)
- [Expo BackgroundTask](https://docs.expo.dev/versions/latest/sdk/background-task/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [react-native-maps en Expo](https://docs.expo.dev/versions/latest/sdk/map-view/)
- [Natural Earth, dominio público](https://www.naturalearthdata.com/about/terms-of-use/)
