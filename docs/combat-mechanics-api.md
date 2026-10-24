# Combat mechanics integration

All capacities, timers, component thresholds, trajectories and survival rules in
these modules are original gameplay values. They are not measured weapon data.
Modules are offline IIFEs/CommonJS exports and do not patch `Game.prototype`.

## Readiness

`WarCombatReadiness` owns `e.combat` (schema 1): `mounts`, `stations`, `activeId`,
`phase`, optional supply state. Mounts contain yaw, pitch, target IDs and the shared
main-gun chamber cooldown. Stations contain ammo, reserve, cooldown,
reloadRemaining/reloadTotal, phase, phaseAt/phaseUntil, nextPort, shotSerial,
lastShotAt and setupReady. Phases are ready/setup/reload/pack.

- `weapons(g,e)` returns canonical weapon stations; ordinary personnel/buildings
  receive `kind:primary`. Operators keep their separate ammunition implementation.
- `profile(g,e,w)` accepts a station or weapon definition. Optional mechanics and
  mount metadata override game defaults. Aircraft finite onboard reserve is zero.
- `ensure(g,e)`, `status(g,e,w,target=null,ctx={})`, `step(g,e,dt,ctx={})`.
  Context supports target, weapon, moving, aimYaw/aimPitch, aimPoint or
  aimX/aimY/aimHeight, aimOrigin, muzzleBlocked and burstContinuation. A complete
  world aim point takes priority over stale Euler input and target-center hints;
  readiness and final emission use the same validated muzzle.
- `consumeRound(g,e,w,{deferCooldown=false})` only after an actual emitted round.
  Deferral is for a salvo/burst continuation, never permission to create free ammo.
- `requestReload(g,e,weaponId?)`, `service(g,e,source,dt)`, `supplyPlan(g,e)`,
  `requestSupply(g,e,source)`, `needsReturn(g,e)`, `movementMultiplier(e)`.
- `beginBurst(g,e,w,target,aim)` after the first emitted round; `takeBurst(g,e)`
  returns at most one due continuation `{weaponId,targetId,aim,burstContinuation}`.
  `cancelBurst(e)` on stop, weapon change, pause, focus loss or control exit.
  A released trigger may finish a short burst. Do not save unlaunched burst queues;
  retain the magazine count and cooldown. Never fan out rocket salvos twice.
  A destroyed/missing burst target cancels pending rounds before emission.
- `snapshot(g,e,w)` returns weaponAction: weaponId/category/sequence/event/phase/
  progress/reloadKind/fireMode/shotTime/ammo/time/sourceId. Rendering reads this
  without advancing it.
- `validate(e,gOrFaction)` checks supplied schema and rejects corrupt counts.

`ammo` buff means player infinite reserve, still requiring a timed reload. It does
not rewrite finite stock, and enemies never inherit it. `reload` multiplies player
reload/cadence times by .25. `unlimited` remains money only. Service spends normal
team resources through Game.spend; unsupported domains, remote sources, EMP and
unpowered sources cannot supply. Aircraft only rearm while in service at home.

Main-gun ammunition variants share chamber cooldown; coax shares aiming but not
that chamber. `e.cool` is only a compatibility projection of the selected station.

## Damage

`WarCombatDamage` owns `e.components` schema 1:

```
{ parts:{engine|tracks|turret|hull|control|structure:{health,lastHitAt}},
  lastHitAt, hitPoint:{x,y,height}|null, fireUntil, flooding, listing,
  state, destroyedAt, personnel:{downedAt,bleedUntil,reviveProgress,
  rescuerId,limp,staggerUntil,everDowned}|null }
```

Only applicable parts exist. Health is normalized 0..1. States:
operational/disabled/burning/flooding/crashing/downed/dead. Fire and flooding may
coexist regardless of the dominant state.

- `apply(g,e,actualDamage,source)` runs after shield/HP application and before
  the central death branch. It may preserve a new downed casualty or a fatal
  airborne aircraft at HP 1 until rescue, bleed-out or physical ground impact.
- `step(g,e,dt)` returns `{damage,expireDowned,crashImpact}`. Apply returned damage
  once through `Game.damage(...,{componentTick:true})`. A crash moves the entity
  itself; skip normal driving/navigation in that state. It does not teleport it.
- `incapacitated(e)`, `mobility(e)` and `weaponAvailability(e,w)` are shared gates.
  Downed personnel remain live for annihilation victory but cannot drive, shoot,
  move or block ground navigation. Do not count them as dead before bleed-out.
- `repair(g,e,source,dt)` repairs appropriate parts, suppresses fire/flooding and
  advances actual medic rescue. Successful rescue writes
  `source.rescueAction={targetId,time,progress}` for visual/audio readers.
- `repairPulse(g,e,ratio)` repairs normalized component health, extinguishes fire
  and reduces flooding for the paid repair ability or gradual maintenance. It
  does not change HP, revive dead entities or bypass the timed casualty rescue.
  Medical and domain-limited support cannot repair buildings; building repair
  requires headquarters, factory or repair hub service.
- `wreck(g,e)` creates a detached death descriptor with kind/team/entityId,
  x/y/height/angle/pitch/roll, createdAt, ttl/max, personnel/naval/aircraft flags,
  and a components snapshot. The game owns its lifetime: personnel 12s, others 35s.
- `ensure(g,e)` and `validate(e)` support optional legacy-save migration.

## Projectiles

