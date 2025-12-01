// Hook customizado para GPS
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export function useGPS() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('Permissão negada');
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc.coords);
      } catch {
        setLocation(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  return { location, loading };
}
