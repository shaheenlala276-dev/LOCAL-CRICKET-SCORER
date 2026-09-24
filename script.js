
// ============================================================================
// LOCAL CRICKET SCORER - COMPLETE APPLICATION
// ============================================================================

// DATA STRUCTURE
// ============================================================================
const STORAGE_KEY = "local_cricket_scorer_v1";

const AppData = {
  tournaments: [],
  teams: [],
  players: [],
  matches: []
};

const CurrentState = {
  currentTournamentId: null,
  currentTeamId: null,
  currentMatchId: null,
  editingTeamId: null,
  editingPlayerId: null
};

const LiveState = {
  inningsIndex: 0,
  strikerId: null,
  nonStrikerId: null,
  bowlerId: null,
  pendingNewBatsman: false,
  dismissedPlayerId: null
};

// STORAGE FUNCTIONS
// ============================================================================
function saveData() {
  try {
    const data = {
      appData: AppData,
      currentState: CurrentState,
      liveState: LiveState
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving data to LocalStorage:", e);
  }
}

function loadData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      Object.assign(AppData, parsed.appData);
      Object.assign(CurrentState, parsed.currentState);
      Object.assign(LiveState, parsed.liveState);
    }
  } catch (e) {
    console.error("Error loading data from LocalStorage:", e);
  }
}

// ID GENERATION
// ============================================================================
function generateId(prefix = "id") {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// UTILITY FUNCTIONS
// ============================================================================
function escapeHTML(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return text.replace(/[&<>"']/g, m => map[m]);
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
  const screens = document.querySelectorAll(".screen");
  screens.forEach(screen => {
    screen.classList.remove("active");
  });
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add("active");
  }
}

// SCREEN NAVIGATION
// ============================================================================
function goHome() {
  CurrentState.currentTournamentId = null;
  CurrentState.currentTeamId = null;
  CurrentState.currentMatchId = null;
  saveData();
  showScreen("home-screen");
}

function goToTournaments() {
  showScreen("tournaments-screen");
  renderTournamentList();
}

function goToCreateTournament() {
  showScreen("create-tournament-screen");
}

function goToTournamentDashboard(tournamentId) {
  CurrentState.currentTournamentId = tournamentId;
  saveData();
  showScreen("tournament-dashboard-screen");
  renderTournamentDashboard();
}

function goToAddTeam() {
  showScreen("add-team-screen");
}

function goToTeamDetails(teamId) {
  CurrentState.currentTeamId = teamId;
  saveData();
  showScreen("team-details-screen");
  renderTeamDetails();
}

function goToAddPlayer() {
  showScreen("add-player-screen");
}

function goToMatchSetup() {
  showScreen("match-setup-screen");
  populateMatchSetupSelects();
}

function goToToss() {
  showScreen("toss-screen");
  populateTossSelects();
}

function goToPlayingXI() {
  showScreen("playing-xi-screen");
  renderPlayingXISelection();
}

function goToLiveScoring() {
  showScreen("live-scoring-screen");
  renderLiveScoring();
  attachLiveScoringListeners();
}

function goToMatchSummary() {
  showScreen("match-summary-screen");
  renderMatchSummary();
}

// TOURNAMENT MANAGEMENT
// ============================================================================
function createTournament() {
  const name = document.getElementById("tournament-name").value.trim();
  const location = document.getElementById("tournament-location").value.trim();
  const startDate = document.getElementById("tournament-start-date").value;

  if (!name) {
    alert("Please enter tournament name");
    return;
  }

  AppData.tournaments.push({
    id: generateId("tournament"),
    name: name,
    location: location,
    startDate: startDate,
    createdAt: new Date().toISOString()
  });

  saveData();
  document.getElementById("tournament-form").reset();
  goToTournaments();
}

function deleteTournament(tournamentId) {
  if (!confirm("Are you sure you want to delete this tournament?")) return;

  AppData.tournaments = AppData.tournaments.filter(t => t.id !== tournamentId);
  AppData.teams = AppData.teams.filter(t => t.tournamentId !== tournamentId);
  AppData.matches = AppData.matches.filter(m => m.tournamentId !== tournamentId);

  saveData();
  renderTournamentList();
}

function renderTournamentList() {
  const list = document.getElementById("tournament-list");
  if (!list) return;

  list.innerHTML = "";

  if (AppData.tournaments.length === 0) {
    list.innerHTML = '<p class="empty-message">No tournaments yet. Create one to get started.</p>';
    return;
  }

  AppData.tournaments.forEach(tournament => {
    const card = document.createElement("div");
    card.className = "tournament-card";

    const tournamentTeams = AppData.teams.filter(t => t.tournamentId === tournament.id);
    const tournamentMatches = AppData.matches.filter(m => m.tournamentId === tournament.id);

    card.innerHTML = `
      <div class="card-content">
        <h3>${escapeHTML(tournament.name)}</h3>
        <p class="card-meta">${escapeHTML(tournament.location) || "No location"}</p>
        <p class="card-stats">${tournamentTeams.length} teams • ${tournamentMatches.length} matches</p>
      </div>
      <div class="card-actions">
        <button class="btn btn-primary btn-open-tournament" data-tournament-id="${tournament.id}">Open</button>
        <button class="btn btn-danger btn-delete-tournament" data-tournament-id="${tournament.id}">Delete</button>
      </div>
    `;

    list.appendChild(card);
  });

  attachTournamentListeners();
}

function attachTournamentListeners() {
  document.querySelectorAll(".btn-open-tournament").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const tournamentId = e.target.dataset.tournamentId;
      goToTournamentDashboard(tournamentId);
    });
  });

  document.querySelectorAll(".btn-delete-tournament").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const tournamentId = e.target.dataset.tournamentId;
      deleteTournament(tournamentId);
    });
  });
}

