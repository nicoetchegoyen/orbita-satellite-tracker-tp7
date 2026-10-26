# Trazabilidad de la consigna

## Requisitos funcionales

| ID | Implementación concreta | Verificación disponible |
|---|---|---|
| RF-01 | Catálogo OMM por grupos, búsqueda por nombre y NORAD completo, consulta de ID exacto; lista virtualizada | Prueba visual de búsqueda 25544; parser con ID 123456 |
| RF-02 | satellite.js 6.0.2, SGP4/espacio profundo, cálculo ECI/geodético local | Vector Vallado, LEO/MEO/GEO, altitud y velocidad |
| RF-03 | Conversión ECF/topocéntrica para observador GPS o manual, altura m→km | Pruebas de rangos y pantalla de telemetría |
| RF-04 | AOS/TCA/LOS, refinamiento grueso/fino, cancelación, horizonte 24/48/72 h, GEO continuo y pase iniciado | Cruces ±1 s; máximo; pase rasante menor a 60 s; GEO continuo |
| RF-05 | Sky chart react-native-svg con horizonte, elevaciones, cardinales, trayectoria, AOS/LOS/TCA y posición actual | Pruebas de proyección y revisión visual |
| RF-06 | Recordatorio local AOS−N minutos; permisos, canal, persistencia, cancelación y prueba | Implementado; entrega del sistema pendiente de dispositivo nativo |
| RF-07 | Rumbo verdadero/magnético, giro relativo, inclinación y estado de calibración; sensores liberados al salir | Fallback web revisado; precisión de hardware pendiente |
| RF-08 | Estaciones, Starlink, GPS, meteorológicos y GEO | Cinco catálogos públicos reales descargados |
| RF-09 | TTL 18 h, comprobación al abrir/volver y cada 15 min; cuotas por fuente; tarea de background opcional | Pruebas de TTL, deduplicación y cuota persistida |
| RF-10 | Atlas mundial offline con marcador interpolado cada 2 s; react-native-maps opcional | Vista web y móvil; empaquetado nativo |
| RF-11 | Media órbita pasada + una futura, muestras de 60 s, intersección y corte exacto en ambos bordes | Prueba de período completo y cruces en ambos sentidos |
| RF-12 | Casquete esférico por altitud y máscara 0/5/10/20/30°, Circle geográfico en mapa nativo | Radio decreciente con máscara, cero a 90°, inspección visual |
| RF-13 | Starlink real en lotes de 12, límite 20/40/80, una actualización de estado por lote completo, throttling 2 s | Demo con 40 objetos; límites configurables |
| RF-14 | Interfaz DataProvider; cuatro clases; repositorios, caché local/disco, cola y fallback | Pruebas de caída primaria, caché vencida/corrupta, reintentos y cuotas |
| RF-15 | Comparación ECEF con timestamp de N2YO/Where the ISS at?, km, historial y CSV | Tres mediciones reales ISS; N2YO pendiente de API key |
| RF-16 | Edad del epoch, fuente/formato, estado de caché, advertencia >48 h y snapshot declarado | Prueba de snapshot/epoch intacto y escenario sin APIs |

El stack de bibliotecas de la consigna es sugerido: se usan expo-location, expo-notifications y expo-background-task como equivalentes Expo de geolocation-service, notifee y background-fetch. El motor no se consulta desde una API de posiciones para animar la UI.

## Entregables

| Entregable | Ubicación / estado |
|---|---|
| Código fuente | Proyecto completo en esta carpeta; repositorio Git local. No se publica un remoto sin destino indicado. |
| Proyecto Metro ejecutable | `npm ci`, `npm run server`, `npm start`; `npm run dev` abre la variante web. |
| APK / TestFlight | Alternativa al proyecto Metro; perfiles EAS provistos. No generado sin SDK Android/JDK ni cuenta de build. |
| Documento técnico | `docs/TECNICO.md` |
| Informe de validación | `docs/VALIDACION.md`, JSON crudo y CSV en `docs/evidence/` |
| Decisiones sobre fuentes | `docs/FUENTES.md` |
| Video demo | `docs/evidence/demo-web.webm` (demostración web). La notificación nativa debe añadirse desde un dispositivo, según `docs/DEMO.md`. |
| Evidencia de pruebas | `docs/PRUEBAS.md`, capturas y registro de flujos en `docs/evidence/` |

## Pendientes que requieren recursos externos

- API key N2YO y cuenta Space-Track: el código está implementado, pero no se inventan credenciales ni mediciones de esas cuentas.
- Dispositivo Android/iOS: comprobar magnetómetro, inclinación, permisos, aviso con pantalla bloqueada, cancelación y reprogramación en background.
- Android SDK/JDK o EAS autenticado para producir un APK; Apple/Xcode o EAS para TestFlight. El proyecto ejecutable vía Metro satisface la alternativa de entrega indicada en el PDF.

Los estados anteriores distinguen desarrollo de verificación. Una compilación JS nativa no demuestra que los servicios de un sistema operativo entreguen notificaciones o ejecuten tareas en un teléfono real.
