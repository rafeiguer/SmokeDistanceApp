import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Camera } from "expo-camera";
import useAccelerometer from "../hooks/useAccelerometer";
import useGyroscope from "../hooks/useGyroscope";
import useBarometer from "../hooks/useBarometer";

export default function CameraPanel() {
  const [hasPermission, setHasPermission] = useState(null);

  const accel = useAccelerometer();
  const gyro = useGyroscope();
  const baro = useBarometer();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  if (hasPermission === null) return <Text>Solicitando permissão...</Text>;
  if (hasPermission === false) return <Text>Permissão negada</Text>;

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} />
      {/* HUD com sensores */}
      <View style={styles.hud}>
        <Text style={styles.text}>
          Acelerômetro: x={accel.x.toFixed(2)} y={accel.y.toFixed(2)} z={accel.z.toFixed(2)}
        </Text>
        <Text style={styles.text}>
          Giroscópio: x={gyro.x.toFixed(2)} y={gyro.y.toFixed(2)} z={gyro.z.toFixed(2)}
        </Text>
        <Text style={styles.text}>
          Pressão: {baro.pressure.toFixed(2)} hPa | Altitude: {baro.altitude.toFixed(2)} m
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  hud: {
    position: "absolute",
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 8,
  },
  text: { color: "#fff", fontSize: 14 },
});