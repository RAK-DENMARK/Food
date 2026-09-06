import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DraftProvider } from './src/ui/state/DraftContext';
import { Navigation } from './src/ui/navigation';

/**
 * PizzaPlan – appens rod.
 *
 * UI'et består af fire skærme. Al beregning ligger i src/domain og kaldes
 * kun gennem createDoughPlan().
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <DraftProvider>
        <StatusBar style="dark" />
        <Navigation />
      </DraftProvider>
    </SafeAreaProvider>
  );
}
