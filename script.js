const STORAGE_KEY = "cricket_scorer_v1";

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
  pendingNewBatsman: false
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveData() {
  const data = {
    appData: AppData,
    currentState: CurrentState,
    liveState: LiveState
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      Object.assign(AppData, parsed.appData);
      Object.assign(CurrentState, parsed.currentState);
      Object.assign(LiveState, parsed.liveState);
    } catch (e) {
      console.error("Error loading data", e);
    }
  }
}

function escapeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
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
  document.querySelectorAll('[data-screen]').forEach(screen => {
    screen.style.display = 'none';
  });
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.style.display = 'block';
  }
}

function createTournament() {
  const name = document.getElementById('tournament-name').value.trim();
  if (!name) {
    alert('Please enter tournament name');
    return;
  }
  AppData.tournaments.push({
    id: generateId(),
    name: name,
    createdAt: new Date().toISOString()
  });
  saveData();
  document.getElementById('tournament-name').value = '';
  showScreen('tournaments-screen');
  renderTournamentList();
}

function deleteTournament(id) {
  if (confirm('Delete this tournament?')) {
    AppData.tournaments = AppData.tournaments.filter(t => t.id !== id);
    AppData.matches = AppData.matches.filter(m => m.tournamentId !== id);
    saveData();
    renderTournamentList();
  }
}

function renderTournamentList() {
  const list = document.getElementById('tournaments-list');
  if (!list) return;

  list.innerHTML = '';
  AppData.tournaments.forEach(tournament => {
    const div = document.createElement('div');
    div.className = 'tournament-card';
    div.innerHTML = `
      <div class="tournament-info">
        <h3>${escapeHTML(tournament.name)}</h3>
      </div>
      <div class="tournament-actions">
        <button onclick="openTournament('${tournament.id}')" class="btn btn-primary">Open</button>
        <button onclick="deleteTournament('${tournament.id}')" class="btn btn-danger">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function openTournament(id) {
  CurrentState.currentTournamentId = id;
  CurrentState.currentTeamId = null;
  saveData();
  renderTournamentDashboard();
  showScreen('tournament-screen');
}

function renderTournamentDashboard() {
  const tournament = getTournamentById(CurrentState.currentTournamentId);
  if (!tournament) return;

  const screen = document.getElementById('tournament-screen');
  if (!screen) return;

  screen.innerHTML = `
    <div class="screen-header">
      <h2>${escapeHTML(tournament.name)}</h2>
      <button id="btn-back-to-tournament" class="btn btn-secondary">Back</button>
    </div>
    <div class="screen-content">
      <div class="nav-tabs">
        <button onclick="showTournamentTab('teams')" class="tab-btn active">Teams</button>
        <button onclick="showTournamentTab('matches')" class="tab-btn">Matches</button>
      </div>
      <div id="teams-tab" class="tab-content">
        <button onclick="showScreen('create-team-screen')" class="btn btn-primary">+ Add Team</button>
        <div id="teams-list"></div>
      </div>
      <div id="matches-tab" class="tab-content" style="display:none;">
        <button onclick="showScreen('create-match-screen')" class="btn btn-primary">+ Create Match</button>
        <div id="matches-list"></div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-to-tournament').addEventListener('click', () => {
    showScreen('tournaments-screen');
  });

  renderTeams();
  renderTournamentMatches();
}

function showTournamentTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  if (tabName === 'teams') {
    document.getElementById('teams-tab').style.display = 'block';
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
  } else if (tabName === 'matches') {
    document.getElementById('matches-tab').style.display = 'block';
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
  }
}

function createTeam() {
  const name = document.getElementById('team-name').value.trim();
  if (!name) {
    alert('Please enter team name');
    return;
  }
  AppData.teams.push({
    id: generateId(),
    name: name,
    tournamentId: CurrentState.currentTournamentId
  });
  saveData();
  document.getElementById('team-name').value = '';
  renderTeams();
  showScreen('tournament-screen');
}

function deleteTeam(id) {
  if (confirm('Delete this team?')) {
    AppData.teams = AppData.teams.filter(t => t.id !== id);
    AppData.players = AppData.players.filter(p => p.teamId !== id);
    saveData();
    renderTeams();
  }
}

