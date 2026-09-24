/* =========================================================
   LOCAL CRICKET SCORER
   VERSION 1.3
   LIVE BALL-BY-BALL SCORING
   ========================================================= */


/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY = "local_cricket_scorer_v1_2";


/* =========================================================
   APP DATA
   ========================================================= */

const AppData = {
    tournaments: [],
    teams: [],
    players: [],
    matches: []
};


/* =========================================================
   CURRENT STATE
   ========================================================= */

const CurrentState = {
    currentTeamId: null,
    currentMatchId: null
};


/* =========================================================
   LIVE SCORING STATE
   ========================================================= */

const LiveState = {
    inningsIndex: 0,
    strikerId: null,
    nonStrikerId: null,
    bowlerId: null,

    runs: 0,
    wickets: 0,

    legalBalls: 0,
    currentOverBalls: [],

    ballHistory: [],

    batsmen: {},
    bowlers: {},

    innings: []
};


/* =========================================================
   PAGE START
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    loadData();

    renderTournaments();
    renderTeams();
    renderMatches();

    populateMatchSetup();

    setupEnterKeys();
});


/* =========================================================
   SCREEN MANAGEMENT
   ========================================================= */

function showScreen(screenId) {

    const screens =
        document.querySelectorAll(".screen");

    screens.forEach(function (screen) {

        screen.classList.remove("active");

    });


    const selectedScreen =
        document.getElementById(screenId);


    if (selectedScreen) {

        selectedScreen.classList.add("active");

    }


    if (screenId === "tournamentScreen") {

        renderTournaments();

    }


    if (screenId === "teamScreen") {

        renderTeams();

    }


    if (screenId === "matchScreen") {

        renderMatches();

        populateMatchSetup();

    }


    if (screenId === "liveScoringScreen") {

        renderLiveScoring();

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   STORAGE FUNCTIONS
   ========================================================= */

function saveData() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(AppData)
    );
}


function loadData() {

    const savedData =
        localStorage.getItem(STORAGE_KEY);


    if (!savedData) {

        return;

    }


    try {

        const parsedData =
            JSON.parse(savedData);


        AppData.tournaments =
            Array.isArray(parsedData.tournaments)
                ? parsedData.tournaments
                : [];


        AppData.teams =
            Array.isArray(parsedData.teams)
                ? parsedData.teams
                : [];


        AppData.players =
            Array.isArray(parsedData.players)
                ? parsedData.players
                : [];


        AppData.matches =
            Array.isArray(parsedData.matches)
                ? parsedData.matches
                : [];


    } catch (error) {

        console.error(
            "Could not load saved data:",
            error
        );

    }
}


/* =========================================================
   ID GENERATOR
   ========================================================= */

function createId(prefix) {

    return (
        prefix +
        "_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 8)
    );
}


/* =========================================================
   TOURNAMENTS
   ========================================================= */

function addTournament() {

    const input =
        document.getElementById(
            "tournamentName"
        );


    if (!input) {

        return;

    }


    const name =
        input.value.trim();


    if (!name) {

        alert(
            "Please enter tournament name."
        );

        input.focus();

        return;

    }


    const tournament = {

        id: createId("tournament"),

        name: name,

        createdAt:
            new Date().toISOString()

    };


    AppData.tournaments.push(
        tournament
    );


    saveData();

    input.value = "";

    renderTournaments();

    populateMatchSetup();
}


function renderTournaments() {

    const container =
        document.getElementById(
            "tournamentList"
        );


    if (!container) {

        return;

    }


    if (AppData.tournaments.length === 0) {

        container.innerHTML =
            `
            <div class="empty-message">
                No tournaments yet.
            </div>
            `;

        return;

    }


    container.innerHTML =
        AppData.tournaments
            .map(function (tournament) {

                return `
                    <div class="list-item">

                        <h3>
                            🏆
                            ${escapeHTML(
                                tournament.name
                            )}
                        </h3>

                        <p>
                            Tournament
                        </p>

                        <div class="list-actions">

                            <button
                                class="small-btn delete-btn"
                                onclick="deleteTournament('${tournament.id}')">
                                Delete
                            </button>

                        </div>

                    </div>
                `;

            })
            .join("");
}


function deleteTournament(tournamentId) {

    const tournament =
        AppData.tournaments.find(
            function (item) {

                return item.id ===
                    tournamentId;

            }
        );


    if (!tournament) {

        return;

    }


    const confirmed =
        confirm(
            `Delete tournament "${tournament.name}"?`
        );


    if (!confirmed) {

        return;

    }


    AppData.tournaments =
        AppData.tournaments.filter(
            function (item) {

                return item.id !==
                    tournamentId;

            }
        );


    AppData.matches =
        AppData.matches.filter(
            function (match) {

                return match.tournamentId !==
                    tournamentId;

            }
        );


    saveData();

    renderTournaments();

    renderMatches();

    populateMatchSetup();
}


/* =========================================================
   TEAMS
   ========================================================= */

function addTeam() {

    const input =
        document.getElementById(
            "teamName"
        );


    if (!input) {

        return;

    }


    const name =
        input.value.trim();


    if (!name) {

        alert(
            "Please enter team name."
        );

        input.focus();

        return;

    }


    const team = {

        id: createId("team"),

        name: name,

        createdAt:
            new Date().toISOString()

    };


    AppData.teams.push(team);

    saveData();

    input.value = "";

    renderTeams();

    populateMatchSetup();
}


