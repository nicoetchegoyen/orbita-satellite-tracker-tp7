import React from 'react';
import { Text as NativeText, StyleSheet, type TextProps } from 'react-native';
import { fonts } from './theme';

/** Explicit font variants keep the same typography in Expo Go and on the web. */
export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) || {};
  const weight = Number(flat.fontWeight || 400);
  const family =
    flat.fontFamily || (weight >= 600 ? fonts.display : weight >= 500 ? fonts.medium : fonts.body);
  return (
    <NativeText
      {...props}
      style={[{ fontFamily: family }, style, { fontFamily: family, fontWeight: 'normal' }]}
    />
  );
}
