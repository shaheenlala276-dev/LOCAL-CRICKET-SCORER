/* =========================================================
   LOCAL CRICKET SCORER APP - VERSION 1.4
   REBUILT WORKING VERSION

   Features:
   - Tournament management
   - Team management
   - Player management
   - Match setup
   - Playing XI
   - Toss
   - Live ball-by-ball scoring
   - Wicket
   - New batsman after wicket
   - Strike rotation
   - Overs
   - Undo
   - LocalStorage
   ========================================================= */


/* =========================================================
   DATA
   ========================================================= */

const AppData = {
    tournaments: [],
    teams: [],
    players: [],
    matches: []
};

const STORAGE_KEY = "cricket_scorer_v1";

const TOURNAMENT_PREFIX = "tourn_";
const TEAM_PREFIX = "team_";
const PLAYER_PREFIX = "player_";
const MATCH_PREFIX = "match_";


/* =========================================================
   CURRENT STATE
   ========================================================= */

const CurrentState = {
    currentTournamentId: null,
    currentTeamId: null,
    currentMatchId: null,
    editingTeamId: null,
    editingPlayerId: null
};


/* =========================================================
   LIVE STATE
   ========================================================= */

const LiveState = {
    inningsIndex: 0,
    strikerId: null,
    nonStrikerId: null,
    bowlerId: null,
    pendingNewBatsman: false
};


/* =========================================================
   HELPERS
   ========================================================= */

function generateId(prefix) {
    return prefix + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppData));
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {
        const data = JSON.parse(saved);

        AppData.tournaments = data.tournaments || [];
        AppData.teams = data.teams || [];
        AppData.players = data.players || [];
        AppData.matches = data.matches || [];
    } catch (error) {
        console.error("Could not load saved data:", error);
    }
}

function getTournamentById(id) {
    return AppData.tournaments.find(t => t.id === id);
}

function getTeamById(id) {
    return AppData.teams.find(t => t.id === id);
}

function getPlayerById(id) {
    return AppData.players.find(p => p.id === id);
}

function getMatchById(id) {
    return AppData.matches.find(m => m.id === id);
}

function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    const screen = document.getElementById(screenId);

    if (screen) {
        screen.classList.add("active");
    }
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   TOURNAMENTS
   ========================================================= */

function createTournament(name) {
    if (!name || !name.trim()) {
        alert("Please enter tournament name.");
        return;
    }

    const tournament = {
        id: generateId(TOURNAMENT_PREFIX),
        name: name.trim(),
        createdAt: new Date().toISOString()
    };

    AppData.tournaments.push(tournament);
    saveData();

    renderTournamentList();

    const input = document.getElementById("tournament-name");

    if (input) {
        input.value = "";
    }
}

function deleteTournament(id) {
    const tournament = getTournamentById(id);

    if (!tournament) return;

    if (!confirm(`Delete tournament "${tournament.name}"?`)) return;

    AppData.tournaments = AppData.tournaments.filter(t => t.id !== id);

    AppData.teams = AppData.teams.filter(
        team => team.tournamentId !== id
    );

    AppData.matches = AppData.matches.filter(
        match => match.tournamentId !== id
    );

    saveData();
    renderTournamentList();
}

function renderTournamentList() {
    const container =
        document.getElementById("tournament-list") ||
        document.getElementById("tournaments-list");

    if (!container) return;

    if (AppData.tournaments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No tournaments yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = AppData.tournaments.map(tournament => `
        <div class="card tournament-card">
            <h3>${escapeHTML(tournament.name)}</h3>

            <button
                class="btn-primary tournament-open-btn"
                data-id="${tournament.id}">
                Open
            </button>

            <button
                class="btn-danger tournament-delete-btn"
                data-id="${tournament.id}">
                Delete
            </button>
        </div>
    `).join("");

    container.querySelectorAll(".tournament-open-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openTournament(btn.dataset.id);
        });
    });

    container.querySelectorAll(".tournament-delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            deleteTournament(btn.dataset.id);
        });
    });
}