function renderTournamentDashboard() {
  const tournament = getTournamentById(CurrentState.currentTournamentId);
  if (!tournament) {
    goToTournaments();
    return;
  }

  document.getElementById("tournament-title").textContent = escapeHTML(tournament.name);
  renderTeams();
  renderMatches();
}

// TEAM MANAGEMENT
// ============================================================================
function createTeam() {
  const name = document.getElementById("team-name").value.trim();

  if (!name) {
    alert("Please enter team name");
    return;
  }

  AppData.teams.push({
    id: generateId("team"),
    name: name,
    tournamentId: CurrentState.currentTournamentId
  });

  saveData();
  document.getElementById("team-form").reset();
  renderTeams();
  showScreen("tournament-dashboard-screen");
}

function deleteTeam(teamId) {
  if (!confirm("Are you sure you want to delete this team?")) return;

  AppData.teams = AppData.teams.filter(t => t.id !== teamId);
  AppData.players = AppData.players.filter(p => p.teamId !== teamId);

  saveData();
  renderTeams();
}

function renderTeams() {
  const list = document.getElementById("team-list");
  if (!list) return;

  const teams = AppData.teams.filter(t => t.tournamentId === CurrentState.currentTournamentId);
  list.innerHTML = "";

  if (teams.length === 0) {
    list.innerHTML = '<p class="empty-message">No teams yet. Add one to get started.</p>';
    return;
  }

  teams.forEach(team => {
    const playerCount = AppData.players.filter(p => p.teamId === team.id).length;
    const card = document.createElement("div");
    card.className = "team-card";

    card.innerHTML = `
      <div class="card-content">
        <h4>${escapeHTML(team.name)}</h4>
        <p class="card-meta">${playerCount} players</p>
      </div>
      <div class="card-actions">
        <button class="btn btn-primary btn-open-team" data-team-id="${team.id}">View</button>
        <button class="btn btn-danger btn-delete-team" data-team-id="${team.id}">Delete</button>
      </div>
    `;

    list.appendChild(card);
  });

  attachTeamListeners();
}

function attachTeamListeners() {
  document.querySelectorAll(".btn-open-team").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const teamId = e.target.dataset.teamId;
      goToTeamDetails(teamId);
    });
  });

  document.querySelectorAll(".btn-delete-team").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const teamId = e.target.dataset.teamId;
      deleteTeam(teamId);
    });
  });
}

function renderTeamDetails() {
  const team = getTeamById(CurrentState.currentTeamId);
  if (!team) {
    goToTournamentDashboard(CurrentState.currentTournamentId);
    return;
  }

  document.getElementById("team-title").textContent = escapeHTML(team.name);
  renderPlayers();
}

// PLAYER MANAGEMENT
// ============================================================================
function createPlayer() {
  const name = document.getElementById("player-name").value.trim();
  const jersey = document.getElementById("player-jersey").value;

  if (!name) {
    alert("Please enter player name");
    return;
  }

  AppData.players.push({
    id: generateId("player"),
    name: name,
    jersey: jersey || "",
    teamId: CurrentState.currentTeamId
  });

  saveData();
  document.getElementById("player-form").reset();
  renderPlayers();
  showScreen("team-details-screen");
}

function deletePlayer(playerId) {
  if (!confirm("Are you sure you want to delete this player?")) return;

  AppData.players = AppData.players.filter(p => p.id !== playerId);
  saveData();
  renderPlayers();
}

function renderPlayers() {
  const list = document.getElementById("player-list");
  if (!list) return;

  const players = AppData.players.filter(p => p.teamId === CurrentState.currentTeamId);
  list.innerHTML = "";

  if (players.length === 0) {
    list.innerHTML = '<p class="empty-message">No players yet. Add one to get started.</p>';
    return;
  }

  players.forEach(player => {
    const card = document.createElement("div");
    card.className = "player-card";

    const jerseyText = player.jersey ? ` (#${player.jersey})` : "";
    card.innerHTML = `
      <div class="card-content">
        <h5>${escapeHTML(player.name)}${jerseyText}</h5>
      </div>
      <div class="card-actions">
        <button class="btn btn-danger btn-delete-player" data-player-id="${player.id}">Delete</button>
      </div>
    `;

    list.appendChild(card);
  });

  attachPlayerListeners();
}

function attachPlayerListeners() {
  document.querySelectorAll(".btn-delete-player").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const playerId = e.target.dataset.playerId;
      deletePlayer(playerId);
    });
  });
}

// MATCH SETUP
// ============================================================================
function populateMatchSetupSelects() {
  const tournament = getTournamentById(CurrentState.currentTournamentId);
  if (!tournament) {
    goToTournamentDashboard(CurrentState.currentTournamentId);
    return;
  }

  const teams = AppData.teams.filter(t => t.tournamentId === CurrentState.currentTournamentId);
  let teamOptions = '<option value="">Select Team</option>';

  teams.forEach(team => {
    teamOptions += `<option value="${team.id}">${escapeHTML(team.name)}</option>`;
  });

  const team1Select = document.getElementById("match-team1");
  const team2Select = document.getElementById("match-team2");

  if (team1Select) team1Select.innerHTML = teamOptions;
  if (team2Select) team2Select.innerHTML = teamOptions;
}

