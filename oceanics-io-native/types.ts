/**
 * Learn more about using TypeScript with React Navigation:
 * https://reactnavigation.org/docs/typescript/
 */

import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

/**
 * Controls allowed tabs on <BottomTab/>
 */
 export type RootTabParamList = {
  Decklist: undefined;
  Bench: undefined;
};

export type RootStackParamList = {
  Root: NavigatorScreenParams<RootTabParamList> | undefined;
  Modal: undefined;
  NotFound: undefined;
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  Screen
>;

export type RootTabScreenProps<Screen extends keyof RootTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, Screen>,
  NativeStackScreenProps<RootStackParamList>
>;

/**
 * Grading condition changes over time. 
 */
enum Condition {
  MP = "MP",
  HP = "HP",
  M = "M",
  NM = "NM"
}

/**
 * Cards are tough because there is a combination of the rules,
 * and collectible metadata. This refers to the rule-identity 
 */
type Card = {
  name: string;
}

/**
 * Specific print treatments
 */
enum PrintingType {
  Foil = "FOIL",
}

/**
 * 
 */
type WizardsSet = {
  code: string;
  name: string;
};

/**
 * This refers to a unique printing of a card. They are all
 * functionally the same, except for those that aren't 
 * tournament legal.
 */
export type Edition = {
  set: [WizardsSet, number];
  printing?: PrintingType;
  language: string;
}

/**
 * 
 */
export type Snapshot = {
  timestamp: number;
  condition?: Condition;
  price?: {
    delta: {
      low: number;
      mid: number;
      market: number;
    }
  }
}

/**
 * Collection is a nested data structure containing cards and
 * other collections.
 */
export type Collection = {
  name: string;
  description: string;
  collections: Collection[];
  cards: Card[];
};
