# Verificación realizada

Fecha: 26 de octubre de 2026. Entorno: Windows, Node.js 24.15.0, Expo SDK 58, React Native 0.88, satellite.js 6.0.2. No hay Android SDK/JDK ni dispositivo móvil conectado en el entorno.

## Resultados

| Comprobación | Resultado |
|---|---|
| TypeScript (`npm run typecheck`) | Sin errores |
| Vitest (`npm test`) | **24/24** pruebas aprobadas en 2 archivos |
| Dependencias (`npx expo install --check`) | Compatibles con SDK 58 |
| Producción web (`npm run export:web`) | Bundle generado correctamente |
| Bundle Android (`expo export --platform android`) | Hermes generado correctamente |
| Bundle iOS (`expo export --platform ios`) | Hermes generado correctamente |
| Recorrido UI con Playwright/Chrome | **11/11** verificaciones, sin excepciones ni errores de consola |
| Diseño móvil | Verificado a 390 × 844, sin desborde horizontal |
| Validación externa real | 3 muestras ISS / Where the ISS at?, error 3D medio **0,2992 km** |
| Sensores, notificación nativa, scheduler en background | Implementados; pendientes de dispositivo físico |

El empaquetado nativo valida imports y compatibilidad del JavaScript con Hermes. No equivale a compilar un APK/IPA ni a ejecutar los módulos nativos en hardware. Las capturas móviles corresponden al navegador con viewport reducido, no a un emulador Android.

## Alcance de las pruebas automáticas

**Motor y geometría:** vector publicado Vallado 00005 a tsince=0, precisión temporal Date, rango de altitud/velocidad ISS, OMM con NORAD 123456, epoch con/sin Z, elementos inválidos, propagación de espacio profundo MEO/GEO, corte en ambos sentidos del antimeridiano, ground track futuro de una órbita, footprint y máscara, proyección polar y distancia 3D ECEF.

**Predicción:** AOS/LOS sobre la máscara con cruces comprobados ±1 s, TCA máximo local, recuperación de pase rasante menor a 60 s, cancelación y GEO continuo sin AOS/LOS inventados.

**Datos y credenciales:** TTL 18 h, deduplicación concurrente, fallback CelesTrak→Space-Track, caché vencida/corrupta, snapshot identificado sin cambiar epoch, espaciado público, cuota persistida tras reinicio, límite horario Space-Track, Retry-After, no reintentar 403 ni filtrar secretos, login/cookie Space-Track con respuestas controladas. Estas pruebas no afirman acceso real a una cuenta Space-Track.

## Flujos de interfaz

Los flujos registrados están en [evidence/ui-checks.json](evidence/ui-checks.json):

1. Inicio con ISS y telemetría SGP4.
2. Búsqueda y selección por NORAD 25544.
3. Activación de 40 Starlink reales, con aviso cuando se usa caché/snapshot.
4. Agenda y sky chart AOS/TCA/LOS.
5. Orientación con estado explícito de sensores no disponibles en web.
6. Comparación real Where the ISS at?.
7. Descarga de CSV desde la interfaz.
8. Rechazo de coordenadas inválidas antes de guardarlas.
9. Vista previa de notificación web, identificada como tal.
10. Diseño a 390 px sin desborde horizontal.
11. Primer inicio con endpoints de catálogos bloqueados, snapshot real y estado CACHÉ LOCAL.

Las evidencias incluyen [captura principal](evidence/01-explorar.png), [capa Starlink](evidence/02-starlink.png), [pases](evidence/03-pases.png), [validación](evidence/05-validacion.png), [móvil](evidence/07-mobile.png), [sin APIs](evidence/09-offline.png) y [video web](evidence/demo-web.webm). El escenario offline mantiene servido el bundle local y bloquea las APIs: demuestra independencia de los cálculos respecto de las fuentes, no instalación PWA ni caché de recursos web.

## Reproducción y límites

Ejecutar `npm run check` para pruebas sin red y `npm run validate` para nuevas muestras reales. `npm run demo:record` necesita la app/proxy activos, Chrome y el FFmpeg de Playwright (ver DEMO.md). Las mediciones dependen de elementos y referencias en la fecha registrada. Para notificaciones con pantalla bloqueada, GPS/sensores y tareas bajo políticas de batería, seguir [DEMO.md](DEMO.md).
