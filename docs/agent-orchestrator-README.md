# Agent Orchestrator — Claude Code Skill

A generic, reusable skill for coordinating multiple AI agents on a shared project: web apps, browser games, tools, research, and other substantial builds.

## What it does

- Profiles each available agent without inventing context-window, memory, reasoning, tool, or quota details.
- Assigns bounded tasks based on capability, task risk, context fit, cost, and availability.
- Allows safe parallel work only where dependencies and write scopes do not collide.
- Creates self-contained handoff packets for external agents that Claude cannot directly invoke.
- Requires an independent read-only reviewer for every implementation, then controlled integration.
- Preserves state so tasks can be retasked, rescheduled, reassigned, and resumed across sessions.
- Reduces context waste by passing only the relevant requirements and file paths to each agent.

## Install globally in Claude Code

Global/personal installation makes the skill available across projects on this machine.

### Windows PowerShell

```powershell
$skillDir = Join-Path $HOME ".claude\skills\agent-orchestrator"
New-Item -ItemType Directory -Force -Path $skillDir | Out-Null
Copy-Item ".\SKILL.md" (Join-Path $skillDir "SKILL.md") -Force
```

Run that command from the extracted folder containing `SKILL.md`.

### Linux/macOS

```bash
mkdir -p ~/.claude/skills/agent-orchestrator
cp SKILL.md ~/.claude/skills/agent-orchestrator/SKILL.md
```

Then restart Claude Code if the skill doesn't appear, or invoke:

```text
/agent-orchestrator plan I want to build a browser game. Help me organize the project across my available agents.
```

The exact command is `/agent-orchestrator`. Other useful invocations:

```text
/agent-orchestrator status
/agent-orchestrator next
/agent-orchestrator review GAM-001
/agent-orchestrator retask GAM-003
/agent-orchestrator reschedule
/agent-orchestrator integrate GAM-004
/agent-orchestrator close
```

## Install for one project only

Copy the `SKILL.md` file to:

```text
YOUR_PROJECT/.claude/skills/agent-orchestrator/SKILL.md
```

Commit it to version control if you want the project's collaborators to share it.

## Optional: make Claude remember to use the workflow

A skill is available when relevant and can be invoked directly, but it's not the same as always-loaded memory. If you want a short reminder loaded every Claude Code session on this machine, append the contents of `GLOBAL-CLAUDE.md.snippet` to `~/.claude/CLAUDE.md`. Keep that global memory reminder short; the detailed workflow stays in the on-demand skill.

User-level skills under `~/.claude/skills/` are local to Claude Code on this machine. They do not automatically install into Claude.ai, Cowork, other devices, or external agent websites; those environments need their own supported import/setup path.

## Important limitations

The skill can only launch agents that the active environment actually exposes. It cannot directly control separate websites or free cloud agents unless a supported tool/API/MCP integration exists. For these agents it prepares handoff packets and records returned work. It cannot measure hidden token use or introspect private model settings; it records documented or user-provided values and uses `unknown` otherwise.

## Project-state files

On first use, the skill instructs Claude to create a `.orchestrator/` folder inside the actual project containing `PROJECT.md`, `AGENTS.md`, `TASKS.md`, `DECISIONS.md`, `OWNERSHIP.md`, and `RUNBOOK.md`, plus task handoffs under `.orchestrator/handoffs/` as needed. This keeps coordination persistent without stuffing the full project history into every agent prompt.
