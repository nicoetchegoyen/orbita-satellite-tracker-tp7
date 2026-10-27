import React from 'react';
import { Pressable, View, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { Text } from './Text';
import { C, ui, mono, fonts } from './theme';
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
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? C.ink : C.panel,
          borderColor: primary ? C.ink : C.border,
          minHeight: small ? 44 : 48,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: primary ? C.panel : C.text,
          fontSize: small ? 11 : 12,
          fontFamily: fonts.medium,
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
      {icon && <Icon name={icon} size={small ? 15 : 17} color={primary ? C.panel : C.text} />}
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
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: C.ink, borderColor: C.ink },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={{ color: active ? C.panel : C.muted, fontFamily: mono, fontSize: 11 }}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Badge({
  label,
  color = C.accent,
  dot = false,
}: {
  label: string;
  color?: string;
  dot?: boolean;
}) {
  return (
    <View style={[ui.row, { gap: 6, paddingVertical: 5 }]}>
      {dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />}
      <Text style={{ color, fontSize: 10, fontFamily: mono, letterSpacing: 0.6 }}>{label}</Text>
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
    <View style={{ padding: 30, alignItems: 'center', gap: 12 }}>
      {loading ? (
        <ActivityIndicator color={C.accent} />
      ) : (
        <Icon name="orbit" size={30} color={C.accent} />
      )}
      <Text style={[ui.title, { fontSize: 19, textAlign: 'center' }]}>{title}</Text>
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
        {subtitle && <Text style={[ui.body, { marginTop: 5 }]}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}
export function PageHeading({
  index,
  eyebrow,
  title,
  description,
  action,
}: {
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const small = useWindowDimensions().width < 600;
  return (
    <View style={{ gap: 11 }}>
      <View style={[ui.row, { gap: 9 }]}>
        <Text style={{ fontFamily: mono, color: C.accent, fontSize: 11 }}>{index} /</Text>
        <Text style={[ui.label, { fontSize: 10, letterSpacing: 1.2 }]}>{eyebrow}</Text>
      </View>
      <View style={[ui.between, { alignItems: 'flex-start', gap: 14 }]}>
        <Text
          accessibilityRole="header"
          style={[ui.h1, { fontSize: small ? 36 : 52, lineHeight: small ? 41 : 57, flex: 1 }]}
        >
          {title}
        </Text>
        {action}
      </View>
      <Text style={[ui.body, { maxWidth: 650 }]}>{description}</Text>
    </View>
  );
}
export function RuleLabel({ number, label }: { number: string; label: string }) {
  return (
    <View style={[ui.row, { gap: 10 }]}>
      <Text style={{ fontFamily: mono, fontSize: 10, color: C.accent }}>{number}</Text>
      <View style={{ width: 20, height: 1, backgroundColor: C.accent }} />
      <Text style={[ui.label, { fontSize: 10, letterSpacing: 1 }]}>{label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 17,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    minHeight: 44,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
});
