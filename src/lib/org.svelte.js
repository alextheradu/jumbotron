import { internal } from "$lib/liveshare.svelte";

export const API = "https://api.jumbotron.hackclub.com";

// `state` mirrors the server's mergeState(): { code, role, root, members, incoming, outgoing }
export const org = $state({
    connected: false,
    state: null,
    lastReason: null,
    notice: ""
});

const nameOf = (e) => (e && e.name) || "Another organizer";
const newIn = (now = [], before = []) => now.find(x => !before.some(y => y.code === x.code));
const goneFrom = (now = [], before = []) => before.find(x => !now.some(y => y.code === x.code));

// Turns a pushed merge event into a sentence for this organizer, or "" when the change was
// caused by this organizer's own click (the panel already reflects it).
export function describeMergeEvent(reason, state, prev) {
    const wasBridged = prev && prev.role === "bridged";
    switch (reason) {
        case "request_received":
            return `${nameOf(newIn(state.incoming, prev && prev.incoming))} wants to merge into your event.`;
        case "request_rejected":
            return prev && prev.outgoing && !state.outgoing ? `${nameOf(prev.outgoing)} declined your merge request.` : "";
        case "request_cancelled": {
            // Judge by what vanished from *incoming*: the canceller's own echo changes only its outgoing.
            const gone = goneFrom(state.incoming, prev && prev.incoming);
            return gone ? `${nameOf(gone)} withdrew their merge request.` : "";
        }
        case "target_merged_elsewhere":
            return prev && prev.outgoing && !state.outgoing
                ? `${nameOf(prev.outgoing)}'s event merged into another event, so your request was cancelled.`
                : "";
        case "outgoing_cancelled":
            return "Your outgoing merge request was cancelled because you accepted another event.";
        case "merged":
            if (state.role === "bridged" && !wasBridged) {
                return `You're now merged into ${nameOf(state.root)}'s event. Your participants see the shared screen.`;
            }
            return state.role === "root" ? `${nameOf(newIn(state.members, prev && prev.members))} merged into your event.` : "";
        case "member_left":
            return wasBridged ? "" : `${nameOf(goneFrom(state.members, prev && prev.members))} left your merged event.`;
        case "member_removed":
            return wasBridged && state.role === "root" ? `${nameOf(prev.root)} removed your event from their merge.` : "";
        case "host_removed":
            return "The event you were merged into was removed by an administrator. Your event is standalone again.";
        case "target_unavailable":
            return "A merge request was removed because the other event is no longer available.";
        default:
            return "";
    }
}

let noticeTimer = null;
function showNotice(text) {
    if (!text) return;
    org.notice = text;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { org.notice = ""; }, 8000);
}

let stream = null;
let retryTimer = null;
let handlers = { onSignOut: () => {}, onEvent: () => {} };

function credsQuery() {
    return `code=${encodeURIComponent(internal.code)}&password=${encodeURIComponent(internal.password)}`;
}

function scheduleReconnect(delay = 5000) {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(recheckAndReconnect, delay);
}

// EventSource gives no status code on failure, so ask a plain endpoint whether the
// credentials are still good before reopening the stream.
async function recheckAndReconnect() {
    try {
        const res = await fetch(`${API}/mergeState?${credsQuery()}`);
        if (res.status === 401) {
            disconnectOrgStream();
            handlers.onSignOut();
            return;
        }
        if (res.ok) {
            org.state = await res.json();
        }
    } catch (e) {
        scheduleReconnect();
        return;
    }
    openStream();
}

function openStream() {
    if (stream) stream.close();
    stream = new EventSource(`${API}/orgStream?${credsQuery()}`);

    stream.onopen = () => {
        org.connected = true;
    };

    stream.onmessage = (event) => {
        let msg;
        try {
            msg = JSON.parse(event.data);
        } catch (e) {
            return;
        }

        if (msg.type === "state") {
            const previous = $state.snapshot(org.state);
            org.state = msg.state;
            org.lastReason = msg.reason;
            internal.sources = msg.state.members.map(m => m.slack);
            // Identical state means our own POST already applied this change: nothing to announce.
            const changed = JSON.stringify(previous) !== JSON.stringify(msg.state);
            if (msg.reason !== "connected" && changed) {
                showNotice(describeMergeEvent(msg.reason, msg.state, previous));
                handlers.onEvent(msg.reason, msg.state, previous);
            }
        } else if (msg.type === "revoked") {
            disconnectOrgStream();
            handlers.onSignOut();
        } else if (msg.type === "reset") {
            // Admin replaced the events database; our code may no longer exist.
            org.connected = false;
            stream.close();
            stream = null;
            scheduleReconnect(1000);
        }
    };

    stream.onerror = () => {
        org.connected = false;
        // CONNECTING means the browser is already retrying a dropped connection itself.
        if (stream && stream.readyState === EventSource.CLOSED) {
            stream = null;
            scheduleReconnect();
        }
    };
}

export function connectOrgStream(options = {}) {
    handlers = { ...handlers, ...options };
    if (!internal.code || !internal.password) return;
    openStream();
}

export function disconnectOrgStream() {
    clearTimeout(retryTimer);
    if (stream) stream.close();
    stream = null;
    org.connected = false;
}

async function post(path, body = {}) {
    const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: internal.code, password: internal.password, ...body })
    });
    let data = {};
    try {
        data = await res.json();
    } catch (e) {}
    if (!res.ok) {
        throw new Error(data.error || "Request failed");
    }
    // Every merge endpoint answers with the caller's fresh state; apply it immediately so the
    // UI doesn't wait for the stream echo.
    if (data && data.role) {
        org.state = data;
        internal.sources = data.members.map(m => m.slack);
    }
    return data;
}

export const sendMergeRequest = (destination) => post("/mergeRequest", { destination });
export const cancelMergeRequest = () => post("/cancelMergeRequest");
export const respondMergeRequest = (requester, accept) => post("/respondMergeRequest", { requester, accept });
export const removeMember = (target) => post("/unmerge", { target });
export const leaveMerge = () => post("/unmerge");
