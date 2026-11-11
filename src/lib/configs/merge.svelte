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

    function unmergeEvent(member) {
        if (!confirm(`Remove ${member.name}'s event from your merge? Their participants will keep the current screen but stop receiving your updates.`)) return;
        run(() => removeMember(member.code), `Removed ${member.name}'s event from your merge.`);
    }

    function leave() {
        if (!confirm(`Leave ${state.root.name}'s merged event? Your participants will stop receiving their updates.`)) return;
        run(leaveMerge, "You left the merged event. Your event is standalone again.");
    }
</script>

<style>
    .config {
        margin: 20px;
        background-color: rgb(231, 231, 231);
        padding: 20px;
        padding-top: 30px;
        border-radius: 30px;
        border: 5px grey solid;
        h3 {
            margin-bottom: 10px;
        }
    }
    button {
        background-color: rgb(58, 57, 57);
        color: white;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        font-weight: bold;
    }
    button:hover {
        background-color: rgb(80, 78, 78);
    }
    .error-msg { color: #ec374f; font-weight: bold; margin-top: 10px; }
    .success-msg { color: #2ecc71; font-weight: bold; margin-top: 10px; }

    /* Centered PFP Grid Container */
    .pfp-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 100px));
        justify-content: center;
        justify-items: center;
        gap: 15px;
        margin-top: 15px;
        margin-bottom: 15px;
    }

    /* PFP Wrapper for Hover Layer */
    .pfp-wrapper {
        position: relative;
        width: 100px;
        height: 100px;
        border-radius: 25px;
        overflow: hidden;
    }

    .mergePfp {
        display: block;
        width: 100px;
        height: 100px;
        border-radius: 25px;
        border: 5px solid rgb(176, 91, 91);
        box-shadow: 0px 0px 10px 10px rgba(117, 81, 81, 0.081);
        user-select: none;
        -webkit-user-drag: none;
        -moz-user-select: none;
        object-fit: cover;
    }

    /* Semi-opaque hover overlay and remove button */
    .pfp-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.55);
        border-radius: 25px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
    }

    .pfp-wrapper:hover .pfp-overlay {
        opacity: 1;
    }

    .remove-btn {
        background: transparent;
        border: none;
        color: white;
        font-size: 28px;
        cursor: pointer;
        font-weight: bold;
        line-height: 1;
        padding: 0;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .remove-btn:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    #code {
        font-family: Host Grotesk, Montserrat;
        font-size: 40px;
        animation: codeLoadAnimation 0.4s ease-out forwards;
    }

    /* Digit Code Box Inputs Styling */
    .digit-inputs-container {
        display: flex;
        gap: 10px;
        justify-content: center;
        align-items: center;
        margin-top: 15px;
        margin-bottom: 15px;
    }

    .digit-box {
        width: 50px;
        height: 50px;
        text-align: center;
        font-size: 26px;
        font-weight: bold;
        font-family: Atkinson Hyperlegible Mono, Montserrat;
        border-radius: 12px;
        border: 2px solid grey;
        background-color: white;
        outline: none;
        transition: border-color 0.2s;
    }

    .digit-box:focus {
        border-color: rgb(58, 57, 57);
        box-shadow: 0 0 5px rgba(58, 57, 57, 0.3);
    }

    .live {
        font-family: Atkinson Hyperlegible Mono, Montserrat;
        font-size: 13px;
        color: #2ecc71;
        margin-top: 0;
    }
    .live.offline {
        color: #e67e22;
    }
    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
</style>

