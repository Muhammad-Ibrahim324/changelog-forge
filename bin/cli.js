#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { getCommits, getLatestTag, getRepoUrl } from "../src/git.js";
import { parseCommit } from "../src/parser.js";
import { renderSection, prependToChangelog } from "../src/render.js";

const program = new Command();

program
  .name("changelog-forge")
  .description(
    "Generate a grouped, linkable CHANGELOG.md from your Conventional Commits git history."
  )
  .option("--from <ref>", "start of range (defaults to latest git tag)")
  .option("--to <ref>", "end of range", "HEAD")
  .option("--version-name <name>", "heading for this section", "Unreleased")
  .option("-o, --output <path>", "output file", "CHANGELOG.md")
  .option("--include-other", "include commits that aren't Conventional Commits", false)
  .option("--dry-run", "print to stdout instead of writing to file", false)
  .option("--no-link", "omit commit links even if a repo URL is detected")
  .parse();

const opts = program.opts();

function main() {
  const from = opts.from ?? getLatestTag() ?? undefined;
  const repoUrl = opts.link === false ? null : getRepoUrl();

  const rawCommits = getCommits({ from, to: opts.to });
  if (rawCommits.length === 0) {
    console.error(
      from
        ? `No commits found between "${from}" and "${opts.to}".`
        : `No commits found up to "${opts.to}".`
    );
    process.exitCode = 1;
    return;
  }

  const parsed = rawCommits.map((c) => parseCommit(c));
  const date = new Date().toISOString().slice(0, 10);

  const section = renderSection({
    commits: parsed,
    version: opts.versionName,
    date,
    repoUrl,
    includeOther: opts.includeOther,
  });

  if (opts.dryRun) {
    console.log(section);
    return;
  }

  const existing = existsSync(opts.output) ? readFileSync(opts.output, "utf8") : "";
  const updated = prependToChangelog(existing, section);
  writeFileSync(opts.output, updated, "utf8");

  console.log(
    `✔ Wrote ${parsed.length} commit${parsed.length === 1 ? "" : "s"} to ${opts.output}` +
      (from ? ` (since ${from})` : "")
  );
}

main();
