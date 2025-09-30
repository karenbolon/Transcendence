//pong
//index.ts registers routes and sets up listeners

import type { Module, MountCtx } from "../../types";
import { renderPongView, stopPongGame } from "./views"

const Pong: Module = {
    id: "pong",
    title: "Pong",
    route: "#/pong",
    mount({ container }: MountCtx) {
        // Use renderPongView so the target score selection form is shown
        renderPongView(container, { width: 640, height: 480, speed: 4 });
    },
    unmount() {
        stopPongGame();
    },
};

export default Pong;