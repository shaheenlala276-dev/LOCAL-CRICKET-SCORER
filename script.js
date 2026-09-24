/* ===== LOCAL CRICKET SCORER APP - VERSION 1.3 ===== */
/* Tournament Setup + Match Setup + Live Ball-by-Ball Scoring */


/* ===== DATA STRUCTURE ===== */

const AppData = {
    tournaments: [],
    teams: [],
    players: [],
    matches: []
};

const STORAGE_KEY = 'cricket_scorer_v1';

const TOURNAMENT_PREFIX = 'tourn_';
const TEAM_PREFIX = 'team_';
const PLAYER_PREFIX = 'player_';
const MATCH_PREFIX = 'match_';


/* ===== CURRENT STATE ===== */

const CurrentState = {
    currentTournamentId: null,
    currentTeamId: null,
    currentMatchId: null,
    editingTeamId: null,
    editingPlayerId: null
};


/* ===== LIVE SCORING STATE ===== */

const LiveState = {
    inningsIndex: 0,
    strikerId: null,
    nonStrikerId: null,
    bowlerId: null
};


/* ===== UTILITY FUNCTIONS ===== */

function generateId(prefix) {
    return prefix + Date.now() + Math.random().toString(36).substr(2, 9);
}

function showAlert(message, type = 'info') {
    alert(message);
}

function confirmAction(message) {
    return confirm(message);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return String(text ?? '').replace(/[&<>"']/g, m => map[m]);
}


/* ===== LOCALSTORAGE FUNCTIONS ===== */

function saveToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(AppData));
    } catch (error) {
        showAlert('Failed to save data: ' + error.message);
    }
}

function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);

        if (data) {
            const parsed = JSON.parse(data);

            AppData.tournaments = parsed.tournaments || [];
            AppData.teams = parsed.teams || [];
            AppData.players = parsed.players || [];
            AppData.matches = parsed.matches || [];
        }
    } catch (error) {
        showAlert('Failed to load data: ' + error.message);

        AppData.tournaments = [];
        AppData.teams = [];
        AppData.players = [];
        AppData.matches = [];
    }
}


/* ===== TOURNAMENT FUNCTIONS ===== */

function createTournament(name, date, location) {

    if (!name || !date) {
        showAlert('Tournament name and date are required');
        return null;
    }

    const tournament = {
        id: generateId(TOURNAMENT_PREFIX),
        name: name.trim(),
        date: date,
        location: location ? location.trim() : '',
        teamIds: [],
        createdAt: new Date().toISOString()
    };

    AppData.tournaments.push(tournament);

    saveToLocalStorage();

    showAlert('Tournament created successfully!');

    return tournament;
}

function getTournament(id) {
    return AppData.tournaments.find(t => t.id === id) || null;
}

function getAllTournaments() {
    return AppData.tournaments;
}

function updateTournament(id, name, date, location) {

    const tournament = getTournament(id);

    if (!tournament) {
        return false;
    }

    if (!name || !date) {
        showAlert('Tournament name and date are required');
        return false;
    }

    tournament.name = name.trim();
    tournament.date = date;
    tournament.location = location ? location.trim() : '';

    saveToLocalStorage();

    return true;
}

function deleteTournament(id) {

    if (!confirmAction(
        'Are you sure you want to delete this tournament and all its teams and players?'
    )) {
        return false;
    }

    const tournamentIndex =
        AppData.tournaments.findIndex(t => t.id === id);

    if (tournamentIndex === -1) {
        return false;
    }

    const tournament = AppData.tournaments[tournamentIndex];

    tournament.teamIds.forEach(teamId => {

        const team = getTeam(teamId);

        if (team) {

            team.playerIds.forEach(playerId => {

                const playerIndex =
                    AppData.players.findIndex(p => p.id === playerId);

                if (playerIndex !== -1) {
                    AppData.players.splice(playerIndex, 1);
                }

            });

            const teamIndex =
                AppData.teams.findIndex(t => t.id === teamId);

            if (teamIndex !== -1) {
                AppData.teams.splice(teamIndex, 1);
            }
        }
    });

    AppData.matches =
        AppData.matches.filter(m => m.tournamentId !== id);

    AppData.tournaments.splice(tournamentIndex, 1);

    saveToLocalStorage();

    showAlert('Tournament deleted successfully');

    return true;
}


/* ===== TEAM FUNCTIONS ===== */

function createTeam(tournamentId, name) {

    if (!name) {
        showAlert('Team name is required');
        return null;
    }

    const tournament = getTournament(tournamentId);

    if (!tournament) {
        showAlert('Tournament not found');
        return null;
    }

    const team = {
        id: generateId(TEAM_PREFIX),
        tournamentId: tournamentId,
        name: name.trim(),
        playerIds: [],
        createdAt: new Date().toISOString()
    };

    AppData.teams.push(team);

    tournament.teamIds.push(team.id);

    saveToLocalStorage();

    return team;
}

function getTeam(id) {
    return AppData.teams.find(t => t.id === id) || null;
}

function getTeamsByTournament(tournamentId) {

    const tournament = getTournament(tournamentId);

    if (!tournament) {
        return [];
    }

    return AppData.teams.filter(
        t => tournament.teamIds.includes(t.id)
    );
}

function updateTeam(id, name) {

    const team = getTeam(id);

    if (!team) {
        return false;
    }

    if (!name) {
        showAlert('Team name is required');
        return false;
    }

    team.name = name.trim();

    saveToLocalStorage();

    return true;
}

function deleteTeam(id) {

    if (!confirmAction(
        'Are you sure you want to delete this team and all its players?'
    )) {
        return false;
    }

    const team = getTeam(id);

    if (!team) {
        return false;
    }

    const tournament = getTournament(team.tournamentId);

    if (tournament) {
        tournament.teamIds =
            tournament.teamIds.filter(tId => tId !== id);
    }

    team.playerIds.forEach(playerId => {

        const playerIndex =
            AppData.players.findIndex(p => p.id === playerId);

        if (playerIndex !== -1) {
            AppData.players.splice(playerIndex, 1);
        }
    });

    const teamIndex =
        AppData.teams.findIndex(t => t.id === id);

    if (teamIndex !== -1) {
        AppData.teams.splice(teamIndex, 1);
    }

    saveToLocalStorage();

    showAlert('Team deleted successfully');

    return true;
}


