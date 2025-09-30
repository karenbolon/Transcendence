//types.ts
//shared types and module interface

export type Route = '#/home' | '#/pong' | '#/tournament' | '#/leaderboard' | '#/auth';

export type MountCtx = {
    container: HTMLElement;
    //switch routes from inside a module
    navigate: (path: string) => void;
    //backend helper
    api: ApiClient;
};

export interface Module {
    id: string; //"pong", "auth", "leaderboard" ...
    title: string; //shown in menubar
    route: Route; //"/pong", "/auth", "/leaderboard" ...
    mount(ctx: MountCtx): void;
    unmount?(): void; //cleanup (event listeners etc)
};

export interface ApiClient {
    get<T = unknown>(path: string): Promise<T>;
    post<T = unknown>(path: string, body?: unknown): Promise<T>;
};

export type Match = {
    p1: string;
    p2: string | null; //null means a BYE
    winner?: string; //set when finished match
    node?: HTMLElement; //DOM for live updates
};

export type Round = {
    name: string; // "round 1"
    matches: Match[];
    winnersNode?: HTMLElement; //DOM node where we print round winners
};

export type Tournament = {
    rounds: Round[];
    currentRoundIndex: number;
    currentMatchIndex: number;
};