`WarCombatProjectiles.decorateLaunch(g,e,w,shot)` assigns a unique projectileId
using the already-saved `g.nextId`, and adds a serializable trajectory when needed.
`position(fx)` is the sole sampled world position for simulation and both render
views. Existing frozen shots retain the old linear fallback.

`step(g,fx,dt)` returns `{handled,impact,expired}`. For handled effects, do not
decrement ttl again. Impact writes the actual endpoint and ttl=0 for the normal
single damage-settlement branch. Expired means skip original damage entirely.
Bombs inherit frozen release velocity and game gravity. Howitzer, mortar and
grenade arcs solve a parabola between frozen endpoints. Torpedoes track only
detected water-layer contacts, search briefly after loss and can be diverted by
decoys. `deployDecoy(g,e)` consumes one of three charges and has an eight-second
cooldown. It never creates damage.
`bombSolution(e,origin,targetHeight)` is the shared drop-window/launch prediction,
returning velocity, gravity, impactHeight, fall time and the predicted endpoint.

Kinetic gun, cannon and unguided rocket rounds, arcing shells and falling bombs
sweep from the previous sampled position to the current one. Entity candidates
come from `g.spatial`, followed by
the existing model envelope transformed with the renderer's yaw/pitch/roll order.
The nearest entity or tree intercepts the segment. Friendly or unsupported-domain
entities stop the round without friendly fire; moved targets can miss. This is
envelope collision, not per-triangle armor penetration. `canImpact(g,fx,e)` shares
the frozen weapon/operator domain gate with the central settlement branch.
An explicitly rejected observed target is frozen as `excludedTargetId` at launch
and cannot become a hit merely because fog updates later. Independent free fire
can still collide with other currently visible, permitted enemies.

Entity-locked missiles use kind `guided` with phase `separation` (aircraft),
`vertical` (deck launch), `ignition`, `powered` or `coast` after contact loss.
Heading and pitch have finite turn rates; position never snaps to a target. The
serializable fields include position/previous, heading/pitch, speed/cruiseSpeed,
turnRate/pitchRate, phaseAge, destination, releaseVelocity and lockId. All vector
objects use world `{x,y,height}`. The renderer may show exhaust only for ignition
and powered phases, and derives orientation from previous → position. The basis
is `gameplay-guided-launch`, not a measured propulsion model. FPS fixed-impact
and targetless free shots retain their frozen line, including high sky endpoints;
they never acquire a new homing lock. Pause (`dt=0`) leaves state untouched.
Cross-orbit guided shots retain the existing projected game travel scale; this
is not a real orbital velocity. Surface/submerged torpedoes leave tubes aligned
to the hull and slow horizontal approach during a large depth correction.
Skyward free bomb aim still falls from its launch altitude. Autonomous bombers
wait for a drop window computed from their current velocity and game gravity;
ordinary forward weapons use a descending attack pass with terrain clearance.
Hovering rotorcraft rotate toward their target without sideways teleportation.

`interceptionPlan(g,e)` is a read-only candidate query;
`tryIntercept(g,e,dt)` turns the selected defensive mount, checks readiness,
consumes ammo and emits `type:'interceptor'`. Only actual intersection cancels the
enemy projectile. Remove the former instant 2D interception branch.
The muzzle comes from `g.resolveWeaponOrigin(e,weapon,portIndex)` if available;
the fallback is explicitly `originApproximate`. Both the original range check and
the resolved muzzle range must pass before ammunition is consumed. Interceptors
carry weaponId/mountId/ammoType/shotSerial/portIndex for animation/audio readers.
The original dedicated interception radius takes priority over the offensive
station range. Idle readiness does not reset a defensive mount's elevation.
An idle driving camera also yields a shared mount to active point defense. A
deliberate trigger owns that same mount; independent defensive mounts remain
available. One servo update owns the mount per tick, retaining finite traversal
and elevation limits, so interception is not guaranteed for every trajectory.
`validate(fx)` validates dynamic state on load; `validateEntity(e)` validates saved
decoy charges and cooldown. Decoy resupply is paid through the readiness service.
Naval yards service naval and underwater units; spaceports and the declared
orbital support units service space units. All stock and money changes remain
team-specific. Static profile caches are per game/faction/kind/weapon and salvo
configuration reference; ammunition, cooldowns and player buffs are never cached.

## Transport

`WarTransportOperations` provides `capacity(e)`, `status(g,e)`, `board(g,e,p)`,
`disembark(g,e,personnelId?)`, `destroyed(g,e,from)`, `step(g,e,dt)` and
`validateGame(g)`. IFVs have six game seats. Passengers are original entity
objects in `e.passengers`, with embarkedIn and passengerSeat. They are removed
from the active entity list while aboard; driver vehicleCrew remains independent.
Loading checks distance, ownership, speed, altitude, capacity and incapacity.
Unloading reuses legal collision-aware land exits, retaining passengers if blocked.
Destroying the carrier resolves each passenger once: legal survivor extraction or
central death. No clone or resurrection is created. `cargo` remains ore only.
Save validation rejects incapacitated hidden passengers and reuses the full
operator validator for nested loadouts, fire modes and reload stages.

## Verification

Run the four `combat-*.test.cjs`/`transport-operations.test.cjs` suites, then original
aircraft, carrier, direct-fire, vehicle-combat, salvo, operator and crew regressions.
The simulation owner additionally tests the actual Game hooks, both camera modes,
pause/focus loss, independent profile launch and packaged source hashes. These
CPU module tests do not assert visual fidelity or native release acceptance.