function renderTeams() {
  const list = document.getElementById('teams-list');
  if (!list) return;

  const teams = AppData.teams.filter(t => t.tournamentId === CurrentState.currentTournamentId);
  list.innerHTML = '';
  teams.forEach(team => {
    const div = document.createElement('div');
    div.className = 'team-card';
    div.innerHTML = `
      <div class="team-info">
        <h4>${escapeHTML(team.name)}</h4>
      </div>
      <div class="team-actions">
        <button onclick="openTeam('${team.id}')" class="btn btn-primary">View</button>
        <button onclick="deleteTeam('${team.id}')" class="btn btn-danger">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function openTeam(id) {
  CurrentState.currentTeamId = id;
  saveData();
  renderTeamDetails();
  showScreen('team-screen');
}

function renderTeamDetails() {
  const team = getTeamById(CurrentState.currentTeamId);
  if (!team) return;

  const screen = document.getElementById('team-screen');
  if (!screen) return;

  screen.innerHTML = `
    <div class="screen-header">
      <h2>${escapeHTML(team.name)}</h2>
      <button id="btn-back-to-team" class="btn btn-secondary">Back</button>
    </div>
    <div class="screen-content">
      <button onclick="showScreen('add-player-screen')" class="btn btn-primary">+ Add Player</button>
      <div id="players-list"></div>
    </div>
  `;

  document.getElementById('btn-back-to-team').addEventListener('click', () => {
    renderTournamentDashboard();
    showScreen('tournament-screen');
  });

  renderPlayers();
}

function createPlayer() {
  const name = document.getElementById('player-name').value.trim();
  if (!name) {
    alert('Please enter player name');
    return;
  }
  AppData.players.push({
    id: generateId(),
    name: name,
    teamId: CurrentState.currentTeamId
  });
  saveData();
  document.getElementById('player-name').value = '';
  renderPlayers();
  showScreen('team-screen');
}

function deletePlayer(id) {
  if (confirm('Delete this player?')) {
    AppData.players = AppData.players.filter(p => p.id !== id);
    saveData();
    renderPlayers();
  }
}

function renderPlayers() {
  const list = document.getElementById('players-list');
  if (!list) return;

  const players = AppData.players.filter(p => p.teamId === CurrentState.currentTeamId);
  list.innerHTML = '';
  players.forEach(player => {
    const div = document.createElement('div');
    div.className = 'player-card';
    div.innerHTML = `
      <div class="player-info">
        <p>${escapeHTML(player.name)}</p>
      </div>
      <div class="player-actions">
        <button onclick="deletePlayer('${player.id}')" class="btn btn-danger">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function createMatch() {
  const team1Id = document.getElementById('match-team1').value;
  const team2Id = document.getElementById('match-team2').value;
  const overs = parseInt(document.getElementById('match-overs').value);
  const venue = document.getElementById('match-venue').value.trim();
  const matchDate = document.getElementById('match-date').value;
  const tossWinner = document.getElementById('match-toss-winner').value;
  const tossDecision = document.getElementById('match-toss-decision').value;

  if (!team1Id || !team2Id || team1Id === team2Id) {
    alert('Select two different teams');
    return;
  }

  if (!overs || overs < 1) {
    alert('Enter valid number of overs');
    return;
  }

  AppData.matches.push({
    id: generateId(),
    tournamentId: CurrentState.currentTournamentId,
    team1Id: team1Id,
    team2Id: team2Id,
    overs: overs,
    venue: venue,
    matchDate: matchDate,
    tossWinner: tossWinner,
    tossDecision: tossDecision,
    innings: [
      {
        battingTeamId: tossDecision === 'bat' ? tossWinner : (tossWinner === team1Id ? team2Id : team1Id),
        bowlingTeamId: tossDecision === 'bat' ? (tossWinner === team1Id ? team2Id : team1Id) : tossWinner,
        runs: 0,
        wickets: 0,
        balls: [],
        dismissed: []
      },
      {
        battingTeamId: tossDecision === 'bat' ? (tossWinner === team1Id ? team2Id : team1Id) : tossWinner,
        bowlingTeamId: tossDecision === 'bat' ? tossWinner : (tossWinner === team1Id ? team2Id : team1Id),
        runs: 0,
        wickets: 0,
        balls: [],
        dismissed: []
      }
    ],
    status: 'created'
  });

  saveData();
  document.getElementById('match-team1').value = '';
  document.getElementById('match-team2').value = '';
  document.getElementById('match-overs').value = '';
  document.getElementById('match-venue').value = '';
  document.getElementById('match-date').value = '';
  document.getElementById('match-toss-winner').value = '';
  document.getElementById('match-toss-decision').value = '';

  renderTournamentMatches();
  showScreen('tournament-screen');
  showTournamentTab('matches');
}

function renderTournamentMatches() {
  const list = document.getElementById('matches-list');
  if (!list) return;

  const matches = AppData.matches.filter(m => m.tournamentId === CurrentState.currentTournamentId);
  list.innerHTML = '';
  matches.forEach(match => {
    const team1 = getTeamById(match.team1Id);
    const team2 = getTeamById(match.team2Id);
    const team1Name = team1 ? team1.name : 'Unknown';
    const team2Name = team2 ? team2.name : 'Unknown';

    const div = document.createElement('div');
    div.className = 'match-card';
    div.innerHTML = `
      <div class="match-info">
        <h4>${escapeHTML(team1Name)} vs ${escapeHTML(team2Name)}</h4>
        <p>${match.overs} Overs | ${escapeHTML(match.venue)}</p>
      </div>
      <div class="match-actions">
        ${match.status === 'created' ? `<button onclick="openMatch('${match.id}')" class="btn btn-primary">Start</button>` : `<button onclick="openMatch('${match.id}')" class="btn btn-primary">View</button>`}
      </div>
    `;
    list.appendChild(div);
  });
}

function openMatch(id) {
  CurrentState.currentMatchId = id;
  saveData();
  const match = getMatchById(id);
  if (match.status === 'created') {
    startMatch();
  } else {
    renderMatchScreen();
  }
}

function startMatch() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return;

  LiveState.inningsIndex = 0;
  LiveState.pendingNewBatsman = false;
  match.status = 'live';
  saveData();
  initializeLiveScoring();
  renderLiveScoring();
  attachLiveScoringListeners();
  showScreen('live-scoring-screen');
}

function initializeLiveScoring() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return;

  const innings = match.innings[LiveState.inningsIndex];
  const battingTeam = getTeamById(innings.battingTeamId);
  const battingPlayers = AppData.players.filter(p => p.teamId === innings.battingTeamId);

  if (battingPlayers.length < 2) {
    alert('Not enough players in batting team');
    return;
  }

  LiveState.strikerId = battingPlayers[0].id;
  LiveState.nonStrikerId = battingPlayers[1].id;
  LiveState.bowlerId = AppData.players.find(p => p.teamId === innings.bowlingTeamId)?.id || null;
}

function getCurrentInnings() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return null;
  return match.innings[LiveState.inningsIndex];
}

