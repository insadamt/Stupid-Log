export type Provider = 'igdb' | 'steam';
export type Scene = 'intro' | 'wizard' | 'launch';

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
