import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { StartScreen } from './screens/StartScreen';
import { PizzasScreen } from './screens/PizzasScreen';
import { ConditionsScreen } from './screens/ConditionsScreen';
import { PlanScreen } from './screens/PlanScreen';
import { colors, typography } from './theme';

/** De fire primære skærme. Flere skærme er bevidst holdt ude af MVP'en. */
export type RootStackParamList = {
  Start: undefined;
  Pizzas: undefined;
  Conditions: undefined;
  Plan: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

export function Navigation() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: colors.accent,
          headerTitleStyle: { fontSize: typography.bodyStrong.fontSize, fontWeight: '600' },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Start" component={StartScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Pizzas" component={PizzasScreen} options={{ title: 'Pizzaerne' }} />
        <Stack.Screen name="Conditions" component={ConditionsScreen} options={{ title: 'Forholdene' }} />
        <Stack.Screen
          name="Plan"
          component={PlanScreen}
          options={{ title: 'Din dejplan', headerBackVisible: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