function renderTeams() {

    const container =
        document.getElementById(
            "teamList"
        );


    if (!container) {

        return;

    }


    if (AppData.teams.length === 0) {

        container.innerHTML =
            `
            <div class="empty-message">
                No teams yet.
            </div>
            `;

        return;

    }


    container.innerHTML =
        AppData.teams
            .map(function (team) {

                const playerCount =
                    AppData.players.filter(
                        function (player) {

                            return player.teamId ===
                                team.id;

                        }
                    ).length;


                return `
                    <div class="list-item">

                        <h3>
                            👥
                            ${escapeHTML(
                                team.name
                            )}
                        </h3>

                        <p>
                            ${playerCount} player(s)
                        </p>

                        <div class="list-actions">

                            <button
                                class="small-btn manage-btn"
                                onclick="openPlayers('${team.id}')">
                                Manage Players
                            </button>

                            <button
                                class="small-btn delete-btn"
                                onclick="deleteTeam('${team.id}')">
                                Delete
                            </button>

                        </div>

                    </div>
                `;

            })
            .join("");
}


function deleteTeam(teamId) {

    const team =
        AppData.teams.find(
            function (item) {

                return item.id ===
                    teamId;

            }
        );


    if (!team) {

        return;

    }


    const confirmed =
        confirm(
            `Delete team "${team.name}" and its players/matches?`
        );


    if (!confirmed) {

        return;

    }


    AppData.teams =
        AppData.teams.filter(
            function (item) {

                return item.id !==
                    teamId;

            }
        );


    AppData.players =
        AppData.players.filter(
            function (player) {

                return player.teamId !==
                    teamId;

            }
        );


    AppData.matches =
        AppData.matches.filter(
            function (match) {

                return (
                    match.teamAId !== teamId &&
                    match.teamBId !== teamId
                );

            }
        );


    saveData();

    renderTeams();

    renderMatches();

    populateMatchSetup();
}


/* =========================================================
   PLAYERS
   ========================================================= */

function openPlayers(teamId) {

    CurrentState.currentTeamId =
        teamId;


    const team =
        AppData.teams.find(
            function (item) {

                return item.id ===
                    teamId;

            }
        );


    if (!team) {

        return;

    }


    const info =
        document.getElementById(
            "selectedTeamInfo"
        );


    if (info) {

        info.innerHTML =
            `
            Managing players for:
            <strong>
                ${escapeHTML(team.name)}
            </strong>
            `;

    }


    renderPlayers();

    showScreen("playerScreen");
}


function addPlayer() {

    const input =
        document.getElementById(
            "playerName"
        );


    if (!input) {

        return;

    }


    const name =
        input.value.trim();


    if (!name) {

        alert(
            "Please enter player name."
        );

        input.focus();

        return;

    }


    if (!CurrentState.currentTeamId) {

        alert(
            "Please select a team first."
        );

        return;

    }


    const player = {

        id: createId("player"),

        teamId:
            CurrentState.currentTeamId,

        name: name,

        createdAt:
            new Date().toISOString()

    };


    AppData.players.push(player);

    saveData();

    input.value = "";

    renderPlayers();

    renderTeams();
}


function renderPlayers() {

    const container =
        document.getElementById(
            "playerList"
        );


    if (!container) {

        return;

    }


    const players =
        AppData.players.filter(
            function (player) {

                return player.teamId ===
                    CurrentState.currentTeamId;

            }
        );


    if (players.length === 0) {

        container.innerHTML =
            `
            <div class="empty-message">
                No players yet.
            </div>
            `;

        return;

    }


    container.innerHTML =
        players
            .map(function (player) {

                return `
                    <div class="list-item">

                        <h3>
                            🏏
                            ${escapeHTML(
                                player.name
                            )}
                        </h3>

                        <p>
                            Player
                        </p>

                        <div class="list-actions">

                            <button
                                class="small-btn delete-btn"
                                onclick="deletePlayer('${player.id}')">
                                Delete
                            </button>

                        </div>

                    </div>
                `;

            })
            .join("");
}


function deletePlayer(playerId) {

    const player =
        AppData.players.find(
            function (item) {

                return item.id ===
                    playerId;

            }
        );


    if (!player) {

        return;

    }


    const confirmed =
        confirm(
            `Delete player "${player.name}"?`
        );


    if (!confirmed) {

        return;

    }


    AppData.players =
        AppData.players.filter(
            function (item) {

                return item.id !==
                    playerId;

            }
        );


    saveData();

    renderPlayers();

    renderTeams();
}


/* =========================================================
   MATCH SETUP
   ========================================================= */

function populateMatchSetup() {

    populateTournamentSelect();

    populateTeamSelects();
}


function populateTournamentSelect() {

    const select =
        document.getElementById(
            "matchTournament"
        );


    if (!select) {

        return;

    }


    const currentValue =
        select.value;


    select.innerHTML =
        `
        <option value="">
            Select Tournament
        </option>
        `;


    AppData.tournaments.forEach(
        function (tournament) {

            select.innerHTML +=
                `
                <option value="${tournament.id}">
                    ${escapeHTML(
                        tournament.name
                    )}
                </option>
                `;

        }
    );


    if (
        AppData.tournaments.some(
            function (item) {

                return item.id ===
                    currentValue;

            }
        )
    ) {

        select.value =
            currentValue;

    }
}