/* ===== PLAYER FUNCTIONS ===== */

function createPlayer(teamId, name, number = null) {

    if (!name) {
        showAlert('Player name is required');
        return null;
    }

    const team = getTeam(teamId);

    if (!team) {
        showAlert('Team not found');
        return null;
    }

    const player = {
        id: generateId(PLAYER_PREFIX),
        teamId: teamId,
        name: name.trim(),
        number: number ? parseInt(number) : null,
        createdAt: new Date().toISOString()
    };

    AppData.players.push(player);

    team.playerIds.push(player.id);

    saveToLocalStorage();

    return player;
}

function getPlayer(id) {
    return AppData.players.find(p => p.id === id) || null;
}

function getPlayersByTeam(teamId) {

    const team = getTeam(teamId);

    if (!team) {
        return [];
    }

    return AppData.players.filter(
        p => team.playerIds.includes(p.id)
    );
}

function updatePlayer(id, name, number = null) {

    const player = getPlayer(id);

    if (!player) {
        return false;
    }

    if (!name) {
        showAlert('Player name is required');
        return false;
    }

    player.name = name.trim();
    player.number = number ? parseInt(number) : null;

    saveToLocalStorage();

    return true;
}

function deletePlayer(id) {

    if (!confirmAction(
        'Are you sure you want to delete this player?'
    )) {
        return false;
    }

    const player = getPlayer(id);

    if (!player) {
        return false;
    }

    const team = getTeam(player.teamId);

    if (team) {
        team.playerIds =
            team.playerIds.filter(pId => pId !== id);
    }

    const playerIndex =
        AppData.players.findIndex(p => p.id === id);

    if (playerIndex !== -1) {
        AppData.players.splice(playerIndex, 1);
    }

    saveToLocalStorage();

    showAlert('Player deleted successfully');

    return true;
}


/* ===== MATCH FUNCTIONS ===== */

function createMatch(
    tournamentId,
    team1Id,
    team2Id,
    overs,
    matchDate,
    matchTime,
    venue,
    tossWinnerId,
    tossDecision,
    team1XI,
    team2XI
) {

    if (!team1Id || !team2Id) {
        showAlert('Both teams must be selected');
        return null;
    }

    if (team1Id === team2Id) {
        showAlert('Team 1 and Team 2 must be different');
        return null;
    }

    if (!overs || overs < 1) {
        showAlert('Number of overs must be a positive number');
        return null;
    }

    if (!matchDate || !matchTime) {
        showAlert('Match date and time are required');
        return null;
    }

    if (!tossWinnerId || !tossDecision) {
        showAlert('Toss information is required');
        return null;
    }

    if (!team1XI || team1XI.length < 2 || team1XI.length > 11) {
        showAlert('Team 1 must have between 2 and 11 players');
        return null;
    }

    if (!team2XI || team2XI.length < 2 || team2XI.length > 11) {
        showAlert('Team 2 must have between 2 and 11 players');
        return null;
    }

    const match = {
        id: generateId(MATCH_PREFIX),
        tournamentId: tournamentId,
        team1Id: team1Id,
        team2Id: team2Id,
        overs: parseInt(overs),
        matchDate: matchDate,
        matchTime: matchTime,
        venue: venue ? venue.trim() : '',
        tossWinnerId: tossWinnerId,
        tossDecision: tossDecision,
        team1PlayingXI: team1XI,
        team2PlayingXI: team2XI,
        status: 'Not Started',
        innings: [],
        createdAt: new Date().toISOString()
    };

    AppData.matches.push(match);

    saveToLocalStorage();

    return match;
}

function getMatch(id) {
    return AppData.matches.find(m => m.id === id) || null;
}

function getMatchesByTournament(tournamentId) {
    return AppData.matches.filter(
        m => m.tournamentId === tournamentId
    );
}

function deleteMatch(id) {

    if (!confirmAction(
        'Are you sure you want to delete this match?'
    )) {
        return false;
    }

    const matchIndex =
        AppData.matches.findIndex(m => m.id === id);

    if (matchIndex !== -1) {

        AppData.matches.splice(matchIndex, 1);

        saveToLocalStorage();

        showAlert('Match deleted successfully');

        return true;
    }

    return false;
}

function updateMatchStatus(id, status) {

    const match = getMatch(id);

    if (match) {

        match.status = status;

        saveToLocalStorage();

        return true;
    }

    return false;
}


/* ===== SCREEN NAVIGATION ===== */