function getBallsInCurrentOver() {
  const innings = getCurrentInnings();
  if (!innings || !innings.balls.length) return 0;
  const lastBall = innings.balls[innings.balls.length - 1];
  return lastBall.ballInOver || 1;
}

function getLegalBallsCount() {
  const innings = getCurrentInnings();
  if (!innings) return 0;
  return innings.balls.filter(b => b.isLegal).length;
}

function getOversCount() {
  const legalBalls = getLegalBallsCount();
  return Math.floor(legalBalls / 6);
}

function getBallsInCurrentOverCount() {
  const legalBalls = getLegalBallsCount();
  return legalBalls % 6;
}

function getEligibleNewBatsmen() {
  const innings = getCurrentInnings();
  const team = getTeamById(innings.battingTeamId);
  const players = AppData.players.filter(p => p.teamId === team.id);

  return players.filter(p => 
    p.id !== LiveState.strikerId && 
    p.id !== LiveState.nonStrikerId && 
    !innings.dismissed.includes(p.id)
  );
}

function renderNewBatsmanSelector() {
  const screen = document.getElementById('live-scoring-screen');
  if (!screen) return;

  const eligible = getEligibleNewBatsmen();
  if (eligible.length === 0) {
    getCurrentInnings().dismissed = Array.from(new Set([...getCurrentInnings().dismissed, LiveState.strikerId]));
    endInnings();
    return;
  }

  screen.innerHTML = `
    <div class="screen-header">
      <h2>Select New Batsman</h2>
    </div>
    <div class="screen-content">
      <div id="new-batsman-list"></div>
    </div>
  `;

  const list = document.getElementById('new-batsman-list');
  eligible.forEach(player => {
    const btn = document.createElement('button');
    btn.className = 'new-batsman-btn';
    btn.dataset.playerId = player.id;
    btn.textContent = player.name;
    btn.addEventListener('click', () => selectNewBatsman(player.id));
    list.appendChild(btn);
  });
}

