<script>
    import { resolve } from "$app/paths";
    import { eventName } from "$lib/event";
    import { onMount } from "svelte";

    let failed = $state(false);
    let cityName = $state("");
    let code = "";
    let updateNotification = $state("");

    // Reactive state for all possible liveshare items
    let liveshareData = $state({
        announcement: "",
        event: "",
        file: "",
        youtube: "",
        website: ""
    });

    // Safely handles both objects and strings to prevent JSON.parse crashes
    function parsePacket(rawPacket) {
        if (!rawPacket) return;
        try {
            const parsed = typeof rawPacket === "string" ? JSON.parse(rawPacket) : rawPacket;
            if (parsed) {
                // Normalize incoming fields or fallback to empty strings
                const newAnnouncement = parsed.announcement || "";
                const newEvent = parsed.event || "";
                const newFile = parsed.file || "";
                const newYoutube = parsed.youtube || "";
                const newWebsite = parsed.website || "";

                // Deep compare to check if anything in liveshareData actually changed
                const hasChanged = 
                    JSON.stringify(newAnnouncement) !== JSON.stringify(liveshareData.announcement) ||
                    JSON.stringify(newEvent) !== JSON.stringify(liveshareData.event) ||
                    JSON.stringify(newFile) !== JSON.stringify(liveshareData.file) ||
                    JSON.stringify(newYoutube) !== JSON.stringify(liveshareData.youtube) ||
                    JSON.stringify(newWebsite) !== JSON.stringify(liveshareData.website);

                // Update reactive state
                liveshareData.announcement = newAnnouncement;
                liveshareData.event = newEvent;
                liveshareData.file = newFile;
                liveshareData.youtube = newYoutube;
                liveshareData.website = newWebsite;

                // Trigger notification ONLY if content genuinely changed
                if (hasChanged) {
                    updateNotification = "New information has been updated for this event.";

                    setTimeout(() => {
                        updateNotification = ""; 
                    }, 5000);
                }
            }
        } catch (e) {
            console.error("Failed to parse packet data:", e, rawPacket);
        }
    }

    onMount(() => {
        const savedPacket = sessionStorage.getItem("eventPacket");
        const savedCode = sessionStorage.getItem("eventCode");

        if (!savedCode) {
            failed = true;
            return;
        }

        code = savedCode;

        try {
            const initialPayload = JSON.parse(savedPacket);
            cityName = initialPayload.cityName || "";
            parsePacket(initialPayload.data);
        } catch (e) {
            console.error("Failed to parse initial session packet", e);
        }

        // Establish SSE connection
        const eventSource = new EventSource(`https://api.jumbotron.hackclub.com/getSession?code=${code}`, {
            withCredentials: true
        });

        eventSource.onopen = () => {
            console.log("SSE connected")
        };

        eventSource.onerror = (error) => {
            console.error("SSE error:", {
                error,
                readyState: eventSource.readyState,
                url: eventSource.url
            });

            if (eventSource.readyState === EventSource.CLOSED) {
                failed = true;
            }
        };

        eventSource.onmessage = (event) => {
            console.log("SSE MESSAGE RECEIVED:", event.data);
            try {
                const payload = JSON.parse(event.data);
                if (payload.cityName) {
                    cityName = payload.cityName;
                }
                parsePacket(payload.data);
                console.log("Liveshare data updated in real-time", liveshareData);
            } catch (err) {
                console.error("Failed to parse incoming SSE message", err);
            }
        };

        // Cleanup on unmount
        return () => {
            eventSource.close();
        };
    });
</script>

<svelte:head>
    <title>Jumbotron - Portal</title>
</svelte:head>

<style>
    #body {
        margin-top: 40px;
        max-width: 800px;
        margin-inline: auto;
        padding: 0 20px;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    .box {
        border: 2px solid #e0e0e0;
        padding: 20px;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
    }
    .box h3 {
        margin-top: 0;
        color: #ec374f;
        font-family: 'Host Grotesk', Montserrat, sans-serif;
    }
    .empty-state {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 40px;
    }
    header {
        text-align: center;
    }
    .toast-banner {
        background-color: #f4c5c5;
        color: #3a0f0f;
        border: 1px solid #ffeeba;
        padding: 10px 15px;
        border-radius: 8px;
        text-align: center;
        font-weight: 500;
        margin-bottom: 10px;
        font-family: Atkinson Hyperlegible Mono, Montserrat;
    }
</style>

