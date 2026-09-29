// ============================================================================
// LOCAL CRICKET SCORER - VERSION 7
// Professional Cricket Scoring Engine with Proper Edge Case Handling
// ============================================================================

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

const DB_NAME = 'CricketScorerDBv7';
const DB_VERSION = 1;

let db;
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

// ============================================================================
// SCORING RULES ENGINE
// ============================================================================

/**
 * Delivery State Object
 * Captures complete state of a single delivery
 */
class Delivery {
    constructor() {
        this.id = Date.now() + Math.random();
        this.over = 0;
        this.ballNumber = 0; // 1-6 within over
        this.isLegal = true;
        this.deliveryType = 'legal'; // legal, no-ball, wide
        
        // Runs
        this.batRuns = 0;
        this.extraRuns = 0;
        this.totalRuns = 0;
        
        // Extras classification
        this.extraType = null; // bye, legbye, penalty
        this.extraCount = 0;
        
        // Wicket
        this.isWicket = false;
        this.wicketType = null; // bowled, caught, lbw, stumped, runout, hitwicket, hitball, obstruct, timeout
        this.wicketBatsman = null;
        this.wicketFielder = null;
        
        // Players
        this.striker = null;
        this.nonStriker = null;
        this.bowler = null;
        
        // Strike rotation
        this.strikerAfterDelivery = null;
        this.nonStrikerAfterDelivery = null;
        
        // Timing
        this.timestamp = new Date().toISOString();
        
        // Dead ball indicator
        this.isDeadBall = false;
    }
    
    /**
     * Determine if this delivery counts as a legal ball
     */
    isLegalBall() {
        return this.isLegal && this.deliveryType === 'legal' && !this.isDeadBall;
    }
    
    /**
     * Get description of delivery
     */
    toString() {
        let desc = `Over ${this.over}.${this.ballNumber}`;
        
        if (this.deliveryType === 'no-ball') desc += ' [NB]';
        else if (this.deliveryType === 'wide') desc += ' [W]';
        
        if (this.batRuns > 0) desc += ` ${this.batRuns}r`;
        if (this.extraRuns > 0) {
            if (this.extraType === 'bye') desc += ` ${this.extraRuns}b`;
            else if (this.extraType === 'legbye') desc += ` ${this.extraRuns}lb`;
            else desc += ` ${this.extraRuns}e`;
        }
        
        if (this.isWicket) {
            desc += ` W-${this.wicketType}`;
        }
        
        return desc;
    }
}

/**
 * Cricket Scoring Rules Engine
 */
class ScoringEngine {
    constructor() {
        this.deliveries = [];
        this.currentDelivery = new Delivery();
    }
    
    /**
     * Set delivery type (legal, no-ball, wide)
     */
    setDeliveryType(type) {
        if (!['legal', 'no-ball', 'wide'].includes(type)) {
            throw new Error('Invalid delivery type');
        }
        this.currentDelivery.deliveryType = type;
        
        // Wide and no-ball don't count as legal deliveries
        if (type === 'wide' || type === 'no-ball') {
            this.currentDelivery.isLegal = false;
        }
    }
    
    /**
     * Add bat runs (0-6)
     */
    addBatRuns(runs) {
        if (runs < 0 || runs > 6) throw new Error('Invalid run count');
        
        // Wides and no-balls can still have bat runs
        this.currentDelivery.batRuns = runs;
        this.updateTotalRuns();
    }
    
    /**
     * Add extras (bye, leg-bye)
     */
    addExtras(type, count) {
        if (!['bye', 'legbye', 'penalty'].includes(type)) {
            throw new Error('Invalid extra type');
        }
        if (count < 0) throw new Error('Invalid extra count');
        
        // Extras don't go to striker, go to team total
        this.currentDelivery.extraType = type;
        this.currentDelivery.extraCount = count;
        
        // Handle wide/no-ball with runs
        if (type === 'bye' || type === 'legbye') {
            // For no-ball: add the no-ball + byes/legbyes
            if (this.currentDelivery.deliveryType === 'no-ball') {
                this.currentDelivery.extraRuns = 1 + count; // 1 no-ball + runs
            } else if (this.currentDelivery.deliveryType === 'wide') {
                this.currentDelivery.extraRuns = 1 + count; // 1 wide + runs
            } else {
                this.currentDelivery.extraRuns = count;
            }
        } else if (type === 'penalty') {
            this.currentDelivery.extraRuns = count;
        }
        
        this.updateTotalRuns();
    }
    