function showScreen(screenId) {

    const screens =
        document.querySelectorAll('.screen');

    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen =
        document.getElementById(screenId);

    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

function showHome() {

    CurrentState.currentTournamentId = null;
    CurrentState.currentTeamId = null;

    showScreen('home-screen');
}

function showCreateTournament() {

    document.getElementById(
        'create-tournament-form'
    ).reset();

    showScreen('create-tournament-screen');
}

function showSavedTournaments() {

    renderTournaments();

    showScreen('saved-tournaments-screen');
}

function showTournamentDashboard(tournamentId) {

    CurrentState.currentTournamentId =
        tournamentId;

    renderTournamentDashboard();

    showScreen('tournament-dashboard-screen');
}

function showAddTeam() {

    document.getElementById(
        'add-team-form'
    ).reset();

    showScreen('add-team-screen');
}

function showTeamDetails(teamId) {

    CurrentState.currentTeamId =
        teamId;

    renderTeamDetails();

    showScreen('team-details-screen');
}

function showAddPlayer() {

    document.getElementById(
        'add-player-form'
    ).reset();

    showScreen('add-player-screen');
}

function showEditTeam(teamId) {

    CurrentState.editingTeamId =
        teamId;

    const team = getTeam(teamId);

    if (team) {
        document.getElementById(
            'edit-team-name'
        ).value = team.name;
    }

    showScreen('edit-team-screen');
}

function showEditPlayer(playerId) {

    CurrentState.editingPlayerId =
        playerId;

    const player = getPlayer(playerId);

    if (player) {

        document.getElementById(
            'edit-player-name'
        ).value = player.name;

        document.getElementById(
            'edit-player-number'
        ).value = player.number || '';
    }

    showScreen('edit-player-screen');
}

function showMatchSetup() {

    resetMatchSetupForm();

    populateTeamSelects();

    showScreen('match-setup-screen');
}


/* ===== SHOW LIVE SCORING ===== */

function showLiveScoring() {

    const match =
        getMatch(CurrentState.currentMatchId);

    if (!match) {
        showAlert('Match not found.');
        showTournamentDashboard(
            CurrentState.currentTournamentId
        );
        return;
    }

    renderLiveScoring();

    showScreen('live-scoring-screen');
}


/* ===== MATCH SETUP FUNCTIONS ===== */

function resetMatchSetupForm() {

    document.getElementById(
        'match-info-form'
    ).reset();

    document.getElementById(
        'match-setup-step-1'
    ).classList.add('active');

    document.getElementById(
        'match-setup-step-2'
    ).classList.remove('active');

    document.getElementById(
        'match-setup-error'
    ).style.display = 'none';

    document.getElementById(
        'match-setup-error'
    ).textContent = '';
}

function populateTeamSelects() {

    const teams =
        getTeamsByTournament(
            CurrentState.currentTournamentId
        );

    const team1Select =
        document.getElementById('match-team1');

    const team2Select =
        document.getElementById('match-team2');

    const tossWinnerSelect =
        document.getElementById('match-toss-winner');

    team1Select.innerHTML =
        '<option value="">-- Select Team --</option>';

    team2Select.innerHTML =
        '<option value="">-- Select Team --</option>';

    tossWinnerSelect.innerHTML =
        '<option value="">-- Select Winner --</option>';

    teams.forEach(team => {

        const option1 =
            document.createElement('option');

        option1.value = team.id;
        option1.textContent = team.name;

        team1Select.appendChild(option1);


        const option2 =
            document.createElement('option');

        option2.value = team.id;
        option2.textContent = team.name;

        team2Select.appendChild(option2);


        const optionToss =
            document.createElement('option');

        optionToss.value = team.id;
        optionToss.textContent = team.name;

        tossWinnerSelect.appendChild(optionToss);
    });
}

function proceedToPlayingXI() {

    const team1Id =
        document.getElementById(
            'match-team1'
        ).value;

    const team2Id =
        document.getElementById(
            'match-team2'
        ).value;

    const overs =
        document.getElementById(
            'match-overs'
        ).value;

    const matchDate =
        document.getElementById(
            'match-date'
        ).value;

    const matchTime =
        document.getElementById(
            'match-time'
        ).value;

    const tossWinner =
        document.getElementById(
            'match-toss-winner'
        ).value;

    const tossDecision =
        document.getElementById(
            'match-toss-decision'
        ).value;

    const errorDiv =
        document.getElementById(
            'match-setup-error'
        );


    if (!team1Id || !team2Id) {
        errorDiv.textContent =
            'Please select both teams';

        errorDiv.style.display =
            'block';

        return;
    }

    if (team1Id === team2Id) {
        errorDiv.textContent =
            'Team 1 and Team 2 must be different';

        errorDiv.style.display =
            'block';

        return;
    }

    if (!overs || overs < 1) {
        errorDiv.textContent =
            'Number of overs must be a positive number';

        errorDiv.style.display =
            'block';

        return;
    }

    if (!matchDate || !matchTime) {
        errorDiv.textContent =
            'Match date and time are required';

        errorDiv.style.display =
            'block';

        return;
    }

    if (!tossWinner || !tossDecision) {
        errorDiv.textContent =
            'Toss information is required';

        errorDiv.style.display =
            'block';

        return;
    }

    errorDiv.style.display =
        'none';

    renderPlayingXISelection(
        team1Id,
        team2Id
    );

    document.getElementById(
        'match-setup-step-1'
    ).classList.remove('active');

    document.getElementById(
        'match-setup-step-2'
    ).classList.add('active');
}

function renderPlayingXISelection(team1Id, team2Id) {

    const team1 = getTeam(team1Id);
    const team2 = getTeam(team2Id);

    const team1Title =
        document.getElementById(
            'team1-playing-xi-title'
        );

    team1Title.textContent =
        team1.name;


    const team1PlayersDiv =
        document.getElementById(
            'team1-xi-players'
        );

    team1PlayersDiv.innerHTML =
        '';

    const team1Players =
        getPlayersByTeam(team1Id);

    team1Players.forEach(player => {

        const checkboxDiv =
            document.createElement('div');

        checkboxDiv.className =
            'xi-player-checkbox';

        const checkbox =
            document.createElement('input');

        checkbox.type =
            'checkbox';

        checkbox.value =
            player.id;

        checkbox.className =
            'team1-xi-checkbox';

        checkbox.id =
            `team1-player-${player.id}`;


        const label =
            document.createElement('label');

        label.htmlFor =
            `team1-player-${player.id}`;

        label.textContent =
            player.name +
            (player.number
                ? ` (${player.number})`
                : '');


        checkboxDiv.appendChild(
            checkbox
        );

        checkboxDiv.appendChild(
            label
        );

        team1PlayersDiv.appendChild(
            checkboxDiv
        );

        checkbox.addEventListener(
            'change',
            updateTeam1XICount
        );
    });


    const team2Title =
        document.getElementById(
            'team2-playing-xi-title'
        );

    team2Title.textContent =
        team2.name;


    const team2PlayersDiv =
        document.getElementById(
            'team2-xi-players'
        );

    team2PlayersDiv.innerHTML =
        '';

    const team2Players =
        getPlayersByTeam(team2Id);

    team2Players.forEach(player => {

        const checkboxDiv =
            document.createElement('div');

        checkboxDiv.className =
            'xi-player-checkbox';

        const checkbox =
            document.createElement('input');

        checkbox.type =
            'checkbox';

        checkbox.value =
            player.id;

        checkbox.className =
            'team2-xi-checkbox';

        checkbox.id =
            `team2-player-${player.id}`;


        const label =
            document.createElement('label');

        label.htmlFor =
            `team2-player-${player.id}`;

        label.textContent =
            player.name +
            (player.number
                ? ` (${player.number})`
                : '');


        checkboxDiv.appendChild(
            checkbox
        );

        checkboxDiv.appendChild(
            label
        );

        team2PlayersDiv.appendChild(
            checkboxDiv
        );

        checkbox.addEventListener(
            'change',
            updateTeam2XICount
        );
    });


    updateTeam1XICount();
    updateTeam2XICount();
}

function updateTeam1XICount() {

    const checkboxes =
        document.querySelectorAll(
            '.team1-xi-checkbox:checked'
        );

    const countSpan =
        document.getElementById(
            'team1-xi-count'
        );

    countSpan.textContent =
        checkboxes.length + ' / 11';
}

function updateTeam2XICount() {

    const checkboxes =
        document.querySelectorAll(
            '.team2-xi-checkbox:checked'
        );

    const countSpan =
        document.getElementById(
            'team2-xi-count'
        );

    countSpan.textContent =
        checkboxes.length + ' / 11';
}

function startMatch() {

    const team1Id =
        document.getElementById(
            'match-team1'
        ).value;

    const team2Id =
        document.getElementById(
            'match-team2'
        ).value;

    const overs =
        document.getElementById(
            'match-overs'
        ).value;

    const matchDate =
        document.getElementById(
            'match-date'
        ).value;

    const matchTime =
        document.getElementById(
            'match-time'
        ).value;

    const venue =
        document.getElementById(
            'match-venue'
        ).value;

    const tossWinner =
        document.getElementById(
            'match-toss-winner'
        ).value;

    const tossDecision =
        document.getElementById(
            'match-toss-decision'
        ).value;


    const team1XI =
        Array.from(
            document.querySelectorAll(
                '.team1-xi-checkbox:checked'
            )
        ).map(cb => cb.value);


    const team2XI =
        Array.from(
            document.querySelectorAll(
                '.team2-xi-checkbox:checked'
            )
        ).map(cb => cb.value);


    const match =
        createMatch(
            CurrentState.currentTournamentId,
            team1Id,
            team2Id,
            overs,
            matchDate,
            matchTime,
            venue,
            tossWinner,
            tossDecision,
            team1XI,
            team2XI
        );


    if (match) {

        CurrentState.currentMatchId =
            match.id;

        updateMatchStatus(
            match.id,
            'In Progress'
        );

        showAlert(
            'Match created successfully!'
        );

        showLiveScoring();
    }
}


/* ========================================================= */
/* ===== VERSION 1.3 LIVE BALL-BY-BALL SCORING ============= */
/* ========================================================= */


/* ===== INITIALIZE LIVE INNINGS ===== */

function initializeLiveScoring(match) {

    if (!match.innings ||
        !Array.isArray(match.innings)) {

        match.innings = [];
    }


    /* Create first innings if it does not exist */

    if (match.innings.length === 0) {

        let battingTeamId;

        if (match.tossDecision === 'bat') {

            battingTeamId =
                match.tossWinnerId;

        } else {

            battingTeamId =
                match.team1Id === match.tossWinnerId
                    ? match.team2Id
                    : match.team1Id;
        }


        const bowlingTeamId =
            battingTeamId === match.team1Id
                ? match.team2Id
                : match.team1Id;


        match.innings.push({

            inningsNumber: 1,

            battingTeamId:
                battingTeamId,

            bowlingTeamId:
                bowlingTeamId,

            runs: 0,

            wickets: 0,

            balls: 0,

            totalBalls: 0,

            ballsHistory: [],

            completed: false
        });


        saveToLocalStorage();
    }


    LiveState.inningsIndex =
        match.innings.length - 1;


    const innings =
        match.innings[
            LiveState.inningsIndex
        ];


    const battingXI =
        innings.battingTeamId === match.team1Id
            ? match.team1PlayingXI
            : match.team2PlayingXI;


    const bowlingXI =
        innings.bowlingTeamId === match.team1Id
            ? match.team1PlayingXI
            : match.team2PlayingXI;


    /* Set first two batsmen */

    if (
        (!LiveState.strikerId ||
         !getPlayer(LiveState.strikerId)) &&
        battingXI &&
        battingXI.length >= 2
    ) {

        LiveState.strikerId =
            battingXI[0];

        LiveState.nonStrikerId =
            battingXI[1];
    }


    /* Set first bowler */

    if (
        (!LiveState.bowlerId ||
         !getPlayer(LiveState.bowlerId)) &&
        bowlingXI &&
        bowlingXI.length > 0
    ) {

        LiveState.bowlerId =
            bowlingXI[0];
    }
}


/* ===== LIVE HELPERS ===== */

function getLivePlayerName(playerId) {

    const player =
        getPlayer(playerId);

    return player
        ? player.name
        : 'Unknown';
}

function getCurrentInnings(match) {

    return match.innings[
        LiveState.inningsIndex
    ];
}

function formatOvers(innings) {

    const completedOvers =
        Math.floor(innings.balls / 6);

    const balls =
        innings.balls % 6;

    return completedOvers + '.' + balls;
}


/* ===== RENDER LIVE SCORING SCREEN ===== */

function renderLiveScoring() {

    const match =
        getMatch(
            CurrentState.currentMatchId
        );


    if (!match) {

        showAlert(
            'Match not found.'
        );

        showTournamentDashboard(
            CurrentState.currentTournamentId
        );

        return;
    }


    initializeLiveScoring(match);


    const innings =
        getCurrentInnings(match);


    const battingTeam =
        getTeam(
            innings.battingTeamId
        );


    const bowlingTeam =
        getTeam(
            innings.bowlingTeamId
        );


    if (!battingTeam || !bowlingTeam) {

        showAlert(
            'Team information not found.'
        );

        return;
    }


    const screen =
        document.getElementById(
            'live-scoring-screen'
        );


    screen.innerHTML = `

        <header class="app-header">

            <button
                id="btn-back-from-live-scoring"
                class="btn-back"
            >
                ← Back
            </button>

            <h2>Live Scoring</h2>

        </header>


        <div class="content">


            <div class="section-title">
                ${escapeHtml(battingTeam.name)}
            </div>


            <div class="score-card">

                <h1 id="live-score">
                    ${innings.runs}/${innings.wickets}
                </h1>


                <p>
                    Overs:
                    <strong id="live-overs">
                        ${formatOvers(innings)}
                    </strong>
                    /
                    ${match.overs}
                </p>


                <p>
                    Batting:
                    <strong>
                        ${escapeHtml(battingTeam.name)}
                    </strong>
                </p>


                <p>
                    Bowling:
                    <strong>
                        ${escapeHtml(bowlingTeam.name)}
                    </strong>
                </p>

            </div>


            <div class="section-title">
                Current Players
            </div>


            <div class="score-card">

                <p>
                    🏏 Striker:
                    <strong id="live-striker">
                        ${escapeHtml(
                            getLivePlayerName(
                                LiveState.strikerId
                            )
                        )}
                    </strong>
                </p>


                <p>
                    🏏 Non-Striker:
                    <strong id="live-non-striker">
                        ${escapeHtml(
                            getLivePlayerName(
                                LiveState.nonStrikerId
                            )
                        )}
                    </strong>
                </p>


                <p>
                    🎯 Bowler:
                    <strong id="live-bowler">
                        ${escapeHtml(
                            getLivePlayerName(
                                LiveState.bowlerId
                            )
                        )}
                    </strong>
                </p>

            </div>


            <div class="section-title">
                Add Runs
            </div>


            <div class="button-group">

                <button
                    class="btn btn-secondary live-run-btn"
                    data-runs="0"
                >
                    0
                </button>


                <button
                    class="btn btn-secondary live-run-btn"
                    data-runs="1"
                >
                    1
                </button>


                <button
                    class="btn btn-secondary live-run-btn"
                    data-runs="2"
                >
                    2
                </button>


                <button
                    class="btn btn-secondary live-run-btn"
                    data-runs="3"
                >
                    3
                </button>


                <button
                    class="btn btn-primary live-run-btn"
                    data-runs="4"
                >
                    4
                </button>


                <button
                    class="btn btn-primary live-run-btn"
                    data-runs="6"
                >
                    6
                </button>

            </div>


            <div class="section-title">
                Other
            </div>


            <div class="button-group">

                <button
                    id="btn-live-wicket"
                    class="btn btn-danger"
                >
                    Wicket
                </button>


                <button
                    id="btn-live-wide"
                    class="btn btn-secondary"
                >
                    Wide
                </button>


                <button
                    id="btn-live-noball"
                    class="btn btn-secondary"
                >
                    No Ball
                </button>

            </div>


            <div class="section-title">
                Ball History
            </div>


            <div
                id="live-ball-history"
                class="matches-list"
            >
                ${renderBallHistory(innings)}
            </div>


            <div class="button-group">

                <button
                    id="btn-live-undo"
                    class="btn btn-secondary"
                >
                    ↩ Undo Last Ball
                </button>

            </div>


        </div>
    `;


    /* ===== RUN BUTTONS ===== */

    document
        .querySelectorAll('.live-run-btn')
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    const runs =
                        parseInt(
                            button.dataset.runs
                        );

                    recordLiveBall(
                        runs,
                        'normal'
                    );
                }
            );
        });


    /* ===== WICKET ===== */

    document
        .getElementById(
            'btn-live-wicket'
        )
        .addEventListener(
            'click',
            () => {

                recordLiveBall(
                    0,
                    'wicket'
                );
            }
        );


    /* ===== WIDE ===== */

    document
        .getElementById(
            'btn-live-wide'
        )
        .addEventListener(
            'click',
            () => {

                recordLiveBall(
                    1,
                    'wide'
                );
            }
        );


    /* ===== NO BALL ===== */

    document
        .getElementById(
            'btn-live-noball'
        )
        .addEventListener(
            'click',
            () => {

                recordLiveBall(
                    1,
                    'noball'
                );
            }
        );


    /* ===== UNDO ===== */

    document
        .getElementById(
            'btn-live-undo'
        )
        .addEventListener(
            'click',
            undoLastLiveBall
        );


    /* ===== BACK ===== */

    document
        .getElementById(
            'btn-back-from-live-scoring'
        )
        .addEventListener(
            'click',
            () => {

                showTournamentDashboard(
                    CurrentState.currentTournamentId
                );
            }
        );
}