function createMatch() {
  const team1Id = document.getElementById("match-team1").value;
  const team2Id = document.getElementById("match-team2").value;
  const overs = parseInt(document.getElementById("match-overs").value);
  const venue = document.getElementById("match-venue").value.trim();
  const matchDate = document.getElementById("match-date").value;

  if (!team1Id || !team2Id) {
    alert("Please select both teams");
    return;
  }

  if (team1Id === team2Id) {
    alert("Please select two different teams");
    return;
  }

  if (!overs || overs < 1) {
    alert("Please enter valid number of overs");
    return;
  }

  const team1 = getTeamById(team1Id);
  const team2 = getTeamById(team2Id);

  if (!team1 || !team2) {
    alert("Invalid teams selected");
    return;
  }

  const match = {
    id: generateId("match"),
    tournamentId: CurrentState.currentTournamentId,
    team1Id: team1Id,
    team2Id: team2Id,
    team1Name: team1.name,
    team2Name: team2.name,
    overs: overs,
    venue: venue,
    matchDate: matchDate,
    status: "setup",
    playingXI: {
      [team1Id]: [],
      [team2Id]: []
    },
    toss: {
      winner: null,
      decision: null,
      battingTeamId: null,
      bowlingTeamId: null
    },
    innings: []
  };

  AppData.matches.push(match);
  CurrentState.currentMatchId = match.id;
  saveData();

  goToPlayingXI();
}

function renderMatches() {
  const list = document.getElementById("match-list");
  if (!list) return;

  const matches = AppData.matches.filter(m => m.tournamentId === CurrentState.currentTournamentId);
  list.innerHTML = "";

  if (matches.length === 0) {
    list.innerHTML = '<p class="empty-message">No matches yet. Create one to get started.</p>';
    return;
  }

  matches.forEach(match => {
    const card = document.createElement("div");
    card.className = "match-card";

    let statusBadge = "";
    if (match.status === "setup") statusBadge = '<span class="badge badge-info">Setup</span>';
    else if (match.status === "live") statusBadge = '<span class="badge badge-success">Live</span>';
    else if (match.status === "completed") statusBadge = '<span class="badge badge-default">Completed</span>';

    const oversText = match.innings.length > 0 ? `${match.innings[0].overs}.${match.innings[0].balls}` : "0.0";
    const scoreText = match.innings.length > 0 ? `${match.innings[0].runs}/${match.innings[0].wickets}` : "-";

    card.innerHTML = `
      <div class="card-content">
        <h4>${escapeHTML(match.team1Name)} vs ${escapeHTML(match.team2Name)}</h4>
        <p class="card-meta">${escapeHTML(match.venue) || "No venue"} • ${match.overs} Overs</p>
        ${match.status === "live" ? `<p class="card-stats">${scoreText} (${oversText})</p>` : ""}
        ${statusBadge}
      </div>
      <div class="card-actions">
        ${match.status === "setup" ? `<button class="btn btn-primary btn-continue-match" data-match-id="${match.id}">Continue Setup</button>` : ""}
        ${match.status === "live" ? `<button class="btn btn-primary btn-continue-match" data-match-id="${match.id}">Continue Scoring</button>` : ""}
        ${match.status === "completed" ? `<button class="btn btn-primary btn-view-match" data-match-id="${match.id}">View Summary</button>` : ""}
        <button class="btn btn-danger btn-delete-match" data-match-id="${match.id}">Delete</button>
      </div>
    `;

    list.appendChild(card);
  });

  attachMatchListeners();
}

function attachMatchListeners() {
  document.querySelectorAll(".btn-continue-match").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const matchId = e.target.dataset.matchId;
      CurrentState.currentMatchId = matchId;
      const match = getMatchById(matchId);
      if (match.status === "setup") {
        determineNextSetupStep();
      } else if (match.status === "live") {
        initializeLiveScoring();
        goToLiveScoring();
      }
    });
  });

  document.querySelectorAll(".btn-view-match").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const matchId = e.target.dataset.matchId;
      CurrentState.currentMatchId = matchId;
      goToMatchSummary();
    });
  });

  document.querySelectorAll(".btn-delete-match").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const matchId = e.target.dataset.matchId;
      if (confirm("Are you sure you want to delete this match?")) {
        AppData.matches = AppData.matches.filter(m => m.id !== matchId);
        saveData();
        renderMatches();
      }
    });
  });
}

function determineNextSetupStep() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return;

  if (match.playingXI[match.team1Id].length === 0) {
    goToPlayingXI();
  } else if (match.playingXI[match.team2Id].length === 0) {
    goToPlayingXI();
  } else if (!match.toss.winner) {
    goToToss();
  } else {
    goToLiveScoring();
  }
}

