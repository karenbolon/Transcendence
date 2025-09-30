// tournament/index.ts
import type { Module, MountCtx } from "../../types";
import { renderTournamentPlayerInput } from "./views";
import { stopTournamentPongGame } from "./tournamentPong";

const Tournament: Module = {
  id: "tournament",
  title: "Tournament",
  route: "#/tournament",
  mount({ container }: MountCtx) {
    // limit to 8 players, min 2
    renderTournamentPlayerInput(container);
  },
  unmount() {
    stopTournamentPongGame();
  },
};


export default Tournament;
