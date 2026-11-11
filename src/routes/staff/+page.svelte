<script>
    import { resolve } from "$app/paths";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { eventName } from "$lib/event";
    import { internal, liveshareData } from "$lib/liveshare.svelte.js";
    import { hydrateDrafts } from "$lib/console/drafts.svelte.js";
    import { org, connectOrgStream, disconnectOrgStream } from "$lib/org.svelte.js";
    import { slide } from "svelte/transition";

    import Backdrop from "$lib/components/Backdrop.svelte";
    import Wordmark from "$lib/components/Wordmark.svelte";
    import AttendeeFeed from "$lib/components/AttendeeFeed.svelte";
    import SyncPill from "$lib/console/SyncPill.svelte";
    import ShareCard from "$lib/console/ShareCard.svelte";
    import SetupCard from "$lib/console/SetupCard.svelte";
    import LiveNow from "$lib/console/LiveNow.svelte";
    import ContentList from "$lib/console/ContentList.svelte";
    import AdminPanel from "$lib/console/AdminPanel.svelte";
    import Merge from "$lib/configs/merge.svelte";

    const API = "https://api.jumbotron.hackclub.com";

    let ready = $state(false);
    let isAdmin = $state(false);
    let view = $state("event"); // event | admin | merge
    let renaming = $state(false);
    let now = $state(new Date());

    onMount(() => {
        const clock = setInterval(() => (now = new Date()), 30000);
        init();
        return () => {
            clearInterval(clock);
            disconnectOrgStream();
        };
    });

    let incomingCount = $derived(org.state?.incoming?.length ?? 0);

    async function init() {
        let creds;
        try {
            creds = JSON.parse(localStorage.getItem("creds"));
        } catch {
            creds = null;
        }
        if (!Array.isArray(creds)) {
            window.location.replace(resolve("/"));
            return;
        }

        [internal.code, internal.slack, internal.name, internal.password] = creds;
        if (creds[4]) {
            try { internal.sources = JSON.parse(creds[4]); } catch { internal.sources = []; }
        }

        // Live merge state (requests, merges, removals, admin resets) for this organizer
        connectOrgStream({ onSignOut: signOut });

        // Always pull the live packet so the console reflects what attendees see right now.
        try {
            const response = await fetch(`${API}/getPacket?code=${encodeURIComponent(internal.code)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.cityName?.trim()) {
                    internal.cityName = data.cityName;
                    internal.initComplete = true;
                    localStorage.setItem("cityName", data.cityName);
                }
                let synced = null;
                try { synced = typeof data.data === "string" ? JSON.parse(data.data) : data.data; } catch {}
                if (synced) {
                    for (const key of ["announcement", "event", "file", "youtube", "website"]) {
                        liveshareData[key] = synced[key] || null;
                    }
                    hydrateDrafts();
                    internal.importedSync = true;
                }
            }
        } catch {
            // Offline: fall back to the name saved on this device.
        }
        if (!internal.initComplete && localStorage.getItem("cityName")) {
            internal.cityName = localStorage.getItem("cityName");
            internal.initComplete = true;
        }

        ready = true;

        try {
            const res = await fetch(`${API}/getAdmins`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: internal.code, password: internal.password })
            });
            const data = await res.json();
            isAdmin = Array.isArray(data.admins) && data.admins.includes(internal.slack);
        } catch {
            isAdmin = false;
        }
    }

    function signOut() {
        disconnectOrgStream();
        localStorage.removeItem("creds");
        localStorage.removeItem("cityName");
        window.location.replace(resolve("/"));
    }
</script>

<svelte:head>
    <title>Organizer console · Jumbotron</title>
</svelte:head>

<Backdrop trees={false} scrim={0.55} />

<div class="shell">
    <header class="topbar">
        <div class="brand">
            <Wordmark onArt size="s" />
            <span class="product">Organizer console</span>
        </div>
        <div class="tools">
            {#if internal.initComplete && view === "event"}<SyncPill />{/if}
            {#if isAdmin || internal.initComplete}
                <div class="view-switch" role="group" aria-label="Console view">
                    <button aria-pressed={view === "event"} onclick={() => (view = "event")}>Event</button>
                    {#if internal.initComplete}
                        <button aria-pressed={view === "merge"} onclick={() => (view = "merge")}>
                            Merge{#if incomingCount}<span class="count-badge" aria-label="{incomingCount} pending requests">{incomingCount}</span>{/if}
                        </button>
                    {/if}
                    {#if isAdmin}
                        <button aria-pressed={view === "admin"} onclick={() => (view = "admin")}>Admin</button>
                    {/if}
                </div>
            {/if}
            <div class="account">
                {#if internal.slack}
                    <img src="https://cachet.hackclub.com/users/{internal.slack}/r" alt="" width="32" height="32" />
                {/if}
                <span class="name">{internal.name ?? ""}</span>
                <button class="btn btn-small btn-on-art" onclick={signOut}>
                    <span class="icon" translate="no" aria-hidden="true">logout</span>Sign out
                </button>
            </div>
        </div>
    </header>

    {#if ready && (org.notice || (org.state?.role === "bridged" && view === "event"))}
        <div class="notices">
            {#if org.notice}
                <p class="notice" role="status" transition:slide={{ duration: 200 }}>{org.notice}</p>
            {/if}
            {#if org.state?.role === "bridged" && view === "event"}
                <p class="notice" transition:slide={{ duration: 200 }}>
                    Merged into <strong>{org.state.root.name}</strong>'s event (code <span class="mono">{org.state.root.code}</span>). What you publish goes to everyone in the merge.
                </p>
            {/if}
        </div>
    {/if}

    {#if !ready}
        <p class="loading" role="status" in:fade>Loading your event</p>
    {:else if view === "admin"}
        <main class="single" in:fade={{ duration: 150 }}>
            <div class="panel"><AdminPanel /></div>
        </main>
    {:else if view === "merge"}
        <main class="single" in:fade={{ duration: 150 }}>
            <div class="panel"><Merge /></div>
        </main>
    {:else}
        <h1 class="event-title">{eventName}{internal.initComplete ? ` ${internal.cityName}` : ""}</h1>

        <div class="layout" in:fade={{ duration: 150 }}>
            <main class="main">
                <div class="panel"><ShareCard /></div>

                {#if !internal.initComplete}
                    <div class="panel"><SetupCard /></div>
                {:else}
                    <div class="panel"><LiveNow /></div>
                    <div class="panel"><ContentList /></div>

                    <div class="panel settings">
                        {#if renaming}
                            <SetupCard oncancel={() => (renaming = false)} ondone={() => (renaming = false)} />
                        {:else}
                            <div class="setting-row">
                                <div>
                                    <span class="field-label">Event name</span>
                                    <p class="setting-value">{eventName} {internal.cityName}</p>
                                </div>
                                <button class="btn btn-small" onclick={() => (renaming = true)}>Rename</button>
                            </div>
                            <p class="hint">You can close this tab any time. Attendees keep seeing whatever is live.</p>
                        {/if}
                    </div>
                {/if}
            </main>

            {#if internal.initComplete}
                <aside class="preview" aria-label="Attendee preview">
                    <p class="preview-label">What attendees see</p>
                    <div class="device">
                        <p class="device-title">{eventName} {internal.cityName}</p>
                        <AttendeeFeed data={liveshareData} {now} compact />
                    </div>
                </aside>
            {/if}
        </div>
    {/if}
</div>

<style>
    .shell { min-height: 100dvh; padding: 0 16px 64px; }

    .topbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px 20px;
        max-width: 1180px;
        margin: 0 auto;
        padding: 16px 0;
        color: var(--on-art);
    }
    .brand { display: flex; align-items: baseline; gap: 12px; }
    .product { font-weight: 700; opacity: 0.85; }
    .tools { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }

    .view-switch {
        display: inline-flex;
        padding: 3px;
        border-radius: var(--radius-pill);
        background: oklch(0.2 0.05 25 / 0.45);
    }
    .view-switch button {
        min-height: 30px;
        padding: 0 14px;
        border: 0;
        border-radius: var(--radius-pill);
        background: none;
        color: var(--on-art);
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
    }
    .view-switch button[aria-pressed="true"] { background: var(--surface); color: var(--ink); }
    .count-badge {
        display: inline-grid;
        place-items: center;
        min-width: 18px;
        height: 18px;
        margin-left: 6px;
        padding: 0 5px;
        border-radius: var(--radius-pill);
        background: var(--accent);
        color: var(--accent-ink);
        font-size: 0.72rem;
    }

    .notices { display: grid; gap: 8px; max-width: 1180px; margin: 8px auto 0; }
    .notice {
        padding: 12px 16px;
        border-radius: var(--radius-m);
        background: var(--accent-wash);
        color: var(--ink);
        box-shadow: var(--shadow-1);
    }

    .account { display: flex; align-items: center; gap: 10px; }
    .account img { width: 32px; height: 32px; border-radius: 50%; background: var(--surface-sunken); }
    .name { font-weight: 700; }

    .event-title {
        max-width: 1180px;
        margin: 24px auto 28px;
        color: var(--on-art);
        font-family: var(--font-display);
        font-weight: 400;
        font-size: clamp(2.2rem, 5vw, 3.4rem);
        text-shadow: 0 2px 12px oklch(0.2 0.05 25 / 0.35);
    }

    .loading { margin-top: 30vh; text-align: center; color: var(--on-art); font-weight: 700; }

    .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: 24px;
        align-items: start;
        max-width: 1180px;
        margin: 0 auto;
    }
    .main, .single { display: grid; gap: 16px; }
    .single { max-width: 900px; margin: 24px auto 0; }

    .panel {
        padding: 28px;
        border-radius: var(--radius-l);
        background: var(--surface);
        box-shadow: var(--shadow-2);
    }

    .setting-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .setting-value { font-weight: 700; font-size: 1.1rem; margin-top: 2px; }
    .settings .hint { margin-top: 12px; }

    .preview { position: sticky; top: 16px; }
    .preview-label {
        margin-bottom: 10px;
        color: var(--on-art);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }
    .device {
        max-height: calc(100dvh - 80px);
        overflow: auto;
        padding: 18px 14px;
        border-radius: 32px;
        background: var(--bg);
        box-shadow: 0 0 0 8px oklch(0.22 0.04 25), var(--shadow-2);
    }
    .device-title {
        margin-bottom: 12px;
        text-align: center;
        font-family: var(--font-display);
        font-size: 1.35rem;
    }

    @media (max-width: 1000px) {
        .layout { grid-template-columns: 1fr; }
        .preview { position: static; }
        .device { max-width: 420px; max-height: none; }
    }
    @media (max-width: 560px) {
        .panel { padding: 20px 18px; }
        .name { display: none; }
        .product { display: none; }
    }
</style>