function populateTeamSelects() {

    const teamA =
        document.getElementById(
            "teamA"
        );

    const teamB =
        document.getElementById(
            "teamB"
        );


    if (!teamA || !teamB) {

        return;

    }


    const currentA =
        teamA.value;

    const currentB =
        teamB.value;


    const options =
        AppData.teams
            .map(function (team) {

                return `
                    <option value="${team.id}">
                        ${escapeHTML(
                            team.name
                        )}
                    </option>
                `;

            })
            .join("");


    teamA.innerHTML =
        `
        <option value="">
            Select Team A
        </option>
        ` +
        options;


    teamB.innerHTML =
        `
        <option value="">
            Select Team B
        </option>
        ` +
        options;


    if (
        AppData.teams.some(
            function (item) {

                return item.id ===
                    currentA;

            }
        )
    ) {

        teamA.value =
            currentA;

    }


    if (
        AppData.teams.some(
            function (item) {

                return item.id ===
                    currentB;

            }
        )
    ) {

        teamB.value =
            currentB;

    }
}


/* =========================================================
   CREATE MATCH
   ========================================================= */

function createMatch() {

    const tournamentElement =
        document.getElementById(
            "matchTournament"
        );

    const teamAElement =
        document.getElementById(
            "teamA"
        );

    const teamBElement =
        document.getElementById(
            "teamB"
        );

    const oversElement =
        document.getElementById(
            "matchOvers"
        );

    const dateElement =
        document.getElementById(
            "matchDate"
        );

    const tossWinnerElement =
        document.getElementById(
            "tossWinner"
        );

    const tossDecisionElement =
        document.getElementById(
            "tossDecision"
        );


    if (
        !tournamentElement ||
        !teamAElement ||
        !teamBElement ||
        !oversElement ||
        !dateElement ||
        !tossWinnerElement ||
        !tossDecisionElement
    ) {

        alert(
            "Match setup fields are missing."
        );

        return;

    }


    const tournamentId =
        tournamentElement.value;

    const teamAId =
        teamAElement.value;

    const teamBId =
        teamBElement.value;

    const overs =
        Number(oversElement.value);

    const date =
        dateElement.value;

    const tossWinner =
        tossWinnerElement.value;

    const tossDecision =
        tossDecisionElement.value;


    if (!tournamentId) {

        alert(
            "Please select a tournament."
        );

        return;

    }


    if (!teamAId || !teamBId) {

        alert(
            "Please select both teams."
        );

        return;

    }


    if (teamAId === teamBId) {

        alert(
            "Team A and Team B must be different."
        );

        return;

    }


    if (
        !Number.isInteger(overs) ||
        overs < 1 ||
        overs > 50
    ) {

        alert(
            "Overs must be between 1 and 50."
        );

        return;

    }


    if (!date) {

        alert(
            "Please select match date."
        );

        return;

    }


    if (!tossWinner || !tossDecision) {

        alert(
            "Please complete the toss information."
        );

        return;

    }


    let battingFirstId;

    let bowlingFirstId;


    if (tossWinner === "teamA") {

        if (tossDecision === "bat") {

            battingFirstId =
                teamAId;

            bowlingFirstId =
                teamBId;

        } else {

            battingFirstId =
                teamBId;

            bowlingFirstId =
                teamAId;

        }

    } else {

        if (tossDecision === "bat") {

            battingFirstId =
                teamBId;

            bowlingFirstId =
                teamAId;

        } else {

            battingFirstId =
                teamAId;

            bowlingFirstId =
                teamBId;

        }

    }


    const match = {

        id: createId("match"),

        tournamentId:
            tournamentId,

        teamAId:
            teamAId,

        teamBId:
            teamBId,

        overs:
            overs,

        date:
            date,

        tossWinner:
            tossWinner,

        tossDecision:
            tossDecision,

        battingFirstId:
            battingFirstId,

        bowlingFirstId:
            bowlingFirstId,

        status:
            "Not Started",

        createdAt:
            new Date().toISOString(),

        innings: []

    };


    AppData.matches.push(match);

    saveData();

    renderMatches();

    alert(
        "Match created successfully."
    );
}


/* =========================================================
   MATCH LIST
   ========================================================= */

