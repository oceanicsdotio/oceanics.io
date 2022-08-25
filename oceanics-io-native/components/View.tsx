/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { View as DefaultView } from "react-native";
import useColorTheme from "../hooks/useColorTheme";

import type { ThemeProps } from "../types";

export type ViewProps = ThemeProps & DefaultView["props"];

export function View({
  style,
  lightColor,
  darkColor,
  ...props
}: ViewProps) {
  const backgroundColor = useColorTheme(
    { light: lightColor, dark: darkColor },
    "background"
  );

  return <DefaultView style={[{ backgroundColor }, style]} {...props} />;
}

export default View
