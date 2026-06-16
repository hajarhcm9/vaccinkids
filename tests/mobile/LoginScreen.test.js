/**
 * Auth flow tests for the parent mobile app — LoginScreen.
 *
 * Strategy: render the component with mocked services and navigation props,
 * then assert on both the rendered output and the calls made to services.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../src/screens/auth/LoginScreen';

// ── Service mocks ──────────────────────────────────────────────────────────────
jest.mock('../../src/services/authService', () => ({
  authService: {
    sendOtp: jest.fn(),
  },
}));

jest.mock('../../src/services/preferencesService', () => ({
  preferencesService: {
    getLanguage: jest.fn().mockResolvedValue('fr'),
    setLanguage: jest.fn().mockResolvedValue(undefined),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────
const buildNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
});

const renderLogin = (nav = buildNavigation()) =>
  render(<LoginScreen navigation={nav} />);

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('LoginScreen — layout', () => {
  it('renders app name and tagline', async () => {
    const { findByText } = renderLogin();
    await findByText('VacciniKids');
    await findByText('Suivi vaccinal de votre enfant');
  });

  it('renders language selector with FR and AR options', async () => {
    const { findByText } = renderLogin();
    await findByText('Français');
    await findByText('العربية');
  });

  it('renders the continue button', async () => {
    const { findByText } = renderLogin();
    await findByText('Continuer');
  });
});

describe('LoginScreen — phone validation', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows alert when phone is empty and user taps Continuer', async () => {
    const { findByText } = renderLogin();
    const btn = await findByText('Continuer');
    fireEvent.press(btn);
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Erreur',
        'Veuillez entrer votre numéro de téléphone.',
      );
    });
  });

  it('shows alert when phone has fewer than 9 digits', async () => {
    const { findByText, findByPlaceholderText, UNSAFE_getAllByType } = renderLogin();
    // PhoneInput renders a TextInput internally
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    if (inputs.length > 0) {
      fireEvent.changeText(inputs[0], '1234');
    }
    const btn = await findByText('Continuer');
    fireEvent.press(btn);
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Erreur',
        expect.stringContaining('invalide'),
      );
    });
  });
});

describe('LoginScreen — OTP dispatch', () => {
  it('calls authService.sendOtp with E.164 formatted number on valid phone', async () => {
    const { authService } = require('../../src/services/authService');
    authService.sendOtp.mockResolvedValue({ success: true });

    const nav = buildNavigation();
    const { findByText, UNSAFE_getAllByType } = render(<LoginScreen navigation={nav} />);
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    if (inputs.length > 0) {
      fireEvent.changeText(inputs[0], '612345678'); // 9-digit Moroccan mobile
    }
    const btn = await findByText('Continuer');
    fireEvent.press(btn);

    await waitFor(() => {
      expect(authService.sendOtp).toHaveBeenCalledWith('+212612345678');
    });
  });

  it('navigates to OtpVerification screen after successful OTP send', async () => {
    const { authService } = require('../../src/services/authService');
    authService.sendOtp.mockResolvedValue({ success: true });

    const nav = buildNavigation();
    const { findByText, UNSAFE_getAllByType } = render(<LoginScreen navigation={nav} />);
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    if (inputs.length > 0) {
      fireEvent.changeText(inputs[0], '612345678');
    }
    const btn = await findByText('Continuer');
    fireEvent.press(btn);

    await waitFor(() => {
      expect(nav.navigate).toHaveBeenCalledWith(
        'OtpVerification',
        expect.objectContaining({ phoneNumber: '+212612345678' }),
      );
    });
  });
});

describe('LoginScreen — language switch', () => {
  it('switches to Arabic labels when العربية is pressed', async () => {
    const { findByText } = renderLogin();
    const arBtn = await findByText('العربية');
    fireEvent.press(arBtn);
    await findByText('متابعة');
  });

  it('switches back to French labels when Français is pressed', async () => {
    const { findByText } = renderLogin();
    const arBtn = await findByText('العربية');
    fireEvent.press(arBtn);
    const frBtn = await findByText('Français');
    fireEvent.press(frBtn);
    await findByText('Continuer');
  });
});
