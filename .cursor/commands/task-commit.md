# Commit Workflow

## Overview
Guided flow to prepare, commit, and publish changes following Conventional Commits (strict) and repository rules.

## Steps
1. **Pre-flight checks**
   - Run `./run check` if the project wasn’t checked since the last modification.
   - Review the current `./documents` tree (except `whiteboard.md`) and catalogue the facts that need reflection in the docs; inspect changes since the last commit (`GIT_PAGER=cat` or similar) to understand what must be captured.

2. **Documentation sync**
   - Update every doc under `./documents` (excluding `whiteboard.md`) to describe the current project state in English; remove historical changelog content and focus on present facts.
   - Apply combined extractive/abstractive summarization: pull every relevant fact from the code/changes, then compress the wording without losing meaning.
   - Keep content compact (lists, tables, YAML, Mermaid diagrams), optimize lexis (shorter synonyms, lemmatize where suitable), and adopt entity compression (e.g., after the first mention use standard abbreviations or acronyms).
   - Eliminate filler phrases, prioritize direct language, and maintain clear structure with headings/sections; prefer special symbols or numerals when they aid clarity.

3. **Change review**
   - Study all changes since the last commit (use `GIT_PAGER=cat`).
   - Ensure package updates (add/update) are isolated in their own commit.

4. **Commit creation**
   - Compose the message per Conventional Commits 1.0.0 (Strict Profile).
   - Verify type, scope, header length, body wrapping, and footers.

5. **Publish**
   - Push the commit to GitHub.
   - If the current branch is not `main`, create a pull request via `gh pr create` and share the PR link with the user.

## Checklist
- [ ] Project checked with `./run check`
- [ ] `./documents` reviewed and updated to reflect current state (English-only, compact, structured)
- [ ] Facts extracted from changes and compressed without losing meaning
- [ ] Changes reviewed using `GIT_PAGER=cat`
- [ ] Dependency changes isolated in dedicated commit
- [ ] Commit complies with Conventional Commits (strict)
- [ ] PR created and link shared (if the current branch is not `main`)

## Conventional Commits (Strict) Quick Reference
- Structure: `<type>(<scope>)!: <description>`; body and footers separated by blank lines
- Allowed types: `feat` `fix` `perf` `refactor` `docs` `style` `test` `build` `ci` `chore` `revert` `prompts`
- Header ≤100 chars; body lines ≤72; UTF-8; LF; no trailing spaces
- Breaking: `!` in header or `BREAKING CHANGE:` footer (with migration notes)
- Footers: `Token: Value` (`Closes`/`Fixes`/`Refs`/`Co-authored-by`/`Signed-off-by`/`Reviewed-by`/`BREAKING CHANGE`/`X-*`)
- `revert` must include `Reverts: <sha>` in body

