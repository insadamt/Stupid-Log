export type Provider = 'igdb' | 'steam';
export type Scene = 'intro' | 'wizard' | 'import' | 'import-providers' | 'launch';

export type SetupForm = {
    username: string;
    igdb_client_id: string;
    igdb_client_secret: string;
    steam_api_key: string;
};

export type TestResult = {
    ok: boolean;
    message: string;
};

export type ProviderTestResults = Partial<Record<Provider, TestResult>>;

export type BackupPreview = {
    token: string;
    created_at: string;
    currency_code: string;
    counts: Record<string, number>;
    media_count: number;
};

export type BackupState = 'idle' | 'previewing' | 'restoring';
