# Demostración y verificación en dispositivo

## Video incluido

`evidence/demo-web.webm` recorre la interfaz real con catálogos y posiciones SGP4 reales. Muestra selección de ISS por NORAD ID, mapa actualizado, ground track, footprint, Starlink, próximo pase y sky chart, comparación contra Where the ISS at?, exportación y vista previa de un aviso. No es una captura de un teléfono ni evidencia de una notificación nativa.

Para repetir con Chrome instalado, iniciar `npm run dev` y luego:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH=(Join-Path (Get-Location) 'tmp\playwright')
npx playwright install ffmpeg
npm run demo:record
```

La grabación usa una instancia de Chrome aislada. No utiliza pestañas personales ni datos de sesión del usuario. Se generan capturas desktop y a 390 px, CSV de la UI y `ui-checks.json`. Las pruebas de fallback bloquean únicamente los endpoints de API en un contexto separado, manteniendo la app local servida para poder arrancar.

## Completar demo nativa exigida en la consigna

En Android físico (o iOS), ejecutar el proyecto con Metro y un cliente compatible o instalar el build preview. Preparar `EXPO_PUBLIC_API_URL` con la IP de la PC y el proxy activo. Activar GPS o configurar manualmente un observador con un pase próximo.

1. Buscar **25544** y seleccionar ISS. Grabar la posición y telemetría cambiando en el mapa.
2. Mostrar trayectoria pasada/futura y footprint. Cambiar máscara 10°→20° para mostrar la reducción del área.
3. Activar Starlink y mostrar la capa limitada; probar 20/40/80 desde Ajustes.
4. Abrir Pases, elegir un pase, mostrar AOS/TCA/LOS y el gráfico polar.
5. Elegir anticipación válida y pulsar Avisarme. Aceptar permisos si corresponde. Abrir Ajustes para verificar el recordatorio y luego cancelarlo si solo era una prueba.
   En Android 12+ habilitar también el acceso especial a alarmas exactas si el sistema lo solicita. Android puede mostrar el aviso como próxima alarma.
6. Pulsar **Probar notificación**, bloquear la pantalla y grabar el aviso local que debe dispararse cinco segundos después. Este es el fragmento nativo que falta en el video web.
7. Abrir Orientación, activar sensores, mover el equipo y comprobar rumbo, giro e inclinación. Confirmar el aviso cuando está bajo el horizonte.
8. Comparar ISS contra Where the ISS at?; para N2YO configurar la clave y grabar una medición adicional.

## Matriz de comprobación nativa

| Escenario | Resultado esperado | Estado en este entorno |
|---|---|---|
| Permiso de GPS denegado | mensaje y coordenadas manuales utilizables | Implementado; pendiente de teléfono |
| Modo avión después de una descarga | SGP4, mapa offline y pases sin pedir posiciones por red | Motor y fallback probados; pendiente del modo avión físico |
| Recordatorio futuro | notificación en AOS−N min incluso con app en background | Implementado; pendiente de teléfono |
| Aviso de prueba | entrega en cinco segundos | Implementado; pendiente de teléfono |
| Permisos de notificación denegados | estado explicativo y sin falso éxito | Implementado; pendiente de teléfono |
| Cancelar recordatorio | desaparece de pendientes y no se entrega | Implementado; pendiente de teléfono |
| Cambiar elementos/observador y refrescar | predicción y avisos futuros reconciliados | Implementado; pendiente de scheduler nativo |
| Reinicio / ahorro de batería / cierre forzado | comportamiento según WorkManager/BGTaskScheduler, sin promesa de hora exacta | Pendiente de teléfono |
| Brújula sin sensor / sin calibración | estado explícito o advertencia; referencia manual utilizable | Fallback web probado; hardware pendiente |
| Google Maps sin API key | atlas disponible por defecto | Implementado |

El sistema operativo puede retrasar la tarea periódica; esta no sustituye al planificador de las notificaciones locales ya programadas. El estado de permisos y políticas de batería se debe registrar al verificar en cada plataforma.
