// tournament/views.ts
import { renderTournamentPongView } from "./tournamentPong";

// --------------------------- Types & State ---------------------------
type MatchPair = { p1: string; p2: string | null };

type TournamentState = {
  round: number;
  players: string[];
  matches: MatchPair[];
  bye: string | null;
  winners: string[];
  currentMatch: number;
  finished: boolean;
};

const MAX_PLAYERS = 8;
const TOURNAMENT_POINTS = 5; // UI text only; tournamentPong defaults to 5 in tourney mode

let tournamentState: TournamentState | null = null;
const names: string[] = [];

// --------------------------- Player list helpers ---------------------------
function addName(name: string): string {
  const n = name.trim();
  if (!n) return "Please enter a valid name (non empty).";
  if (names.length >= MAX_PLAYERS) return `Max ${MAX_PLAYERS} opponents reached.`;
  if (names.some(x => x.toLowerCase() === n.toLowerCase()))
    return "That name is already in the list";
  names.push(n);
  return ""; // success
}

function removeName(index: number) {
  names.splice(index, 1);
}

export function getNames(): string[] {
  return [...names];
}

// --------------------------- Round builder ---------------------------
// Pair players (adjacent pairing). If odd count, last player gets a BYE.
function createMatches(playerNames: string[]): { matches: MatchPair[]; bye: string | null } {
  const pool = [...playerNames];
  // Optional shuffle:
  // pool.sort(() => Math.random() - 0.5);

  const matches: MatchPair[] = [];
  while (pool.length >= 2) {
    const p1 = pool.shift()!;
    const p2 = pool.shift()!;
    matches.push({ p1, p2 });
  }
  const bye = pool.length === 1 ? pool[0] : null;
  return { matches, bye };
}

