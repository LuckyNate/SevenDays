# SevenDays

Working title for a **Prankdom** app: a harmless horror-prank experience built around anticipation.

> **Prankdom — apps for friends. Or people you don't like.**

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