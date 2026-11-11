<script>
    import { onMount } from "svelte";
    import { syncStatus } from "$lib/liveshare.svelte.js";
    import { agoLabel } from "$lib/time.js";

    let now = $state(Date.now());
    onMount(() => {
        const id = setInterval(() => (now = Date.now()), 5000);
        return () => clearInterval(id);
    });

    let text = $derived.by(() => {
        switch (syncStatus.state) {
            case "syncing": return "Publishing";
            case "ok": return `Live · updated ${agoLabel(syncStatus.lastSynced, now)}`;
            case "error": return "Not published";
            default: return "Ready";
        }
    });
</script>

<span class="pill {syncStatus.state}" role="status" title={syncStatus.state === "error" ? syncStatus.message : ""}>
    {#if syncStatus.state === "syncing"}
        <span class="icon spin" translate="no" aria-hidden="true">sync</span>
    {:else}
        <span class="dot" aria-hidden="true"></span>
    {/if}
    {text}
</span>

<style>
    .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
        padding: 0 12px;
        border-radius: var(--radius-pill);
        background: var(--surface);
        color: var(--ink-2);
        font-size: 0.85rem;
        font-weight: 700;
        white-space: nowrap;
        box-shadow: var(--shadow-1);
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--line-strong); }
    .ok .dot { background: var(--live); }
    .error { background: var(--danger-wash); color: var(--danger); }
    .error .dot { background: var(--danger); }
    .icon { font-size: 1rem; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
</style>
