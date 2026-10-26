import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Tracker } from '../hooks/useTracker';
import type { ValidationResult } from '../core/types';
import { validatePosition } from '../services/validation';
import { C, ui, mono } from '../ui/theme';
import { Button, Chip, Empty, Badge } from '../ui/components';
import { time, date } from '../ui/format';
export function Validation({ tracker: t }: { tracker: Tracker }) {
  const [source, setSource] = useState<'wheretheiss' | 'n2yo'>(
      t.selected?.id === 25544 ? 'wheretheiss' : 'n2yo',
    ),
    [results, setResults] = useState<ValidationResult[]>([]),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem('validation:v1').then((s) => {
      if (s)
        try {
          setResults(JSON.parse(s));
        } catch {}
    });
  }, []);
  async function run() {
    if (!t.selected) return;
    setBusy(true);
    try {
      const result = await validatePosition(t.selected, t.settings.observer, source);
      const all = [result, ...results.filter((r) => r.id !== result.id)].slice(0, 100);
      setResults(all);
      await AsyncStorage.setItem('validation:v1', JSON.stringify(all));
      t.setNotice(`Error tridimensional observado: ${result.errorKm.toFixed(3)} km.`);
    } catch (e) {
      t.setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportCsv() {
    const csv =
      'NORAD,nombre,fuente,timestamp_UTC,epoch_UTC,antiguedad_h,error_3D_km,error_superficie_km,error_altitud_km\n' +
      results
        .map((r) =>
          [
            r.satelliteId,
            `"${r.name.replace(/"/g, '""')}"`,
            r.source,
            new Date(r.time).toISOString(),
            r.orbitalEpoch,
            r.orbitalAgeHours.toFixed(4),
            r.errorKm.toFixed(6),
            r.groundErrorKm.toFixed(6),
            r.altitudeErrorKm.toFixed(6),
          ].join(','),
        )
        .join('\n');
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(
        new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'validacion-satelital.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else await Share.share({ message: csv, title: 'Validación de Satellite Tracker' });
  }
  const last = results[0];
  return (
    <View style={{ gap: 22 }}>
      <View>
        <Text style={ui.label}>PRECISIÓN Y TRAZABILIDAD</Text>
        <Text style={[ui.h1, { marginTop: 8 }]}>
          Contrastá cada kilómetro<Text style={{ color: C.lime }}>.</Text>
        </Text>
        <Text style={[ui.body, { marginTop: 7 }]}>
          SGP4 local frente a una fuente externa, en el mismo instante UTC.
        </Text>
      </View>
      <View style={[ui.card, { padding: 24, gap: 20 }]}>
        <View style={[ui.between, { flexWrap: 'wrap', gap: 12 }]}>
          <View>
            <Text style={ui.title}>{t.selected?.name}</Text>
            <Text style={[ui.body, { marginTop: 4 }]}>
              NORAD {t.selected?.id} · Epoch {t.selected?.epoch}
            </Text>
          </View>
          <Badge label="REFERENCIA EXTERNA" color={C.blue} />
        </View>
        <View style={[ui.row, { gap: 8, flexWrap: 'wrap' }]}>
          <Chip
            label="Where the ISS at? · ISS"
            active={source === 'wheretheiss'}
            onPress={() => setSource('wheretheiss')}
          />
          <Chip
            label="N2YO · Cualquier satélite"
            active={source === 'n2yo'}
            onPress={() => setSource('n2yo')}
          />
        </View>
        <Text style={ui.body}>
          {source === 'n2yo'
            ? 'Configurá N2YO_API_KEY en el .env del servidor. La clave permanece fuera del bundle móvil.'
            : 'Fuente pública sin autenticación, exclusiva para NORAD 25544. Se usa el timestamp devuelto por la API.'}
        </Text>
        <View style={[ui.row, { gap: 12, flexWrap: 'wrap' }]}>
          <Button
            primary
            icon="check"
            label={busy ? 'Comparando…' : 'Comparar posición ahora'}
            onPress={() => void run()}
            disabled={busy || !t.selected || (source === 'wheretheiss' && t.selected.id !== 25544)}
          />
          <Button
            icon="download"
            label="Exportar CSV"
            onPress={() => void exportCsv()}
            disabled={!results.length}
          />
        </View>
      </View>
      {last && (
        <View style={[ui.row, { gap: 16, flexWrap: 'wrap' }]}>
          {[
            ['ERROR 3D', last.errorKm, 'km'],
            ['ERROR EN SUPERFICIE', last.groundErrorKm, 'km'],
            ['ANTIGÜEDAD ORBITAL', last.orbitalAgeHours, 'h'],
          ].map(([label, value, unit]) => (
            <View key={label} style={[ui.card, { padding: 22, flex: 1, minWidth: 190, gap: 10 }]}>
              <Text style={ui.label}>{label}</Text>
              <Text style={{ color: C.text, fontFamily: mono, fontSize: 29 }}>
                {Number(value).toFixed(3)}{' '}
                <Text style={{ color: C.dim, fontSize: 13 }}>{unit}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={[ui.card, { padding: 24, gap: 20 }]}>
        <Text style={ui.title}>Registro de mediciones</Text>
        {!results.length ? (
          <Empty
            title="Todavía no hay mediciones"
            body="Cada comparación registra el error real, el epoch orbital y la fuente. Los resultados persisten en este dispositivo."
          />
        ) : (
          <ScrollView horizontal>
            <View style={{ minWidth: 740 }}>
              <View
                style={[ui.row, { paddingBottom: 12, borderBottomWidth: 1, borderColor: C.border }]}
              >
                {['SATÉLITE / NORAD', 'FUENTE', 'FECHA LOCAL', 'EDAD · h', 'ERROR 3D · km'].map(
                  (h, i) => (
                    <Text
                      key={h}
                      style={[
                        ui.label,
                        { fontSize: 9, width: i === 0 ? 185 : i === 1 ? 140 : i === 2 ? 170 : 120 },
                      ]}
                    >
                      {h}
                    </Text>
                  ),
                )}
              </View>
              {results.map((r) => (
                <View
                  key={r.id}
                  style={[
                    ui.row,
                    { paddingVertical: 15, borderBottomWidth: 1, borderColor: C.border },
                  ]}
                >
                  <View style={{ width: 185, gap: 4 }}>
                    <Text style={{ color: C.text, fontSize: 12 }}>{r.name}</Text>
                    <Text style={{ color: C.dim, fontFamily: mono, fontSize: 10 }}>
                      {r.satelliteId}
                    </Text>
                  </View>
                  <Text style={{ width: 140, color: C.muted, fontSize: 12 }}>{r.source}</Text>
                  <Text style={{ width: 170, color: C.muted, fontFamily: mono, fontSize: 11 }}>
                    {date(r.time)} {time(r.time, true)}
                  </Text>
                  <Text style={{ width: 120, color: C.muted, fontFamily: mono, fontSize: 12 }}>
                    {r.orbitalAgeHours.toFixed(2)}
                  </Text>
                  <Text style={{ width: 120, color: C.lime, fontFamily: mono, fontSize: 14 }}>
                    {r.errorKm.toFixed(3)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
        <Text style={{ color: C.dim, fontSize: 11, lineHeight: 19 }}>
          Error 3D: distancia euclídea ECEF en km usando el elipsoide WGS84. Se informa también el
          error de superficie y de altitud. Las diferencias incluyen la antigüedad y el origen de
          los elementos orbitales; no se atribuyen únicamente al propagador.
        </Text>
      </View>
    </View>
  );
}
