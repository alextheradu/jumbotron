<script>
    import { base } from "$app/paths";
    import { page } from "$app/state";
    import { onMount } from "svelte";

    import { slide } from "svelte/transition";

    import { eventName } from "$lib/event";
    import { internal } from "$lib/liveshare.svelte";

    import { sync } from "$lib/sync.svelte.js";
    import { tutorial } from "$lib/sync.svelte.js";

    let code = $state("0967");
    function codeToLink() {
        return `jumbotron.hackclub.com/?code=${code}`
    }

    let cityName = $state("");

    onMount(function() {
        localStorage.setItem("jumbotron.error", "");
       setTimeout(function() {localStorage.setItem("jumbotron.sync", true)}, 1000);
       setTimeout(function() {localStorage.setItem("jumbotron.sync", false);}, 2000);
    })

    function openDisplay() {
        window.open(base + "/" + page.params.city + "/display", "_blank");
        setTimeout(function() {localStorage.setItem("jumbotron.sync", true);}, 2000);
       setTimeout(function() {localStorage.setItem("jumbotron.sync", false);}, 3000);
    }
    function syncDisplay() {
        sync.enabled = true;
        document.getElementById("sync").disabled = true;
        setTimeout(function() {localStorage.setItem("jumbotron.sync", true)}, 2000)
        setTimeout(function() {sync.enabled = false; document.getElementById("sync").disabled = false; localStorage.setItem("jumbotron.sync", false)}, 3000)
    }
    function fullscreen() {
        document.documentElement.requestFullscreen();
    }

    async function initializeEvent() {
        cityName = cityName.substring(0, 1).toLocaleUpperCase() + cityName.substring(1);
        internal.cityName = cityName;
        internal.initComplete = true;

        await fetch("https://api.jumbotron.hackclub.com/initEvent", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "slack": "U8889",
                "token": "9990",
                "cityName": cityName
            })
        })
    }
    function resetInit() {
        cityName = "";
        internal.cityName = "";
        internal.initComplete = false;
    }

</script>
<style>
    button {
        background-color: rgb(92, 89, 89);
    }
    
    @keyframes codeLoadAnimation {
        0% {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
        }
        100% {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    #code {
        font-family: Host Grotesk, Montserrat;
        font-size: 40px;
        animation: codeLoadAnimation 0.4s ease-out forwards;
    }
    form {
        input[type="text"] {
            border-radius: 10px;
            background-color: rgb(225, 225, 225);
            width: 40%;
            font-family: Atkinson Hyperlegible Mono, Montserrat
        }
        input[type="submit"] {
            width: 200px;
            cursor: pointer;
            transition: all 0.15s ease-in-out;
            background-color: #ec374ff2;
            color: white;
            font-family: Montserrat;
            font-weight: 600;
        }
        input[type="submit"]:hover {
            transform: scale(1.05);
        }
    }

    #copyButton:active {
        background-color: #ec374ff2;
    }
</style>
<h4 id="code">{code}</h4>
<h4><span translate="no">{codeToLink()}</span> <button onclick={() => {navigator.clipboard.writeText(codeToLink())}} id="copyButton">Copy Link</button></h4>
<p style="margin-left: 40px; margin-right: 40px;">This is the four-digit code that event participants can use on <a href="https://jumbotron.hackclub.com">the main page</a>. Participants can additionally use the provided link directly. It is specific to you as an organizer, not your event, and is assigned to you for the entirety of {eventName}.</p>
{#if !internal.initComplete}
<form transition:slide style:margin-top=50px onsubmit={() => {event.preventDefault(); initializeEvent();}}>
    <input required="true" aria-required="true" bind:value={cityName} type="text" aria-placeholder="Enter city or location name" placeholder="*Enter city or location name" autocapitalize="words">
    {#if cityName.length != 0}<p>Your event is referred to as <u><strong>{eventName} {cityName}</strong></u></p>
    <input type="radio" id="coc" required="true">
    <input type=submit value="Continue">
    {:else}<p>Your event is referred to as {eventName}...</p>
    {/if}
</form>
{:else}
<p><button onclick={resetInit}>Reset Configuration for {eventName} {internal.cityName}</button></p>
<p>Resetting won't change your 4-digit code.</p>
{/if}