function renderMatches() {

    const container =
        document.getElementById(
            "matchList"
        );


    if (!container) {

        return;

    }


    if (AppData.matches.length === 0) {

        container.innerHTML =
            `
            <div class="empty-message">
                No matches yet.
            </div>
            `;

        return;

    }


    container.innerHTML =
        AppData.matches
            .map(function (match) {

                const teamA =
                    getTeamName(
                        match.teamAId
                    );

                const teamB =
                    getTeamName(
                        match.teamBId
                    );

                const tournament =
                    getTournamentName(
                        match.tournamentId
                    );

                const battingFirst =
                    getTeamName(
                        match.battingFirstId
                    );

                const canStart =
                    hasEnoughPlayersForMatch(
                        match
                    );


                let scoringButton = "";


                if (
                    match.status ===
                    "Completed"
                ) {

                    scoringButton =
                        `
                        <button
                            class="small-btn manage-btn"
                            onclick="openLiveScoring('${match.id}')">
                            View Score
                        </button>
                        `;

                } else if (canStart) {

                    scoringButton =
                        `
                        <button
                            class="small-btn manage-btn"
                            onclick="openLiveScoring('${match.id}')">
                            ${
                                match.status === "Live"
                                    ? "Continue Scoring"
                                    : "Start Scoring"
                            }
                        </button>
                        `;

                } else {

                    scoringButton =
                        `
                        <button
                            class="small-btn manage-btn"
                            onclick="showPlayerRequirement()">
                            Add Players
                        </button>
                        `;

                }


                return `
                    <div class="list-item">

                        <h3>
                            🏏
                            ${escapeHTML(teamA)}
                            vs
                            ${escapeHTML(teamB)}
                        </h3>

                        <p>
                            Tournament:
                            ${escapeHTML(tournament)}
                        </p>

                        <p>
                            Date:
                            ${escapeHTML(match.date)}
                        </p>

                        <p>
                            Overs:
                            ${match.overs}
                        </p>

                        <p>
                            Toss:
                            ${escapeHTML(
                                getTossTeamName(match)
                            )}
                            —
                            ${
                                match.tossDecision === "bat"
                                    ? "Bat First"
                                    : "Bowl First"
                            }
                        </p>

                        <p>
                            Batting First:
                            <strong>
                                ${escapeHTML(
                                    battingFirst
                                )}
                            </strong>
                        </p>

                        <p>
                            Status:
                            <strong>
                                ${escapeHTML(
                                    match.status ||
                                    "Not Started"
                                )}
                            </strong>
                        </p>

                        <div class="list-actions">

                            ${scoringButton}

                            <button
                                class="small-btn delete-btn"
                                onclick="deleteMatch('${match.id}')">
                                Delete
                            </button>

                        </div>

                    </div>
                `;

            })
            .join("");
}


function hasEnoughPlayersForMatch(match) {

    const battingPlayers =
        AppData.players.filter(
            function (player) {

                return player.teamId ===
                    match.battingFirstId;

            }
        );


    const bowlingPlayers =
        AppData.players.filter(
            function (player) {

                return player.teamId ===
                    match.bowlingFirstId;

            }
        );


    return (
        battingPlayers.length >= 2 &&
        bowlingPlayers.length >= 1
    );
}


function showPlayerRequirement() {

    alert(
        "Before starting the match, add at least 2 players to the batting team and at least 1 player to the bowling team."
    );
}


function deleteMatch(matchId) {

    const match =
        AppData.matches.find(
            function (item) {

                return item.id ===
                    matchId;

            }
        );


    if (!match) {

        return;

    }


    const confirmed =
        confirm(
            "Delete this match?"
        );


    if (!confirmed) {

        return;

    }


    AppData.matches =
        AppData.matches.filter(
            function (item) {

                return item.id !==
                    matchId;

            }
        );


    saveData();

    renderMatches();
}


function getTossTeamName(match) {

    if (
        match.tossWinner ===
        "teamA"
    ) {

        return getTeamName(
            match.teamAId
        );

    }


    if (
        match.tossWinner ===
        "teamB"
    ) {

        return getTeamName(
            match.teamBId
        );

    }


    return "Unknown";
}


/* =========================================================
   OPEN LIVE SCORING
   ========================================================= */

function openLiveScoring(matchId) {

    const match =
        AppData.matches.find(
            function (item) {

                return item.id ===
                    matchId;

            }
        );


    if (!match) {

        alert(
            "Match not found."
        );

        return;

    }


    CurrentState.currentMatchId =
        matchId;


    if (
        !match.liveState ||
        !match.liveState.initialized
    ) {

        const started =
            initializeLiveMatch(
                match
            );


        if (!started) {

            return;

        }

    } else {

        restoreLiveState(
            match
        );

    }


    match.status =
        "Live";


    saveLiveStateToMatch(
        match
    );

    saveData();

    renderMatches();

    showScreen(
        "liveScoringScreen"
    );

    renderLiveScoring();
}


/* =========================================================
   INITIALIZE LIVE MATCH
   ========================================================= */

function initializeLiveMatch(match) {

    const battingPlayers =
        AppData.players.filter(
            function (player) {

                return player.teamId ===
                    match.battingFirstId;

            }
        );


    const bowlingPlayers =
        AppData.players.filter(
            function (player) {

                return player.teamId ===
                    match.bowlingFirstId;

            }
        );


    if (battingPlayers.length < 2) {

        alert(
            "The batting team needs at least 2 players."
        );

        return false;

    }


    if (bowlingPlayers.length < 1) {

        alert(
            "The bowling team needs at least 1 player."
        );

        return false;

    }


    resetLiveState();


    LiveState.strikerId =
        battingPlayers[0].id;


    LiveState.nonStrikerId =
        battingPlayers[1].id;


    LiveState.bowlerId =
        bowlingPlayers[0].id;


    LiveState.batsmen[
        battingPlayers[0].id
    ] = {

        runs: 0,

        balls: 0,

        out: false

    };


    LiveState.batsmen[
        battingPlayers[1].id
    ] = {

        runs: 0,

        balls: 0,

        out: false

    };


    LiveState.bowlers[
        bowlingPlayers[0].id
    ] = {

        runs: 0,

        wickets: 0,

        legalBalls: 0

    };


    LiveState.innings = [
        createNewInnings(
            match.battingFirstId,
            match.bowlingFirstId
        )
    ];


    saveLiveStateToMatch(
        match
    );

    return true;
}


