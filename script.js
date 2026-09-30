// ============================================================================
// LOCAL CRICKET SCORER
// Internal app version: 7 (not shown in the interface)
// ============================================================================

const APP_VERSION = 7;

// ============================================================================
// DATABASE CONSTANTS
// ============================================================================

const DB_NAME = 'CricketScorerDBv7';
const DB_VERSION = 1;

let db = null;
let dbReady = false;

const STORES = {
    TOURNAMENTS: 'tournaments',
    TEAMS: 'teams',
    PLAYERS: 'players',
    MATCHES: 'matches',
    DELIVERIES: 'deliveries',
    COMPLETED_MATCHES: 'completedMatches',
    PLAYER_STATS: 'playerStats'
};

const MIN_XI = 2;
const MAX_XI = 11;

// ============================================================================
// SCORING RULES
// ============================================================================

const WICKET_LABELS = {
    bowled: 'Bowled',
    caught: 'Caught',
    lbw: 'LBW',
    stumped: 'Stumped',
    runout: 'Run out',
    hitwicket: 'Hit wicket',
    hitball: 'Hit ball twice',
    obstruct: 'Obstructing the field',
    timeout: 'Timed out'
};

// Which dismissals are allowed on which kind of delivery.
// A no-ball can only produce: run out, hit the ball twice, obstructing the field.
// A wide can also produce stumped and hit wicket.
const WICKET_RULES = {
    'legal': ['bowled', 'caught', 'lbw', 'stumped', 'runout', 'hitwicket', 'hitball', 'obstruct', 'timeout'],
    'no-ball': ['runout', 'hitball', 'obstruct'],
    'wide': ['runout', 'stumped', 'hitwicket', 'hitball', 'obstruct']
};

// Dismissals credited to the bowler
const BOWLER_WICKETS = ['bowled', 'caught', 'lbw', 'stumped', 'hitwicket'];

// Dismissals after which runs can still be completed
const RUNS_ALLOWED_DISMISSALS = ['runout', 'obstruct', 'hitball'];

function isWicketAllowed(deliveryType, wicketType) {
    const allowed = WICKET_RULES[deliveryType] || [];
    return allowed.includes(wicketType);
}

/**
 * One delivery. Saved as plain data inside the innings.
 */
class Delivery {
    constructor() {
        this.id = newId();
        this.over = 0;
        this.ballNumber = 0;
        this.isLegal = true;
        this.deliveryType = 'legal'; // legal | no-ball | wide

        this.batRuns = 0;
        this.extraRuns = 0;   // total extras on the ball (including the 1 for a wide/no-ball)
        this.totalRuns = 0;

        this.extraType = null; // bye | legbye | penalty | wide
        this.extraCount = 0;   // runs attached to the extra (not counting the 1 for wide/no-ball)

        this.isWicket = false;
        this.wicketType = null;
        this.outPlayerId = null;

        this.striker = null;
        this.nonStriker = null;
        this.bowler = null;

        this.timestamp = new Date().toISOString();
        this.isDeadBall = false;

        this.prev = null; // snapshot used by Undo
    }
}

function isLegalBall(d) {
    return d.deliveryType === 'legal' && !d.isDeadBall;
}

// Strike rotation: odd number of runs run swaps the batters
function calculateStrikeAfterDelivery(striker, nonStriker, runsRun) {
    if (runsRun % 2 === 1) return { striker: nonStriker, nonStriker: striker };
    return { striker, nonStriker };
}

// ============================================================================
// HELPERS
// ============================================================================

let _lastId = 0;
function newId() {
    let id = Date.now();
    if (id <= _lastId) id = _lastId + 1;
    _lastId = id;
    return id;
}

function $(id) {
    return document.getElementById(id);
}

function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
}

function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

function fmtOvers(legalBalls) {
    return Math.floor(legalBalls / 6) + '.' + (legalBalls % 6);
}

function freshEntry() {
    return { type: 'legal', batRuns: null, extras: null, extraCount: 0, isWicket: false, wicketType: null };
}

// ============================================================================
// APPLICATION STATE
// ============================================================================

const appState = {
    currentScreen: 'home',
    previousScreen: 'home',
    currentTournamentId: null,
    currentTeamId: null,
    currentMatchId: null,
    liveMatchState: null,   // the full match object being scored
    draft: null,            // match being created (before it starts)
    tossWinner: null,
    matchTossChoice: null,
    deliveryEntry: freshEntry()
};

// ============================================================================
// DATABASE FUNCTIONS
// ============================================================================

function initDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB is not available'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Database is blocked by another tab'));

        request.onsuccess = () => {
            db = request.result;
            dbReady = true;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORES.TOURNAMENTS)) database.createObjectStore(STORES.TOURNAMENTS, { keyPath: 'id' });
            if (!database.objectStoreNames.contains(STORES.TEAMS)) database.createObjectStore(STORES.TEAMS, { keyPath: 'id' });
            if (!database.objectStoreNames.contains(STORES.PLAYERS)) database.createObjectStore(STORES.PLAYERS, { keyPath: 'id' });
            if (!database.objectStoreNames.contains(STORES.MATCHES)) database.createObjectStore(STORES.MATCHES, { keyPath: 'id' });
            if (!database.objectStoreNames.contains(STORES.DELIVERIES)) database.createObjectStore(STORES.DELIVERIES, { keyPath: 'id' });
            if (!database.objectStoreNames.contains(STORES.COMPLETED_MATCHES)) database.createObjectStore(STORES.COMPLETED_MATCHES, { keyPath: 'id' });
            if (!database.objectStoreNames.contains(STORES.PLAYER_STATS)) database.createObjectStore(STORES.PLAYER_STATS, { keyPath: 'playerId' });
        };
    });
}

