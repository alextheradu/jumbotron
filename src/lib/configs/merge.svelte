<script>
    import { slide } from "svelte/transition";
    import { internal } from "$lib/liveshare.svelte";
    import {
        org,
        sendMergeRequest,
        cancelMergeRequest,
        respondMergeRequest,
        removeMember,
        leaveMerge
    } from "$lib/org.svelte.js";

    // Merge panel state variables
    let digit1 = $state("");
    let digit2 = $state("");
    let digit3 = $state("");
    let digit4 = $state("");

    // Computed destination code derived from the 4 digit boxes
    let targetDestinationCode = $derived(`${digit1}${digit2}${digit3}${digit4}`);

    let mergeMessage = $state("");
    let mergeError = $state("");
    let busy = $state(false);

    let state = $derived(org.state);
    let isBridged = $derived(state?.role === "bridged");
    let members = $derived(state?.members ?? []);
    let incomingRequests = $derived(state?.incoming ?? []);
    let outgoing = $derived(state?.outgoing ?? null);

    let inputRefs = [];

    // Handle typing and backspace navigation across digit inputs
    function handleDigitInput(e, index) {
        const val = e.target.value;
        // Keep only the last typed character if multiple entered
        const char = val.slice(-1);

        if (index === 0) digit1 = char;
        if (index === 1) digit2 = char;
        if (index === 2) digit3 = char;
        if (index === 3) digit4 = char;

        // Move to next input if character entered
        if (char && index < 3) {
            inputRefs[index + 1]?.focus();
        }
    }

    function handleDigitKeydown(e, index) {
        if (e.key === "Backspace") {
            e.preventDefault();
            if (index === 0) digit1 = "";
            if (index === 1) digit2 = "";
            if (index === 2) digit3 = "";
            if (index === 3) digit4 = "";

            if (index > 0) {
                inputRefs[index - 1]?.focus();
            }
        } else if (e.key === "ArrowLeft" && index > 0) {
            inputRefs[index - 1]?.focus();
        } else if (e.key === "ArrowRight" && index < 3) {
            inputRefs[index + 1]?.focus();
        } else if (e.key === "Enter" && targetDestinationCode.length === 4) {
            submitMergeRequest();
        }
    }

    function handlePaste(e) {
        e.preventDefault();
        const pasteData = e.clipboardData.getData("text").trim();
        const digits = pasteData.replace(/\D/g, "").split("");
        if (digits.length > 0) {
            if (digits[0]) digit1 = digits[0];
            if (digits[1]) digit2 = digits[1];
            if (digits[2]) digit3 = digits[2];
            if (digits[3]) digit4 = digits[3];

            const nextIndex = Math.min(digits.length, 3);
            inputRefs[nextIndex]?.focus();
        }
    }

    // Wraps every merge action: one in flight at a time, errors and success copy surfaced inline.
    // Resulting state changes arrive through org.state (POST response + /orgStream push).
    async function run(action, successText) {
        if (busy) return;
        busy = true;
        mergeError = "";
        mergeMessage = "";
        try {
            await action();
            mergeMessage = successText;
        } catch (err) {
            mergeError = err.message || "Network error, please try again.";
        } finally {
            busy = false;
        }
    }

    function submitMergeRequest() {
        if (!/^\d{4}$/.test(targetDestinationCode)) {
            mergeError = "Please enter a valid 4-digit destination code.";
            return;
        }
        run(() => sendMergeRequest(targetDestinationCode), "Merge request sent. It stays pending until they respond or you cancel.");
    }

    function acknowledgeMerge(req, accept) {
        run(() => respondMergeRequest(req.code, accept), `${accept ? "Accepted" : "Declined"} merge request from ${req.name}.`);
    }

    // Destructive actions confirm inline: `confirming` holds a member code, or "leave".
    let confirming = $state(null);

    function unmergeEvent(member) {
        confirming = null;
        run(() => removeMember(member.code), `Removed ${member.name}'s event from your merge.`);
    }

    function leave() {
        confirming = null;
        run(leaveMerge, "You left the merged event. Your event is standalone again.");
    }

    const avatar = (slack) => `https://cachet.hackclub.com/users/${slack}/r`;
