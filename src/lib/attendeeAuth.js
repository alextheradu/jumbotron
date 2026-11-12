// Hack Club sign-in for presenters (demo time). Shares /callback with organizer sign-in: the
// OAuth `state` starts with "demo." for this flow, so the callback page knows which one it is.
import { API } from "$lib/org.svelte.js";

const CLIENT_ID = "e86d4d7eec9c546e6c4700388d4fea7f";
const REDIRECT = "https://jumbotron.hackclub.com/callback";
const SESSION_KEY = "demoSession";
const STATE_KEY = "demoAuthState";
// Set before leaving for Hack Club, so the attendee page reopens the share card on return.
export const RESUME_KEY = "demoResume";

function read(storage, key) {
    try { return JSON.parse(storage.getItem(key)); } catch { return null; }
}

// { session, name, slack, expires } or null when signed out or expired.
export function attendeeSession() {
    const s = read(localStorage, SESSION_KEY);
    return s && s.session && s.expires > Date.now() ? s : null;
}

export function signOutAttendee() {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
}

export function startAttendeeSignIn() {
    const state = `demo.${crypto.randomUUID()}`;
    try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
        sessionStorage.setItem(RESUME_KEY, "1");
    } catch {}
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT,
        response_type: "code",
        scope: "name slack_id",
        state
    });
    window.location.assign(`https://auth.hackclub.com/oauth/authorize?${params}`);
}

export const isAttendeeState = (state) => typeof state === "string" && state.startsWith("demo.");

// Finishes sign-in on /callback. Resolves with the session; rejects with a sentence for the user.
export async function finishAttendeeSignIn(authCode, state) {
    const expected = read(sessionStorage, STATE_KEY);
    try { sessionStorage.removeItem(STATE_KEY); } catch {}
    if (!expected || expected !== state) {
        throw new Error("This sign-in link expired. Go back and tap Share my screen again.");
    }
    let response;
    try {
        response = await fetch(`${API}/attendeeAuth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: authCode }),
            signal: AbortSignal.timeout(15000)
        });
    } catch {
        throw new Error("Can't reach Jumbotron right now. Check your connection and try again.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.session) {
        throw new Error(data.error ? `Hack Club Auth said: ${data.error}` : "We couldn't finish signing you in.");
    }
    const session = { session: data.session, name: data.name, slack: data.slack, expires: data.expires };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
    return session;
}