// --------------------------- Main UI ---------------------------
export function renderTournamentPlayerInput(container: HTMLElement) {
  container.innerHTML = `
    <div class="space-y-4">
      <h3 class="text-lg font-semibold">Add Tournament Players</h3>

      <!-- Player entry panel (removed after schedule is created) -->
      <div id="playerPanel" class="space-y-4">
        <div class="flex gap-2">
          <input id="playerName" type="text" maxlength="20"
            class="border rounded px-3 py-2 w-full"
            placeholder="Type a name and press Enter" />
          <button id="addPlayer"
            class="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50">
            Add
          </button>
        </div>
        <p id="error" class="text-sm text-red-600 h-5"></p>

        <ul id="playerList" class="mt-2 space-y-1"></ul>
        <p id="playerCount" class="text-sm text-gray-500"></p>

        <button id="createSchedule"
          class="mt-2 px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50">
          Create Tournament Schedule
        </button>
      </div>

      <!-- Tournament schedule and Pong canvas stacked in one column -->
      <div class="mt-6">
        <div id="tournamentSchedule"></div>
        <div id="pongHost"></div>
      </div>
    </div>
  `;

  // ---- refs
  const playerPanel = container.querySelector<HTMLDivElement>("#playerPanel")!;
  const input = container.querySelector<HTMLInputElement>("#playerName")!;
  const addBtn = container.querySelector<HTMLButtonElement>("#addPlayer")!;
  const list = container.querySelector<HTMLUListElement>("#playerList")!;
  const count = container.querySelector<HTMLParagraphElement>("#playerCount")!;
  const error = container.querySelector<HTMLParagraphElement>("#error")!;
  const createScheduleBtn = container.querySelector<HTMLButtonElement>("#createSchedule")!;
  const scheduleDiv = container.querySelector<HTMLDivElement>("#tournamentSchedule")!;
  const pongHost = container.querySelector<HTMLDivElement>("#pongHost")!;

  // ---- render players list
  const renderList = () => {
    list.innerHTML = names
      .map(
        (n, i) => `
      <li class="flex items-center justify-between border rounded px-3 py-1 w-[22rem] gap-2">
        <span class="w-[16rem] truncate" title="${n}">${n}</span>
        <button data-index="${i}"
          class="text-sm px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 w-24 shrink-0 text-center">
          Remove
        </button>
      </li>`
      )
      .join("");

    count.textContent = `Players: ${names.length}/${MAX_PLAYERS}`;
    const full = names.length >= MAX_PLAYERS;
    addBtn.disabled = full;
    input.disabled = full;
    createScheduleBtn.disabled = names.length < 2;
  };

  const showError = (msg = "") => (error.textContent = msg);

  const addFromInput = () => {
    const msg = addName(input.value);
    if (msg) showError(msg);
    else {
      showError("");
      input.value = "";
      input.focus();
      renderList();
    }
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addFromInput();
    }
  });
  addBtn.addEventListener("click", addFromInput);

  list.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-index]");
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    if (!Number.isNaN(idx)) {
      removeName(idx);
      showError("");
      input.disabled = false;
      addBtn.disabled = false;
      renderList();
    }
  });

  // ---- advance BYEs without launching a match
  function advanceByes() {
    if (!tournamentState) return;
    let advanced = false;
    while (tournamentState.currentMatch < tournamentState.matches.length) {
      const m = tournamentState.matches[tournamentState.currentMatch];
      if (m.p2) break; // stop at first real match
      tournamentState.winners[tournamentState.currentMatch] = m.p1;
      tournamentState.currentMatch++;
      advanced = true;
    }
    if (advanced) renderMatchSchedule();

    // If a round has only BYEs, move to winners/next round UI
    if (tournamentState.currentMatch >= tournamentState.matches.length) {
      showWinnersAndNextRound();
    }
  }

  // ---- schedule rendering
  function renderMatchSchedule() {
    if (!tournamentState) return;
    let html = `<h4 class="text-lg font-semibold mb-2">Tournament Schedule</h4>`;
    html += `<div class="mb-2 text-sm text-gray-600">
      Round ${tournamentState.round}: ${tournamentState.players.length} players
    </div>`;
    html += '<ul class="space-y-1">';
    tournamentState.matches.forEach((m, i) => {
      const label = `${m.p1} <span class="text-gray-400">vs</span> ${m.p2 ?? "BYE"}`;
      const winner = tournamentState && tournamentState.winners[i];
      if (winner) {
        html += `<li>${label} <span class="font-bold">Winner: ${winner}</span></li>`;
      } else if (tournamentState && i === tournamentState.currentMatch) {
        html += `<li>${label} <span>(${m.p2 ? "Playing" : "BYE"})</span></li>`;
      } else {
        html += `<li>${label}</li>`;
      }
    });
    if (tournamentState && tournamentState.bye) {
      html += `<li>${tournamentState.bye} <span class="text-gray-400">automatic bye to next round</span></li>`;
    }
    html += '</ul>';

    // Current match CTA
    if (!tournamentState.finished) {
      const cm = tournamentState.matches[tournamentState.currentMatch];
      if (cm) {
        html += `
          <div class="mt-4 border rounded p-3">
            <div class="flex items-center justify-between">
              <div>
                <div><strong>${cm.p1}</strong> vs <strong>${cm.p2 ?? "BYE"}</strong></div>
                <div class="text-xs text-gray-500">First to ${TOURNAMENT_POINTS}</div>
              </div>
              ${
                cm.p2
                  ? `<button id="playMatchBtn"
                      class="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">
                      Play match
                    </button>`
                  : `<span class="text-sm text-gray-500">BYE — auto-advances</span>`
              }
            </div>
          </div>
        `;
      }
    }

    scheduleDiv.innerHTML = html;

    const playBtn = scheduleDiv.querySelector<HTMLButtonElement>("#playMatchBtn");
    if (playBtn) playBtn.onclick = () => startCurrentMatch();
  }

  // ---- Start/advance matches, mounting Tournament Pong into #pongHost (right column)
  function startCurrentMatch() {
    if (!tournamentState) return;

    // Round complete?
    if (tournamentState.currentMatch >= tournamentState.matches.length) {
      showWinnersAndNextRound();
      return;
    }

    const match = tournamentState.matches[tournamentState.currentMatch];

    // BYE: auto-advance
    if (!match.p2) {
      tournamentState.winners[tournamentState.currentMatch] = match.p1;
      tournamentState.currentMatch++;
      renderMatchSchedule();
      setTimeout(startCurrentMatch, 200);
      return;
    }

    renderTournamentPongView(pongHost, {
      player1: match.p1,
      player2: match.p2,
      // (targetScore omitted: tournamentPong defaults to 5 in tourney mode)
      onGameEnd: (winner: string) => {
        tournamentState!.winners[tournamentState!.currentMatch] = winner;
        tournamentState!.currentMatch++;
        pongHost.innerHTML = "";
        renderMatchSchedule();

        if (tournamentState!.currentMatch >= tournamentState!.matches.length) {
          showWinnersAndNextRound();
        } else {
          // Wait for user to press "Play match" again for next pairing
        }
      },
    });

    renderMatchSchedule();
  }

  // ---- Winners and next round builder
  function showWinnersAndNextRound() {
    if (!tournamentState) return;

    let html = `<div class="mb-2 font-semibold">Winners this round:</div><ul class="mb-2 space-y-1">`;
    for (const w of tournamentState.winners) {
      // 🔴 winners list in red (forced)
  html += `<li><span class="!text-red-600 dark:!text-red-400 font-semibold">${w}</span></li>`;
    }
    html += `</ul>`;

    if (tournamentState.bye) {
      html += `<div class="mb-2">${tournamentState.bye} advances by bye</div>`;
      tournamentState.winners.push(tournamentState.bye);
    }

    // Champion decided?
    if (tournamentState.winners.length === 1) {
      //make winner declaration red font
      html += `<div class="font-bold !text-red-600 dark:!text-red-400">Tournament Winner: ${tournamentState.winners[0]}</div>`;
      tournamentState.finished = true;
      scheduleDiv.innerHTML = html;
      pongHost.innerHTML = "";
      return;
    }

    html += `<button id="nextRound" class="mt-4 px-4 py-2 rounded bg-green-600 text-white">Create Next Round</button>`;
    scheduleDiv.innerHTML = html;

    const nextBtn = scheduleDiv.querySelector<HTMLButtonElement>("#nextRound");
    nextBtn?.addEventListener("click", () => {
      const { matches, bye } = createMatches(tournamentState!.winners);
      tournamentState = {
        round: tournamentState!.round + 1,
        players: [...tournamentState!.winners],
        matches,
        bye,
        winners: [],
        currentMatch: 0,
        finished: false,
      };
      renderMatchSchedule();
      advanceByes();
    });
  }

  // ---- Create schedule
  function renderSchedule() {
    const playerNames = getNames();
    if (playerNames.length < 2) {
      scheduleDiv.innerHTML = '<p class="text-sm text-gray-500">Add at least 2 players to create a schedule.</p>';
      return;
    }

    const { matches, bye } = createMatches(playerNames);
    tournamentState = {
      round: 1,
      players: playerNames,
      matches,
      bye,
      winners: [],
      currentMatch: 0,
      finished: false,
    };

    // 🧹 Remove the player entry panel from the DOM and clear the signup list
    playerPanel.remove();
    names.length = 0;

    renderMatchSchedule();
    advanceByes(); // auto-advance any initial BYEs
  }

  // ---- wire buttons and initial UI
  createScheduleBtn.addEventListener("click", renderSchedule);
  renderList();
  input.focus();
  scheduleDiv.innerHTML = '<p class="text-sm text-gray-500">Add at least 2 players to create a schedule.</p>';
}