function createNewInnings(
    battingTeamId,
    bowlingTeamId
) {

    return {

        battingTeamId:
            battingTeamId,

        bowlingTeamId:
            bowlingTeamId,

        runs: 0,

        wickets: 0,

        legalBalls: 0,

        balls: []

    };
}


function resetLiveState() {

    LiveState.inningsIndex =
        0;

    LiveState.strikerId =
        null;

    LiveState.nonStrikerId =
        null;

    LiveState.bowlerId =
        null;

    LiveState.runs =
        0;

    LiveState.wickets =
        0;

    LiveState.legalBalls =
        0;

    LiveState.currentOverBalls =
        [];

    LiveState.ballHistory =
        [];

    LiveState.batsmen =
        {};

    LiveState.bowlers =
        {};

    LiveState.innings =
        [];
}


/* =========================================================
   RESTORE LIVE STATE
   ========================================================= */

function restoreLiveState(match) {

    const saved =
        match.liveState;


    if (!saved) {

        return;

    }


    LiveState.inningsIndex =
        saved.inningsIndex || 0;


    LiveState.strikerId =
        saved.strikerId || null;


    LiveState.nonStrikerId =
        saved.nonStrikerId || null;


    LiveState.bowlerId =
        saved.bowlerId || null;


    LiveState.runs =
        saved.runs || 0;


    LiveState.wickets =
        saved.wickets || 0;


    LiveState.legalBalls =
        saved.legalBalls || 0;


    LiveState.currentOverBalls =
        Array.isArray(
            saved.currentOverBalls
        )
            ? saved.currentOverBalls
            : [];


    LiveState.ballHistory =
        Array.isArray(
            saved.ballHistory
        )
            ? saved.ballHistory
            : [];


    LiveState.batsmen =
        saved.batsmen || {};


    LiveState.bowlers =
        saved.bowlers || {};


    LiveState.innings =
        Array.isArray(
            saved.innings
        )
            ? saved.innings
            : [];
}


/* =========================================================
   SAVE LIVE STATE
   ========================================================= */

function saveLiveStateToMatch(match) {

    match.liveState = {

        initialized:
            true,

        inningsIndex:
            LiveState.inningsIndex,

        strikerId:
            LiveState.strikerId,

        nonStrikerId:
            LiveState.nonStrikerId,

        bowlerId:
            LiveState.bowlerId,

        runs:
            LiveState.runs,

        wickets:
            LiveState.wickets,

        legalBalls:
            LiveState.legalBalls,

        currentOverBalls:
            LiveState.currentOverBalls,

        ballHistory:
            LiveState.ballHistory,

        batsmen:
            LiveState.batsmen,

        bowlers:
            LiveState.bowlers,

        innings:
            LiveState.innings
    };
}


/* =========================================================
   RECORD LIVE BALL
   ========================================================= */

