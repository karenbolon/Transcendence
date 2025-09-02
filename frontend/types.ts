//shared types and module interface

export type MountCtx = {
    //where to render
    container: HTMLElement;
    //switch routes from inside a module
    navigate: (path: string) => void;
    //backend helper
    api: (path: string, init?: RequestInit) => Promise<any>;
}

export interface Module {
    id: string; //"pong", "auth", "leaderboard" ...
    title: string; //shown in sidebar
    routh: string; //"/pong", "/auth", "/leaderboard" ...
    mount(ctx: MountCtx): void | Promise<void>;
    unmount?(): void; //cleanup (event listeners etc)
}