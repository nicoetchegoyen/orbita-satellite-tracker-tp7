import React, { useEffect, useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Text as NativeText,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk/400Regular';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { useTracker } from './src/hooks/useTracker';
import { C, ui, mono, fonts } from './src/ui/theme';
import { Text } from './src/ui/Text';
import { Icon, type IconName } from './src/ui/Icon';
import { StationMark } from './src/ui/OrbitalArt';
import { Badge } from './src/ui/components';
import { Explorer } from './src/screens/Explorer';
import { Passes } from './src/screens/Passes';
import { Orientation } from './src/screens/Orientation';
import { Validation } from './src/screens/Validation';
import { Settings } from './src/screens/Settings';
import { CatalogModal } from './src/screens/CatalogModal';

type Tab = 'explore' | 'passes' | 'orientation' | 'validation' | 'settings';
const NAV: { id: Tab; label: string; short: string; icon: IconName }[] = [
  { id: 'explore', label: 'Explorar', short: 'Mapa', icon: 'map' },
  { id: 'passes', label: 'Próximos pases', short: 'Pases', icon: 'passes' },
  { id: 'orientation', label: 'Orientación', short: 'Apuntar', icon: 'compass' },
  { id: 'validation', label: 'Validación', short: 'Validar', icon: 'check' },
  { id: 'settings', label: 'Ajustes', short: 'Ajustes', icon: 'settings' },
];
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    if (this.state.error)
      return (
        <View
          style={{ flex: 1, backgroundColor: C.bg, padding: 30, justifyContent: 'center', gap: 18 }}
        >
          <Text style={ui.title}>Volvamos a conectar con el cielo.</Text>
          <Text selectable style={ui.body}>
            {this.state.error}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => this.setState({ error: '' })}>
            <Text style={{ color: C.accent, fontSize: 15 }}>Volver a intentar ↗</Text>
          </Pressable>
        </View>
      );
    return this.props.children;
  }
}
export default function App() {
  const [loaded, error] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    IBMPlexMono_400Regular,
  });
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <StationMark size={60} />
        <NativeText style={{ fontSize: 28, color: C.ink, fontWeight: '700', letterSpacing: 4 }}>
          ÓRBITA
        </NativeText>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Station />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