function selectNewBatsman(playerId) {
  const innings = getCurrentInnings();
  innings.dismissed.push(LiveState.strikerId);
  LiveState.strikerId = playerId;
  LiveState.pendingNewBatsman = false;
  saveData();
  renderLiveScoring();
  attachLiveScoringListeners();
}

function renderLiveScoring() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return;

  const innings = getCurrentInnings();
  const striker = getPlayerById(LiveState.strikerId);
  const nonStriker = getPlayerById(LiveState.nonStrikerId);
  const bowler = getPlayerById(LiveState.bowlerId);

  const overs = getOversCount();
  const balls = getBallsInCurrentOverCount();
  const legalBalls = getLegalBallsCount();

  const screen = document.getElementById('live-scoring-screen');
  if (!screen) return;

  screen.innerHTML = `
    <div class="screen-header">
      <h2>Live Scoring</h2>
      <button id="btn-back-from-live-scoring" class="btn btn-secondary">Back</button>
    </div>
    <div class="screen-content">
      <div class="scorecard">
        <div class="score-row">
          <span>Runs:</span>
          <span id="current-runs">${innings.runs}</span>
        </div>
        <div class="score-row">
          <span>Wickets:</span>
          <span id="current-wickets">${innings.wickets}</span>
        </div>
        <div class="score-row">
          <span>Overs:</span>
          <span id="current-overs">${overs}.${balls}</span>
        </div>
      </div>

      <div class="striker-info">
        <p><strong>Striker:</strong> ${striker ? escapeHTML(striker.name) : 'None'}</p>
        <p><strong>Non-Striker:</strong> ${nonStriker ? escapeHTML(nonStriker.name) : 'None'}</p>
        <p><strong>Bowler:</strong> ${bowler ? escapeHTML(bowler.name) : 'None'}</p>
      </div>

      <div class="controls">
        <button class="run-btn" data-runs="0">0</button>
        <button class="run-btn" data-runs="1">1</button>
        <button class="run-btn" data-runs="2">2</button>
        <button class="run-btn" data-runs="3">3</button>
        <button class="run-btn" data-runs="4">4</button>
        <button class="run-btn" data-runs="6">6</button>
        <button id="btn-wide">Wide</button>
        <button id="btn-noball">No Ball</button>
        <button id="btn-wicket">Wicket</button>
        <button id="btn-undo-live-ball">Undo</button>
      </div>

      <div class="ball-history">
        <h3>Ball History</h3>
        <div id="ball-history-list"></div>
      </div>
    </div>
  `;

  renderBallHistory();
}

function renderBallHistory() {
  const innings = getCurrentInnings();
  const list = document.getElementById('ball-history-list');
  if (!list) return;

  list.innerHTML = '';
  innings.balls.forEach((ball, index) => {
    const div = document.createElement('div');
    div.className = 'ball-item';
    let ballType = 'Runs: ' + ball.runs;
    if (ball.isWicket) ballType = 'WICKET';
    if (ball.isWide) ballType = 'WIDE';
    if (ball.isNoBall) ballType = 'NO BALL';
    div.textContent = `Ball ${index + 1}: ${ballType}`;
    list.appendChild(div);
  });
}

function recordLiveBall(runs, options = {}) {
  const match = getMatchById(CurrentState.currentMatchId);
  const innings = getCurrentInnings();
  if (!match || !innings) return;

  const isWide = options.isWide || false;
  const isNoBall = options.isNoBall || false;
  const isWicket = options.isWicket || false;
  const isLegal = !isWide && !isNoBall;

  const legalBalls = getLegalBallsCount();
  const ballInOver = (legalBalls % 6) + 1;
  const overNumber = Math.floor(legalBalls / 6);

  innings.balls.push({
    runs: runs,
    isWide: isWide,
    isNoBall: isNoBall,
    isWicket: isWicket,
    isLegal: isLegal,
    striker: LiveState.strikerId,
    bowler: LiveState.bowlerId,
    ballInOver: ballInOver,
    overNumber: overNumber
  });

  innings.runs += runs;

  if (isWicket) {
    innings.wickets += 1;
    LiveState.pendingNewBatsman = true;
  }

  if (isLegal && !isWicket) {
    if (runs % 2 === 1) {
      swapLiveStrikers();
    }
  }

  if (isLegal && getBallsInCurrentOverCount() === 0 && !isWicket) {
    swapLiveStrikers();
  }

  const totalOvers = getOversCount();
  if (totalOvers >= match.overs) {
    endInnings();
    return;
  }

  if (innings.wickets >= 10) {
    endInnings();
    return;
  }

  saveData();

  if (LiveState.pendingNewBatsman) {
    renderNewBatsmanSelector();
  } else {
    renderLiveScoring();
    attachLiveScoringListeners();
  }
}

