<script>
    import { base } from "$app/paths";
    import { page } from "$app/state";
    import { onMount } from "svelte";
    import { slide } from "svelte/transition";

    import { sync, liveshareData, updateAPI, internal } from "$lib/liveshare.svelte.js"

    let consoleMode = $state(0);

    let fileLink = $state("");
    let ytLink = $state("");
    let qrLink = $state("");

    $effect.root(() => {
        $effect(() => {
            if (internal.importedSync) {
                syncFromLiveshare();
            }
        })
    })

    function syncFromLiveshare() {
        if (liveshareData.file) {
            fileLink = liveshareData.file;
        }

        if (liveshareData.youtube) {
            // Handles both plain URL strings or object structures if saved previously
            ytLink = typeof liveshareData.youtube === 'object' ? liveshareData.youtube.url : liveshareData.youtube;
        }

        if (liveshareData.website) {
            qrLink = liveshareData.website;
        }
    }

    function enableFile() {
        sync.slides = true;
        let split = fileLink.split("/");
        let link = `https://drive.google.com/file/d/${split[5]}/preview`
        if (fileLink.indexOf("<iframe src=") != -1) {
            link = fileLink.split('"')[1];
        }
        if (fileLink.indexOf("/preview") != -1) {
            link = fileLink;
        }
        
        liveshareData.file = link;

        setTimeout(function() {sync.slides = false}, 1500);
        updateAPI();
    }

    function removeFile() {
        sync.slides = true;
        liveshareData.file = null;
        fileLink = "";

        setTimeout(function() {sync.slides = false}, 1500);
        updateAPI();
    }

    function enableYoutube() {
        sync.slides = true;
        let link = `https://www.youtube.com/embed/${getYTID(ytLink)}`
        
        liveshareData.youtube = { url: ytLink, embedUrl: link };

        setTimeout(function() {sync.slides = false}, 1500);
        updateAPI();
    }

    function removeYoutube() {
        sync.slides = true;
        liveshareData.youtube = null;
        ytLink = "";

        setTimeout(function() {sync.slides = false}, 1500);
        updateAPI();
    }

    function enableQR() {
        sync.slides = true;
        let link = qrLink;
        
        liveshareData.website = link;

        setTimeout(function() {sync.slides = false}, 1500);
        updateAPI();
    }

    function removeQR() {
        sync.slides = true;
        liveshareData.website = null;
        qrLink = "";

        setTimeout(function() {sync.slides = false}, 1500);
        updateAPI();
    }

    function getYTID(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }
</script>

<style>
    form {
        input {
            margin: 8px;
            border-radius: 15px;
            padding: 10px; 
        }
    }
    button {
        background-color: rgb(92, 89, 89);
    }
    button.disabled {
        cursor: progress;
    }
    h4 {
        margin-top: 35px;
    }
</style>

<div transition:slide>
    <p>
        <button class="bigButton" class:toggleOn={consoleMode == 1} onclick={() => {consoleMode == 1 ? consoleMode = 0 : consoleMode = 1}}><span class="material-symbols-outlined" title="Display Google Drive File" translate="no">drive_export</span></button>
        <button class="bigButton" class:toggleOn={consoleMode == 2} onclick={() => {consoleMode == 2 ? consoleMode = 0 : consoleMode = 2}}><span class="material-symbols-outlined" title="Display YouTube Video" translate="no">video_library</span></button>
        <button class="bigButton" class:toggleOn={consoleMode == 3} title="Configure QR Code" onclick={() => {consoleMode == 3 ? consoleMode = 0 : consoleMode = 3}}><span translate="no" class="material-symbols-outlined">qr_code</span></button>
    </p>

    {#if consoleMode == 1}
        <div class="subconsole">
            <h4>Google Drive Presentations and Files</h4>
            <p>Enter your file in Google Docs, open share, and <span class="key">copy link</span><br>Then, <span class="key">paste</span> the link below.</p>
            <form> 
                <input bind:value={fileLink} class="bigInput" type="url" placeholder="https://docs.google.com/file...">
            </form>
            {#if !liveshareData.file}<p>Attendees will only see the preview of your file, and not any internal comments or notes.</p>{/if}

            <p>
                <button onclick={enableFile} id="file" class:disabled={sync.slides} class:incomplete={fileLink.length == 0} disabled={sync.slides || fileLink.length == 0}>
                    {liveshareData.file ? 'Update File' : 'Display File'}
                </button>
                {#if liveshareData.file}
                    <button onclick={removeFile} class:disabled={sync.slides} disabled={sync.slides} style="background-color: rgb(150, 50, 50); margin-left: 10px;">Hide File</button>
                {/if}
            </p>
            {#if liveshareData.file}
                <p style:font-family="Atkinson Hyperlegible Mono">Attendees have unrestricted access to the file, and can progress through it independently.</p>
            {/if}
        </div>

    {:else if consoleMode == 2}
        <div class="subconsole">
            <h4>YouTube Videos</h4>
            <p><span class="key">Copy</span> the link of a YouTube video directly, and then <span class="key">paste</span> it below</p>
            <form> 
                <input bind:value={ytLink} class="bigInput" type="url" placeholder="https://www.youtube.com/watch...">
            </form>        
            <p>
                <button onclick={enableYoutube} id="youtube" class:disabled={sync.slides} class:incomplete={ytLink.length == 0} disabled={sync.slides || ytLink.length == 0}>
                    {liveshareData.youtube ? 'Update Video' : 'Display Video'}
                </button>
                {#if liveshareData.youtube}
                    <button onclick={removeYoutube} class:disabled={sync.slides} disabled={sync.slides} style="background-color: rgb(150, 50, 50); margin-left: 10px;">Hide Video</button>
                {/if}
            </p>
        </div>

    {:else if consoleMode == 3}
        <div class="subconsole">
            <h4>Website/Form</h4>
            <p><span class="key">Copy</span> and <span class="key">paste</span> your link below.</p>
            <form> 
                <input bind:value={qrLink} class="bigInput" type="url" placeholder="https://hackclub.com...">
            </form>       
            <p>
                <button onclick={enableQR} id="qrcode" class:disabled={sync.slides} class:incomplete={qrLink.length == 0} disabled={sync.slides || qrLink.length == 0}>
                    {liveshareData.website ? 'Update Site' : 'Display Site'}
                </button>
                {#if liveshareData.website}
                    <button onclick={removeQR} class:disabled={sync.slides} disabled={sync.slides} style="background-color: rgb(150, 50, 50); margin-left: 10px;">Hide Site</button>
                {/if}
            </p>
        </div>
    {/if}
</div>