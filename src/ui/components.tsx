import React from 'react';
import { Pressable, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { C, ui } from './theme';
import { Icon, type IconName } from './Icon';
export function Button({
  label,
  onPress,
  icon,
  primary = false,
  small = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  primary?: boolean;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? C.lime : C.raised,
          borderColor: primary ? C.lime : C.border,
          paddingVertical: small ? 9 : 12,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon && <Icon name={icon} size={small ? 15 : 17} color={primary ? C.bg : C.text} />}
      <Text
        style={{ color: primary ? C.bg : C.text, fontSize: small ? 11 : 13, fontWeight: '600' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: '#273A2D', borderColor: '#49603D' }]}
    >
      <Text style={{ color: active ? C.lime : C.muted, fontSize: 12, fontWeight: '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Badge({
  label,
  color = C.lime,
  dot = false,
}: {
  label: string;
  color?: string;
  dot?: boolean;
}) {
  return (
    <View
      style={[
        ui.row,
        {
          gap: 6,
          paddingHorizontal: 9,
          paddingVertical: 5,
          backgroundColor: color + '13',
          borderRadius: 6,
        },
      ]}
    >
      {dot && <View style={{ width: 5, height: 5, borderRadius: 5, backgroundColor: color }} />}
      <Text style={{ color, fontSize: 10, fontWeight: '600', letterSpacing: 0.4 }}>{label}</Text>
    </View>
  );
}
export function Empty({
  title,
  body,
  loading = false,
}: {
  title: string;
  body: string;
  loading?: boolean;
}) {
  return (
    <View style={{ padding: 30, alignItems: 'center', gap: 10 }}>
      {loading ? <ActivityIndicator color={C.lime} /> : <Icon name="orbit" size={28} />}
      <Text style={[ui.title, { fontSize: 16, textAlign: 'center' }]}>{title}</Text>
      <Text style={[ui.body, { textAlign: 'center', maxWidth: 360 }]}>{body}</Text>
    </View>
  );
}
export function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={[ui.between, { marginBottom: 18, gap: 12 }]}>
      <View style={{ flex: 1 }}>
        <Text style={ui.title}>{title}</Text>
        {subtitle && <Text style={[ui.body, { marginTop: 4 }]}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}
const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 14,
    minHeight: 38,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.panel,
  },
});