// PLAYING XI SELECTION
// ============================================================================
function renderPlayingXISelection() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return;

  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);

  if (!team1 || !team2) return;

  const team1Players = AppData.players.filter(p => p.teamId === match.team1Id);
  const team2Players = AppData.players.filter(p => p.teamId === match.team2Id);

  const battingXISection = document.getElementById("batting-xi-section");
  const battingXIList = document.getElementById("batting-xi-list");
  const bowlingXISection = document.getElementById("bowling-xi-section");
  const bowlingXIList = document.getElementById("bowling-xi-list");

  if (!battingXISection || !battingXIList || !bowlingXISection || !bowlingXIList) return;

  const needTeam1XI = match.playingXI[match.team1Id].length === 0;
  const needTeam2XI = match.playingXI[match.team2Id].length === 0;

  if (needTeam1XI && needTeam2XI) {
    battingXISection.innerHTML = `<h3>Select ${escapeHTML(team1.name)} XI (2-11 players)</h3>`;
    bowlingXISection.innerHTML = `<h3>Select ${escapeHTML(team2.name)} XI (2-11 players)</h3>`;

    renderPlayingXIList(battingXIList, team1Players, match.team1Id, "team1");
    renderPlayingXIList(bowlingXIList, team2Players, match.team2Id, "team2");
  } else if (needTeam1XI) {
    battingXISection.innerHTML = `<h3>Select ${escapeHTML(team1.name)} XI (2-11 players)</h3>`;
    battingXISection.style.display = "block";
    bowlingXISection.style.display = "none";

    renderPlayingXIList(battingXIList, team1Players, match.team1Id, "team1");
  } else if (needTeam2XI) {
    battingXISection.innerHTML = `<h3>Select ${escapeHTML(team2.name)} XI (2-11 players)</h3>`;
    battingXISection.style.display = "block";
    bowlingXISection.style.display = "none";

    renderPlayingXIList(battingXIList, team2Players, match.team2Id, "team2");
  }
}

function renderPlayingXIList(container, players, teamId, teamSelector) {
  if (!container) return;

  container.innerHTML = "";

  players.forEach(player => {
    const label = document.createElement("label");
    label.className = "checkbox-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "xi-checkbox";
    checkbox.value = player.id;
    checkbox.dataset.teamId = teamId;
    checkbox.dataset.teamSelector = teamSelector;

    const span = document.createElement("span");
    span.textContent = escapeHTML(player.name);

    label.appendChild(checkbox);
    label.appendChild(span);
    container.appendChild(label);
  });

  attachXIListeners();
}

function attachXIListeners() {
  const checkboxes = document.querySelectorAll(".xi-checkbox");

  checkboxes.forEach(checkbox => {
    checkbox.addEventListener("change", validateXISelection);
  });
}

function validateXISelection() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return;

  const team1Checkboxes = Array.from(document.querySelectorAll(".xi-checkbox[data-team-selector='team1']:checked"));
  const team2Checkboxes = Array.from(document.querySelectorAll(".xi-checkbox[data-team-selector='team2']:checked"));

  if (team1Checkboxes.length > 0 && team1Checkboxes.length < 2) {
    alert("Select at least 2 players");
    team1Checkboxes[team1Checkboxes.length - 1].checked = false;
    return;
  }

  if (team1Checkboxes.length > 11) {
    alert("Maximum 11 players allowed");
    team1Checkboxes[team1Checkboxes.length - 1].checked = false;
    return;
  }

  if (team2Checkboxes.length > 0 && team2Checkboxes.length < 2) {
    alert("Select at least 2 players");
    team2Checkboxes[team2Checkboxes.length - 1].checked = false;
    return;
  }

  if (team2Checkboxes.length > 11) {
    alert("Maximum 11 players allowed");
    team2Checkboxes[team2Checkboxes.length - 1].checked = false;
    return;
  }
}

function savePlayingXI() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return;

  const team1Checkboxes = Array.from(document.querySelectorAll(".xi-checkbox[data-team-selector='team1']:checked"));
  const team2Checkboxes = Array.from(document.querySelectorAll(".xi-checkbox[data-team-selector='team2']:checked"));

  const team1XI = team1Checkboxes.map(cb => cb.value);
  const team2XI = team2Checkboxes.map(cb => cb.value);

  if (team1XI.length > 0 && team1XI.length < 2) {
    alert("Team 1: Select at least 2 players");
    return;
  }

  if (team2XI.length > 0 && team2XI.length < 2) {
    alert("Team 2: Select at least 2 players");
    return;
  }

  if (match.playingXI[match.team1Id].length === 0 && team1XI.length > 0) {
    match.playingXI[match.team1Id] = team1XI;
  }

  if (match.playingXI[match.team2Id].length === 0 && team2XI.length > 0) {
    match.playingXI[match.team2Id] = team2XI;
  }

  saveData();
  determineNextSetupStep();
}

// TOSS MANAGEMENT
// ============================================================================
function populateTossSelects() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return;

  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);

  if (!team1 || !team2) return;

  const tossWinnerSelect = document.getElementById("toss-winner");
  if (tossWinnerSelect) {
    tossWinnerSelect.innerHTML = `
      <option value="">Select Toss Winner</option>
      <option value="${team1.id}">${escapeHTML(team1.name)}</option>
      <option value="${team2.id}">${escapeHTML(team2.name)}</option>
    `;
  }
}

function saveToss() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return;

  const tossWinnerId = document.getElementById("toss-winner").value;
  const tossDecision = document.querySelector('input[name="toss-decision"]:checked')?.value;

  if (!tossWinnerId || !tossDecision) {
    alert("Please select toss winner and decision");
    return;
  }

  match.toss.winner = tossWinnerId;
  match.toss.decision = tossDecision;

  if (tossDecision === "bat") {
    match.toss.battingTeamId = tossWinnerId;
    match.toss.bowlingTeamId = tossWinnerId === match.team1Id ? match.team2Id : match.team1Id;
  } else {
    match.toss.bowlingTeamId = tossWinnerId;
    match.toss.battingTeamId = tossWinnerId === match.team1Id ? match.team2Id : match.team1Id;
  }

  saveData();
  initializeInnings();
  goToLiveScoring();
}