<header id="header">
    <h1 style:user-select="none" style:font-size="40px" style:margin-top="45px" style:margin-bottom="15px">
        <img 
            style="max-height:40px; margin-left: 5px; margin-right: 5px; transform: translateY(5px); padding: 0; display:inline" 
            src="https://assets.hackclub.com/icon-rounded.png" 
            alt="Hack Club Logo" 
        />
        <span style:font-family="Host Grotesk, Montserrat" style:color="black">Jumbotron</span>
    </h1>
    <h2 style:margin-top="3px" style:font-size="20px">{eventName} {cityName} Portal</h2>
    <p style:margin-bottom="30px">
        <button onclick={() => {
            sessionStorage.removeItem("eventCode"); 
            sessionStorage.removeItem("eventPacket"); 
            window.location.replace("/");
        }} aria-label="Return to home page">
            <svg style="display: block; margin: 0 auto;" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="1.414" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" preserveAspectRatio="xMidYMid meet" fill="currentColor" width="30" height="30" aria-hidden="true">
                <path d="M19.768,23.89c0.354,-0.424 0.296,-1.055 -0.128,-1.408c-1.645,-1.377 -5.465,-4.762 -6.774,-6.482c1.331,-1.749 5.1,-5.085 6.774,-6.482c0.424,-0.353 0.482,-0.984 0.128,-1.408c-0.353,-0.425 -0.984,-0.482 -1.409,-0.128c-1.839,1.532 -5.799,4.993 -7.2,6.964c-0.219,0.312 -0.409,0.664 -0.409,1.054c0,0.39 0.19,0.742 0.409,1.053c1.373,1.932 5.399,5.462 7.2,6.964l0.001,0.001c0.424,0.354 1.055,0.296 1.408,-0.128Z"/>
            </svg>
            Return Home
        </button>
    </p>
</header>

{#if failed}
    <h3 role="alert" style="text-align: center;">No event was saved, or the connection to the server failed. You can try re-entering the code <a href={resolve("/")}>here</a> or ask an organizer.</h3>
{:else if failed == null}
    <h3 role="alert" style="text-align: center;">This event isn't initialized yet, try again soon or ask an organizer.</h3>
{:else}
    <main id="body" aria-live="polite" aria-atomic="false" role="region" aria-label="Live event data stream">
        
        <!-- Live notification banner for updates -->
        {#if updateNotification}
            <div class="toast-banner" role="status" aria-live="assertive">
                {updateNotification}
            </div>
        {/if}

        <!-- Check if all fields are empty -->
        {#if !liveshareData.announcement && !liveshareData.event && !liveshareData.file && !liveshareData.youtube && !liveshareData.website}
            <div class="box empty-state" role="status">
                <p>Waiting for organizer updates...</p>
            </div>
        {/if}

        <!-- 1. Announcement Box -->
        {#if liveshareData.announcement}
            <section class="box" aria-label="Current Announcement">
                <h3>Announcement</h3>
                <p style:font-size=23px><strong>{liveshareData.announcement.title}</strong></p>
                <p>{liveshareData.announcement.message}</p>
            </section>
        {/if}

        <!-- 2. Event Box -->
        {#if liveshareData.event}
            <section class="box" aria-label="Event Details">
                <h3>Event Information</h3>
                <p style:font-size=23px><strong>{liveshareData.event.title}</strong></p>
                <p><span style:font-family="Atkinson Hyperlegible Mono">Occuring at {liveshareData.event.time}</span></p>
            </section>
        {/if}

        <!-- 3. File / Document Box -->
        {#if liveshareData.file}
            <section class="box" aria-label="Shared Document">
                <h3>Shared Document or Slides</h3>
                <p>A document is being displayed</p>
                <p>
                    <a href={liveshareData.file} target="_blank" rel="noopener noreferrer" aria-label="Open shared file in a new tab">
                        <button>Preview Document or Slides</button>
                    </a>
                </p>
            </section>
        {/if}

        <!-- 4. YouTube Box -->
        {#if liveshareData.youtube}
            <section class="box" aria-label="Featured Video">
                <h3>YouTube Video</h3>
                <p>A YouTube video is being shown</p>
                <p>
                    <a href={liveshareData.youtube.url} target="_blank" rel="noopener noreferrer" aria-label="Watch YouTube video in a new tab">
                        <button>Watch Video</button>
                    </a>
                </p>
            </section>
        {/if}

        <!-- 5. Website Box -->
        {#if liveshareData.website}
            <section class="box" aria-label="Shared Website">
                <h3>Shared Website</h3>
                <p>A website is being shown</p>
                <p>
                    <a href={liveshareData.website} target="_blank" rel="noopener noreferrer" aria-label="Open shared website link in a new tab">
                        <button>See Website</button>
                    </a>
                </p>
            </section>
        {/if}

    </main>
{/if}