/**
 * @format
 */

import './global.css';
import { View } from 'react-native';

function App() {
  return (
    <View className="flex-1 items-center justify-center">
      {/* NativeWind probe (Task 8): replaced by the app frame in Task 12. */}
      <View testID="nativewind-probe" className="h-24 w-24 bg-[#d8f23a]" />
    </View>
  );
}

export default App;
