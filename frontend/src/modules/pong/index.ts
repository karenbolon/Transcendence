//pong
//index.ts registers routes and sets up listeners

import type { Module, MountCtx } from "../../types";
import { startPongGame, stopPongGame } from "./views"

const Pong: Module = {
    id: "pong",
    title: "Pong",
    route: "/pong",
    mount({ container }: MountCtx) {
        const canvas = document.createElement("canvas");
        canvas.className = "block rounded bg-gray-800 w-full max-w0[800px] aspect=[4/3 mx-auto";
        container.appendChild(canvas);
        startPongGame(canvas, {width: 640, height: 480, speed: 4, targetScore: 11 });
    },
    unmount() {
        stopPongGame();
    },
};

export default Pong;