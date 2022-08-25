// Modifies the device top status (e.g. clock, wifi)
import { StatusBar } from 'expo-status-bar';

// Pre-calculate area inside notches and touch areas
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "reflect-metadata";

// Hooks
import useCachedResources from './hooks/useCachedResources';
import useColorScheme from './hooks/useColorScheme';

// Components
import Navigation from './components/Navigation';

import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

const client = new ApolloClient({
  uri: "/.netlify/functions/graphql",
  cache: new InMemoryCache()
});

export default function App() {
  const loading = useCachedResources();
  const colorScheme = useColorScheme();

  if (loading) {
    return null;
  } else {
    return (
      <SafeAreaProvider>
        <ApolloProvider client={client}>
          <Navigation colorScheme={colorScheme} />
        </ApolloProvider>
        <StatusBar hidden={true}/>
      </SafeAreaProvider>
    );
  }
}
