import React, { useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '../ui/Text';
import type { Tracker } from '../hooks/useTracker';
import { GROUPS } from '../core/types';
import { C, ui, mono, fonts } from '../ui/theme';
import { Chip, Empty, Button, Badge } from '../ui/components';
import { Icon } from '../ui/Icon';
export const GROUP_LABELS = {
  stations: 'Estaciones',
  starlink: 'Starlink',
  'gps-ops': 'GPS',
  weather: 'Meteorológicos',
  geo: 'Geoestacionarios',
};
export function CatalogModal({
  visible,
  onClose,
  tracker: t,
}: {
  visible: boolean;
  onClose: () => void;
  tracker: Tracker;
}) {
  const [query, setQuery] = useState('');
  const results = (t.catalog?.objects || []).filter(
    (o) => o.name.toLowerCase().includes(query.toLowerCase()) || String(o.id).includes(query),
  );
  async function direct() {
    await t.selectById(Number(query));
    onClose();
  }
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#000000B5',
            padding: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={[
              ui.card,
              { width: '100%', maxWidth: 650, height: '85%', maxHeight: 750, padding: 24, gap: 18 },
            ]}
          >
            <View style={ui.between}>
              <View style={{ flex: 1 }}>
                <Text style={ui.label}>CATÁLOGO ORBITAL</Text>
                <Text style={[ui.title, { marginTop: 6, fontSize: 24 }]}>Encontrá tu satélite</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar catálogo"
                onPress={onClose}
                style={{ padding: 12, minWidth: 44, minHeight: 44 }}
              >
                <Icon name="close" />
              </Pressable>
            </View>
            <View style={[ui.row, ui.input, { paddingVertical: 0, gap: 10 }]}>
              <Icon name="search" size={18} />
              <TextInput
                accessibilityLabel="Nombre o NORAD ID"
                value={query}
                onChangeText={setQuery}
                placeholder="Nombre o NORAD ID, por ejemplo 25544"
                placeholderTextColor={C.dim}
                style={
                  {
                    flex: 1,
                    minHeight: 46,
                    color: C.text,
                    fontSize: 14,
                    fontFamily: fonts.body,
                    outlineStyle: 'none',
                  } as never
                }
                autoCorrect={false}
              />
            </View>
            <View style={{ maxHeight: 47 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 7 }}
              >
                {GROUPS.map((group) => (
                  <Chip
                    key={group}
                    label={GROUP_LABELS[group]}
                    active={group === t.group}
                    onPress={() => {
                      setQuery('');
                      t.setGroup(group);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
            <View style={ui.between}>
              <Text style={{ color: C.dim, fontSize: 11 }}>
                {results.length.toLocaleString('es-AR')}{' '}
                {results.length === 1 ? 'objeto' : 'objetos'} · OMM / JSON
              </Text>
              <Badge
                label={
                  t.catalog?.stale
                    ? 'CACHÉ DESACTUALIZADA'
                    : t.catalog
                      ? 'CATÁLOGO REAL'
                      : 'CARGANDO'
                }
                color={t.catalog?.stale ? C.amber : C.lime}
              />
            </View>
            <FlatList
              data={results}
              keyExtractor={(o) => String(o.id)}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={15}
              maxToRenderPerBatch={20}
              windowSize={5}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    t.setSelected(item);
                    onClose();
                  }}
                  style={{
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: C.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ backgroundColor: C.raised, borderRadius: 10, padding: 11 }}>
                    <Icon name="orbit" color={item.id === t.selected?.id ? C.lime : C.muted} />
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '500' }}>
                      {item.name}
                    </Text>
                    <Text style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>
                      NORAD {item.id} · {item.supplemental ? 'SupGP' : 'GP'} · {item.source}
                    </Text>
                  </View>
                  <Icon name="chevron" size={16} />
                </Pressable>
              )}
              ListEmptyComponent={
                <Empty
                  title={t.loading ? 'Consultando catálogo…' : 'No hay coincidencias'}
                  body={
                    t.loading
                      ? 'La primera descarga puede tardar unos segundos.'
                      : 'Buscá por otro nombre, cambiá de grupo o consultá un NORAD ID exacto.'
                  }
                  loading={t.loading}
                />
              }
            />
            {/^\d{1,9}$/.test(query) && (
              <Button
                label={`Consultar NORAD ${query} en las fuentes`}
                onPress={() => void direct()}
                icon="search"
                disabled={t.loading}
              />
            )}
            {Boolean(t.error) && <Text style={{ color: C.amber, fontSize: 11 }}>{t.error}</Text>}
            <Text style={{ color: C.dim, fontSize: 10, lineHeight: 16 }}>
              CelesTrak · Space-Track como alternativa configurada. Los objetos se calculan
              localmente; elegir otro satélite no consulta posiciones.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
