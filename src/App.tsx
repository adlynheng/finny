/**
 * @format
 */

import './global.css';
import { Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';

const { family, weights, numeral } = tokens.type;
const PROBE_SIZE = 76;

function App() {
  return (
    <View className="flex-1 items-center justify-center">
      {/* Urbanist weight probe (Task 10): replaced by the app frame in Task 12. */}
      {Object.values(weights).map(weight => (
        <Text
          key={weight}
          testID={`font-probe-${weight}`}
          className="text-ink"
          style={{
            fontFamily: family,
            fontWeight: String(weight) as '300' | '400' | '500' | '600',
            fontSize: PROBE_SIZE,
            letterSpacing: PROBE_SIZE * numeral.letterSpacingEm,
          }}
        >
          S$184,210
        </Text>
      ))}
    </View>
  );
}

export default App;
