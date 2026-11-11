<script>
    import { slide } from "svelte/transition";
    import { liveshareData, syncStatus, undoState, takeDown, undoTakeDown, updateAPI, clearUndo } from "$lib/liveshare.svelte.js";
    import { CONTENT, labelFor, liveSummary } from "./drafts.svelte.js";
    import Switch from "$lib/components/Switch.svelte";

    let live = $derived(CONTENT.filter((c) => liveshareData[c.key]));
    let undoTimer = null;

    $effect(() => {
        if (undoState.key) {
            clearTimeout(undoTimer);
            undoTimer = setTimeout(clearUndo, 8000);
        }
        return () => clearTimeout(undoTimer);
    });
</script>

<section aria-labelledby="live-heading">
    <div class="head">
        <h2 id="live-heading">Live now</h2>
        <span class="count">{live.length ? `${live.length} on attendee screens` : "Nothing on attendee screens"}</span>
    </div>

    {#if syncStatus.state === "error"}
        <div class="banner error" role="alert" transition:slide={{ duration: 200 }}>
            <span class="icon" translate="no" aria-hidden="true">error</span>
            <p>{syncStatus.message}</p>
            <button class="btn btn-small" onclick={updateAPI}>Try again</button>
        </div>
    {/if}

    {#if live.length}
        <ul class="list">
            {#each live as item (item.key)}
                <li transition:slide={{ duration: 220 }}>
                    <span class="icon tile" translate="no" aria-hidden="true">{item.icon}</span>
                    <span class="text">
                        <span class="label">{item.label}</span>
                        <span class="summary">{liveSummary(item.key)}</span>
                    </span>
                    <Switch
                        checked
                        label="Show {item.label} to attendees"
                        disabled={syncStatus.state === "syncing"}
                        onchange={() => takeDown(item.key, item.label)}
                    />
                </li>
            {/each}
        </ul>
    {:else}
        <p class="empty">Attendees see a friendly waiting screen. Publish something below to put it on their phones.</p>
    {/if}

    {#if undoState.key}
        <div class="banner" role="status" transition:slide={{ duration: 200 }}>
            <p>{labelFor(undoState.key)} taken down.</p>
            <button class="btn btn-small btn-primary" onclick={undoTakeDown}>
                <span class="icon" translate="no" aria-hidden="true">undo</span> Undo
            </button>
        </div>
    {/if}
</section>

<style>
    .head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; }
    h2 { font-size: 1.3rem; }
    .count { color: var(--ink-3); font-size: 0.9rem; }

    .list { list-style: none; margin: 14px 0 0; padding: 0; }
    li {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 0;
        border-top: 1px solid var(--line);
    }
    li:first-child { border-top: 0; }
    .tile {
        flex: none;
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border-radius: 11px;
        background: var(--live-wash);
        color: oklch(0.4 0.1 150);
        font-size: 1.3rem;
    }
    .text { flex: 1; min-width: 0; display: grid; }
    .label { font-weight: 700; }
    .summary { color: var(--ink-3); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .empty { margin-top: 10px; color: var(--ink-2); max-width: 60ch; }

    .banner {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 14px;
        padding: 10px 10px 10px 16px;
        border-radius: var(--radius-m);
        background: var(--surface-sunken);
    }
    .banner p { flex: 1; }
    .banner.error { background: var(--danger-wash); }
    .banner.error .icon { color: var(--danger); }
</style>