/* ===== BALL HISTORY ===== */

function renderBallHistory(innings) {

    if (
        !innings.ballsHistory ||
        innings.ballsHistory.length === 0
    ) {

        return `
            <div class="empty-state">
                <p>No balls recorded yet.</p>
            </div>
        `;
    }


    return innings.ballsHistory
        .slice()
        .reverse()
        .map((ball, index) => {

            let result = '';


            if (ball.type === 'wicket') {

                result = 'WICKET';

            } else if (ball.type === 'wide') {

                result = 'WIDE +1';

            } else if (ball.type === 'noball') {

                result = 'NO BALL +1';

            } else {

                result =
                    ball.runs +
                    ' run' +
                    (ball.runs === 1
                        ? ''
                        : 's');
            }


            return `
                <div class="match-card-details">

                    Ball ${
                        innings.ballsHistory.length -
                        index
                    }:

                    <strong>
                        ${result}
                    </strong>

                </div>
            `;
        })
        .join('');
}


/* ===== RECORD LIVE BALL ===== */

function recordLiveBall(runs, type) {

    const match =
        getMatch(
            CurrentState.currentMatchId
        );


    if (!match) {

        showAlert(
            'Match not found.'
        );

        return;
    }


    const innings =
        getCurrentInnings(match);


    if (!innings) {

        showAlert(
            'Innings not found.'
        );

        return;
    }


    if (innings.completed) {

        showAlert(
            'This innings is already complete.'
        );

        return;
    }


    /* Save previous state for Undo */

    const ballRecord = {

        runs: runs,

        type: type,

        strikerId:
            LiveState.strikerId,

        nonStrikerId:
            LiveState.nonStrikerId,

        bowlerId:
            LiveState.bowlerId,

        previousRuns:
            innings.runs,

        previousWickets:
            innings.wickets,

        previousBalls:
            innings.balls,

        previousTotalBalls:
            innings.totalBalls
    };


    /* Add runs */

    innings.runs += runs;


    /* Add wicket */

    if (type === 'wicket') {

        innings.wickets += 1;
    }


    /* Legal delivery */

    if (
        type !== 'wide' &&
        type !== 'noball'
    ) {

        innings.balls += 1;
    }


    /* Every delivery is recorded */

    innings.totalBalls += 1;


    /* Save ball */

    if (!innings.ballsHistory) {

        innings.ballsHistory = [];
    }

    innings.ballsHistory.push(
        ballRecord
    );


    /* ===== STRIKER ROTATION ===== */

    if (
        type === 'normal' ||
        type === 'wide' ||
        type === 'noball'
    ) {

        if (runs % 2 === 1) {
            swapLiveStrikers();
        }
    }


    /* End of over */

    if (
        type !== 'wide' &&
        type !== 'noball' &&
        innings.balls % 6 === 0
    ) {

        swapLiveStrikers();
    }


    /* ===== CHECK INNINGS END ===== */

    const maxBalls =
        match.overs * 6;


    if (
        innings.balls >= maxBalls ||
        innings.wickets >= 10
    ) {

        innings.completed = true;

        showAlert(
            'Innings completed!'
        );
    }


    saveToLocalStorage();


    /* Refresh screen */

    renderLiveScoring();
}


