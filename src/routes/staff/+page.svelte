<script>
    import { base } from "$app/paths";
    import { page } from "$app/state";
    import { onMount } from "svelte";
    import { eventName } from "$lib/event";

    import { slide } from "svelte/transition";

    // Components
    import Main from "$lib/configs/main.svelte";
    import Announcements from "$lib/configs/announcements.svelte";
    import Slides from "$lib/configs/slides.svelte";
    import { internal } from "$lib/liveshare.svelte";

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
                const response = await fetch(`https://api.jumbotron.hackclub.com/getLocation?code=${internal.code}`)
                if (!response.ok) {
                    return;
                }
                let data = await response.json();
                if (!data.name || data.name == "None" || data.name.trim() == "") {
                    return;
                }
                else {
                    internal.cityName = data.name;
                    internal.initComplete = true;
                }
            }
        }
        else {
            window.location.href = "/";
            return;
        }
    })
    
    // Static placeholder constants
    const liveshareEnabled = false;
    const liveshareAway = false;
    const isOpenGate = false;
    const isPaused = false;
    const isSyncActive = false;

    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                const wakeLock = await navigator.wakeLock.request('screen');
                console.log("WakeLock enabled");
                
                wakeLock.addEventListener("release", () => {
                    console.log("WakeLock was released");
                });
            } catch (err) {
                console.error(`${err.name}, ${err.message}`);
            }
        }
    }

    onMount(() => {
        requestWakeLock();

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                await requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    });

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
        font-family: Atkinson Hyperlegible Mono;

        span {
            font-weight: 900;
        }
    }

</style>

<header style:margin-bottom=30px>
    <h1 style:user-select="none" style:font-size="40px" style:margin-top="45px">
        <img 
            style="max-height:40px; margin-left: 5px; margin-right: 5px; transform: translateY(5px); padding: 0; display:inline" 
            src="https://assets.hackclub.com/icon-rounded.png" 
            alt="" 
        />
        <span style:font-family="Host Grotesk" style:color="black">Jumbotron</span>
    </h1>
    <h2 style:margin-top=3px style:font-size=20px>{eventName} Organizer Console</h2>
</header>
<div id="name">Logged in as <br><span>{(internal.name)}</span></div>
<!--<svg style="display: block; margin: 0 auto" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="1.414" xmlns="http://www.w3.org/2000/svg" aria-label="admin" viewBox="0 0 32 32" preserveAspectRatio="xMidYMid meet" fill="currentColor" width="100" height="100"><path d="M21.437 17.023a1 1 0 0 1 .785.977v2.2H23a1 1 0 0 1 .907 1.42l-2.222 4.8a1 1 0 0 1-1.907-.42v-2.2H19a1 1 0 0 1-.907-1.42l2.222-4.8a1 1 0 0 1 1.122-.557zM19.834 16.977C20.714 16.173 21 14.873 21 13a5 5 0 0 0-10 0c0 1.873.286 3.173 1.165 3.977a8.029 8.029 0 0 0-3.6 4.062c-.162.408-.213.939.162 1.168.792.485 1.632-.457 2.105-1.257a5.997 5.997 0 0 1 5.48-2.942c1.132.058 2.373-.055 3.24-.784a8.75 8.75 0 0 0 .282-.247zM19 13c0 1.683-.271 2.241-.47 2.456-.162.176-.68.544-2.53.544-1.85 0-2.368-.368-2.53-.544C13.27 15.24 13 14.683 13 13a3 3 0 1 1 6 0z"/></svg>-->
<img id="pfp" class:loaded={pfpLoaded} onload={() => {pfpLoaded = true}} src="https://cachet.hackclub.com/users/{internal.slack}/r" alt="Profile" />
<p style:margin-bottom=40px><button onclick={() => {localStorage.removeItem("creds"); localStorage.removeItem("cityName"); window.location.href = base + "/"}}>
    <svg style="display: block; margin: 0 auto;" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="1.414" xmlns="http://www.w3.org/2000/svg" aria-label="view-back" viewBox="0 0 32 32" preserveAspectRatio="xMidYMid meet" fill="currentColor" width="30" height="30"><path d="M19.768,23.89c0.354,-0.424 0.296,-1.055 -0.128,-1.408c-1.645,-1.377 -5.465,-4.762 -6.774,-6.482c1.331,-1.749 5.1,-5.085 6.774,-6.482c0.424,-0.353 0.482,-0.984 0.128,-1.408c-0.353,-0.425 -0.984,-0.482 -1.409,-0.128c-1.839,1.532 -5.799,4.993 -7.2,6.964c-0.219,0.312 -0.409,0.664 -0.409,1.054c0,0.39 0.19,0.742 0.409,1.053c1.373,1.932 5.399,5.462 7.2,6.964l0.001,0.001c0.424,0.354 1.055,0.296 1.408,-0.128Z"/></svg>
    Sign out
</button></p>

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
    <p>Display slides, documents, and videos</p>
    <Slides />
</div>
{:else}
<p style:margin-top=50px><span style:font-size=50px class="material-symbols-outlined" translate="no">arrow_circle_up</span></p>
<p style:font-family="Atkinson Hyperlegible Mono, Montserrat" style:font-weight=700>Please complete the quick configuration steps above</p>
{/if}

<div id="liveshareNotif" class:away={false} class:active={internal.initComplete} class:up={!isSyncActive} class:pause={isPaused}>
    <p style:color="white"><strong><span translate="no" class="material-symbols-outlined">podcasts</span></strong></p>
</div>

<div id="syncingNotif" class:active={isSyncActive}>
    <p style:color="white"><strong><span translate="no" class="material-symbols-outlined">sync</span></strong></p>
</div>