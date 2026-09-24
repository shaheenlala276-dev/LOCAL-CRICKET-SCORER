/* =========================================================
   LOCAL CRICKET SCORER APP - VERSION 1.4
   CLEAN WORKING VERSION
   ========================================================= */

/*
   IMPORTANT:
   The original V1.4 functions are restored below.
   This removes the V1.4.1 batsman-statistics overrides.
*/

initializeLiveScoring =
    typeof originalInitializeLiveScoring_V141 !== 'undefined'
        ? originalInitializeLiveScoring_V141
        : initializeLiveScoring;

recordLiveBall =
    typeof originalRecordLiveBall_V141 !== 'undefined'
        ? originalRecordLiveBall_V141
        : recordLiveBall;

undoLastLiveBall =
    typeof originalUndoLastLiveBall_V141 !== 'undefined'
        ? originalUndoLastLiveBall_V141
        : undoLastLiveBall;

renderLiveScoring =
    typeof originalRenderLiveScoring_V141 !== 'undefined'
        ? originalRenderLiveScoring_V141
        : renderLiveScoring;


/* =========================================================
   END - RESTORED VERSION 1.4
   ========================================================= */