/* ===== SWAP STRIKERS ===== */

function swapLiveStrikers() {

    const temp =
        LiveState.strikerId;

    LiveState.strikerId =
        LiveState.nonStrikerId;

    LiveState.nonStrikerId =
        temp;
}


/* ===== UNDO LAST BALL ===== */

function undoLastLiveBall() {

    const match =
        getMatch(
            CurrentState.currentMatchId
        );


    if (!match) {
        return;
    }


    const innings =
        getCurrentInnings(match);


    if (
        !innings.ballsHistory ||
        innings.ballsHistory.length === 0
    ) {

        showAlert(
            'There is no ball to undo.'
        );

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


    innings.completed =
        false;


    /* Restore players */

    LiveState.strikerId =
        lastBall.strikerId;

    LiveState.nonStrikerId =
        lastBall.nonStrikerId;

    LiveState.bowlerId =
        lastBall.bowlerId;


    saveToLocalStorage();


    renderLiveScoring();
}


/* ========================================================= */
/* ===== RENDER FUNCTIONS ================================== */
/* ========================================================= */


/* ===== RENDER TOURNAMENTS ===== */

function renderTournaments() {

    const container =
        document.getElementById(
            'tournaments-list'
        );

    const noMessage =
        document.getElementById(
            'no-tournaments-message'
        );

    const tournaments =
        getAllTournaments();


    container.innerHTML = '';


    if (tournaments.length === 0) {

        noMessage.style.display =
            'block';

        return;
    }


    noMessage.style.display =
        'none';


    tournaments.forEach(tournament => {

        const teamCount =
            tournament.teamIds.length;

        const dateObj =
            new Date(tournament.date);

        const formattedDate =
            dateObj.toLocaleDateString();


        const tournamentCard =
            document.createElement('div');

        tournamentCard.className =
            'tournament-card';


        tournamentCard.innerHTML = `

            <div class="tournament-card-title">
                ${escapeHtml(tournament.name)}
            </div>

            <div class="tournament-card-details">
                <strong>Date:</strong>
                ${formattedDate}
            </div>

            ${
                tournament.location
                    ? `
                        <div class="tournament-card-details">
                            <strong>Location:</strong>
                            ${escapeHtml(
                                tournament.location
                            )}
                        </div>
                    `
                    : ''
            }

            <div class="tournament-card-details">
                <strong>Teams:</strong>
                ${teamCount}
            </div>

            <div class="tournament-card-actions">

                <button
                    class="btn btn-primary btn-open-tournament"
                    data-id="${tournament.id}"
                >
                    Open
                </button>

                <button
                    class="btn btn-danger btn-delete-tournament"
                    data-id="${tournament.id}"
                >
                    Delete
                </button>

            </div>
        `;


        container.appendChild(
            tournamentCard
        );
    });


    document
        .querySelectorAll(
            '.btn-open-tournament'
        )
        .forEach(btn => {

            btn.addEventListener(
                'click',
                e => {

                    const tournamentId =
                        e.target.dataset.id;

                    showTournamentDashboard(
                        tournamentId
                    );
                }
            );
        });


    document
        .querySelectorAll(
            '.btn-delete-tournament'
        )
        .forEach(btn => {

            btn.addEventListener(
                'click',
                e => {

                    e.stopPropagation();

                    const tournamentId =
                        e.target.dataset.id;

                    if (
                        deleteTournament(
                            tournamentId
                        )
                    ) {

                        renderTournaments();
                    }
                }
            );
        });
}


/* ===== RENDER MATCHES ===== */

function renderMatches() {

    const container =
        document.getElementById(
            'matches-list'
        );

    const noMessage =
        document.getElementById(
            'no-matches-message'
        );

    const matches =
        getMatchesByTournament(
            CurrentState.currentTournamentId
        );


    container.innerHTML = '';


    if (matches.length === 0) {

        noMessage.style.display =
            'block';

        return;
    }


    noMessage.style.display =
        'none';


    matches.forEach(match => {

        const team1 =
            getTeam(match.team1Id);

        const team2 =
            getTeam(match.team2Id);


        if (!team1 || !team2) {
            return;
        }


        const matchCard =
            document.createElement('div');

        matchCard.className =
            'match-card';


        const dateObj =
            new Date(match.matchDate);

        const formattedDate =
            dateObj.toLocaleDateString();


        matchCard.innerHTML = `

            <div class="match-card-header">

                <div class="match-card-teams">

                    ${escapeHtml(team1.name)}
                    vs
                    ${escapeHtml(team2.name)}

                </div>

                <span class="match-card-status">
                    ${escapeHtml(match.status)}
                </span>

            </div>


            <div class="match-card-details">

                <strong>Overs:</strong>
                ${match.overs}

            </div>


            <div class="match-card-details">

                <strong>Date:</strong>
                ${formattedDate}

            </div>


            <div class="match-card-details">

                <strong>Time:</strong>
                ${escapeHtml(match.matchTime)}

            </div>


            ${
                match.venue
                    ? `
                        <div class="match-card-details">

                            <strong>Venue:</strong>

                            ${escapeHtml(
                                match.venue
                            )}

                        </div>
                    `
                    : ''
            }


            <div class="match-card-actions">

                <button
                    class="btn btn-primary btn-start-match-live"
                    data-id="${match.id}"
                >
                    Start Match
                </button>


                <button
                    class="btn btn-danger btn-delete-match"
                    data-id="${match.id}"
                >
                    Delete
                </button>

            </div>
        `;


        container.appendChild(
            matchCard
        );
    });


    document
        .querySelectorAll(
            '.btn-start-match-live'
        )
        .forEach(btn => {

            btn.addEventListener(
                'click',
                e => {

                    const matchId =
                        e.target.dataset.id;

                    const match =
                        getMatch(matchId);


                    if (match) {

                        CurrentState.currentMatchId =
                            matchId;


                        updateMatchStatus(
                            matchId,
                            'In Progress'
                        );


                        showLiveScoring();
                    }
                }
            );
        });


    document
        .querySelectorAll(
            '.btn-delete-match'
        )
        .forEach(btn => {

            btn.addEventListener(
                'click',
                e => {

                    e.stopPropagation();

                    const matchId =
                        e.target.dataset.id;


                    if (
                        deleteMatch(matchId)
                    ) {

                        renderMatches();
                    }
                }
            );
        });
}


/* ===== RENDER TOURNAMENT DASHBOARD ===== */

function renderTournamentDashboard() {

    const tournament =
        getTournament(
            CurrentState.currentTournamentId
        );


    if (!tournament) {

        showHome();

        return;
    }


    document.getElementById(
        'tournament-title-display'
    ).textContent =
        tournament.name;


    document.getElementById(
        'tournament-date-display'
    ).textContent =
        new Date(
            tournament.date
        ).toLocaleDateString();


    document.getElementById(
        'tournament-location-display'
    ).textContent =
        tournament.location || '-';


    document.getElementById(
        'tournament-team-count'
    ).textContent =
        tournament.teamIds.length;


    renderMatches();


    const container =
        document.getElementById(
            'teams-list'
        );

    const noMessage =
        document.getElementById(
            'no-teams-message'
        );


    container.innerHTML = '';


    const teams =
        getTeamsByTournament(
            CurrentState.currentTournamentId
        );


    if (teams.length === 0) {

        noMessage.style.display =
            'block';

        return;
    }


    noMessage.style.display =
        'none';


    teams.forEach(team => {

        const playerCount =
            team.playerIds.length;


        const teamCard =
            document.createElement('div');

        teamCard.className =
            'team-card';


        teamCard.innerHTML = `

            <div class="team-card-info">

                <div class="team-card-name">

                    ${escapeHtml(team.name)}

                </div>


                <div class="team-card-players">

                    ${playerCount}
                    player${playerCount !== 1 ? 's' : ''}

                </div>

            </div>


            <div class="team-card-actions">

                <button
                    class="btn btn-secondary btn-open-team"
                    data-id="${team.id}"
                >
                    View
                </button>


                <button
                    class="btn btn-danger btn-delete-team-dash"
                    data-id="${team.id}"
                >
                    Delete
                </button>

            </div>
        `;


        container.appendChild(
            teamCard
        );
    });


    document
        .querySelectorAll(
            '.btn-open-team'
        )
        .forEach(btn => {

            btn.addEventListener(
                'click',
                e => {

                    const teamId =
                        e.target.dataset.id;

                    showTeamDetails(
                        teamId
                    );
                }
            );
        });


    document
        .querySelectorAll(
            '.btn-delete-team-dash'
        )
        .forEach(btn => {

            btn.addEventListener(
                'click',
                e => {

                    e.stopPropagation();

                    const teamId =
                        e.target.dataset.id;


                    if (
                        deleteTeam(teamId)
                    ) {

                        renderTournamentDashboard();
                    }
                }
            );
        });
}


/* ===== RENDER TEAM DETAILS ===== */

function renderTeamDetails() {

    const team =
        getTeam(
            CurrentState.currentTeamId
        );


    if (!team) {

        showTournamentDashboard(
            CurrentState.currentTournamentId
        );

        return;
    }


    document.getElementById(
        'team-name-display'
    ).textContent =
        team.name;


    const container =
        document.getElementById(
            'players-list'
        );

    const noMessage =
        document.getElementById(
            'no-players-message'
        );


    container.innerHTML =
        '';


    const players =
        getPlayersByTeam(
            CurrentState.currentTeamId
        );


    if (players.length === 0) {

        noMessage.style.display =
            'block';

        return;
    }


    noMessage.style.display =
        'none';


    players.forEach(player => {

        const playerCard =
            document.createElement('div');

        playerCard.className =
            'player-card';


        playerCard.innerHTML = `

            <div class="player-card-info">

                <div class="player-card-name">

                    ${escapeHtml(player.name)}

                </div>


                ${
                    player.number
                        ? `
                            <div class="player-card-number">

                                Jersey #${player.number}

                            </div>
                        `
                        : ''
                }

            </div>


            <div class="player-card-actions">

                <button
                    class="btn btn-secondary btn-edit-player"
                    data-id="${player.id}"
                >
                    Edit
                </button>


                <button
                    class="btn btn-danger btn-delete-player"
                    data-id="${player.id}"
                >
                    Delete
                </button>

            </div>
        `;


        container.appendChild(
            playerCard
        );
    });


    document
        .querySelectorAll(
            '.btn-edit-player'
        )
        .forEach(btn => {

            btn.addEventListener(
                'click',
                e => {

                    const playerId =
                        e.target.dataset.id;

                    showEditPlayer(
                        playerId
                    );
                }
            );
        });


    document
        .querySelectorAll(
            '.btn-delete-player'
        )
        .forEach(btn => {

            btn.addEventListener(
                'click',
                e => {

                    e.stopPropagation();

                    const playerId =
                        e.target.dataset.id;


                    if (
                        deletePlayer(
                            playerId
                        )
                    ) {

                        renderTeamDetails();
                    }
                }
            );
        });
}


/* ========================================================= */
/* ===== EVENT LISTENERS ================================== */
/* ========================================================= */

function setupEventListeners() {


    /* ===== HOME SCREEN ===== */

    document
        .getElementById(
            'btn-new-tournament'
        )
        .addEventListener(
            'click',
            showCreateTournament
        );


    document
        .getElementById(
            'btn-view-tournaments'
        )
        .addEventListener(
            'click',
            showSavedTournaments
        );


    /* ===== CREATE TOURNAMENT ===== */

    document
        .getElementById(
            'btn-back-home-from-create-tourn'
        )
        .addEventListener(
            'click',
            showHome
        );


    document
        .getElementById(
            'create-tournament-form'
        )
        .addEventListener(
            'submit',
            e => {

                e.preventDefault();


                const name =
                    document.getElementById(
                        'tournament-name'
                    ).value;


                const date =
                    document.getElementById(
                        'tournament-date'
                    ).value;


                const location =
                    document.getElementById(
                        'tournament-location'
                    ).value;


                if (
                    createTournament(
                        name,
                        date,
                        location
                    )
                ) {

                    showHome();
                }
            }
        );


    /* ===== SAVED TOURNAMENTS ===== */

    document
        .getElementById(
            'btn-back-home-from-saved'
        )
        .addEventListener(
            'click',
            showHome
        );


    /* ===== TOURNAMENT DASHBOARD ===== */

    document
        .getElementById(
            'btn-back-to-tournaments'
        )
        .addEventListener(
            'click',
            showSavedTournaments
        );


    document
        .getElementById(
            'btn-add-team'
        )
        .addEventListener(
            'click',
            showAddTeam
        );


    document
        .getElementById(
            'btn-create-match'
        )
        .addEventListener(
            'click',
            showMatchSetup
        );


    document
        .getElementById(
            'btn-delete-tournament'
        )
        .addEventListener(
            'click',
            () => {

                if (
                    deleteTournament(
                        CurrentState.currentTournamentId
                    )
                ) {

                    showSavedTournaments();
                }
            }
        );


    /* ===== ADD TEAM ===== */

    document
        .getElementById(
            'btn-back-to-dashboard'
        )
        .addEventListener(
            'click',
            () => {

                showTournamentDashboard(
                    CurrentState.currentTournamentId
                );
            }
        );


    document
        .getElementById(
            'add-team-form'
        )
        .addEventListener(
            'submit',
            e => {

                e.preventDefault();


                const name =
                    document.getElementById(
                        'team-name'
                    ).value;


                if (
                    createTeam(
                        CurrentState.currentTournamentId,
                        name
                    )
                ) {

                    showTournamentDashboard(
                        CurrentState.currentTournamentId
                    );
                }
            }
        );


    /* ===== TEAM DETAILS ===== */

    document
        .getElementById(
            'btn-back-to-dashboard-from-team'
        )
        .addEventListener(
            'click',
            () => {

                showTournamentDashboard(
                    CurrentState.currentTournamentId
                );
            }
        );


    document
        .getElementById(
            'btn-add-player'
        )
        .addEventListener(
            'click',
            showAddPlayer
        );


    document
        .getElementById(
            'btn-edit-team'
        )
        .addEventListener(
            'click',
            () => {

                showEditTeam(
                    CurrentState.currentTeamId
                );
            }
        );


    document
        .getElementById(
            'btn-delete-team'
        )
        .addEventListener(
            'click',
            () => {

                if (
                    deleteTeam(
                        CurrentState.currentTeamId
                    )
                ) {

                    showTournamentDashboard(
                        CurrentState.currentTournamentId
                    );
                }
            }
        );


    /* ===== ADD PLAYER ===== */

    document
        .getElementById(
            'btn-back-to-team-details'
        )
        .addEventListener(
            'click',
            () => {

                showTeamDetails(
                    CurrentState.currentTeamId
                );
            }
        );


    document
        .getElementById(
            'add-player-form'
        )
        .addEventListener(
            'submit',
            e => {

                e.preventDefault();


                const name =
                    document.getElementById(
                        'player-name'
                    ).value;


                const number =
                    document.getElementById(
                        'player-number'
                    ).value;


                if (
                    createPlayer(
                        CurrentState.currentTeamId,
                        name,
                        number
                    )
                ) {

                    showTeamDetails(
                        CurrentState.currentTeamId
                    );
                }
            }
        );


    /* ===== EDIT TEAM ===== */

    document
        .getElementById(
            'btn-back-to-team-details-from-edit'
        )
        .addEventListener(
            'click',
            () => {

                showTeamDetails(
                    CurrentState.currentTeamId
                );
            }
        );


    document
        .getElementById(
            'edit-team-form'
        )
        .addEventListener(
            'submit',
            e => {

                e.preventDefault();


                const name =
                    document.getElementById(
                        'edit-team-name'
                    ).value;


                if (
                    updateTeam(
                        CurrentState.editingTeamId,
                        name
                    )
                ) {

                    showAlert(
                        'Team updated successfully'
                    );


                    showTeamDetails(
                        CurrentState.currentTeamId
                    );
                }
            }
        );


    /* ===== EDIT PLAYER ===== */

    document
        .getElementById(
            'btn-back-to-team-details-from-edit-player'
        )
        .addEventListener(
            'click',
            () => {

                showTeamDetails(
                    CurrentState.currentTeamId
                );
            }
        );


    document
        .getElementById(
            'edit-player-form'
        )
        .addEventListener(
            'submit',
            e => {

                e.preventDefault();


                const name =
                    document.getElementById(
                        'edit-player-name'
                    ).value;


                const number =
                    document.getElementById(
                        'edit-player-number'
                    ).value;


                if (
                    updatePlayer(
                        CurrentState.editingPlayerId,
                        name,
                        number
                    )
                ) {

                    showAlert(
                        'Player updated successfully'
                    );


                    showTeamDetails(
                        CurrentState.currentTeamId
                    );
                }
            }
        );


    /* ===== MATCH SETUP ===== */

    document
        .getElementById(
            'btn-back-from-match-setup'
        )
        .addEventListener(
            'click',
            () => {

                showTournamentDashboard(
                    CurrentState.currentTournamentId
                );
            }
        );


    document
        .getElementById(
            'btn-next-to-playing-xi'
        )
        .addEventListener(
            'click',
            proceedToPlayingXI
        );


    document
        .getElementById(
            'btn-back-to-match-info'
        )
        .addEventListener(
            'click',
            () => {

                document
                    .getElementById(
                        'match-setup-step-1'
                    )
                    .classList.add('active');


                document
                    .getElementById(
                        'match-setup-step-2'
                    )
                    .classList.remove('active');
            }
        );


    document
        .getElementById(
            'btn-start-match'
        )
        .addEventListener(
            'click',
            startMatch
        );


    /* ===== LIVE SCORING ===== */

    /*
       The live scoring screen creates
       its own buttons dynamically.

       Therefore we do NOT attach the
       old placeholder listener here.
    */


    /* ===== SCORECARD PLACEHOLDER ===== */

    document
        .getElementById(
            'btn-back-from-scorecard'
        )
        .addEventListener(
            'click',
            showHome
        );


    /* ===== MATCH RESULT PLACEHOLDER ===== */

    document
        .getElementById(
            'btn-back-from-match-result'
        )
        .addEventListener(
            'click',
            showHome
        );
}


/* ========================================================= */
/* ===== INITIALIZATION ==================================== */
/* ========================================================= */

function initializeApp() {

    loadFromLocalStorage();

    setupEventListeners();

    showHome();
}


/* ===== START APP ===== */

document.addEventListener(
    'DOMContentLoaded',
    initializeApp
);