function openTournament(id) {
    const tournament = getTournamentById(id);

    if (!tournament) return;

    CurrentState.currentTournamentId = id;

    renderTournamentDashboard();

    showScreen("tournament-dashboard-screen");
}


/* =========================================================
   TEAMS
   ========================================================= */

function createTeam(tournamentId, name) {
    if (!tournamentId) {
        alert("Tournament not selected.");
        return;
    }

    if (!name || !name.trim()) {
        alert("Please enter team name.");
        return;
    }

    const team = {
        id: generateId(TEAM_PREFIX),
        tournamentId,
        name: name.trim(),
        playerIds: [],
        createdAt: new Date().toISOString()
    };

    AppData.teams.push(team);

    saveData();
    renderTournamentDashboard();
}

function deleteTeam(id) {
    const team = getTeamById(id);

    if (!team) return;

    if (!confirm(`Delete team "${team.name}"?`)) return;

    AppData.teams = AppData.teams.filter(t => t.id !== id);

    AppData.players = AppData.players.filter(
        player => player.teamId !== id
    );

    saveData();

    renderTournamentDashboard();
}

function renderTeams(tournamentId) {
    const container =
        document.getElementById("team-list") ||
        document.getElementById("teams-list");

    if (!container) return;

    const teams = AppData.teams.filter(
        team => team.tournamentId === tournamentId
    );

    if (teams.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No teams yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = teams.map(team => `
        <div class="card team-card">
            <h3>${escapeHTML(team.name)}</h3>

            <button
                class="btn-primary team-open-btn"
                data-id="${team.id}">
                Players
            </button>

            <button
                class="btn-danger team-delete-btn"
                data-id="${team.id}">
                Delete
            </button>
        </div>
    `).join("");

    container.querySelectorAll(".team-open-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openTeam(btn.dataset.id);
        });
    });

    container.querySelectorAll(".team-delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            deleteTeam(btn.dataset.id);
        });
    });
}

function openTeam(id) {
    const team = getTeamById(id);

    if (!team) return;

    CurrentState.currentTeamId = id;

    renderTeamDetails();

    showScreen("team-details-screen");
}


/* =========================================================
   PLAYERS
   ========================================================= */

function createPlayer(teamId, name) {
    if (!teamId) {
        alert("Team not selected.");
        return;
    }

    if (!name || !name.trim()) {
        alert("Please enter player name.");
        return;
    }

    const player = {
        id: generateId(PLAYER_PREFIX),
        teamId,
        name: name.trim(),
        createdAt: new Date().toISOString()
    };

    AppData.players.push(player);

    const team = getTeamById(teamId);

    if (team) {
        if (!Array.isArray(team.playerIds)) {
            team.playerIds = [];
        }

        team.playerIds.push(player.id);
    }

    saveData();

    renderTeamDetails();
}

function deletePlayer(id) {
    const player = getPlayerById(id);

    if (!player) return;

    if (!confirm(`Delete player "${player.name}"?`)) return;

    AppData.players = AppData.players.filter(
        p => p.id !== id
    );

    AppData.teams.forEach(team => {
        team.playerIds = (team.playerIds || []).filter(
            playerId => playerId !== id
        );
    });

    saveData();

    renderTeamDetails();
}

function renderTeamDetails() {
    const team = getTeamById(CurrentState.currentTeamId);

    if (!team) return;

    const title = document.getElementById("team-details-title");

    if (title) {
        title.textContent = team.name;
    }

    const container =
        document.getElementById("player-list") ||
        document.getElementById("players-list");

    if (!container) return;

    const players = AppData.players.filter(
        player => player.teamId === team.id
    );

    if (players.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No players yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = players.map((player, index) => `
        <div class="card player-card">
            <strong>${index + 1}. ${escapeHTML(player.name)}</strong>

            <button
                class="btn-danger player-delete-btn"
                data-id="${player.id}">
                Delete
            </button>
        </div>
    `).join("");

    container.querySelectorAll(".player-delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            deletePlayer(btn.dataset.id);
        });
    });
}


