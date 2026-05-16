import * as vscode from 'vscode';
import { HtbAuthError, type HtbApiClient } from './htbApi.js';
import type { HtbProfile } from '../types/htb.js';
import type { Logger } from '../utils/logger.js';

const TOKEN_KEY = 'htb.apiToken';
const HTB_SETTINGS_URL = 'https://app.hackthebox.com/profile/settings';

export class AuthService {
  private _profile: HtbProfile | undefined;

  constructor(
    private readonly secrets: vscode.SecretStorage,
    private readonly logger: Logger,
  ) {}

  get profile(): HtbProfile | undefined {
    return this._profile;
  }

  async getToken(): Promise<string | undefined> {
    return this.secrets.get(TOKEN_KEY);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== undefined && token.length > 0;
  }

  async signIn(apiClient: HtbApiClient): Promise<HtbProfile> {
    await vscode.env.openExternal(vscode.Uri.parse(HTB_SETTINGS_URL));

    const token = await vscode.window.showInputBox({
      title: 'HTB: Sign In',
      prompt: 'Paste your HTB App Token from the Profile Settings page that just opened',
      password: true,
      ignoreFocusOut: true,
      placeHolder: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...',
      validateInput: (v) => (v.trim().length < 20 ? 'Token seems too short' : null),
    });

    if (!token) {
      throw new HtbAuthError('Sign in cancelled.');
    }

    await this.secrets.store(TOKEN_KEY, token.trim());

    let profile: HtbProfile;
    try {
      profile = await apiClient.verifyToken();
    } catch (e) {
      await this.secrets.delete(TOKEN_KEY);
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Sign in failed: ${msg}`);
      throw new Error(`Sign in failed: ${msg}`);
    }

    this._profile = profile;
    this.logger.info(`Signed in as ${profile.name} (${profile.rank})`);
    return profile;
  }

  async signOut(): Promise<void> {
    await this.secrets.delete(TOKEN_KEY);
    this._profile = undefined;
    this.logger.info('Signed out');
  }

  async restoreSession(apiClient: HtbApiClient): Promise<HtbProfile | null> {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      return null;
    }
    try {
      const profile = await apiClient.verifyToken();
      this._profile = profile;
      this.logger.info(`Session restored: ${profile.name}`);
      return profile;
    } catch {
      this.logger.warn('Stored token is no longer valid, clearing.');
      await this.secrets.delete(TOKEN_KEY);
      return null;
    }
  }
}
