<script>
    import { slide } from "svelte/transition";
    import { onMount, onDestroy } from "svelte";
    import { internal } from "$lib/liveshare.svelte";

    // Merge panel state variables
    let digit1 = $state("");
    let digit2 = $state("");
    let digit3 = $state("");
    let digit4 = $state("");
    
    // Computed destination code derived from the 4 digit boxes
    let targetDestinationCode = $derived(`${digit1}${digit2}${digit3}${digit4}`);

    let mergeStatus = $state("");
    let mergeMessage = $state("");
    let mergeError = $state("");
    let incomingRequests = $state([]);
    let mergeEventSource = null;

    let inputRefs = [];

    onMount(fetchIncomingMergeRequests);

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

    // 1. Send outgoing merge request (`/mergeRequest`) via EventSource
    function sendMergeRequest() {
        if (targetDestinationCode.length < 4 || targetDestinationCode.trim() === "") {
            mergeError = "Please enter a valid 4-digit destination code.";
            return;
        }
        mergeError = "";
        mergeMessage = "";
        mergeStatus = "Connecting...";

        // Close any existing connection first
        if (mergeEventSource) {
            mergeEventSource.close();
        }

        const url = `https://api.jumbotron.hackclub.com/mergeRequest?code=${encodeURIComponent(internal.code)}&password=${encodeURIComponent(internal.password)}&destination=${encodeURIComponent(targetDestinationCode.trim())}`;

        mergeEventSource = new EventSource(url);

        mergeEventSource.onmessage = (event) => {
            console.log(event.data);
            const status = event.data.trim();
            mergeStatus = status;

            if (status.includes("accepted")) {
                mergeStatus = "Accepted";
                mergeEventSource.close();
            } else if (status.includes("rejected")) {
                mergeStatus = "Rejected";
                mergeEventSource.close();
            } else if (status.includes("cancelled")) {
                mergeStatus = "Cancelled (you accepted another merge)";
                mergeEventSource.close();
            }
        };

        mergeEventSource.onerror = (err) => {
            if (mergeEventSource.readyState === EventSource.CLOSED) {
                // Closed normally or ended by server
            } else {
                mergeError = "Connection error during merge request.";
                mergeStatus = "";
            }
            mergeEventSource.close();
        };
    }

    // 2. Fetch incoming merge requests (`/getMergeRequests`)
    async function fetchIncomingMergeRequests() {
        mergeError = "";
        try {
            const res = await fetch(`https://api.jumbotron.hackclub.com/getMergeRequests?code=${internal.code}&password=${internal.password}`);
            const data = await res.json();
            if (!res.ok) {
                mergeError = data.error || "Failed to fetch incoming requests.";
                return;
            }
            incomingRequests = data.requests || [];
        } catch (err) {
            mergeError = "Network error while loading requests.";
        }
    }

    // 3. Accept or Reject incoming requests (`/ackMergeRequest`)
    async function acknowledgeMerge(requestorCode, requestorName, acceptValue) {
        mergeError = "";
        mergeMessage = "";
        try {
            const res = await fetch(`https://api.jumbotron.hackclub.com/ackMergeRequest`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: internal.code,
                    password: internal.password,
                    recipient: requestorCode,
                    accept: acceptValue
                })
            });
            const data = await res.json();
            if (!res.ok) {
                mergeError = data.error || "Failed to process request action.";
                return;
            }
            internal.sources = data.sources || internal.sources;
            mergeMessage = `Successfully ${acceptValue ? "accepted" : "rejected"} merge request from ${requestorName}.`;
            
            if (acceptValue) {
                const res2 = await fetch(`https://api.jumbotron.hackclub.com/getMergedEvents?code=${internal.code}&password=${internal.password}`);
                const data2 = await res2.json();
                console.log("New merge list", data2);
            }
        } catch (err) {
            mergeError = "Network error while updating merge request.";
        }
        fetchIncomingMergeRequests();
    }

    // 4. Unmerge event route (`/unmergeEvents`)
    async function unmergeEvent(slackId) {
        mergeError = "";
        mergeMessage = "";
        try {
            const res = await fetch(`https://api.jumbotron.hackclub.com/unmergeEvents`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: internal.code,
                    password: internal.password,
                    root: internal.code,
                    slack: slackId
                })
            });
            const data = await res.json();
            if (!res.ok) {
                mergeError = data.error || "Failed to unmerge event.";
                return;
            }
            // Filter out the unmerged slack ID from internal sources
            internal.sources = internal.sources.filter(s => s !== slackId);
            mergeMessage = `Successfully removed event for user ${slackId}.`;
        } catch (err) {
            mergeError = "Network error while unmerging event.";
        }
    }

    // Clean up open SSE streams when component unmounts
    onDestroy(() => {
        if (mergeEventSource) {
            mergeEventSource.close();
        }
    });

    // Test helper to emulate an outbound request being accepted
    function emulateAcceptedRequest() {
        mergeError = "";
        mergeMessage = "";
        mergeStatus = "Connecting...";

        // Simulate network delay before acceptance
        setTimeout(() => {
            mergeStatus = "Accepted";
            
            // If acceptance updates sources, you can mock that here too if needed:
            // internal.sources = [...(internal.sources || []), "mock_source_code"];
        }, 1000);
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
    textarea {
        width: 100%;
        height: 250px;
        font-family: monospace;
        padding: 10px;
        border-radius: 10px;
        border: 2px solid grey;
        background-color: white;
        box-sizing: border-box;
        margin-top: 10px;
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

</style>

<div class="config admin-box" style:background-color="white" style:border-color="rgb(230,230,230)" style:box-shadow="0px 0px 10px 5px rgba(0,0,0, 0.3)" transition:slide>
    <h3 style:font-family="Montserrat" style:font-weight=800>Event Merging Panel</h3>
    <p>Bridge your event into another host or accept inputs from other organizers.</p>
    <h4 id="code">{internal.code}</h4>
    
    {#if internal.sources && internal.sources.length > 0} 
        <div class="pfp-grid">
            {#each internal.sources as x}
                <div class="pfp-wrapper">
                    <img class="mergePfp" src="https://cachet.hackclub.com/users/{x}/r" alt="Source user {x}" />
                    <div class="pfp-overlay">
                        <button class="remove-btn" title="Remove event path" onclick={() => unmergeEvent(x)}><span translate="no" class="material-symbols-outlined">cancel</span></button>
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

<div class="config">
    <div style="margin-top: 25px;">
        <h4 style="margin-bottom: 8px;">Incoming Merge Requests</h4>
        <div style="display: flex; justify-content: center">
            <button onclick={fetchIncomingMergeRequests}>Refresh Requests</button>
        </div>

        {#if incomingRequests.length === 0}
            <p style="margin-top: 10px; margin-bottom: 10px; color: #666;">No pending incoming requests.</p>
        {:else}
            <p>Events that merge into yours will use your event code</p>
            <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 10px;">
                {#each incomingRequests as req}
                    <div style="display: flex; align-items: center; justify-content: space-between; background: #bfbfbf; padding: 12px; border-radius: 20px; border: 1px solid #ddd; width: 600px; align-self: center">
                        <div style="justify-content: left; margin-left: 10px">
                            <img style:margin-top=0px class="mergePfp" src="https://cachet.hackclub.com/users/{req.slack}/r" alt="{req.name}'s profile" />
                            <p style:margin-bottom=0px style:font-family="Host Grotesk, Montserrat"><strong>{req.name}</strong></p>  
                        </div>
                        <div>
                            <button title="Accept Request" class="bigButton" onclick={() => acknowledgeMerge(req.code, req.name, true)} style="margin-right: 8px;"><span class="material-symbols-outlined" translate="no">check_circle</span></button>
                            <button title="Deny Request" class="bigButton" onclick={() => acknowledgeMerge(req.code, req.name, false)}><span class="material-symbols-outlined" translate="no">cancel</span></button>
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
        <p>If accepted, you are assigned the event code of the event you merge into.<br><strong>Enter their event code below</strong></p>
        
        <div class="digit-inputs-container">
            <input 
                type="text" 
                maxlength="1" 
                class="digit-box" 
                bind:value={digit1} 
                bind:this={inputRefs[0]}
                oninput={(e) => handleDigitInput(e, 0)}
                onkeydown={(e) => handleDigitKeydown(e, 0)}
                onpaste={handlePaste}
            />
            <input 
                type="text" 
                maxlength="1" 
                class="digit-box" 
                bind:value={digit2} 
                bind:this={inputRefs[1]}
                oninput={(e) => handleDigitInput(e, 1)}
                onkeydown={(e) => handleDigitKeydown(e, 1)}
            />
            <input 
                type="text" 
                maxlength="1" 
                class="digit-box" 
                bind:value={digit3} 
                bind:this={inputRefs[2]}
                oninput={(e) => handleDigitInput(e, 2)}
                onkeydown={(e) => handleDigitKeydown(e, 2)}
            />
            <input 
                type="text" 
                maxlength="1" 
                class="digit-box" 
                bind:value={digit4} 
                bind:this={inputRefs[3]}
                oninput={(e) => handleDigitInput(e, 3)}
                onkeydown={(e) => handleDigitKeydown(e, 3)}
            />
        </div>

        <div style="margin-top: 15px;">
            <button onclick={sendMergeRequest}>Send Merge Request</button>
        </div>

        <!--Testing-->
        <div class="config" style="background-color: #fff9e6; border-color: #f1c40f;">
            <h4 style="margin-bottom: 8px;">🧪 Testing Tools</h4>
            <p>Quickly test UI states without an actual server response:</p>
            <p>
                <button onclick={emulateAcceptedRequest} style="background-color: #27ae60;">Emulate Accepted Request</button>
                <button onclick={() => mergeStatus = "Rejected"} style="background-color: #c0392b; margin-left: 10px;">Emulate Rejected</button>
            </p>
            {#if mergeStatus}
                <p style="font-family: monospace; font-weight: bold; margin-top: 10px;">Test Status: {mergeStatus}</p>
            {/if}
        </div>
        <!---->

        {#if mergeStatus}
            <p style="font-family: monospace; font-weight: bold; margin-top: 10px;">Status: {mergeStatus}</p>
        {/if}
    </div>
</div>