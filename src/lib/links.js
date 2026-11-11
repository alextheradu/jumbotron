// Turns whatever an organizer pastes into a link attendees can open.
// Each returns null when the input can't be understood, so the UI can say so inline.

// Always rebuilt from the file ID, so whatever was pasted never reaches attendees verbatim.
export function drivePreviewLink(input) {
    const raw = (input || "").trim();
    if (!raw) return null;
    const iframe = raw.match(/src="([^"]+)"/);
    let url;
    try {
        url = new URL(iframe ? iframe[1] : raw);
    } catch {
        return null;
    }
    if (url.protocol !== "https:" || !/^(drive|docs)\.google\.com$/.test(url.hostname)) return null;
    const id = url.pathname.match(/\/d\/([\w-]{10,})/)?.[1] || url.searchParams.get("id");
    return id && /^[\w-]{10,}$/.test(id) ? `https://drive.google.com/file/d/${id}/preview` : null;
}

export function youtubeWatchUrl(id) {
    return `https://www.youtube.com/watch?v=${id}`;
}

// Last line of defense on the attendee side: packets can be sent straight to the API, so
// never render a link that isn't plain http(s).
export function safeHref(value) {
    try {
        const url = new URL(String(value));
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch {
        return null;
    }
}

export function youtubeId(input) {
    const match = (input || "").trim().match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/|\/v\/)([\w-]{11})/);
    return match ? match[1] : null;
}

export function normalizeUrl(input) {
    let raw = (input || "").trim();
    if (!raw) return null;
    if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
    try {
        const url = new URL(raw);
        return url.hostname.includes(".") ? url.href : null;
    } catch {
        return null;
    }
}
