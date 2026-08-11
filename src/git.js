import { execFileSync } from "node:child_process";

const FIELD_SEP = "\u0001"; // unlikely to appear in commit messages
const RECORD_SEP = "\u0002";

export function isGitRepo() {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the most recent git tag reachable from HEAD, or null if none exists.
 */
export function getLatestTag() {
  try {
    return execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Returns the short hash of the repo's first commit.
 */
function getFirstCommitHash() {
  const out = execFileSync("git", ["rev-list", "--max-parents=0", "HEAD"], {
    encoding: "utf8",
  }).trim();
  // A repo can technically have multiple roots; take the first line.
  return out.split("\n")[0];
}

/**
 * Fetches raw commits between `from` (exclusive) and `to` (inclusive).
 * `from` may be null, meaning "from the beginning of history".
 *
 * @returns {Array<{hash: string, shortHash: string, subject: string, author: string, date: string}>}
 */
export function getCommits({ from, to = "HEAD" } = {}) {
  const range = from ? `${from}..${to}` : getRangeFromBeginning(to);

  const format = ["%H", "%h", "%s", "%an", "%ad"].join(FIELD_SEP);
  let raw;
  try {
    raw = execFileSync(
      "git",
      ["log", range, `--pretty=format:${format}${RECORD_SEP}`, "--date=short"],
      { encoding: "utf8", maxBuffer: 1024 * 1024 * 32 }
    );
  } catch (err) {
    throw new Error(`Failed to read git history for range "${range}": ${err.message}`);
  }

  return raw
    .split(RECORD_SEP)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, shortHash, subject, author, date] = record.split(FIELD_SEP);
      return { hash, shortHash, subject, author, date };
    });
}

function getRangeFromBeginning(to) {
  // No tag to start from: include everything up to `to`.
  return to;
}

/**
 * Returns the remote "origin" URL, normalized to an https GitHub URL if possible.
 * Returns null if it can't be determined.
 */
export function getRepoUrl() {
  let remote;
  try {
    remote = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }

  // git@github.com:user/repo.git -> https://github.com/user/repo
  const sshMatch = remote.match(/^git@([^:]+):(.+?)(\.git)?$/);
  if (sshMatch) {
    return `https://${sshMatch[1]}/${sshMatch[2]}`;
  }

  // https://github.com/user/repo.git -> https://github.com/user/repo
  return remote.replace(/\.git$/, "");
}

export const _internal = { getFirstCommitHash };
