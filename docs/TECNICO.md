# Modelo orbital y arquitectura

## Separación de responsabilidades

La presentación está implementada con React Native, Expo SDK 58 y TypeScript. El código matemático no depende de React ni de APIs nativas y se puede probar en Node. La versión web comparte el motor y las pantallas; sustituye mapas nativos, recordatorios y background por implementaciones específicas de plataforma con límites visibles.

```
Pantallas → useTracker → motor SGP4 y predictor
                    ↘ repositorio local / cliente HTTP
                         ↘ proxy Node → proveedores + caché de disco
Servicios de sensores / notificaciones / tareas de background
```

`src/core/orbital.ts` envuelve satellite.js **6.0.2**, versión con `json2satrec` y corrección de EPOCH terminado en Z. Se fija esta versión porque la distribución 7.1.0 exporta módulos WASM de Emscripten que fallaron al minificarse con Metro en este proyecto. No se reemplazó SGP4 por una órbita circular de demostración.

## Propagación y unidades

1. CelesTrak/Space-Track entregan OMM en JSON. Se validan los campos numéricos, epoch y NORAD ID, sin truncarlo a cinco dígitos. TLE se admite para fuentes de respaldo.
2. `json2satrec` / `twoline2satrec` inicializan el registro orbital; la librería usa SGP4 y selecciona las perturbaciones de espacio profundo para períodos superiores a 225 min. Se usa WGS72 internamente, de acuerdo con los elementos NORAD y satellite.js.
3. `propagate` calcula posición ECI/TEME en km y velocidad en km/s para una fecha UTC.
4. El tiempo sideral de Greenwich permite convertir a coordenadas terrestres y geodéticas: latitud/longitud en grados, altitud en km.
5. El observador ingresa latitud/longitud en grados y altitud en **metros**. La conversión topocéntrica usa radianes y altura en km. `ecfToLookAngles` devuelve azimut (0=N, 90=E), elevación y distancia oblicua.
6. Se propaga exactamente en el timestamp de las APIs al validar, evitando atribuir la latencia de red al error orbital.

El registro SGP4 se reutiliza por objeto/epoch/fuente. Un error de propagación o posible reentrada produce un estado explícito, no coordenadas cero presentadas como reales. JavaScript Date tiene resolución de milisegundos; el redondeo del epoch puede representar hasta unos metros en el sentido de avance de un LEO.

## Ventanas AOS/TCA/LOS

El predictor examina 24, 48 o 72 h con pasos gruesos de 60 s. Cada máximo local se refina por búsqueda de sección áurea antes de detectar cruces, para recuperar pases rasantes de duración menor a un minuto. Los cruces de la máscara de elevación se refinan por bisección hasta intervalos menores a 250 ms. TCA se busca alrededor del mejor candidato grueso del intervalo; esto permite también tratar GEO sin asumir que una curva de varios días tenga un solo máximo.

El muestreo devuelve el control al hilo JavaScript cada 80 propagaciones, comprueba cancelación y evita publicar resultados de una selección anterior. La trayectoria polar se muestrea cada 10 s, o en hasta unas 360 muestras para ventanas continuas largas. El catálogo se virtualiza y la constelación se limita a 20/40/80 objetos calculados por lotes de 12 con un único cambio de estado al terminar.

Un pase ya iniciado se marca `ongoing`: su AOS anterior no se inventa y el gráfico empieza en el instante de búsqueda. Si continúa al final del horizonte, `continuous` señala que ese límite no es un LOS físico. GEO puede permanecer visible durante toda la búsqueda.

### Radio y observación óptica

El criterio de radio es superar la máscara seleccionada. Para una posible observación óptica se exige satélite iluminado y altura solar del observador <= −6°. La posición solar viene de satellite.js; se aproxima la umbra terrestre por un cilindro de radio ecuatorial. Las ventanas ópticas se muestrean, con resolución aproximada de 10 s para pases LEO; no tienen la precisión subsegundo de AOS/LOS.

No se estima magnitud aparente ni meteorología. Un objeto iluminado puede ser demasiado tenue; estar sobre el horizonte no significa que se vea a simple vista.

## Mapa, antimeridiano y cobertura

