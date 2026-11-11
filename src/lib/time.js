// Clock helpers shared by the organizer console and the attendee portal.
// Event times are stored as "HH:MM" (24h) in `at`, plus a display label in `time`
// for older clients that only read the label.

export function parseClock(text) {
    if (!text) return null;
    const match = String(text).trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/);
    if (!match) return null;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (match[3]) {
        const pm = match[3].toLowerCase() === "pm";
        if (hours === 12) hours = pm ? 12 : 0;
        else if (pm) hours += 12;
    }
    if (hours > 23 || minutes > 59) return null;
    return { h: hours, m: minutes };
}

export function toAt(clock) {
    if (!clock) return "";
    return `${String(clock.h).padStart(2, "0")}:${String(clock.m).padStart(2, "0")}`;
}

export function formatClock(at, hour12) {
    const clock = parseClock(at);
    if (!clock) return "";
    if (!hour12) return toAt(clock);
    const suffix = clock.h >= 12 ? "PM" : "AM";
    const h = clock.h % 12 === 0 ? 12 : clock.h % 12;
    return `${h}:${String(clock.m).padStart(2, "0")} ${suffix}`;
}

// "in 25 min", "starting now", "started 10 min ago"
export function relativeToNow(at, now = new Date()) {
    const clock = parseClock(at);
    if (!clock) return "";
    const target = new Date(now);
    target.setHours(clock.h, clock.m, 0, 0);
    const diff = Math.round((target.getTime() - now.getTime()) / 60000);
    if (diff > 0) {
        if (diff < 60) return `in ${diff} min`;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return m ? `in ${h} h ${m} min` : `in ${h} h`;
    }
    if (diff >= -5) return "starting now";
    const ago = -diff;
    return ago < 60 ? `started ${ago} min ago` : "earlier today";
}

export function prefersHour12() {
    try {
        const cycle = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle;
        return cycle === "h12" || cycle === "h11";
    } catch {
        return true;
    }
}

// "12s ago", "3 min ago"
export function agoLabel(timestamp, now = Date.now()) {
    if (!timestamp) return "";
    const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    return `${Math.round(minutes / 60)} h ago`;
}