// INNINGS INITIALIZATION
// ============================================================================
function initializeInnings() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return;

  if (!match.innings) {
    match.innings = [];
  }

  if (match.innings.length === 0) {
    LiveState.inningsIndex = 0;
  } else if (match.innings.length === 1) {
    LiveState.inningsIndex = 1;
  } else {
    return;
  }

  const battingTeamId = LiveState.inningsIndex === 0 ? match.toss.battingTeamId : match.toss.bowlingTeamId;
  const bowlingTeamId = LiveState.inningsIndex === 0 ? match.toss.bowlingTeamId : match.toss.battingTeamId;

  const playingXI = match.playingXI[battingTeamId];
  if (!playingXI || playingXI.length < 2) {
    alert("Not enough players in batting team");
    return;
  }

  const firstBatsman = getPlayerById(playingXI[0]);
  const secondBatsman = getPlayerById(playingXI[1]);

  LiveState.strikerId = firstBatsman.id;
  LiveState.nonStrikerId = secondBatsman.id;

  const bowlingTeamPlayers = match.playingXI[bowlingTeamId];
  const firstBowler = getPlayerById(bowlingTeamPlayers[0]);
  LiveState.bowlerId = firstBowler.id;
  LiveState.pendingNewBatsman = false;
  LiveState.dismissedPlayerId = null;

  const inningsData = {
    inningsNumber: LiveState.inningsIndex + 1,
    battingTeamId: battingTeamId,
    bowlingTeamId: bowlingTeamId,
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    ballHistory: [],
    dismissed: []
  };

  match.innings.push(inningsData);
  match.status = "live";
  saveData();
}

function initializeLiveScoring() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return;

  if (match.innings.length === 1 && LiveState.inningsIndex === 0) {
    LiveState.inningsIndex = 1;
    initializeInnings();
  }

  const innings = match.innings[LiveState.inningsIndex];
  if (!innings) return;

  const battingTeamId = innings.battingTeamId;
  const playingXI = match.playingXI[battingTeamId];

  if (!LiveState.strikerId) {
    LiveState.strikerId = playingXI[0];
  }

  if (!LiveState.nonStrikerId) {
    LiveState.nonStrikerId = playingXI[1];
  }

  if (!LiveState.bowlerId) {
    const bowlingTeamPlayers = match.playingXI[innings.bowlingTeamId];
    LiveState.bowlerId = bowlingTeamPlayers[0];
  }
}

// LIVE SCORING
// ============================================================================
function renderLiveScoring() {
  const match = getMatchById(CurrentState.currentMatchId);
  const innings = getCurrentInnings();

  if (!match || !innings) return;

  const striker = getPlayerById(LiveState.strikerId);
  const nonStriker = getPlayerById(LiveState.nonStrikerId);
  const bowler = getPlayerById(LiveState.bowlerId);

  const battingTeam = getTeamById(innings.battingTeamId);

  document.getElementById("current-score").textContent = innings.runs;
  document.getElementById("current-wickets").textContent = innings.wickets;
  document.getElementById("current-overs").textContent = innings.overs + "." + innings.balls;
  document.getElementById("batting-team-name").textContent = escapeHTML(battingTeam.name);

  document.getElementById("striker-name").textContent = striker ? escapeHTML(striker.name) : "-";
  document.getElementById("non-striker-name").textContent = nonStriker ? escapeHTML(nonStriker.name) : "-";
  document.getElementById("bowler-name").textContent = bowler ? escapeHTML(bowler.name) : "-";

  renderBallHistory();
}

function renderBallHistory() {
  const innings = getCurrentInnings();
  if (!innings) return;

  const historyList = document.getElementById("ball-history-list");
  if (!historyList) return;

  historyList.innerHTML = "";

  if (innings.ballHistory.length === 0) {
    historyList.innerHTML = '<p class="empty-message">No balls bowled yet</p>';
    return;
  }

  innings.ballHistory.forEach((ball, index) => {
    const item = document.createElement("div");
    item.className = "ball-history-item";

    let ballText = "";
    if (ball.isWicket) {
      ballText = "WICKET";
    } else if (ball.isWide) {
      ballText = `WIDE (+${ball.runs})`;
    } else if (ball.isNoBall) {
      ballText = `NO BALL (+${ball.runs})`;
    } else {
      ballText = `Runs: ${ball.runs}`;
    }

    item.innerHTML = `<span class="ball-number">Ball ${index + 1}:</span> <span class="ball-detail">${ballText}</span>`;
    historyList.appendChild(item);
  });
}

function getCurrentInnings() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match || !match.innings) return null;
  return match.innings[LiveState.inningsIndex];
}

function recordRun(runs) {
  const innings = getCurrentInnings();
  if (!innings) return;

  if (LiveState.pendingNewBatsman) {
    alert("Select new batsman first");
    return;
  }

  innings.runs += runs;
  innings.balls += 1;

  if (innings.balls > 6) {
    innings.overs += 1;
    innings.balls = 1;
  }

  const ballData = {
    runs: runs,
    isWicket: false,
    isWide: false,
    isNoBall: false,
    isLegal: true,
    striker: LiveState.strikerId,
    bowler: LiveState.bowlerId
  };

  innings.ballHistory.push(ballData);

  if (runs % 2 === 1) {
    swapStrikers();
  }

  if (innings.balls === 1 && innings.ballHistory.length > 1) {
    swapStrikers();
  }

  checkInningsCompletion();
  saveData();
  renderLiveScoring();
  attachLiveScoringListeners();
}

