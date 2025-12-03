import React from "react";
import { View, StyleSheet } from "react-native";
import Header from "./src/components/Header";
import MainContent from "./src/components/MainContent";
import Footer from "./src/components/Footer";
import CameraPanel from "./src/components/CameraPanel";
import MapPanel from "./src/components/MapPanel";

export default function App() {
  return (
    <View style={styles.container}>
      <Header />
      <MainContent />
       <CameraPanel /> 
        <MapPanel />
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});