function Station() {
  const t = useTracker(),
    [tab, setTab] = useState<Tab>('explore'),
    [catalog, setCatalog] = useState(false);
  const desktop = useWindowDimensions().width >= 1000;
  const current = NAV.find((n) => n.id === tab)!;
  const index = String(NAV.findIndex((n) => n.id === tab) + 1).padStart(2, '0');
  useEffect(() => {
    if (t.notice) {
      const timer = setTimeout(() => t.setNotice(''), 9500);
      return () => clearTimeout(timer);
    }
  }, [t.notice]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, flexDirection: desktop ? 'row' : 'column' }}>
        {desktop && (
          <View style={styles.sidebar}>
            <Brand />
            <View style={{ marginTop: 54, gap: 4 }}>
              <Text
                style={[
                  ui.label,
                  { fontSize: 9, letterSpacing: 1.3, marginBottom: 18, paddingLeft: 14 },
                ]}
              >
                ESTACIÓN TERRESTRE
              </Text>
              {NAV.map((item, i) => (
                <Nav
                  key={item.id}
                  item={item}
                  number={String(i + 1).padStart(2, '0')}
                  active={tab === item.id}
                  onPress={() => setTab(item.id)}
                />
              ))}
            </View>
            <View style={{ flex: 1, minHeight: 28 }} />
            <View style={styles.observer}>
              <View style={[ui.between, { marginBottom: 15 }]}>
                <Icon name="pin" color={C.accent} size={17} />
                <Text style={{ fontFamily: mono, color: C.dim, fontSize: 9 }}>
                  PUNTO DE OBSERVACIÓN
                </Text>
              </View>
              <Text style={{ fontSize: 18, fontFamily: fonts.medium, color: C.text }}>
                {t.settings.observer.name}
              </Text>
              <Text
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  color: C.muted,
                  marginTop: 10,
                  lineHeight: 18,
                }}
              >
                {t.settings.observer.latitude.toFixed(4)}° /{' '}
                {t.settings.observer.longitude.toFixed(4)}°
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTab('settings')}
                style={{ paddingTop: 15, paddingBottom: 4 }}
              >
                <Text style={{ color: C.accent, fontSize: 12, fontFamily: fonts.medium }}>
                  Cambiar ubicación ↗
                </Text>
              </Pressable>
            </View>
            <View style={[ui.between, { paddingTop: 24 }]}>
              <Text style={{ fontFamily: mono, color: C.dim, fontSize: 9 }}>EDICIÓN 2026</Text>
              <Text style={{ fontFamily: mono, color: C.accent, fontSize: 11 }}>N° 07</Text>
            </View>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[styles.topbar, { paddingHorizontal: desktop ? 36 : 20 }]}>
            {desktop ? (
              <View style={[ui.row, { gap: 11 }]}>
                <View style={styles.cross} />
                <Text style={{ fontFamily: mono, color: C.muted, fontSize: 10, letterSpacing: 1 }}>
                  OBSERVATORIO PERSONAL
                </Text>
                <Text style={{ color: C.border }}>/</Text>
                <Text style={{ color: C.text, fontSize: 12 }}>{current.label}</Text>
              </View>
            ) : (
              <Brand compact />
            )}
            <View style={[ui.row, { gap: 18 }]}>
              {desktop && (
                <Text style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>
                  {new Date(t.now).toISOString().slice(11, 19)} UTC
                </Text>
              )}
              <Badge
                dot
                label={
                  t.loading
                    ? 'SINCRONIZANDO'
                    : t.catalog?.stale
                      ? 'DATOS GUARDADOS'
                      : 'CÁLCULO LOCAL'
                }
                color={t.catalog?.stale ? C.amber : C.green}
              />
            </View>
          </View>
          <ScrollView
            key={tab}
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: desktop ? 36 : 20,
              paddingTop: desktop ? 32 : 24,
              paddingBottom: 32,
              maxWidth: 1580,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            {Boolean(t.error) && (
              <Pressable
                accessibilityRole="button"
                onPress={() => void t.refresh()}
                style={styles.warning}
              >
                <Icon name="signal" color={C.amber} size={18} />
                <Text style={{ color: C.amber, fontSize: 12, lineHeight: 19, flex: 1 }}>
                  {t.error} · Tocar para reintentar.
                </Text>
              </Pressable>
            )}
            {tab === 'explore' && (
              <Explorer
                tracker={t}
                onCatalog={() => setCatalog(true)}
                onPasses={() => setTab('passes')}
                onOrient={() => setTab('orientation')}
              />
            )}
            {tab === 'passes' && <Passes tracker={t} />}
            {tab === 'orientation' && <Orientation tracker={t} />}
            {tab === 'validation' && <Validation tracker={t} />}
            {tab === 'settings' && <Settings tracker={t} />}
            <View style={[ui.between, styles.footer]}>
              <View style={[ui.row, { gap: 8 }]}>
                <StationMark size={17} color={C.dim} />
                <Text style={styles.footerText}>HECHO PARA MIRAR MÁS ALLÁ.</Text>
              </View>
              <Text style={styles.footerText}>ÓRBITA / {index}</Text>
            </View>
          </ScrollView>
          {Boolean(t.notice) && (
            <Pressable
              accessibilityRole="alert"
              onPress={() => t.setNotice('')}
              style={[
                styles.toast,
                { left: desktop ? 36 : 16, right: desktop ? 36 : 16, bottom: desktop ? 20 : 78 },
              ]}
            >
              <Icon name="bell" size={20} color={C.mapAccent} />
              <Text style={{ color: C.panel, fontSize: 13, lineHeight: 20, flex: 1 }}>
                {t.notice}
              </Text>
              <Icon name="close" size={16} color={C.mapText} />
            </Pressable>
          )}
          {!desktop && (
            <View style={styles.bottomNav}>
              {NAV.map((n) => (
                <Pressable
                  key={n.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === n.id }}
                  accessibilityLabel={n.label}
                  onPress={() => setTab(n.id)}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    flex: 1,
                    minHeight: 66,
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      width: 24,
                      height: 3,
                      backgroundColor: tab === n.id ? C.accent : 'transparent',
                      borderBottomLeftRadius: 2,
                      borderBottomRightRadius: 2,
                    }}
                  />
                  <Icon name={n.icon} size={20} color={tab === n.id ? C.accent : C.muted} />
                  <Text
                    style={{
                      fontFamily: mono,
                      fontSize: 9,
                      color: tab === n.id ? C.accent : C.muted,
                      letterSpacing: 0.3,
                    }}
                  >
                    {n.short.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
      <CatalogModal tracker={t} visible={catalog} onClose={() => setCatalog(false)} />
    </SafeAreaView>
  );
}
function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[ui.row, { gap: compact ? 8 : 11 }]}>
      <StationMark size={compact ? 32 : 39} />
      <View>
        <Text
          style={{
            fontFamily: fonts.display,
            color: C.text,
            fontSize: compact ? 25 : 31,
            letterSpacing: -1.5,
            lineHeight: compact ? 30 : 36,
          }}
        >
          ÓRBITA<Text style={{ color: C.accent, fontFamily: fonts.display }}>.</Text>
        </Text>
        {!compact && (
          <Text
            style={{
              fontFamily: mono,
              fontSize: 9,
              letterSpacing: 1.5,
              color: C.muted,
              marginTop: 4,
            }}
          >
            SATELLITE TRACKER
          </Text>
        )}
      </View>
    </View>
  );
}
function Nav({
  item,
  number,
  active,
  onPress,
}: {
  item: (typeof NAV)[number];
  number: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.nav,
        active && { backgroundColor: '#E0E4D6', borderLeftColor: C.accent },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={{ fontFamily: mono, fontSize: 10, color: active ? C.accent : C.dim }}>
        {number}
      </Text>
      <Text
        style={{
          fontFamily: active ? fonts.display : fonts.medium,
          fontSize: 13,
          color: C.text,
          flex: 1,
        }}
      >
        {item.label}
      </Text>
      <Icon name={active ? 'arrow' : item.icon} size={16} color={active ? C.accent : C.dim} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    padding: 24,
    paddingTop: 30,
    backgroundColor: '#EAEBE1',
    borderRightWidth: 1,
    borderColor: C.border,
  },
  topbar: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  nav: {
    paddingVertical: 16,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
    borderRadius: 2,
  },
  observer: { paddingTop: 22, borderTopWidth: 1, borderColor: '#BEC6B7' },
  cross: { height: 5, width: 5, backgroundColor: C.accent },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: C.border,
    backgroundColor: C.panel,
  },
  footer: {
    marginTop: 30,
    paddingTop: 17,
    borderTopWidth: 1,
    borderColor: C.border,
    gap: 12,
    flexWrap: 'wrap',
  },
  footerText: { fontFamily: mono, fontSize: 9, color: C.dim, letterSpacing: 0.5 },
  warning: {
    padding: 16,
    backgroundColor: '#F1E5CC',
    borderColor: '#DCC9A3',
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toast: {
    position: 'absolute',
    backgroundColor: C.ink,
    borderWidth: 1,
    borderColor: '#355346',
    borderRadius: 7,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    elevation: 8,
    boxShadow: '0 8px 24px #18332C22',
  },
});
