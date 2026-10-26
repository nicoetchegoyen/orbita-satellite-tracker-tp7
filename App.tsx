import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTracker } from './src/hooks/useTracker';
import { C, ui, mono } from './src/ui/theme';
import { Icon, type IconName } from './src/ui/Icon';
import { Badge } from './src/ui/components';
import { Explorer } from './src/screens/Explorer';
import { Passes } from './src/screens/Passes';
import { Orientation } from './src/screens/Orientation';
import { Validation } from './src/screens/Validation';
import { Settings } from './src/screens/Settings';
import { CatalogModal } from './src/screens/CatalogModal';
type Tab = 'explore' | 'passes' | 'orientation' | 'validation' | 'settings';
const NAV: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'explore', label: 'Explorar', icon: 'map' },
  { id: 'passes', label: 'Próximos pases', icon: 'passes' },
  { id: 'orientation', label: 'Orientación', icon: 'compass' },
  { id: 'validation', label: 'Validación', icon: 'check' },
  { id: 'settings', label: 'Ajustes', icon: 'settings' },
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
          <Text style={ui.title}>No se pudo abrir la estación</Text>
          <Text selectable style={ui.body}>
            {this.state.error}
          </Text>
          <Pressable onPress={() => this.setState({ error: '' })}>
            <Text style={{ color: C.lime }}>Volver a intentar</Text>
          </Pressable>
        </View>
      );
    return this.props.children;
  }
}
export default function App() {
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
  const desktop = useWindowDimensions().width >= 900;
  useEffect(() => {
    if (t.notice) {
      const timer = setTimeout(() => t.setNotice(''), 9500);
      return () => clearTimeout(timer);
    }
  }, [t.notice]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={{ flex: 1, flexDirection: desktop ? 'row' : 'column' }}>
        {desktop && (
          <View style={styles.sidebar}>
            <Brand />
            <View style={{ marginTop: 44, gap: 7 }}>
              <Text style={[ui.label, { fontSize: 9, marginBottom: 12, paddingLeft: 13 }]}>
                CONTROL DE MISIÓN
              </Text>
              {NAV.map((n) => (
                <Nav key={n.id} item={n} active={tab === n.id} onPress={() => setTab(n.id)} />
              ))}
            </View>
            <View style={{ flex: 1 }} />
            <View style={[ui.card, { padding: 16, gap: 10, backgroundColor: C.bg }]}>
              <View style={[ui.row, { gap: 6 }]}>
                <Icon name="pin" size={14} color={C.lime} />
                <Text style={ui.label}>TU OBSERVADOR</Text>
              </View>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: '500' }}>
                {t.settings.observer.name}
              </Text>
              <Text style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>
                {t.settings.observer.latitude.toFixed(4)}°,{' '}
                {t.settings.observer.longitude.toFixed(4)}°
              </Text>
              <Pressable onPress={() => setTab('settings')} accessibilityRole="button">
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                  Cambiar ubicación ↗
                </Text>
              </Pressable>
            </View>
            <View style={{ marginTop: 24, paddingLeft: 6, gap: 7 }}>
              <Text style={{ color: C.dim, fontSize: 10 }}>HECHO PARA MIRAR MÁS ALLÁ</Text>
              <Text style={{ color: '#455769', fontSize: 10 }}>Programación Móviles · TP 07</Text>
            </View>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[styles.topbar, { paddingHorizontal: desktop ? 32 : 20 }]}>
            {desktop ? (
              <View style={[ui.row, { gap: 9 }]}>
                <Text style={{ color: C.dim, fontSize: 12 }}>Estación orbital</Text>
                <Text style={{ color: '#3A4C5C' }}>/</Text>
                <Text style={{ color: C.text, fontSize: 12 }}>
                  {NAV.find((n) => n.id === tab)?.label}
                </Text>
              </View>
            ) : (
              <Brand compact />
            )}
            <View style={[ui.row, { gap: 18 }]}>
              {desktop && (
                <Text style={{ fontFamily: mono, color: C.dim, fontSize: 11 }}>
                  {new Date(t.now).toISOString().slice(11, 19)} UTC
                </Text>
              )}
              <Badge
                dot
                label={t.loading ? 'CONECTANDO' : t.catalog?.stale ? 'CACHÉ LOCAL' : 'EN VIVO'}
                color={t.catalog?.stale ? C.amber : C.lime}
              />
              {t.loading && <ActivityIndicator size="small" color={C.lime} />}
            </View>
          </View>
          <ScrollView
            key={tab}
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: desktop ? 32 : 20,
              paddingBottom: 40,
              maxWidth: 1600,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            {Boolean(t.error) && (
              <Pressable onPress={() => void t.refresh()} style={styles.warning}>
                <Text style={{ color: C.amber, fontSize: 12, lineHeight: 18 }}>
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
            <View
              style={[
                ui.between,
                {
                  marginTop: 30,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderColor: '#1B2939',
                  flexWrap: 'wrap',
                  gap: 10,
                },
              ]}
            >
              <Text style={{ color: C.dim, fontSize: 10 }}>
                SGP4 / SDP4 · WGS84 · Datos orbitales reales
              </Text>
              <Text style={{ color: '#455769', fontSize: 10 }}>SATELLITE TRACKER / 01</Text>
            </View>
          </ScrollView>
          {Boolean(t.notice) && (
            <Pressable
              accessibilityRole="alert"
              onPress={() => t.setNotice('')}
              style={[
                styles.toast,
                { left: desktop ? 32 : 16, right: desktop ? 32 : 16, bottom: desktop ? 24 : 80 },
              ]}
            >
              <Icon name="bell" size={20} color={C.lime} />
              <Text style={{ color: C.text, fontSize: 13, lineHeight: 20, flex: 1 }}>
                {t.notice}
              </Text>
              <Icon name="close" size={16} />
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
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    flex: 1,
                    minHeight: 64,
                  }}
                >
                  <Icon name={n.icon} size={20} color={tab === n.id ? C.lime : C.dim} />
                  <Text style={{ fontSize: 9, color: tab === n.id ? C.lime : C.dim }}>
                    {n.id === 'passes' ? 'Pases' : n.label}
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
    <View style={[ui.row, { gap: 10 }]}>
      <View
        style={{
          width: compact ? 32 : 39,
          height: compact ? 32 : 39,
          backgroundColor: '#BBF5780D',
          borderWidth: 1,
          borderColor: '#BBF57822',
          borderRadius: 11,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Icon name="orbit" color={C.lime} size={compact ? 22 : 27} />
      </View>
      <View style={{ gap: 3 }}>
        <Text
          style={{
            color: C.text,
            fontWeight: '600',
            fontSize: compact ? 13 : 15,
            letterSpacing: -0.4,
          }}
        >
          Satellite Tracker
        </Text>
        {!compact && (
          <Text style={{ color: C.dim, fontSize: 8, letterSpacing: 2 }}>
            EXPLORÁ LO QUE NOS RODEA
          </Text>
        )}
      </View>
    </View>
  );
}
function Nav({
  item,
  active,
  onPress,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.nav,
        active && { backgroundColor: '#BBF57810', borderColor: '#BBF57818' },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Icon name={item.icon} color={active ? C.lime : C.dim} size={19} />
      <Text
        style={{
          color: active ? C.lime : C.muted,
          fontSize: 13,
          fontWeight: active ? '600' : '400',
          flex: 1,
        }}
      >
        {item.label}
      </Text>
      {active && <View style={{ width: 4, height: 4, borderRadius: 3, backgroundColor: C.lime }} />}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  sidebar: {
    width: 230,
    backgroundColor: '#0C1421',
    borderRightWidth: 1,
    borderColor: '#202D3D',
    padding: 22,
    paddingTop: 30,
  },
  topbar: {
    height: 74,
    borderBottomWidth: 1,
    borderColor: '#202D3D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  nav: {
    paddingHorizontal: 13,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: C.border,
    backgroundColor: '#0C1421',
  },
  warning: {
    padding: 14,
    backgroundColor: '#EFC27B0A',
    borderWidth: 1,
    borderColor: '#EFC27B30',
    borderRadius: 10,
    marginBottom: 18,
  },
  toast: {
    position: 'absolute',
    backgroundColor: '#1D2E30',
    borderWidth: 1,
    borderColor: '#7B9E55',
    borderRadius: 13,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    elevation: 8,
    boxShadow: '0 8px 24px #0005',
  },
});