/* =========================================================
   TOURNAMENT DASHBOARD
   ========================================================= */

function renderTournamentDashboard() {
    const tournament =
        getTournamentById(CurrentState.currentTournamentId);

    if (!tournament) return;

    const title =
        document.getElementById("tournament-dashboard-title");

    if (title) {
        title.textContent = tournament.name;
    }

    renderTeams(tournament.id);
    renderTournamentMatches(tournament.id);
}


/* =========================================================
   MATCHES
   ========================================================= */

function createMatch(matchData) {
    const {
        tournamentId,
        team1Id,
        team2Id,
        overs,
        matchDate,
        matchTime,
        venue,
        tossWinnerId,
        tossDecision,
        team1PlayingXI,
        team2PlayingXI
    } = matchData;

    if (!tournamentId) {
        alert("Tournament not selected.");
        return;
    }

    if (!team1Id || !team2Id || team1Id === team2Id) {
        alert("Please select two different teams.");
        return;
    }

    if (!overs || Number(overs) <= 0) {
        alert("Please enter valid overs.");
        return;
    }

    if (!tossWinnerId) {
        alert("Please select toss winner.");
        return;
    }

    if (!tossDecision) {
        alert("Please select toss decision.");
        return;
    }

    if (
        !Array.isArray(team1PlayingXI) ||
        team1PlayingXI.length < 2 ||
        team1PlayingXI.length > 11
    ) {
        alert("Team 1 Playing XI must contain 2 to 11 players.");
        return;
    }

    if (
        !Array.isArray(team2PlayingXI) ||
        team2PlayingXI.length < 2 ||
        team2PlayingXI.length > 11
    ) {
        alert("Team 2 Playing XI must contain 2 to 11 players.");
        return;
    }

    const match = {
        id: generateId(MATCH_PREFIX),
        tournamentId,
        team1Id,
        team2Id,
        overs: parseInt(overs, 10),
        matchDate: matchDate || "",
        matchTime: matchTime || "",
        venue: venue || "",
        tossWinnerId,
        tossDecision,
        team1PlayingXI,
        team2PlayingXI,
        status: "Not Started",
        innings: [],
        createdAt: new Date().toISOString()
    };

    AppData.matches.push(match);

    saveData();

    CurrentState.currentMatchId = match.id;

    alert("Match created successfully.");

    renderTournamentDashboard();
}

function renderTournamentMatches(tournamentId) {
    const container =
        document.getElementById("match-list") ||
        document.getElementById("matches-list");

    if (!container) return;

    const matches = AppData.matches.filter(
        match => match.tournamentId === tournamentId
    );

    if (matches.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No matches yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = matches.map(match => {
        const team1 = getTeamById(match.team1Id);
        const team2 = getTeamById(match.team2Id);

        return `
            <div class="card match-card">
                <h3>
                    ${escapeHTML(team1 ? team1.name : "Team 1")}
                    vs
                    ${escapeHTML(team2 ? team2.name : "Team 2")}
                </h3>

                <p>Status: ${escapeHTML(match.status)}</p>

                <button
                    class="btn-primary match-open-btn"
                    data-id="${match.id}">
                    ${match.status === "Not Started"
                        ? "Start Match"
                        : "Open Match"}
                </button>
            </div>
        `;
    }).join("");

    container.querySelectorAll(".match-open-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openMatch(btn.dataset.id);
        });
    });
}

function openMatch(id) {
    const match = getMatchById(id);

    if (!match) return;

    CurrentState.currentMatchId = id;

    if (match.status === "Not Started") {
        startMatch(id);
    } else {
        initializeLiveScoring(match);
        renderLiveScoring();
        showScreen("live-scoring-screen");
    }
}


/* =========================================================
   START MATCH
   ========================================================= */

function startMatch(matchId) {
    const match = getMatchById(matchId);

    if (!match) return;

    initializeLiveScoring(match);

    match.status = "Live";

    saveData();

    renderLiveScoring();

    showScreen("live-scoring-screen");
}


