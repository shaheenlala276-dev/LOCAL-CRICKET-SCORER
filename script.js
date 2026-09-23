/* ===== LOCAL CRICKET SCORER APP - VERSION 1.1 ===== */
/* Tournament Setup: Create, Teams, Players, and Navigation */

/* ===== DATA STRUCTURE ===== */
const AppData = {
    tournaments: [],
    teams: [],
    players: []
};

const STORAGE_KEY = 'cricket_scorer_v1';
const TOURNAMENT_PREFIX = 'tourn_';
const TEAM_PREFIX = 'team_';
const PLAYER_PREFIX = 'player_';

/* Current state for navigation */
const CurrentState = {
    currentTournamentId: null,
    currentTeamId: null,
    editingTeamId: null,
    editingPlayerId: null
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
        }
    } catch (error) {
        showAlert('Failed to load data: ' + error.message);
        AppData.tournaments = [];
        AppData.teams = [];
        AppData.players = [];
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
    if (!tournament) return false;

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
    if (!confirmAction('Are you sure you want to delete this tournament and all its teams and players?')) {
        return false;
    }

    const tournamentIndex = AppData.tournaments.findIndex(t => t.id === id);
    if (tournamentIndex === -1) return false;

    const tournament = AppData.tournaments[tournamentIndex];
    
    // Delete all teams and players associated with this tournament
    tournament.teamIds.forEach(teamId => {
        const team = getTeam(teamId);
        if (team) {
            team.playerIds.forEach(playerId => {
                const playerIndex = AppData.players.findIndex(p => p.id === playerId);
                if (playerIndex !== -1) {
                    AppData.players.splice(playerIndex, 1);
                }
            });
            const teamIndex = AppData.teams.findIndex(t => t.id === teamId);
            if (teamIndex !== -1) {
                AppData.teams.splice(teamIndex, 1);
            }
        }
    });

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
    if (!tournament) return [];
    return AppData.teams.filter(t => tournament.teamIds.includes(t.id));
}

function updateTeam(id, name) {
    const team = getTeam(id);
    if (!team) return false;

    if (!name) {
        showAlert('Team name is required');
        return false;
    }

    team.name = name.trim();
    saveToLocalStorage();
    return true;
}

function deleteTeam(id) {
    if (!confirmAction('Are you sure you want to delete this team and all its players?')) {
        return false;
    }

    const team = getTeam(id);
    if (!team) return false;

    const tournament = getTournament(team.tournamentId);
    if (tournament) {
        tournament.teamIds = tournament.teamIds.filter(tId => tId !== id);
    }

    // Delete all players in this team
    team.playerIds.forEach(playerId => {
        const playerIndex = AppData.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            AppData.players.splice(playerIndex, 1);
        }
    });

    const teamIndex = AppData.teams.findIndex(t => t.id === id);
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
    if (!team) return [];
    return AppData.players.filter(p => team.playerIds.includes(p.id));
}

function updatePlayer(id, name, number = null) {
    const player = getPlayer(id);
    if (!player) return false;

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
    if (!confirmAction('Are you sure you want to delete this player?')) {
        return false;
    }

    const player = getPlayer(id);
    if (!player) return false;

    const team = getTeam(player.teamId);
    if (team) {
        team.playerIds = team.playerIds.filter(pId => pId !== id);
    }

    const playerIndex = AppData.players.findIndex(p => p.id === id);
    if (playerIndex !== -1) {
        AppData.players.splice(playerIndex, 1);
    }

    saveToLocalStorage();
    showAlert('Player deleted successfully');
    return true;
}

/* ===== SCREEN NAVIGATION ===== */

function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(screenId);
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
    document.getElementById('create-tournament-form').reset();
    showScreen('create-tournament-screen');
}

function showSavedTournaments() {
    renderTournaments();
    showScreen('saved-tournaments-screen');
}

function showTournamentDashboard(tournamentId) {
    CurrentState.currentTournamentId = tournamentId;
    renderTournamentDashboard();
    showScreen('tournament-dashboard-screen');
}

function showAddTeam() {
    document.getElementById('add-team-form').reset();
    showScreen('add-team-screen');
}

function showTeamDetails(teamId) {
    CurrentState.currentTeamId = teamId;
    renderTeamDetails();
    showScreen('team-details-screen');
}

function showAddPlayer() {
    document.getElementById('add-player-form').reset();
    showScreen('add-player-screen');
}

function showEditTeam(teamId) {
    CurrentState.editingTeamId = teamId;
    const team = getTeam(teamId);
    if (team) {
        document.getElementById('edit-team-name').value = team.name;
    }
    showScreen('edit-team-screen');
}