function recordWide() {
  const innings = getCurrentInnings();
  if (!innings) return;

  if (LiveState.pendingNewBatsman) {
    alert("Select new batsman first");
    return;
  }

  innings.runs += 1;

  const ballData = {
    runs: 1,
    isWicket: false,
    isWide: true,
    isNoBall: false,
    isLegal: false,
    striker: LiveState.strikerId,
    bowler: LiveState.bowlerId
  };

  innings.ballHistory.push(ballData);

  checkInningsCompletion();
  saveData();
  renderLiveScoring();
  attachLiveScoringListeners();
}

function recordNoBall() {
  const innings = getCurrentInnings();
  if (!innings) return;

  if (LiveState.pendingNewBatsman) {
    alert("Select new batsman first");
    return;
  }

  innings.runs += 1;

  const ballData = {
    runs: 1,
    isWicket: false,
    isWide: false,
    isNoBall: true,
    isLegal: false,
    striker: LiveState.strikerId,
    bowler: LiveState.bowlerId
  };

  innings.ballHistory.push(ballData);

  checkInningsCompletion();
  saveData();
  renderLiveScoring();
  attachLiveScoringListeners();
}

function recordWicket() {
  const innings = getCurrentInnings();
  if (!innings) return;

  if (LiveState.pendingNewBatsman) {
    alert("Select new batsman first");
    return;
  }

  innings.wickets += 1;
  innings.balls += 1;

  if (innings.balls > 6) {
    innings.overs += 1;
    innings.balls = 1;
  }

  innings.dismissed.push(LiveState.strikerId);

  const ballData = {
    runs: 0,
    isWicket: true,
    isWide: false,
    isNoBall: false,
    isLegal: true,
    striker: LiveState.strikerId,
    bowler: LiveState.bowlerId
  };

  innings.ballHistory.push(ballData);

  LiveState.pendingNewBatsman = true;
  LiveState.dismissedPlayerId = LiveState.strikerId;

  checkInningsCompletion();
  saveData();

  if (getEligibleNewBatsmen().length > 0) {
    renderNewBatsmanSelector();
  } else {
    endCurrentInnings();
  }
}

function swapStrikers() {
  const temp = LiveState.strikerId;
  LiveState.strikerId = LiveState.nonStrikerId;
  LiveState.nonStrikerId = temp;
}

function getEligibleNewBatsmen() {
  const innings = getCurrentInnings();
  const match = getMatchById(CurrentState.currentMatchId);

  if (!innings || !match) return [];

  const playingXI = match.playingXI[innings.battingTeamId];
  return playingXI.filter(playerId => !innings.dismissed.includes(playerId));
}

function renderNewBatsmanSelector() {
  const eligible = getEligibleNewBatsmen();

  if (eligible.length === 0) {
    endCurrentInnings();
    return;
  }

  const screen = document.getElementById("new-batsman-screen");
  if (!screen) return;

  const list = document.getElementById("new-batsman-list");
  if (!list) return;

  list.innerHTML = "";

  eligible.forEach(playerId => {
    const player = getPlayerById(playerId);
    if (!player) return;

    const btn = document.createElement("button");
    btn.className = "new-batsman-btn";
    btn.dataset.playerId = playerId;
    btn.textContent = escapeHTML(player.name);

    list.appendChild(btn);
  });

  showScreen("new-batsman-screen");
  attachNewBatsmanListeners();
}

function attachNewBatsmanListeners() {
  document.querySelectorAll(".new-batsman-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const playerId = e.target.dataset.playerId;
      selectNewBatsman(playerId);
    });
  });
}

function selectNewBatsman(playerId) {
  LiveState.strikerId = playerId;
  LiveState.pendingNewBatsman = false;
  LiveState.dismissedPlayerId = null;
  saveData();
  goToLiveScoring();
}

function checkInningsCompletion() {
  const match = getMatchById(CurrentState.currentMatchId);
  const innings = getCurrentInnings();

  if (!match || !innings) return;

  if (innings.overs >= match.overs || innings.wickets >= 10) {
    endCurrentInnings();
  }
}

function endCurrentInnings() {
  const match = getMatchById(CurrentState.currentMatchId);

  if (!match) return;

  if (LiveState.inningsIndex === 0) {
    LiveState.inningsIndex = 1;
    LiveState.strikerId = null;
    LiveState.nonStrikerId = null;
    LiveState.bowlerId = null;
    LiveState.pendingNewBatsman = false;
    LiveState.dismissedPlayerId = null;

    initializeInnings();
    initializeLiveScoring();
    renderLiveScoring();
    attachLiveScoringListeners();
    saveData();
  } else {
    match.status = "completed";
    saveData();
    goToMatchSummary();
  }
}

