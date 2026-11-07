<script>
    import { base } from "$app/paths";
    import { page } from "$app/state";
    import { onMount } from "svelte";

    import { slide } from "svelte/transition";

    import { eventName } from "$lib/event";
    import { internal, liveshareData, updateAPI, sync } from "$lib/liveshare.svelte";

    function codeToLink() {
        return `jumbotron.hackclub.com/?code=${internal.code}`
    }

    let cityName = $state("");

    async function initializeEvent() {
        cityName = cityName.substring(0, 1).toLocaleUpperCase() + cityName.substring(1);
        internal.cityName = cityName;
        internal.initComplete = true;

        const response = await fetch("https://api.jumbotron.hackclub.com/initEvent", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "code": internal.code,
                "password": internal.password,
                "cityName": cityName
            })
        })
        const data = await response.json();
        console.log(data);
        localStorage.setItem("cityName", cityName);
    }
    function resetInit() {
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
<h4 id="code">{internal.code}</h4>
<h4><span style:font-family="Atkinson Hyperlegible Mono, Montserrat" translate="no">{codeToLink()}</span> {#if internal.code != null}<button transition:slide onclick={() => {navigator.clipboard.writeText(codeToLink())}} id="copyButton">Copy Link</button>{/if}</h4>
<p style="margin-left: 40px; margin-right: 40px;">This is the four-digit code that event participants can use on <a href="https://jumbotron.hackclub.com">the main page</a>. Participants can additionally use the provided link directly. <strong>It is specific to you as an organizer, not your event, and is assigned to you for the entirety of {eventName}.</strong></p>
{#if !internal.initComplete}
<form transition:slide style:margin-top=50px onsubmit={() => {event.preventDefault(); initializeEvent();}}>
    <input required="true" aria-required="true" bind:value={cityName} type="text" aria-placeholder="Enter city or location name" placeholder="*Enter city or location name" autocapitalize="words">
    {#if cityName.length != 0}<p>Your event is referred to as {" "}<u translate="no"><strong>{eventName} {cityName}</strong></u></p>
    <p style:font-family="Atkinson Hyperlegible Mono, Montserrat">Please ensure correct formatting. This will be visible to participants.</p>
    <input type=submit value="Continue">
    {:else}<p>Your event is referred to as {eventName}...</p>
    {/if}
</form>
{:else}
<p><button onclick={resetInit}>Reset Configuration for {eventName} {internal.cityName}</button></p>
<p>Resetting won't change your 4-digit code.</p>
{/if}