# Room Capacity Load Validation Checklist

> Last updated: 28 July 2026
> Target: launch-preparation validation

## Automated Validation

Start the application with isolated local infrastructure:

```powershell
npm run infra:up
$env:PORT="3101"
$env:HOST="127.0.0.1"
$env:DATABASE_URL="mysql://hushle:hushle@127.0.0.1:3307/hushle_dev"
$env:REDIS_URL="redis://127.0.0.1:6381"
$env:REDIS_KEY_PREFIX="hushle:test:capacity-load"
$env:RATE_LIMIT_ENABLED="false"
npm run dev
```

Run the parallel room load test from a second terminal:

```powershell
$env:SOCKET_TEST_URL="http://127.0.0.1:3101"
$env:ROOM_CAPACITY_TEST_EXPECTED_MAX="12"
$env:ROOM_CAPACITY_TEST_EXPECTED_TEAM_MAX="6"
$env:ROOM_CAPACITY_TEST_CANDIDATES="24"
npm run test:room-capacity-load
```

The test verifies:

- concurrent candidates never exceed the configured room limit
- overflow sockets receive a room-full error
- both teams remain balanced and within team capacity
- full-room reconnect keeps the same guest `playerId`
- reconnect does not create a duplicate room player
- a new outsider is still rejected after reconnect
- lobby payloads do not expose user id, identity type, username snapshot, or IP

The values must match the capacity settings loaded by the test server. The script does
not mutate MySQL settings.

## Recorded Baseline

Local Windows and Docker validation on 28 July 2026:

- 24 concurrent candidates
- 12 admitted
- 12 rejected
- 10 consecutive successful runs
- observed parallel join completion: 42-70 ms
- reconnect preserved persistent guest identity in every run

This is a correctness baseline, not a production capacity benchmark.

### Registered Start Rule

The test creates and removes a temporary registered user:

```powershell
$env:SOCKET_TEST_URL="http://127.0.0.1:3101"
$env:DATABASE_URL="mysql://hushle:hushle@127.0.0.1:3307/hushle_dev"
npm run test:room-registered-start-rule
```

It verifies that three active players cannot start when a registered participant is
present, four active players pass the start guard, and the next server validation is
category selection.

### Closed Admission And Reconnect

This test temporarily writes system settings. It is restricted to a loopback URL,
requires an explicit mutation gate, restores the original API settings and raw MySQL
rows, and removes its temporary admin and audit records:

```powershell
$env:SOCKET_TEST_URL="http://127.0.0.1:3101"
$env:DATABASE_URL="mysql://hushle:hushle@127.0.0.1:3307/hushle_dev"
$env:CAPACITY_ADMISSION_MUTATION_TEST="true"
npm run test:room-admission-closed
```

It verifies that `closed` blocks new create/join requests immediately while an
existing guest reconnect keeps the same persistent player identity.

## Manual Admin Scenarios

### Lowering Limits

1. Fill a room above the new intended lower limit.
2. Lower room or team capacity in the admin panel.
3. Confirm existing players are not removed or moved.
4. Confirm new joins and team switches respect the new limit.
5. Raise the limit again and confirm admission resumes.

### Late Spectator Reward

1. Start a match with eligible participants.
2. Join from a new client while the match is active.
3. Confirm the late join is a spectator.
4. Finish the match.
5. Attempt finalize from the spectator account.
6. Confirm no wallet adjustment is created.
7. Confirm original match participants can finalize normally.

### Admin Health States

1. Confirm the capacity card reports Redis as available.
2. Confirm room, player, match, spectator, socket, memory, and event-loop values update.
3. Temporarily lower warning and critical thresholds in a controlled environment.
4. Confirm warning keeps create/join open.
5. Confirm critical blocks new room creation but keeps existing-room joins open.
6. Confirm maximum online players blocks both create and join.
7. Restore production-intended thresholds.

## Failure Rules

- Do not merge if admitted players exceed the configured room limit.
- Do not merge if reconnect creates a second persistent player.
- Do not merge if an overflow socket receives lobby state after rejection.
- Do not merge if spectator finalize writes coin.
- Do not tune production limits from local latency numbers alone.