function showEditPlayer(playerId) {
    CurrentState.editingPlayerId = playerId;
    const player = getPlayer(playerId);
    if (player) {
        document.getElementById('edit-player-name').value = player.name;
        document.getElementById('edit-player-number').value = player.number || '';
    }
    showScreen('edit-player-screen');
}

/* ===== RENDER FUNCTIONS ===== */

function renderTournaments() {
    const container = document.getElementById('tournaments-list');
    const noMessage = document.getElementById('no-tournaments-message');
    const tournaments = getAllTournaments();

    container.innerHTML = '';

    if (tournaments.length === 0) {
        noMessage.style.display = 'block';
        return;
    }

    noMessage.style.display = 'none';

    tournaments.forEach(tournament => {
        const teamCount = tournament.teamIds.length;
        const dateObj = new Date(tournament.date);
        const formattedDate = dateObj.toLocaleDateString();

        const tournamentCard = document.createElement('div');
        tournamentCard.className = 'tournament-card';

        tournamentCard.innerHTML = `
            <div class="tournament-card-title">${escapeHtml(tournament.name)}</div>
            <div class="tournament-card-details">
                <strong>Date:</strong> ${formattedDate}
            </div>
            ${tournament.location ? `<div class="tournament-card-details"><strong>Location:</strong> ${escapeHtml(tournament.location)}</div>` : ''}
            <div class="tournament-card-details">
                <strong>Teams:</strong> ${teamCount}
            </div>
            <div class="tournament-card-actions">
                <button class="btn btn-primary btn-open-tournament" data-id="${tournament.id}">Open</button>
                <button class="btn btn-danger btn-delete-tournament" data-id="${tournament.id}">Delete</button>
            </div>
        `;

        container.appendChild(tournamentCard);
    });

    // Attach event listeners
    document.querySelectorAll('.btn-open-tournament').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tournamentId = e.target.dataset.id;
            showTournamentDashboard(tournamentId);
        });
    });

    document.querySelectorAll('.btn-delete-tournament').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tournamentId = e.target.dataset.id;
            if (deleteTournament(tournamentId)) {
                renderTournaments();
            }
        });
    });
}

function renderTournamentDashboard() {
    const tournament = getTournament(CurrentState.currentTournamentId);
    if (!tournament) {
        showHome();
        return;
    }

    // Update tournament info
    document.getElementById('tournament-title-display').textContent = tournament.name;
    document.getElementById('tournament-date-display').textContent = new Date(tournament.date).toLocaleDateString();
    document.getElementById('tournament-location-display').textContent = tournament.location || '-';
    document.getElementById('tournament-team-count').textContent = tournament.teamIds.length;

    // Render teams
    const container = document.getElementById('teams-list');
    const noMessage = document.getElementById('no-teams-message');

    container.innerHTML = '';

    const teams = getTeamsByTournament(CurrentState.currentTournamentId);

    if (teams.length === 0) {
        noMessage.style.display = 'block';
        return;
    }

    noMessage.style.display = 'none';

    teams.forEach(team => {
        const playerCount = team.playerIds.length;
        const teamCard = document.createElement('div');
        teamCard.className = 'team-card';

        teamCard.innerHTML = `
            <div class="team-card-info">
                <div class="team-card-name">${escapeHtml(team.name)}</div>
                <div class="team-card-players">${playerCount} player${playerCount !== 1 ? 's' : ''}</div>
            </div>
            <div class="team-card-actions">
                <button class="btn btn-secondary btn-open-team" data-id="${team.id}">View</button>
                <button class="btn btn-danger btn-delete-team-dash" data-id="${team.id}">Delete</button>
            </div>
        `;

        container.appendChild(teamCard);
    });

    // Attach event listeners
    document.querySelectorAll('.btn-open-team').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const teamId = e.target.dataset.id;
            showTeamDetails(teamId);
        });
    });

    document.querySelectorAll('.btn-delete-team-dash').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const teamId = e.target.dataset.id;
            if (deleteTeam(teamId)) {
                renderTournamentDashboard();
            }
        });
    });
}