function hideLoadingOverlay() {
    const overlay = $('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

function dbRequest(storeName, mode, action) {
    return new Promise((resolve, reject) => {
        try {
            const tx = db.transaction([storeName], mode);
            const req = action(tx.objectStore(storeName));
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        } catch (err) {
            reject(err);
        }
    });
}

function dbAdd(storeName, data) { return dbRequest(storeName, 'readwrite', s => s.add(data)); }
function dbPut(storeName, data) { return dbRequest(storeName, 'readwrite', s => s.put(data)); }
function dbGet(storeName, key) { return dbRequest(storeName, 'readonly', s => s.get(key)); }
function dbGetAll(storeName) { return dbRequest(storeName, 'readonly', s => s.getAll()); }
function dbDelete(storeName, key) { return dbRequest(storeName, 'readwrite', s => s.delete(key)); }

// ============================================================================
// UI: NAVIGATION, TOASTS, MODALS
// ============================================================================

const NAV_FOR_SCREEN = {
    home: 'home',
    matchSetup: 'matchSetup', playingXI: 'matchSetup', toss: 'matchSetup', live: 'matchSetup',
    tournaments: 'tournaments', teams: 'tournaments', players: 'tournaments',
    history: 'history', scorecard: 'history',
    stats: 'stats'
};

function goToScreen(screenName) {
    const screen = $(screenName + 'Screen');
    if (!screen) {
        console.error('Unknown screen:', screenName);
        return;
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
    appState.previousScreen = appState.currentScreen;
    appState.currentScreen = screenName;

    const navName = NAV_FOR_SCREEN[screenName];
    document.querySelectorAll('.nav-pill').forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-screen') === navName);
    });

    window.scrollTo(0, 0);
    onEnterScreen(screenName);
}

function onEnterScreen(screenName) {
    let task = null;
    switch (screenName) {
        case 'home': task = loadHome(); break;
        case 'tournaments': task = loadTournaments(); break;
        case 'teams': task = loadTeams(); break;
        case 'players': task = loadPlayers(); break;
        case 'matchSetup': task = initMatchSetup(); break;
        case 'playingXI': task = initPlayingXI(); break;
        case 'toss': task = initToss(); break;
        case 'history': task = loadHistory(); break;
        case 'stats': task = loadStats(); break;
        case 'live':
            clearDeliveryEntry();
            updateLiveDisplay();
            promptNext();
            break;
        default: break;
    }
    if (task && task.catch) task.catch(err => console.error('Screen error (' + screenName + '):', err));
}

let _successTimer = null;
let _errorTimer = null;

function showSuccessMessage(message) {
    const toast = $('successToast');
    setText('toastMessage', '✓ ' + message);
    toast.classList.add('show');
    clearTimeout(_successTimer);
    _successTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function showErrorMessage(message) {
    const toast = $('errorToast');
    setText('errorToastMessage', message);
    toast.classList.add('show');
    clearTimeout(_errorTimer);
    _errorTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function showConfirmation(title, message, callback) {
    setText('confirmTitle', title);
    setText('confirmMessage', message);
    $('confirmButton').onclick = () => {
        closeConfirmation();
        callback();
    };
    $('confirmationModal').classList.add('active');
}

function closeConfirmation() {
    $('confirmationModal').classList.remove('active');
}

/**
 * Show a list of players to choose from.
 * options: [{id, name, sub}]
 */
function pickPlayer(title, subtitle, options, onPick, allowCancel) {
    if (!options || options.length === 0) {
        showErrorMessage('No players available to select');
        return;
    }
    setText('pickerTitle', title);
    setText('pickerSub', subtitle || '');
    const list = $('pickerList');
    list.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'picker-option';
        btn.innerHTML = '<span>' + esc(opt.name) + '</span>' + (opt.sub ? '<span class="picker-sub">' + esc(opt.sub) + '</span>' : '');
        btn.addEventListener('click', () => {
            closePicker();
            onPick(opt.id);
        });
        list.appendChild(btn);
    });
    $('pickerCancel').style.display = allowCancel ? 'block' : 'none';
    $('pickerModal').classList.add('active');
}

function closePicker() {
    $('pickerModal').classList.remove('active');
}

// ============================================================================
// HOME
// ============================================================================

async function loadHome() {
    const box = $('homeResume');
    if (!box) return;
    box.innerHTML = '';
    const matches = (await dbGetAll(STORES.MATCHES)).filter(m => m.status === 'live' && m.innings);
    matches.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    matches.slice(0, 3).forEach(m => {
        const inn = curInnings(m);
        const card = document.createElement('div');
        card.className = 'card resume-card';
        card.innerHTML =
            '<div><div class="resume-label">Match in progress</div>' +
            '<div class="resume-title">' + esc(m.teamAName) + ' vs ' + esc(m.teamBName) + '</div>' +
            '<div class="resume-sub">' + esc(teamName(m, inn.battingTeamId)) + ' ' + inn.runs + '/' + inn.wickets + ' (' + fmtOvers(inn.legalBalls) + ' ov)</div></div>' +
            '<button class="btn btn-success" onclick="resumeMatch(' + m.id + ')">Resume</button>';
        box.appendChild(card);
    });
}

async function resumeMatch(matchId) {
    const match = await dbGet(STORES.MATCHES, Number(matchId));
    if (!match || !match.innings) {
        showErrorMessage('This match cannot be resumed');
        return;
    }
    appState.liveMatchState = match;
    appState.currentMatchId = match.id;
    goToScreen('live');
}

// ============================================================================
// TOURNAMENTS
// ============================================================================

async function createTournament() {
    const name = $('tournamentName').value.trim();
    const format = $('tournamentFormat').value.trim();

    if (!name || !format) {
        showErrorMessage('Enter a tournament name and format');
        return;
    }

    try {
        await dbAdd(STORES.TOURNAMENTS, { id: newId(), name, format, createdAt: new Date().toISOString() });
        showSuccessMessage('Tournament created');
        $('tournamentName').value = '';
        $('tournamentFormat').value = '';
        await loadTournaments();
    } catch (error) {
        console.error(error);
        showErrorMessage('Could not create the tournament');
    }
}

async function loadTournaments() {
    const list = $('tournamentsList');
    list.innerHTML = '';
    const tournaments = await dbGetAll(STORES.TOURNAMENTS);

    if (tournaments.length === 0) {
        list.innerHTML = '<p class="empty">No tournaments yet. Create your first one above.</p>';
        return;
    }

    tournaments.forEach(t => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML =
            '<div class="list-item-title">' + esc(t.name) + '</div>' +
            '<div class="list-item-subtitle">Format: ' + esc(t.format) + '</div>' +
            '<button class="btn btn-primary btn-sm" onclick="selectTournament(' + t.id + ')">Manage Teams</button>' +
            '<button class="btn btn-success btn-sm" onclick="newMatchInTournament(' + t.id + ')">New Match</button>';
        list.appendChild(item);
    });
}

function selectTournament(tournamentId) {
    appState.currentTournamentId = Number(tournamentId);
    goToScreen('teams');
}

function newMatchInTournament(tournamentId) {
    appState.currentTournamentId = Number(tournamentId);
    goToScreen('matchSetup');
}

// ============================================================================
// TEAMS
// ============================================================================

async function createTeam() {
    const name = $('teamName').value.trim();

    if (!name) {
        showErrorMessage('Enter a team name');
        return;
    }
    if (!appState.currentTournamentId) {
        showErrorMessage('Select a tournament first');
        return;
    }

    try {
        await dbAdd(STORES.TEAMS, {
            id: newId(),
            tournamentId: appState.currentTournamentId,
            name,
            createdAt: new Date().toISOString()
        });
        showSuccessMessage('Team created');
        $('teamName').value = '';
        await loadTeams();
    } catch (error) {
        console.error(error);
        showErrorMessage('Could not create the team');
    }
}

async function loadTeams() {
    const list = $('teamsList');
    list.innerHTML = '';

    const tournament = appState.currentTournamentId ? await dbGet(STORES.TOURNAMENTS, appState.currentTournamentId) : null;
    setText('teamsSubtitle', tournament ? tournament.name : '');

    const teams = (await dbGetAll(STORES.TEAMS)).filter(t => t.tournamentId === appState.currentTournamentId);

    if (teams.length === 0) {
        list.innerHTML = '<p class="empty">No teams yet. Create your first team above.</p>';
        return;
    }

    teams.forEach(team => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML =
            '<div class="list-item-title">' + esc(team.name) + '</div>' +
            '<button class="btn btn-primary btn-sm" onclick="selectTeam(' + team.id + ')">Manage Players</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="deleteTeam(' + team.id + ')">Delete</button>';
        list.appendChild(item);
    });
}

function selectTeam(teamId) {
    appState.currentTeamId = Number(teamId);
    goToScreen('players');
}

function deleteTeam(teamId) {
    teamId = Number(teamId);
    showConfirmation('Delete Team', 'Delete this team and its players?', async () => {
        try {
            const players = (await dbGetAll(STORES.PLAYERS)).filter(p => p.teamId === teamId);
            for (const p of players) await dbDelete(STORES.PLAYERS, p.id);
            await dbDelete(STORES.TEAMS, teamId);
            showSuccessMessage('Team deleted');
            await loadTeams();
        } catch (error) {
            console.error(error);
            showErrorMessage('Could not delete the team');
        }
    });
}

// ============================================================================
// PLAYERS
// ============================================================================