function swapLiveStrikers() {
  const temp = LiveState.strikerId;
  LiveState.strikerId = LiveState.nonStrikerId;
  LiveState.nonStrikerId = temp;
}

function undoLastLiveBall() {
  const innings = getCurrentInnings();
  if (!innings || innings.balls.length === 0) return;

  const lastBall = innings.balls.pop();
  innings.runs -= lastBall.runs;

  if (lastBall.isWicket) {
    innings.wickets -= 1;
    const dismissed = innings.dismissed;
    if (dismissed.length > 0) {
      dismissed.pop();
    }
  }

  LiveState.pendingNewBatsman = false;

  const legalBalls = getLegalBallsCount();
  const ballInOver = (legalBalls % 6);

  if (lastBall.isLegal && !lastBall.isWicket) {
    if (lastBall.runs % 2 === 1) {
      swapLiveStrikers();
    }
  }

  if (lastBall.isLegal && ballInOver === 0 && innings.balls.length > 0) {
    const prevBall = innings.balls[innings.balls.length - 1];
    if (prevBall.ballInOver === 6) {
      swapLiveStrikers();
    }
  }

  saveData();
  renderLiveScoring();
  attachLiveScoringListeners();
}

function attachLiveScoringListeners() {
  const screen = document.getElementById('live-scoring-screen');
  if (!screen) return;

  const runButtons = screen.querySelectorAll('.run-btn');
  runButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (LiveState.pendingNewBatsman) {
        alert('Select new batsman first');
        return;
      }
      const runs = parseInt(btn.dataset.runs);
      recordLiveBall(runs);
    });
  });

  const wicketBtn = document.getElementById('btn-wicket');
  if (wicketBtn) {
    wicketBtn.addEventListener('click', () => {
      if (LiveState.pendingNewBatsman) {
        alert('Select new batsman first');
        return;
      }
      recordLiveBall(0, { isWicket: true });
    });
  }

  const wideBtn = document.getElementById('btn-wide');
  if (wideBtn) {
    wideBtn.addEventListener('click', () => {
      if (LiveState.pendingNewBatsman) {
        alert('Select new batsman first');
        return;
      }
      recordLiveBall(1, { isWide: true });
    });
  }

  const noballBtn = document.getElementById('btn-noball');
  if (noballBtn) {
    noballBtn.addEventListener('click', () => {
      if (LiveState.pendingNewBatsman) {
        alert('Select new batsman first');
        return;
      }
      recordLiveBall(1, { isNoBall: true });
    });
  }

  const undoBtn = document.getElementById('btn-undo-live-ball');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      undoLastLiveBall();
    });
  }

  const backBtn = document.getElementById('btn-back-from-live-scoring');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (confirm('End match?')) {
        renderTournamentMatches();
        showScreen('tournament-screen');
        showTournamentTab('matches');
      }
    });
  }
}

function endInnings() {
  const match = getMatchById(CurrentState.currentMatchId);
  if (!match) return;

  if (LiveState.inningsIndex === 0) {
    LiveState.inningsIndex = 1;
    initializeLiveScoring();
    renderLiveScoring();
    attachLiveScoringListeners();
  } else {
    match.status = 'completed';
    saveData();
    renderTournamentMatches();
    showScreen('tournament-screen');
    showTournamentTab('matches');
  }
}

