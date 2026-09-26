/**
 * @format
 */

// Must stay the very first statement: supabase-js reads the global `URL` at
// module scope, so anything that imports it before this polyfill throws at launch.
import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
