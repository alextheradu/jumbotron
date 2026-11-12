import { resolve } from "$app/paths";
import { API } from "$lib/api.js";

export const internal = $state({
    initComplete: false,
    code: null,
    slack: null,
    name: null,
    password: null,
    cityName: "",
    importedSync: false
})

// Kept for older components (merge panel) that still read these flags.
export const sync = $state({
    announcements: false,
    slides: false
})

export const liveshareData = $state({
    timestamp: Date.now()
});

// Real sync status, driven by the result of each request to the backend.
// state: "idle" | "syncing" | "ok" | "error"
export const syncStatus = $state({
    state: "idle",
    lastSynced: null,
    message: ""
});

// Last item taken down, so the organizer can undo it.
export const undoState = $state({
    key: null,
    value: null,
    label: ""
});

const LIVE_KEYS = ["announcement", "event", "file", "youtube", "website"];

export function liveItems() {
    return LIVE_KEYS.filter((key) => liveshareData[key]);
}

export async function updateAPI() {
    if (!internal.initComplete) return false;

    liveshareData.timestamp = Date.now();
    syncStatus.state = "syncing";
    syncStatus.message = "";

    try {
        const response = await fetch(`${API}/sendPacket`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: internal.code,
                password: internal.password,
                packet: JSON.stringify(liveshareData)
            })
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            if (data.error == "Banned user") {
                window.location.replace(resolve("/"));
                return false;
            }
            syncStatus.state = "error";
            syncStatus.message = data.error || "Couldn't reach attendees. Your change is saved here; try publishing again.";
            return false;
        }

        syncStatus.state = "ok";
        syncStatus.lastSynced = Date.now();
        return true;
    } catch {
        syncStatus.state = "error";
        syncStatus.message = "You're offline or the server is unreachable. Try publishing again.";
        return false;
    }
}

export async function publish(key, value) {
    liveshareData[key] = value;
    if (undoState.key === key) clearUndo();
    return updateAPI();
}

export async function takeDown(key, label) {
    if (!liveshareData[key]) return;
    undoState.key = key;
    undoState.value = $state.snapshot(liveshareData[key]);
    undoState.label = label;
    liveshareData[key] = null;
    return updateAPI();
}

export async function undoTakeDown() {
    if (!undoState.key) return;
    const { key, value } = undoState;
    clearUndo();
    return publish(key, value);
}

export function clearUndo() {
    undoState.key = null;
    undoState.value = null;
    undoState.label = "";
}