// UNDO FUNCTIONALITY
// ============================================================================
function undoLastBall() {
  const innings = getCurrentInnings();
  if (!innings || innings.ballHistory.length === 0) {
    alert("Nothing to undo");
    return;
  }

  const lastBall = innings.ballHistory.pop();

  if (lastBall.isWicket) {
    innings.wickets -= 1;
    innings.balls -= 1;

    if (innings.balls === 0) {
      innings.overs -= 1;
      innings.balls = 6;
    }

    const dismissedIndex = innings.dismissed.indexOf(lastBall.striker);
    if (dismissedIndex > -1) {
      innings.dismissed.splice(dismissedIndex, 1);
    }

    LiveState.strikerId = lastBall.striker;
    LiveState.nonStrikerId = lastBall.striker === LiveState.bowlerId ? getNextBatsman() : LiveState.bowlerId;
    LiveState.pendingNewBatsman = false;
  } else if (lastBall.isWide || lastBall.isNoBall) {
    innings.runs -= 1;
  } else {
    innings.runs -= lastBall.runs;
    innings.balls -= 1;

    if (innings.balls === 0) {
      innings.overs -= 1;
      innings.balls = 6;
    }

    if (lastBall.runs % 2 === 1) {
      swapStrikers();
    }
  }

  saveData();
  renderLiveScoring();
  attachLiveScoringListeners();
}

function getNextBatsman() {
  const innings = getCurrentInnings();
  if (!innings) return null;

  const match = getMatchById(CurrentState.currentMatchId);
  const playingXI = match.playingXI[innings.battingTeamId];

  for (let playerId of playingXI) {
    if (!innings.dismissed.includes(playerId)) {
      return playerId;
    }
  }

  return null;
}

// MATCH SUMMARY
// ============================================================================
function renderMatchSummary() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return;

  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);

  if (!team1 || !team2) return;

  const summary1 = document.getElementById("innings1-summary");
  const summary2 = document.getElementById("innings2-summary");
  const resultDiv = document.getElementById("match-result");

  if (summary1 && match.innings[0]) {
    const innings1 = match.innings[0];
    const team1IsInnings1 = innings1.battingTeamId === match.team1Id ? team1.name : team2.name;
    summary1.innerHTML = `
      <p><strong>Team:</strong> ${escapeHTML(team1IsInnings1)}</p>
      <p><strong>Score:</strong> ${innings1.runs}/${innings1.wickets}</p>
      <p><strong>Overs:</strong> ${innings1.overs}.${innings1.balls}</p>
    `;
  }

  if (summary2 && match.innings[1]) {
    const innings2 = match.innings[1];
    const team2IsInnings2 = innings2.battingTeamId === match.team1Id ? team1.name : team2.name;
    summary2.innerHTML = `
      <p><strong>Team:</strong> ${escapeHTML(team2IsInnings2)}</p>
      <p><strong>Score:</strong> ${innings2.runs}/${innings2.wickets}</p>
      <p><strong>Overs:</strong> ${innings2.overs}.${innings2.balls}</p>
    `;
  }

  if (resultDiv) {
    let resultText = "Match Summary";

    if (match.innings.length === 2) {
      const team1Batting = match.innings[0].battingTeamId === match.team1Id ? match.innings[0] : match.innings[1];
      const team2Batting = match.innings[1].battingTeamId === match.team2Id ? match.innings[1] : match.innings[0];

      if (team1Batting && team2Batting) {
        if (team1Batting.runs > team2Batting.runs) {
          resultText = `${escapeHTML(team1.name)} won by ${team1Batting.runs - team2Batting.runs} runs`;
        } else if (team2Batting.runs > team1Batting.runs) {
          resultText = `${escapeHTML(team2.name)} won by ${10 - team2Batting.wickets} wickets`;
        } else {
          resultText = "Match tied";
        }
      }
    }

    resultDiv.innerHTML = `<h3>${resultText}</h3>`;
  }
}

// EVENT LISTENERS FOR LIVE SCORING
// ============================================================================
function attachLiveScoringListeners() {
  const runBtns = document.querySelectorAll(".run-btn");
  runBtns.forEach(btn => {
    btn.removeEventListener("click", handleRunClick);
    btn.addEventListener("click", handleRunClick);
  });

  const wicketBtn = document.getElementById("btn-wicket");
  if (wicketBtn) {
    wicketBtn.removeEventListener("click", handleWicketClick);
    wicketBtn.addEventListener("click", handleWicketClick);
  }

  const wideBtn = document.getElementById("btn-wide");
  if (wideBtn) {
    wideBtn.removeEventListener("click", handleWideClick);
    wideBtn.addEventListener("click", handleWideClick);
  }

  const noballBtn = document.getElementById("btn-noball");
  if (noballBtn) {
    noballBtn.removeEventListener("click", handleNoBallClick);
    noballBtn.addEventListener("click", handleNoBallClick);
  }

  const undoBtn = document.getElementById("btn-undo-live-ball");
  if (undoBtn) {
    undoBtn.removeEventListener("click", handleUndoClick);
    undoBtn.addEventListener("click", handleUndoClick);
  }

  const backBtn = document.getElementById("btn-back-from-live-scoring");
  if (backBtn) {
    backBtn.removeEventListener("click", handleBackFromLiveClick);
    backBtn.addEventListener("click", handleBackFromLiveClick);
  }
}

function handleRunClick(e) {
  const runs = parseInt(e.target.dataset.runs);
  recordRun(runs);
}

function handleWicketClick() {
  recordWicket();
}

function handleWideClick() {
  recordWide();
}

function handleNoBallClick() {
  recordNoBall();
}

function handleUndoClick() {
  undoLastBall();
}