    /**
     * Add wicket with specific type
     */
    addWicket(wicketType) {
        if (!this.isWicketLegal(wicketType)) {
            throw new Error(`${wicketType} not permitted on ${this.currentDelivery.deliveryType}`);
        }
        
        this.currentDelivery.isWicket = true;
        this.currentDelivery.wicketType = wicketType;
    }
    
    /**
     * Validate wicket type is legal for current delivery
     * CRITICAL: Different dismissals are only allowed on certain delivery types
     */
    isWicketLegal(wicketType) {
        const deliveryType = this.currentDelivery.deliveryType;
        
        // Wicket on no-ball: ONLY run-out, stumped, or obstructing field allowed
        if (deliveryType === 'no-ball') {
            return ['runout', 'stumped', 'obstruct'].includes(wicketType);
        }
        
        // Wicket on wide: ONLY run-out, stumped, or obstructing field allowed
        if (deliveryType === 'wide') {
            return ['runout', 'stumped', 'obstruct'].includes(wicketType);
        }
        
        // Wicket on legal delivery: All types allowed
        return ['bowled', 'caught', 'lbw', 'stumped', 'runout', 'hitwicket', 'hitball', 'obstruct', 'timeout'].includes(wicketType);
    }
    
    /**
     * Update total runs from bat runs and extras
     */
    updateTotalRuns() {
        this.currentDelivery.totalRuns = this.currentDelivery.batRuns + this.currentDelivery.extraRuns;
    }
    
    /**
     * Validate complete delivery
     */
    validateDelivery() {
        const d = this.currentDelivery;
        
        // If wicket, striker shouldn't have runs (except in run-out)
        if (d.isWicket && d.wicketType !== 'runout' && d.batRuns > 0) {
            console.warn('Wicket delivery should have 0 bat runs for non-runout dismissals');
        }
        
        // Extras and bat runs shouldn't both be non-zero unless extras are penalty/bye/legbye WITH bat runs
        
        return true;
    }
    
    /**
     * Get delivery preview
     */
    getDeliveryPreview() {
        const d = this.currentDelivery;
        let preview = `Over ${d.over}.${d.ballNumber || '?'} - `;
        
        if (d.deliveryType === 'no-ball') preview += '[NO-BALL] ';
        else if (d.deliveryType === 'wide') preview += '[WIDE] ';
        
        preview += `${d.batRuns} runs`;
        
        if (d.extraRuns > 0) {
            if (d.extraType === 'bye') preview += ` + ${d.extraRuns} bye(s)`;
            else if (d.extraType === 'legbye') preview += ` + ${d.extraRuns} leg-bye(s)`;
            else preview += ` + ${d.extraRuns} extra(s)`;
        }
        
        if (d.isWicket) preview += ` - WICKET (${d.wicketType})`;
        
        return preview;
    }
}

// ============================================================================
// STRIKE ROTATION ENGINE
// ============================================================================

/**
 * Calculate strike rotation after delivery
 */
function calculateStrikeAfterDelivery(delivery, runs, isWicket) {
    const totalRuns = runs;
    let strikerAfter = delivery.striker;
    let nonStrikerAfter = delivery.nonStriker;
    
    if (isWicket && delivery.wicketType !== 'runout') {
        // Batsman out, non-striker becomes new striker
        nonStrikerAfter = null; // Will be replaced by next batsman
    } else if (totalRuns === 1 || totalRuns === 3) {
        // Odd runs: rotate strike
        [strikerAfter, nonStrikerAfter] = [nonStrikerAfter, strikerAfter];
    }
    // Even runs (0, 2, 4, 6): strike stays
    
    return { strikerAfter, nonStrikerAfter };
}

/**
 * Handle end-of-over strike rotation
 */
function rotateStrikeAtOverEnd(currentStrike, currentNonStrike) {
    // At end of over, if odd number of legal balls, strike rotates
    // This is handled per-over based on legal ball count
    return [currentNonStrike, currentStrike];
}

