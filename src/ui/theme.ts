import { Platform, StyleSheet } from 'react-native';
export const C = {
  bg: '#080F1B',
  panel: '#101A28',
  raised: '#172333',
  border: '#253243',
  text: '#F0F3EE',
  muted: '#93A1B2',
  dim: '#617286',
  lime: '#BBF578',
  blue: '#6DB4F5',
  red: '#FFA190',
  amber: '#EFC27B',
};
export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'Consolas, monospace',
});
export const ui = StyleSheet.create({
  card: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: { color: C.text, fontSize: 20, fontWeight: '600', letterSpacing: -0.5 },
  body: { color: C.muted, fontSize: 13, lineHeight: 21 },
  h1: { color: C.text, fontSize: 34, fontWeight: '600', letterSpacing: -1.5, lineHeight: 41 },
  input: {
    color: C.text,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 46,
  },
});
