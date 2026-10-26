import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import type { Tracker } from '../hooks/useTracker';
import { C, ui, mono } from '../ui/theme';
import { Button, Badge, Empty, Chip, SectionTitle } from '../ui/components';
import { SkyChart } from '../ui/SkyChart';
import { time, date, duration, direction, countdown } from '../ui/format';
import { listReminders, scheduleReminder, cancelReminder } from '../services/reminders';
export function Passes({ tracker: t }: { tracker: Tracker }) {
  const [selectedId, setSelectedId] = useState(''),
    [reminders, setReminders] = useState<string[]>([]),
    [busy, setBusy] = useState(false);
  const pass = t.passes.find((p) => p.id === selectedId) || t.passes[0];
  const wide = useWindowDimensions().width > 1060;
  useEffect(() => {
    listReminders().then((r) => setReminders(r.map((v) => v.id)));
  }, []);
  async function toggle() {
    if (!pass || !t.selected) return;
    setBusy(true);
    try {
      if (reminders.includes(pass.id)) {
        await cancelReminder(pass.id);
        t.setNotice('Recordatorio cancelado.');
      } else {
        await scheduleReminder(t.selected, pass, t.settings);
        t.setNotice(`Aviso programado ${t.settings.leadMinutes} minutos antes del pase.`);
      }
      setReminders((await listReminders()).map((r) => r.id));
    } catch (e) {
      t.setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 22 }}>
      <View>
        <Text style={ui.label}>PLANIFICÁ TU OBSERVACIÓN</Text>
        <Text style={[ui.h1, { marginTop: 8 }]}>
          Próximos pases<Text style={{ color: C.lime }}>.</Text>
        </Text>
        <Text style={[ui.body, { marginTop: 7 }]}>
          {t.selected?.name} desde {t.settings.observer.name}. Horarios en la zona local del
          dispositivo.
        </Text>
      </View>
      <View style={[ui.row, { gap: 8, flexWrap: 'wrap' }]}>
        <Chip
          label="Todos los pases"
          active={!t.settings.opticalOnly}
          onPress={() => void t.saveSettings({ ...t.settings, opticalOnly: false })}
        />
        <Chip
          label="Solo ópticos"
          active={t.settings.opticalOnly}
          onPress={() => void t.saveSettings({ ...t.settings, opticalOnly: true })}
        />
        <Text style={{ color: C.dim, fontSize: 12, marginLeft: 6 }}>
          Umbral {t.settings.minElevation}° · Ventana {t.settings.horizonHours} h
        </Text>
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20, alignItems: 'flex-start' }}>
        <View style={[ui.card, { flex: 1, width: '100%', padding: 20 }]}>
          <SectionTitle
            title="Agenda orbital"
            right={<Badge label={`${t.passes.length} PASES`} color={C.blue} />}
          />
          {!t.passes.length ? (
            <Empty
              title={t.predicting ? 'Buscando ventanas…' : 'Sin pases en este intervalo'}
              body="Probá ampliar el horizonte de búsqueda, bajar la elevación mínima o mostrar también pases de radio en Ajustes."
              loading={t.predicting}
            />
          ) : (
            t.passes.map((p, i) => (
              <Pressable
                key={p.id}
                onPress={() => setSelectedId(p.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: p.id === pass?.id }}
                style={{
                  padding: 17,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: p.id === pass?.id ? '#617D47' : C.border,
                  borderRadius: 12,
                  backgroundColor: p.id === pass?.id ? '#BBF57808' : C.bg,
                  gap: 10,
                }}
              >
                <View style={ui.between}>
                  <Text style={{ color: C.dim, fontFamily: mono, fontSize: 11 }}>
                    {String(i + 1).padStart(2, '0')} / {date(p.aos)}
                  </Text>
                  <Badge
                    label={p.optical ? 'ÓPTICO POSIBLE' : 'RADIO'}
                    color={p.optical ? C.lime : C.blue}
                  />
                </View>
                <View style={ui.between}>
                  <Text style={{ fontSize: 24, color: C.text, fontFamily: mono }}>
                    {time(p.aos)}{' '}
                    <Text style={{ fontSize: 13, color: C.dim }}>
                      → {p.continuous ? '…' : time(p.los)}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 18, color: C.lime, fontFamily: mono }}>
                    {p.maxElevation.toFixed(1)}°
                  </Text>
                </View>
                <View style={ui.between}>
                  <Text style={{ color: C.dim, fontSize: 11 }}>
                    {p.continuous
                      ? 'Visibilidad continua hasta el final de la búsqueda'
                      : duration(p.los - p.aos)}{' '}
                    · {direction(p.aosAzimuth)} → {direction(p.losAzimuth)}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>
                    {countdown(p.aos - t.now)}
                    {reminders.includes(p.id) ? ' · ♧' : ''}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
        <View style={[ui.card, { width: wide ? 350 : '100%', padding: 22, gap: 20 }]}>
          <Text style={ui.label}>TRAYECTORIA EN TU CIELO</Text>
          <SkyChart pass={pass} current={t.position} />
          {pass && (
            <>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                {[
                  ['AOS', pass.aos],
                  ['MÁXIMO', pass.tca],
                  ['LOS', pass.los],
                ].map(([label, value]) => (
                  <View key={label} style={{ gap: 6 }}>
                    <Text style={[ui.label, { fontSize: 9 }]}>{label}</Text>
                    <Text style={{ color: C.text, fontFamily: mono, fontSize: 13 }}>
                      {time(Number(value), true)}
                    </Text>
                  </View>
                ))}
              </View>
              {pass.opticalWindows.map((w, i) => (
                <Text key={i} style={{ color: C.lime, fontSize: 11 }}>
                  Ventana óptica aprox.: {time(w.start, true)} – {time(w.end, true)}
                </Text>
              ))}
              <Button
                label={
                  reminders.includes(pass.id)
                    ? 'Cancelar aviso'
                    : `Avisarme ${t.settings.leadMinutes} min antes`
                }
                icon="bell"
                primary={!reminders.includes(pass.id)}
                onPress={() => void toggle()}
                disabled={busy}
              />
            </>
          )}
          <Text style={{ color: C.dim, fontSize: 11, lineHeight: 18 }}>
            El borde es el horizonte; el centro es el cenit. Norte arriba y este a la derecha. El
            punto azul es la posición actual si está sobre el horizonte.
          </Text>
          <Text style={{ color: C.dim, fontSize: 11, lineHeight: 18 }}>
            Óptico posible: satélite iluminado y Sol del observador bajo −6°. No garantiza brillo
            suficiente ni cielo despejado.
          </Text>
          {pass?.ongoing && (
            <Text style={{ color: C.amber, fontSize: 11 }}>
              Pase ya iniciado: el inicio del gráfico está limitado al momento de cálculo.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
