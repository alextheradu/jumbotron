// Draft content for each console row. Drafts live outside the row components so a row can be
// collapsed without losing edits, and so the "Live now" strip and row badges can read them.

import { liveshareData } from "$lib/liveshare.svelte.js";
import { parseClock, toAt, formatClock, prefersHour12 } from "$lib/time.js";
import { drivePreviewLink, youtubeId, youtubeWatchUrl, normalizeUrl } from "$lib/links.js";

// `color` is the leaf color for that kind of content, shared by the console and attendee views.
export const CONTENT = [
    { key: "announcement", label: "Announcement", icon: "campaign", color: "var(--ember)", hint: "A short message at the top of every attendee's screen." },
    { key: "event", label: "Up next", icon: "schedule", color: "var(--amber)", hint: "The next thing on the schedule, with a live countdown." },
    { key: "file", label: "Slides or document", icon: "description", color: "var(--sky)", hint: "A Google Drive file attendees can read at their own pace." },
    { key: "youtube", label: "YouTube video", icon: "smart_display", color: "var(--berry)", hint: "A video attendees can open on their phone." },
    { key: "website", label: "Link", icon: "language", color: "var(--lichen)", hint: "A sign-up form, the schedule, a submission page." }
];

export const colorFor = (key) => CONTENT.find((c) => c.key === key)?.color ?? "var(--ember)";

export const labelFor = (key) => CONTENT.find((c) => c.key === key)?.label ?? key;

export const drafts = $state({
    announcement: { title: "", message: "" },
    event: { title: "", at: "", hour12: prefersHour12() },
    file: "",
    youtube: "",
    website: ""
});

export function hydrateDrafts() {
    const live = liveshareData;
    if (live.announcement) {
        drafts.announcement.title = live.announcement.title || "";
        drafts.announcement.message = live.announcement.message || "";
    }
    if (live.event) {
        drafts.event.title = live.event.title || "";
        drafts.event.at = live.event.at || toAt(parseClock(live.event.time));
        if (typeof live.event.hour12 === "boolean") drafts.event.hour12 = live.event.hour12;
        else if (/am|pm/i.test(live.event.time || "")) drafts.event.hour12 = true;
    }
    if (live.file) drafts.file = live.file;
    if (live.youtube) drafts.youtube = typeof live.youtube === "object" ? live.youtube.url : live.youtube;
    if (live.website) drafts.website = live.website;
}

// The value that would be published for this row, or null if the draft can't be published.
export function buildValue(key) {
    switch (key) {
        case "announcement": {
            const title = drafts.announcement.title.trim();
            const message = drafts.announcement.message.trim();
            return title || message ? { title, message } : null;
        }
        case "event": {
            const title = drafts.event.title.trim();
            if (!title || !parseClock(drafts.event.at)) return null;
            return { title, time: formatClock(drafts.event.at, drafts.event.hour12), at: drafts.event.at, hour12: drafts.event.hour12 };
        }
        case "file":
            return drivePreviewLink(drafts.file);
        case "youtube": {
            const id = youtubeId(drafts.youtube);
            return id ? { url: youtubeWatchUrl(id), embedUrl: `https://www.youtube.com/embed/${id}` } : null;
        }
        case "website":
            return normalizeUrl(drafts.website);
    }
    return null;
}

// Inline validation message, only once the organizer has typed something that doesn't work.
export function draftError(key) {
    switch (key) {
        case "event":
            return drafts.event.title.trim() && !parseClock(drafts.event.at) ? "Add a start time." : "";
        case "file":
            return drafts.file.trim() && !buildValue("file") ? "That doesn't look like a Google Drive or Docs link. Use Share, then Copy link." : "";
        case "youtube":
            return drafts.youtube.trim() && !buildValue("youtube") ? "That doesn't look like a YouTube video link." : "";
        case "website":
            return drafts.website.trim() && !buildValue("website") ? "That doesn't look like a web address." : "";
    }
    return "";
}

function comparable(key, value) {
    if (!value) return null;
    if (key === "event") return { title: value.title, time: value.time };
    if (key === "youtube") return typeof value === "object" ? value.url : value;
    return value;
}

// True when something is live and the draft differs from it.
export function isDirty(key) {
    if (!liveshareData[key]) return false;
    return JSON.stringify(comparable(key, buildValue(key))) !== JSON.stringify(comparable(key, liveshareData[key]));
}

export function hasDraft(key) {
    return buildValue(key) !== null;
}

// Status shown on each row: "live" | "edited" | "draft" | ""
export function rowStatus(key) {
    if (liveshareData[key]) return isDirty(key) ? "edited" : "live";
    return hasDraft(key) ? "draft" : "";
}

// One-line summary of a live item, for the "Live now" strip.
export function liveSummary(key) {
    const value = liveshareData[key];
    if (!value) return "";
    switch (key) {
        case "announcement": return value.title || value.message;
        case "event": return `${value.title} · ${value.time}`;
        case "file": return "Google Drive file";
        case "youtube": return typeof value === "object" ? value.url : value;
        case "website": return value.replace(/^https?:\/\//, "");
    }
    return "";
}