/* =========================================================
   LIVE SCORING INITIALIZATION
   ========================================================= */

function initializeLiveScoring(match) {
    if (!match) return;

    if (!Array.isArray(match.innings)) {
        match.innings = [];
    }

    if (match.innings.length === 0) {
        let battingTeamId;
        let bowlingTeamId;

        if (match.tossDecision === "bat") {
            battingTeamId = match.tossWinnerId;
        } else {
            battingTeamId =
                match.tossWinnerId === match.team1Id
                    ? match.team2Id
                    : match.team1Id;
        }

        bowlingTeamId =
            battingTeamId === match.team1Id
                ? match.team2Id
                : match.team1Id;

        const innings = {
            inningsNumber: 1,
            battingTeamId,
            bowlingTeamId,
            runs: 0,
            wickets: 0,
            balls: 0,
            totalBalls: 0,
            ballsHistory: [],
            outPlayerIds: [],
            waitingForNewBatsman: false,
            pendingEndOfOverSwap: false,
            completed: false
        };

        match.innings.push(innings);
    }

    const innings = match.innings[LiveState.inningsIndex];

    if (!innings) return;

    if (!Array.isArray(innings.outPlayerIds)) {
        innings.outPlayerIds = [];
    }

    if (typeof innings.waitingForNewBatsman !== "boolean") {
        innings.waitingForNewBatsman = false;
    }

    if (typeof innings.pendingEndOfOverSwap !== "boolean") {
        innings.pendingEndOfOverSwap = false;
    }

    const battingXI =
        innings.battingTeamId === match.team1Id
            ? match.team1PlayingXI
            : match.team2PlayingXI;

    if (
        !innings.waitingForNewBatsman &&
        (!LiveState.strikerId || !LiveState.nonStrikerId)
    ) {
        const available = battingXI.filter(
            id => !innings.outPlayerIds.includes(id)
        );

        if (available.length >= 2) {
            LiveState.strikerId = available[0];
            LiveState.nonStrikerId = available[1];
        }
    }

    const bowlingXI =
        innings.bowlingTeamId === match.team1Id
            ? match.team1PlayingXI
            : match.team2PlayingXI;

    if (!LiveState.bowlerId && bowlingXI.length > 0) {
        LiveState.bowlerId = bowlingXI[0];
    }

    LiveState.pendingNewBatsman =
        innings.waitingForNewBatsman;
}


/* =========================================================
   NEW BATSMAN
   ========================================================= */

function getEligibleNewBatsmen(match, innings) {
    const battingXI =
        innings.battingTeamId === match.team1Id
            ? match.team1PlayingXI
            : match.team2PlayingXI;

    return battingXI.filter(playerId => {
        return (
            !innings.outPlayerIds.includes(playerId) &&
            playerId !== LiveState.strikerId &&
            playerId !== LiveState.nonStrikerId
        );
    });
}

function renderNewBatsmanSelector(match, innings) {
    const eligible =
        getEligibleNewBatsmen(match, innings);

    if (eligible.length === 0) {
        return `
            <div class="new-batsman-box">
                <h3>No batsman remaining</h3>
                <p>Innings completed!</p>
            </div>
        `;
    }

    return `
        <div class="new-batsman-box">
            <h3>New Batsman</h3>

            <p>Select the new batsman:</p>

            <div class="new-batsman-list">
                ${eligible.map(playerId => {
                    const player = getPlayerById(playerId);

                    return `
                        <button
                            class="new-batsman-btn"
                            data-player-id="${playerId}">
                            ${escapeHTML(
                                player ? player.name : "Player"
                            )}
                        </button>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}

