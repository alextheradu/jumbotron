<script>
    import { slide } from "svelte/transition";
    import { liveshareData, syncStatus, publish, takeDown } from "$lib/liveshare.svelte.js";
    import { CONTENT, drafts, buildValue, draftError, rowStatus, isDirty } from "./drafts.svelte.js";
    import { formatClock, relativeToNow } from "$lib/time.js";

    let open = $state(null);

    const BADGE = {
        live: "Live",
        edited: "Unpublished edits",
        draft: "Draft"
    };

    let busy = $derived(syncStatus.state === "syncing");

    async function onPublish(key) {
        const value = buildValue(key);
        if (value) await publish(key, value);
    }
</script>

<section aria-labelledby="content-heading">
    <h2 id="content-heading">Content</h2>
    <p class="hint">Edit anything, then publish. Attendees see changes within a second.</p>

    <ul class="rows">
        {#each CONTENT as item (item.key)}
            {@const status = rowStatus(item.key)}
            {@const expanded = open === item.key}
            {@const error = draftError(item.key)}
            <li class:expanded>
                <button
                    class="row-head"
                    aria-expanded={expanded}
                    aria-controls="row-{item.key}"
                    onclick={() => (open = expanded ? null : item.key)}
                >
                    <span class="icon tile" class:live={status === "live" || status === "edited"} translate="no" aria-hidden="true">{item.icon}</span>
                    <span class="text">
                        <span class="label">{item.label}</span>
                        <span class="sub">{item.hint}</span>
                    </span>
                    {#if status}<span class="badge {status}">{BADGE[status]}</span>{/if}
                    <span class="icon chevron" translate="no" aria-hidden="true">expand_more</span>
                </button>

                {#if expanded}
                    <div class="row-body" id="row-{item.key}" transition:slide={{ duration: 240 }}>
                        {#if item.key === "announcement"}
                            <label class="field">
                                <span>Headline</span>
                                <input class="input" bind:value={drafts.announcement.title} placeholder="Lunch is ready" maxlength="120" />
                            </label>
                            <label class="field">
                                <span>Details <em>optional</em></span>
                                <textarea class="input" rows="3" bind:value={drafts.announcement.message} placeholder="Pizza in the main hall. Vegan options on the left table." maxlength="600"></textarea>
                            </label>
                            <p class="hint">Plain words work best with screen readers. Skip emoji and ASCII art.</p>

                        {:else if item.key === "event"}
                            <label class="field">
                                <span>What's happening</span>
                                <input class="input" bind:value={drafts.event.title} placeholder="Demo presentations" maxlength="120" />
                            </label>
                            <div class="time-row">
                                <label class="field">
                                    <span>Starts at</span>
                                    <input class="input time" type="time" bind:value={drafts.event.at} />
                                </label>
                                <fieldset class="segmented">
                                    <legend class="field-label">Show time as</legend>
                                    <div>
                                        <label><input type="radio" name="hour-format" value={true} bind:group={drafts.event.hour12} /><span>3:30 PM</span></label>
                                        <label><input type="radio" name="hour-format" value={false} bind:group={drafts.event.hour12} /><span>15:30</span></label>
                                    </div>
                                </fieldset>
                            </div>
                            {#if drafts.event.at}
                                <p class="hint">Attendees see <strong>{formatClock(drafts.event.at, drafts.event.hour12)}</strong>, with a countdown ({relativeToNow(drafts.event.at)}).</p>
                            {/if}

                        {:else if item.key === "file"}
                            <label class="field">
                                <span>Google Drive link</span>
                                <input class="input" type="url" bind:value={drafts.file} placeholder="https://docs.google.com/presentation/d/…" aria-invalid={!!error} />
                            </label>
                            <p class="hint">In Google Drive, open Share, set access to “Anyone with the link”, then Copy link. Attendees get a read-only preview without your speaker notes or comments.</p>

                        {:else if item.key === "youtube"}
                            <label class="field">
                                <span>YouTube link</span>
                                <input class="input" type="url" bind:value={drafts.youtube} placeholder="https://www.youtube.com/watch?v=…" aria-invalid={!!error} />
                            </label>

                        {:else if item.key === "website"}
                            <label class="field">
                                <span>Web address</span>
                                <input class="input" type="url" bind:value={drafts.website} placeholder="forms.hackclub.com/…" aria-invalid={!!error} />
                            </label>
                        {/if}

                        {#if error}<p class="error-text" role="alert">{error}</p>{/if}

                        <div class="actions">
                            {#if liveshareData[item.key]}
                                <button class="btn btn-primary" disabled={busy || !isDirty(item.key) || !buildValue(item.key)} onclick={() => onPublish(item.key)}>
                                    Update
                                </button>
                                <button class="btn btn-quiet danger" disabled={busy} onclick={() => takeDown(item.key, item.label)}>
                                    Take down
                                </button>
                            {:else}
                                <button class="btn btn-primary" disabled={busy || !buildValue(item.key)} onclick={() => onPublish(item.key)}>
                                    Publish
                                </button>
                            {/if}
                        </div>
                    </div>
                {/if}
            </li>
        {/each}
    </ul>
</section>

<style>
    h2 { font-size: 1.3rem; }
    .hint { margin-top: 4px; }

    .rows { list-style: none; margin: 14px 0 0; padding: 0; }
    li { border-top: 1px solid var(--line); }
    li:first-child { border-top: 0; }

    .row-head {
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
        padding: 14px 4px;
        border: 0;
        background: none;
        color: var(--ink);
        text-align: left;
        cursor: pointer;
        border-radius: var(--radius-s);
    }
    .row-head:hover .label { text-decoration: underline; text-underline-offset: 3px; }
    .tile {
        flex: none;
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border-radius: 11px;
        background: var(--surface-sunken);
        color: var(--ink-2);
        font-size: 1.3rem;
    }
    .tile.live { background: var(--live-wash); color: oklch(0.4 0.1 150); }
    .text { flex: 1; min-width: 0; display: grid; }
    .label { font-weight: 700; }
    .sub { color: var(--ink-3); font-size: 0.9rem; }
    .chevron { color: var(--ink-3); transition: transform var(--dur-2) var(--ease-out); }
    .expanded .chevron { transform: rotate(180deg); }

    .badge {
        flex: none;
        padding: 3px 10px;
        border-radius: var(--radius-pill);
        font-size: 0.78rem;
        font-weight: 700;
        white-space: nowrap;
    }
    .badge.live { background: var(--live-wash); color: oklch(0.38 0.1 150); }
    .badge.edited { background: var(--accent); color: var(--accent-ink); }
    .badge.draft { background: var(--surface-sunken); color: var(--ink-2); }

    .row-body { display: grid; gap: 14px; padding: 4px 4px 22px 58px; }
    em { font-style: normal; font-weight: 400; color: var(--ink-3); }

    .time-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: end; }
    .time { width: 11rem; font-family: var(--font-mono); }

    .segmented { border: 0; margin: 0; padding: 0; display: grid; gap: 6px; }
    .segmented legend { padding: 0; margin-bottom: 6px; }
    .segmented > div {
        display: inline-flex;
        padding: 3px;
        border-radius: var(--radius-s);
        background: var(--surface-sunken);
    }
    .segmented label { position: relative; cursor: pointer; }
    .segmented input { position: absolute; opacity: 0; inset: 0; cursor: pointer; }
    .segmented span {
        display: block;
        min-height: 38px;
        padding: 8px 14px;
        border-radius: 6px;
        font: 700 0.9rem/1.4 var(--font-mono);
        color: var(--ink-2);
        transition: background-color var(--dur-1) var(--ease-out);
    }
    .segmented input:checked + span { background: var(--surface); color: var(--ink); box-shadow: var(--shadow-1); }
    .segmented input:focus-visible + span { outline: 3px solid var(--focus); outline-offset: 1px; }

    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .danger { --btn-ink: var(--danger); }
    .danger:hover { --btn-bg: var(--danger-wash); }

    @media (max-width: 560px) {
        .row-body { padding-left: 4px; }
        .sub { display: none; }
    }
</style>
