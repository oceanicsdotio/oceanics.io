import React from "react";
import { Text as DefaultText } from 'react-native';
import useColorTheme from '../hooks/useColorTheme';
import type {ThemeProps} from "../types";

export type TextProps = ThemeProps & DefaultText['props'];

export function Text({ style, lightColor, darkColor, ...otherProps }: TextProps) {
  
  const color = useColorTheme({ light: lightColor, dark: darkColor }, 'text');

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export default Text