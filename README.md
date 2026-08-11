# changelog-forge

Generate a clean, grouped, linkable `CHANGELOG.md` from your git history — automatically, based on [Conventional Commits](https://www.conventionalcommits.org/).

No config file. No API keys. Just reads your git log and writes markdown.

## Why

Writing changelogs by hand is tedious and they go stale. If your team already writes commits like `feat: add dark mode` or `fix(auth): handle expired tokens`, this tool turns that history straight into a changelog, grouped by type, with links back to each commit.

## Install

```bash
npm install -g changelog-forge
```

Or run without installing:

```bash
npx changelog-forge
```

## Usage

```bash
# Generate a section for everything since the last git tag,
# prepend it to CHANGELOG.md
changelog-forge

# Preview without writing to disk
changelog-forge --dry-run

# Custom range and version name
changelog-forge --from v1.2.0 --to v1.3.0 --version-name "v1.3.0"

# Include commits that don't follow Conventional Commits format
changelog-forge --include-other
```

### Options

| Flag | Description | Default |
|---|---|---|
| `--from <ref>` | Start of the commit range | latest git tag |
| `--to <ref>` | End of the commit range | `HEAD` |
| `--version-name <name>` | Heading for this section | `Unreleased` |
| `-o, --output <path>` | Output file | `CHANGELOG.md` |
| `--include-other` | Include non-conventional commits under "Other" | off |
| `--dry-run` | Print to stdout instead of writing | off |
| `--no-link` | Omit commit links | off |

## Example output

```markdown
## v1.3.0 (2026-08-10)

### ⚠ BREAKING CHANGES

- drop support for Node 16 ([a412af3](https://github.com/user/repo/commit/a412af3...))

### ✨ Features

- **auth:** add OAuth login ([bb5e391](https://github.com/user/repo/commit/bb5e391...))

### 🐛 Fixes

- correct pagination bug ([dfe985a](https://github.com/user/repo/commit/dfe985a...))

### 📝 Documentation

- update README ([538b8e5](https://github.com/user/repo/commit/538b8e5...))
```

## Using it in CI

Auto-generate a changelog section whenever you push a new tag — see [`.github/workflows/changelog.yml`](.github/workflows/changelog.yml) for a ready-to-use GitHub Action.

## How it works

1. Reads commits between the last tag (or a ref you specify) and `HEAD` via `git log`
2. Parses each subject line against the Conventional Commits grammar: `type(scope)!: description`
3. Detects breaking changes from either a `!` marker or a `BREAKING CHANGE:` footer
4. Groups commits by type (features, fixes, docs, etc.) and renders markdown
5. Prepends the new section to your existing `CHANGELOG.md`

## Development

```bash
npm install
npm test
```

Tests use Node's built-in test runner (`node --test`) — no extra dependencies needed.

## License

MIT
