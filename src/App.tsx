/**
 * @format
 */

import './global.css';
import { Text } from 'react-native';
import { AppFrame } from '@/components/ui/AppFrame';

function App() {
  return (
    <AppFrame
      header={
        // Placeholder until the desktop header (Task 46).
        <Text className="font-sans text-[17px] font-medium text-ink">
          Finny
        </Text>
      }
    >
      {null}
    </AppFrame>
  );
}

export default App;
