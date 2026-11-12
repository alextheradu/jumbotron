<script>
    // Big screen controls: open the projector tab, choose whether it shows announcements, and
    // turn on demo time so attendees can share their screen to it.
    import { resolve } from "$app/paths";
    import { demo, setDemos, setBoard, setMirror, stopPresenter, approveQueued, removeQueued } from "$lib/org.svelte.js";
    import Switch from "$lib/components/Switch.svelte";

    let busy = $state(false);
    let error = $state("");

    const avatar = (slack) => `https://cachet.hackclub.com/users/${slack}/r`;
    // Approving someone while another presenter is on takes the screen from them.
    let screenBusy = $derived(!!demo.presenter);

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
        {#if demo.enabled}
            <li>
                <span class="text">
                    <span class="label">Show on attendees' devices</span>
                    <span class="sub">{demo.mirror
                        ? "The shared screen also goes full screen on the attendee page"
                        : "Only the projector shows the shared screen"}</span>
                </span>
                <Switch checked={demo.mirror} label="Also show the shared screen full screen on attendees' devices" disabled={busy} onchange={(on) => run(() => setMirror(on))} />
            </li>
        {/if}
    </ul>

    {#if demo.enabled}
        {#if !demo.screenOpen}
            <p class="warn" role="status">Nobody can share until the big screen is open.</p>
        {:else}
            {#if demo.presenter}
                <div class="presenter" role="status">
                    {#if demo.presenter.slack}<img src={avatar(demo.presenter.slack)} alt="" />{:else}<span class="dot" class:live={demo.presenter.live} aria-hidden="true"></span>{/if}
                    <span class="who">
                        <strong>{demo.presenter.name}</strong>
                        <span>{demo.presenter.live ? "is on the big screen" : "is choosing what to share"}</span>
                    </span>
                    <button class="btn btn-small btn-destructive" disabled={busy} onclick={() => run(stopPresenter)}>Stop</button>
                </div>
            {/if}

            <div class="queue">
                <p class="label">Queue{demo.queue.length ? ` (${demo.queue.length})` : ""}</p>
                {#if demo.queue.length === 0}
                    <p class="hint">Nobody waiting. Presenters type code <span class="mono code" translate="no">{demo.screenCode}</span> on their laptop to join.</p>
                {:else}
                    <ol>
                        {#each demo.queue as q (q.id)}
                            <li>
                                {#if q.slack}<img src={avatar(q.slack)} alt="" />{:else}<span class="initial" aria-hidden="true">{q.name[0]}</span>{/if}
                                <span class="who">
                                    <strong>{q.name}</strong>
                                    {#if !q.connected}<span>Reconnecting</span>{/if}
                                </span>
                                <button class="btn btn-small btn-primary" disabled={busy}
                                    title={screenBusy ? `Takes the big screen from ${demo.presenter.name}` : undefined}
                                    onclick={() => run(() => approveQueued(q.id))}>Approve</button>
                                <button class="btn btn-small btn-quiet" disabled={busy} aria-label={`Remove ${q.name} from the queue`}
                                    onclick={() => run(() => removeQueued(q.id))}>Remove</button>
                            </li>
                        {/each}
                    </ol>
                    <p class="hint">Code <span class="mono code" translate="no">{demo.screenCode}</span>{screenBusy ? ` · approving takes the screen from ${demo.presenter.name}` : ""}</p>
                {/if}
            </div>
        {/if}
    {/if}

    {#if error}<p class="error-text" role="alert">{error}</p>{/if}
</section>

<style>
    .big-screen { display: grid; gap: 10px; margin-top: 28px; padding: 0 6px; }
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
    .presenter img, .queue img, .initial { flex: none; width: 32px; height: 32px; border-radius: 50%; background: var(--surface-sunken); object-fit: cover; }
    .initial { display: grid; place-items: center; color: var(--ink-2); font-weight: 700; }
    .queue { display: grid; gap: 6px; }
    .queue ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
    .queue li { justify-content: flex-start; gap: 10px; padding: 6px 0; }
</style>