function setupCreateTournamentForm() {
  const screen = document.getElementById('create-tournament-screen');
  if (!screen) return;

  screen.innerHTML = `
    <div class="screen-header">
      <h2>Create Tournament</h2>
      <button id="btn-back-create-tournament" class="btn btn-secondary">Back</button>
    </div>
    <div class="screen-content">
      <form id="tournament-form">
        <input type="text" id="tournament-name" placeholder="Tournament Name" />
        <button type="button" onclick="createTournament()" class="btn btn-primary">Create</button>
      </form>
    </div>
  `;

  document.getElementById('btn-back-create-tournament').addEventListener('click', () => {
    showScreen('tournaments-screen');
  });
}

function setupCreateTeamForm() {
  const screen = document.getElementById('create-team-screen');
  if (!screen) return;

  screen.innerHTML = `
    <div class="screen-header">
      <h2>Add Team</h2>
      <button id="btn-back-create-team" class="btn btn-secondary">Back</button>
    </div>
    <div class="screen-content">
      <form>
        <input type="text" id="team-name" placeholder="Team Name" />
        <button type="button" onclick="createTeam()" class="btn btn-primary">Add</button>
      </form>
    </div>
  `;

  document.getElementById('btn-back-create-team').addEventListener('click', () => {
    renderTournamentDashboard();
    showScreen('tournament-screen');
  });
}

function setupAddPlayerForm() {
  const screen = document.getElementById('add-player-screen');
  if (!screen) return;

  screen.innerHTML = `
    <div class="screen-header">
      <h2>Add Player</h2>
      <button id="btn-back-add-player" class="btn btn-secondary">Back</button>
    </div>
    <div class="screen-content">
      <form>
        <input type="text" id="player-name" placeholder="Player Name" />
        <button type="button" onclick="createPlayer()" class="btn btn-primary">Add</button>
      </form>
    </div>
  `;

  document.getElementById('btn-back-add-player').addEventListener('click', () => {
    renderTeamDetails();
    showScreen('team-screen');
  });
}

function setupCreateMatchForm() {
  const screen = document.getElementById('create-match-screen');
  if (!screen) return;

  const tournament = getTournamentById(CurrentState.currentTournamentId);
  const teams = AppData.teams.filter(t => t.tournamentId === CurrentState.currentTournamentId);

  let teamOptions = '';
  teams.forEach(team => {
    teamOptions += `<option value="${team.id}">${escapeHTML(team.name)}</option>`;
  });

  screen.innerHTML = `
    <div class="screen-header">
      <h2>Create Match</h2>
      <button id="btn-back-create-match" class="btn btn-secondary">Back</button>
    </div>
    <div class="screen-content">
      <form>
        <label>Team 1:</label>
        <select id="match-team1">
          <option value="">Select Team</option>
          ${teamOptions}
        </select>

        <label>Team 2:</label>
        <select id="match-team2">
          <option value="">Select Team</option>
          ${teamOptions}
        </select>

        <label>Overs:</label>
        <input type="number" id="match-overs" min="1" value="50" />

        <label>Venue:</label>
        <input type="text" id="match-venue" placeholder="Venue" />

        <label>Date:</label>
        <input type="date" id="match-date" />

        <label>Toss Winner:</label>
        <select id="match-toss-winner">
          <option value="">Select Team</option>
          ${teamOptions}
        </select>

        <label>Toss Decision:</label>
        <select id="match-toss-decision">
          <option value="">Select Decision</option>
          <option value="bat">Bat</option>
          <option value="field">Field</option>
        </select>

        <button type="button" onclick="createMatch()" class="btn btn-primary">Create</button>
      </form>
    </div>
  `;

  document.getElementById('btn-back-create-match').addEventListener('click', () => {
    renderTournamentDashboard();
    showScreen('tournament-screen');
    showTournamentTab('matches');
  });
}

function initializeApp() {
  loadData();

  setupCreateTournamentForm();
  setupCreateTeamForm();
  setupAddPlayerForm();
  setupCreateMatchForm();

  const homeScreen = document.getElementById('home-screen');
  if (homeScreen) {
    homeScreen.innerHTML = `
      <div class="screen-header">
        <h2>Cricket Scorer</h2>
      </div>
      <div class="screen-content">
        <button onclick="showTournamentsScreen()" class="btn btn-primary">Tournaments</button>
      </div>
    `;
  }

  showScreen('home-screen');
}

function showTournamentsScreen() {
  showScreen('tournaments-screen');
  renderTournamentList();
}

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});