function recordLiveBall(
    type,
    value
) {

    const match =
        getCurrentMatch();


    if (!match) {

        alert(
            "No active match."
        );

        return;

    }


    if (
        match.status ===
        "Completed"
    ) {

        alert(
            "This match is already completed."
        );

        return;

    }


    const striker =
        getPlayerById(
            LiveState.strikerId
        );


    const nonStriker =
        getPlayerById(
            LiveState.nonStrikerId
        );


    const bowler =
        getPlayerById(
            LiveState.bowlerId
        );


    if (
        !striker ||
        !nonStriker ||
        !bowler
    ) {

        alert(
            "Player information is missing."
        );

        return;

    }


    const snapshot =
        createLiveSnapshot();


    let totalRuns = 0;

    let legalBall = true;

    let batsmanRuns = 0;

    let wicket = false;


    /* =========================
       NORMAL RUN
       ========================= */

    if (type === "run") {

        totalRuns =
            Number(value);

        batsmanRuns =
            Number(value);

        legalBall =
            true;

    }


    /* =========================
       WIDE
       ========================= */

    else if (type === "wide") {

        totalRuns =
            Number(value);

        batsmanRuns =
            0;

        legalBall =
            false;

    }


    /* =========================
       NO BALL
       ========================= */

    else if (type === "noball") {

        totalRuns =
            Number(value);

        batsmanRuns =
            0;

        legalBall =
            false;

    }


    /* =========================
       BYE
       ========================= */

    else if (type === "bye") {

        totalRuns =
            Number(value);

        batsmanRuns =
            0;

        legalBall =
            true;

    }


    /* =========================
       LEG BYE
       ========================= */

    else if (type === "legbye") {

        totalRuns =
            Number(value);

        batsmanRuns =
            0;

        legalBall =
            true;

    }


    /* =========================
       WICKET
       ========================= */

    else if (type === "wicket") {

        totalRuns =
            0;

        batsmanRuns =
            0;

        legalBall =
            true;

        wicket =
            true;

    }


    else {

        return;

    }


    /* =====================================================
       VALIDATE RUN VALUE
       ===================================================== */

    if (
        !Number.isFinite(totalRuns) ||
        totalRuns < 0
    ) {

        return;

    }


    /* =====================================================
       BATSMAN
       ===================================================== */

    ensureBatsmanRecord(
        striker.id
    );


    LiveState.batsmen[
        striker.id
    ].balls +=
        legalBall ? 1 : 0;


    LiveState.batsmen[
        striker.id
    ].runs +=
        batsmanRuns;


    /* =====================================================
       TOTAL SCORE
       ===================================================== */

    LiveState.runs +=
        totalRuns;


    /* =====================================================
       WICKET
       ===================================================== */

    if (wicket) {

        LiveState.wickets++;

        LiveState.batsmen[
            striker.id
        ].out = true;

    }


    /* =====================================================
       BOWLER
       ===================================================== */

    ensureBowlerRecord(
        bowler.id
    );


    LiveState.bowlers[
        bowler.id
    ].runs +=
        totalRuns;


    if (wicket) {

        LiveState.bowlers[
            bowler.id
        ].wickets++;

    }


    /* =====================================================
       LEGAL BALL
       ===================================================== */

    if (legalBall) {

        LiveState.legalBalls++;


        LiveState.bowlers[
            bowler.id
        ].legalBalls++;

    }


    /* =====================================================
       BALL OBJECT
       ===================================================== */

    const ball = {

        id:
            createId("ball"),

        type:
            type,

        value:
            Number(value),

        totalRuns:
            totalRuns,

        batsmanRuns:
            batsmanRuns,

        legalBall:
            legalBall,

        wicket:
            wicket,

        strikerId:
            striker.id,

        nonStrikerId:
            nonStriker.id,

        bowlerId:
            bowler.id,

        overNumber:
            Math.floor(
                (
                    LiveState.legalBalls - 1
                ) / 6
            ),

        createdAt:
            new Date().toISOString()
    };


    LiveState.currentOverBalls.push(
        ball
    );


    LiveState.ballHistory.push({

        ball:
            ball,

        snapshot:
            snapshot

    });


    /* =====================================================
       CURRENT INNINGS
       ===================================================== */

    const innings =
        getCurrentInnings();


    if (innings) {

        innings.runs =
            LiveState.runs;

        innings.wickets =
            LiveState.wickets;

        innings.legalBalls =
            LiveState.legalBalls;

        innings.balls.push(
            ball
        );

    }


    /* =====================================================
       STRIKE ROTATION
       ===================================================== */

    if (
        legalBall &&
        !wicket &&
        batsmanRuns % 2 === 1
    ) {

        swapStrikers();

    }


    /* =====================================================
       WICKET — NEW BATTER
       ===================================================== */

    if (wicket) {

        replaceStriker();

    }


    /* =====================================================
       OVER COMPLETE
       ===================================================== */

    if (
        legalBall &&
        LiveState.legalBalls % 6 === 0
    ) {

        completeOver();

    }


    /* =====================================================
       MATCH COMPLETION
       ===================================================== */

    if (
        checkInningsCompletion(
            match
        )
    ) {

        match.status =
            "Completed";

    }


    saveLiveStateToMatch(
        match
    );

    saveData();

    renderLiveScoring();

    renderMatches();
}


/* =========================================================
   SNAPSHOT FOR UNDO
   ========================================================= */

function createLiveSnapshot() {

    return JSON.parse(
        JSON.stringify({

            inningsIndex:
                LiveState.inningsIndex,

            strikerId:
                LiveState.strikerId,

            nonStrikerId:
                LiveState.nonStrikerId,

            bowlerId:
                LiveState.bowlerId,

            runs:
                LiveState.runs,

            wickets:
                LiveState.wickets,

            legalBalls:
                LiveState.legalBalls,

            currentOverBalls:
                LiveState.currentOverBalls,

            batsmen:
                LiveState.batsmen,

            bowlers:
                LiveState.bowlers,

            innings:
                LiveState.innings

        })
    );
}


/* =========================================================
   UNDO LAST BALL
   ========================================================= */

function undoLastLiveBall() {

    if (
        LiveState.ballHistory.length ===
        0
    ) {

        alert(
            "There is no ball to undo."
        );

        return;

    }


    const last =
        LiveState.ballHistory[
            LiveState.ballHistory.length - 1
        ];


    const confirmed =
        confirm(
            "Undo the last ball?"
        );


    if (!confirmed) {

        return;

    }


    const snapshot =
        last.snapshot;


    LiveState.inningsIndex =
        snapshot.inningsIndex;


    LiveState.strikerId =
        snapshot.strikerId;


    LiveState.nonStrikerId =
        snapshot.nonStrikerId;


    LiveState.bowlerId =
        snapshot.bowlerId;


    LiveState.runs =
        snapshot.runs;


    LiveState.wickets =
        snapshot.wickets;


    LiveState.legalBalls =
        snapshot.legalBalls;


    LiveState.currentOverBalls =
        snapshot.currentOverBalls;


    LiveState.batsmen =
        snapshot.batsmen;


    LiveState.bowlers =
        snapshot.bowlers;


    LiveState.innings =
        snapshot.innings;


    LiveState.ballHistory.pop();


    const match =
        getCurrentMatch();


    if (match) {

        match.status =
            "Live";

        saveLiveStateToMatch(
            match
        );

        saveData();

    }


    renderLiveScoring();

    renderMatches();
}


