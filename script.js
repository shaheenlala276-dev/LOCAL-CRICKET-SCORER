
/* =========================================================
LOCAL CRICKET SCORER — VERSION 1.1
SCRIPT.JS
Tournament + Team + Player Management
========================================================= */

/* =========================================================
DATA
========================================================= */

const STORAGE_KEY = "local_cricket_scorer_v1_1";

const AppData = {
tournaments: [],
teams: [],
players: []
};

/* =========================================================
CURRENT STATE
========================================================= */

const CurrentState = {
currentTeamId: null
};

/* =========================================================
START APP
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

loadData();

renderTournaments();
renderTeams();

});

/* =========================================================
SCREEN NAVIGATION
========================================================= */

function showScreen(screenId) {

const screens = document.querySelectorAll(".screen");

screens.forEach(function (screen) {
    screen.classList.remove("active");
});

const selectedScreen = document.getElementById(screenId);

if (selectedScreen) {
    selectedScreen.classList.add("active");
}

window.scrollTo({
    top: 0,
    behavior: "smooth"
});

if (screenId === "tournamentScreen") {
    renderTournaments();
}

if (screenId === "teamScreen") {
    renderTeams();
}

if (screenId === "playerScreen") {
    renderPlayers();
}

}

/* =========================================================
STORAGE
========================================================= */

function saveData() {

localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(AppData)
);

}

function loadData() {

const savedData = localStorage.getItem(STORAGE_KEY);

if (!savedData) {
    return;
}

try {

    const parsedData = JSON.parse(savedData);

    AppData.tournaments = Array.isArray(parsedData.tournaments)
        ? parsedData.tournaments
        : [];

    AppData.teams = Array.isArray(parsedData.teams)
        ? parsedData.teams
        : [];

    AppData.players = Array.isArray(parsedData.players)
        ? parsedData.players
        : [];

} catch (error) {

    console.error("Could not load saved data:", error);

    AppData.tournaments = [];
    AppData.teams = [];
    AppData.players = [];
}

}

/* =========================================================
ID GENERATOR
========================================================= */

function createId(prefix) {

return prefix + "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).substring(2, 8);

}

/* =========================================================
TOURNAMENTS
========================================================= */

function addTournament() {

const input = document.getElementById("tournamentName");

if (!input) {
    return;
}

const name = input.value.trim();

if (name === "") {

    alert("Please enter a tournament name.");

    input.focus();

    return;
}

const tournament = {

    id: createId("tournament"),

    name: name,

    createdAt: new Date().toISOString()
};

AppData.tournaments.push(tournament);

saveData();

input.value = "";

renderTournaments();

alert("Tournament created successfully! 🏆");

}

function renderTournaments() {

const list = document.getElementById("tournamentList");

if (!list) {
    return;
}

if (AppData.tournaments.length === 0) {

    list.innerHTML =
        '<p class="empty-message">No tournaments yet.</p>';

    return;
}

list.innerHTML = "";

AppData.tournaments.forEach(function (tournament) {

    const item = document.createElement("div");

    item.className = "list-item";

    item.innerHTML = `
        <div class="list-item-header">
            <div>
                <div class="list-item-title">
                    🏆 ${escapeHTML(tournament.name)}
                </div>

                <div class="list-item-info">
                    Tournament
                </div>
            </div>
        </div>

        <div class="list-actions">

            <button
                class="small-btn delete-btn"
                onclick="deleteTournament('${tournament.id}')">
                Delete
            </button>

        </div>
    `;

    list.appendChild(item);
});

}

function deleteTournament(tournamentId) {

const tournament = AppData.tournaments.find(
    function (item) {
        return item.id === tournamentId;
    }
);

if (!tournament) {
    return;
}

const confirmed = confirm(
    `Delete "${tournament.name}"?`
);

if (!confirmed) {
    return;
}

AppData.tournaments = AppData.tournaments.filter(
    function (item) {
        return item.id !== tournamentId;
    }
);

saveData();

renderTournaments();

}

/* =========================================================
TEAMS
========================================================= */

function addTeam() {

const input = document.getElementById("teamName");

if (!input) {
    return;
}

const name = input.value.trim();

if (name === "") {

    alert("Please enter a team name.");

    input.focus();

    return;
}

const team = {

    id: createId("team"),

    name: name,

    createdAt: new Date().toISOString()
};

AppData.teams.push(team);

saveData();

input.value = "";

renderTeams();

alert("Team created successfully! 👥");

}

