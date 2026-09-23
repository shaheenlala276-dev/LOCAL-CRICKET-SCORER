// ==========================================
// LOCAL CRICKET SCORER
// VERSION 1 - BASIC TOURNAMENT SETUP
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    const createTournamentBtn = document.getElementById("create-tournament-btn");
    const startMatchBtn = document.getElementById("start-match-btn");

    // Create Tournament button
    createTournamentBtn.addEventListener("click", function () {

        const tournamentName = prompt("Enter tournament name:");

        if (tournamentName && tournamentName.trim() !== "") {
            localStorage.setItem(
                "cricketTournamentName",
                tournamentName.trim()
            );

            alert(
                "🏆 Tournament created successfully!\n\n" +
                "Tournament: " + tournamentName.trim()
            );
        } else {
            alert("Please enter a tournament name.");
        }
    });

    // Start Match button
    startMatchBtn.addEventListener("click", function () {

        const team1 = prompt("Enter Team 1 name:");
        if (!team1 || team1.trim() === "") return;

        const team2 = prompt("Enter Team 2 name:");
        if (!team2 || team2.trim() === "") return;

        const overs = prompt("How many overs? (Example: 5, 10, 20)");

        if (!overs || isNaN(overs) || Number(overs) <= 0) {
            alert("Please enter a valid number of overs.");
            return;
        }

        const match = {
            team1: team1.trim(),
            team2: team2.trim(),
            overs: Number(overs),
            createdAt: new Date().toISOString()
        };

        localStorage.setItem(
            "currentCricketMatch",
            JSON.stringify(match)
        );

        alert(
            "🏏 Match created!\n\n" +
            team1.trim() + " vs " + team2.trim() +
            "\nOvers: " + overs
        );
    });

});
