import { internal } from "$lib/liveshare.svelte";

// VITE_API points a local build at a local backend.
export const API = import.meta.env.VITE_API || "https://api.jumbotron.hackclub.com";

// `state` mirrors the server's mergeState(): { code, role, root, members, incoming, outgoing }
export const org = $state({
    connected: false,
    state: null,
    lastReason: null,
    notice: "",
    error: ""        // set when merge state can't be loaded, so the panel never spins forever
});

// The big screen and demo time (participant screenshare), mirrored from the server's demoState():
// `board` shows announcements on the big screen; presenter is { id, name, live } or null, and
// `live` is false until they've picked a window.
export const demo = $state({
    enabled: false,
    board: true,
    screenCode: null,
    screenOpen: false,
    presenter: null
});

export function applyDemo(next) {
    if (next) Object.assign(demo, next);
}

const nameOf = (e) => (e && e.name) || "Another organizer";
// `|| []` rather than default params: callers pass `prev && prev.x`, which is null (not
// undefined) before the first state arrives, and defaults only apply to undefined.
const newIn = (now, before) => (now || []).find(x => !(before || []).some(y => y.code === x.code));
const goneFrom = (now, before) => (before || []).find(x => !(now || []).some(y => y.code === x.code));

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

// Nothing may leave the UI waiting forever: every request gives up after REQUEST_TIMEOUT, a
// stream that hasn't opened by then is retried, and RESYNC_INTERVAL re-reads the state over
// plain HTTP in case the stream silently died (sleep, network change) or a proxy holds it back.
const REQUEST_TIMEOUT = 15000;
const RESYNC_INTERVAL = 20000;

let stream = null;
let retryTimer = null;
let openTimer = null;
let resyncTimer = null;
let handlers = { onSignOut: () => {}, onEvent: () => {} };

let attempt = 0;                 // bumped per stream (re)connect so stale async attempts bail out
let session = 0;                 // bumped on connect/disconnect only: outlives stream reconnects

