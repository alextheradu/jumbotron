<script>
    import { base } from "$app/paths";
    import { page } from "$app/state";
    import { onMount } from "svelte";
    import { eventName } from "$lib/event";
    import { liveshareData, sync } from "$lib/liveshare.svelte";

    import { slide } from "svelte/transition";

    // Components
    import Main from "$lib/configs/main.svelte";
    import Announcements from "$lib/configs/announcements.svelte";
    import Slides from "$lib/configs/slides.svelte";
    import { internal } from "$lib/liveshare.svelte";

    let admin = $state(false);

    // Admin panel state variables
    let allEventsList = $state("");
    let bannedList = $state([]);
    let targetBanSlack = $state("");
    let targetUnbanSlack = $state("");
    let adminMessage = $state("");
    let adminError = $state("");

    // Packet lookup state variables
    let packetLookupCode = $state("");
    let packetResultData = $state("");
    let packetError = $state("");

    // Handle creds
    onMount(async () => {
        if (localStorage.getItem("creds")) {
            let creds = (localStorage.getItem("creds")).split(",");
            
            internal.code = creds[0];
            internal.slack = creds[1];
            internal.name = creds[2];
            internal.password = creds[3]

            if (localStorage.getItem("cityName")) {
                internal.cityName = localStorage.getItem("cityName");
                internal.initComplete = true;
            }
            else {
                const response = await fetch(`https://api.jumbotron.hackclub.com/getPacket?code=${internal.code}`)
                if (!response.ok) {
                    return;
                }
                let data = await response.json();
                if (!data.cityName || data.cityName.trim() == "") {
                    return;
                }
                else {
                    internal.cityName = data.cityName;
                    internal.initComplete = true;

                    let syncedData = await JSON.parse(data.data);

                    if (syncedData) { // inside data means liveshareData
                        liveshareData.announcement = syncedData.announcement;
                        liveshareData.event = syncedData.event;
                        liveshareData.file = syncedData.file;
                        liveshareData.youtube = syncedData.youtube;
                        liveshareData.website = syncedData.website;
                        console.log("Liveshare synced from", syncedData);
                        internal.importedSync = true;
                    } 
                    else {
                        console.log("No liveshare data synced");
                    }

                }
            }
        }
        else {
            window.location.href = "/";
            return;
        }
    })

    // Fetch all events and banned list for admin console view
    async function fetchAllEvents() {
        adminMessage = "";
        adminError = "";
        try {
            // Fetch events list
            const res = await fetch(`https://api.jumbotron.hackclub.com/allEvents?code=${internal.code}&password=${internal.password}`);
            const data = await res.json();
            if (!res.ok) {
                adminError = data.error || "Failed to fetch events";
                return;
            }
            // Pretty print JSON safely
            try {
                let parsed = JSON.parse(data.list);
                allEventsList = JSON.stringify(parsed, null, 2);
            } catch (e) {
                allEventsList = data.list;
            }

            // Fetch separate banned list using the GET endpoint
            const banRes = await fetch(`https://api.jumbotron.hackclub.com/getBans?code=${internal.code}&password=${internal.password}`);
            const banData = await banRes.json();
            if (banRes.ok && banData.list) {
                try {
                    bannedList = JSON.parse(banData.list);
                } catch (e) {
                    bannedList = [];
                }
            } else {
                bannedList = [];
            }

            adminMessage = "Events list and bans loaded successfully.";
        } catch (err) {
            adminError = "Network error while fetching events.";
        }
    }

    // Call /getPacket for a specific code
    async function fetchPacketByCode(codeToFetch) {
        if (!codeToFetch || codeToFetch.trim() === "") {
            packetError = "Please enter a valid code to query.";
            return;
        }
        packetError = "";
        packetResultData = "";
        try {
            const res = await fetch(`https://api.jumbotron.hackclub.com/getPacket?code=${codeToFetch.trim()}`);
            const data = await res.json();
            if (!res.ok) {
                packetError = data.error || "Failed to fetch packet for this code.";
                return;
            }
            packetResultData = JSON.stringify(data, null, 2);
        } catch (err) {
            packetError = "Network error while fetching packet.";
        }
    }

    // Save/Replace all events via /setEvents
    async function saveAllEvents() {
        adminMessage = "";
        adminError = "";
        try {
            const res = await fetch(`https://api.jumbotron.hackclub.com/setEvents`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: internal.code,
                    password: internal.password,
                    items: allEventsList
                })
            });
            const data = await res.json();
            if (!res.ok) {
                adminError = data.error || "Failed to update events";
                return;
            }
            adminMessage = data.message || "Events updated successfully.";
        } catch (err) {
            adminError = "Network error while saving events.";
        }
    }

    // Ban specific user via /banEvent using Slack ID
    async function banSpecificUser(banSlackTarget) {
        if (!banSlackTarget || banSlackTarget.trim() === "") {
            adminError = "Please enter a valid Slack ID to ban.";
            return;
        }
        adminMessage = "";
        adminError = "";
        try {
            const res = await fetch(`https://api.jumbotron.hackclub.com/banEvent`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: internal.code,
                    password: internal.password,
                    banSlack: banSlackTarget.trim()
                })
            });
            const data = await res.json();
            if (!res.ok) {
                adminError = data.error || "Failed to ban user";
                return;
            }
            adminMessage = data.message || `Slack ID ${banSlackTarget} banned successfully.`;
            targetBanSlack = "";
            fetchAllEvents(); // Refresh list
        } catch (err) {
            adminError = "Network error while banning user.";
        }
    }

    // Unban specific user via /unbanEvent using Slack ID
    async function unbanSpecificUser(unbanSlackTarget) {
        if (!unbanSlackTarget || unbanSlackTarget.trim() === "") {
            adminError = "Please enter a valid Slack ID to unban.";
            return;
        }
        adminMessage = "";
        adminError = "";
        try {
            const res = await fetch(`https://api.jumbotron.hackclub.com/unbanEvent`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: internal.code,
                    password: internal.password,
                    unbanSlack: unbanSlackTarget.trim()
                })
            });
            const data = await res.json();
            if (!res.ok) {
                adminError = data.error || "Failed to unban user";
                return;
            }
            adminMessage = data.message || `Slack ID ${unbanSlackTarget} unbanned successfully.`;
            targetUnbanSlack = "";
            fetchAllEvents(); // Refresh list immediately
        } catch (err) {
            adminError = "Network error while unbanning user.";
        }
    }
    
    // Static placeholder constants
    const liveshareEnabled = false;
    const liveshareAway = false;
    const isOpenGate = false;
    const isPaused = false;
    const isSyncActive = false;

    let pfpLoaded = $state(false);
