<script>
    // Big screen controls: open the projector tab, choose whether it shows announcements, and
    // turn on demo time so attendees can share their screen to it.
    import { resolve } from "$app/paths";
    import { demo, setDemos, setBoard, stopPresenter } from "$lib/org.svelte.js";
    import Switch from "$lib/components/Switch.svelte";

    let busy = $state(false);
    let error = $state("");

    async function run(action) {
        if (busy) return;
        busy = true;
        error = "";
        try {
            await action();
        } catch (e) {
            error = e.message;
        } finally {
            busy = false;
        }
    }
</script>

<section class="big-screen" aria-labelledby="big-screen-heading">
    <div class="head">
        <h2 id="big-screen-heading">Big screen</h2>
        <a class="btn btn-small" href={resolve("/screen")} target="_blank" rel="noopener">
            <span class="icon" translate="no" aria-hidden="true">tv</span>{demo.screenOpen ? "Open again" : "Open"}
        </a>
    </div>
    <p class="hint">
        {demo.screenOpen
            ? "Connected. Keep that tab full screen on the projector."
            : "Open it on the laptop plugged into the projector, then press Full screen."}
    </p>

    <ul>
        <li>
            <span class="text">
                <span class="label">Show announcements</span>
                <span class="sub">Announcement and up next, on the projector</span>
            </span>
            <Switch checked={demo.board} label="Show announcements on the big screen" disabled={busy} onchange={(on) => run(() => setBoard(on))} />
        </li>
        <li>
            <span class="text">
                <span class="label">Demo time</span>
                <span class="sub">{demo.enabled ? "Attendees can share their screen" : "Screen sharing is off"}</span>
            </span>
            <Switch checked={demo.enabled} label="Let attendees share their screen to the big screen" disabled={busy} onchange={(on) => run(() => setDemos(on))} />
        </li>
    </ul>

    {#if demo.enabled}
        {#if !demo.screenOpen}
            <p class="warn" role="status">Nobody can share until the big screen is open.</p>
        {:else if demo.presenter}
            <div class="presenter" role="status">
                <span class="dot" class:live={demo.presenter.live} aria-hidden="true"></span>
                <span class="who">
                    <strong>{demo.presenter.name}</strong>
                    <span>{demo.presenter.live ? "is on the big screen" : "is choosing what to share"}</span>
                </span>
                <button class="btn btn-small btn-destructive" disabled={busy} onclick={() => run(stopPresenter)}>Stop</button>
            </div>
        {:else}
            <p class="hint">The big screen shows code <span class="mono code" translate="no">{demo.screenCode}</span>. Presenters type it on their laptop.</p>
        {/if}
    {/if}

    {#if error}<p class="error-text" role="alert">{error}</p>{/if}
</section>

<style>
    .big-screen { display: grid; gap: 10px; margin-top: 16px; padding: 16px 6px 0; border-top: 1px solid var(--line); }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    h2 { font-size: 1.15rem; }
    .head .btn { text-decoration: none; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
    li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 4px 8px 0; }
    .text { min-width: 0; display: grid; }
    .label { font-weight: 700; }
    .sub { color: var(--ink-3); font-size: 0.86rem; }
    .warn { padding: 10px 12px; border-radius: var(--radius-m); background: var(--accent-wash); color: var(--ink); font-size: 0.9rem; font-weight: 700; }
    .presenter { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--radius-m); background: var(--surface-raised); }
    .dot { flex: none; width: 10px; height: 10px; border-radius: 50%; background: var(--orange); }
    .dot.live { background: var(--live); }
    .who { flex: 1; min-width: 0; display: grid; font-size: 0.9rem; }
    .who span { color: var(--ink-3); }
    .code { font-weight: 700; color: var(--ink); letter-spacing: 0.08em; }
</style>
