# Integration Map — State Machine + Hooks + Quality Gates + Feedback

> How open-pantheon's craft pipeline connects with the development lifecycle automation.

## Architecture Overview

```
                          ┌─────────────────────────────────────────┐
                          │           .state.yaml changes           │
                          └─────────────────┬───────────────────────┘
                                            │
                                  PostToolUse (Write/Edit)
                                            │
                          ┌─────────────────┼───────────────────────┐
                          ▼                 ▼                       ▼
                  state-transition.sh  craft-progress.sh    phase-progress.sh
                  (bridge hook)        (bridge hook)        (ultra hook)
                          │                 │                       │
              ┌───────────┼─────────┐       │                       │
              ▼           ▼         ▼       ▼                       ▼
        Quality Gate  Feedback  Recovery  docs/PROGRESS.md    Phase TASKS.md
        (pre-build,   (ADR,     (error     (craft pipeline     (dev lifecycle
         pre-deploy)   retro)    retry)     status)             status)
```

## State Transition → Hook Mapping

| State Transition | Hook Triggered | Action |
|:-----------------|:---------------|:-------|
| `init → analyzing` | state-transition.sh | Log phase 1 start |
| `analyzing → analyzed` | state-transition.sh | Log phase 1 complete, suggest PROGRESS.md update |
| `analyzed → designing` | state-transition.sh | Log phase 2 start |
| `designing → design_review` | state-transition.sh | Log design ready for review |
| `design_review → building` | state-transition.sh | Log phase 3 start |
| `building → validating` | state-transition.sh | **Quality gate: pre-build check** |
| `validating → build_review` | state-transition.sh | Log validation passed |
| `validating → building` | state-transition.sh | Log issues found, feedback to builder |
| `build_review → deploying` | state-transition.sh | **Quality gate: pre-deploy check** |
| `deploying → done` | state-transition.sh | **CHANGELOG update + portfolio sync + feedback prompt** |
| `any → failed` | state-transition.sh | **Error recovery trigger**, log failure |
| `any → paused` | state-transition.sh | Log pause with previous state |

## Quality Gate Integration Points

```yaml
# In .state.yaml — quality_gate section
quality_gate:
  pre_build: pending    # Set by state-transition.sh at building → validating
  pre_deploy: pending   # Set by state-transition.sh at build_review → deploying
  post_release: pending # Set by state-transition.sh at deploying → done
```

### Pre-Build (Phase 3 → 3.5)
- **Trigger**: `building → validating` transition
- **Checks**: content.json schema, tokens.css completeness, no PLACEHOLDERs
- **On fail**: Block transition, feed issues back to page-writer
- **On pass**: Update `quality_gate.pre_build: passed`

### Pre-Deploy (Phase 3.5 → 4)
- **Trigger**: `build_review → deploying` transition
- **Checks**: All validation passed, site/ builds, deploy config valid
- **On fail**: Block deployment, show issues
- **On pass**: Update `quality_gate.pre_deploy: passed`

### Post-Release (Phase 4 → done)
- **Trigger**: `deploying → done` transition
- **Checks**: deploy.yaml exists, URL accessible, documentation complete
- **On pass**: Update `quality_gate.post_release: passed`

## Feedback Loop Integration

```yaml
# In .state.yaml — feedback section
feedback:
  learnings_captured: false  # Set after user captures learnings
  adr_generated: false       # Set after ADR created
  retro_completed: false     # Set after retrospective
```

### On Pipeline Completion (`done` state)
1. **Prompt for learning capture**: What went well? What could improve?
2. **Auto-suggest ADR**: If architecture decisions were made (design-profile changes, template switches)
3. **Record metrics**: Pipeline duration, retry count, CLI distribution, fallback events

### On Pipeline Failure (`failed` state)
1. **Auto-capture error learning**: What caused the failure
2. **Suggest error category**: bugs, performance, security, architecture, tooling, process
3. **Track recovery**: How the issue was resolved

## Hook Execution Order

For a Write tool call that modifies `.state.yaml`:

```
1. pre-tool-use-safety.sh Write     ← Safety check (PreToolUse)
2. [Write tool executes]
3. auto-doc-sync.sh Write           ← Doc sync (PostToolUse)
4. phase-progress.sh Write          ← Phase TASKS.md update
5. post-tool-use-tracker.sh Write   ← Analytics tracking
6. state-transition.sh Write        ← State machine bridge ← NEW
7. craft-progress.sh Write          ← Craft pipeline progress ← NEW
```

## File Dependencies

```
workspace/{project}/.state.yaml
    ├── read by → state-transition.sh
    ├── read by → craft-progress.sh
    └── schema  → workspace/.state-schema.yaml
                      ├── quality_gate section
                      └── feedback section

.claude/settings.json
    └── hooks.PostToolUse
          ├── state-transition.sh (Write, Edit)
          └── craft-progress.sh (Write, Edit)

docs/PROGRESS.md
    └── written by → craft-progress.sh
```