function selectNewBatsman(playerId) {
    const match =
        getMatchById(CurrentState.currentMatchId);

    if (!match) return;

    const innings =
        match.innings[LiveState.inningsIndex];

    if (!innings) return;

    const eligible =
        getEligibleNewBatsmen(match, innings);

    if (!eligible.includes(playerId)) {
        alert("This player cannot be selected.");
        return;
    }

    LiveState.strikerId = playerId;

    innings.waitingForNewBatsman = false;

    LiveState.pendingNewBatsman = false;

    if (innings.pendingEndOfOverSwap) {
        swapLiveStrikers();

        innings.pendingEndOfOverSwap = false;
    }

    saveData();

    renderLiveScoring();
}


/* =========================================================
   LIVE SCORING UI
   ========================================================= */

function renderLiveScoring() {
    const match =
        getMatchById(CurrentState.currentMatchId);

    if (!match) return;

    initializeLiveScoring(match);

    const innings =
        match.innings[LiveState.inningsIndex];

    if (!innings) return;

    const battingTeam =
        getTeamById(innings.battingTeamId);

    const bowlingTeam =
        getTeamById(innings.bowlingTeamId);

    const striker =
        getPlayerById(LiveState.strikerId);

    const nonStriker =
        getPlayerById(LiveState.nonStrikerId);

    const bowler =
        getPlayerById(LiveState.bowlerId);

    const screen =
        document.getElementById("live-scoring-screen");

    if (!screen) return;

    const oversCompleted =
        Math.floor(innings.balls / 6);

    const ballsInOver =
        innings.balls % 6;

    const oversText =
        `${oversCompleted}.${ballsInOver}`;

    screen.innerHTML = `
        <header class="app-header">
            <button
                id="btn-back-from-live-scoring"
                class="btn-back">
                ← Back
            </button>

            <h2>Live Scoring</h2>
        </header>

        <div class="content">

            <div class="live-match-header">
                <h2>
                    ${escapeHTML(
                        battingTeam
                            ? battingTeam.name
                            : "Batting Team"
                    )}
                </h2>

                <div class="live-score">
                    ${innings.runs}/${innings.wickets}
                </div>

                <div class="live-overs">
                    Overs: ${oversText} / ${match.overs}
                </div>
            </div>

            <div class="live-teams">
                <p>
                    <strong>Batting:</strong>
                    ${escapeHTML(
                        battingTeam
                            ? battingTeam.name
                            : ""
                    )}
                </p>

                <p>
                    <strong>Bowling:</strong>
                    ${escapeHTML(
                        bowlingTeam
                            ? bowlingTeam.name
                            : ""
                    )}
                </p>
            </div>

            <div class="current-players">

                <div class="player-box striker-box">
                    <strong>Striker</strong>

                    <div>
                        ${escapeHTML(
                            striker
                                ? striker.name
                                : "Waiting..."
                        )}
                    </div>
                </div>

                <div class="player-box non-striker-box">
                    <strong>Non-Striker</strong>

                    <div>
                        ${escapeHTML(
                            nonStriker
                                ? nonStriker.name
                                : "Waiting..."
                        )}
                    </div>
                </div>

                <div class="player-box bowler-box">
                    <strong>Bowler</strong>

                    <div>
                        ${escapeHTML(
                            bowler
                                ? bowler.name
                                : "Waiting..."
                        )}
                    </div>
                </div>

            </div>

            ${
                innings.waitingForNewBatsman
                    ? renderNewBatsmanSelector(
                        match,
                        innings
                    )
                    : `
                        <div class="scoring-controls">

                            <h3>Runs</h3>

                            <div class="run-buttons">

                                <button
                                    class="run-btn"
                                    data-runs="0">
                                    0
                                </button>

                                <button
                                    class="run-btn"
                                    data-runs="1">
                                    1
                                </button>

                                <button
                                    class="run-btn"
                                    data-runs="2">
                                    2
                                </button>

                                <button
                                    class="run-btn"
                                    data-runs="3">
                                    3
                                </button>

                                <button
                                    class="run-btn"
                                    data-runs="4">
                                    4
                                </button>

                                <button
                                    class="run-btn"
                                    data-runs="6">
                                    6
                                </button>

                            </div>

                            <h3>Extras / Wicket</h3>

                            <div class="extra-buttons">

                                <button
                                    id="btn-wicket"
                                    class="wicket-btn">
                                    Wicket
                                </button>

                                <button
                                    id="btn-wide"
                                    class="extra-btn">
                                    Wide
                                </button>

                                <button
                                    id="btn-noball"
                                    class="extra-btn">
                                    No Ball
                                </button>

                            </div>

                        </div>
                    `
            }

            <div class="ball-history-section">

                <h3>Ball History</h3>

                <div id="live-ball-history">
                    ${renderBallHistory(innings)}
                </div>

                <button
                    id="btn-undo-live-ball"
                    class="btn-secondary">
                    ↩ Undo Last Ball
                </button>

            </div>

        </div>
    `;

    attachLiveScoringListeners();

    const backButton =
        document.getElementById(
            "btn-back-from-live-scoring"
        );

    if (backButton) {
        backButton.addEventListener(
            "click",
            () => {
                renderTournamentDashboard();

                showScreen(
                    "tournament-dashboard-screen"
                );
            }
        );
    }
}