function renderTeamDetails() {
    const team = getTeam(CurrentState.currentTeamId);
    if (!team) {
        showTournamentDashboard(CurrentState.currentTournamentId);
        return;
    }

    // Update team info
    document.getElementById('team-name-display').textContent = team.name;

    // Render players
    const container = document.getElementById('players-list');
    const noMessage = document.getElementById('no-players-message');

    container.innerHTML = '';

    const players = getPlayersByTeam(CurrentState.currentTeamId);

    if (players.length === 0) {
        noMessage.style.display = 'block';
        return;
    }

    noMessage.style.display = 'none';

    players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';

        playerCard.innerHTML = `
            <div class="player-card-info">
                <div class="player-card-name">${escapeHtml(player.name)}</div>
                ${player.number ? `<div class="player-card-number">Jersey #${player.number}</div>` : ''}
            </div>
            <div class="player-card-actions">
                <button class="btn btn-secondary btn-edit-player" data-id="${player.id}">Edit</button>
                <button class="btn btn-danger btn-delete-player" data-id="${player.id}">Delete</button>
            </div>
        `;

        container.appendChild(playerCard);
    });

    // Attach event listeners
    document.querySelectorAll('.btn-edit-player').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const playerId = e.target.dataset.id;
            showEditPlayer(playerId);
        });
    });

    document.querySelectorAll('.btn-delete-player').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const playerId = e.target.dataset.id;
            if (deletePlayer(playerId)) {
                renderTeamDetails();
            }
        });
    });
}

/* ===== HELPER FUNCTIONS ===== */

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/* ===== EVENT LISTENERS ===== */

function setupEventListeners() {
    /* HOME SCREEN */
    document.getElementById('btn-new-tournament').addEventListener('click', showCreateTournament);
    document.getElementById('btn-view-tournaments').addEventListener('click', showSavedTournaments);

    /* CREATE TOURNAMENT */
    document.getElementById('btn-back-home-from-create-tourn').addEventListener('click', showHome);
    document.getElementById('create-tournament-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('tournament-name').value;
        const date = document.getElementById('tournament-date').value;
        const location = document.getElementById('tournament-location').value;

        if (createTournament(name, date, location)) {
            showHome();
        }
    });

    /* SAVED TOURNAMENTS */
    document.getElementById('btn-back-home-from-saved').addEventListener('click', showHome);

    /* TOURNAMENT DASHBOARD */
    document.getElementById('btn-back-to-tournaments').addEventListener('click', showSavedTournaments);
    document.getElementById('btn-add-team').addEventListener('click', showAddTeam);
    document.getElementById('btn-delete-tournament').addEventListener('click', () => {
        if (deleteTournament(CurrentState.currentTournamentId)) {
            showSavedTournaments();
        }
    });

    /* ADD TEAM */
    document.getElementById('btn-back-to-dashboard').addEventListener('click', () => {
        showTournamentDashboard(CurrentState.currentTournamentId);
    });
    document.getElementById('add-team-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('team-name').value;
        if (createTeam(CurrentState.currentTournamentId, name)) {
            showTournamentDashboard(CurrentState.currentTournamentId);
        }
    });

    /* TEAM DETAILS */
    document.getElementById('btn-back-to-dashboard-from-team').addEventListener('click', () => {
        showTournamentDashboard(CurrentState.currentTournamentId);
    });
    document.getElementById('btn-add-player').addEventListener('click', showAddPlayer);
    document.getElementById('btn-edit-team').addEventListener('click', () => {
        showEditTeam(CurrentState.currentTeamId);
    });
    document.getElementById('btn-delete-team').addEventListener('click', () => {
        if (deleteTeam(CurrentState.currentTeamId)) {
            showTournamentDashboard(CurrentState.currentTournamentId);
        }
    });

    /* ADD PLAYER */
    document.getElementById('btn-back-to-team-details').addEventListener('click', () => {
        showTeamDetails(CurrentState.currentTeamId);
    });
    document.getElementById('add-player-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('player-name').value;
        const number = document.getElementById('player-number').value;
        if (createPlayer(CurrentState.currentTeamId, name, number)) {
            showTeamDetails(CurrentState.currentTeamId);
        }
    });

    /* EDIT TEAM */
    document.getElementById('btn-back-to-team-details-from-edit').addEventListener('click', () => {
        showTeamDetails(CurrentState.currentTeamId);
    });
    document.getElementById('edit-team-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('edit-team-name').value;
        if (updateTeam(CurrentState.editingTeamId, name)) {
            showAlert('Team updated successfully');
            showTeamDetails(CurrentState.currentTeamId);
        }
    });

    /* EDIT PLAYER */
    document.getElementById('btn-back-to-team-details-from-edit-player').addEventListener('click', () => {
        showTeamDetails(CurrentState.currentTeamId);
    });
    document.getElementById('edit-player-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('edit-player-name').value;
        const number = document.getElementById('edit-player-number').value;
        if (updatePlayer(CurrentState.editingPlayerId, name, number)) {
            showAlert('Player updated successfully');
            showTeamDetails(CurrentState.currentTeamId);
        }
    });

    /* PLACEHOLDER SCREENS BACK BUTTONS */
    document.getElementById('btn-back-from-match-setup').addEventListener('click', showHome);
    document.getElementById('btn-back-from-live-scoring').addEventListener('click', showHome);
    document.getElementById('btn-back-from-scorecard').addEventListener('click', showHome);
    document.getElementById('btn-back-from-match-result').addEventListener('click', showHome);
}

/* ===== INITIALIZATION ===== */

function initializeApp() {
    loadFromLocalStorage();
    setupEventListeners();
    showHome();
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