async function createPlayer() {
    const name = $('playerName').value.trim();
    const jersey = $('playerJerseyNo').value;

    if (!name || jersey === '') {
        showErrorMessage('Enter the player name and jersey number');
        return;
    }
    if (!appState.currentTeamId) {
        showErrorMessage('Select a team first');
        return;
    }

    try {
        await dbAdd(STORES.PLAYERS, {
            id: newId(),
            teamId: appState.currentTeamId,
            name,
            jersey: parseInt(jersey, 10),
            createdAt: new Date().toISOString()
        });
        showSuccessMessage('Player added');
        $('playerName').value = '';
        $('playerJerseyNo').value = '';
        await loadPlayers();
    } catch (error) {
        console.error(error);
        showErrorMessage('Could not add the player');
    }
}

async function loadPlayers() {
    const list = $('playersList');
    list.innerHTML = '';

    const team = appState.currentTeamId ? await dbGet(STORES.TEAMS, appState.currentTeamId) : null;
    setText('playersSubtitle', team ? team.name : '');

    const players = (await dbGetAll(STORES.PLAYERS)).filter(p => p.teamId === appState.currentTeamId);

    if (players.length === 0) {
        list.innerHTML = '<p class="empty">No players yet. Add your first player above.</p>';
        return;
    }

    players.forEach(player => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML =
            '<div class="list-item-title">' + esc(player.name) + '</div>' +
            (player.jersey !== null && player.jersey !== undefined ? '<div class="list-item-subtitle">Jersey #' + esc(player.jersey) + '</div>' : '') +
            '<button class="btn btn-secondary btn-sm" onclick="deletePlayer(' + player.id + ')">Delete</button>';
        list.appendChild(item);
    });
}

function deletePlayer(playerId) {
    playerId = Number(playerId);
    showConfirmation('Delete Player', 'Delete this player?', async () => {
        try {
            await dbDelete(STORES.PLAYERS, playerId);
            showSuccessMessage('Player deleted');
            await loadPlayers();
        } catch (error) {
            console.error(error);
            showErrorMessage('Could not delete the player');
        }
    });
}

// ============================================================================
// CREATE MATCH - STEP 1: TEAMS AND DETAILS
// ============================================================================

async function initMatchSetup() {
    appState.draft = null;
    const tournaments = await dbGetAll(STORES.TOURNAMENTS);
    const sel = $('matchTournament');
    sel.innerHTML = '';

    if (tournaments.length === 0) {
        sel.innerHTML = '<option value="">No tournaments yet</option>';
        $('matchTeamA').innerHTML = '<option value="">Select Team A</option>';
        $('matchTeamB').innerHTML = '<option value="">Select Team B</option>';
        setText('matchSetupHint', 'Create a tournament and at least two teams first (Tournaments tab).');
        return;
    }

    tournaments.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        sel.appendChild(opt);
    });

    const wanted = appState.currentTournamentId;
    sel.value = tournaments.some(t => t.id === wanted) ? String(wanted) : String(tournaments[0].id);

    await populateMatchTeams();
}

async function populateMatchTeams() {
    const tournamentId = Number($('matchTournament').value);
    const selA = $('matchTeamA');
    const selB = $('matchTeamB');
    selA.innerHTML = '<option value="">Select Team A</option>';
    selB.innerHTML = '<option value="">Select Team B</option>';

    if (!tournamentId) return;
    appState.currentTournamentId = tournamentId;

    const teams = (await dbGetAll(STORES.TEAMS)).filter(t => t.tournamentId === tournamentId);
    teams.forEach(team => {
        [selA, selB].forEach(sel => {
            const opt = document.createElement('option');
            opt.value = team.id;
            opt.textContent = team.name;
            sel.appendChild(opt);
        });
    });

    setText('matchSetupHint', teams.length < 2 ? 'This tournament needs at least two teams. Add teams from the Tournaments tab.' : '');
    updateTeamOptions();
}

// Team A and Team B can never be the same team
function updateTeamOptions() {
    const a = $('matchTeamA').value;
    const b = $('matchTeamB').value;
    Array.from($('matchTeamA').options).forEach(opt => { opt.disabled = opt.value !== '' && opt.value === b; });
    Array.from($('matchTeamB').options).forEach(opt => { opt.disabled = opt.value !== '' && opt.value === a; });
}

function onFormatChange() {
    const format = $('matchFormat').value;
    if (format === 't20') $('totalOvers').value = 20;
    else if (format === 'odi') $('totalOvers').value = 50;
}

async function createMatch() {
    const tournamentId = Number($('matchTournament').value);
    const teamAId = Number($('matchTeamA').value);
    const teamBId = Number($('matchTeamB').value);
    const overs = parseInt($('totalOvers').value, 10);
    const format = $('matchFormat').value;
    const title = $('matchTitle').value.trim();

    if (!tournamentId) { showErrorMessage('Select a tournament'); return; }
    if (!teamAId) { showErrorMessage('Select Team A'); return; }
    if (!teamBId) { showErrorMessage('Select Team B'); return; }
    if (teamAId === teamBId) { showErrorMessage('Team A and Team B must be different teams'); return; }
    if (!overs || overs < 1 || overs > 100) { showErrorMessage('Enter overs between 1 and 100'); return; }

    try {
        const teamA = await dbGet(STORES.TEAMS, teamAId);
        const teamB = await dbGet(STORES.TEAMS, teamBId);
        if (!teamA || !teamB) { showErrorMessage('Team not found. Select the teams again.'); return; }

        const players = await dbGetAll(STORES.PLAYERS);
        const playersA = players.filter(p => p.teamId === teamAId);
        const playersB = players.filter(p => p.teamId === teamBId);

        appState.currentTournamentId = tournamentId;
        appState.draft = {
            tournamentId,
            teamAId, teamBId,
            teamAName: teamA.name, teamBName: teamB.name,
            title,
            format,
            totalOvers: overs,
            playersA, playersB,
            xiA: playersA.slice(0, MAX_XI).map(p => p.id),
            xiB: playersB.slice(0, MAX_XI).map(p => p.id),
            tossWinnerId: null,
            tossChoice: null
        };

        goToScreen('playingXI');
    } catch (error) {
        console.error(error);
        showErrorMessage('Could not create the match');
    }
}

// ============================================================================
// CREATE MATCH - STEP 2: PLAYING XI
// ============================================================================

function initPlayingXI() {
    const d = appState.draft;
    if (!d) { goToScreen('matchSetup'); return; }
    setText('xiTitleA', d.teamAName);
    setText('xiTitleB', d.teamBName);
    renderXIList('A');
    renderXIList('B');
}

function renderXIList(side) {
    const d = appState.draft;
    if (!d) return;
    const players = side === 'A' ? d.playersA : d.playersB;
    const xi = side === 'A' ? d.xiA : d.xiB;
    const list = $('xiList' + side);
    list.innerHTML = '';

    if (players.length === 0) {
        list.innerHTML = '<p class="empty" style="grid-column:1/-1;">No players yet. Add players below.</p>';
    }

    players.forEach(p => {
        const chip = document.createElement('div');
        chip.className = 'player-option' + (xi.includes(p.id) ? ' selected' : '');
        chip.innerHTML =
            '<div class="player-option-name">' + esc(p.name) + '</div>' +
            (p.jersey !== null && p.jersey !== undefined ? '<div class="player-option-jersey">#' + esc(p.jersey) + '</div>' : '');
        chip.addEventListener('click', () => toggleXI(side, p.id));
        list.appendChild(chip);
    });

    setText('xiCount' + side, xi.length + ' selected (choose ' + MIN_XI + ' to ' + MAX_XI + ')');
}

function toggleXI(side, playerId) {
    const d = appState.draft;
    if (!d) return;
    const xi = side === 'A' ? d.xiA : d.xiB;
    const index = xi.indexOf(playerId);
    if (index >= 0) {
        xi.splice(index, 1);
    } else {
        if (xi.length >= MAX_XI) {
            showErrorMessage('A team can have at most ' + MAX_XI + ' players');
            return;
        }
        xi.push(playerId);
    }
    renderXIList(side);
}