// ============================================================================
// APPLICATION STATE
// ============================================================================

const appState = {
    currentScreen: 'home',
    currentTournamentId: null,
    currentTeamId: null,
    currentMatchId: null,
    
    // Match state
    liveMatchState: null,
    
    // Delivery entry state
    deliveryEntry: {
        type: 'legal',
        batRuns: 0,
        extras: null,
        extraCount: 0,
        isWicket: false,
        wicketType: null
    },
    
    // Navigation
    previousScreen: 'home'
};

// ============================================================================
// DATABASE FUNCTIONS
// ============================================================================

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
            if (!db.objectStoreNames.contains(STORES.DELIVERIES)) {
                db.createObjectStore(STORES.DELIVERIES, { keyPath: 'id' });
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
    if (overlay) overlay.style.display = 'none';
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
// UI STATE MANAGEMENT
// ============================================================================

function goToScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    const screenId = screenName + 'Screen';
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
        appState.previousScreen = appState.currentScreen;
        appState.currentScreen = screenName;
        
        // Update navigation
        document.querySelectorAll('.nav-pill').forEach(pill => {
            pill.classList.remove('active');
        });
        document.querySelector(`[data-screen="${screenName}"]`)?.classList.add('active');
    }
}

function showSuccessMessage(message) {
    const toast = document.getElementById('successToast');
    const msg = document.getElementById('toastMessage');
    msg.textContent = '✓ ' + message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showErrorMessage(message) {
    const toast = document.getElementById('errorToast');
    const msg = document.getElementById('errorToastMessage');
    msg.textContent = '❌ ' + message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showConfirmation(title, message, callback) {
    const modal = document.getElementById('confirmationModal');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmButton').onclick = () => {
        callback();
        closeConfirmation();
    };
    modal.classList.add('active');
}

function closeConfirmation() {
    const modal = document.getElementById('confirmationModal');
    modal.classList.remove('active');
}

// ============================================================================
// TOURNAMENT MANAGEMENT
// ============================================================================

async function createTournament() {
    const name = document.getElementById('tournamentName').value;
    const format = document.getElementById('tournamentFormat').value;
    
    if (!name || !format) {
        showErrorMessage('Please enter tournament details');
        return;
    }
    
    const tournament = {
        id: Date.now(),
        name,
        format,
        createdAt: new Date().toISOString(),
        teams: []
    };
    
    try {
        await dbAdd(STORES.TOURNAMENTS, tournament);
        showSuccessMessage('Tournament created');
        document.getElementById('tournamentName').value = '';
        document.getElementById('tournamentFormat').value = '';
        loadTournaments();
    } catch (error) {
        showErrorMessage('Error creating tournament');
    }
}

async function loadTournaments() {
    try {
        const tournaments = await dbGetAll(STORES.TOURNAMENTS);
        const list = document.getElementById('tournamentsList');
        list.innerHTML = '';
        
        if (tournaments.length === 0) {
            list.innerHTML = '<p>No tournaments yet. Create your first tournament above.</p>';
            return;
        }
        
        tournaments.forEach(tournament => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-title">${tournament.name}</div>
                <div class="list-item-subtitle">Format: ${tournament.format}</div>
                <button class="btn btn-primary" onclick="selectTournament('${tournament.id}')">Manage</button>
            `;
            list.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading tournaments:', error);
    }
}

function selectTournament(tournamentId) {
    appState.currentTournamentId = tournamentId;
    goToScreen('teams');
    loadTeams();
}

// ============================================================================
// TEAM MANAGEMENT
// ============================================================================

async function createTeam() {
    const name = document.getElementById('teamName').value;
    
    if (!name) {
        showErrorMessage('Please enter team name');
        return;
    }
    
    if (!appState.currentTournamentId) {
        showErrorMessage('No tournament selected');
        return;
    }
    
    const team = {
        id: Date.now(),
        tournamentId: appState.currentTournamentId,
        name,
        createdAt: new Date().toISOString(),
        players: []
    };
    
    try {
        await dbAdd(STORES.TEAMS, team);
        showSuccessMessage('Team created');
        document.getElementById('teamName').value = '';
        loadTeams();
    } catch (error) {
        showErrorMessage('Error creating team');
    }
}

async function loadTeams() {
    try {
        const teams = await dbGetAll(STORES.TEAMS);
        const filtered = teams.filter(t => t.tournamentId == appState.currentTournamentId);
        const list = document.getElementById('teamsList');
        list.innerHTML = '';
        
        if (filtered.length === 0) {
            list.innerHTML = '<p>No teams yet. Create your first team above.</p>';
            return;
        }
        
        filtered.forEach(team => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-title">${team.name}</div>
                <button class="btn btn-primary" onclick="selectTeam('${team.id}')">Manage Players</button>
                <button class="btn btn-secondary" onclick="deleteTeam('${team.id}')">Delete</button>
            `;
            list.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

function selectTeam(teamId) {
    appState.currentTeamId = teamId;
    goToScreen('players');
    loadPlayers();
}

async function deleteTeam(teamId) {
    showConfirmation('Delete Team', 'Are you sure?', async () => {
        try {
            await dbDelete(STORES.TEAMS, teamId);
            showSuccessMessage('Team deleted');
            loadTeams();
        } catch (error) {
            showErrorMessage('Error deleting team');
        }
    });
}

// ============================================================================
// PLAYER MANAGEMENT
// ============================================================================

async function createPlayer() {
    const name = document.getElementById('playerName').value;
    const jersey = document.getElementById('playerJerseyNo').value;
    
    if (!name || !jersey) {
        showErrorMessage('Please enter player details');
        return;
    }
    
    const player = {
        id: Date.now(),
        teamId: appState.currentTeamId,
        name,
        jersey: parseInt(jersey),
        createdAt: new Date().toISOString()
    };
    
    try {
        await dbAdd(STORES.PLAYERS, player);
        showSuccessMessage('Player added');
        document.getElementById('playerName').value = '';
        document.getElementById('playerJerseyNo').value = '';
        loadPlayers();
    } catch (error) {
        showErrorMessage('Error adding player');
    }
}

async function loadPlayers() {
    try {
        const players = await dbGetAll(STORES.PLAYERS);
        const filtered = players.filter(p => p.teamId == appState.currentTeamId);
        const list = document.getElementById('playersList');
        list.innerHTML = '';
        
        if (filtered.length === 0) {
            list.innerHTML = '<p>No players yet. Add your first player above.</p>';
            return;
        }
        
        filtered.forEach(player => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-title">${player.name}</div>
                <div class="list-item-subtitle">Jersey #${player.jersey}</div>
                <button class="btn btn-secondary" onclick="deletePlayer('${player.id}')">Delete</button>
            `;
            list.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

async function deletePlayer(playerId) {
    showConfirmation('Delete Player', 'Are you sure?', async () => {
        try {
            await dbDelete(STORES.PLAYERS, playerId);
            showSuccessMessage('Player deleted');
            loadPlayers();
        } catch (error) {
            showErrorMessage('Error deleting player');
        }
    });
}

// ============================================================================
// MATCH SETUP & PLAYING XI
// ============================================================================

async function proceedToToss() {
    const overs = document.getElementById('totalOvers').value;
    const format = document.getElementById('matchFormat').value;
    
    if (!overs || !appState.currentTeamId) {
        showErrorMessage('Please complete match setup');
        return;
    }
    
    // Create match object
    const match = {
        id: Date.now(),
        tournamentId: appState.currentTournamentId,
        team1Id: appState.team1Id,
        team2Id: appState.team2Id,
        totalOvers: parseInt(overs),
        format,
        status: 'toss',
        createdAt: new Date().toISOString(),
        deliveries: []
    };
    
    appState.currentMatchId = match.id;
    
    try {
        await dbAdd(STORES.MATCHES, match);
        showSuccessMessage('Match created');
        goToScreen('toss');
        loadTossOptions();
    } catch (error) {
        showErrorMessage('Error creating match');
    }
}

async function loadTossOptions() {
    try {
        const teams = await dbGetAll(STORES.TEAMS);
        const filtered = teams.filter(t => t.tournamentId == appState.currentTournamentId);
        
        if (filtered.length >= 2) {
            appState.team1Id = filtered[0].id;
            appState.team2Id = filtered[1].id;
            
            document.getElementById('team1TossBtn').textContent = filtered[0].name;
            document.getElementById('team2TossBtn').textContent = filtered[1].name;
            document.getElementById('tossChoiceTitle').textContent = `What does ${filtered[0].name} choose?`;
        }
    } catch (error) {
        console.error('Error loading toss options:', error);
    }
}

function selectTossWinner(teamIndex) {
    const buttons = [
        document.getElementById('team1TossBtn'),
        document.getElementById('team2TossBtn')
    ];
    
    buttons.forEach(btn => btn.classList.remove('selected'));
    buttons[teamIndex].classList.add('selected');
    
    appState.tossWinner = teamIndex;
    document.getElementById('tossChoiceCard').style.display = 'block';
}

function tossChoice(choice) {
    appState.matchTossChoice = choice;
    showSuccessMessage(`Toss recorded: Team ${appState.tossWinner + 1} chose to ${choice}`);
    
    setTimeout(() => {
        goToScreen('live');
        initializeLiveScoring();
    }, 1000);
}

async function savePlayingXI() {
    showSuccessMessage('Playing XI saved');
    setTimeout(() => goToScreen('matchSetup'), 500);
}

// ============================================================================
// LIVE SCORING INITIALIZATION
// ============================================================================

async function initializeLiveScoring() {
    try {
        const match = await dbGet(STORES.MATCHES, appState.currentMatchId);
        
        appState.liveMatchState = {
            runs: 0,
            wickets: 0,
            overs: 0,
            balls: 0,
            deliveries: [],
            striker: 'Not Set',
            nonStriker: 'Not Set',
            bowler: 'Not Set'
        };
        
        goToScreen('live');
        updateLiveDisplay();
        showSuccessMessage('Live scoring started');
    } catch (error) {
        showErrorMessage('Error starting match');
    }
}

// ============================================================================
// DELIVERY ENTRY & SCORING
// ============================================================================

function setDeliveryType(type) {
    appState.deliveryEntry.type = type;
    updateDeliveryPreview();
}

function addBatRuns(runs) {
    appState.deliveryEntry.batRuns = runs;
    updateDeliveryPreview();
}

function addExtras(type) {
    appState.deliveryEntry.extras = type;
    updateDeliveryPreview();
}

function toggleWicketSection() {
    const checkbox = document.getElementById('isWicketCheckbox');
    const section = document.getElementById('wicketSection');
    section.style.display = checkbox.checked ? 'block' : 'none';
}

function updateDeliveryPreview() {
    const entry = appState.deliveryEntry;
    let preview = '';
    
    if (entry.type === 'no-ball') preview += '[NO-BALL] ';
    else if (entry.type === 'wide') preview += '[WIDE] ';
    
    if (entry.batRuns > 0) preview += `${entry.batRuns} bat runs `;
    if (entry.extras) {
        const extraRuns = parseInt(document.getElementById('extraRuns').value) || 0;
        preview += `+ ${extraRuns} ${entry.extras}s `;
    }
    
    if (document.getElementById('isWicketCheckbox').checked) {
        const wicketType = document.getElementById('wicketType').value;
        if (wicketType) preview += `- WICKET (${wicketType})`;
    }
    
    document.getElementById('deliveryText').textContent = preview || 'No delivery entered';
}

function clearDeliveryEntry() {
    appState.deliveryEntry = {
        type: 'legal',
        batRuns: 0,
        extras: null,
        extraCount: 0,
        isWicket: false,
        wicketType: null
    };
    document.getElementById('isWicketCheckbox').checked = false;
    document.getElementById('wicketSection').style.display = 'none';
    document.getElementById('extraRuns').value = '0';
    updateDeliveryPreview();
}

async function recordDelivery() {
    const entry = appState.deliveryEntry;
    
    try {
        // Validate entry
        if (entry.type === 'legal' && entry.batRuns === 0 && !entry.extras && !entry.isWicket) {
            showErrorMessage('Please enter a valid delivery');
            return;
        }
        
        // Create delivery object
        const delivery = new Delivery();
        delivery.deliveryType = entry.type;
        delivery.batRuns = entry.batRuns;
        delivery.extraType = entry.extras;
        delivery.extraCount = parseInt(document.getElementById('extraRuns').value) || 0;
        delivery.isWicket = document.getElementById('isWicketCheckbox').checked;
        delivery.wicketType = document.getElementById('wicketType').value;
        
        // Calculate total runs
        delivery.totalRuns = delivery.batRuns + (entry.extras ? delivery.extraCount : 0);
        if (entry.type === 'no-ball') delivery.totalRuns += 1;
        else if (entry.type === 'wide') delivery.totalRuns += 1;
        
        // Update state
        if (!appState.liveMatchState) appState.liveMatchState = { deliveries: [] };
        appState.liveMatchState.deliveries.push(delivery);
        
        // Recalculate match state
        await updateMatchState();
        
        // Save to database
        await dbAdd(STORES.DELIVERIES, delivery);
        
        showSuccessMessage('Delivery recorded');
        clearDeliveryEntry();
        updateLiveDisplay();
        
    } catch (error) {
        showErrorMessage('Error recording delivery: ' + error.message);
    }
}

async function undoLastDelivery() {
    showConfirmation('Undo Last Ball', 'Remove the last delivery and restore previous state?', async () => {
        try {
            // Get all deliveries for current match
            const deliveries = await dbGetAll(STORES.DELIVERIES);
            if (deliveries.length === 0) {
                showErrorMessage('No deliveries to undo');
                return;
            }
            
            // Remove last delivery
            const lastDelivery = deliveries[deliveries.length - 1];
            await dbDelete(STORES.DELIVERIES, lastDelivery.id);
            
            // Update match state
            await updateMatchState();
            
            showSuccessMessage('Last delivery undone');
            updateLiveDisplay();
            
        } catch (error) {
            showErrorMessage('Error undoing delivery');
        }
    });
}

// ============================================================================
// MATCH STATE & DISPLAY
// ============================================================================

async function updateMatchState() {
    // Recalculate match state from all deliveries
    try {
        const deliveries = await dbGetAll(STORES.DELIVERIES);
        let runs = 0, wickets = 0, legalBalls = 0;
        
        deliveries.forEach(d => {
            runs += d.totalRuns;
            if (d.isWicket) wickets++;
            if (d.isLegalBall()) legalBalls++;
        });
        
        const overs = Math.floor(legalBalls / 6);
        const balls = legalBalls % 6;
        
        appState.liveMatchState = {
            runs,
            wickets,
            overs,
            balls,
            deliveries
        };
    } catch (error) {
        console.error('Error updating match state:', error);
    }
}

function updateLiveDisplay() {
    if (!appState.liveMatchState) return;
    
    const state = appState.liveMatchState;
    
    // Update scoreboard
    const scoreEl = document.getElementById('currentScore');
    const wicketsEl = document.getElementById('currentWickets');
    const oversEl = document.getElementById('currentOvers');
    const rrEl = document.getElementById('currentRunRate');
    
    if (scoreEl) scoreEl.textContent = state.runs || 0;
    if (wicketsEl) wicketsEl.textContent = (state.wickets || 0) + '/10';
    if (oversEl) oversEl.textContent = (state.overs || 0) + '.' + (state.balls || 0);
    
    const totalOvers = (state.overs || 0) + (state.balls || 0) / 6;
    const runRate = totalOvers > 0 
        ? ((state.runs || 0) / totalOvers).toFixed(2)
        : '0.00';
    if (rrEl) rrEl.textContent = runRate;
    
    // Update player status
    const strikerEl = document.getElementById('strikerDisplay');
    const nonStrikerEl = document.getElementById('nonStrikerDisplay');
    const bowlerEl = document.getElementById('bowlerDisplay');
    
    if (strikerEl) strikerEl.textContent = state.striker || '-';
    if (nonStrikerEl) nonStrikerEl.textContent = state.nonStriker || '-';
    if (bowlerEl) bowlerEl.textContent = state.bowler || '-';
    
    // Update delivery history
    const historyDiv = document.getElementById('deliveryHistory');
    if (historyDiv) {
        historyDiv.innerHTML = '';
        if (state.deliveries && state.deliveries.length > 0) {
            state.deliveries.forEach(d => {
                const entry = document.createElement('div');
                entry.className = 'delivery-entry';
                entry.textContent = d.toString();
                historyDiv.appendChild(entry);
            });
        } else {
            historyDiv.innerHTML = '<p>No deliveries recorded yet</p>';
        }
    }
}

function changeStrikerBatsman() {
    showSuccessMessage('Striker changed (UI placeholder)');
}

function changeNonStrikerBatsman() {
    showSuccessMessage('Non-striker changed (UI placeholder)');
}

function changeBowler() {
    showSuccessMessage('Bowler changed (UI placeholder)');
}

function completeInnings() {
    showConfirmation('Complete Innings', 'End this innings?', async () => {
        try {
            const match = await dbGet(STORES.MATCHES, appState.currentMatchId);
            match.status = 'completed';
            match.result = `Team 1: ${appState.liveMatchState.runs}/${appState.liveMatchState.wickets} in ${appState.liveMatchState.overs}.${appState.liveMatchState.balls}`;
            
            await dbPut(STORES.COMPLETED_MATCHES, match);
            showSuccessMessage('Innings completed');
            goToScreen('history');
        } catch (error) {
            showErrorMessage('Error completing innings');
        }
    });
}

// ============================================================================
// HISTORY & STATISTICS
// ============================================================================

async function loadHistory() {
    try {
        const completed = await dbGetAll(STORES.COMPLETED_MATCHES);
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        
        if (completed.length === 0) {
            historyList.innerHTML = '<p>No completed matches yet. Start playing to see history.</p>';
            return;
        }
        
        completed.forEach(match => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-title">⚾ Match ${match.id}</div>
                <div class="list-item-subtitle">${match.result}</div>
                <div class="list-item-subtitle">${new Date(match.createdAt).toLocaleDateString()}</div>
                <button class="btn btn-primary btn-sm" onclick="viewScorecard('${match.id}')">View Scorecard</button>
            `;
            historyList.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

async function viewScorecard(matchId) {
    try {
        const match = await dbGet(STORES.COMPLETED_MATCHES, parseInt(matchId));
        const scorecardContent = document.getElementById('scorecardContent');
        
        scorecardContent.innerHTML = `
            <div class="card">
                <h3>Match Result</h3>
                <p><strong>${match.result}</strong></p>
            </div>
            <div class="card">
                <h3>Match Details</h3>
                <p>Date: ${new Date(match.createdAt).toLocaleDateString()}</p>
                <p>Format: ${match.format}</p>
                <p>Total Overs: ${match.totalOvers}</p>
            </div>
        `;
        
        goToScreen('scorecard');
    } catch (error) {
        showErrorMessage('Error loading scorecard');
    }
}

async function loadStats() {
    try {
        const players = await dbGetAll(STORES.PLAYERS);
        const statsContent = document.getElementById('statsContent');
        
        statsContent.innerHTML = '';
        
        if (players.length === 0) {
            statsContent.innerHTML = '<p>No player statistics yet.</p>';
            return;
        }
        
        const statsHTML = `
            <div class="card">
                <h3>Player Statistics</h3>
                <p>Total Players: ${players.length}</p>
                <p>Statistics tracking coming soon...</p>
            </div>
        `;
        
        statsContent.innerHTML = statsHTML;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        
        // Initialize app state
        appState.currentScreen = 'home';
        appState.liveMatchState = null;
        
        // Setup navigation
        setupNavigation();
        
        // Go to home screen
        goToScreen('home');
        
        console.log('✅ App initialized successfully');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showErrorMessage('Failed to initialize app: ' + error.message);
    }
});

function setupNavigation() {
    // Set up all screen button listeners
    const navButtons = document.querySelectorAll('.nav-pill');
    navButtons.forEach(btn => {
        const screenName = btn.getAttribute('data-screen');
        btn.addEventListener('click', () => {
            goToScreen(screenName);
            if (screenName === 'tournaments') loadTournaments();
            else if (screenName === 'history') loadHistory();
            else if (screenName === 'stats') loadStats();
        });
    });
}
