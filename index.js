import { AppRegistry } from 'react-native';
import App from './App';
import { pushRegistrationService } from './src/services/pushRegistrationService';

pushRegistrationService.setBackgroundHandler();

AppRegistry.registerComponent('VacciniKidsParent', () => App);