async function quickAddPlayer(side) {
    const d = appState.draft;
    if (!d) return;
    const input = $('quickPlayer' + side);
    const name = input.value.trim();
    if (!name) { showErrorMessage('Enter the player name'); return; }

    const teamId = side === 'A' ? d.teamAId : d.teamBId;
    const player = { id: newId(), teamId, name, jersey: null, createdAt: new Date().toISOString() };

    try {
        await dbAdd(STORES.PLAYERS, player);
        const players = side === 'A' ? d.playersA : d.playersB;
        const xi = side === 'A' ? d.xiA : d.xiB;
        players.push(player);
        if (xi.length < MAX_XI) xi.push(player.id);
        input.value = '';
        renderXIList(side);
    } catch (error) {
        console.error(error);
        showErrorMessage('Could not add the player');
    }
}

function savePlayingXI() {
    const d = appState.draft;
    if (!d) { goToScreen('matchSetup'); return; }
    if (d.xiA.length < MIN_XI) { showErrorMessage(d.teamAName + ' needs at least ' + MIN_XI + ' players'); return; }
    if (d.xiB.length < MIN_XI) { showErrorMessage(d.teamBName + ' needs at least ' + MIN_XI + ' players'); return; }
    goToScreen('toss');
}

// ============================================================================
// CREATE MATCH - STEP 3: TOSS (ALWAYS DECIDED BY THE USER)
// ============================================================================

function initToss() {
    const d = appState.draft;
    if (!d) { goToScreen('matchSetup'); return; }

    d.tossWinnerId = null;
    d.tossChoice = null;
    appState.tossWinner = null;
    appState.matchTossChoice = null;

    setText('team1TossBtn', d.teamAName);
    setText('team2TossBtn', d.teamBName);
    ['team1TossBtn', 'team2TossBtn', 'tossBatBtn', 'tossBowlBtn'].forEach(id => $(id).classList.remove('selected'));
    $('tossChoiceCard').style.display = 'none';
    $('tossSummaryCard').style.display = 'none';
}

function selectTossWinner(teamIndex) {
    const d = appState.draft;
    if (!d) return;

    $('team1TossBtn').classList.toggle('selected', teamIndex === 0);
    $('team2TossBtn').classList.toggle('selected', teamIndex === 1);

    d.tossWinnerId = teamIndex === 0 ? d.teamAId : d.teamBId;
    d.tossChoice = null;
    appState.tossWinner = teamIndex;
    appState.matchTossChoice = null;

    $('tossBatBtn').classList.remove('selected');
    $('tossBowlBtn').classList.remove('selected');
    $('tossSummaryCard').style.display = 'none';

    setText('tossChoiceTitle', (teamIndex === 0 ? d.teamAName : d.teamBName) + ' won the toss. What do they choose?');
    $('tossChoiceCard').style.display = 'block';
}

function tossChoice(choice) {
    const d = appState.draft;
    if (!d || !d.tossWinnerId) { showErrorMessage('Select who won the toss first'); return; }
    if (choice !== 'bat' && choice !== 'bowl') return;

    d.tossChoice = choice;
    appState.matchTossChoice = choice;

    $('tossBatBtn').classList.toggle('selected', choice === 'bat');
    $('tossBowlBtn').classList.toggle('selected', choice === 'bowl');

    const winnerName = d.tossWinnerId === d.teamAId ? d.teamAName : d.teamBName;
    const otherName = d.tossWinnerId === d.teamAId ? d.teamBName : d.teamAName;
    const battingFirst = choice === 'bat' ? winnerName : otherName;
    setText('tossSummaryText', winnerName + ' won the toss and chose to ' + choice + '. ' + battingFirst + ' will bat first.');
    $('tossSummaryCard').style.display = 'block';
}

function teamName(m, teamId) {
    return teamId === m.teamAId ? m.teamAName : m.teamBName;
}

function newInnings(battingTeamId, bowlingTeamId) {
    return {
        battingTeamId,
        bowlingTeamId,
        runs: 0,
        wickets: 0,
        legalBalls: 0,
        extras: 0,
        striker: null,
        nonStriker: null,
        bowler: null,
        lastOverBowler: null,
        outPlayers: [],
        deliveries: [],
        status: 'live' // live | ended
    };
}

async function startMatch() {
    const d = appState.draft;
    if (!d) { showErrorMessage('Create the match first'); goToScreen('matchSetup'); return; }
    if (!d.tossWinnerId || !d.tossChoice) { showErrorMessage('Record the toss result first'); return; }
    if (d.teamAId === d.teamBId) { showErrorMessage('Team A and Team B must be different teams'); return; }

    const winnerIsA = d.tossWinnerId === d.teamAId;
    const battingFirstId = d.tossChoice === 'bat' ? d.tossWinnerId : (winnerIsA ? d.teamBId : d.teamAId);
    const bowlingFirstId = battingFirstId === d.teamAId ? d.teamBId : d.teamAId;

    const playerNames = {};
    [d.playersA, d.playersB].forEach(list => list.forEach(p => { playerNames[p.id] = p.name; }));

    const match = {
        id: newId(),
        tournamentId: d.tournamentId,
        teamAId: d.teamAId,
        teamBId: d.teamBId,
        teamAName: d.teamAName,
        teamBName: d.teamBName,
        title: d.title,
        format: d.format,
        totalOvers: d.totalOvers,
        xiA: d.xiA.slice(),
        xiB: d.xiB.slice(),
        playerNames,
        tossWinnerId: d.tossWinnerId,
        tossChoice: d.tossChoice,
        battingFirstId,
        status: 'live',
        currentInnings: 1,
        innings: [newInnings(battingFirstId, bowlingFirstId)],
        result: null,
        createdAt: new Date().toISOString()
    };

    try {
        await dbAdd(STORES.MATCHES, match);
        appState.liveMatchState = match;
        appState.currentMatchId = match.id;
        appState.draft = null;
        showSuccessMessage('Match started');
        goToScreen('live');
    } catch (error) {
        console.error(error);
        showErrorMessage('Could not start the match');
    }
}

// ============================================================================
// MATCH HELPERS
// ============================================================================

function curMatch() {
    return appState.liveMatchState;
}

function curInnings(m) {
    m = m || curMatch();
    return m && m.innings ? m.innings[m.currentInnings - 1] : null;
}

function battingXI(m, inn) {
    return inn.battingTeamId === m.teamAId ? m.xiA : m.xiB;
}

function bowlingXI(m, inn) {
    return inn.bowlingTeamId === m.teamAId ? m.xiA : m.xiB;
}

function pname(m, id) {
    if (id === null || id === undefined) return '-';
    return (m.playerNames && m.playerNames[id]) || 'Player';
}

function maxWickets(m, inn) {
    return Math.max(1, Math.min(10, battingXI(m, inn).length - 1));
}

function limitReason(m, inn) {
    if (inn.wickets >= maxWickets(m, inn)) return 'wickets';
    if (inn.legalBalls >= m.totalOvers * 6) return 'overs';
    if (m.currentInnings === 2 && inn.runs > m.innings[0].runs) return 'target';
    return null;
}

async function saveMatch(m) {
    m = m || curMatch();
    if (!m) return;
    await dbPut(STORES.MATCHES, m);
    if (m.status === 'completed') await dbPut(STORES.COMPLETED_MATCHES, m);
}

// ============================================================================
// PLAYER PROMPTS (openers, new batter, next bowler)
// ============================================================================

