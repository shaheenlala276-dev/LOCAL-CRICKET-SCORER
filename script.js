// ============================================================================
// LOCAL CRICKET SCORER - VERSION 6 - IMPROVED
// Enhanced UI/UX, User Feedback, and Mobile Optimization
// ============================================================================

// ============================================================================
// DATABASE & STORAGE INITIALIZATION
// ============================================================================

const DB_NAME = 'CricketScorerDB';
const DB_VERSION = 1;

let db;
let dbReady = false;

const STORES = {
    TOURNAMENTS: 'tournaments',
    TEAMS: 'teams',
    PLAYERS: 'players',
    MATCHES: 'matches',
    COMPLETED_MATCHES: 'completedMatches',
    PLAYER_STATS: 'playerStats'
};

// Global Application State
const appState = {
    currentScreen: 'home',
    currentMatchId: null,
    liveMatchState: null,
    previousScreen: 'home',
    tossWinner: null,
    pendingConfirmAction: null
};

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Database error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            dbReady = true;
            console.log('Database initialized');
            hideLoadingOverlay();
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORES.TOURNAMENTS)) {
                db.createObjectStore(STORES.TOURNAMENTS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.TEAMS)) {
                db.createObjectStore(STORES.TEAMS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.PLAYERS)) {
                db.createObjectStore(STORES.PLAYERS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.MATCHES)) {
                db.createObjectStore(STORES.MATCHES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.COMPLETED_MATCHES)) {
                db.createObjectStore(STORES.COMPLETED_MATCHES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.PLAYER_STATS)) {
                db.createObjectStore(STORES.PLAYER_STATS, { keyPath: 'playerId' });
            }
        };
    });
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Database utility functions
function dbAdd(storeName, data) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.add(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function dbPut(storeName, data) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function dbGetAll(storeName) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function dbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// ============================================================================
// USER FEEDBACK & NOTIFICATIONS
// ============================================================================

function showSuccessMessage(message) {
    const toast = document.getElementById('successToast');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

function showConfirmation(title, message, callback) {
    appState.pendingConfirmAction = callback;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    showModal('confirmationModal');
}

function executeConfirmedAction() {
    if (appState.pendingConfirmAction) {
        appState.pendingConfirmAction();
        appState.pendingConfirmAction = null;
    }
    closeModal('confirmationModal');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateUniqueId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function getTeamName(teamId) {
    const team = await dbGet(STORES.TEAMS, teamId);
    return team ? team.name : 'Unknown';
}

async function getPlayerName(playerId) {
    const player = await dbGet(STORES.PLAYERS, playerId);
    return player ? player.name : 'Unknown';
}

// ============================================================================
// TOURNAMENT MANAGEMENT
// ============================================================================

async function createTournament() {
    const name = document.getElementById('tournamentName').value.trim();
    const desc = document.getElementById('tournamentDesc').value.trim();

    if (!name) {
        showSuccessMessage('❌ Please enter tournament name');
        return;
    }

    const tournament = {
        id: generateUniqueId('tournament'),
        name,
        description: desc,
        createdAt: new Date().toISOString()
    };

    try {
        await dbPut(STORES.TOURNAMENTS, tournament);
        document.getElementById('tournamentName').value = '';
        document.getElementById('tournamentDesc').value = '';
        loadTournaments();
        updateTournamentSelects();
        showSuccessMessage('✓ Tournament created successfully');
    } catch (error) {
        console.error('Error creating tournament:', error);
        showSuccessMessage('❌ Error creating tournament');
    }
}

async function loadTournaments() {
    try {
        const tournaments = await dbGetAll(STORES.TOURNAMENTS);
        const list = document.getElementById('tournamentsList');

        if (tournaments.length === 0) {
            list.innerHTML = '<p class="empty-message">No tournaments yet. Create your first tournament above.</p>';
            return;
        }

        list.innerHTML = tournaments.map(t => `
            <div class="item">
                <div class="item-info">
                    <div class="item-name">🎯 ${t.name}</div>
                    <div class="item-detail">${t.description || 'No description'}</div>
                    <div class="item-detail">Created: ${new Date(t.createdAt).toLocaleDateString()}</div>
                </div>
                <div class="item-actions">
                    <button class="btn-secondary" onclick="confirmDeleteTournament('${t.id}')">Delete</button>
                </div>
            </div>
        `).join('');

        updateTournamentSelects();
    } catch (error) {
        console.error('Error loading tournaments:', error);
    }
}

async function confirmDeleteTournament(id) {
    showConfirmation(
        'Delete Tournament',
        'Are you sure you want to delete this tournament? This action cannot be undone.',
        async () => {
            try {
                await dbDelete(STORES.TOURNAMENTS, id);
                loadTournaments();
                updateTournamentSelects();
                showSuccessMessage('✓ Tournament deleted');
            } catch (error) {
                console.error('Error deleting tournament:', error);
                showSuccessMessage('❌ Error deleting tournament');
            }
        }
    );
}

async function updateTournamentSelects() {
    const tournaments = await dbGetAll(STORES.TOURNAMENTS);
    const selects = ['matchTournament', 'teamTournament'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const current = select.value;
            select.innerHTML = '<option value="">Select Tournament</option>' +
                tournaments.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
            select.value = current;
        }
    });
}

// ============================================================================
// TEAM MANAGEMENT
// ============================================================================

async function createTeam() {
    const name = document.getElementById('teamName').value.trim();
    const tournamentId = document.getElementById('teamTournament').value;

    if (!name || !tournamentId) {
        showSuccessMessage('❌ Please fill all fields');
        return;
    }

    const team = {
        id: generateUniqueId('team'),
        name,
        tournamentId,
        createdAt: new Date().toISOString()
    };

    try {
        await dbPut(STORES.TEAMS, team);
        document.getElementById('teamName').value = '';
        document.getElementById('teamTournament').value = '';
        loadTeams();
        updateTeamSelects();
        showSuccessMessage('✓ Team created successfully');
    } catch (error) {
        console.error('Error creating team:', error);
        showSuccessMessage('❌ Error creating team');
    }
}

async function loadTeams() {
    try {
        const teams = await dbGetAll(STORES.TEAMS);
        const list = document.getElementById('teamsList');

        if (teams.length === 0) {
            list.innerHTML = '<p class="empty-message">No teams yet. Create your first team above.</p>';
            return;
        }

        list.innerHTML = await Promise.all(teams.map(async (t) => {
            const tournament = await dbGet(STORES.TOURNAMENTS, t.tournamentId);
            return `
                <div class="item">
                    <div class="item-info">
                        <div class="item-name">👥 ${t.name}</div>
                        <div class="item-detail">Tournament: ${tournament ? tournament.name : 'Unknown'}</div>
                        <div class="item-detail">Created: ${new Date(t.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-secondary" onclick="confirmDeleteTeam('${t.id}')">Delete</button>
                    </div>
                </div>
            `;
        })).then(items => items.join(''));

        updateTeamSelects();
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

async function confirmDeleteTeam(id) {
    showConfirmation(
        'Delete Team',
        'Are you sure you want to delete this team?',
        async () => {
            try {
                await dbDelete(STORES.TEAMS, id);
                loadTeams();
                updateTeamSelects();
                showSuccessMessage('✓ Team deleted');
            } catch (error) {
                console.error('Error deleting team:', error);
                showSuccessMessage('❌ Error deleting team');
            }
        }
    );
}

async function updateTeamSelects() {
    const teams = await dbGetAll(STORES.TEAMS);
    const selects = ['matchTeamA', 'matchTeamB', 'playerTeam'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const current = select.value;
            select.innerHTML = '<option value="">Select Team</option>' +
                teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
            select.value = current;
        }
    });
}

// ============================================================================
// PLAYER MANAGEMENT
// ============================================================================

async function createPlayer() {
    const name = document.getElementById('playerName').value.trim();
    const jersey = document.getElementById('playerJerseyNo').value.trim();
    const teamId = document.getElementById('playerTeam').value;

    if (!name || !jersey || !teamId) {
        showSuccessMessage('❌ Please fill all fields');
        return;
    }

    const player = {
        id: generateUniqueId('player'),
        name,
        jerseyNo: parseInt(jersey),
        teamId,
        createdAt: new Date().toISOString()
    };

    try {
        await dbPut(STORES.PLAYERS, player);
        document.getElementById('playerName').value = '';
        document.getElementById('playerJerseyNo').value = '';
        document.getElementById('playerTeam').value = '';
        loadPlayers();
        showSuccessMessage('✓ Player created successfully');
    } catch (error) {
        console.error('Error creating player:', error);
        showSuccessMessage('❌ Error creating player');
    }
}

async function loadPlayers() {
    try {
        const players = await dbGetAll(STORES.PLAYERS);
        const list = document.getElementById('playersList');

        if (players.length === 0) {
            list.innerHTML = '<p class="empty-message">No players yet. Create your first player above.</p>';
            return;
        }

        list.innerHTML = await Promise.all(players.map(async (p) => {
            const team = await dbGet(STORES.TEAMS, p.teamId);
            return `
                <div class="item">
                    <div class="item-info">
                        <div class="item-name">🎮 #${p.jerseyNo} ${p.name}</div>
                        <div class="item-detail">Team: ${team ? team.name : 'Unknown'}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-secondary" onclick="confirmDeletePlayer('${p.id}')">Delete</button>
                    </div>
                </div>
            `;
        })).then(items => items.join(''));
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

async function confirmDeletePlayer(id) {
    showConfirmation(
        'Delete Player',
        'Are you sure you want to delete this player?',
        async () => {
            try {
                await dbDelete(STORES.PLAYERS, id);
                loadPlayers();
                showSuccessMessage('✓ Player deleted');
            } catch (error) {
                console.error('Error deleting player:', error);
                showSuccessMessage('❌ Error deleting player');
            }
        }
    );
}

// ============================================================================
// MATCH MANAGEMENT
// ============================================================================

function createNewMatchState(matchId, tournamentId, teamAId, teamBId, format, totalOvers) {
    return {
        id: matchId,
        tournamentId,
        teamA: teamAId,
        teamB: teamBId,
        format,
        totalOvers,
        createdAt: new Date().toISOString(),
        status: 'created',
        tossWinner: null,
        tossDecision: null,
        battingTeam: null,
        bowlingTeam: null,
        playingXI: {
            [teamAId]: [],
            [teamBId]: []
        },
        innings: [
            {
                number: 1,
                battingTeam: null,
                bowlingTeam: null,
                runs: 0,
                wickets: 0,
                overs: 0,
                balls: 0,
                legalBalls: 0,
                extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
                ballHistory: [],
                batsmen: {},
                bowlers: {},
                fallOfWickets: [],
                currentOver: [],
                striker: null,
                nonStriker: null,
                bowler: null,
                isCompleted: false
            },
            {
                number: 2,
                battingTeam: null,
                bowlingTeam: null,
                runs: 0,
                wickets: 0,
                overs: 0,
                balls: 0,
                legalBalls: 0,
                extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
                ballHistory: [],
                batsmen: {},
                bowlers: {},
                fallOfWickets: [],
                currentOver: [],
                striker: null,
                nonStriker: null,
                bowler: null,
                isCompleted: false,
                target: null,
                chaseRuns: 0
            }
        ],
        result: null,
        completedAt: null
    };
}

async function createMatch() {
    const tournamentId = document.getElementById('matchTournament').value;
    const teamAId = document.getElementById('matchTeamA').value;
    const teamBId = document.getElementById('matchTeamB').value;
    const format = document.getElementById('matchFormat').value;
    const customOvers = document.getElementById('matchCustomOvers').value;

    if (!tournamentId || !teamAId || !teamBId) {
        showSuccessMessage('❌ Please select tournament and both teams');
        return;
    }

    if (teamAId === teamBId) {
        showSuccessMessage('❌ Please select different teams');
        return;
    }

    let totalOvers = 20;
    if (format === 'odi') totalOvers = 50;
    else if (format === 'test') totalOvers = 90;
    else if (format === 'custom' && customOvers) totalOvers = parseInt(customOvers);

    const matchId = generateUniqueId('match');
    const matchState = createNewMatchState(matchId, tournamentId, teamAId, teamBId, format, totalOvers);

    try {
        await dbPut(STORES.MATCHES, matchState);
        appState.currentMatchId = matchId;
        appState.liveMatchState = JSON.parse(JSON.stringify(matchState));

        document.getElementById('matchTournament').value = '';
        document.getElementById('matchTeamA').value = '';
        document.getElementById('matchTeamB').value = '';
        document.getElementById('matchCustomOvers').style.display = 'none';

        loadMatches();
        switchScreen('livescoring');
        showSuccessMessage('✓ Match created successfully');
    } catch (error) {
        console.error('Error creating match:', error);
        showSuccessMessage('❌ Error creating match');
    }
}

async function loadMatches() {
    try {
        const matches = await dbGetAll(STORES.MATCHES);
        const activeMatches = matches.filter(m => m.status !== 'completed');
        const list = document.getElementById('matchesList');

        if (activeMatches.length === 0) {
            list.innerHTML = '<p class="empty-message">No active matches. Create your first match above.</p>';
            return;
        }

        list.innerHTML = await Promise.all(activeMatches.map(async (m) => {
            const teamA = await dbGet(STORES.TEAMS, m.teamA);
            const teamB = await dbGet(STORES.TEAMS, m.teamB);
            return `
                <div class="item">
                    <div class="item-info">
                        <div class="item-name">⚾ ${teamA?.name || 'Team A'} vs ${teamB?.name || 'Team B'}</div>
                        <div class="item-detail">${m.format.toUpperCase()} | Status: ${m.status}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-primary" onclick="openMatch('${m.id}')">Play</button>
                        <button class="btn-secondary" onclick="confirmDeleteMatch('${m.id}')">Delete</button>
                    </div>
                </div>
            `;
        })).then(items => items.join(''));
    } catch (error) {
        console.error('Error loading matches:', error);
    }
}

async function openMatch(matchId) {
    try {
        const match = await dbGet(STORES.MATCHES, matchId);
        if (!match) {
            showSuccessMessage('❌ Match not found');
            return;
        }

        appState.currentMatchId = matchId;
        appState.liveMatchState = JSON.parse(JSON.stringify(match));
        switchScreen('livescoring');
        updateScoringDisplay();
    } catch (error) {
        console.error('Error opening match:', error);
        showSuccessMessage('❌ Error opening match');
    }
}

async function confirmDeleteMatch(matchId) {
    showConfirmation(
        'Delete Match',
        'Are you sure you want to delete this match?',
        async () => {
            try {
                await dbDelete(STORES.MATCHES, matchId);
                loadMatches();
                showSuccessMessage('✓ Match deleted');
            } catch (error) {
                console.error('Error deleting match:', error);
                showSuccessMessage('❌ Error deleting match');
            }
        }
    );
}

// ============================================================================
// TOSS & PLAYING XI
// ============================================================================

async function conductToss() {
    if (!appState.liveMatchState) return;

    appState.liveMatchState.status = 'toss';

    const teamA = await dbGet(STORES.TEAMS, appState.liveMatchState.teamA);
    const teamB = await dbGet(STORES.TEAMS, appState.liveMatchState.teamB);

    document.getElementById('tossTeamAName').textContent = teamA?.name || 'Team A';
    document.getElementById('tossTeamBName').textContent = teamB?.name || 'Team B';

    document.getElementById('conductTossBtn').style.display = 'none';
    document.getElementById('tossDecision').style.display = 'block';
    
    showSuccessMessage('✓ Select the toss winner');
}

async function selectTossWinner(team) {
    const teamABtn = document.getElementById('tossWinnerA');
    const teamBBtn = document.getElementById('tossWinnerB');

    teamABtn.classList.remove('selected');
    teamBBtn.classList.remove('selected');

    if (team === 'teamA') {
        appState.tossWinner = appState.liveMatchState.teamA;
        teamABtn.classList.add('selected');
    } else {
        appState.tossWinner = appState.liveMatchState.teamB;
        teamBBtn.classList.add('selected');
    }

    appState.liveMatchState.tossWinner = appState.tossWinner;
    document.getElementById('tossChoiceSection').style.display = 'block';
    
    const winnerName = await getTeamName(appState.tossWinner);
    document.getElementById('tossChoiceText').textContent = `What does ${winnerName} choose?`;
}

async function setTossDecision(decision) {
    if (!appState.liveMatchState || !appState.tossWinner) return;

    appState.liveMatchState.tossDecision = decision;

    if (decision === 'bat') {
        appState.liveMatchState.battingTeam = appState.tossWinner;
        appState.liveMatchState.bowlingTeam = 
            appState.tossWinner === appState.liveMatchState.teamA 
            ? appState.liveMatchState.teamB 
            : appState.liveMatchState.teamA;
    } else {
        appState.liveMatchState.bowlingTeam = appState.tossWinner;
        appState.liveMatchState.battingTeam = 
            appState.tossWinner === appState.liveMatchState.teamA 
            ? appState.liveMatchState.teamB 
            : appState.liveMatchState.teamA;
    }

    appState.liveMatchState.innings[0].battingTeam = appState.liveMatchState.battingTeam;
    appState.liveMatchState.innings[0].bowlingTeam = appState.liveMatchState.bowlingTeam;

    document.getElementById('tossSection').style.display = 'none';
    document.getElementById('playingXISection').style.display = 'block';
    loadPlayingXIForm();
    showSuccessMessage('✓ Toss completed');
}

async function loadPlayingXIForm() {
    const teamA = await dbGet(STORES.TEAMS, appState.liveMatchState.teamA);
    const teamB = await dbGet(STORES.TEAMS, appState.liveMatchState.teamB);
    const allPlayers = await dbGetAll(STORES.PLAYERS);

    const teamAPlayers = allPlayers.filter(p => p.teamId === appState.liveMatchState.teamA);
    const teamBPlayers = allPlayers.filter(p => p.teamId === appState.liveMatchState.teamB);

    let html = `<h4>${teamA.name} Playing XI (Select 11)</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-bottom: 16px;">`;
    
    teamAPlayers.forEach(p => {
        html += `<label style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                    <input type="checkbox" class="xi-check" data-team="${appState.liveMatchState.teamA}" value="${p.id}">
                    #${p.jerseyNo} ${p.name}
                 </label>`;
    });

    html += `</div><h4>${teamB.name} Playing XI (Select 11)</h4>
             <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px;">`;

    teamBPlayers.forEach(p => {
        html += `<label style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                    <input type="checkbox" class="xi-check" data-team="${appState.liveMatchState.teamB}" value="${p.id}">
                    #${p.jerseyNo} ${p.name}
                 </label>`;
    });

    html += '</div>';
    document.getElementById('playingXIContent').innerHTML = html;
}

async function savePlayingXI() {
    const checks = document.querySelectorAll('.xi-check:checked');
    const xiTeamA = [];
    const xiTeamB = [];

    checks.forEach(check => {
        const playerId = check.value;
        const teamId = check.dataset.team;
        if (teamId === appState.liveMatchState.teamA) {
            xiTeamA.push(playerId);
        } else {
            xiTeamB.push(playerId);
        }
    });

    if (xiTeamA.length !== 11 || xiTeamB.length !== 11) {
        showSuccessMessage('❌ Please select exactly 11 players per team');
        return;
    }

    appState.liveMatchState.playingXI[appState.liveMatchState.teamA] = xiTeamA;
    appState.liveMatchState.playingXI[appState.liveMatchState.teamB] = xiTeamB;

    document.getElementById('playingXISection').style.display = 'none';
    document.getElementById('startMatchSection').style.display = 'block';
    showSuccessMessage('✓ Playing XI saved');
}

async function startMatch() {
    const match = appState.liveMatchState;
    match.status = 'playing';

    const xi = match.playingXI[match.innings[0].battingTeam];

    xi.forEach((playerId, idx) => {
        match.innings[0].batsmen[playerId] = {
            playerId,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            status: idx < 2 ? 'batting' : 'notout',
            dismissal: null
        };
    });

    match.innings[0].striker = xi[0];
    match.innings[0].nonStriker = xi[1];

    const bowlingXI = match.playingXI[match.innings[0].bowlingTeam];
    bowlingXI.forEach(playerId => {
        match.innings[0].bowlers[playerId] = {
            playerId,
            overs: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            ballsBowled: 0,
            economy: 0
        };
    });

    match.innings[0].bowler = bowlingXI[0];

    document.getElementById('startMatchSection').style.display = 'none';
    document.getElementById('scoringSection').style.display = 'block';
    document.getElementById('tossSection').style.display = 'none';

    updateScoringDisplay();
    showSuccessMessage('✓ Match started');
}

// ============================================================================
// LIVE SCORING
// ============================================================================

async function updateScoringDisplay() {
    if (!appState.liveMatchState) return;

    const match = appState.liveMatchState;
    const innings = match.innings[match.innings[0].isCompleted ? 1 : 0];
    const teamA = await dbGet(STORES.TEAMS, match.teamA);
    const teamB = await dbGet(STORES.TEAMS, match.teamB);

    document.getElementById('matchTeamsText').textContent = `${teamA?.name || 'Team A'} vs ${teamB?.name || 'Team B'}`;

    if (innings.battingTeam) {
        const battingTeamName = await getTeamName(innings.battingTeam);
        document.getElementById('matchStatusText').textContent = `Innings ${innings.number}: ${battingTeamName} batting`;
    }

    document.getElementById('currentScore').textContent = innings.runs;
    document.getElementById('currentWickets').textContent = innings.wickets;

    const overs = Math.floor(innings.legalBalls / 6);
    const balls = innings.legalBalls % 6;
    document.getElementById('currentOvers').textContent = `${overs}.${balls}`;

    const rr = innings.legalBalls > 0 ? (innings.runs / innings.legalBalls * 6).toFixed(2) : '0.00';
    document.getElementById('runRate').textContent = rr;

    if (innings.striker) {
        const strikerName = await getPlayerName(innings.striker);
        const strikerBatsman = innings.batsmen[innings.striker];
        document.getElementById('strikerDisplay').textContent = `${strikerName} (${strikerBatsman?.runs || 0}*)`;
    }

    if (innings.nonStriker) {
        const nonStrikerName = await getPlayerName(innings.nonStriker);
        const nonStrikerBatsman = innings.batsmen[innings.nonStriker];
        document.getElementById('nonStrikerDisplay').textContent = `${nonStrikerName} (${nonStrikerBatsman?.runs || 0})`;
    }

    if (innings.bowler) {
        const bowlerName = await getPlayerName(innings.bowler);
        document.getElementById('bowlerDisplay').textContent = bowlerName;
    }

    document.getElementById('ballHistoryDisplay').textContent = 
        innings.ballHistory.length > 0 
        ? innings.ballHistory.slice(-50).join(' ') 
        : 'No balls bowled';

    const legalBalls = innings.legalBalls;
    if (legalBalls >= match.totalOvers * 6 || innings.wickets >= 10) {
        if (!innings.isCompleted) {
            document.getElementById('inningsCompleteBox').style.display = 'block';
        }
    }

    if (match.innings[0].isCompleted && match.innings[1].isCompleted) {
        document.getElementById('matchCompleteBox').style.display = 'block';
    }
}

async function recordBall(runs) {
    if (!appState.liveMatchState || appState.liveMatchState.status !== 'playing') {
        showSuccessMessage('❌ Match is not in playing status');
        return;
    }

    const match = appState.liveMatchState;
    const innings = match.innings[match.innings[0].isCompleted ? 1 : 0];

    innings.runs += runs;
    innings.legalBalls++;
    innings.ballHistory.push(runs.toString());

    const striker = innings.batsmen[innings.striker];
    if (striker) {
        striker.runs += runs;
        striker.balls++;
        if (runs === 4) striker.fours++;
        if (runs === 6) striker.sixes++;
    }

    const bowler = innings.bowlers[innings.bowler];
    if (bowler) {
        bowler.ballsBowled++;
        bowler.runs += runs;
    }

    innings.currentOver.push(runs);

    if (innings.legalBalls % 6 === 0) {
        const temp = innings.striker;
        innings.striker = innings.nonStriker;
        innings.nonStriker = temp;
        innings.overs++;
        innings.currentOver = [];
    } else if (runs % 2 === 1) {
        const temp = innings.striker;
        innings.striker = innings.nonStriker;
        innings.nonStriker = temp;
    }

    await updateScoringDisplay();
}

async function recordWicket() {
    if (!appState.liveMatchState) return;
    showModal('wicketTypeModal');
}

async function recordWicketType(type) {
    if (!appState.liveMatchState) return;

    const match = appState.liveMatchState;
    const innings = match.innings[match.innings[0].isCompleted ? 1 : 0];

    innings.legalBalls++;
    innings.ballHistory.push('W');
    innings.wickets++;

    const striker = innings.batsmen[innings.striker];
    if (striker) {
        striker.status = 'out';
        striker.dismissal = type;
    }

    innings.fallOfWickets.push({
        wicket: innings.wickets,
        runs: innings.runs,
        bowler: innings.bowler,
        batsman: innings.striker
    });

    const xi = match.playingXI[innings.battingTeam];
    let nextBatsman = null;
    for (let i = 0; i < xi.length; i++) {
        const batsman = innings.batsmen[xi[i]];
        if (batsman && batsman.status !== 'out') {
            if (batsman.status === 'notout') {
                nextBatsman = xi[i];
                break;
            }
        }
    }

    if (nextBatsman) {
        innings.striker = nextBatsman;
        innings.batsmen[nextBatsman].status = 'batting';
    }

    if (innings.legalBalls % 6 === 0) {
        const temp = innings.nonStriker;
        innings.nonStriker = innings.striker;
        innings.striker = temp;
        innings.overs++;
    }

    closeModal('wicketTypeModal');
    await updateScoringDisplay();
    showSuccessMessage('✓ Wicket recorded');
}

async function recordExtra(type) {
    if (!appState.liveMatchState) return;

    const match = appState.liveMatchState;
    const innings = match.innings[match.innings[0].isCompleted ? 1 : 0];

    let runsAdded = 1;
    if (type === 'wide') {
        innings.extras.wides++;
        innings.ballHistory.push('Wd');
    } else if (type === 'noball') {
        innings.extras.noBalls++;
        innings.ballHistory.push('Nb');
    } else if (type === 'bye') {
        innings.extras.byes++;
        innings.ballHistory.push('b');
    } else if (type === 'legbye') {
        innings.extras.legByes++;
        innings.ballHistory.push('lb');
    }

    innings.extras.total += runsAdded;
    innings.runs += runsAdded;

    if (type !== 'wide' && type !== 'noball') {
        innings.legalBalls++;
        if (innings.legalBalls % 6 === 0) {
            const temp = innings.striker;
            innings.striker = innings.nonStriker;
            innings.nonStriker = temp;
            innings.overs++;
        }
    }

    await updateScoringDisplay();
}

async function undoLastBall() {
    if (!appState.liveMatchState) return;

    const match = appState.liveMatchState;
    const innings = match.innings[match.innings[0].isCompleted ? 1 : 0];

    if (innings.ballHistory.length === 0) {
        showSuccessMessage('❌ No balls to undo');
        return;
    }

    innings.ballHistory.pop();
    showSuccessMessage('↶ Last ball removed');

    await updateScoringDisplay();
}

async function changeBatsman() {
    if (!appState.liveMatchState) return;

    const match = appState.liveMatchState;
    const innings = match.innings[match.innings[0].isCompleted ? 1 : 0];
    const xi = match.playingXI[innings.battingTeam];

    const available = xi.filter(id => {
        const batsman = innings.batsmen[id];
        return batsman && batsman.status !== 'out' && id !== innings.nonStriker;
    });

    showPlayerSelectModal(available, async (playerId) => {
        innings.striker = playerId;
        innings.batsmen[playerId].status = 'batting';
        await updateScoringDisplay();
        showSuccessMessage('✓ Batsman changed');
    });
}

async function changeBowler() {
    if (!appState.liveMatchState) return;

    const match = appState.liveMatchState;
    const innings = match.innings[match.innings[0].isCompleted ? 1 : 0];
    const xi = match.playingXI[innings.bowlingTeam];

    showPlayerSelectModal(xi, async (playerId) => {
        innings.bowler = playerId;
        await updateScoringDisplay();
        showSuccessMessage('✓ Bowler changed');
    });
}

async function showPlayerSelectModal(playerIds, callback) {
    const list = document.getElementById('playerSelectList');
    let html = '';

    for (const playerId of playerIds) {
        const player = await dbGet(STORES.PLAYERS, playerId);
        html += `<div class="modal-item" onclick="selectPlayer('${playerId}')">👤 #${player.jerseyNo} ${player.name}</div>`;
    }

    list.innerHTML = html;
    window.selectPlayer = (playerId) => {
        closeModal('selectPlayerModal');
        callback(playerId);
    };
    showModal('selectPlayerModal');
}

function confirmCompleteInnings() {
    showConfirmation(
        'Complete Innings',
        'Are you sure you want to complete this innings?',
        completeInnings
    );
}

async function completeInnings() {
    if (!appState.liveMatchState) return;

    const match = appState.liveMatchState;
    const inningsIndex = match.innings[0].isCompleted ? 1 : 0;
    match.innings[inningsIndex].isCompleted = true;

    if (inningsIndex === 0) {
        const firstInningsRuns = match.innings[0].runs;
        match.innings[1].battingTeam = 
            match.innings[0].battingTeam === match.teamA ? match.teamB : match.teamA;
        match.innings[1].bowlingTeam = match.innings[0].battingTeam;
        match.innings[1].target = firstInningsRuns + 1;

        const xi = match.playingXI[match.innings[1].battingTeam];
        xi.forEach((playerId, idx) => {
            match.innings[1].batsmen[playerId] = {
                playerId,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                status: idx < 2 ? 'batting' : 'notout',
                dismissal: null
            };
        });

        match.innings[1].striker = xi[0];
        match.innings[1].nonStriker = xi[1];

        const bowlingXI = match.playingXI[match.innings[1].bowlingTeam];
        bowlingXI.forEach(playerId => {
            match.innings[1].bowlers[playerId] = {
                playerId,
                overs: 0,
                maidens: 0,
                runs: 0,
                wickets: 0,
                ballsBowled: 0,
                economy: 0
            };
        });

        match.innings[1].bowler = bowlingXI[0];

        document.getElementById('inningsCompleteBox').style.display = 'none';
        await updateScoringDisplay();
        showSuccessMessage('✓ First innings completed. Starting second innings...');
    }
}

function confirmCompleteMatch() {
    showConfirmation(
        'Complete Match',
        'Are you sure you want to complete this match? This action cannot be undone.',
        completeMatch
    );
}

async function completeMatch() {
    if (!appState.liveMatchState) return;

    const match = appState.liveMatchState;
    match.status = 'completed';
    match.completedAt = new Date().toISOString();

    const inningsOne = match.innings[0];
    const inningsTwo = match.innings[1];

    if (inningsTwo.runs > inningsOne.runs) {
        const teamName = await getTeamName(inningsTwo.battingTeam);
        match.result = `${teamName} won by ${10 - inningsTwo.wickets} wickets`;
    } else if (inningsOne.runs > inningsTwo.runs) {
        const teamName = await getTeamName(inningsOne.battingTeam);
        match.result = `${teamName} won by ${inningsOne.runs - inningsTwo.runs} runs`;
    } else {
        match.result = 'Match Tied';
    }

    try {
        const completedMatchCopy = JSON.parse(JSON.stringify(match));
        await dbPut(STORES.COMPLETED_MATCHES, completedMatchCopy);
        await dbPut(STORES.MATCHES, match);
        await updatePlayerStats(match);

        appState.liveMatchState = match;
        displayScorecard(match);
        switchScreen('scorecard');
        showSuccessMessage('✓ Match completed successfully');
    } catch (error) {
        console.error('Error completing match:', error);
        showSuccessMessage('❌ Error completing match');
    }
}

// ============================================================================
// SCORECARD DISPLAY
// ============================================================================

async function displayScorecard(match) {
    const container = document.getElementById('scorecardContent');
    const teamA = await dbGet(STORES.TEAMS, match.teamA);
    const teamB = await dbGet(STORES.TEAMS, match.teamB);
    const tournament = await dbGet(STORES.TOURNAMENTS, match.tournamentId);

    let html = '';

    // Match Result Card
    if (match.result) {
        html += `<div class="match-result-card">
            <h2>🏆 MATCH RESULT</h2>
            <p style="font-size: 18px; font-weight: 700;">${match.result}</p>
        </div>`;
    }

    // Match Info
    html += '<div class="scorecard-section">';
    html += '<h3>Match Information</h3>';
    html += '<div class="scorecard-info">';
    html += `<div class="info-card"><div class="info-label">Teams</div><div class="info-value">${teamA?.name} vs ${teamB?.name}</div></div>`;
    html += `<div class="info-card"><div class="info-label">Tournament</div><div class="info-value">${tournament?.name}</div></div>`;
    html += `<div class="info-card"><div class="info-label">Format</div><div class="info-value">${match.format.toUpperCase()}</div></div>`;
    html += `<div class="info-card"><div class="info-label">Date</div><div class="info-value">${new Date(match.createdAt).toLocaleDateString()}</div></div>`;
    html += '</div></div>';

    // Innings Scorecards
    for (let i = 0; i < 2; i++) {
        const innings = match.innings[i];
        if (!innings.battingTeam) continue;

        const battingTeam = await dbGet(STORES.TEAMS, innings.battingTeam);

        html += '<div class="scorecard-section">';
        html += `<h3>${battingTeam?.name} Innings</h3>`;

        // Batting
        html += '<h4>Batting</h4>';
        html += '<table class="scorecard-table"><tr><th>Player</th><th>Runs</th><th>Balls</th><th>4s</th><th>6s</th><th>Dismissal</th></tr>';

        for (const playerId in innings.batsmen) {
            const batsman = innings.batsmen[playerId];
            const player = await dbGet(STORES.PLAYERS, playerId);
            const dismissal = batsman.dismissal ? batsman.dismissal.toUpperCase() : (batsman.status === 'out' ? 'OUT' : 'NOT OUT');

            html += `<tr>
                <td>${player?.name}</td>
                <td>${batsman.runs}</td>
                <td>${batsman.balls}</td>
                <td>${batsman.fours}</td>
                <td>${batsman.sixes}</td>
                <td>${dismissal}</td>
            </tr>`;
        }

        html += '</table>';

        // Bowling
        html += '<h4 style="margin-top: 12px;">Bowling</h4>';
        html += '<table class="scorecard-table"><tr><th>Bowler</th><th>Overs</th><th>Runs</th><th>Wickets</th></tr>';

        for (const playerId in innings.bowlers) {
            const bowler = innings.bowlers[playerId];
            const player = await dbGet(STORES.PLAYERS, playerId);
            const overs = bowler.ballsBowled > 0 ? Math.floor(bowler.ballsBowled / 6) + '.' + (bowler.ballsBowled % 6) : '0';

            html += `<tr>
                <td>${player?.name}</td>
                <td>${overs}</td>
                <td>${bowler.runs}</td>
                <td>${bowler.wickets}</td>
            </tr>`;
        }

        html += '</table>';

        // Innings Summary
        html += '<div class="scorecard-info" style="margin-top: 12px;">';
        html += `<div class="info-card"><div class="info-label">Total</div><div class="info-value">${innings.runs}</div></div>`;
        html += `<div class="info-card"><div class="info-label">Wickets</div><div class="info-value">${innings.wickets}/10</div></div>`;
        html += `<div class="info-card"><div class="info-label">Overs</div><div class="info-value">${innings.overs}.${innings.legalBalls % 6}</div></div>`;
        html += `<div class="info-card"><div class="info-label">Extras</div><div class="info-value">${innings.extras.total}</div></div>`;
        if (innings.target) {
            html += `<div class="info-card"><div class="info-label">Target</div><div class="info-value">${innings.target}</div></div>`;
        }
        html += '</div>';

        html += '</div>';
    }

    container.innerHTML = html;
}

// ============================================================================
// MATCH HISTORY
// ============================================================================

async function loadMatchHistory() {
    try {
        const completedMatches = await dbGetAll(STORES.COMPLETED_MATCHES);
        const list = document.getElementById('matchHistoryList');

        if (completedMatches.length === 0) {
            list.innerHTML = '<p class="empty-message">No completed matches yet. Start playing to see history.</p>';
            return;
        }

        list.innerHTML = await Promise.all(completedMatches.map(async (m) => {
            const teamA = await dbGet(STORES.TEAMS, m.teamA);
            const teamB = await dbGet(STORES.TEAMS, m.teamB);

            return `
                <div class="item">
                    <div class="item-info">
                        <div class="item-name">⚾ ${teamA?.name} vs ${teamB?.name}</div>
                        <div class="item-detail">${m.format.toUpperCase()} | ${new Date(m.createdAt).toLocaleDateString()}</div>
                        <div class="item-detail" style="color: var(--success); font-weight: 600;">🏆 ${m.result}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-primary" onclick="viewCompletedMatch('${m.id}')">View</button>
                    </div>
                </div>
            `;
        })).then(items => items.join(''));
    } catch (error) {
        console.error('Error loading match history:', error);
    }
}

async function viewCompletedMatch(matchId) {
    try {
        const match = await dbGet(STORES.COMPLETED_MATCHES, matchId);
        if (!match) {
            showSuccessMessage('❌ Match not found');
            return;
        }

        appState.liveMatchState = match;
        displayScorecard(match);
        switchScreen('scorecard');
    } catch (error) {
        console.error('Error viewing match:', error);
        showSuccessMessage('❌ Error viewing match');
    }
}

// ============================================================================
// STATISTICS
// ============================================================================

async function updatePlayerStats(match) {
    for (let inningsIdx = 0; inningsIdx < 2; inningsIdx++) {
        const innings = match.innings[inningsIdx];

        // Batting stats
        for (const playerId in innings.batsmen) {
            const batsman = innings.batsmen[playerId];
            let stats = await dbGet(STORES.PLAYER_STATS, playerId) || {
                playerId,
                matches: 0,
                innings: 0,
                runs: 0,
                balls: 0,
                wickets: 0,
                overs: 0,
                runsConceded: 0,
                fours: 0,
                sixes: 0
            };

            stats.innings++;
            stats.runs += batsman.runs;
            stats.balls += batsman.balls;
            stats.fours += batsman.fours;
            stats.sixes += batsman.sixes;
            stats.matches = 1;

            await dbPut(STORES.PLAYER_STATS, stats);
        }

        // Bowling stats
        for (const playerId in innings.bowlers) {
            const bowler = innings.bowlers[playerId];
            let stats = await dbGet(STORES.PLAYER_STATS, playerId) || {
                playerId,
                matches: 0,
                innings: 0,
                runs: 0,
                balls: 0,
                wickets: 0,
                overs: 0,
                runsConceded: 0,
                fours: 0,
                sixes: 0
            };

            stats.wickets += bowler.wickets;
            stats.overs = (stats.overs || 0) + Math.floor(bowler.ballsBowled / 6);
            stats.runsConceded += bowler.runs;

            await dbPut(STORES.PLAYER_STATS, stats);
        }
    }
}

async function loadStatistics() {
    try {
        const stats = await dbGetAll(STORES.PLAYER_STATS);
        const list = document.getElementById('statisticsList');

        if (stats.length === 0) {
            list.innerHTML = '<p class="empty-message">No statistics yet. Complete matches to see player stats.</p>';
            return;
        }

        list.innerHTML = await Promise.all(stats.map(async (stat) => {
            const player = await dbGet(STORES.PLAYERS, stat.playerId);
            const team = player ? await dbGet(STORES.TEAMS, player.teamId) : null;
            const sr = stat.balls > 0 ? (stat.runs / stat.balls * 100).toFixed(1) : '0.0';
            const avg = stat.innings > 0 ? (stat.runs / stat.innings).toFixed(1) : '0.0';

            return `
                <div class="item">
                    <div class="item-info">
                        <div class="item-name">📊 ${player?.name}</div>
                        <div class="item-detail">Team: ${team?.name} | Runs: ${stat.runs} | Wickets: ${stat.wickets}</div>
                        <div class="item-detail">Average: ${avg} | Strike Rate: ${sr}% | Runs Conceded: ${stat.runsConceded}</div>
                    </div>
                </div>
            `;
        })).then(items => items.join(''));
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ============================================================================
// UI SCREEN MANAGEMENT
// ============================================================================

function switchScreen(screenName) {
    const screenId = screenName === 'livescoring' ? 'liveScoringScreen' : 
                    screenName === 'history' ? 'historyScreen' :
                    screenName === 'stats' ? 'statsScreen' :
                    `${screenName}Screen`;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`[data-screen="${screenName}"]`);
    if (navItem) navItem.classList.add('active');

    appState.previousScreen = appState.currentScreen;
    appState.currentScreen = screenName;

    if (screenName === 'tournaments') loadTournaments();
    else if (screenName === 'teams') loadTeams();
    else if (screenName === 'players') loadPlayers();
    else if (screenName === 'matches') loadMatches();
    else if (screenName === 'history') loadMatchHistory();
    else if (screenName === 'stats') loadStatistics();
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function goBack() {
    switchScreen(appState.previousScreen || 'home');
}

// ============================================================================
// EVENT LISTENERS & INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();

        // Format selector
        const formatSelect = document.getElementById('matchFormat');
        if (formatSelect) {
            formatSelect.addEventListener('change', (e) => {
                const customInput = document.getElementById('matchCustomOvers');
                customInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
            });
        }

        // Initialize displays
        loadTournaments();
        loadTeams();
        loadPlayers();
        loadMatches();
    } catch (error) {
        console.error('Initialization error:', error);
        hideLoadingOverlay();
    }
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});
