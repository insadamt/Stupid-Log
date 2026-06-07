export type SettingsSection = 'profile' | 'integrations' | 'data';

export type ProviderCredentialStatus = {
    saved: boolean;
    lastTestedAt?: string | null;
    lastTestStatus?: string | null;
};

export type TestResult = {
    ok: boolean;
    message: string;
};

export type RequestState = 'idle' | 'saving-profile' | 'saving-integrations' | 'testing-igdb' | 'resetting';
