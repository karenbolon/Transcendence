//types.ts
//shared types and module interface

export type MountCtx = {
    //where to render
    container: HTMLElement;
    //switch routes from inside a module
    navigate: (path: string) => void;
    //backend helper
    api: ApiClient;
};

export interface Module {
    id: string; //"pong", "auth", "leaderboard" ...
    title: string; //shown in sidebar
    route: string; //"/pong", "/auth", "/leaderboard" ...
    mount(ctx: MountCtx): void | Promise<void>;
    unmount?(): void; //cleanup (event listeners etc)
};

export interface ApiClient {
    get<T = any>(path: string): Promise<T>;
    post<T = any>(path: string, body?: unknown): Promise<T>;
}