function promptNext() {
    const m = curMatch();
    if (!m || m.status !== 'live') return;
    if ($('pickerModal').classList.contains('active')) return;
    const inn = curInnings(m);
    if (!inn || inn.status === 'ended') return;

    if (!inn.striker || !inn.nonStriker) {
        const slot = !inn.striker ? 'striker' : 'nonStriker';
        const atCrease = [inn.striker, inn.nonStriker];
        const options = battingXI(m, inn)
            .filter(id => !inn.outPlayers.includes(id) && !atCrease.includes(id))
            .map(id => ({ id, name: pname(m, id) }));
        const opening = inn.deliveries.length === 0;
        const title = opening ? (slot === 'striker' ? 'Select the striker' : 'Select the non-striker') : 'Select the new batter';
        pickPlayer(title, teamName(m, inn.battingTeamId) + ' batting', options, async (id) => {
            inn[slot] = id;
            await saveMatch(m);
            updateLiveDisplay();
            promptNext();
        }, false);
        return;
    }

    if (!inn.bowler) {
        const all = bowlingXI(m, inn);
        let ids = all.filter(id => id !== inn.lastOverBowler);
        if (ids.length === 0) ids = all.slice();
        const options = ids.map(id => ({ id, name: pname(m, id) }));
        pickPlayer('Select the bowler', teamName(m, inn.bowlingTeamId) + ' bowling', options, async (id) => {
            inn.bowler = id;
            await saveMatch(m);
            updateLiveDisplay();
            promptNext();
        }, false);
    }
}

function changeBatter(slot) {
    const m = curMatch();
    const inn = curInnings(m);
    if (!m || !inn || m.status !== 'live') return;
    const other = slot === 'striker' ? inn.nonStriker : inn.striker;
    const options = battingXI(m, inn)
        .filter(id => !inn.outPlayers.includes(id) && id !== other)
        .map(id => ({ id, name: pname(m, id) }));
    pickPlayer(slot === 'striker' ? 'Change striker' : 'Change non-striker', '', options, async (id) => {
        inn[slot] = id;
        await saveMatch(m);
        updateLiveDisplay();
    }, true);
}

function changeStrikerBatsman() { changeBatter('striker'); }
function changeNonStrikerBatsman() { changeBatter('nonStriker'); }

async function swapStrike() {
    const m = curMatch();
    const inn = curInnings(m);
    if (!m || !inn || m.status !== 'live') return;
    const s = inn.striker;
    inn.striker = inn.nonStriker;
    inn.nonStriker = s;
    await saveMatch(m);
    updateLiveDisplay();
    promptNext();
}

function changeBowler() {
    const m = curMatch();
    const inn = curInnings(m);
    if (!m || !inn || m.status !== 'live') return;
    const all = bowlingXI(m, inn);
    const options = all.map(id => ({ id, name: pname(m, id), sub: id === inn.lastOverBowler ? 'bowled last over' : '' }));
    pickPlayer('Change bowler', teamName(m, inn.bowlingTeamId) + ' bowling', options, async (id) => {
        inn.bowler = id;
        await saveMatch(m);
        updateLiveDisplay();
    }, true);
}

// ============================================================================
// DELIVERY ENTRY
// ============================================================================

function setDeliveryType(type) {
    const e = appState.deliveryEntry;
    e.type = type;
    if (type === 'wide') {
        e.batRuns = null;
        e.extras = null;
    }
    refreshEntryUI();
}

function addBatRuns(runs) {
    const e = appState.deliveryEntry;
    if (e.type === 'wide') {
        showErrorMessage('Runs off the bat cannot be scored on a wide');
        return;
    }
    e.batRuns = runs;
    refreshEntryUI();
}

function addExtras(type) {
    const e = appState.deliveryEntry;
    if (e.type === 'wide') {
        showErrorMessage('Use the runs box for extra runs on a wide');
        return;
    }
    e.extras = e.extras === type ? null : type;
    const input = $('extraRuns');
    if (e.extras && !(parseInt(input.value, 10) > 0)) input.value = '1';
    if (!e.extras) input.value = '0';
    refreshEntryUI();
}

function toggleWicketSection() {
    const checked = $('isWicketCheckbox').checked;
    appState.deliveryEntry.isWicket = checked;
    $('wicketSection').style.display = checked ? 'block' : 'none';
    if (!checked) $('wicketType').value = '';
    refreshEntryUI();
}

// Update button highlights, wicket options and preview
function refreshEntryUI() {
    const e = appState.deliveryEntry;

    document.querySelectorAll('[data-dtype]').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-dtype') === e.type);
    });
    document.querySelectorAll('[data-runs]').forEach(btn => {
        btn.classList.toggle('selected', e.batRuns !== null && Number(btn.getAttribute('data-runs')) === e.batRuns);
        btn.classList.toggle('disabled', e.type === 'wide');
    });
    document.querySelectorAll('[data-extra]').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-extra') === e.extras);
    });

    setText('extraRunsLabel', e.type === 'wide'
        ? 'Extra runs run off the wide (added to the 1 wide)'
        : 'Runs for the selected extra');

    // Only offer dismissals that are legal for this kind of delivery
    const wicketSelect = $('wicketType');
    Array.from(wicketSelect.options).forEach(opt => {
        opt.disabled = opt.value !== '' && !isWicketAllowed(e.type, opt.value);
    });
    if (wicketSelect.value && !isWicketAllowed(e.type, wicketSelect.value)) wicketSelect.value = '';

    const needsWho = ['runout', 'obstruct'].includes(wicketSelect.value);
    $('dismissedGroup').style.display = needsWho ? 'block' : 'none';

    updateDeliveryPreview();
}

function updateDeliveryPreview() {
    const e = appState.deliveryEntry;
    const parts = [];

    if (e.type === 'no-ball') parts.push('No-ball');
    else if (e.type === 'wide') parts.push('Wide');

    if (e.batRuns !== null) parts.push(e.batRuns === 0 ? 'Dot' : e.batRuns + ' off the bat');

    const count = parseInt($('extraRuns').value, 10) || 0;
    if (e.type === 'wide' && count > 0) parts.push('+' + count + ' run' + (count === 1 ? '' : 's'));
    if (e.extras) {
        const label = { bye: 'bye', legbye: 'leg bye', penalty: 'penalty' }[e.extras];
        parts.push(count + ' ' + label + (count === 1 ? '' : 's'));
    }

    if ($('isWicketCheckbox').checked) {
        const wt = $('wicketType').value;
        parts.push(wt ? 'WICKET (' + WICKET_LABELS[wt] + ')' : 'WICKET (choose type)');
    }

    setText('deliveryText', parts.length ? parts.join(' · ') : 'No delivery entered');
}

function clearDeliveryEntry() {
    appState.deliveryEntry = freshEntry();
    $('isWicketCheckbox').checked = false;
    $('wicketSection').style.display = 'none';
    $('wicketType').value = '';
    $('dismissedBatter').value = 'striker';
    $('extraRuns').value = '0';
    refreshEntryUI();
}

// ============================================================================
// RECORD A DELIVERY
// ============================================================================

