#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const site = process.env.MOST_MONITOR_SITE_URL?.replace(/\/$/, "");
const webhook = process.env.MONITORING_ALERT_WEBHOOK_URL?.trim();
const stateFile = process.env.MOST_MONITOR_STATE_FILE ?? "/var/lib/most-monitor/state.json";
if (!site || !webhook) throw new Error("MOST_MONITOR_SITE_URL and MONITORING_ALERT_WEBHOOK_URL are required");

async function readState() { try { return JSON.parse(await readFile(stateFile, "utf8")); } catch (error) { if (error?.code === "ENOENT") return {}; throw error; } }
async function saveState(value) { await mkdir(path.dirname(stateFile), { recursive: true }); const temp = `${stateFile}.${process.pid}.tmp`; await writeFile(temp, JSON.stringify(value), { mode: 0o600 }); await rename(temp, stateFile); }
async function notify(state, detail) { await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: state === "UP" ? "MOST: сайт восстановлен" : `MOST: сайт недоступен — ${detail}`, service: "site", state, at: new Date().toISOString() }), signal: AbortSignal.timeout(8_000) }); }

const previous = await readState();
let state = "UP", detail = "";
try { const response = await fetch(`${site}/api/health`, { signal: AbortSignal.timeout(12_000), headers: { "User-Agent": "MOST-external-monitor/1" } }); if (!response.ok) throw new Error(`HTTP ${response.status}`); } catch (error) { state = "DOWN"; detail = error instanceof Error ? error.message : "request failed"; }
if (previous.state !== state) await notify(state, detail);
await saveState({ state, checkedAt: new Date().toISOString() });
