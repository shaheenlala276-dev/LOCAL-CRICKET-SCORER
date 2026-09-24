/* =========================================================
LOCAL CRICKET SCORER — VERSION 1.2
SCRIPT.JS

Features:

- Tournament management
- Team management
- Player management
- Match setup
- Toss management
- Local storage
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

currentTeamId: null

};

/* =========================================================
START APP
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

loadData();

renderTournaments();

renderTeams();

renderMatches();

populateMatchSetup();

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


if (screenId === "matchScreen") {

    populateMatchSetup();

    renderMatches();

}

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

/* =========================================================
LOAD DATA
========================================================= */

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


    AppData.matches = Array.isArray(parsedData.matches)

        ? parsedData.matches

        : [];


} catch (error) {

    console.error(

        "Could not load saved data:",

        error

    );


    AppData.tournaments = [];

    AppData.teams = [];

    AppData.players = [];

    AppData.matches = [];

}

}

/* =========================================================
ID GENERATOR
========================================================= */

function createId(prefix) {

return (

    prefix +

    "_" +

    Date.now().toString(36) +

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

const input = document.getElementById(

    "tournamentName"

);


if (!input) {

    return;

}


const name = input.value.trim();


if (name === "") {

    alert(

        "Please enter a tournament name."

    );

    input.focus();

    return;

}


const tournament = {

    id: createId("tournament"),

    name: name,

    createdAt: new Date().toISOString()

};


AppData.tournaments.push(

    tournament

);


saveData();


input.value = "";


renderTournaments();


alert(

    "Tournament created successfully! 🏆"

);

}

/* =========================================================
RENDER TOURNAMENTS
========================================================= */

function renderTournaments() {

const list = document.getElementById(

    "tournamentList"

);


if (!list) {

    return;

}


if (AppData.tournaments.length === 0) {

    list.innerHTML =

        '<p class="empty-message">' +

        'No tournaments yet.' +

        '</p>';

    return;

}


list.innerHTML = "";


AppData.tournaments.forEach(

    function (tournament) {


        const matchCount =

            AppData.matches.filter(

                function (match) {

                    return (

                        match.tournamentId ===

                        tournament.id

                    );

                }

            ).length;


        const item =

            document.createElement("div");


        item.className = "list-item";


        item.innerHTML = `

            <div class="list-item-header">

                <div>

                    <div class="list-item-title">

                        🏆

                        ${escapeHTML(

                            tournament.name

                        )}

                    </div>

                    <div class="list-item-info">

                        ${matchCount}

                        match${

                            matchCount === 1

                                ? ""

                                : "es"

                        }

                    </div>

                </div>

            </div>


            <div class="list-actions">

                <button

                    class="small-btn delete-btn"

                    onclick="deleteTournament(

                        '${tournament.id}'

                    )">

                    Delete

                </button>

            </div>

        `;


        list.appendChild(item);

    }

);

}

/* =========================================================
DELETE TOURNAMENT
========================================================= */

function deleteTournament(tournamentId) {

const tournament =

    AppData.tournaments.find(

        function (item) {

            return (

                item.id ===

                tournamentId

            );

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


AppData.tournaments =

    AppData.tournaments.filter(

        function (item) {

            return (

                item.id !==

                tournamentId

            );

        }

    );


/* Remove matches belonging to tournament */

AppData.matches =

    AppData.matches.filter(

        function (match) {

            return (

                match.tournamentId !==

                tournamentId

            );

        }

    );


saveData();


renderTournaments();

renderMatches();

}

/* =========================================================
TEAMS
========================================================= */

function addTeam() {

const input = document.getElementById(

    "teamName"

);


if (!input) {

    return;

}


const name = input.value.trim();


if (name === "") {

    alert(

        "Please enter a team name."

    );

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


alert(

    "Team created successfully! 👥"

);

}

/* =========================================================
RENDER TEAMS
========================================================= */

function renderTeams() {

const list = document.getElementById(

    "teamList"

);


if (!list) {

    return;

}


if (AppData.teams.length === 0) {

    list.innerHTML =

        '<p class="empty-message">' +

        'No teams yet.' +

        '</p>';

    return;

}


list.innerHTML = "";


AppData.teams.forEach(

    function (team) {


        const playerCount =

            AppData.players.filter(

                function (player) {

                    return (

                        player.teamId ===

                        team.id

                    );

                }

            ).length;


        const item =

            document.createElement("div");


        item.className = "list-item";


        item.innerHTML = `

            <div class="list-item-header">

                <div>

                    <div class="list-item-title">

                        👥

                        ${escapeHTML(

                            team.name

                        )}

                    </div>


                    <div class="list-item-info">

                        ${playerCount}

                        player${

                            playerCount === 1

                                ? ""

                                : "s"

                        }

                    </div>

                </div>

            </div>


            <div class="list-actions">

                <button

                    class="small-btn manage-btn"

                    onclick="openPlayers(

                        '${team.id}'

                    )">

                    Manage Players

                </button>


                <button

                    class="small-btn delete-btn"

                    onclick="deleteTeam(

                        '${team.id}'

                    )">

                    Delete

                </button>

            </div>

        `;


        list.appendChild(item);

    }

);

}

/* =========================================================
DELETE TEAM
========================================================= */

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


AppData.teams =

    AppData.teams.filter(

        function (item) {

            return item.id !== teamId;

        }

    );


AppData.players =

    AppData.players.filter(

        function (player) {

            return (

                player.teamId !== teamId

            );

        }

    );


/* Remove matches involving this team */

AppData.matches =

    AppData.matches.filter(

        function (match) {

            return (

                match.teamAId !== teamId &&

                match.teamBId !== teamId

            );

        }

    );


if (

    CurrentState.currentTeamId ===

    teamId

) {

    CurrentState.currentTeamId = null;

}


saveData();


renderTeams();

renderMatches();

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


const info = document.getElementById(

    "selectedTeamInfo"

);


if (info) {

    info.innerHTML =

        "Managing players for: 🏏 " +

        escapeHTML(team.name);

}


renderPlayers();


showScreen("playerScreen");

}

/* =========================================================
ADD PLAYER
========================================================= */

function addPlayer() {

if (!CurrentState.currentTeamId) {

    alert(

        "Please select a team first."

    );

    return;

}


const input = document.getElementById(

    "playerName"

);


if (!input) {

    return;

}


const name = input.value.trim();


if (name === "") {

    alert(

        "Please enter a player name."

    );

    input.focus();

    return;

}


const player = {

    id: createId("player"),

    teamId:

        CurrentState.currentTeamId,

    name: name,

    createdAt: new Date().toISOString()

};


AppData.players.push(player);


saveData();


input.value = "";


renderPlayers();

renderTeams();

}

/* =========================================================
RENDER PLAYERS
========================================================= */

function renderPlayers() {

const list = document.getElementById(

    "playerList"

);


if (!list) {

    return;

}


if (!CurrentState.currentTeamId) {

    list.innerHTML =

        '<p class="empty-message">' +

        'Select a team to manage players.' +

        '</p>';

    return;

}


const teamPlayers =

    AppData.players.filter(

        function (player) {

            return (

                player.teamId ===

                CurrentState.currentTeamId

            );

        }

    );


if (teamPlayers.length === 0) {

    list.innerHTML =

        '<p class="empty-message">' +

        'No players yet.' +

        '</p>';

    return;

}


list.innerHTML = "";


teamPlayers.forEach(

    function (player, index) {


        const item =

            document.createElement("div");


        item.className = "list-item";


        item.innerHTML = `

            <div class="list-item-header">

                <div>

                    <div class="list-item-title">

                        ${index + 1}.

                        ${escapeHTML(

                            player.name

                        )}

                    </div>


                    <div class="list-item-info">

                        Player

                    </div>

                </div>

            </div>


            <div class="list-actions">

                <button

                    class="small-btn delete-btn"

                    onclick="deletePlayer(

                        '${player.id}'

                    )">

                    Delete

                </button>

            </div>

        `;


        list.appendChild(item);

    }

);

}

/* =========================================================
DELETE PLAYER
========================================================= */

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


AppData.players =

    AppData.players.filter(

        function (item) {

            return item.id !== playerId;

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

/* =========================================================
TOURNAMENT SELECT
========================================================= */

function populateTournamentSelect() {

const select = document.getElementById(

    "matchTournament"

);


if (!select) {

    return;

}


const currentValue = select.value;


select.innerHTML = `

    <option value="">

        Select tournament

    </option>

`;


AppData.tournaments.forEach(

    function (tournament) {


        const option =

            document.createElement("option");


        option.value = tournament.id;


        option.textContent =

            tournament.name;


        select.appendChild(option);

    }

);


if (

    AppData.tournaments.some(

        function (tournament) {

            return (

                tournament.id ===

                currentValue

            );

        }

    )

) {

    select.value = currentValue;

}

}

/* =========================================================
TEAM SELECTS
========================================================= */

function populateTeamSelects() {

const teamA = document.getElementById(

    "teamA"

);


const teamB = document.getElementById(

    "teamB"

);


if (!teamA || !teamB) {

    return;

}


const oldTeamA = teamA.value;

const oldTeamB = teamB.value;


teamA.innerHTML = `

    <option value="">

        Select Team A

    </option>

`;


teamB.innerHTML = `

    <option value="">

        Select Team B

    </option>

`;


AppData.teams.forEach(

    function (team) {


        const optionA =

            document.createElement("option");


        optionA.value = team.id;


        optionA.textContent = team.name;


        teamA.appendChild(optionA);


        const optionB =

            document.createElement("option");


        optionB.value = team.id;


        optionB.textContent = team.name;


        teamB.appendChild(optionB);

    }

);


if (

    AppData.teams.some(

        function (team) {

            return team.id === oldTeamA;

        }

    )

) {

    teamA.value = oldTeamA;

}


if (

    AppData.teams.some(

        function (team) {

            return team.id === oldTeamB;

        }

    )

) {

    teamB.value = oldTeamB;

}

}

/* =========================================================
CREATE MATCH
========================================================= */

function createMatch() {

const tournamentSelect =

    document.getElementById(

        "matchTournament"

    );


const teamASelect =

    document.getElementById(

        "teamA"

    );


const teamBSelect =

    document.getElementById(

        "teamB"

    );


const oversInput =

    document.getElementById(

        "matchOvers"

    );


const dateInput =

    document.getElementById(

        "matchDate"

    );


const tossWinnerSelect =

    document.getElementById(

        "tossWinner"

    );


const tossDecisionSelect =

    document.getElementById(

        "tossDecision"

    );


if (

    !tournamentSelect ||

    !teamASelect ||

    !teamBSelect ||

    !oversInput ||

    !dateInput ||

    !tossWinnerSelect ||

    !tossDecisionSelect

) {

    return;

}


const tournamentId =

    tournamentSelect.value;


const teamAId =

    teamASelect.value;


const teamBId =

    teamBSelect.value;


const overs =

    Number(oversInput.value);


const matchDate =

    dateInput.value;


const tossWinner =

    tossWinnerSelect.value;


const tossDecision =

    tossDecisionSelect.value;


/* ================= VALIDATION ================= */


if (!tournamentId) {

    alert(

        "Please select a tournament."

    );

    return;

}


if (!teamAId) {

    alert(

        "Please select Team A."

    );

    return;

}


if (!teamBId) {

    alert(

        "Please select Team B."

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


if (!matchDate) {

    alert(

        "Please select the match date."

    );

    return;

}


if (!tossWinner) {

    alert(

        "Please select the toss winner."

    );

    return;

}


if (!tossDecision) {

    alert(

        "Please select the toss decision."

    );

    return;

}


/* ================= GET TEAM NAMES ================= */


const teamA =

    AppData.teams.find(

        function (team) {

            return team.id === teamAId;

        }

    );


const teamB =

    AppData.teams.find(

        function (team) {

            return team.id === teamBId;

        }

    );


const tournament =

    AppData.tournaments.find(

        function (item) {

            return (

                item.id ===

                tournamentId

            );

        }

    );


if (

    !teamA ||

    !teamB ||

    !tournament

) {

    alert(

        "Could not find the selected data."

    );

    return;

}


/* ================= CALCULATE INNINGS ORDER ================= */


let battingFirstId;

let bowlingFirstId;


if (

    tossWinner === "teamA"

) {

    if (

        tossDecision === "bat"

    ) {

        battingFirstId = teamAId;

        bowlingFirstId = teamBId;

    } else {

        battingFirstId = teamBId;

        bowlingFirstId = teamAId;

    }

}


if (

    tossWinner === "teamB"

) {

    if (

        tossDecision === "bat"

    ) {

        battingFirstId = teamBId;

        bowlingFirstId = teamAId;

    } else {

        battingFirstId = teamAId;

        bowlingFirstId = teamBId;

    }

}


/* ================= CREATE MATCH ================= */


const match = {

    id: createId("match"),

    tournamentId: tournamentId,

    teamAId: teamAId,

    teamBId: teamBId,

    overs: overs,

    date: matchDate,

    tossWinner: tossWinner,

    tossDecision: tossDecision,

    battingFirstId: battingFirstId,

    bowlingFirstId: bowlingFirstId,

    status: "Not Started",

    createdAt: new Date().toISOString()

};


AppData.matches.push(match);


saveData();


/* ================= RESET FORM ================= */


tournamentSelect.value = "";

teamASelect.value = "";

teamBSelect.value = "";

oversInput.value = "10";

dateInput.value = "";

tossWinnerSelect.value = "";

tossDecisionSelect.value = "";


renderMatches();


alert(

    "Match created successfully! 🏏"

);

}

/* =========================================================
RENDER MATCHES
========================================================= */

function renderMatches() {

const list = document.getElementById(

    "matchList"

);


if (!list) {

    return;

}


if (AppData.matches.length === 0) {

    list.innerHTML =

        '<p class="empty-message">' +

        'No matches yet.' +

        '</p>';

    return;

}


list.innerHTML = "";


AppData.matches.forEach(

    function (match) {


        const tournament =

            AppData.tournaments.find(

                function (item) {

                    return (

                        item.id ===

                        match.tournamentId

                    );

                }

            );


        const teamA =

            AppData.teams.find(

                function (team) {

                    return (

                        team.id ===

                        match.teamAId

                    );

                }

            );


        const teamB =

            AppData.teams.find(

                function (team) {

                    return (

                        team.id ===

                        match.teamBId

                    );

                }

            );


        if (

            !tournament ||

            !teamA ||

            !teamB

        ) {

            return;

        }


        const battingTeam =

            AppData.teams.find(

                function (team) {

                    return (

                        team.id ===

                        match.battingFirstId

                    );

                }

            );


        const item =

            document.createElement("div");


        item.className = "list-item";


        item.innerHTML = `

            <div class="list-item-header">

                <div>

                    <div class="list-item-title">

                        🏏

                        ${escapeHTML(

                            teamA.name

                        )}

                        vs

                        ${escapeHTML(

                            teamB.name

                        )}

                    </div>


                    <div class="list-item-info">

                        🏆

                        ${escapeHTML(

                            tournament.name

                        )}

                        <br>

                        📅

                        ${escapeHTML(

                            match.date

                        )}

                        <br>

                        🔢

                        ${match.overs}

                        overs

                        <br>

                        🪙 Toss:

                        ${escapeHTML(

                            getTossTeamName(

                                match

                            )

                        )}

                        —

                        ${

                            match.tossDecision ===

                            "bat"

                                ? "Bat First"

                                : "Bowl First"

                        }

                        <br>

                        🏏 Batting First:

                        ${

                            battingTeam

                                ? escapeHTML(

                                    battingTeam.name

                                )

                                : "Unknown"

                        }

                    </div>

                </div>

            </div>


            <div class="list-actions">

                <button

                    class="small-btn delete-btn"

                    onclick="deleteMatch(

                        '${match.id}'

                    )">

                    Delete

                </button>

            </div>

        `;


        list.appendChild(item);

    }

);


if (list.innerHTML === "") {

    list.innerHTML =

        '<p class="empty-message">' +

        'No valid matches found.' +

        '</p>';

}

}

/* =========================================================
GET TOSS TEAM NAME
========================================================= */

function getTossTeamName(match) {

const teamId =

    match.tossWinner === "teamA"

        ? match.teamAId

        : match.teamBId;


const team = AppData.teams.find(

    function (item) {

        return item.id === teamId;

    }

);


return team

    ? team.name

    : "Unknown";

}

/* =========================================================
DELETE MATCH
========================================================= */

function deleteMatch(matchId) {

const match = AppData.matches.find(

    function (item) {

        return item.id === matchId;

    }

);


if (!match) {

    return;

}


const teamA = AppData.teams.find(

    function (team) {

        return (

            team.id ===

            match.teamAId

        );

    }

);


const teamB = AppData.teams.find(

    function (team) {

        return (

            team.id ===

            match.teamBId

        );

    }

);


const teamAName = teamA

    ? teamA.name

    : "Team A";


const teamBName = teamB

    ? teamB.name

    : "Team B";


const confirmed = confirm(

    `Delete match ${teamAName} vs ${teamBName}?`

);


if (!confirmed) {

    return;

}


AppData.matches =

    AppData.matches.filter(

        function (item) {

            return (

                item.id !== matchId

            );

        }

    );


saveData();


renderMatches();

}

/* =========================================================
HTML ESCAPING
========================================================= */

function escapeHTML(value) {

const div =

    document.createElement("div");


div.textContent = value;


return div.innerHTML;

}

/* =========================================================
KEYBOARD SUPPORT
========================================================= */

document.addEventListener(

"keydown",

function (event) {


    if (event.key !== "Enter") {

        return;

    }


    const activeElement =

        document.activeElement;


    if (!activeElement) {

        return;

    }


    if (

        activeElement.id ===

        "tournamentName"

    ) {

        addTournament();

    }


    if (

        activeElement.id ===

        "teamName"

    ) {

        addTeam();

    }


    if (

        activeElement.id ===

        "playerName"

    ) {

        addPlayer();

    }

}

);

/* =========================================================
END OF VERSION 1.2
========================================================= */