async function recordDelivery() {
    const m = curMatch();
    const inn = curInnings(m);

    if (!m || !inn || m.status !== 'live') { showErrorMessage('There is no live match'); return; }
    if (inn.status === 'ended') { showErrorMessage('This innings is complete'); return; }
    if (!inn.striker || !inn.nonStriker || !inn.bowler) {
        showErrorMessage('Select the batters and bowler first');
        promptNext();
        return;
    }

    const e = appState.deliveryEntry;
    const isWicket = $('isWicketCheckbox').checked;
    const wicketType = isWicket ? $('wicketType').value : '';
    const count = parseInt($('extraRuns').value, 10) || 0;
    const batRuns = e.batRuns === null ? 0 : e.batRuns;

    // ---- validation ----
    if (e.type === 'legal' && e.batRuns === null && !e.extras && !isWicket) {
        showErrorMessage('Choose the runs, an extra or a wicket');
        return;
    }
    if (e.extras && count < 1) {
        showErrorMessage('Enter the number of runs for the extra');
        return;
    }
    if ((e.extras === 'bye' || e.extras === 'legbye') && batRuns > 0) {
        showErrorMessage('Byes and leg byes cannot be combined with runs off the bat');
        return;
    }
    if (isWicket) {
        if (!wicketType) { showErrorMessage('Choose the wicket type'); return; }
        if (!isWicketAllowed(e.type, wicketType)) {
            showErrorMessage(e.type === 'no-ball'
                ? 'On a no-ball only run out, hit ball twice or obstructing the field is allowed'
                : 'That dismissal is not allowed on this delivery');
            return;
        }
        const runsAfterOut = batRuns > 0 || count > 0 && (e.type === 'wide' || e.extras === 'bye' || e.extras === 'legbye');
        if (!RUNS_ALLOWED_DISMISSALS.includes(wicketType) && runsAfterOut) {
            showErrorMessage('Runs cannot be scored with that dismissal');
            return;
        }
    }

    // ---- snapshot for undo ----
    const prev = {
        striker: inn.striker, nonStriker: inn.nonStriker, bowler: inn.bowler, lastOverBowler: inn.lastOverBowler,
        runs: inn.runs, wickets: inn.wickets, legalBalls: inn.legalBalls, extras: inn.extras,
        outPlayers: inn.outPlayers.slice(), status: inn.status
    };

    // ---- build the delivery ----
    const d = new Delivery();
    const penaltyRun = e.type === 'legal' ? 0 : 1; // the 1 run for a wide or no-ball
    d.deliveryType = e.type;
    d.isLegal = e.type === 'legal';
    d.over = Math.floor(inn.legalBalls / 6);
    d.ballNumber = (inn.legalBalls % 6) + (d.isLegal ? 1 : 0);
    d.batRuns = batRuns;
    d.extraType = e.type === 'wide' ? 'wide' : e.extras;
    d.extraCount = (e.type === 'wide' || e.extras) ? count : 0;
    d.extraRuns = penaltyRun + d.extraCount;
    d.totalRuns = d.batRuns + d.extraRuns;
    d.striker = inn.striker;
    d.nonStriker = inn.nonStriker;
    d.bowler = inn.bowler;
    d.prev = prev;

    // ---- strike rotation ----
    let runsRun = 0;
    if (e.type === 'wide') runsRun = d.extraCount;
    else runsRun = d.batRuns + ((e.extras === 'bye' || e.extras === 'legbye') ? d.extraCount : 0);

    let pos = calculateStrikeAfterDelivery(inn.striker, inn.nonStriker, runsRun);
    let striker = pos.striker;
    let nonStriker = pos.nonStriker;

    // ---- wicket ----
    if (isWicket) {
        const who = ['runout', 'obstruct'].includes(wicketType) && $('dismissedBatter').value === 'nonStriker'
            ? inn.nonStriker : inn.striker;
        d.isWicket = true;
        d.wicketType = wicketType;
        d.outPlayerId = who;
        if (striker === who) striker = null;
        else if (nonStriker === who) nonStriker = null;
        inn.outPlayers.push(who);
        inn.wickets += 1;
    }

    // ---- totals ----
    inn.runs += d.totalRuns;
    inn.extras += d.extraRuns;
    if (isLegalBall(d)) inn.legalBalls += 1;

    // ---- end of over ----
    if (isLegalBall(d) && inn.legalBalls % 6 === 0) {
        const tmp = striker;
        striker = nonStriker;
        nonStriker = tmp;
        inn.lastOverBowler = inn.bowler;
        inn.bowler = null;
    }

    inn.striker = striker;
    inn.nonStriker = nonStriker;
    inn.deliveries.push(Object.assign({}, d));

    // ---- innings limit ----
    if (limitReason(m, inn)) inn.status = 'ended';

    try {
        await saveMatch(m);
    } catch (error) {
        console.error(error);
        showErrorMessage('Could not save the delivery');
    }

    clearDeliveryEntry();
    updateLiveDisplay();
    promptNext();
}

// ============================================================================
// UNDO
// ============================================================================

function undoLastDelivery() {
    const m = curMatch();
    const inn = curInnings(m);
    if (!m || !inn || m.status !== 'live') { showErrorMessage('There is no live match'); return; }
    if (inn.deliveries.length === 0) { showErrorMessage('No deliveries to undo'); return; }

    showConfirmation('Undo last ball', 'Remove the last delivery?', async () => {
        const d = inn.deliveries.pop();
        const p = d.prev;
        if (p) {
            inn.striker = p.striker;
            inn.nonStriker = p.nonStriker;
            inn.bowler = p.bowler;
            inn.lastOverBowler = p.lastOverBowler;
            inn.runs = p.runs;
            inn.wickets = p.wickets;
            inn.legalBalls = p.legalBalls;
            inn.extras = p.extras;
            inn.outPlayers = p.outPlayers.slice();
            inn.status = p.status;
        }
        try {
            await saveMatch(m);
        } catch (error) {
            console.error(error);
        }
        showSuccessMessage('Last ball removed');
        updateLiveDisplay();
        promptNext();
    });
}

// ============================================================================
// LIVE DISPLAY
// ============================================================================

function deliveryToken(d) {
    if (d.isWicket) return { text: 'W', cls: 'wicket' };
    if (d.deliveryType === 'wide') return { text: 'Wd' + (d.totalRuns > 1 ? d.totalRuns : ''), cls: 'extra' };
    if (d.deliveryType === 'no-ball') return { text: 'Nb' + (d.totalRuns > 1 ? d.totalRuns : ''), cls: 'extra' };
    if (d.extraType === 'bye') return { text: 'B' + d.extraCount, cls: 'extra' };
    if (d.extraType === 'legbye') return { text: 'Lb' + d.extraCount, cls: 'extra' };
    if (d.batRuns === 4 || d.batRuns === 6) return { text: String(d.batRuns), cls: 'boundary' };
    return { text: d.batRuns === 0 ? '•' : String(d.batRuns), cls: '' };
}

function describeDelivery(d, m) {
    let s = d.over + '.' + d.ballNumber + '  ' + pname(m, d.bowler) + ' to ' + pname(m, d.striker) + ': ';
    const bits = [];
    if (d.deliveryType === 'no-ball') bits.push('No-ball');
    if (d.deliveryType === 'wide') bits.push('Wide' + (d.extraCount > 0 ? ' +' + d.extraCount : ''));
    if (d.deliveryType !== 'wide') {
        if (d.extraType === 'bye') bits.push(d.extraCount + ' bye' + (d.extraCount === 1 ? '' : 's'));
        else if (d.extraType === 'legbye') bits.push(d.extraCount + ' leg bye' + (d.extraCount === 1 ? '' : 's'));
        else if (d.extraType === 'penalty') bits.push(d.extraCount + ' penalty');
        if (d.batRuns > 0 || bits.length === 0) bits.push(d.batRuns === 0 ? 'no run' : d.batRuns + (d.batRuns === 1 ? ' run' : ' runs'));
    }
    if (d.isWicket) bits.push('OUT: ' + pname(m, d.outPlayerId) + ' (' + WICKET_LABELS[d.wicketType] + ')');
    return s + bits.join(', ');
}

