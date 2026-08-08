import { $ } from "bun";
import { writeFileSync, readFileSync, existsSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const GITHUB_REPO = "trentbrew/trellis";
const MAPPING_FILE = join(__dirname, "github-issue-map.json");
const TMP_DIR = mkdtempSync(join(tmpdir(), "trellis-sync-"));

type SyncFilter = "all" | "open";
const SYNC_FILTER: SyncFilter = (process.env.SYNC_FILTER as SyncFilter) || "open";
const LIMIT = parseInt(process.env.SYNC_LIMIT || "0") || undefined;
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

interface TrellisIssue {
  id: string;
  title: string;
  status: string;
  priority: "low" | "medium" | "high";
  labels: string[];
  assignee: string | null;
  parentId: string | null;
  isBlocked: boolean;
  blockedBy: string[];
  startedAt: string | null;
  createdAt: string;
  closedAt: string | null;
  criteria: {
    id: string;
    status: "pending" | "passed" | "failed";
    description: string;
  }[];
}

function loadMapping(): Record<string, number> {
  if (existsSync(MAPPING_FILE)) {
    try {
      return JSON.parse(readFileSync(MAPPING_FILE, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}

function saveMapping(map: Record<string, number>) {
  writeFileSync(MAPPING_FILE, JSON.stringify(map, null, 2) + "\n");
}

async function getIssueDescription(issueId: string): Promise<string> {
  const result = await $`trellis issue show ${issueId}`.text();
  const lines = result.split("\n");
  const blankIdx = lines.indexOf("");
  if (blankIdx !== -1 && blankIdx + 1 < lines.length) {
    const start = blankIdx + 1;
    const end = lines.findIndex((line: string, i: number) => i >= start && line.startsWith("  Status:"));
    const descEnd = end !== -1 ? end : lines.length;
    return lines.slice(start, descEnd).join("\n").trim();
  }
  return "";
}

function mapStatus(status: string): "open" | "closed" {
  return status === "closed" ? "closed" : "open";
}

function getLabels(issue: TrellisIssue): string[] {
  const labels = new Set<string>();
  labels.add(`status:${issue.status}`);
  labels.add(`priority:${issue.priority}`);
  for (const label of issue.labels) {
    if (label !== issue.status && label !== issue.priority) {
      labels.add(label);
    }
  }
  if (issue.parentId) labels.add("child");
  if (issue.isBlocked || issue.blockedBy.length > 0) labels.add("blocked");
  return Array.from(labels);
}

function buildBody(issue: TrellisIssue, description: string): string {
  const parts: string[] = [];

  if (description) {
    parts.push(description);
  } else {
    parts.push(`**Source:** TrellisVCS issue ${issue.id}`);
  }

  parts.push(`\n---\n`);
  parts.push(`**Trellis ID:** ${issue.id}`);
  parts.push(`**Created:** ${issue.createdAt}`);
  if (issue.closedAt) parts.push(`**Closed:** ${issue.closedAt}`);
  if (issue.startedAt) parts.push(`**Started:** ${issue.startedAt}`);
  if (issue.assignee) parts.push(`**Assignee:** ${issue.assignee}`);
  if (issue.parentId) parts.push(`**Parent:** ${issue.parentId}`);

  if (issue.criteria && issue.criteria.length > 0) {
    parts.push(`\n### Acceptance Criteria`);
    for (const ac of issue.criteria) {
      const icon = ac.status === "passed" ? "✅" : ac.status === "failed" ? "❌" : "⬜";
      parts.push(`- ${icon} ${ac.description}`);
    }
  }

  return parts.join("\n");
}

function writeBodyFile(body: string, issueId: string): string {
  const safeId = issueId.replace(/[^a-zA-Z0-9-]/g, "_");
  const path = join(TMP_DIR, `${safeId}-body.md`);
  writeFileSync(path, body);
  return path;
}

async function issueExists(id: string): Promise<number | null> {
  const mapping = loadMapping();
  const num = mapping[id];
  if (!num) return null;
  try {
    const response = await $`gh api repos/${GITHUB_REPO}/issues/${num} --jq .number`.text();
    return parseInt(response.trim());
  } catch {
    return null;
  }
}

function mapState(status: string): "open" | "closed" {
  return status === "closed" ? "closed" : "open";
}

async function createIssue(issue: TrellisIssue, description: string): Promise<number> {
  const body = buildBody(issue, description);
  const bodyFile = writeBodyFile(body, issue.id);
  const labels = getLabels(issue);
  const state = mapState(issue.status);

  const payloadFile = join(TMP_DIR, `${issue.id}-create.json`);
  writeFileSync(payloadFile, JSON.stringify({
    title: issue.title,
    body: body,
    labels: labels,
  }));

  const response = await $`gh api repos/${GITHUB_REPO}/issues -X POST --input ${payloadFile} --jq .number`.text();
  const num = parseInt(response.trim());

  if (state === "closed") {
    await $`gh api repos/${GITHUB_REPO}/issues/${num} -X PATCH -f state=closed`.quiet();
  }

  console.log(`  created #${num}`);
  return num;
}

async function updateIssue(issue: TrellisIssue, description: string, num: number): Promise<number> {
  const body = buildBody(issue, description);
  const bodyFile = writeBodyFile(body, issue.id);
  const labels = getLabels(issue);
  const state = mapState(issue.status);

  const payloadFile = join(TMP_DIR, `${issue.id}-update.json`);
  writeFileSync(payloadFile, JSON.stringify({
    title: issue.title,
    body: body,
    labels: labels,
    state: state,
  }));

  await $`gh api repos/${GITHUB_REPO}/issues/${num} -X PATCH --input ${payloadFile}`.quiet();
  console.log(`  updated #${num}`);
  return num;
}

async function main() {
  const result = await $`trellis issue list --json`.text();
  const { issues } = JSON.parse(result) as { issues: TrellisIssue[] };

  let toSync = issues;
  if (SYNC_FILTER === "open") {
    toSync = issues.filter((i) => i.status !== "closed");
  }
  if (LIMIT) {
    toSync = toSync.slice(0, LIMIT);
  }

  console.log(`Syncing ${toSync.length} issues to ${GITHUB_REPO} (filter: ${SYNC_FILTER}, limit: ${LIMIT || "none"}, dry-run: ${DRY_RUN})`);

  const mapping = loadMapping();
  let updated = false;

  for (const issue of toSync) {
    process.stdout.write(`${issue.id}: `);
    const desc = await getIssueDescription(issue.id);
    const existingNum = await issueExists(issue.id);
    let ghNum: number;
    if (existingNum) {
      if (DRY_RUN) {
        console.log(`  [dry-run] would update #${existingNum}`);
        console.log(`  [dry-run] labels: ${getLabels(issue).join(", ")}`);
        console.log(`  [dry-run] state: ${mapState(issue.status)}`);
        console.log(`  [dry-run] body preview (first 200 chars): ${buildBody(issue, desc).substring(0, 200)}`);
        continue;
      }
      ghNum = await updateIssue(issue, desc, existingNum);
    } else {
      if (DRY_RUN) {
        console.log(`  [dry-run] would create: "${issue.title}"`);
        console.log(`  [dry-run] labels: ${getLabels(issue).join(", ")}`);
        console.log(`  [dry-run] state: ${mapState(issue.status)}`);
        console.log(`  [dry-run] body preview (first 200 chars): ${buildBody(issue, desc).substring(0, 200)}`);
        continue;
      }
      ghNum = await createIssue(issue, desc);
    }
    if (mapping[issue.id] !== ghNum) {
      mapping[issue.id] = ghNum;
      updated = true;
    }
  }

  if (updated) {
    saveMapping(mapping);
    console.log(`Mapping saved to ${MAPPING_FILE}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