function handleBackFromLiveClick() {
  if (confirm("End match?")) {
    goToTournamentDashboard(CurrentState.currentTournamentId);
  }
}

// FORM SUBMISSION HANDLERS
// ============================================================================
function setupFormListeners() {
  const tournamentForm = document.getElementById("tournament-form");
  if (tournamentForm) {
    tournamentForm.removeEventListener("submit", handleTournamentSubmit);
    tournamentForm.addEventListener("submit", handleTournamentSubmit);
  }

  const teamForm = document.getElementById("team-form");
  if (teamForm) {
    teamForm.removeEventListener("submit", handleTeamSubmit);
    teamForm.addEventListener("submit", handleTeamSubmit);
  }

  const playerForm = document.getElementById("player-form");
  if (playerForm) {
    playerForm.removeEventListener("submit", handlePlayerSubmit);
    playerForm.addEventListener("submit", handlePlayerSubmit);
  }

  const matchSetupForm = document.getElementById("match-setup-form");
  if (matchSetupForm) {
    matchSetupForm.removeEventListener("submit", handleMatchSetupSubmit);
    matchSetupForm.addEventListener("submit", handleMatchSetupSubmit);
  }

  const tossForm = document.getElementById("toss-form");
  if (tossForm) {
    tossForm.removeEventListener("submit", handleTossSubmit);
    tossForm.addEventListener("submit", handleTossSubmit);
  }
}

function handleTournamentSubmit(e) {
  e.preventDefault();
  createTournament();
}

function handleTeamSubmit(e) {
  e.preventDefault();
  createTeam();
}

function handlePlayerSubmit(e) {
  e.preventDefault();
  createPlayer();
}

function handleMatchSetupSubmit(e) {
  e.preventDefault();
  createMatch();
}

function handleTossSubmit(e) {
  e.preventDefault();
  saveToss();
}

// MAIN NAVIGATION SETUP
// ============================================================================
function setupMainNavigation() {
  const btnViewTournaments = document.getElementById("btn-view-tournaments");
  if (btnViewTournaments) {
    btnViewTournaments.removeEventListener("click", goToTournaments);
    btnViewTournaments.addEventListener("click", goToTournaments);
  }

  const btnNewTournament = document.getElementById("btn-new-tournament");
  if (btnNewTournament) {
    btnNewTournament.removeEventListener("click", goToCreateTournament);
    btnNewTournament.addEventListener("click", goToCreateTournament);
  }

  const btnCreateTournament = document.getElementById("btn-create-tournament");
  if (btnCreateTournament) {
    btnCreateTournament.removeEventListener("click", goToCreateTournament);
    btnCreateTournament.addEventListener("click", goToCreateTournament);
  }

  const btnAddTeam = document.getElementById("btn-add-team");
  if (btnAddTeam) {
    btnAddTeam.removeEventListener("click", goToAddTeam);
    btnAddTeam.addEventListener("click", goToAddTeam);
  }

  const btnAddPlayer = document.getElementById("btn-add-player");
  if (btnAddPlayer) {
    btnAddPlayer.removeEventListener("click", goToAddPlayer);
    btnAddPlayer.addEventListener("click", goToAddPlayer);
  }

  const btnCreateMatch = document.getElementById("btn-create-match");
  if (btnCreateMatch) {
    btnCreateMatch.removeEventListener("click", goToMatchSetup);
    btnCreateMatch.addEventListener("click", goToMatchSetup);
  }

  const btnStartMatch = document.getElementById("btn-start-match");
  if (btnStartMatch) {
    btnStartMatch.removeEventListener("click", savePlayingXI);
    btnStartMatch.addEventListener("click", savePlayingXI);
  }

  setupBackButtons();
}

function setupBackButtons() {
  const backButtons = [
    { id: "btn-back-home-tournaments", handler: goToTournaments },
    { id: "btn-back-tournaments-create", handler: goToTournaments },
    { id: "btn-back-tournaments-dashboard", handler: goToTournaments },
    { id: "btn-back-dashboard-team", handler: () => goToTournamentDashboard(CurrentState.currentTournamentId) },
    { id: "btn-back-dashboard-team-details", handler: () => goToTournamentDashboard(CurrentState.currentTournamentId) },
    { id: "btn-back-team-player", handler: () => goToTeamDetails(CurrentState.currentTeamId) },
    { id: "btn-back-dashboard-match", handler: () => goToTournamentDashboard(CurrentState.currentTournamentId) },
    { id: "btn-back-setup-toss", handler: goToMatchSetup },
    { id: "btn-back-toss-xi", handler: goToToss },
    { id: "btn-back-summary", handler: () => goToTournamentDashboard(CurrentState.currentTournamentId) }
  ];

  backButtons.forEach(({ id, handler }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.removeEventListener("click", handler);
      btn.addEventListener("click", handler);
    }
  });
}

// TAB NAVIGATION
// ============================================================================
function setupTabNavigation() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.removeEventListener("click", handleTabClick);
    btn.addEventListener("click", handleTabClick);
  });
}

function handleTabClick(e) {
  const tabName = e.target.dataset.tab;

  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.remove("active");
  });

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  const targetTab = document.getElementById(tabName);
  if (targetTab) {
    targetTab.classList.add("active");
  }

  e.target.classList.add("active");
}

// APP INITIALIZATION
// ============================================================================
function initializeApp() {
  loadData();

  setupFormListeners();
  setupMainNavigation();
  setupTabNavigation();

  showScreen("home-screen");
}

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});
