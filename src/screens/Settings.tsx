import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Switch, Platform } from 'react-native';
import type { Tracker } from '../hooks/useTracker';
import { C, ui } from '../ui/theme';
import { Button, Chip, Badge, SectionTitle } from '../ui/components';
import { providerHealth, apiUrl } from '../data/client';
import { testNotification, listReminders, cancelReminder } from '../services/reminders';
import type { Reminder } from '../services/reminders';
import { time, date } from '../ui/format';
export function Settings({ tracker: t }: { tracker: Tracker }) {
  const [draft, setDraft] = useState(t.settings),
    [lat, setLat] = useState(String(t.settings.observer.latitude)),
    [lon, setLon] = useState(String(t.settings.observer.longitude)),
    [alt, setAlt] = useState(String(t.settings.observer.altitude));
  const [health, setHealth] = useState<{ n2yo: boolean; spacetrack: boolean } | null>(null),
    [reminders, setReminders] = useState<Reminder[]>([]),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    providerHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
    listReminders().then(setReminders);
  }, []);
  useEffect(() => {
    setDraft(t.settings);
    setLat(String(t.settings.observer.latitude));
    setLon(String(t.settings.observer.longitude));
    setAlt(String(t.settings.observer.altitude));
  }, [t.settings]);
  async function save() {
    setBusy(true);
    try {
      const latitude = Number(lat.replace(',', '.')),
        longitude = Number(lon.replace(',', '.')),
        altitude = Number(alt.replace(',', '.'));
      if (
        !lat.trim() ||
        !lon.trim() ||
        !alt.trim() ||
        ![latitude, longitude, altitude].every(Number.isFinite) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180 ||
        altitude < -500 ||
        altitude > 20000
      )
        throw new Error(
          'Ingresá latitud entre −90 y 90, longitud entre −180 y 180, y altitud entre −500 y 20.000 m.',
        );
      const unchanged =
        latitude === t.settings.observer.latitude &&
        longitude === t.settings.observer.longitude &&
        altitude === t.settings.observer.altitude &&
        draft.observer.name === t.settings.observer.name;
      await t.saveSettings({
        ...draft,
        observer: {
          ...draft.observer,
          latitude,
          longitude,
          altitude,
          source: unchanged ? t.settings.observer.source : 'manual',
        },
      });
    } catch (e) {
      t.setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    try {
      t.setNotice(await testNotification());
    } catch (e) {
      t.setNotice((e as Error).message);
    }
  }
  return (
    <View style={{ gap: 22 }}>
      <View>
        <Text style={ui.label}>TU ESTACIÓN EN TIERRA</Text>
        <Text style={[ui.h1, { marginTop: 8 }]}>
          Ajustes de misión<Text style={{ color: C.lime }}>.</Text>
        </Text>
        <Text style={[ui.body, { marginTop: 7 }]}>
          Configurá tu observador, los pases y las alertas.
        </Text>
      </View>
      <View style={[ui.card, { padding: 24, gap: 20 }]}>
        <SectionTitle
          title="Ubicación del observador"
          right={<Button small label="Usar mi GPS" icon="pin" onPress={() => void t.locate()} />}
        />
        <Field
          label="Nombre del lugar"
          value={draft.observer.name}
          onChange={(name) => setDraft({ ...draft, observer: { ...draft.observer, name } })}
        />
        <View style={[ui.row, { gap: 14, flexWrap: 'wrap' }]}>
          <Field label="Latitud · grados" value={lat} onChange={setLat} numeric />
          <Field label="Longitud · grados" value={lon} onChange={setLon} numeric />
          <Field label="Altitud · metros" value={alt} onChange={setAlt} numeric />
        </View>
        <Text style={{ color: C.dim, fontSize: 11 }}>
          Latitud sur y longitud oeste son negativas. La altitud se ingresa en metros y se convierte
          a km dentro del motor.
        </Text>
      </View>
      <View style={[ui.card, { padding: 24, gap: 23 }]}>
        <Text style={ui.title}>Predicción y visualización</Text>
        <Choice
          label="Elevación mínima (máscara de horizonte)"
          values={[0, 5, 10, 20, 30]}
          value={draft.minElevation}
          suffix="°"
          onChange={(minElevation) => setDraft({ ...draft, minElevation })}
        />
        <Choice
          label="Horizonte de predicción"
          values={[24, 48, 72]}
          value={draft.horizonHours}
          suffix=" h"
          onChange={(horizonHours) => setDraft({ ...draft, horizonHours })}
        />
        <Choice
          label="Máximo de marcadores Starlink"
          values={[20, 40, 80]}
          value={draft.constellationLimit}
          suffix=""
          onChange={(constellationLimit) => setDraft({ ...draft, constellationLimit })}
        />
        <Toggle
          label="Mostrar solo pases ópticos posibles"
          body="Satélite iluminado y crepúsculo civil terminado en tu ubicación."
          value={draft.opticalOnly}
          onChange={(opticalOnly) => setDraft({ ...draft, opticalOnly })}
        />
      </View>
      <View style={[ui.card, { padding: 24, gap: 23 }]}>
        <Text style={ui.title}>Avisos y segundo plano</Text>
        <Choice
          label="Anticipación del recordatorio"
          values={[1, 3, 5, 10, 15]}
          value={draft.leadMinutes}
          suffix=" min"
          onChange={(leadMinutes) => setDraft({ ...draft, leadMinutes })}
        />
        <Toggle
          label="Renovar datos y recordatorios en segundo plano"
          body="Intervalo mínimo de 60 min. El sistema decide cuándo ejecutar; no es un temporizador exacto."
          value={draft.backgroundEnabled}
          onChange={(backgroundEnabled) => setDraft({ ...draft, backgroundEnabled })}
        />
        <View style={{ alignSelf: 'flex-start' }}>
          <Button label="Probar notificación" icon="bell" onPress={() => void test()} />
        </View>
        {Platform.OS === 'web' && (
          <Text style={{ color: C.amber, fontSize: 11 }}>
            Las notificaciones programadas y tareas en segundo plano se ejecutan en Android/iOS. En
            web se muestra una vista previa de prueba.
          </Text>
        )}
        {reminders.map((r) => (
          <View key={r.id} style={[ui.between, { gap: 10 }]}>
            <Text style={{ color: C.muted, fontSize: 12, flex: 1 }}>
              {r.object.name} · {date(r.aos)} {time(r.aos)} · {r.leadMinutes} min antes
            </Text>
            <Button
              small
              label="Cancelar"
              onPress={() =>
                void cancelReminder(r.id).then(() => listReminders().then(setReminders))
              }
            />
          </View>
        ))}
      </View>
      <View style={[ui.card, { padding: 24, gap: 18 }]}>
        <SectionTitle
          title="Fuentes de datos"
          right={
            <Badge
              label={health ? 'PROXY CONECTADO' : 'PROXY SIN CONEXIÓN'}
              color={health ? C.lime : C.amber}
            />
          }
        />
        <Text selectable style={ui.body}>
          {apiUrl()}
        </Text>
        {[
          ['CelesTrak', 'Público · GP y Starlink SupGP · caché 18 h'],
          [
            'Space-Track',
            health?.spacetrack
              ? 'Credenciales configuradas en el servidor'
              : 'Sin credenciales · alternativa opcional',
          ],
          [
            'N2YO',
            health?.n2yo
              ? 'API key configurada · validación disponible'
              : 'Sin API key · configurá N2YO_API_KEY en el servidor',
          ],
          ['Where the ISS at?', 'Público · validación ISS · mínimo 1,1 s entre consultas'],
        ].map(([name, body]) => (
          <View
            key={name}
            style={{ gap: 5, paddingBottom: 14, borderBottomWidth: 1, borderColor: C.border }}
          >
            <Text style={{ color: C.text, fontSize: 14 }}>{name}</Text>
            <Text style={{ color: C.dim, fontSize: 11, lineHeight: 18 }}>{body}</Text>
          </View>
        ))}
        <Text style={{ color: C.dim, fontSize: 11, lineHeight: 18 }}>
          Starlink no ofrece una API pública de seguimiento de su constelación. Se utilizan los
          elementos suplementarios de CelesTrak derivados de las efemérides publicadas por SpaceX.
        </Text>
        {t.catalog?.warnings.map((w, i) => (
          <Text key={i} style={{ color: C.amber, fontSize: 11, lineHeight: 18 }}>
            {w}
          </Text>
        ))}
      </View>
      <View style={{ alignSelf: 'flex-start', marginBottom: 16 }}>
        <Button
          primary
          label={busy ? 'Guardando…' : 'Guardar preferencias'}
          icon="check"
          disabled={busy}
          onPress={() => void save()}
        />
      </View>
    </View>
  );
}
function Field({
  label,
  value,
  onChange,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  numeric?: boolean;
}) {
  return (
    <View style={{ flex: 1, minWidth: 160, gap: 9 }}>
      <Text style={[ui.label, { fontSize: 10, letterSpacing: 0.5 }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        style={ui.input}
        keyboardType={numeric ? 'numbers-and-punctuation' : 'default'}
        autoCorrect={false}
      />
    </View>
  );
}
function Choice({
  label,
  values,
  value,
  suffix,
  onChange,
}: {
  label: string;
  values: number[];
  value: number;
  suffix: string;
  onChange: (n: number) => void;
}) {
  return (
    <View style={{ gap: 11 }}>
      <Text style={ui.body}>{label}</Text>
      <View style={[ui.row, { gap: 8, flexWrap: 'wrap' }]}>
        {values.map((n) => (
          <Chip key={n} label={n + suffix} active={value === n} onPress={() => onChange(n)} />
        ))}
      </View>
    </View>
  );
}
function Toggle({
  label,
  body,
  value,
  onChange,
}: {
  label: string;
  body: string;
  value: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <View style={[ui.between, { gap: 20 }]}>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color: C.text, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: C.dim, fontSize: 11, lineHeight: 18 }}>{body}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.border, true: '#5A813E' }}
        thumbColor={value ? C.lime : C.muted}
      />
    </View>
  );
}