/* =========================================================
   BALL HISTORY
   ========================================================= */

function renderBallHistory(innings) {
    if (
        !innings ||
        !Array.isArray(innings.ballsHistory) ||
        innings.ballsHistory.length === 0
    ) {
        return `
            <p class="empty-history">
                No balls recorded yet.
            </p>
        `;
    }

    return innings.ballsHistory
        .slice()
        .reverse()
        .map((ball, index) => {
            let result = "";

            if (ball.type === "wicket") {
                result = "WICKET";
            } else if (ball.type === "wide") {
                result = `WD +${ball.runs}`;
            } else if (ball.type === "noball") {
                result = `NB +${ball.runs}`;
            } else {
                result = String(ball.runs);
            }

            return `
                <div class="ball-history-item">
                    <span>
                        ${innings.ballsHistory.length - index}.
                    </span>

                    <strong>${result}</strong>
                </div>
            `;
        })
        .join("");
}


/* =========================================================
   RECORD LIVE BALL
   ========================================================= */

function recordLiveBall(runs, type = "normal") {
    const match =
        getMatchById(CurrentState.currentMatchId);

    if (!match) return;

    const innings =
        match.innings[LiveState.inningsIndex];

    if (!innings) return;

    if (innings.completed) {
        alert("This innings is already completed.");
        return;
    }

    if (innings.waitingForNewBatsman) {
        alert("Please select the new batsman first.");
        return;
    }

    if (!LiveState.strikerId) {
        alert("No striker selected.");
        return;
    }

    const numericRuns = Number(runs) || 0;

    const wasAtEndOfOver =
        type !== "wide" &&
        type !== "noball" &&
        ((innings.balls + 1) % 6 === 0);

    const ballRecord = {
        runs: numericRuns,
        type,
        strikerId: LiveState.strikerId,
        nonStrikerId: LiveState.nonStrikerId,
        bowlerId: LiveState.bowlerId,
        previousStrikerId: LiveState.strikerId,
        previousNonStrikerId: LiveState.nonStrikerId,
        previousBowlerId: LiveState.bowlerId,
        previousRuns: innings.runs,
        previousWickets: innings.wickets,
        previousBalls: innings.balls,
        previousTotalBalls: innings.totalBalls,
        previousOutPlayerIds: [
            ...innings.outPlayerIds
        ],
        previousWaitingForNewBatsman:
            innings.waitingForNewBatsman,
        previousPendingEndOfOverSwap:
            innings.pendingEndOfOverSwap
    };

    innings.runs += numericRuns;

    if (type === "wicket") {
        innings.wickets++;

        const dismissedPlayer =
            LiveState.strikerId;

        if (
            dismissedPlayer &&
            !innings.outPlayerIds.includes(
                dismissedPlayer
            )
        ) {
            innings.outPlayerIds.push(
                dismissedPlayer
            );
        }

        innings.waitingForNewBatsman = true;

        LiveState.pendingNewBatsman = true;

        if (wasAtEndOfOver) {
            innings.pendingEndOfOverSwap = true;
        }
    }

    if (
        type !== "wide" &&
        type !== "noball"
    ) {
        innings.balls++;
    }

    innings.totalBalls++;

    innings.ballsHistory.push(ballRecord);

    /*
       Odd runs change striker.
       Wide also changes striker.
       No-ball does not count as a legal ball.
    */

    if (
        type !== "wicket" &&
        (
            numericRuns % 2 === 1 ||
            type === "wide"
        )
    ) {
        swapLiveStrikers();
    }

    /*
       End of over.
    */

    if (
        wasAtEndOfOver &&
        type !== "wicket"
    ) {
        swapLiveStrikers();
    }

    /*
       Innings ends at maximum overs.
    */

    const maxBalls =
        match.overs * 6;

    if (innings.balls >= maxBalls) {
        innings.completed = true;
    }

    /*
       Innings ends at 10 wickets.
    */

    if (innings.wickets >= 10) {
        innings.completed = true;
        innings.waitingForNewBatsman = false;
        LiveState.pendingNewBatsman = false;
    }

    /*
       If wicket occurred and no batsman remains,
       complete the innings.
    */

    if (innings.waitingForNewBatsman) {
        const remaining =
            getEligibleNewBatsmen(
                match,
                innings
            );

        if (remaining.length === 0) {
            innings.completed = true;
            innings.waitingForNewBatsman = false;
            LiveState.pendingNewBatsman = false;
        }
    }

    saveData();

    renderLiveScoring();
}


