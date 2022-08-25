// Preloaded vector glyphs
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { loadAsync } from 'expo-font';

// Suspense
import { preventAutoHideAsync, hideAsync } from 'expo-splash-screen';
import { useEffect, useState } from 'react';

function useCachedResources() {
  // Flag for conditional rendering in parent component
  const [loading, setLoading] = useState(true);

  // Load any resources or data that we need prior to rendering the app
  useEffect(() => {
    (async () => {
      try {
        preventAutoHideAsync();
        await loadAsync({
          ...FontAwesome.font,
          ...MaterialCommunityIcons.font
        });
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
        hideAsync();
      }
    })();
  }, []);

  return loading;
}

export default useCachedResources
