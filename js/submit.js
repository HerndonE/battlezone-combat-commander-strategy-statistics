import { CONFIG } from "./config.js";

// js/env.local.js (gitignored) overrides js/env.js for local development
// against the test sheet — see js/env.local.example.js.
let submissionEndpointPromise;
function getSubmissionEndpoint() {
  if (!submissionEndpointPromise) {
    submissionEndpointPromise = import("./env.local.js")
      .catch(() => import("./env.js"))
      .then((mod) => mod.ENV.SUBMISSION_ENDPOINT)
      .catch(() => "");
  }
  return submissionEndpointPromise;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const YOUTUBE_PATTERN = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)/i;

const form = document.getElementById("submit-form");
const thankYouScreen = document.getElementById("thank-you-screen");
const submitButton = document.getElementById("submit-button");
const errorBox = document.getElementById("form-error");
const mapList = document.getElementById("map-list");
const playerList = document.getElementById("player-list");

function setupPillGroup(groupId, hiddenInputId, onChange) {
  const group = document.getElementById(groupId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const buttons = group.querySelectorAll(".pill-option");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("selected"));
      button.classList.add("selected");
      hiddenInput.value = button.dataset.value;
      if (onChange) onChange(button.dataset.value);
    });
  });
}

setupPillGroup("mod-group", "mod-value");
setupPillGroup("winner-group", "winner-value");
setupPillGroup("verification-group", "verification-type-value", (value) => {
  document.getElementById("youtube-field").hidden = value !== "youtube";
  document.getElementById("image-field").hidden = value !== "image";
});

async function loadReferenceData() {
  try {
    const [maplistRes, dataRes] = await Promise.all([
      fetch("../data/maplist.json"),
      fetch(CONFIG.jsonFile),
    ]);

    const maps = await maplistRes.json();
    maps
      .map((m) => m.Name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        mapList.appendChild(option);
      });

    const data = await dataRes.json();
    const names = new Set();
    const commanderList = data?.processed_data?.processed_commander_list || [];
    commanderList.forEach(([name]) => names.add(name));
    const playerTimes = data?.processed_data?.processed_player_times || [];
    playerTimes.forEach((entry) => {
      const player = entry?.[0]?.Player;
      if (player) names.add(player);
    });

    [...names].sort((a, b) => a.localeCompare(b)).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      playerList.appendChild(option);
    });
  } catch (err) {
    console.warn("Could not load map/player reference data:", err);
  }
}

loadReferenceData();

function getThugs(containerId) {
  const inputs = document.querySelectorAll(`#${containerId} input`);
  return [...inputs].map((i) => i.value.trim()).filter(Boolean).slice(0, 4);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",").pop());
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function clearFieldErrors() {
  document.querySelectorAll(".field-invalid").forEach((el) => el.classList.remove("field-invalid"));
}