/* =========================================================
   STRIKER SWAP
   ========================================================= */

function swapLiveStrikers() {
    const temp =
        LiveState.strikerId;

    LiveState.strikerId =
        LiveState.nonStrikerId;

    LiveState.nonStrikerId =
        temp;
}


/* =========================================================
   UNDO LAST BALL
   ========================================================= */

function undoLastLiveBall() {
    const match =
        getMatchById(CurrentState.currentMatchId);

    if (!match) return;

    const innings =
        match.innings[LiveState.inningsIndex];

    if (!innings) return;

    if (
        !Array.isArray(innings.ballsHistory) ||
        innings.ballsHistory.length === 0
    ) {
        alert("There is no ball to undo.");
        return;
    }

    const lastBall =
        innings.ballsHistory.pop();

    innings.runs =
        lastBall.previousRuns;

    innings.wickets =
        lastBall.previousWickets;

    innings.balls =
        lastBall.previousBalls;

    innings.totalBalls =
        lastBall.previousTotalBalls;

    innings.outPlayerIds =
        [...lastBall.previousOutPlayerIds];

    innings.waitingForNewBatsman =
        lastBall.previousWaitingForNewBatsman;

    innings.pendingEndOfOverSwap =
        lastBall.previousPendingEndOfOverSwap;

    innings.completed = false;

    LiveState.strikerId =
        lastBall.previousStrikerId;

    LiveState.nonStrikerId =
        lastBall.previousNonStrikerId;

    LiveState.bowlerId =
        lastBall.previousBowlerId;

    LiveState.pendingNewBatsman =
        innings.waitingForNewBatsman;

    saveData();

    renderLiveScoring();
}


/* =========================================================
   LIVE SCORING LISTENERS
   ========================================================= */

