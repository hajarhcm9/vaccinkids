/**
 * Profile / logout screen tests.
 *
 * Behaviours covered:
 * - Logout menu row is visible.
 * - Pressing logout shows a confirmation dialog.
 * - Confirming logout calls signOut from AuthContext.
 * - Language selector changes the UI to Arabic / French.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfileScreen from '../../src/screens/main/ProfileScreen';
import { AuthContext } from '../../src/context/AuthContext';

// ── Service mock ───────────────────────────────────────────────────────────────
jest.mock('../../src/services/preferencesService', () => ({
  preferencesService: {
    getLanguage: jest.fn().mockResolvedValue('fr'),
    setLanguage: jest.fn().mockResolvedValue(undefined),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────
const signIn = jest.fn();
const signOut = jest.fn().mockResolvedValue(undefined);

const renderProfile = (nav = { navigate: jest.fn(), goBack: jest.fn() }) =>
  render(
    <AuthContext.Provider value={{ signIn, signOut }}>
      <ProfileScreen navigation={nav} />
    </AuthContext.Provider>,
  );

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('ProfileScreen — layout', () => {
  it('renders the profile title', async () => {
    const { findByText } = renderProfile();
    await findByText('Mon Profil');
  });

  it('renders the logout row', async () => {
    const { findByText } = renderProfile();
    await findByText('Se déconnecter');
  });

  it('renders the language selector', async () => {
    const { findByText } = renderProfile();
    await findByText('Langue');
  });
});

describe('ProfileScreen — logout flow', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    signOut.mockClear();
  });

  it('shows a confirmation dialog when logout is pressed', async () => {
    const { findByText } = renderProfile();
    const logoutRow = await findByText('Se déconnecter');
    fireEvent.press(logoutRow);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Déconnexion',
        'Voulez-vous vraiment vous déconnecter ?',
        expect.any(Array),
      );
    });
  });

  it('calls signOut when user confirms logout', async () => {
    // Intercept Alert and invoke the destructive button immediately
    jest.restoreAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      const destructive = buttons?.find((b) => b.style === 'destructive');
      if (destructive?.onPress) destructive.onPress();
    });

    const { findByText } = renderProfile();
    const logoutRow = await findByText('Se déconnecter');
    fireEvent.press(logoutRow);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
  });

  it('does NOT call signOut when user cancels the dialog', async () => {
    jest.restoreAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      const cancelBtn = buttons?.find((b) => b.style === 'cancel');
      if (cancelBtn?.onPress) cancelBtn.onPress();
    });

    const { findByText } = renderProfile();
    const logoutRow = await findByText('Se déconnecter');
    fireEvent.press(logoutRow);

    await waitFor(() => {
      expect(signOut).not.toHaveBeenCalled();
    });
  });
});

describe('ProfileScreen — language switch', () => {
  it('shows Arabic labels when العربية is selected', async () => {
    const { findByText } = renderProfile();
    const arBtn = await findByText('العربية');
    fireEvent.press(arBtn);
    await findByText('تسجيل الخروج');
  });

  it('shows French labels again when Français is re-selected', async () => {
    const { findByText } = renderProfile();
    const arBtn = await findByText('العربية');
    fireEvent.press(arBtn);
    const frBtn = await findByText('Français');
    fireEvent.press(frBtn);
    await findByText('Se déconnecter');
  });
});
