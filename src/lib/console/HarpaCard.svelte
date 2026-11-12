<script>
    // Harpa (hackclub/harpa): the lo-fi music scene, embedded on the big screen. This only turns
    // it on or off; harpa's own gear on the big screen holds its settings.
    import { harpa, setHarpa } from "$lib/org.svelte.js";
    import Switch from "$lib/components/Switch.svelte";

    let busy = $state(false);
    let error = $state("");

    async function toggle(on) {
        if (busy) return;
        busy = true;
        error = "";
        try {
            await setHarpa(on);
        } catch (e) {
            error = e.message;
        } finally {
            busy = false;
        }
    }
</script>

<section class="harpa" aria-labelledby="harpa-heading">
    <div class="row">
        <span class="text">
            <h2 id="harpa-heading">Harpa</h2>
            <span class="sub">Lo-fi music and a Dancing Pudding</span>
        </span>
        <Switch checked={harpa.enabled} label="Show harpa on the big screen" disabled={busy || !harpa.loaded} onchange={toggle} />
    </div>
    {#if harpa.enabled}
        <!-- <p class="hint">Set the playlist, logo and MP3s with the gear at the top right of the big screen. They're saved on that laptop.</p> -->
    {/if}
    {#if error}<p class="error-text" role="alert">{error}</p>{/if}
</section>

<style>
    .harpa { display: grid; gap: 8px; margin-top: 16px; padding: 16px 6px 0; border-top: 1px solid var(--line); }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .text { min-width: 0; display: grid; }
    h2 { font-size: 1.15rem; }
    .sub { color: var(--ink-3); font-size: 0.86rem; }
</style>