function attachLiveScoringListeners() {

    document.querySelectorAll(".run-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const runs =
                        parseInt(
                            button.dataset.runs,
                            10
                        );

                    recordLiveBall(
                        runs,
                        "normal"
                    );
                }
            );

        });


    const wicketButton =
        document.getElementById(
            "btn-wicket"
        );

    if (wicketButton) {
        wicketButton.addEventListener(
            "click",
            () => {
                recordLiveBall(
                    0,
                    "wicket"
                );
            }
        );
    }


    const wideButton =
        document.getElementById(
            "btn-wide"
        );

    if (wideButton) {
        wideButton.addEventListener(
            "click",
            () => {
                recordLiveBall(
                    1,
                    "wide"
                );
            }
        );
    }


    const noBallButton =
        document.getElementById(
            "btn-noball"
        );

    if (noBallButton) {
        noBallButton.addEventListener(
            "click",
            () => {
                recordLiveBall(
                    1,
                    "noball"
                );
            }
        );
    }


    const undoButton =
        document.getElementById(
            "btn-undo-live-ball"
        );

    if (undoButton) {
        undoButton.addEventListener(
            "click",
            undoLastLiveBall
        );
    }


    document.querySelectorAll(
        ".new-batsman-btn"
    ).forEach(button => {

        button.addEventListener(
            "click",
            () => {

                selectNewBatsman(
                    button.dataset.playerId
                );

            }
        );

    });
}


/* =========================================================
   INITIAL APP RENDERING
   ========================================================= */

function initializeApp() {

    loadData();

    setupEventListeners();

    renderTournamentList();

    /*
       Show home screen if available.
    */

    if (
        document.getElementById(
            "home-screen"
        )
    ) {
        showScreen("home-screen");
    }
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

    /*
       Create tournament
    */

    const createTournamentButton =
        document.getElementById(
           "btn-new-tournament" 
        );

    if (createTournamentButton) {

        createTournamentButton.addEventListener(
            "click",
            () => {

                const input =
                    document.getElementById(
                        "tournament-name"
                    );

                if (input) {
                    createTournament(
                        input.value
                    );
                }

            }
        );

    }


    /*
       Tournament name form
    */

    const tournamentForm =
        document.getElementById(
            "tournament-form"
        );

    if (tournamentForm) {

        tournamentForm.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                const input =
                    document.getElementById(
                        "tournament-name"
                    );

                if (input) {
                    createTournament(
                        input.value
                    );
                }

            }
        );

    }


    /*
       Add team
    */

    const addTeamButton =
        document.getElementById(
            "btn-add-team"
        );

    if (addTeamButton) {

        addTeamButton.addEventListener(
            "click",
            () => {

                const input =
                    document.getElementById(
                        "team-name"
                    );

                if (input) {

                    createTeam(
                        CurrentState.currentTournamentId,
                        input.value
                    );

                    input.value = "";
                }

            }
        );

    }


    /*
       Add player
    */

    const addPlayerButton =
        document.getElementById(
            "btn-add-player"
        );

    if (addPlayerButton) {

        addPlayerButton.addEventListener(
            "click",
            () => {

                const input =
                    document.getElementById(
                        "player-name"
                    );

                if (input) {

                    createPlayer(
                        CurrentState.currentTeamId,
                        input.value
                    );

                    input.value = "";
                }

            }
        );

    }


    /*
       Back buttons
    */
       /*
       View saved tournaments
    */

    const viewTournamentsButton =
        document.getElementById(
            "btn-view-tournaments"
        );

    if (viewTournamentsButton) {

        viewTournamentsButton.addEventListener(
            "click",
            () => {
                renderTournamentList();
                showScreen("tournaments-screen");
            }
        );

    }

    const backHome =
        document.getElementById(
            "btn-back-home"
        );

    if (backHome) {

        backHome.addEventListener(
            "click",
            () => {
                renderTournamentList();
                showScreen("home-screen");
            }
        );

    }


    const backTournament =
        document.getElementById(
            "btn-back-to-tournament"
        );

    if (backTournament) {

        backTournament.addEventListener(
            "click",
            () => {

                renderTournamentDashboard();

                showScreen(
                    "tournament-dashboard-screen"
                );

            }
        );

    }


    const backTeam =
        document.getElementById(
            "btn-back-to-team"
        );

    if (backTeam) {

        backTeam.addEventListener(
            "click",
            () => {

                renderTeamDetails();

                showScreen(
                    "team-details-screen"
                );

            }
        );

    }

}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);


/* =========================================================
   END VERSION 1.4 REBUILD
   ========================================================= */