</script>

<svelte:head>
    <title>Jumbotron - Control Panel</title>
</svelte:head>
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
    .admin-box {
        text-align: left;
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
        input {
            padding: 8px 12px;
            border-radius: 10px;
            border: 2px solid grey;
            margin-right: 10px;
            font-size: 16px;
        }
        button {
            background-color: rgb(58, 57, 57);
            color: white;
            border: none;
            padding: 9px 18px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
        }
        button:hover {
            background-color: rgb(80, 78, 78);
        }
    }
    .error-msg { color: #ec374f; font-weight: bold; margin-top: 10px; }
    .success-msg { color: #2ecc71; font-weight: bold; margin-top: 10px; }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        50% {
            transform: rotate(180deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    #liveshareNotif {
        user-select: none;
        z-index: 1000;
        position: fixed;
        right: -305px;
        top: 90px;
        background-color: #635758f2;
        border-radius: 20px;
        color: white;
        padding: 0px;
        transition: all 0.5s ease-in-out;
        border: 5px solid #ec374f00;

        span {
            transform: translateY(5px);
            margin-right: 20px;
        }
        p {
            transform: translateY(-3px);
            padding-right: 50px;
        }
    }
    #liveshareNotif.away {
        right: -25px;
        background-color: #ec374ff2;
    }
    #liveshareNotif.active {
        right: -225px;
        animation: pulsate infinite 2s ease-in-out;
    }
    #liveshareNotif.pause {
        right: -235px;
        background-color: #635758f2;
    }
    #liveshareNotif.up {
        top: 10px;  
    }
    @keyframes pulsate {
        0%, 100% {
            background-color: #db5164fd;
        }
        50% {
            background-color: #ec374f;
        }
    }

    #syncingNotif {
        z-index: 999;
        user-select: none;
        position: fixed;
        right: -140px;
        top: 10px;
        background-color: #635758f2;
        border-radius: 20px;
        color: white;
        padding: 0px;
        transition: all 0.5s ease-in-out;
        border: 5px solid #ec374f00;

        span {
            transform: translateY(5px);
            margin-right: 20px;
        }
        p {
            transform: translateY(-3px);
            padding-right: 50px;
        }
    }
    #syncingNotif.active {
        animation: pulsate infinite 2s ease-in-out;
        right: -70px;
        background-color: #ec374ff2;
        span {
            animation: spin 1s infinite ease-in;
        }
        p {
            transform: translateY(2.5px);
        }
    }

    #pfp {
        display: block;
        border-radius: 25px;
        margin: 0 auto;
        width: 100px;
        height: 100px;
        border: 5px solid rgb(212, 110, 110);
        box-shadow: 0px 0px 10px 10px rgba(117, 81, 81, 0.081);
        user-select: none;
        -webkit-user-drag: none;
        -moz-user-select: none;
        opacity: 0;
    }
    #pfp.loaded {
        opacity: 1;
        animation: 1s pfpIn ease-in-out;
    }
    @keyframes pfpIn {
        0% {
            opacity: 0;
            transform: scale(1.1);
            border-color: none;
        }
        70% {
            opacity: 1;
        }
        100% {
            border-color: rgb(212, 110, 110);
            transform: scale(1);
        }
    }

    #name {
        position: absolute;
        top: 10px;
        left: 15px;
        font-family: Atkinson Hyperlegible Mono, Montserrat;

        span {
            font-weight: 900;
        }
    }

    .sideButton {
        background-color: rgb(58, 57, 57);
        margin-left: -15px;
        transform: scale(0.9);
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 6px;
        cursor: pointer;
    }
