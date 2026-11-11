// Turns whatever an organizer pastes into a link attendees can open.
// Each returns null when the input can't be understood, so the UI can say so inline.

export function drivePreviewLink(input) {
    const raw = (input || "").trim();
    if (!raw) return null;
    const iframe = raw.match(/src="([^"]+)"/);
    const url = iframe ? iframe[1] : raw;
    if (/\/preview(\?|$)/.test(url)) return url;
    const id = url.match(/\/d\/([\w-]{10,})/)?.[1] || url.match(/[?&]id=([\w-]{10,})/)?.[1];
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
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
