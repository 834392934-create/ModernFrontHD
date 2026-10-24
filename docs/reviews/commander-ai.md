# Commander AI ownership contract

This is a local game automation feature, not a claim about real military command systems. `src/commander-ai.js` uses explicit Game hooks; it never patches a prototype or advances simulation time itself.

## State and API

`game.commanderAI = {schema:1, enabled:false, manualIds:[], aiOrderIds:[]}` is separate from temporary FPS `directControl`.

- `initialize(game)` creates the default state and returns it.
- `setEnabled(game, boolean)` returns whether the operation was accepted. An unchanged value is idempotent. Enabling clears manual exclusions and starts the next AI decision promptly. Disabling cancels only tagged AI movement/targets and unlaunched salvos; paid queues and player orders remain.
- `eligible(game, entity)` preserves enemy AI and the previous FPS-only behavior, excludes the driven unit, and excludes manually reserved friendly units while commander takeover is enabled.
- `markManual(game, ids)` records successfully issued player orders, including stop; these exclusions last until a new off/on cycle. It removes their AI-order provenance.
- `markOrders(game, ids, isAI)` tags accepted AI orders while commander takeover is enabled. `isAI=false` means an explicit player order, not an arbitrary internal call.
- `run(game, team, dt)` invokes the existing `game.ai` only for the eligible player team, with an exception-safe `_commanderAIContext` flag. It does not run on nonpositive time, after game over, or without commander/FPS takeover.
- `observed(game, enemy)` admits actual visible or sonar-detected contacts for player AI, using the shared `game.entityVisible(0,enemy)` API when supplied. It does not reveal fog or remember invisible live coordinates.
- `save(game)` returns an independent serializable state, pruning removed IDs while retaining living nested passengers/crew. `validate(snapshot, game?)` accepts missing legacy state, checks schema/types/unique bounded IDs and, if a Game is supplied, friendly identity. `load(game, snapshot)` validates before assignment and does not invoke toggle side effects.

## Required primary integration hooks

1. Load the module before sim in the desktop page and CommonJS dependency list. Initialize in `Game` construction.
2. Keep enemy `ai(t,dt)` unchanged. For team 0, invoke `run(this,t,dt)` instead of testing only `directControl`.
3. Filter AI `units`, support assignment and `updatePlayerProtection` candidates through `eligible`. Base-guard selection in FPS must also respect manual exclusions when persistent takeover is enabled.
4. After `command()` accepts IDs, tag AI-origin commands inside `_commanderAIContext`. UI move, attack, queued waypoints, retreat, stop, return/resupply must explicitly call `markManual` after acceptance. Internal rally/flight/supply orders are not implicitly human orders. The UI stop path currently bypasses `Game.command` and needs its own hook.
5. Team-0 strategic target selection must use `observed`; `canDetect` alone does not check ordinary fog. Without an observed enemy, use known map objectives/scouting, not unseen entity coordinates. Target domain, supply, cost and technology gates remain in existing Game APIs.
6. FPS entry/exit must preserve the commander preference. Preserve the old `_directTeamAI` backup/restore behavior only when persistent takeover is off; never rewind a running commander schedule on FPS exit or save.
7. Serialize `commanderAI: save(this)`, validate/load after the actual saved entities and teams have been assigned. Missing state means off. Do not serialize transient `_commanderAIContext`.
8. RTS Y/button share one guarded toggle callback; ignore repeat/editable/modal/hidden/modified-key/FPS input. The button exposes `aria-pressed`; status explains manual orders remain under the player's control. Pause changes no AI time; toggling is a preference change, not an unpause.

## Verification scope

The dedicated tests exercise actual `Game` production, orders, paid queues, FPS handoff and save/load. Helper-only exception tests cover cleanup of transient AI context. Existing player-protection/direct-control tests remain authoritative for the original FPS-only behavior. Native UI validation is performed by the coordinating agent; this implementation slice does not start a GPU test.

Final independent CPU verification on 2026-10-25: `node --test tests/commander-ai.test.cjs tests/player-protection.test.cjs tests/direct-control.test.cjs` passed **47/47** tests (19 commander, 12 protection, 16 direct control). This includes actual funded production/construction, manual stop and movement persistence, real pending MLRS cancellation without changing launched projectiles, fog/sonar boundaries, embarked identity, legacy and malformed saves, and FPS entry/exit/in-seat-save scheduling. No GPU or native input test was run in this slice.

Independent integration review found the retreat button and successful resupply button omitted manual ownership. The coordinating agent added those hooks; tests execute the current app callbacks against a real Game and verify that a later disable preserves the player's accepted order. A separate long-match RED test reproduced stale dead IDs exhausting the 1,000-entry authority bound, silently losing new player exclusions. The module now reclaims dead/removed IDs only when a bound is reached, retaining living nested passengers/crew. Tests verify new manual commands remain excluded and newly tagged AI orders still cancel after more than 1,000 historical casualties. No blocking issue remained in the reviewed commander hooks after these fixes; native UI and complete release checks remain with the coordinating agent.
