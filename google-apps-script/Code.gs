// Web App backend for the bz2stats.us game submission form.
//
// Deploy this same script on BOTH the test and production Sheets:
//   1. Open the Sheet, then Extensions > Apps Script.
//   2. Replace the default Code.gs contents with this file.
//   3. Deploy > New deployment > type "Web app".
//      Execute as: Me
//      Who has access: Anyone
//   4. Copy the resulting /exec URL into the matching GitHub secret
//      (SUBMISSION_SHEET_TEST or SUBMISSION_SHEET_PROD).
//   5. Whenever this file changes, re-deploy (Deploy > Manage deployments
//      > edit > New version) on both Sheets to pick up the change.
//
// Row values are matched to the sheet's header row (row 1) by name, so
// column order/extra columns (e.g. a leftover "Match Length" column) don't
// need to match this script exactly.
//
// Discord notifications:
//   To get pinged in Discord whenever a new submission comes in, create a
//   webhook in your Discord channel (Channel Settings > Integrations >
//   Webhooks > New Webhook, then Copy Webhook URL), then in the Apps Script
//   editor go to Project Settings > Script Properties and add a property
//   named DISCORD_WEBHOOK_URL with that URL as the value. Do this on both
//   the test and production Sheets. If the property is left unset, no
//   notification is sent (and submissions still succeed normally).

const SHEET_NAME = "Submissions";
const SCREENSHOT_FOLDER_NAME = "bz2stats submission screenshots";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Sheet "' + SHEET_NAME + '" not found');

    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((h) => String(h).trim());

    const screenshotLink =
      payload.verification && payload.verification.type === "image" && payload.verification.image
        ? saveScreenshot(payload.verification.image)
        : "";

    sheet.appendRow(buildRow(headers, payload, screenshotLink));
    notifyDiscord(payload, screenshotLink);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return jsonResponse({ ok: true, message: "bz2stats submission endpoint is live." });
}

function buildRow(headers, payload, screenshotLink) {
  const teamOne = payload.teamOne || {};
  const teamTwo = payload.teamTwo || {};
  const thugsOne = teamOne.thugs || [];
  const thugsTwo = teamTwo.thugs || [];
  const verification = payload.verification || {};

  const values = {
    "Timestamp": new Date(),
    "Approval Status": "Pending",
    "Mod": payload.mod || "",
    "Date Played": payload.date || "",
    "Map": payload.map || "",
    "Team 1 Faction": teamOne.faction || "",
    "Team 1 Commander": teamOne.commander || "",
    "Team 1 Thug 1": thugsOne[0] || "",
    "Team 1 Thug 2": thugsOne[1] || "",
    "Team 1 Thug 3": thugsOne[2] || "",
    "Team 1 Thug 4": thugsOne[3] || "",
    "Team 2 Faction": teamTwo.faction || "",
    "Team 2 Commander": teamTwo.commander || "",
    "Team 2 Thug 1": thugsTwo[0] || "",
    "Team 2 Thug 2": thugsTwo[1] || "",
    "Team 2 Thug 3": thugsTwo[2] || "",
    "Team 2 Thug 4": thugsTwo[3] || "",
    "Winner": payload.winner === "team1" ? "Team 1" : payload.winner === "team2" ? "Team 2" : "",
    "Verification Type": verification.type || "",
    "YouTube Link": verification.type === "youtube" ? verification.youtubeUrl || "" : "",
    "Screenshot Link": screenshotLink,
    "Submitted By": payload.submittedBy || "",
    "Reviewer Notes": "",
  };

  return headers.map((h) => (h in values ? values[h] : ""));
}

function saveScreenshot(image) {
  const folder = getOrCreateFolder(SCREENSHOT_FOLDER_NAME);
  const blob = Utilities.newBlob(
    Utilities.base64Decode(image.base64),
    image.mimeType || "image/png",
    image.filename || "screenshot"
  );
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function notifyDiscord(payload, screenshotLink) {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty("DISCORD_WEBHOOK_URL");
  if (!webhookUrl) return;

  const teamOne = payload.teamOne || {};
  const teamTwo = payload.teamTwo || {};
  const verification = payload.verification || {};
  const winner = payload.winner === "team1" ? "Team 1" : payload.winner === "team2" ? "Team 2" : "Unknown";

  const verificationLink =
    verification.type === "youtube" && verification.youtubeUrl
      ? verification.youtubeUrl
      : screenshotLink || "";

  const fields = [
    { name: "Mod", value: payload.mod || "Unknown", inline: true },
    { name: "Map", value: payload.map || "Unknown", inline: true },
    { name: "Winner", value: winner, inline: true },
    { name: "Team 1", value: teamOne.faction ? teamOne.faction + " — " + (teamOne.commander || "?") : "Unknown", inline: true },
    { name: "Team 2", value: teamTwo.faction ? teamTwo.faction + " — " + (teamTwo.commander || "?") : "Unknown", inline: true },
  ];

  if (verificationLink) {
    fields.push({ name: "Verification", value: verificationLink, inline: false });
  }

  const body = {
    embeds: [
      {
        title: "New match submission",
        description: payload.submittedBy ? "Submitted by " + payload.submittedBy : undefined,
        fields: fields,
        color: 5814783,
      },
    ],
  };

  try {
    const response = UrlFetchApp.fetch(webhookUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
    });
    const code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      Logger.log("Discord webhook returned " + code + ": " + response.getContentText());
    }
  } catch (err) {
    // Don't let a Discord outage fail the submission.
    Logger.log("Discord webhook threw: " + err);
  }
}

function getOrCreateFolder(name) {
  const existing = DriveApp.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return DriveApp.createFolder(name);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
