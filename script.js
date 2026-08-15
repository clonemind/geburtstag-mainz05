// ============================================================
// Persönliche Inhalte (Name, Nachricht, Fotos) einsetzen
// ============================================================

document.getElementById("greeting").textContent =
  `Alles Gute zum Geburtstag, ${CONFIG.friendName}!`;
document.getElementById("message").innerHTML = CONFIG.message;

if (CONFIG.photos && CONFIG.photos.length > 0) {
  const gallery = document.getElementById("photos");
  gallery.classList.remove("hidden");
  CONFIG.photos.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Erinnerungsfoto";
    gallery.appendChild(img);
  });
}

// ============================================================
// Deterministischer Zufallsgenerator (gleiche Vorhersage den
// ganzen Tag über, statt bei jedem Reload eine neue)
// ============================================================

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

const SCORELINES = [
  "2:1", "1:0", "2:0", "3:1", "1:1", "2:2", "0:0", "1:2", "3:2", "0:1",
  // seltene, unrealistische Ausreißer
  "7:1", "0:5",
];

const QUOTES = [
  "Abseits? Nicht mit dieser Vorhersage – die steht goldrichtig.",
  "Elfmeter, Ecke, Einwurf – Hauptsache Tore für 05.",
  "Der Schiedsrichter hat heute frei, die Glaskugel pfeift.",
  "So sicher wie ein Handspiel im Strafraum: umstritten, aber wahrscheinlich richtig.",
  "Diese Prognose wurde mit einem Freistoß aus 30 Metern erzielt – sehenswert, nicht ganz seriös.",
  "Der Rasen wurde extra für dieses Ergebnis frisch gemäht.",
  "VAR hat das Ergebnis geprüft: Tor zählt, Vorhersage bleibt.",
  "Fußball ist wie Schach – nur mit mehr Grätschen und weniger Denkzeit.",
  "Genauso zuverlässig wie ein Elfmeterschießen: 50:50, aber wir glauben fest dran.",
  "Der Ball ist rund, das Spiel dauert 90 Minuten, diese Vorhersage hält keine Sekunde länger stand.",
  "Trainerwechsel unnötig – die Kugel hat schon entschieden.",
  "Diese Vorhersage steht sicherer als ein Innenverteidiger bei einer Ecke… meistens.",
];

