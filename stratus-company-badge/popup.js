"use strict";

const currentCompany = document.getElementById("currentCompany");
const currentStation = document.getElementById("currentStation");
const manualCompany = document.getElementById("manualCompany");
const manualStation = document.getElementById("manualStation");
const saveButton = document.getElementById("saveButton");
const clearButton = document.getElementById("clearButton");
const message = document.getElementById("message");

function normalize(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

async function refresh() {
  const stored = await chrome.storage.local.get([
    "manualCompany",
    "manualStation",
    "detectedCompany",
    "detectedCompanyState",
    "detectedStation",
    "detectedStationState"
  ]);

  const companyOverride = normalize(stored.manualCompany);
  const stationOverride = normalize(stored.manualStation);
  const detectedCompany = normalize(stored.detectedCompany);
  const detectedStation = normalize(stored.detectedStation);

  currentCompany.textContent =
    companyOverride ||
    detectedCompany ||
    (stored.detectedCompanyState === "not-detected" ? "Not detected" : "Not detected yet");

  currentStation.textContent =
    stationOverride ||
    detectedStation ||
    (stored.detectedStationState === "not-signed-in" ? "Not signed in" : "Not detected yet");

  manualCompany.value = companyOverride;
  manualStation.value = stationOverride;
}

saveButton.addEventListener("click", async () => {
  const company = normalize(manualCompany.value);
  const station = normalize(manualStation.value);

  if (!company && !station) {
    message.textContent = "Enter a company or station override first.";
    return;
  }

  const updates = {};
  const removals = [];

  if (company) updates.manualCompany = company;
  else removals.push("manualCompany");

  if (station) updates.manualStation = station;
  else removals.push("manualStation");

  if (Object.keys(updates).length) {
    await chrome.storage.local.set(updates);
  }
  if (removals.length) {
    await chrome.storage.local.remove(removals);
  }

  message.textContent = "Manual overrides saved.";
  await refresh();
});

clearButton.addEventListener("click", async () => {
  await chrome.storage.local.remove(["manualCompany", "manualStation"]);
  message.textContent = "Auto-detect restored. Refresh STRATUS to run a fresh check.";
  await refresh();
});

refresh();