</script>


<div class="merge">
    <div class="head">
        <div>
            <h2>Merge events</h2>
            <p class="hint">Share one screen across several events. Everyone in a merge sees the same updates.</p>
        </div>
        <span class="conn" class:offline={!org.connected} role="status">
            <span class="dot" aria-hidden="true"></span>{org.connected ? "Connected" : "Reconnecting"}
        </span>
    </div>

    {#if mergeError}
        <p class="message error" role="alert" transition:slide={{ duration: 200 }}>{mergeError}</p>
    {/if}
    {#if mergeMessage}
        <p class="message ok" role="status" transition:slide={{ duration: 200 }}>{mergeMessage}</p>
    {/if}

    {#if !state}
        <p class="hint">Loading merge status</p>

    {:else if isBridged}
        <section class="block">
            <h3>Merged into {state.root.name}'s event</h3>
            <p class="hint">
                {state.root.cityName ? `${state.root.cityName}, ` : ""}code <span class="mono">{state.root.code}</span>.
                Your attendees see the shared screen, and what you publish goes to everyone in the merge.
            </p>
            <ul class="people">
                <li>
                    <img src={avatar(state.root.slack)} alt="" />
                    <span class="who"><strong>{state.root.name}</strong><span class="sub">Host</span></span>
                </li>
                {#each members.filter((m) => m.code !== internal.code) as m (m.code)}
                    <li>
                        <img src={avatar(m.slack)} alt="" />
                        <span class="who"><strong>{m.name}</strong><span class="sub mono">{m.code}</span></span>
                    </li>
                {/each}
            </ul>
            {#if confirming === "leave"}
                <div class="confirm" role="group" aria-label="Confirm leaving the merge">
                    <p>Leave {state.root.name}'s merge? Your attendees stop getting their updates.</p>
                    <button class="btn btn-small btn-danger" onclick={leave} disabled={busy}>Leave</button>
                    <button class="btn btn-small btn-quiet" onclick={() => (confirming = null)}>Cancel</button>
                </div>
            {:else}
                <div><button class="btn btn-small danger" onclick={() => (confirming = "leave")} disabled={busy}>Leave merge…</button></div>
            {/if}
        </section>

    {:else}
        {#if members.length > 0}
            <section class="block">
                <h3>Merged into your event ({members.length})</h3>
                <ul class="people">
                    {#each members as m (m.code)}
                        <li transition:slide={{ duration: 200 }}>
                            <img src={avatar(m.slack)} alt="" />
                            <span class="who"><strong>{m.name}</strong><span class="sub mono">{m.code}</span></span>
                            {#if confirming === m.code}
                                <span class="row-confirm">
                                    <button class="btn btn-small btn-danger" onclick={() => unmergeEvent(m)} disabled={busy}>Remove</button>
                                    <button class="btn btn-small btn-quiet" onclick={() => (confirming = null)}>Cancel</button>
                                </span>
                            {:else}
                                <button class="btn btn-small btn-quiet danger" onclick={() => (confirming = m.code)} disabled={busy}>Remove…</button>
                            {/if}
                        </li>
                    {/each}
                </ul>
                <p class="hint">Removed events keep their current screen but stop getting your updates.</p>
            </section>
        {/if}

        <section class="block">
            <h3>Requests to join you{incomingRequests.length ? ` (${incomingRequests.length})` : ""}</h3>
            {#if incomingRequests.length === 0}
                <p class="hint">None right now. New requests show up here on their own.</p>
            {:else}
                <p class="hint">Accepted events switch to your attendee code.</p>
                <ul class="people">
                    {#each incomingRequests as req (req.code)}
                        <li transition:slide={{ duration: 200 }}>
                            <img src={avatar(req.slack)} alt="" />
                            <span class="who"><strong>{req.name}</strong><span class="sub">{req.cityName || req.code}</span></span>
                            <span class="row-confirm">
                                <button class="btn btn-small btn-primary" disabled={busy} onclick={() => acknowledgeMerge(req, true)}>Accept</button>
                                <button class="btn btn-small btn-quiet" disabled={busy} onclick={() => acknowledgeMerge(req, false)}>Decline</button>
                            </span>
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>

        <section class="block">
            <h3>Merge into another event</h3>
            {#if outgoing}
                <p>Waiting for <strong>{outgoing.name}</strong> (code <span class="mono">{outgoing.code}</span>) to respond. You can leave this page; the request stays open.</p>
                <div><button class="btn btn-small" onclick={() => run(cancelMergeRequest, "Merge request cancelled.")} disabled={busy}>Cancel request</button></div>
            {:else if members.length > 0}
                <p class="hint">Other events are merged into yours. Remove them first to merge into someone else.</p>
            {:else}
                <p class="hint">Enter the host's attendee code. If they accept, your attendees switch to their screen and code.</p>
                <form class="request" onsubmit={(e) => { e.preventDefault(); submitMergeRequest(); }}>
                    <div class="digits" role="group" aria-label="Host's attendee code">
                        {#each [0, 1, 2, 3] as i}
                            <input
                                type="text"
                                inputmode="numeric"
                                maxlength="1"
                                class="digit"
                                aria-label="Digit {i + 1} of 4"
                                value={[digit1, digit2, digit3, digit4][i]}
                                bind:this={inputRefs[i]}
                                oninput={(e) => handleDigitInput(e, i)}
                                onkeydown={(e) => handleDigitKeydown(e, i)}
                                onpaste={handlePaste}
                            />
                        {/each}
                    </div>
                    <button class="btn btn-primary" disabled={busy || targetDestinationCode.length !== 4}>Send request</button>
                </form>
            {/if}
        </section>
    {/if}
</div>

<style>
    .merge { display: grid; gap: 24px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    h2 { font-size: 1.3rem; }
    h3 { font-size: 1.05rem; }
    .hint { margin-top: 4px; }

    .conn {
        flex: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: var(--radius-pill);
        background: var(--live-wash);
        color: oklch(0.38 0.1 150);
        font-size: 0.85rem;
        font-weight: 700;
    }
    .conn .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--live); }
    .conn.offline { background: var(--accent-wash); color: var(--ink-2); }
    .conn.offline .dot { background: var(--accent-strong); }

    .block { display: grid; gap: 10px; padding-top: 22px; border-top: 1px solid var(--line); }

    .people { list-style: none; margin: 4px 0 0; padding: 0; }
    .people li { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); }
    .people li:first-child { border-top: 0; }
    .people img { flex: none; width: 40px; height: 40px; border-radius: 50%; background: var(--surface-sunken); object-fit: cover; }
    .who { flex: 1; min-width: 0; display: grid; }
    .sub { color: var(--ink-3); font-size: 0.88rem; }
    .row-confirm { display: inline-flex; gap: 6px; }

    .danger { --btn-ink: var(--danger); }
    .danger:hover { --btn-bg: var(--danger-wash); }
    .confirm { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 12px; border-radius: var(--radius-m); background: var(--danger-wash); }
    .confirm p { flex: 1; min-width: 200px; }

    .request { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-top: 4px; }
    .digits { display: flex; gap: 8px; }
    .digit {
        width: 48px;
        height: 56px;
        padding: 0;
        border: 1.5px solid var(--line);
        border-radius: var(--radius-s);
        background: var(--surface);
        color: var(--ink);
        font: 700 1.5rem/1 var(--font-mono);
        text-align: center;
    }
    .digit:focus { outline: none; border-color: var(--accent-strong); box-shadow: 0 0 0 4px var(--accent-wash); }

    .message { padding: 10px 14px; border-radius: var(--radius-m); font-weight: 700; }
    .message.ok { background: var(--live-wash); color: oklch(0.38 0.1 150); }
    .message.error { background: var(--danger-wash); color: var(--danger); }
</style>