// POSTs the credentials (never in the URL) plus `body`. Resolves with { res, data } for any
// HTTP answer; rejects with a sentence for the user when there is no answer in time.
export async function request(path, body = {}) {
    let res;
    try {
        res = await fetch(`${API}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: internal.code, password: internal.password, ...body }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT)
        });
    } catch (e) {
        throw new Error(e && e.name === "TimeoutError"
            ? "The server took too long to respond. Please try again."
            : "Couldn't reach the server. Check your connection and try again.");
    }
    let data = {};
    try {
        data = await res.json();
    } catch (e) {}
    return { res, data };
}

// Single entry point for new merge state. `reason` is the stream's reason; null for state we
// fetched ourselves (POST answers, resyncs), which is never announced.
function applyState(next, reason) {
    const previous = $state.snapshot(org.state);
    org.state = next;
    org.lastReason = reason;
    org.error = "";
    internal.sources = next.members.map(m => m.slack);
    // Identical state means our own POST already applied this change: nothing to announce.
    const changed = JSON.stringify(previous) !== JSON.stringify(next);
    if (reason && reason !== "connected" && changed) {
        showNotice(describeMergeEvent(reason, next, previous));
        handlers.onEvent(reason, next, previous);
    }
}

function signOutNow() {
    disconnectOrgStream();
    handlers.onSignOut();
}

function scheduleReconnect(delay = 5000) {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(openStream, delay);
}

function closeStream() {
    clearTimeout(openTimer);
    if (stream) stream.close();
    stream = null;
    org.connected = false;
}

// EventSource can't send a body or headers, so the password never goes in its URL: each
// connection first trades the credentials (POST body) for a single-use ticket that expires in
// seconds. That POST doubles as the credential check: 401 means signed out for good.
// A used ticket can't be replayed, so the browser's built-in auto-reconnect is useless here;
// every drop is handled by closing and reconnecting with a fresh ticket.
async function openStream() {
    closeStream();
    const mine = ++attempt;
    let ticket;
    try {
        const { res, data } = await request("/streamTicket");
        if (mine !== attempt) return;
        if (res.status === 401) return signOutNow();
        if (!res.ok || !data.ticket) throw new Error(data.error || `HTTP ${res.status}`);
        ticket = data.ticket;
    } catch (e) {
        if (mine === attempt) scheduleReconnect();
        return;
    }
    if (mine !== attempt) return;
    const es = new EventSource(`${API}/orgStream?ticket=${encodeURIComponent(ticket)}`);
    stream = es;

    // A connection that neither opens nor fails (held by a proxy) would otherwise sit forever.
    openTimer = setTimeout(() => {
        if (mine === attempt && !org.connected) {
            closeStream();
            scheduleReconnect(1000);
        }
    }, REQUEST_TIMEOUT);

    // Events from a stream we've already replaced are ignored: some EventSource implementations
    // still fire onerror after close(), which would otherwise reschedule the live reconnect.
    es.onopen = () => {
        if (es !== stream) return;
        clearTimeout(openTimer);
        org.connected = true;
    };

    es.onmessage = (event) => {
        if (es !== stream) return;
        let msg;
        try {
            msg = JSON.parse(event.data);
        } catch (e) {
            return;
        }

        if (msg.type === "state") {
            applyState(msg.state, msg.reason);
        } else if (msg.type === "demo") {
            applyDemo(msg.demo);
        } else if (msg.type === "revoked") {
            signOutNow();
        } else if (msg.type === "reset") {
            // Admin replaced the events database; our code may no longer exist. The ticket
            // request on reconnect tells us (401 -> sign out).
            closeStream();
            scheduleReconnect(1000);
        }
    };

    es.onerror = () => {
        if (es !== stream) return;
        closeStream();
        scheduleReconnect();
    };
}

// Reads the state over plain HTTP. Loads the panel without waiting for the stream, and
// periodically checks the stream hasn't missed anything; if it has, the stream is replaced.
async function resync() {
    const mine = session;
    try {
        const { res, data } = await request("/mergeState");
        if (mine !== session) return;
        if (res.status === 401) return signOutNow();
        if (!res.ok || !data.role) throw new Error(data.error || "Couldn't load merge status.");
        const missed = org.state !== null &&
            JSON.stringify($state.snapshot(org.state)) !== JSON.stringify(data);
        applyState(data, null);
        if (missed && org.connected) openStream();
    } catch (e) {
        if (mine === session && !org.state) org.error = e.message;
    }
}

export function connectOrgStream(options = {}) {
    handlers = { ...handlers, ...options };
    if (!internal.code || !internal.password) return;
    session++;
    openStream();
    resync();
    clearInterval(resyncTimer);
    resyncTimer = setInterval(resync, RESYNC_INTERVAL);
}

export function disconnectOrgStream() {
    attempt++;
    session++;
    clearTimeout(retryTimer);
    clearInterval(resyncTimer);
    closeStream();
}

async function post(path, body = {}) {
    const { res, data } = await request(path, body);
    if (!res.ok) {
        throw new Error(data.error || "Request failed");
    }
    // Every merge endpoint answers with the caller's fresh state; apply it immediately so the
    // UI doesn't wait for the stream echo.
    if (data && data.role) applyState(data, null);
    return data;
}

export const sendMergeRequest = (destination) => post("/mergeRequest", { destination });
export const cancelMergeRequest = () => post("/cancelMergeRequest");
export const respondMergeRequest = (requester, accept) => post("/respondMergeRequest", { requester, accept });
export const removeMember = (target) => post("/unmerge", { target });
export const leaveMerge = () => post("/unmerge");

async function demoPost(path, body) {
    const data = await post(path, body);
    applyDemo(data.demo);
    return data;
}

export const setDemos = (enabled) => demoPost("/demoSet", { enabled });
export const setBoard = (board) => demoPost("/demoSet", { board });
export const stopPresenter = () => demoPost("/demoStop");
