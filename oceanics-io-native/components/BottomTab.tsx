import * as React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

// Components
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MoreInfo from "./MoreInfo";
import Decklist from "./Decklist";
import Bench from "./Bench";

// Hooks
import { useColorScheme } from "../hooks/useColorScheme";

// Data
import Colors from "../constants/Colors";
import { RootTabParamList } from "../types";

/**
 * A bottom tab navigator displays tab buttons on the bottom of the display to switch screens.
 * https://reactnavigation.org/docs/bottom-tab-navigator
 */
const { Navigator, Screen } = createBottomTabNavigator<RootTabParamList>();

/**
 * Precalculate the static screen data. 
 *  
 * Convenience wrapper/generator around Material Icon set. The Navigator
 * component provides the color definition from `tabBarActiveTintColor`
 */
const SCREENS = [
  {
    name: "Decklist",
    component: Decklist,
    options: {
      icon: "shield-sword-outline",
      headerRight: MoreInfo("Modal"),
    },
  },
  {
    name: "Bench",
    component: Bench,
    options: {
      icon: "castle",
    },
  },
].map(({ name, options: { icon, ...additionalOptions }, ...rest }) =>
  Object({
    ...rest,
    name,
    options: {
      title: name,
      tabBarIcon: ({ color }: { color: string }) => (
        // @ts-ignore
        <MaterialCommunityIcons
          size={30}
          style={{ marginBottom: -3 }}
          color={color}
          // @ts-ignore
          name={icon}
        />
      ),
      ...additionalOptions,
    },
  })
);

/**
 * Screen selection menu based on the Expo Tab Navigator example.
 *
 * In the future, may want to hide this after a delay, to maximize
 * the screen space available for item information.
 */
export function BottomTabNavigator() {
  // Theming
  const colorScheme = useColorScheme();

  return (
    // @ts-ignore
    <Navigator
      initialRouteName={SCREENS[0].name}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
      }}
    >
      {SCREENS.map((props) => (
        <Screen {...props} />
      ))}
    </Navigator>
  );
}

export default BottomTabNavigator;
