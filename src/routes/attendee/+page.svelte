<script>
    import { resolve } from "$app/paths";
    import { goto } from "$app/navigation";
    import { eventName } from "$lib/event";
    import { onMount } from "svelte";
    import Backdrop from "$lib/components/Backdrop.svelte";
    import Wordmark from "$lib/components/Wordmark.svelte";
    import AttendeeFeed from "$lib/components/AttendeeFeed.svelte";
    import { labelFor } from "$lib/console/drafts.svelte.js";

    const KEYS = ["announcement", "event", "file", "youtube", "website"];

    let missing = $state(false);
    let cityName = $state("");
    let code = "";
    let connection = $state("connecting"); // connecting | live | reconnecting | offline
    let changed = $state([]);
    let announcement = $state(""); // screen-reader summary of what changed
    let now = $state(new Date());

    let liveshareData = $state({ announcement: null, event: null, file: null, youtube: null, website: null });

    let source = null;
    let changedTimer = null;

    function parsePacket(rawPacket, { quiet = false } = {}) {
        if (!rawPacket) return;
        let parsed;
        try {
            parsed = typeof rawPacket === "string" ? JSON.parse(rawPacket) : rawPacket;
        } catch {
            return;
        }
        if (!parsed) return;

        const updated = [];
        for (const key of KEYS) {
            const next = parsed[key] || null;
            if (JSON.stringify(next) !== JSON.stringify(liveshareData[key])) {
                if (next) updated.push(key);
                liveshareData[key] = next;
            }
        }

        if (!quiet && updated.length) {
            changed = updated;
            announcement = `${updated.map(labelFor).join(", ")} updated`;
            clearTimeout(changedTimer);
            changedTimer = setTimeout(() => (changed = []), 6000);
        }
    }

    function connect() {
        source?.close();
        connection = connection === "live" ? "reconnecting" : "connecting";
        source = new EventSource(`https://api.jumbotron.hackclub.com/getSession?code=${encodeURIComponent(code)}`, { withCredentials: true });

        source.onopen = () => (connection = "live");
        source.onerror = () => {
            connection = source.readyState === EventSource.CLOSED ? "offline" : "reconnecting";
        };
        source.onmessage = (event) => {
            connection = "live";
            try {
                const payload = JSON.parse(event.data);
                if (payload.cityName) cityName = payload.cityName;
                parsePacket(payload.data);
            } catch {
                // Ignore malformed messages; the next one will carry the full state.
            }
        };
    }

    onMount(() => {
        code = sessionStorage.getItem("eventCode") || "";
        if (!code) {
            missing = true;
            return;
        }

        try {
            const saved = JSON.parse(sessionStorage.getItem("eventPacket"));
            cityName = saved?.cityName || "";
            parsePacket(saved?.data, { quiet: true });
        } catch {
            // No cached packet; the stream will fill everything in.
        }

        connect();
        const clock = setInterval(() => (now = new Date()), 30000);

        return () => {
            source?.close();
            clearInterval(clock);
            clearTimeout(changedTimer);
        };
    });

    function leave() {
        sessionStorage.removeItem("eventCode");
        sessionStorage.removeItem("eventPacket");
        goto(resolve("/"));
    }

    const STATUS = {
        connecting: "Connecting",
        live: "Live",
        reconnecting: "Reconnecting",
        offline: "Offline"
    };
</script>

<svelte:head>
    <title>{eventName}{cityName ? ` ${cityName}` : ""} · Jumbotron</title>
</svelte:head>

<Backdrop trees={false} scrim={0.35} />

<div class="page">
    <header>
        <div class="topbar">
            <button class="btn btn-quiet back" onclick={leave}>
                <span class="icon" translate="no" aria-hidden="true">arrow_back</span>
                Leave
            </button>
            <Wordmark onArt size="s" />
            {#if !missing}
                <span class="status {connection}" role="status">
                    <span class="dot" aria-hidden="true"></span>{STATUS[connection]}
                </span>
            {:else}
                <span></span>
            {/if}
        </div>
        <h1>{eventName}{cityName ? ` ${cityName}` : ""}</h1>
    </header>

    <main class="sheet">
        {#if missing}
            <div class="notice">
                <p class="notice-title">You're not in an event yet</p>
                <p>Enter the 4-digit code shown at your event to see announcements and links.</p>
                <a class="btn btn-primary" href={resolve("/")}>Enter a code</a>
            </div>
        {:else}
            {#if connection === "offline"}
                <div class="offline" role="alert">
                    <span class="icon" translate="no" aria-hidden="true">cloud_off</span>
                    <p>Lost connection. What you see may be out of date.</p>
                    <button class="btn btn-small btn-primary" onclick={connect}>Reconnect</button>
                </div>
            {/if}

            <p class="sr-only" aria-live="polite">{announcement}</p>

            <AttendeeFeed
                data={liveshareData}
                {changed}
                {now}
                emptyText={cityName ? "" : "Your organizers haven't started this event yet. This page updates on its own."}
            />
        {/if}
    </main>
</div>

<style>
    .page { min-height: 100dvh; display: grid; grid-template-rows: auto 1fr; }

    header { padding: 16px 16px 28px; color: var(--on-art); text-align: center; }
    .topbar {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        max-width: 720px;
        margin: 0 auto;
    }
    .back { --btn-ink: var(--on-art); justify-self: start; padding-left: 4px; }
    .back:hover { --btn-bg: oklch(1 0 0 / 0.12); }
    h1 {
        margin-top: 24px;
        font-family: var(--font-display);
        font-weight: 400;
        font-size: clamp(2rem, 8vw, 3rem);
        text-shadow: 0 2px 12px oklch(0.2 0.05 25 / 0.35);
        text-wrap: balance;
    }

    .status {
        justify-self: end;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: var(--radius-pill);
        background: oklch(0.2 0.05 25 / 0.45);
        font-size: 0.85rem;
        font-weight: 700;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ink-3); }
    .status.live .dot { background: oklch(0.78 0.17 150); animation: breathe 2.4s ease-in-out infinite; }
    .status.reconnecting .dot, .status.connecting .dot { background: var(--accent); }
    .status.offline .dot { background: oklch(0.7 0.18 27); }
    @keyframes breathe { 50% { opacity: 0.45; } }

    .sheet {
        width: 100%;
        max-width: 720px;
        margin: 0 auto;
        padding: 20px 16px 48px;
        border-radius: var(--radius-l) var(--radius-l) 0 0;
        background: var(--bg);
        box-shadow: 0 -8px 32px oklch(0.2 0.05 25 / 0.25);
    }

    .offline {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        padding: 10px 14px;
        border-radius: var(--radius-m);
        background: var(--danger-wash);
    }
    .offline p { flex: 1; }
    .offline .icon { color: var(--danger); }

    .notice { display: grid; justify-items: center; gap: 10px; padding: 40px 8px; text-align: center; }
    .notice-title { font-family: var(--font-display); font-size: 1.5rem; }
    .notice p { color: var(--ink-2); max-width: 40ch; }
    .notice .btn { margin-top: 8px; }

    @media (max-width: 420px) {
        .topbar :global(.wordmark) { font-size: 1.1rem; }
    }
</style>
