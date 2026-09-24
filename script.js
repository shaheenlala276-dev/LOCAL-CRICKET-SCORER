/* =========================================
   LOCAL CRICKET SCORER
   VERSION 1.0 - FOUNDATION
   ========================================= */

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
    currentMatchId: null
};


/* =========================================
   STORAGE
   ========================================= */

function saveData() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(AppData)
    );
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {
        const data = JSON.parse(saved);

        AppData.tournaments = data.tournaments || [];
        AppData.teams = data.teams || [];
        AppData.players = data.players || [];
        AppData.matches = data.matches || [];

    } catch (error) {
        console.error("Could not load saved data:", error);
    }
}


/* =========================================
   ID GENERATOR
   ========================================= */

function generateId(prefix) {
    return (
        prefix +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2, 8)
    );
}


/* =========================================
   SCREEN SYSTEM
   ========================================= */

function showScreen(screenId) {

    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    const screen = document.getElementById(screenId);

    if (screen) {
        screen.classList.add("active");
    }
}


/* =========================================
   START APP
   ========================================= */

function initializeApp() {

    loadData();

    showScreen("home-screen");

    console.log("Local Cricket Scorer started.");
}

/* =========================================
   TOURNAMENT MANAGEMENT
   ========================================= */

function createTournament() {

    const name = prompt("Enter tournament name:");

    if (!name || !name.trim()) {
        return;
    }

    const tournament = {
        id: generateId("tourn_"),
        name: name.trim(),
        createdAt: new Date().toISOString()
    };

    AppData.tournaments.push(tournament);

    saveData();

    alert("Tournament created successfully!");

    console.log("Tournament created:", tournament);
}
/* =========================================
   START WHEN PAGE LOADS
   ========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);
