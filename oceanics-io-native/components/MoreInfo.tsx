import * as React from "react";
import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useColorScheme } from "../hooks/useColorScheme";
import { useQuery, gql } from "@apollo/client";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable } from "react-native";

import Colors from "../constants/Colors";
import type { RootStackParamList } from "../types";

const HELLO_QUERY = gql`{ hello }`;

const MoreInfo =
  (destination: keyof RootStackParamList) =>
  () => {
    const { navigate } = useNavigation();
    const colorScheme = useColorScheme();
    const { error, data } = useQuery(HELLO_QUERY);

    useEffect(() => {
      console.log({error, data})
    }, [error, data])
    
    return (
      <Pressable
        onPress={() => navigate(destination)}
        style={({ pressed }) => ({
          opacity: pressed ? 0.5 : 1,
        })}
      >
        {/* @ts-ignore */}
        <MaterialCommunityIcons
          name="chart-timeline-variant-shimmer"
          size={25}
          color={Colors[colorScheme].text}
          style={{ marginRight: 15 }}
        />
      </Pressable>
    );
  };

export default MoreInfo;
