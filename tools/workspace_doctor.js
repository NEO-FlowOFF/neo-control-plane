#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const manifestsDir = path.join(root, "manifests");
const reposManifestPath = path.join(manifestsDir, "repos.json");
const integrationsManifestPath = path.join(manifestsDir, "integrations.json");
const workspaceManifestPath = path.join(manifestsDir, "workspace.json");

for (const manifestPath of [
  reposManifestPath,
  integrationsManifestPath,
  workspaceManifestPath
]) {
  if (!fs.existsSync(manifestPath)) {
    console.error(`Missing manifest: ${manifestPath}`);
    process.exit(1);
  }
}

const reposManifest = JSON.parse(fs.readFileSync(reposManifestPath, "utf8"));
const integrationsManifest = JSON.parse(
  fs.readFileSync(integrationsManifestPath, "utf8")
);
const workspaceManifest = JSON.parse(
  fs.readFileSync(workspaceManifestPath, "utf8")
);

const repos = Array.isArray(reposManifest.repos) ? reposManifest.repos : [];
const integrations = Array.isArray(integrationsManifest.integrations)
  ? integrationsManifest.integrations
  : [];

function runGit(repoPath, args) {
  return execFileSync("git", ["-C", repoPath, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}

function safeGit(repoPath, args) {
  try {
    return runGit(repoPath, args);
  } catch {
    return null;
  }
}

function pad(value, width) {
  return String(value).padEnd(width, " ");
}

const repoRows = repos.map((repo) => {
  const repoPath = path.resolve(root, repo.localPath);
  const exists = fs.existsSync(repoPath);
  const gitValid =
    exists && safeGit(repoPath, ["rev-parse", "--is-inside-work-tree"]) === "true";
  const branch = gitValid
    ? safeGit(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]) || "-"
    : "-";
  const origin = gitValid
    ? safeGit(repoPath, ["remote", "get-url", "origin"]) || "-"
    : "-";
  const porcelain = gitValid ? safeGit(repoPath, ["status", "--porcelain"]) : null;
  const cleanliness = gitValid ? (porcelain ? "dirty" : "clean") : "invalid";
  const status = repo.status || "unknown";

  let expectation = "optional";
  if (status === "active-root" || status === "extracted") {
    expectation = "required";
  } else if (status === "planned") {
    expectation = "future";
  }

  let diagnosis = "ok";
  if (expectation === "required" && (!exists || !gitValid)) {
    diagnosis = "missing-required";
  } else if (expectation === "future" && exists && gitValid) {
    diagnosis = "ready";
  } else if (expectation === "future" && !exists) {
    diagnosis = "planned";
  } else if (!exists) {
    diagnosis = "missing";
  } else if (exists && !gitValid) {
    diagnosis = "not-git";
  }

  return {
    id: repo.id,
    status,
    expectation,
    exists: exists ? "yes" : "no",
    git: gitValid ? "yes" : "no",
    branch,
    cleanliness,
    diagnosis,
    origin
  };
});

const widths = {
  id: Math.max("repo".length, ...repoRows.map((row) => row.id.length)),
  status: Math.max("status".length, ...repoRows.map((row) => row.status.length)),
  expectation: Math.max(
    "expect".length,
    ...repoRows.map((row) => row.expectation.length)
  ),
  exists: "exists".length,
  git: "git".length,
  branch: Math.max("branch".length, ...repoRows.map((row) => row.branch.length)),
  cleanliness: Math.max(
    "clean".length,
    ...repoRows.map((row) => row.cleanliness.length)
  ),
  diagnosis: Math.max(
    "diagnosis".length,
    ...repoRows.map((row) => row.diagnosis.length)
  )
};

console.log("NEOFLOWOFF TIKTOK WORKSPACE DOCTOR");
console.log("");
console.log(`workspace: ${workspaceManifest.workspaceName}`);
console.log(`mode: ${workspaceManifest.operationalMode}`);
console.log("");
console.log(
  [
    pad("repo", widths.id),
    pad("status", widths.status),
    pad("expect", widths.expectation),
    pad("exists", widths.exists),
    pad("git", widths.git),
    pad("branch", widths.branch),
    pad("clean", widths.cleanliness),
    pad("diagnosis", widths.diagnosis),
    "origin"
  ].join("  ")
);

for (const row of repoRows) {
  console.log(
    [
      pad(row.id, widths.id),
      pad(row.status, widths.status),
      pad(row.expectation, widths.expectation),
      pad(row.exists, widths.exists),
      pad(row.git, widths.git),
      pad(row.branch, widths.branch),
      pad(row.cleanliness, widths.cleanliness),
      pad(row.diagnosis, widths.diagnosis),
      row.origin
    ].join("  ")
  );
}

const repoIds = new Set(repos.map((repo) => repo.id));
const integrationWarnings = [];

for (const integration of integrations) {
  const producer = integration.producer;
  const consumer = integration.consumer;
  const producerKnown =
    repoIds.has(producer) ||
    String(producer).startsWith("railway-") ||
    String(producer).includes("storage");
  const consumerKnown =
    repoIds.has(consumer) ||
    String(consumer).startsWith("railway-") ||
    String(consumer).includes("storage");

  if (!producerKnown || !consumerKnown) {
    integrationWarnings.push({
      id: integration.id,
      producer,
      consumer
    });
  }
}

const failures = repoRows.filter((row) => row.diagnosis === "missing-required");
const dirty = repoRows.filter((row) => row.cleanliness === "dirty");

console.log("");
console.log(`repos: ${repoRows.length}`);
console.log(`required-failures: ${failures.length}`);
console.log(`dirty: ${dirty.length}`);
console.log(`integrations: ${integrations.length}`);
console.log(`integration-warnings: ${integrationWarnings.length}`);

if (integrationWarnings.length > 0) {
  console.log("");
  console.log("integration warnings:");
  for (const warning of integrationWarnings) {
    console.log(
      `- ${warning.id}: unresolved producer=${warning.producer} consumer=${warning.consumer}`
    );
  }
}

if (failures.length > 0) {
  process.exit(1);
}