function isSameDay(date, reference) {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

// ============================================================
// Mainz-05-Spieldaten laden (OpenLigaDB, kein API-Key nötig)
// ============================================================

async function loadMatch() {
  const statusEl = document.getElementById("match-status");
  const detailsEl = document.getElementById("match-details");
  const predictionBox = document.getElementById("prediction-box");

  try {
    const res = await fetch(
      `https://api.openligadb.de/getmatchdata/${CONFIG.league}`
    );
    if (!res.ok) throw new Error("API-Fehler: " + res.status);
    const matches = await res.json();

    const match = matches.find(
      (m) =>
        m.team1?.teamName?.includes(CONFIG.teamMatch) ||
        m.team2?.teamName?.includes(CONFIG.teamMatch)
    );

    if (!match) {
      statusEl.textContent =
        "Gerade kein Mainz-05-Spiel in der aktuellen Runde gefunden.";
      return;
    }

    const kickoff = new Date(match.matchDateTime);
    const today = new Date();
    const homeName = match.team1.teamName;
    const awayName = match.team2.teamName;

    document.getElementById("team-home").textContent = homeName;
    document.getElementById("team-away").textContent = awayName;
    document.getElementById("kickoff").textContent = kickoff.toLocaleString(
      "de-DE",
      { dateStyle: "full", timeStyle: "short" }
    );

    detailsEl.classList.remove("hidden");

    if (match.matchIsFinished) {
      const goals = match.matchResults?.find((r) => r.resultTypeID === 2) ||
        match.matchResults?.[0];
      statusEl.textContent = goals
        ? `Spiel beendet: ${goals.pointsTeam1}:${goals.pointsTeam2}`
        : "Spiel ist beendet.";
      return;
    }

    // Saisonauftakt: die allererste Vorhersage der Saison gibt es sofort,
    // damit man beim Verschenken der Seite nicht erst tagelang warten muss.
    const isSeasonOpener = match.group?.groupOrderID === 1;

    // Sonst gilt: Vorhersage ab 00:00 Uhr des Vortags bis zum Spieltag.
    const predictionWindowStart = new Date(kickoff);
    predictionWindowStart.setDate(predictionWindowStart.getDate() - 1);
    predictionWindowStart.setHours(0, 0, 0, 0);

    const showPrediction = isSeasonOpener || today >= predictionWindowStart;

    if (showPrediction) {
      statusEl.textContent = isSameDay(kickoff, today)
        ? "Heute ist Spieltag! 🔴⚪"
        : "Die Vorhersage steht schon fest:";

      const seed = hashString(String(match.matchID ?? match.matchDateTime));
      const rng = mulberry32(seed);
      const scoreline = pick(rng, SCORELINES);
      const quote = pick(rng, QUOTES);

      document.getElementById("prediction-score").textContent =
        `${homeName} ${scoreline} ${awayName}`;
      document.getElementById("prediction-quote").textContent = quote;
      predictionBox.classList.remove("hidden");
    } else {
      statusEl.textContent = "Nächstes Mainz-05-Spiel:";
    }
  } catch (err) {
    statusEl.textContent =
      "Spieldaten konnten nicht geladen werden. Versuch's später nochmal.";
    console.error(err);
  }
}

loadMatch();

// ============================================================
// Saison-Rückblick: Tabellenplatz + gespielte Spiele mit Toren
// ============================================================

function getCurrentSeasonYear(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0 = Januar
  // Die Bundesliga-Saison startet im Juli/August und läuft bis Mai;
  // bis Juni zählt daher noch das Vorjahr als Saisonjahr.
  return month >= 6 ? year : year - 1;
}

function buildGameCard(match) {
  const card = document.createElement("div");
  card.className = "game-card";

  const finalResult =
    match.matchResults?.find((r) => r.resultTypeID === 2) ||
    match.matchResults?.[match.matchResults.length - 1];

  const date = new Date(match.matchDateTime).toLocaleDateString("de-DE");

  const header = document.createElement("div");
  header.className = "game-header";
  header.textContent = `${date}: ${match.team1.teamName} ${
    finalResult?.pointsTeam1 ?? "?"
  }:${finalResult?.pointsTeam2 ?? "?"} ${match.team2.teamName}`;
  card.appendChild(header);

  const goals = [...(match.goals || [])].sort(
    (a, b) => a.matchMinute - b.matchMinute
  );

  if (goals.length > 0) {
    const list = document.createElement("ul");
    list.className = "goal-list";
    goals.forEach((g) => {
      const scoringTeamName =
        g.scoringTeamId === match.team1.teamId
          ? match.team1.teamName
          : match.team2.teamName;
      const extras = [
        g.isPenalty ? "Elfmeter" : null,
        g.isOwnGoal ? "Eigentor" : null,
      ]
        .filter(Boolean)
        .join(", ");
      const li = document.createElement("li");
      li.textContent = `${g.matchMinute}' ${g.goalGetterName ?? "Unbekannt"} (${scoringTeamName})${
        extras ? ` – ${extras}` : ""
      }`;
      list.appendChild(li);
    });
    card.appendChild(list);
  }

  return card;
}

async function fetchTable(season) {
  const res = await fetch(
    `https://api.openligadb.de/getbltable/${CONFIG.league}/${season}`
  );
  if (!res.ok) throw new Error("Tabelle-API-Fehler: " + res.status);
  return res.json();
}

function buildLeagueTable(table) {
  const tableEl = document.createElement("table");
  tableEl.className = "league-table-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["#", "Team", "Sp", "S", "U", "N", "Tore", "Diff", "Pkt"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  tableEl.appendChild(thead);

  const tbody = document.createElement("tbody");
  table.forEach((t, i) => {
    const row = document.createElement("tr");
    if (t.teamName?.includes(CONFIG.teamMatch)) {
      row.className = "own-team";
    }
    [
      i + 1,
      t.teamName,
      t.matches,
      t.won,
      t.draw,
      t.lost,
      `${t.goals}:${t.opponentGoals}`,
      t.goalDiff,
      t.points,
    ].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  tableEl.appendChild(tbody);

  return tableEl;
}

async function loadLeagueTable() {
  const labelEl = document.getElementById("league-table-season-label");
  const contentEl = document.getElementById("league-table-content");
  let season = getCurrentSeasonYear();
  labelEl.textContent = `${season}/${season + 1}`;

  try {
    let table = await fetchTable(season);

    // Vor Saisonstart existiert die Tabelle zwar schon (alle Teams gelistet),
    // aber noch ohne gespielte Spiele; dann stattdessen die Tabelle der
    // letzten Saison zeigen.
    if (table.length === 0 || !table.some((t) => t.matches > 0)) {
      season -= 1;
      table = await fetchTable(season);
      labelEl.textContent = `${season}/${season + 1}`;
    }

    contentEl.innerHTML = "";
    contentEl.appendChild(buildLeagueTable(table));
  } catch (err) {
    contentEl.textContent = "Tabelle konnte nicht geladen werden.";
    console.error(err);
  }
}

loadLeagueTable();

async function loadSeasonInfo() {
  const positionEl = document.getElementById("table-position");
  const gamesEl = document.getElementById("played-games");
  let season = getCurrentSeasonYear();
  document.getElementById("season-label").textContent = `${season}/${season + 1}`;

  try {
    let table = await fetchTable(season);

    // Vor Saisonstart existiert die Tabelle zwar schon (alle Teams gelistet),
    // aber noch ohne gespielte Spiele; dann stattdessen die Tabelle der
    // letzten Saison zeigen.
    const hasPlayedMatches = table.some((t) => t.matches > 0);
    if (table.length === 0 || !hasPlayedMatches) {
      season -= 1;
      table = await fetchTable(season);
      document.getElementById("season-label").textContent =
        `${season}/${season + 1}`;
    }

    const index = table.findIndex((t) =>
      t.teamName?.includes(CONFIG.teamMatch)
    );
    positionEl.textContent =
      index >= 0
        ? `Tabellenplatz: ${index + 1}. von ${table.length} (${table[index].points} Punkte)`
        : "Kein Tabelleneintrag gefunden.";

    const matchesRes = await fetch(
      `https://api.openligadb.de/getmatchdata/${CONFIG.league}/${season}`
    );
    if (matchesRes.ok) {
      const matches = await matchesRes.json();
      const played = matches
        .filter(
          (m) =>
            m.matchIsFinished &&
            (m.team1?.teamName?.includes(CONFIG.teamMatch) ||
              m.team2?.teamName?.includes(CONFIG.teamMatch))
        )
        .sort((a, b) => new Date(b.matchDateTime) - new Date(a.matchDateTime));

      gamesEl.innerHTML = "";
      if (played.length === 0) {
        gamesEl.textContent = "Noch keine gespielten Spiele in dieser Saison.";
      } else {
        played.forEach((m) => gamesEl.appendChild(buildGameCard(m)));
      }
    } else {
      gamesEl.textContent = "Spiele konnten nicht geladen werden.";
    }
  } catch (err) {
    positionEl.textContent = "Saisondaten konnten nicht geladen werden.";
    gamesEl.textContent = "";
    console.error(err);
  }
}

loadSeasonInfo();