function computeInningsStats(m, inn) {
    const bat = {};
    const bowl = {};
    const order = [];

    const touch = (id) => {
        if (id === null || id === undefined) return null;
        if (!bat[id]) {
            bat[id] = { id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, how: '' };
            order.push(id);
        }
        return bat[id];
    };

    inn.deliveries.forEach(d => {
        const b = touch(d.striker);
        touch(d.nonStriker);
        if (b) {
            b.runs += d.batRuns;
            if (d.deliveryType !== 'wide') b.balls += 1;
            if (d.batRuns === 4) b.fours += 1;
            if (d.batRuns === 6) b.sixes += 1;
        }
        const bw = bowl[d.bowler] || (bowl[d.bowler] = { id: d.bowler, balls: 0, runs: 0, wkts: 0 });
        if (d.deliveryType === 'legal') bw.balls += 1;
        bw.runs += d.batRuns + (d.deliveryType === 'no-ball' ? 1 : 0) + (d.deliveryType === 'wide' ? 1 + d.extraCount : 0);
        if (d.isWicket) {
            const o = touch(d.outPlayerId);
            if (o) { o.out = true; o.how = d.wicketType; }
            if (BOWLER_WICKETS.includes(d.wicketType)) bw.wkts += 1;
        }
    });

    touch(inn.striker);
    touch(inn.nonStriker);

    return { batters: order.map(id => bat[id]), bowlers: Object.keys(bowl).map(k => bowl[k]) };
}

function updateLiveDisplay() {
    const m = curMatch();
    if (!m || !m.innings) return;
    const inn = curInnings(m);
    if (!inn) return;

    setText('liveMatchTitle', (m.title ? m.title + ' · ' : '') + m.teamAName + ' vs ' + m.teamBName);
    setText('liveInningsInfo', teamName(m, inn.battingTeamId) + ' batting · Innings ' + m.currentInnings + ' · ' + m.totalOvers + ' overs');

    setText('currentScore', inn.runs);
    setText('currentWickets', inn.wickets + '/' + maxWickets(m, inn));
    setText('currentOvers', fmtOvers(inn.legalBalls));
    setText('currentRunRate', inn.legalBalls > 0 ? (inn.runs / (inn.legalBalls / 6)).toFixed(2) : '0.00');

    // Chase information
    const chase = $('liveChaseInfo');
    if (m.currentInnings === 2) {
        const target = m.innings[0].runs + 1;
        const need = target - inn.runs;
        const ballsLeft = Math.max(0, m.totalOvers * 6 - inn.legalBalls);
        let text;
        if (need <= 0) text = 'Target ' + target + ' reached';
        else {
            const rrr = ballsLeft > 0 ? (need / (ballsLeft / 6)).toFixed(2) : '-';
            text = 'Target ' + target + ' · Need ' + need + ' from ' + ballsLeft + ' balls · Required rate ' + rrr;
        }
        chase.textContent = text;
        chase.style.display = 'block';
    } else {
        chase.style.display = 'none';
    }

    // Banner and buttons
    const banner = $('liveBanner');
    const reason = limitReason(m, inn);
    if (inn.status === 'ended' && reason) {
        const messages = {
            wickets: 'All out. The innings is complete.',
            overs: 'All overs bowled. The innings is complete.',
            target: 'Target reached. The match is won.'
        };
        banner.textContent = messages[reason] + ' Tap ' + (m.currentInnings === 1 ? 'End Innings' : 'Finish Match') + ' to continue.';
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }

    const endBtn = $('endInningsBtn');
    endBtn.textContent = m.currentInnings === 1 ? 'End Innings' : 'Finish Match';
    endBtn.className = 'btn btn-block ' + (inn.status === 'ended' ? 'btn-success' : 'btn-warning');
    $('recordBtn').disabled = inn.status === 'ended';

    // Players at the crease
    const stats = computeInningsStats(m, inn);
    const batterLine = (id) => {
        if (id === null || id === undefined) return '-';
        const b = stats.batters.find(x => x.id === id);
        return pname(m, id) + (b ? ' ' + b.runs + '(' + b.balls + ')' : ' 0(0)');
    };
    setText('strikerDisplay', batterLine(inn.striker) + (inn.striker ? ' *' : ''));
    setText('nonStrikerDisplay', batterLine(inn.nonStriker));

    let bowlerText = '-';
    if (inn.bowler !== null && inn.bowler !== undefined) {
        const bw = stats.bowlers.find(x => x.id === inn.bowler);
        bowlerText = pname(m, inn.bowler) + (bw ? ' ' + fmtOvers(bw.balls) + '-' + bw.runs + '-' + bw.wkts : ' 0.0-0-0');
    }
    setText('bowlerDisplay', bowlerText);

    // This over
    const tokens = $('thisOver');
    tokens.innerHTML = '';
    if (inn.deliveries.length > 0) {
        const overIndex = inn.deliveries[inn.deliveries.length - 1].over;
        inn.deliveries.filter(d => d.over === overIndex).forEach(d => {
            const t = deliveryToken(d);
            const span = document.createElement('span');
            span.className = 'token ' + t.cls;
            span.textContent = t.text;
            tokens.appendChild(span);
        });
    }

    // Ball by ball (newest first)
    const historyDiv = $('deliveryHistory');
    historyDiv.innerHTML = '';
    if (inn.deliveries.length === 0) {
        historyDiv.innerHTML = '<p class="empty">No deliveries yet</p>';
    } else {
        inn.deliveries.slice().reverse().forEach(d => {
            const row = document.createElement('div');
            row.className = 'delivery-entry' + (d.isWicket ? ' wicket' : '');
            row.textContent = describeDelivery(d, m);
            historyDiv.appendChild(row);
        });
    }
}

// ============================================================================
// INNINGS AND MATCH COMPLETION
// ============================================================================

function completeInnings() {
    const m = curMatch();
    const inn = curInnings(m);
    if (!m || !inn || m.status !== 'live') { showErrorMessage('There is no live match'); return; }

    const first = m.currentInnings === 1;
    const title = first ? 'End innings' : 'Finish match';
    const text = first ? 'End this innings and start the second innings?' : 'Finish the match and show the result?';
    showConfirmation(title, text, () => finishInnings());
}

async function finishInnings() {
    const m = curMatch();
    const inn = curInnings(m);
    if (!m || !inn) return;

    inn.status = 'ended';

    try {
        if (m.currentInnings === 1) {
            m.currentInnings = 2;
            m.innings.push(newInnings(inn.bowlingTeamId, inn.battingTeamId));
            await saveMatch(m);
            showSuccessMessage('Innings complete. Target: ' + (inn.runs + 1));
            clearDeliveryEntry();
            updateLiveDisplay();
            promptNext();
        } else {
            m.result = computeResult(m);
            m.status = 'completed';
            m.completedAt = new Date().toISOString();
            await saveMatch(m);
            showSuccessMessage('Match complete');
            await viewScorecard(m.id);
        }
    } catch (error) {
        console.error(error);
        showErrorMessage('Could not complete the innings');
    }
}

function computeResult(m) {
    const i1 = m.innings[0];
    const i2 = m.innings[1];
    const t1 = teamName(m, i1.battingTeamId);
    const t2 = teamName(m, i2.battingTeamId);

    if (i2.runs > i1.runs) {
        const left = maxWickets(m, i2) - i2.wickets;
        return t2 + ' won by ' + left + ' wicket' + (left === 1 ? '' : 's');
    }
    if (i2.runs < i1.runs) {
        const diff = i1.runs - i2.runs;
        return t1 + ' won by ' + diff + ' run' + (diff === 1 ? '' : 's');
    }
    return 'Match tied';
}

// ============================================================================
// HISTORY AND SCORECARD
// ============================================================================