function markInvalid(el) {
  el.classList.add("field-invalid");
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

async function validateForm() {
  clearFieldErrors();
  hideError();

  const dateInput = document.getElementById("game-date");
  const modValue = document.getElementById("mod-value").value;
  const mapInput = document.getElementById("map-input");
  const team1Faction = document.getElementById("team1-faction");
  const team1Commander = document.getElementById("team1-commander");
  const team2Faction = document.getElementById("team2-faction");
  const team2Commander = document.getElementById("team2-commander");
  const winnerValue = document.getElementById("winner-value").value;
  const verificationType = document.getElementById("verification-type-value").value;
  const youtubeUrl = document.getElementById("youtube-url");
  const screenshotFile = document.getElementById("screenshot-file");
  const attestation = document.getElementById("attestation-check");
  const submitterName = document.getElementById("submitter-name");

  const problems = [];

  if (!dateInput.value) {
    problems.push("Pick the date the game was played.");
    markInvalid(dateInput);
  } else if (dateInput.value > new Date().toISOString().slice(0, 10)) {
    problems.push("The date can't be in the future.");
    markInvalid(dateInput);
  }

  if (!modValue) problems.push("Select a mod (VSR or Stock).");

  if (!mapInput.value.trim()) {
    problems.push("Enter the map that was played.");
    markInvalid(mapInput);
  }

  if (!team1Faction.value) {
    problems.push("Select Team 1's faction.");
    markInvalid(team1Faction);
  }
  if (!team1Commander.value.trim()) {
    problems.push("Enter Team 1's commander.");
    markInvalid(team1Commander);
  }
  if (!team2Faction.value) {
    problems.push("Select Team 2's faction.");
    markInvalid(team2Faction);
  }
  if (!team2Commander.value.trim()) {
    problems.push("Enter Team 2's commander.");
    markInvalid(team2Commander);
  }
  if (
    team1Commander.value.trim() &&
    team2Commander.value.trim() &&
    team1Commander.value.trim().toLowerCase() === team2Commander.value.trim().toLowerCase()
  ) {
    problems.push("Team 1 and Team 2 can't have the same commander.");
    markInvalid(team1Commander);
    markInvalid(team2Commander);
  }

  if (!winnerValue) problems.push("Select which team won.");

  if (!verificationType) {
    problems.push("Choose a verification method (YouTube link or screenshot).");
  } else if (verificationType === "youtube") {
    if (!youtubeUrl.value.trim() || !YOUTUBE_PATTERN.test(youtubeUrl.value.trim())) {
      problems.push("Enter a valid YouTube link.");
      markInvalid(youtubeUrl);
    }
  } else if (verificationType === "image") {
    const file = screenshotFile.files[0];
    if (!file) {
      problems.push("Upload a screenshot of the end-of-game results screen.");
      markInvalid(screenshotFile);
    } else if (!file.type.startsWith("image/")) {
      problems.push("The verification file needs to be an image.");
      markInvalid(screenshotFile);
    } else if (file.size > MAX_IMAGE_BYTES) {
      problems.push("That image is too large (10MB max).");
      markInvalid(screenshotFile);
    }
  }

  if (!attestation.checked) {
    problems.push("You need to confirm the submission before sending it.");
  }

  if (!submitterName.value.trim()) {
    problems.push("Enter your name or Discord handle.");
    markInvalid(submitterName);
  }

  if (problems.length) {
    showError(problems[0]);
    return null;
  }

  const payload = {
    mod: modValue,
    date: dateInput.value,
    map: mapInput.value.trim(),
    teamOne: {
      faction: team1Faction.value,
      commander: team1Commander.value.trim(),
      thugs: getThugs("team1-thugs"),
    },
    teamTwo: {
      faction: team2Faction.value,
      commander: team2Commander.value.trim(),
      thugs: getThugs("team2-thugs"),
    },
    winner: winnerValue,
    verification: { type: verificationType },
    submittedBy: submitterName.value.trim(),
    submittedAt: new Date().toISOString(),
  };

  if (verificationType === "youtube") {
    payload.verification.youtubeUrl = youtubeUrl.value.trim();
  } else {
    const file = screenshotFile.files[0];
    payload.verification.image = {
      filename: file.name,
      mimeType: file.type,
      base64: await fileToBase64(file),
    };
  }

  return payload;
}

async function submitPayload(payload) {
  const endpoint = await getSubmissionEndpoint();
  if (!endpoint) {
    console.info("No submission endpoint configured — logging payload instead of sending it.", payload);
    return;
  }

  // mode: "no-cors" + a "simple" content type avoid a CORS preflight, since
  // Apps Script Web Apps don't return Access-Control-Allow-Origin. The
  // response is opaque either way — doPost still parses the JSON body.
  await fetch(endpoint, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  try {
    const payload = await validateForm();
    if (!payload) return;

    await submitPayload(payload);

    form.hidden = true;
    thankYouScreen.hidden = false;
  } catch (err) {
    console.error("Submission failed:", err);
    showError("Something went wrong sending your submission. Please try again in a moment.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Game";
  }
});

document.getElementById("submit-another").addEventListener("click", () => {
  form.reset();
  document.querySelectorAll(".pill-option.selected").forEach((b) => b.classList.remove("selected"));
  document.getElementById("mod-value").value = "";
  document.getElementById("winner-value").value = "";
  document.getElementById("verification-type-value").value = "";
  document.getElementById("youtube-field").hidden = true;
  document.getElementById("image-field").hidden = true;
  clearFieldErrors();
  hideError();
  thankYouScreen.hidden = true;
  form.hidden = false;
});