/* =========================================================
   BATSMAN HELPERS
   ========================================================= */

function ensureBatsmanRecord(
    playerId
) {

    if (
        !LiveState.batsmen[playerId]
    ) {

        LiveState.batsmen[playerId] = {

            runs: 0,

            balls: 0,

            out: false

        };

    }
}


function replaceStriker() {

    const match =
        getCurrentMatch();


    if (!match) {

        return;

    }


    const battingPlayers =
        AppData.players.filter(
            function (player) {

                return player.teamId ===
                    match.battingFirstId;

            }
        );


    const usedIds =
        Object.keys(
            LiveState.batsmen
        );


    const nextPlayer =
        battingPlayers.find(
            function (player) {

                return (
                    !usedIds.includes(
                        player.id
                    ) &&
                    player.id !==
                        LiveState.nonStrikerId
                );

            }
        );


    if (nextPlayer) {

        LiveState.strikerId =
            nextPlayer.id;


        ensureBatsmanRecord(
            nextPlayer.id
        );


        return;

    }


    /*
       No more players.
       The innings will end.
    */

    LiveState.strikerId =
        null;
}


/* =========================================================
   STRIKE
   ========================================================= */

function swapStrikers() {

    const temporary =
        LiveState.strikerId;


    LiveState.strikerId =
        LiveState.nonStrikerId;


    LiveState.nonStrikerId =
        temporary;
}


/* =========================================================
   OVER COMPLETION
   ========================================================= */

function completeOver() {

    /*
       At the end of an over,
       batsmen change ends.
    */

    swapStrikers();


    /*
       Start a fresh over display.
    */

    LiveState.currentOverBalls =
        [];


    /*
       Version 1.3 keeps the
       same bowler for now.
    */
}


/* =========================================================
   BOWLER HELPERS
   ========================================================= */

function ensureBowlerRecord(
    playerId
) {

    if (
        !LiveState.bowlers[playerId]
    ) {

        LiveState.bowlers[playerId] = {

            runs: 0,

            wickets: 0,

            legalBalls: 0

        };

    }
}


/* =========================================================
   INNINGS COMPLETION
   ========================================================= */

function checkInningsCompletion(
    match
) {

    if (!match) {

        return false;

    }


    const maximumBalls =
        Number(match.overs) * 6;


    /* =========================
       OVER LIMIT
       ========================= */

    if (
        LiveState.legalBalls >=
        maximumBalls
    ) {

        return true;

    }


    /* =========================
       ALL OUT
       ========================= */

    if (
        LiveState.wickets >=
        getBattingPlayerCount(match) - 1
    ) {

        return true;

    }


    /* =========================
       NO BATTER LEFT
       ========================= */

    if (
        !LiveState.strikerId
    ) {

        return true;

    }


    return false;
}


function getBattingPlayerCount(
    match
) {

    return AppData.players.filter(
        function (player) {

            return player.teamId ===
                match.battingFirstId;

        }
    ).length;
}


/* =========================================================
   RENDER LIVE SCORING
   ========================================================= */

function renderLiveScoring() {

    const match =
        getCurrentMatch();


    if (!match) {

        return;

    }


    const battingTeam =
        getTeamName(
            match.battingFirstId
        );


    const bowlingTeam =
        getTeamName(
            match.bowlingFirstId
        );


    setText(
        "liveMatchTitle",
        `${battingTeam} vs ${bowlingTeam}`
    );


    setText(
        "liveBattingTeam",
        battingTeam
    );


    setText(
        "liveBowlingTeam",
        bowlingTeam
    );


    setText(
        "liveRuns",
        LiveState.runs
    );


    setText(
        "liveWickets",
        LiveState.wickets
    );


    setText(
        "liveOvers",
        formatOvers(
            LiveState.legalBalls
        )
    );


    setText(
        "liveRunRate",
        calculateRunRate()
    );


    setText(
        "liveTarget",
        "—"
    );


    renderCurrentOver();

    renderBatsmen();

    renderBowler();
}


/* =========================================================
   CURRENT OVER
   ========================================================= */

function renderCurrentOver() {

    const container =
        document.getElementById(
            "currentOverBalls"
        );


    if (!container) {

        return;

    }


    if (
        LiveState.currentOverBalls.length ===
        0
    ) {

        container.innerHTML =
            `
            <span class="ball-placeholder">
                No balls yet
            </span>
            `;

        return;

    }


    container.innerHTML =
        LiveState.currentOverBalls
            .map(function (ball) {

                let text = "";

                let className =
                    "ball";


                if (ball.wicket) {

                    text =
                        "W";

                    className +=
                        " wicket-ball";

                }


                else if (
                    ball.type ===
                    "wide"
                ) {

                    text =
                        "Wd";

                    className +=
                        " extra-ball";

                }


                else if (
                    ball.type ===
                    "noball"
                ) {

                    text =
                        "Nb";

                    className +=
                        " extra-ball";

                }


                else if (
                    ball.type ===
                    "bye"
                ) {

                    text =
                        "B" +
                        ball.totalRuns;

                    className +=
                        " extra-ball";

                }


                else if (
                    ball.type ===
                    "legbye"
                ) {

                    text =
                        "Lb" +
                        ball.totalRuns;

                    className +=
                        " extra-ball";

                }


                else {

                    text =
                        String(
                            ball.batsmanRuns
                        );

                }


                return `
                    <span class="${className}">
                        ${text}
                    </span>
                `;

            })
            .join("");
}


