<script>
    // What attendees see. Used by the attendee portal and by the live preview in the console.
    import { resolve } from "$app/paths";
    import { eventTheme } from "$lib/event.js";
    import { relativeToNow, parseClock, toAt } from "$lib/time.js";

    let { data, changed = [], now = new Date(), compact = false, emptyText = "" } = $props();

    const youtubeUrl = (yt) => (typeof yt === "object" && yt ? yt.url : yt);
    const eventAt = (ev) => ev.at || toAt(parseClock(ev.time));
    const host = (url) => {
        try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
    };

    let isEmpty = $derived(!data.announcement && !data.event && !data.file && !data.youtube && !data.website);
</script>

<div class="feed" class:compact>
    {#if isEmpty}
        <div class="empty">
            <img src={resolve(eventTheme.mascot)} alt="" />
            <p class="empty-title">Nothing on screen yet</p>
            <p class="empty-body">{emptyText || "Your organizers will post announcements and links here. This page updates on its own."}</p>
        </div>
    {/if}

    {#if data.announcement}
        <section class="item announcement" class:changed={changed.includes("announcement")} aria-labelledby="ann-title">
            <p class="kicker"><span class="icon" translate="no" aria-hidden="true">campaign</span> Announcement
                {#if changed.includes("announcement")}<span class="new">Updated</span>{/if}</p>
            {#if data.announcement.title}<h2 id="ann-title">{data.announcement.title}</h2>{/if}
            {#if data.announcement.message}<p class="body">{data.announcement.message}</p>{/if}
        </section>
    {/if}

    {#if data.event}
        {@const rel = relativeToNow(eventAt(data.event), now)}
        <section class="item" class:changed={changed.includes("event")}>
            <p class="kicker"><span class="icon" translate="no" aria-hidden="true">schedule</span> Up next
                {#if changed.includes("event")}<span class="new">Updated</span>{/if}</p>
            <h2>{data.event.title}</h2>
            <p class="when"><span class="mono">{data.event.time}</span>{#if rel}<span class="rel">{rel}</span>{/if}</p>
        </section>
    {/if}

    {#if data.file}
        <a class="item link" class:changed={changed.includes("file")} href={data.file} target="_blank" rel="noopener noreferrer">
            <span class="icon big" translate="no" aria-hidden="true">description</span>
            <span class="link-text">
                <span class="link-title">Slides and documents</span>
                <span class="link-sub">Read at your own pace</span>
            </span>
            <span class="icon" translate="no" aria-hidden="true">open_in_new</span>
        </a>
    {/if}

    {#if data.youtube}
        <a class="item link" class:changed={changed.includes("youtube")} href={youtubeUrl(data.youtube)} target="_blank" rel="noopener noreferrer">
            <span class="icon big" translate="no" aria-hidden="true">smart_display</span>
            <span class="link-text">
                <span class="link-title">Watch the video</span>
                <span class="link-sub">Opens on YouTube</span>
            </span>
            <span class="icon" translate="no" aria-hidden="true">open_in_new</span>
        </a>
    {/if}

    {#if data.website}
        <a class="item link" class:changed={changed.includes("website")} href={data.website} target="_blank" rel="noopener noreferrer">
            <span class="icon big" translate="no" aria-hidden="true">language</span>
            <span class="link-text">
                <span class="link-title">Open link</span>
                <span class="link-sub">{host(data.website)}</span>
            </span>
            <span class="icon" translate="no" aria-hidden="true">open_in_new</span>
        </a>
    {/if}
</div>

<style>
    .feed { display: grid; gap: 12px; }

    .item {
        display: block;
        padding: 18px 20px;
        border-radius: var(--radius-m);
        background: var(--surface);
        box-shadow: var(--shadow-1);
        color: var(--ink);
        text-decoration: none;
        transition: box-shadow var(--dur-2) var(--ease-out), transform var(--dur-1) var(--ease-out);
    }
    .item.changed { animation: arrive 1.6s var(--ease-out); }
    @keyframes arrive {
        0% { box-shadow: 0 0 0 4px var(--accent), var(--shadow-1); transform: translateY(-4px); }
        100% { box-shadow: 0 0 0 0 var(--accent), var(--shadow-1); transform: none; }
    }

    .announcement { background: var(--accent-wash); }

    .kicker {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--ink-2);
    }
    .kicker .icon { font-size: 1.1rem; }
    .new {
        margin-left: auto;
        padding: 2px 8px;
        border-radius: var(--radius-pill);
        background: var(--accent);
        color: var(--accent-ink);
        font-size: 0.7rem;
        letter-spacing: 0.02em;
    }

    h2 { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.01em; text-wrap: balance; }
    .body { margin-top: 6px; font-size: 1.05rem; color: var(--ink-2); max-width: 65ch; white-space: pre-line; }

    .when { margin-top: 6px; display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; }
    .when .mono { font-size: 1.05rem; font-weight: 700; }
    .rel {
        padding: 2px 10px;
        border-radius: var(--radius-pill);
        background: var(--live-wash);
        color: oklch(0.38 0.1 150);
        font-weight: 700;
        font-size: 0.85rem;
    }

    .link { display: flex; align-items: center; gap: 14px; }
    .link:hover { box-shadow: var(--shadow-2); }
    .link:active { transform: scale(0.99); }
    .icon.big {
        font-size: 1.6rem;
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: var(--surface-sunken);
        color: var(--ink-2);
    }
    .link-text { flex: 1; display: grid; gap: 2px; min-width: 0; }
    .link-title { font-weight: 800; font-size: 1.05rem; }
    .link-sub { color: var(--ink-3); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .empty { text-align: center; padding: 36px 16px 28px; }
    .empty img { height: 72px; margin-bottom: 10px; }
    .empty-title { font-family: var(--font-display); font-size: 1.4rem; }
    .empty-body { margin: 6px auto 0; color: var(--ink-2); max-width: 36ch; }

    .compact .item { padding: 12px 14px; }
    .compact h2 { font-size: 1.1rem; }
    .compact .body { font-size: 0.92rem; }
    .compact .icon.big { width: 34px; height: 34px; font-size: 1.3rem; }
    .compact .link-title { font-size: 0.95rem; }
    .compact .empty { padding: 20px 8px; }
    .compact .empty img { height: 52px; }
    .compact .empty-title { font-size: 1.15rem; }
    .compact .empty-body { font-size: 0.88rem; }
</style>