function renderTeams() {

const list = document.getElementById("teamList");

if (!list) {
    return;
}

if (AppData.teams.length === 0) {

    list.innerHTML =
        '<p class="empty-message">No teams yet.</p>';

    return;
}

list.innerHTML = "";

AppData.teams.forEach(function (team) {

    const playerCount = AppData.players.filter(
        function (player) {
            return player.teamId === team.id;
        }
    ).length;

    const item = document.createElement("div");

    item.className = "list-item";

    item.innerHTML = `
        <div class="list-item-header">

            <div>
                <div class="list-item-title">
                    👥 ${escapeHTML(team.name)}
                </div>

                <div class="list-item-info">
                    ${playerCount} player${playerCount === 1 ? "" : "s"}
                </div>
            </div>

        </div>

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
    `;

    list.appendChild(item);
});

}

function deleteTeam(teamId) {

const team = AppData.teams.find(
    function (item) {
        return item.id === teamId;
    }
);

if (!team) {
    return;
}

const confirmed = confirm(
    `Delete "${team.name}" and all its players?`
);

if (!confirmed) {
    return;
}

AppData.teams = AppData.teams.filter(
    function (item) {
        return item.id !== teamId;
    }
);

AppData.players = AppData.players.filter(
    function (player) {
        return player.teamId !== teamId;
    }
);

if (CurrentState.currentTeamId === teamId) {
    CurrentState.currentTeamId = null;
}

saveData();

renderTeams();

}

/* =========================================================
PLAYERS
========================================================= */

function openPlayers(teamId) {

const team = AppData.teams.find(
    function (item) {
        return item.id === teamId;
    }
);

if (!team) {
    return;
}

CurrentState.currentTeamId = teamId;

const info = document.getElementById("selectedTeamInfo");

if (info) {

    info.innerHTML =
        "Managing players for: 🏏 " +
        escapeHTML(team.name);
}

renderPlayers();

showScreen("playerScreen");

}

function addPlayer() {

if (!CurrentState.currentTeamId) {

    alert("Please select a team first.");

    return;
}

const input = document.getElementById("playerName");

if (!input) {
    return;
}

const name = input.value.trim();

if (name === "") {

    alert("Please enter a player name.");

    input.focus();

    return;
}

const player = {

    id: createId("player"),

    teamId: CurrentState.currentTeamId,

    name: name,

    createdAt: new Date().toISOString()
};

AppData.players.push(player);

saveData();

input.value = "";

renderPlayers();

renderTeams();

}

function renderPlayers() {

const list = document.getElementById("playerList");

if (!list) {
    return;
}

if (!CurrentState.currentTeamId) {

    list.innerHTML =
        '<p class="empty-message">Select a team to manage players.</p>';

    return;
}

const teamPlayers = AppData.players.filter(
    function (player) {
        return player.teamId === CurrentState.currentTeamId;
    }
);

if (teamPlayers.length === 0) {

    list.innerHTML =
        '<p class="empty-message">No players yet.</p>';

    return;
}

list.innerHTML = "";

teamPlayers.forEach(function (player, index) {

    const item = document.createElement("div");

    item.className = "list-item";

    item.innerHTML = `
        <div class="list-item-header">

            <div>
                <div class="list-item-title">
                    ${index + 1}. ${escapeHTML(player.name)}
                </div>

                <div class="list-item-info">
                    Player
                </div>
            </div>

        </div>

        <div class="list-actions">

            <button
                class="small-btn delete-btn"
                onclick="deletePlayer('${player.id}')">
                Delete
            </button>

        </div>
    `;

    list.appendChild(item);
});

}

function deletePlayer(playerId) {

const player = AppData.players.find(
    function (item) {
        return item.id === playerId;
    }
);

if (!player) {
    return;
}

const confirmed = confirm(
    `Delete "${player.name}"?`
);

if (!confirmed) {
    return;
}

AppData.players = AppData.players.filter(
    function (item) {
        return item.id !== playerId;
    }
);

saveData();

renderPlayers();

renderTeams();

}

/* =========================================================
SECURITY / HTML ESCAPING
========================================================= */

function escapeHTML(value) {

const div = document.createElement("div");

div.textContent = value;

return div.innerHTML;

}

/* =========================================================
KEYBOARD SUPPORT
========================================================= */

document.addEventListener("keydown", function (event) {

if (event.key !== "Enter") {
    return;
}

const activeElement = document.activeElement;

if (!activeElement) {
    return;
}

if (activeElement.id === "tournamentName") {
    addTournament();
}

if (activeElement.id === "teamName") {
    addTeam();
}

if (activeElement.id === "playerName") {
    addPlayer();
}

});

/* =========================================================
END OF VERSION 1.1
========================================================= */