/* =========================================================
   BATSMEN DISPLAY
   ========================================================= */

function renderBatsmen() {

    const striker =
        getPlayerById(
            LiveState.strikerId
        );


    const nonStriker =
        getPlayerById(
            LiveState.nonStrikerId
        );


    /* =========================
       STRIKER
       ========================= */

    if (striker) {

        const stats =
            LiveState.batsmen[
                striker.id
            ] || {

                runs: 0,

                balls: 0

            };


        setText(
            "strikerName",
            striker.name
        );


        setText(
            "strikerRuns",
            stats.runs
        );


        setText(
            "strikerBalls",
            stats.balls
        );


    } else {

        setText(
            "strikerName",
            "No Batter"
        );


        setText(
            "strikerRuns",
            "0"
        );


        setText(
            "strikerBalls",
            "0"
        );

    }


    /* =========================
       NON-STRIKER
       ========================= */

    if (nonStriker) {

        const stats =
            LiveState.batsmen[
                nonStriker.id
            ] || {

                runs: 0,

                balls: 0

            };


        setText(
            "nonStrikerName",
            nonStriker.name
        );


        setText(
            "nonStrikerRuns",
            stats.runs
        );


        setText(
            "nonStrikerBalls",
            stats.balls
        );


    } else {

        setText(
            "nonStrikerName",
            "No Batter"
        );


        setText(
            "nonStrikerRuns",
            "0"
        );


        setText(
            "nonStrikerBalls",
            "0"
        );

    }
}


/* =========================================================
   BOWLER DISPLAY
   ========================================================= */

function renderBowler() {

    const bowler =
        getPlayerById(
            LiveState.bowlerId
        );


    if (!bowler) {

        setText(
            "currentBowlerName",
            "No Bowler"
        );


        setText(
            "bowlerOvers",
            "0.0"
        );


        setText(
            "bowlerRuns",
            "0"
        );


        setText(
            "bowlerWickets",
            "0"
        );


        return;

    }


    const stats =
        LiveState.bowlers[
            bowler.id
        ] || {

            runs: 0,

            wickets: 0,

            legalBalls: 0

        };


    setText(
        "currentBowlerName",
        bowler.name
    );


    setText(
        "bowlerOvers",
        formatOvers(
            stats.legalBalls
        )
    );


    setText(
        "bowlerRuns",
        stats.runs
    );


    setText(
        "bowlerWickets",
        stats.wickets
    );
}


/* =========================================================
   RUN RATE
   ========================================================= */

function calculateRunRate() {

    if (
        LiveState.legalBalls ===
        0
    ) {

        return "0.00";

    }


    const overs =
        LiveState.legalBalls / 6;


    const rate =
        LiveState.runs /
        overs;


    return rate.toFixed(2);
}


/* =========================================================
   OVERS FORMAT
   ========================================================= */

function formatOvers(
    legalBalls
) {

    const overs =
        Math.floor(
            legalBalls / 6
        );


    const balls =
        legalBalls % 6;


    return `${overs}.${balls}`;
}


/* =========================================================
   CURRENT MATCH / INNINGS
   ========================================================= */

function getCurrentMatch() {

    if (
        !CurrentState.currentMatchId
    ) {

        return null;

    }


    return AppData.matches.find(
        function (match) {

            return match.id ===
                CurrentState.currentMatchId;

        }
    ) || null;
}


function getCurrentInnings() {

    return (
        LiveState.innings[
            LiveState.inningsIndex
        ] || null
    );
}


/* =========================================================
   LOOKUP HELPERS
   ========================================================= */

function getTeamName(teamId) {

    const team =
        AppData.teams.find(
            function (item) {

                return item.id ===
                    teamId;

            }
        );


    return team
        ? team.name
        : "Unknown Team";
}


function getTournamentName(
    tournamentId
) {

    const tournament =
        AppData.tournaments.find(
            function (item) {

                return item.id ===
                    tournamentId;

            }
        );


    return tournament
        ? tournament.name
        : "Unknown Tournament";
}


function getPlayerById(
    playerId
) {

    if (!playerId) {

        return null;

    }


    return AppData.players.find(
        function (player) {

            return player.id ===
                playerId;

        }
    ) || null;
}


/* =========================================================
   TEXT HELPER
   ========================================================= */

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            String(value);

    }
}


/* =========================================================
   HTML SECURITY
   ========================================================= */

function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   ENTER KEY SUPPORT
   ========================================================= */

function setupEnterKeys() {

    const tournamentInput =
        document.getElementById(
            "tournamentName"
        );


    if (tournamentInput) {

        tournamentInput.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    addTournament();

                }

            }
        );

    }


    const teamInput =
        document.getElementById(
            "teamName"
        );


    if (teamInput) {

        teamInput.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    addTeam();

                }

            }
        );

    }


    const playerInput =
        document.getElementById(
            "playerName"
        );


    if (playerInput) {

        playerInput.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    addPlayer();

                }

            }
        );

    }
}