async function loadHistory() {
    const list = $('historyList');
    list.innerHTML = '';
    const matches = (await dbGetAll(STORES.MATCHES)).slice();
    matches.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    if (matches.length === 0) {
        list.innerHTML = '<p class="empty">No matches yet. Start a new match to see it here.</p>';
        return;
    }

    matches.forEach(m => {
        const item = document.createElement('div');
        item.className = 'list-item';
        const a = m.teamAName || 'Team A';
        const b = m.teamBName || 'Team B';
        const done = m.status === 'completed';
        let scoreLine = '';
        if (m.innings) {
            scoreLine = m.innings.map(inn => teamName(m, inn.battingTeamId) + ' ' + inn.runs + '/' + inn.wickets + ' (' + fmtOvers(inn.legalBalls) + ')').join('  ·  ');
        }
        item.innerHTML =
            '<div class="list-item-title">' + esc(a) + ' vs ' + esc(b) + '</div>' +
            '<div class="list-item-subtitle">' + esc(m.title ? m.title + ' · ' : '') + new Date(m.createdAt).toLocaleDateString() + ' · ' + esc(m.totalOvers) + ' overs</div>' +
            (scoreLine ? '<div class="list-item-subtitle">' + esc(scoreLine) + '</div>' : '') +
            '<div class="list-item-subtitle">' + (done
                ? '<span class="status-pill">Completed</span> ' + esc(m.result || '')
                : '<span class="status-pill live">In progress</span>') + '</div>' +
            (m.innings
                ? (done
                    ? '<button class="btn btn-primary btn-sm" onclick="viewScorecard(' + m.id + ')">Scorecard</button>'
                    : '<button class="btn btn-success btn-sm" onclick="resumeMatch(' + m.id + ')">Resume</button>')
                : '') +
            '<button class="btn btn-secondary btn-sm" onclick="deleteMatch(' + m.id + ')">Delete</button>';
        list.appendChild(item);
    });
}

function deleteMatch(matchId) {
    matchId = Number(matchId);
    showConfirmation('Delete match', 'Delete this match permanently?', async () => {
        try {
            await dbDelete(STORES.MATCHES, matchId);
            await dbDelete(STORES.COMPLETED_MATCHES, matchId);
            if (appState.currentMatchId === matchId) {
                appState.currentMatchId = null;
                appState.liveMatchState = null;
            }
            showSuccessMessage('Match deleted');
            await loadHistory();
        } catch (error) {
            console.error(error);
            showErrorMessage('Could not delete the match');
        }
    });
}

function inningsTableHTML(m, inn, index) {
    const stats = computeInningsStats(m, inn);
    const battingName = teamName(m, inn.battingTeamId);

    let html = '<div class="card"><h3>' + esc(battingName) + ' · ' + inn.runs + '/' + inn.wickets + ' (' + fmtOvers(inn.legalBalls) + ' ov)</h3>';

    html += '<div class="table-wrap"><table class="table"><thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>';
    stats.batters.forEach(b => {
        const sr = b.balls > 0 ? (b.runs / b.balls * 100).toFixed(1) : '0.0';
        const howOut = b.out ? WICKET_LABELS[b.how] : 'not out';
        html += '<tr><td>' + esc(pname(m, b.id)) + '<span class="sub">' + esc(howOut) + '</span></td><td>' + b.runs + '</td><td>' + b.balls + '</td><td>' + b.fours + '</td><td>' + b.sixes + '</td><td>' + sr + '</td></tr>';
    });
    html += '</tbody></table></div>';
    html += '<p class="list-item-subtitle">Extras: ' + inn.extras + '</p>';

    html += '<div class="table-wrap"><table class="table"><thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr></thead><tbody>';
    stats.bowlers.forEach(b => {
        const econ = b.balls > 0 ? (b.runs / (b.balls / 6)).toFixed(2) : '0.00';
        html += '<tr><td>' + esc(pname(m, b.id)) + '</td><td>' + fmtOvers(b.balls) + '</td><td>' + b.runs + '</td><td>' + b.wkts + '</td><td>' + econ + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
}

async function viewScorecard(matchId) {
    try {
        const m = await dbGet(STORES.MATCHES, Number(matchId));
        if (!m || !m.innings) { showErrorMessage('Scorecard not available'); return; }

        let html = '<div class="card"><h3>' + esc(m.teamAName) + ' vs ' + esc(m.teamBName) + '</h3>';
        if (m.status === 'completed') html += '<p class="result-text">' + esc(m.result) + '</p>';
        else html += '<p class="list-item-subtitle">Match in progress</p>';
        html += '<p class="list-item-subtitle">' + new Date(m.createdAt).toLocaleDateString() + ' · ' + esc(m.totalOvers) + ' overs</p>';
        if (m.tossWinnerId) {
            html += '<p class="list-item-subtitle">' + esc(teamName(m, m.tossWinnerId)) + ' won the toss and chose to ' + esc(m.tossChoice) + '</p>';
        }
        html += '</div>';

        m.innings.forEach((inn, i) => { html += inningsTableHTML(m, inn, i); });

        $('scorecardContent').innerHTML = html;
        goToScreen('scorecard');
    } catch (error) {
        console.error(error);
        showErrorMessage('Could not load the scorecard');
    }
}

// ============================================================================
// STATISTICS
// ============================================================================

async function loadStats() {
    const box = $('statsContent');
    box.innerHTML = '';

    const matches = (await dbGetAll(STORES.MATCHES)).filter(m => m.status === 'completed' && m.innings);

    if (matches.length === 0) {
        box.innerHTML = '<div class="card"><p class="empty">Statistics appear here once you complete a match.</p></div>';
        return;
    }

    const players = {};
    const get = (m, id) => {
        const key = id;
        if (!players[key]) players[key] = { name: pname(m, id), runs: 0, balls: 0, fours: 0, sixes: 0, innings: 0, wkts: 0, conceded: 0, bowled: 0 };
        return players[key];
    };

    matches.forEach(m => {
        m.innings.forEach(inn => {
            const s = computeInningsStats(m, inn);
            s.batters.forEach(b => {
                const p = get(m, b.id);
                p.runs += b.runs; p.balls += b.balls; p.fours += b.fours; p.sixes += b.sixes; p.innings += 1;
            });
            s.bowlers.forEach(b => {
                const p = get(m, b.id);
                p.wkts += b.wkts; p.conceded += b.runs; p.bowled += b.balls;
            });
        });
    });

    const all = Object.keys(players).map(k => players[k]);
    const topBat = all.filter(p => p.innings > 0).sort((a, b) => b.runs - a.runs).slice(0, 10);
    const topBowl = all.filter(p => p.bowled > 0).sort((a, b) => b.wkts - a.wkts || a.conceded - b.conceded).slice(0, 10);

    let html = '<div class="card"><h3>Overview</h3><p class="list-item-subtitle">Completed matches: ' + matches.length + '</p></div>';

    html += '<div class="card"><h3>Top Run Scorers</h3><div class="table-wrap"><table class="table"><thead><tr><th>Player</th><th>Inns</th><th>Runs</th><th>Balls</th><th>4s</th><th>6s</th></tr></thead><tbody>';
    topBat.forEach(p => {
        html += '<tr><td>' + esc(p.name) + '</td><td>' + p.innings + '</td><td>' + p.runs + '</td><td>' + p.balls + '</td><td>' + p.fours + '</td><td>' + p.sixes + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    html += '<div class="card"><h3>Top Wicket Takers</h3><div class="table-wrap"><table class="table"><thead><tr><th>Player</th><th>Wkts</th><th>Overs</th><th>Runs</th></tr></thead><tbody>';
    topBowl.forEach(p => {
        html += '<tr><td>' + esc(p.name) + '</td><td>' + p.wkts + '</td><td>' + fmtOvers(p.bowled) + '</td><td>' + p.conceded + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    box.innerHTML = html;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

let navReady = false;

function setupNavigation() {
    if (navReady) return;
    navReady = true;
    document.querySelectorAll('.nav-pill').forEach(btn => {
        btn.addEventListener('click', () => goToScreen(btn.getAttribute('data-screen')));
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();

    try {
        await initDB();
    } catch (error) {
        console.error('Storage error:', error);
        showErrorMessage('Storage is not available. Matches cannot be saved.');
    }

    hideLoadingOverlay();
    refreshEntryUI();
    goToScreen('home');
});
