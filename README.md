# SevenDays

Working title for a **Prankdom** app: a harmless horror-prank experience built around anticipation.

> **Prankdom — apps for friends. Or people you don't like.**

## Repository Work Rules — HANDS OFF

These rules govern all work in this repository.

### Rule Zero: Mutual agreement is required

**No change goes into this repository unless the user and assistant have explicitly agreed to that specific change and its scope.**

Discussion, suggestions, discovered problems, implementation convenience, cleanup opportunities, and adjacent improvements are not authorization. If there is any doubt about whether a change was agreed upon, it is not authorized and must not be made.

Authorization to implement one thing does not authorize related fixes, refactors, cleanup, dependency changes, asset replacement, deletion, renaming, or other adjacent work.

**No agreement = no change.**

### HANDS OFF

Anything not directly involved in the current agreed task is out of scope and must not be changed.

Only modify the current target and its direct cascade members: files or components that genuinely must change for the agreed target to function. Do not expand that cascade because another change would be cleaner, nicer, easier, or more convenient.

When uncertain whether something is in scope, treat it as out of scope. **HANDS OFF.**

### Suggestions are encouraged; implementation is not implied

If the assistant sees a better design, implementation, optimization, fix, or alternative, it should say so and explain the tradeoff. The plan can be discussed and improved freely.

A suggestion does not become authorized repository work until both user and assistant agree to it. Challenge the plan when useful; never silently substitute a different plan.

### Read before writing

Inspect the current repository state and the actual current contents of every file that must be changed. Never reconstruct a file from memory, an earlier version, or assumptions. The repository is authoritative.

### Keep the software working

Every completed change must leave the application in a working, buildable state. Do not knowingly commit an intermediate state that breaks existing functionality.

### Working first; cleanup second

Do not refactor while implementing an agreed feature unless the refactor itself is required and agreed upon.

Required order:

**Implement → run/build → verify → establish working state → then discuss cleanup/refactoring/reorganization.**

Once the requested work is functioning, cleanup, refactoring, restructuring, optimization, renaming, and architectural improvements can be considered as separate agreed work.

### No collateral fixes

If unrelated broken, ugly, obsolete, questionable, or improvable code is discovered, leave it alone. Report or suggest it if useful, but do not change it without agreement.

### Make targeted edits

Do not replace whole files unnecessarily. Preserve unrelated contents and behavior. Make the smallest change that correctly implements the agreed work.

If completing the task genuinely requires touching something outside the expected direct cascade, stop before changing it and discuss that dependency first.

### Preserve asset sources and backups

Do not casually discard source material. Original supplied artwork, source images, intermediate asset work, generated-asset sources, and useful backups must be committed under `backup-assets/` so generated production assets can be reproduced later.

The repository must not depend on chat history as the only copy of important asset source material.

## Concept

The app presents the user with unsettling, cursed-phone-style media. After they watch it, the app abruptly starts a real seven-day countdown.

The timer is the entire threat.

Nothing harmful happens when it reaches zero. The horror comes from the user's anticipation, the presentation, and seven days of wondering what the app intends to do.

At zero, after allowing the moment to hang:

**CONGRATULATIONS — YOU SURVIVED!**

## Core Experience

1. User deliberately opens the app and watches the initial creepy sequence.
2. A seven-day countdown begins.
3. The countdown persists between sessions and reflects real elapsed time.
4. The app sends clearly attributed SevenDays/Prankdom notifications, potentially as often as hourly when the user has granted notification permission.
5. Notifications become increasingly ominous as zero approaches, without claiming that real-world harm will occur.
6. The app offers a way to **gift/share the experience with a friend** as the fictional way to cancel or escape the countdown.
7. Sharing never secretly enrolls another person. A recipient must deliberately install/open the app before their own experience begins.
8. If the original user's timer reaches zero, nothing bad happens. The payoff is simply: **Congratulations, you survived!**

## Gift / Viral Mechanic

Recurring Prankdom language:

**GIFT THIS APP**

**Share the experience!**

The joke is that someone who has endured the experience can pass the same anticipation to somebody else.

## Design Rules

- The app must never actually harm, lock, damage, erase, encrypt, or interfere with the user's device or data.
- Do not impersonate real phone calls, emergency alerts, system warnings, other apps, or other people.
- Notifications must be clearly attributable to the app and use normal OS notification permissions.
- Do not contact or enroll another person without explicit user action.
- The recipient must knowingly install/open the app before their own countdown starts.
- The countdown must survive ordinary app restarts/reboots by storing its target timestamp rather than relying on a continuously running process.
- The user's device remains fully controllable at all times.
- The horror should come from **presentation and anticipation**, not actual malicious behavior.

## Tone

Play the premise completely straight. Avoid winking comedy during the seven-day countdown. The final **YOU SURVIVED!** is funny precisely because the app spent seven days convincing the user's imagination that reaching zero mattered.

## Initial Build Targets

- Opening cursed-media sequence.
- Persistent seven-day target timestamp.
- Full-screen countdown display: days / hours / minutes / seconds.
- Countdown state persistence across app restarts and device reboot.
- Notification permission flow.
- Scheduled app-attributed notifications.
- Escalating notification copy based on remaining time.
- Share/gift flow.
- Zero-state sequence and **CONGRATULATIONS — YOU SURVIVED!** payoff.

## Status

Concept / prototype stage.