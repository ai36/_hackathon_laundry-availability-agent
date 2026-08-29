# Connected Agent Skills

Skills wired into the Claude Code workflow for this project. Each runs with full agent
permissions and was reviewed before use.

## find-skills

- **Source:** base Claude Code skill set (`~/.claude/skills/find-skills`), backed by the
  skills.sh ecosystem and the `npx skills` CLI.
- **What it does:** searches for installable skills (`npx skills find <query>`) and installs
  them (`npx skills add <owner/repo@skill> -g -y`).
- **When we use it:** whenever a concrete capability gap shows up during the build
  (testing, eval harness, deployment, data wrangling, etc.), search first before writing a
  bespoke solution. Every skill added this way gets a `docs/DECISIONS.md` entry and a
  `docs/WORKLOG.md` line.

## grillme

- **Source:** `jekudy/grillme-skill@grillme` (skills.sh /
  https://github.com/jekudy/grillme-skill).
- **License:** MIT (per the source repo README). Used as agent guidance only, not
  redistributed.
- **Install location:** `~/.agents/skills/grillme`, symlinked into `~/.claude/skills/`.
- **Security at install:** Gen "Safe", Socket "0 alerts", Snyk "Low Risk".
- **What it does:** Socratic interview — asks probing questions instead of giving answers,
  hunts for exceptions and contradictions, and adapts as assumptions surface. Triggered by
  phrases like `grillme`, "прожарь", "задавай вопросы", "интервью", or a shallow task
  description.
- **When we use it:**
  1. **Before the baseline** — run it against `docs/PROBLEM.md` to pin down the user, the
     bottleneck, the definition of "good", and the evaluation design.
  2. **Before the report** — grill each results claim to make sure it is backed by evidence
     and survives the hard case.

## Frontend build skills (Vercel Labs) — added 2026-08-28

Installed project-local (`.agents/skills/`, symlinked into `.claude/skills/`; both
git-ignored) and declared in `skills-lock.json` (committed). Reproduce with
`npx skills install`. Source: `vercel-labs/agent-skills` (GitHub), used as agent guidance
only. Connected to inform the portal work (`/`, `/integrator`, the CRUD console).

| Skill | Use it when |
| --- | --- |
| `vercel-react-best-practices` | writing / reviewing / refactoring React + Next.js — data fetching, Server vs Client components, bundle + render performance |
| `vercel-composition-patterns` | component API design — compound components, render props, context, boolean-prop proliferation; React 19 API changes |
| `web-design-guidelines` | reviewing UI code for the Web Interface Guidelines — accessibility, responsiveness, overflow, focus/keyboard, contrast |
| `deploy-to-vercel` | actually deploying (the tenant `/` page) to Vercel — see D-0015/D-0016 for what can and can't go there |

**Anthropic:** the `claude-api` skill (building LLM-powered apps with the Anthropic SDK) is
already available bundled with Claude Code — no separate install. It governs any code that
calls Claude (here: `src/agent/vision.ts`).

## Adding more skills

1. `npx skills find <query>` (via `find-skills`).
2. Review the skill's `SKILL.md` and its security assessment.
3. `npx skills add <owner/repo@skill> -g -y`.
4. Record it: `docs/DECISIONS.md` entry + `docs/WORKLOG.md` line + update this file.