</style>

<header style:margin-bottom=30px>
    <h1 style:user-select="none" style:font-size="40px" style:margin-top="45px">
        <img 
            style="max-height:40px; margin-left: 5px; margin-right: 5px; transform: translateY(5px); padding: 0; display:inline" 
            src="https://assets.hackclub.com/icon-rounded.png" 
            alt="" 
        />
        <span style:font-family="Host Grotesk, Montserrat" style:color="black">Jumbotron</span>
    </h1>
    <h2 style:margin-top=3px style:font-size=20px>{eventName} Organizer Console</h2>
</header>
<div id="name">Logged in as <br><span>{internal.name}</span>
    {#if internal.slack == "U08EMT46G3V"} <!-- This can be modified to be dynamic list in the future -->
        <br>
        <button class="sideButton" style:margin-bottom=0px onclick={() => {
            admin = !admin;
            if (admin) fetchAllEvents();
        }}>{(admin) ? "Switch to Organizer" : "Switch to Admin"}</button>
    {/if}
    {#if internal.initComplete && !admin}
    <br>
    <button class="sideButton">Merge Events</button>
    {/if}
</div>

<img id="pfp" class:loaded={pfpLoaded} onload={() => {pfpLoaded = true}} src="https://cachet.hackclub.com/users/{internal.slack}/r" alt="Profile" />
<p style:margin-bottom=40px><button onclick={() => {localStorage.removeItem("creds"); localStorage.removeItem("cityName"); window.location.replace("/")}}>
    <svg style="display: block; margin: 0 auto;" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="1.414" xmlns="http://www.w3.org/2000/svg" aria-label="view-back" viewBox="0 0 32 32" preserveAspectRatio="xMidYMid meet" fill="currentColor" width="30" height="30"><path d="M19.768,23.89c0.354,-0.424 0.296,-1.055 -0.128,-1.408c-1.645,-1.377 -5.465,-4.762 -6.774,-6.482c1.331,-1.749 5.1,-5.085 6.774,-6.482c0.424,-0.353 0.482,-0.984 0.128,-1.408c-0.353,-0.425 -0.984,-0.482 -1.409,-0.128c-1.839,1.532 -5.799,4.993 -7.2,6.964c-0.219,0.312 -0.409,0.664 -0.409,1.054c0,0.39 0.19,0.742 0.409,1.053c1.373,1.932 5.399,5.462 7.2,6.964l0.001,0.001c0.424,0.354 1.055,0.296 1.408,-0.128Z"/></svg>
    Sign out
</button></p>

{#if !admin}
<div id="main" class="config" style:background-color="white" style:border-color="rgb(230,230,230)" style:box-shadow="0px 0px 10px 5px rgba(0,0,0, 0.3)">
    <h3>Main Configuration</h3>
    <Main />
</div>
{#if internal.initComplete}
<p style:margin-top=50px style:font-family="Atkinson Hyperlegible Mono, Montserrat" style:font-weight=700>If you close this tab, participants will be shown the last updated information</p>
<div transition:slide id="events" class="config">
    <h3>Announcements and Events</h3>
    <p>Display real-time information easily</p>
    <Announcements />

</div>
<div transition:slide id="presentations" class="config">
    <h3>Presentations</h3>
    <p>Display slides and documents, videos, and websites</p>
    <Slides />
</div>
{:else}
<p style:margin-top=50px><span style:font-size=50px class="material-symbols-outlined" translate="no">arrow_circle_up</span></p>
<p style:font-family="Atkinson Hyperlegible Mono, Montserrat" style:font-weight=700>Please complete the quick configuration steps above</p>
{/if}

<div id="liveshareNotif" class:away={false} class:active={internal.initComplete} class:up={!isSyncActive} class:pause={isPaused}>
    <p style:color="white"><strong><span translate="no" class="material-symbols-outlined">podcasts</span></strong></p>
</div>

<div id="syncingNotif" class:active={sync.slides || sync.announcements}>
    <p style:color="white"><strong><span translate="no" class="material-symbols-outlined">sync</span></strong></p>
</div>
{:else if admin}
<div class="config admin-box" style:background-color="white" style:border-color="rgb(230,230,230)" style:box-shadow="0px 0px 10px 5px rgba(0,0,0, 0.3)">
    <h3 style:font-family="Atkinson Hyperlegible Mono, Montserrat" style:font-weight=800>Administrator Control Panel</h3>

    {#if adminError}
        <p class="error-msg">{adminError}</p>
    {/if}
    {#if adminMessage}
        <p class="success-msg">{adminMessage}</p>
    {/if}


    <div style:display="flex" style:justify-content="center">
        <div style="margin-top: 25px;">
            <h4 style="margin-bottom: 8px;">Ban / Terminate User (Slack ID)</h4>
            <p><input type="text" placeholder="Enter Slack ID" bind:value={targetBanSlack} />
            <button onclick={() => banSpecificUser(targetBanSlack)}>Ban & Terminate</button></p>
        </div>

        <div style="margin-top: 25px;">
            <h4 style="margin-bottom: 8px;">Unban User (Slack ID)</h4>
            <p><input type="text" placeholder="Enter Slack ID" bind:value={targetUnbanSlack} />
            <button onclick={() => unbanSpecificUser(targetUnbanSlack)} style="background-color: rgb(46, 204, 113);">Unban User</button></p>
        </div>
    </div>

    <div style="margin-top: 25px;">
        <h4 style="margin-bottom: 5px;">Current Banned Slack IDs:</h4>
        <p style="font-family: monospace; font-weight: bold;">{bannedList && bannedList.length > 0 ? bannedList.join(", ") : "None"}</p>
    </div>

    <div style="margin-top: 25px;">
        <h4 style="margin-bottom: 5px;">Active Tokens Database (JSON)</h4>
        <textarea bind:value={allEventsList}></textarea>
        <div style="margin-top: 12px;">
            <button onclick={() => {window.navigator.clipboard.writeText(allEventsList)}}>Copy JSON</button>
            <button onclick={saveAllEvents}>Save & Replace JSON</button>
            <button onclick={fetchAllEvents} style="background-color: rgb(110, 108, 108); margin-left: 10px;">Refresh Data</button>
        </div>
    </div>
</div>

<div class="config">
    <div style="margin-top: 25px;">
        <h4 style="margin-bottom: 8px;">Fetch Packet by Code</h4>
        <p>
            <input type="text" placeholder="Enter Code" bind:value={packetLookupCode} />
            <button onclick={() => fetchPacketByCode(packetLookupCode)} style="background-color: rgb(52, 152, 219);">Fetch Packet</button>
        </p>
        {#if packetError}
            <p class="error-msg">{packetError}</p>
        {/if}
        {#if packetResultData}
            <div style="margin-top: 10px; display: flex; justify-content: center">
                <textarea readonly bind:value={packetResultData} style="height: 150px;"></textarea>
                <p><button style="margin-top: 8px;" onclick={() => {window.navigator.clipboard.writeText(packetResultData)}}>Copy Packet JSON</button></p>
            </div>
        {/if}
    </div>
</div>
{/if}