El atlas equirectangular es un vector de Natural Earth 1:110m de dominio público, empaquetado para funcionar sin tiles ni API key. Incluye grilla, observador, marcador interpolado durante 1,7 s, ground track pasado discontinuo y futuro continuo, y capas independientes. El mapa nativo opcional usa react-native-maps: `MarkerAnimated`, `Polyline` y `Circle` geográfico.

El ground track comprende media órbita pasada y una completa futura. Se muestrea a 60 s también en MEO/GEO. Cuando dos longitudes difieren más de 180°, se interpola el cruce y se cierra un segmento en +180/−180 y se abre otro en el borde opuesto.

Para altura h, radio terrestre R y elevación mínima e, el radio angular de cobertura es:

`ψ = acos(R / (R + h) · cos(e)) − e`

El círculo geográfico tiene radio superficial `R·ψ`. El atlas dibuja el casquete esférico con longitudes desenrolladas, repetición en los bordes y recorte al mundo; incluye los casquetes que alcanzan polos. No se usa un círculo plano en grados. La Tierra es esférica para cobertura y distancia haversine; error 3D y conversiones geodéticas emplean WGS84.

## Ciclo de vida y estado

- Posición local cada 2 s; pausa al dejar de estar activa la app.
- Ground track cada minuto; predicción cada 15 min, cambio de elementos, lugar o máscara.
- Consulta de TTL al iniciar, volver al primer plano y cada 15 min; solo hay red al vencer las 18 h.
- AsyncStorage conserva ajustes, objeto seleccionado, catálogos, cuotas, recordatorios e historial de validación.
- La ubicación inicial Buenos Aires es **manual y visible**. GPS requiere acción del usuario y permiso; la denegación no impide usar coordenadas manuales.
- Los sensores se suscriben solo en la pantalla de orientación y se liberan al salir. Se suaviza el rumbo por diferencia angular para evitar saltos de 359° a 0°.

## Notificaciones y background

expo-notifications programa avisos locales fechados en `AOS − N minutos`; se solicita permiso al activar un aviso o probarlo, y Android crea el canal de alta importancia. Se rechaza un aviso si la anticipación ya pasó. El usuario puede cancelarlo. Máximo de 50 recordatorios, debajo del límite de 64 notificaciones pendientes de iOS.

En Android se declara `SCHEDULE_EXACT_ALARM`, se comprueba el permiso especial y se abre la pantalla del sistema al configurar un aviso si hace falta. La entrega fechada usa `alarmClock` para evitar el retraso de alarmas aproximadas; Android puede mostrar un indicador de alarma próxima. Si el usuario no habilita el permiso, se informa el motivo sin registrar un falso éxito. El recálculo en background comprueba permisos sin abrir interfaces del sistema.

expo-background-task y expo-task-manager definen la tarea global antes del montaje de React. Un intervalo mínimo de 60 min renueva los catálogos usados y vuelve a predecir los pases configurados para actualizar/cancelar recordatorios. Se conserva una coincidencia de AOS a ±20 min; si no existe, se cancela el aviso obsoleto. El sistema decide cuándo ejecutar según batería, red y restricciones. Forzar el cierre puede detener las tareas. Los recordatorios ya programados pertenecen al planificador nativo y no dependen de un temporizador JS activo.

La brújula usa la API de rumbo de expo-location (magnetómetro fusionado por el sistema) y expo-sensors/DeviceMotion para inclinación. El norte magnético se informa como tal cuando no hay rumbo verdadero. No es AR con cámara ni una herramienta de apuntamiento de precisión.

## Límites conocidos

SGP4 describe los elementos medios disponibles, no una efeméride de precisión. Arrastre real, maniobras, elementos antiguos, refacción atmosférica, relieve, obstáculos y errores GPS/magnéticos limitan el resultado. El atlas tiene detalle cartográfico reducido. No se ha medido rendimiento en todos los modelos de teléfono; los límites y lotes reducen el trabajo en JS sin afirmar aislamiento en un worker nativo.

No se entregan mediciones N2YO ni un APK firmado sin una credencial/cadena de herramientas disponible. Ver los informes para diferenciar implementado, verificado automáticamente y pendiente de dispositivo.
