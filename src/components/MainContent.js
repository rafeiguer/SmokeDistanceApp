import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function MainContent() {
  return (
    <View style={styles.content}>
      <Text style={styles.text}>Aqui vai o conteúdo principal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    color: "#333",
  },
});