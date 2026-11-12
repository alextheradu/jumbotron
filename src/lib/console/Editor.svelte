<script>
    // Middle pane of the console: edit one kind of content, then publish it.
    import { liveshareData, syncStatus, publish, takeDown } from "$lib/liveshare.svelte.js";
    import { CONTENT, drafts, buildValue, draftError, rowStatus, isDirty } from "./drafts.svelte.js";
    import { formatClock, relativeToNow } from "$lib/time.js";

    let { key } = $props();

    let item = $derived(CONTENT.find((c) => c.key === key));
    let live = $derived(!!liveshareData[key]);
    let status = $derived(rowStatus(key));
    let error = $derived(draftError(key));
    let busy = $derived(syncStatus.state === "syncing");

    const STATUS = { live: "Showing now", edited: "Edited, not published", draft: "Not showing yet", "": "Not showing" };

    async function onPublish() {
        const value = buildValue(key);
        if (value) await publish(key, value);
    }
</script>

<section class="editor" style:--c={item.color} aria-labelledby="editor-heading">
    <header>
        <span class="swatch icon" class:live translate="no" aria-hidden="true">{item.icon}</span>
        <div class="titles">
            <h2 id="editor-heading">{item.label}</h2>
            <p class="hint">{item.hint}</p>
        </div>
        <span class="state {status}">{STATUS[status]}</span>
    </header>

    <div class="fields">
        {#if key === "announcement"}
            <label class="field">
                <span>Headline</span>
                <input class="input big" bind:value={drafts.announcement.title} placeholder="Lunch is ready" maxlength="120" />
            </label>
            <label class="field">
                <span>Details <em>optional</em></span>
                <textarea class="input" rows="4" bind:value={drafts.announcement.message} placeholder="Pizza in the main hall. Vegan options on the left table." maxlength="600"></textarea>
            </label>
            <p class="hint">Plain words work best with screen readers. Skip emoji and ASCII art.</p>

        {:else if key === "event"}
            <label class="field">
                <span>What's happening</span>
                <input class="input big" bind:value={drafts.event.title} placeholder="Demo presentations" maxlength="120" />
            </label>
            <div class="time-row">
                <label class="field">
                    <span>Starts at</span>
                    <input class="input time" type="time" bind:value={drafts.event.at} />
                </label>
                <fieldset class="segmented">
                    <legend class="field-label">Show time as {(drafts.event.hour12) ? "12-hour" : "24-hour"}</legend>
                    <div>
                        <label><input type="radio" name="hour-format" value={true} bind:group={drafts.event.hour12} /><span>{formatClock(drafts.event.at, true)}</span></label>
                        <label><input type="radio" name="hour-format" value={false} bind:group={drafts.event.hour12} /><span>{formatClock(drafts.event.at, false)}</span></label>
                    </div>
                </fieldset>
            </div>
            {#if drafts.event.at}
                <p class="hint">Attendees see <strong>{formatClock(drafts.event.at, drafts.event.hour12)}</strong> with a countdown ({relativeToNow(drafts.event.at)}).</p>
            {/if}

        {:else if key === "file"}
            <label class="field">
                <span>Google Drive link</span>
                <input class="input" type="url" bind:value={drafts.file} placeholder="https://docs.google.com/presentation/d/…" aria-invalid={!!error} />
            </label>
            <p class="hint">In Google Drive, open Share, set access to “Anyone with the link”, then Copy link. Attendees get a read-only preview without your speaker notes or comments.</p>

        {:else if key === "youtube"}
            <label class="field">
                <span>YouTube link</span>
                <input class="input" type="url" bind:value={drafts.youtube} placeholder="https://www.youtube.com/watch?v=…" aria-invalid={!!error} />
            </label>

        {:else if key === "website"}
            <label class="field">
                <span>Web address</span>
                <input class="input" type="url" bind:value={drafts.website} placeholder="forms.hackclub.com/…" aria-invalid={!!error} />
            </label>
        {/if}

        {#if error}<p class="error-text" role="alert">{error}</p>{/if}
    </div>

    <footer>
        {#if live}
            <button class="btn btn-primary" disabled={busy || !isDirty(key) || !buildValue(key)} onclick={onPublish}>Update</button>
            <button class="btn btn-destructive" disabled={busy} onclick={() => takeDown(key, item.label)}>Take down</button>
        {:else}
            <button class="btn btn-primary" disabled={busy || !buildValue(key)} onclick={onPublish}>Show to attendees</button>
        {/if}
    </footer>
</section>

<style>
    .editor { display: grid; gap: 24px; }

    header { display: flex; align-items: center; gap: 16px; }
    .swatch {
        flex: none;
        width: 52px;
        height: 52px;
        display: grid;
        place-items: center;
        border-radius: 15px;
        background: var(--surface-sunken);
        color: var(--c);
        font-size: 1.7rem;
    }
    .swatch.live { background: var(--c); color: var(--on-color); }
    .titles { flex: 1; min-width: 0; }
    h2 { font-size: 1.5rem; letter-spacing: -0.01em; }
    .titles .hint { margin-top: 2px; }

    .state {
        flex: none;
        padding: 4px 12px;
        border-radius: var(--radius-pill);
        background: var(--surface-sunken);
        color: var(--ink-3);
        font-size: 0.82rem;
        font-weight: 700;
    }
    .state.live { background: var(--c); color: var(--on-color); }
    .state.edited { background: var(--accent-wash); color: var(--orange-ink); }

    .fields { display: grid; gap: 16px; max-width: 640px; }
    .big { font-size: 1.2rem; font-weight: 700; }
    em { font-style: normal; font-weight: 400; color: var(--ink-3); }

    .time-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: end; }
    .time { width: 11rem; font-family: var(--font-mono); }

    .segmented { border: 0; margin: 0; padding: 0; display: grid; gap: 6px; }
    .segmented legend { padding: 0; margin-bottom: 6px; }
    .segmented > div { display: inline-flex; padding: 3px; border-radius: var(--radius-s); background: var(--surface-sunken); }
    .segmented label { position: relative; cursor: pointer; }
    .segmented input { position: absolute; opacity: 0; inset: 0; cursor: pointer; }
    .segmented span {
        display: block;
        min-height: 38px;
        padding: 8px 14px;
        border-radius: 6px;
        font: 700 0.9rem/1.4 var(--font-mono);
        color: var(--ink-3);
        transition: background-color var(--dur-1) var(--ease-out);
    }
    .segmented input:checked + span { background: var(--surface-raised); color: var(--ink); }
    .segmented input:focus-visible + span { outline: 3px solid var(--focus); outline-offset: 1px; }

    footer { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 20px; border-top: 1px solid var(--line); }

    @media (max-width: 560px) {
        header { flex-wrap: wrap; align-items: flex-start; }
        .titles { flex: 1 1 calc(100% - 60px); }
        .state { margin-left: 60px; }
        .swatch { width: 44px; height: 44px; font-size: 1.45rem; border-radius: 13px; }
        h2 { font-size: 1.3rem; }
    }
</style>