<div class="config admin-box" style:background-color="white" style:border-color="rgb(230,230,230)" style:box-shadow="0px 0px 10px 5px rgba(0,0,0, 0.3)" transition:slide>
    <h3 style:font-family="Montserrat" style:font-weight=800>Event Merging Panel</h3>
    <p>Bridge your event into another host or accept inputs from other organizers.</p>
    <h4 id="code">{internal.code}</h4>
    <p class="live" class:offline={!org.connected}>{org.connected ? "Live" : "Reconnecting..."}</p>

    {#if !state && org.error}
        <p class="error-msg" style="font-family: Atkinson Hyperlegible Mono">{org.error} Retrying automatically...</p>
    {:else if !state}
        <p>Loading merge status...</p>
    {:else if isBridged}
        <p>Merged into <strong>{state.root.name}</strong>'s event{state.root.cityName ? ` (${state.root.cityName})` : ""}, code <strong>{state.root.code}</strong>.</p>
        <p>Your participants see the shared screen. Updates you push also go to everyone in the merge.</p>
        <div class="pfp-grid">
            <img class="mergePfp" src="https://cachet.hackclub.com/users/{state.root.slack}/r" alt="{state.root.name}'s profile" title={state.root.name} />
            {#each members.filter(m => m.code !== internal.code) as m (m.code)}
                <img class="mergePfp" src="https://cachet.hackclub.com/users/{m.slack}/r" alt="{m.name}'s profile" title={m.name} />
            {/each}
        </div>
        <p><button onclick={leave} disabled={busy}>Leave Merge</button></p>
    {:else if members.length > 0}
        <div class="pfp-grid">
            {#each members as m (m.code)}
                <div class="pfp-wrapper">
                    <img class="mergePfp" src="https://cachet.hackclub.com/users/{m.slack}/r" alt="{m.name}'s profile" title="{m.name} ({m.code})" />
                    <div class="pfp-overlay">
                        <button class="remove-btn" title="Remove {m.name}'s event" onclick={() => unmergeEvent(m)} disabled={busy}><span translate="no" class="material-symbols-outlined">cancel</span></button>
                    </div>
                </div>
            {/each}
        </div>
        <p><i>Hover and click a profile to remove their connection</i></p>
    {/if}

    {#if mergeError}
        <p class="error-msg" style="font-family: Atkinson Hyperlegible Mono">{mergeError}</p>
    {/if}
    {#if mergeMessage}
        <p class="success-msg" style="font-family: Atkinson Hyperlegible Mono">{mergeMessage}</p>
    {/if}
</div>

{#if state && !isBridged}
<div class="config">
    <div style="margin-top: 25px;">
        <h4 style="margin-bottom: 8px;">Incoming Merge Requests</h4>

        {#if incomingRequests.length === 0}
            <p style="margin-top: 10px; margin-bottom: 10px; color: #666;">No pending incoming requests. New ones appear here automatically.</p>
        {:else}
            <p>Events that merge into yours will use your event code</p>
            <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 10px;">
                {#each incomingRequests as req (req.code)}
                    <div transition:slide style="display: flex; align-items: center; justify-content: space-between; background: #bfbfbf; padding: 12px; border-radius: 20px; border: 1px solid #ddd; width: min(600px, 100%); box-sizing: border-box; align-self: center">
                        <div style="justify-content: left; margin-left: 10px">
                            <img style:margin-top=0px class="mergePfp" src="https://cachet.hackclub.com/users/{req.slack}/r" alt="{req.name}'s profile" />
                            <p style:margin-bottom=0px style:font-family="Host Grotesk, Montserrat"><strong>{req.name}</strong>{req.cityName ? ` · ${req.cityName}` : ""}</p>
                        </div>
                        <div>
                            <button title="Accept Request" class="bigButton" disabled={busy} onclick={() => acknowledgeMerge(req, true)} style="margin-right: 8px;"><span class="material-symbols-outlined" translate="no">check_circle</span></button>
                            <button title="Deny Request" class="bigButton" disabled={busy} onclick={() => acknowledgeMerge(req, false)}><span class="material-symbols-outlined" translate="no">cancel</span></button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<div class="config">
    <div style="margin-top: 25px; text-align: center;">
        <h4 style="margin-bottom: 8px;">Request to Merge Into Another Event</h4>
        {#if outgoing}
            <p>Waiting for <strong>{outgoing.name}</strong> (code <strong>{outgoing.code}</strong>) to respond.</p>
            <p>You can close this panel; the request stays pending.</p>
            <p><button onclick={() => run(cancelMergeRequest, "Merge request cancelled.")} disabled={busy}>Cancel Request</button></p>
        {:else if members.length > 0}
            <p>Other events are merged into yours. Remove them before merging into another event.</p>
        {:else}
            <p>If accepted, you are assigned the event code of the event you merge into.<br><strong>Enter their event code below</strong></p>

            <div class="digit-inputs-container">
                {#each [0, 1, 2, 3] as i}
                    <input
                        type="text"
                        inputmode="numeric"
                        maxlength="1"
                        class="digit-box"
                        value={[digit1, digit2, digit3, digit4][i]}
                        bind:this={inputRefs[i]}
                        oninput={(e) => handleDigitInput(e, i)}
                        onkeydown={(e) => handleDigitKeydown(e, i)}
                        onpaste={handlePaste}
                    />
                {/each}
            </div>

            <div style="margin-top: 15px;">
                <button onclick={submitMergeRequest} disabled={busy}>Send Merge Request</button>
            </div>
        {/if}
    </div>
</div>
{/if}
