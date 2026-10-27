import React, { useEffect, useState } from 'react';
import { View, Pressable, ScrollView, useWindowDimensions, StyleSheet } from 'react-native';
import type { Tracker } from '../hooks/useTracker';
import { C, ui, mono, fonts } from '../ui/theme';
import { Text } from '../ui/Text';
import { Icon } from '../ui/Icon';
import { Button, Badge, Empty, Chip, PageHeading, RuleLabel } from '../ui/components';
import { SkyChart } from '../ui/SkyChart';
import { time, date, duration, direction, countdown } from '../ui/format';
import { listReminders, scheduleReminder, cancelReminder } from '../services/reminders';

export function Passes({ tracker: t }: { tracker: Tracker }) {
  const [selectedId, setSelectedId] = useState(''),
    [reminders, setReminders] = useState<string[]>([]),
    [busy, setBusy] = useState(false);
  const pass = t.passes.find((p) => p.id === selectedId) || t.passes[0];
  const viewport = useWindowDimensions();
  const wide = viewport.width >= 1120;
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
    <View style={{ gap: 25 }}>
      <PageHeading
        index="02"
        eyebrow="AGENDA DEL CIELO"
        title="Tu próximo encuentro."
        description={`${t.selected?.name || 'Tu satélite'} desde ${t.settings.observer.name}. Elegí un pase y prepará tu observación.`}
      />
      <View style={[ui.between, { gap: 14, flexWrap: 'wrap' }]}>
        <View style={[ui.row, { gap: 7 }]}>
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
        </View>
        <Text style={{ fontFamily: mono, color: C.muted, fontSize: 10 }}>
          MÍN. {t.settings.minElevation}° / PRÓXIMAS {t.settings.horizonHours} H
        </Text>
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 22, alignItems: 'flex-start' }}>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', gap: 13 }}>
          <View style={[ui.between, { paddingBottom: 6 }]}>
            <RuleLabel number="A" label="VENTANAS DE OBSERVACIÓN" />
            <Text style={{ fontFamily: mono, fontSize: 10, color: C.dim }}>
              {String(t.passes.length).padStart(2, '0')} PASES
            </Text>
          </View>
          {!t.passes.length ? (
            <View style={ui.card}>
              <Empty
                title={t.predicting ? 'Buscando tu próxima ventana…' : 'Todavía no hay encuentros.'}
                body="Probá ampliar el horizonte de búsqueda o bajar la elevación mínima desde Ajustes."
                loading={t.predicting}
              />
            </View>
          ) : (
            <PassRail wide={wide}>
              {t.passes.map((p, i) => {
                const active = p.id === pass?.id,
                  ink = active ? C.panel : C.text,
                  muted = active ? '#B5C5B1' : C.muted;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Pase ${i + 1}, ${date(p.aos)}, ${time(p.aos)}, máxima ${p.maxElevation.toFixed(1)} grados`}
                    accessibilityState={{ selected: active }}
                    onPress={() => setSelectedId(p.id)}
                    style={({ pressed }) => [
                      styles.ticket,
                      {
                        width: wide ? undefined : Math.min(312, viewport.width - 56),
                        backgroundColor: active ? C.ink : C.panel,
                        borderColor: active ? C.ink : C.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[styles.dateStub, { borderColor: active ? '#8DA58D66' : C.border }]}
                    >
                      <Text style={{ fontFamily: mono, fontSize: 9, color: muted }}>
                        {String(i + 1).padStart(2, '0')} /
                      </Text>
                      <Text
                        style={{
                          fontFamily: fonts.display,
                          fontSize: 34,
                          lineHeight: 40,
                          color: ink,
                          letterSpacing: -1,
                        }}
                      >
                        {String(new Date(p.aos).getDate()).padStart(2, '0')}
                      </Text>
                      <Text style={{ fontFamily: mono, fontSize: 10, color: muted }}>
                        {new Date(p.aos)
                          .toLocaleDateString('es-AR', { month: 'short' })
                          .replace('.', '')
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, padding: 16, gap: 10 }}>
                      <View style={ui.between}>
                        <Badge
                          label={p.optical ? 'ÓPTICO POSIBLE' : 'RADIO'}
                          color={active ? C.mapAccent : p.optical ? C.accent : C.green}
                        />
                        {reminders.includes(p.id) && (
                          <Icon name="bell" size={15} color={active ? C.mapAccent : C.accent} />
                        )}
                      </View>
                      <View style={[ui.between, { gap: 8 }]}>
                        <Text
                          style={{
                            fontFamily: fonts.display,
                            fontSize: 27,
                            color: ink,
                            letterSpacing: -1,
                          }}
                        >
                          {time(p.aos)}{' '}
                          {wide && (
                            <Text style={{ fontFamily: mono, fontSize: 11, color: muted }}>
                              → {p.continuous ? '…' : time(p.los)}
                            </Text>
                          )}
                        </Text>
                        <Text
                          style={{
                            fontFamily: mono,
                            fontSize: 17,
                            color: active ? C.mapAccent : C.accent,
                          }}
                        >
                          {p.maxElevation.toFixed(1)}°
                        </Text>
                      </View>
                      <View style={[ui.between, { gap: 8, flexWrap: 'wrap' }]}>
                        <Text style={{ color: muted, fontFamily: mono, fontSize: 9 }}>
                          {p.continuous ? 'CONTINUO' : duration(p.los - p.aos)} /{' '}
                          {direction(p.aosAzimuth)} → {direction(p.losAzimuth)}
                        </Text>
                        <Text style={{ color: muted, fontFamily: mono, fontSize: 9 }}>
                          {p.aos > t.now
                            ? 'EN ' + countdown(p.aos - t.now).toUpperCase()
                            : 'EN CURSO'}
                        </Text>
                      </View>
                    </View>
                    {active && (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 18,
                          bottom: 18,
                          width: 3,
                          backgroundColor: C.mapAccent,
                        }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </PassRail>
          )}
        </View>
        <View style={[ui.card, { width: wide ? 370 : '100%', padding: 24, gap: 20 }]}>
          <View style={ui.between}>
            <RuleLabel number="B" label="TU MAPA DEL CIELO" />
            <Icon name="compass" color={C.accent} size={20} />
          </View>
          <View style={{ paddingVertical: 4 }}>
            <SkyChart pass={pass} current={t.position} />
          </View>
          {pass && (
            <>
              <View style={styles.times}>
                {[
                  ['AOS', pass.aos],
                  ['MÁXIMO', pass.tca],
                  ['LOS', pass.los],
                ].map(([label, value]) => (
                  <View key={label} style={{ gap: 7 }}>
                    <Text style={{ fontFamily: mono, fontSize: 9, color: C.dim }}>{label}</Text>
                    <Text style={{ fontFamily: mono, fontSize: 12, color: C.text }}>
                      {time(Number(value), true)}
                    </Text>
                  </View>
                ))}
              </View>
              {pass.opticalWindows.map((w, i) => (
                <View
                  key={i}
                  style={[
                    ui.row,
                    { gap: 8, backgroundColor: '#BE47290B', padding: 12, borderRadius: 4 },
                  ]}
                >
                  <Icon name="sun" color={C.accent} size={16} />
                  <Text style={{ fontSize: 11, color: C.accent, flex: 1, lineHeight: 17 }}>
                    Ventana óptica aprox.: {time(w.start, true)} – {time(w.end, true)}
                  </Text>
                </View>
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
          <View style={{ gap: 9 }}>
            <Text style={ui.body}>El borde es el horizonte. El centro, justo sobre tu cabeza.</Text>
            <Text style={{ fontSize: 11, lineHeight: 18, color: C.dim }}>
              Norte arriba y este a la derecha. El punto azul muestra la posición actual si está
              sobre el horizonte.
            </Text>
            <Text style={{ fontSize: 11, lineHeight: 18, color: C.dim }}>
              Un pase óptico necesita oscuridad e iluminación solar del satélite. El brillo y el
              clima también cuentan.
            </Text>
          </View>
          {pass?.ongoing && (
            <Text style={{ color: C.amber, fontSize: 11, lineHeight: 18 }}>
              Este pase ya comenzó. El gráfico empieza en el momento del cálculo.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
function PassRail({ wide, children }: { wide: boolean; children: React.ReactNode }) {
  if (wide) return <View style={{ gap: 13 }}>{children}</View>;
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontFamily: mono, fontSize: 9, color: C.dim }}>
        DESLIZÁ PARA EXPLORAR LOS PASES →
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  ticket: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden',
    minHeight: 143,
  },
  dateStub: {
    width: 70,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderStyle: 'dashed',
    gap: 3,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 17,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
});
