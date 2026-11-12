// Demo time presenters just type a name; there is no sign-in. The name is remembered on this
// device so they don't retype it, and the organizer queue shows it as typed (unverified).
const NAME_KEY = "demoName";
export const MAX_NAME = 40;

export function savedName() {
    try { return localStorage.getItem(NAME_KEY) || ""; } catch { return ""; }
}

export function saveName(name) {
    try { localStorage.setItem(NAME_KEY, name); } catch {}
}

// Collapses whitespace and trims; empty string means unusable.
export const cleanName = (raw) => String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);

// A random id this browser keeps, so reloading doesn't add a second entry to the queue.
export function deviceId() {
    try {
        let id = localStorage.getItem("demoDevice");
        if (!id) localStorage.setItem("demoDevice", (id = crypto.randomUUID()));
        return id;
    } catch {
        return crypto.randomUUID();
    }
}
