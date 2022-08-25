
import * as React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Components
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import DecklistSummary from "./DecklistSummary";
import NotFoundScreen from "./NotFoundScreen";
import BottomTabNavigator from "./BottomTab";

// Data
import type { RootStackParamList } from "../types";
import type { ColorSchemeName } from "react-native";
import type { LinkingOptions } from "@react-navigation/native";
import * as Linking from "expo-linking";

const DetailRoute = "Modal"

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL("/")],
  config: {
    screens: {
      Root: {
        screens: {
          Decklist: {
            screens: {
              TabOneScreen: "one",
            },
          },
          Bench: {
            screens: {
              TabTwoScreen: "two",
            },
          },
        },
      },
      Modal: "modal",
      NotFound: "*",
    },
  },
};


const { Navigator, Screen, Group } =
  createNativeStackNavigator<RootStackParamList>();

/**
 * A root stack navigator is often used for displaying modals on top of all other content.
 * https://reactnavigation.org/docs/modal
 */
export function Navigation({ colorScheme }: { colorScheme: ColorSchemeName }) {
  return (
    <NavigationContainer
      linking={linking}
      theme={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      {/* @ts-ignore */}
      <Navigator>
        <Screen
          name="Root"
          component={BottomTabNavigator}
          options={{ headerShown: false }}
        />
        <Screen
          name="NotFound"
          component={NotFoundScreen}
          options={{ title: "Oops!" }}
        />
        {/* @ts-ignore */}
        <Group screenOptions={{ presentation: "modal" }}>
          <Screen name={DetailRoute} component={DecklistSummary} />
        </Group>
      </Navigator>
    </NavigationContainer>
  );
}

export default Navigation;
