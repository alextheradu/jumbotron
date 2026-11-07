<script>
    import { base } from "$app/paths";
    import { page } from "$app/state";
    import { slide } from "svelte/transition";
    import { onMount } from "svelte";

    import { liveshareData, updateAPI, sync, internal } from "$lib/liveshare.svelte.js"

    let consoleMode = $state(0);

    let announcementTitle = $state("");
    let announcementMessage = $state("");
    let eventsTitle = $state("");

    let eventTimeInput = $state([9,30])
    if (true) {
        let clock = new Date();
        eventTimeInput[0] = clock.getHours();
        eventTimeInput[1] = clock.getMinutes();
    }

    let time = new Date();
    let placeholderTime = $state("09:30"); 

    let pmString = $state("AM");
    let pmMax = $state(23);

    let timerID = "";
    let timerChange = 0;

    let announcementOn = $state(false);
    let eventOn = $state(false);

    // AI Generated - Callable function to populate inputs from current liveshareData (announcements & events) on load
    function syncFromLiveshare() {
        if (liveshareData.announcement) {
            announcementTitle = liveshareData.announcement.title || "";
            announcementMessage = liveshareData.announcement.message || "";
            announcementOn = true;
        }

        if (liveshareData.event) {
            eventsTitle = liveshareData.event.title || "";
            eventOn = true;
            
            // Optional: If you also want to restore the time input array from liveshareData.event.time string
            if (liveshareData.event.time) {
                let parts = liveshareData.event.time.split(" "); // splits time and optional AM/PM
                let timeParts = parts[0].split(":");
                if (timeParts.length === 2) {
                    eventTimeInput[0] = parseInt(timeParts[0]) || 9;
                    eventTimeInput[1] = (parseInt(timeParts[1]) != 0) ? (parseInt(timeParts[1]) || 30) : "00";
                }
                if (parts[1]) {
                    pmString = parts[1];
                }
            }
        }
    }

    onMount(() => {
        // Run sync on initial load to pull existing liveshareData into the form
        let clock = new Date();
        if (clock.getHours() >= 12) {
            pmString = "PM";
        }
        sanitizeTime();
    });

    $effect.root(() => {
        $effect(() => {
            if (internal.importedSync) {
                syncFromLiveshare();
            }
        })
    })

    function toggle(type) {
        if (type == 0) {
            if (announcementOn) {
                announcementOn = false;
                liveshareData.announcement = null;
            }
            else {
                announcementOn = true;
                liveshareData.announcement = {
                    title: announcementTitle,
                    message: announcementMessage
                }
            }
        }
        else if (type == 1) {
            if (eventOn) {
                eventOn = false;
                liveshareData.event = null;
            }
            else {
                eventOn = true;
                liveshareData.event = {
                    title: eventsTitle,
                    time: formatTimeLabel(eventTimeInput)
                }
            }
        }
        syncAnnouncements(announcementOn, eventOn);
    }

    function update(type) {
        event.preventDefault();
        if (type == 0) {
            if (announcementMessage == "" && announcementTitle == "") {
                toggle(0);
            }
            else {
                syncAnnouncements(true, null);
            }
        }
        else if (type == 1) {
            if (eventsTitle == "" || eventTimeInput[0] === "" || eventTimeInput[1] === "") {
                toggle(1);
            }
            else {
                syncAnnouncements(null, true);
            }
        }
    }

    function sanitizeTime() {
        if (parseInt(eventTimeInput[0]) == 0 && formatLabel == "AM/PM" && pmString == "AM") {
            eventTimeInput[0] = 12;
        }
        if (eventTimeInput[0] < 0) {
            eventTimeInput[0] = 12;
        }
        if (eventTimeInput[0] > 24) {
            eventTimeInput[0] = 12;
        }
        if (eventTimeInput[1] < 0) {
            eventTimeInput[1] = 0;
        }
        if (eventTimeInput[1] == 60) {
            eventTimeInput[0] += 1;
            eventTimeInput[1] = 0;
            sanitizeTime();
            return;
        }
        if (eventTimeInput[1] > 60) {
            eventTimeInput[1] = eventTimeInput[1]-60;
            eventTimeInput[0] += 1;
            sanitizeTime();
            return;
        }
        if (eventTimeInput[0] <= 9 && formatLabel == "International") {
            if ((eventTimeInput[0] + "").length != 2) {
                eventTimeInput[0] = "0" + eventTimeInput[0];
            }
        }
        if (eventTimeInput[1] <= 9) {
            if ((eventTimeInput[1] + "").length != 2) {
                eventTimeInput[1] = "0" + eventTimeInput[1];
            }
        }
    }

    let formatLabel = $state("International")
    function switchFormat() {
        if (formatLabel === "AM/PM") {
            formatLabel = "International";
            pmMax = 23;

            if (pmString === "PM" && eventTimeInput[0] < 12) {
                eventTimeInput[0] += 12;
            } else if (pmString === "AM" && eventTimeInput[0] === 12) {
                eventTimeInput[0] = 0;
            }
            sanitizeTime();
        } else {
            formatLabel = "AM/PM";
            pmMax = 12;

            if (eventTimeInput[0] === 0) {
                eventTimeInput[0] = 12;
                pmString = "AM";
            } else if (eventTimeInput[0] === 12) {
                pmString = "PM";
            } else if (eventTimeInput[0] > 12) {
                eventTimeInput[0] -= 12;
                pmString = "PM";
            } else {
                pmString = "AM";
            }
            sanitizeTime();
        }
    }

    function formatTimeLabel(raw) {
        let minutes = String(raw[1]).padStart(2, "0");
        if (formatLabel == "International") {
            return raw[0] + ":" + minutes;
        } else {
            return raw[0] + ":" + minutes + " " + pmString;
        }
    }

    function formatToInternational() {
        let hours = parseInt(eventTimeInput[0]) || 0;
        let minutes = String(eventTimeInput[1] ?? 0).padStart(2, "0");

        if (formatLabel === "AM/PM") {
            if (pmString === "PM" && hours < 12) {
                hours += 12;
            } else if (pmString === "AM" && hours === 12) {
                hours = 0;
            }
        }

        return String(hours).padStart(2, "0") + ":" + minutes;
    }

    function syncAnnouncements(o1, o2) {
        sync.announcements = true;
        clearInterval(timerID);
        timerID = "";
        timerChange = 0;
        
        if (o1) {
            liveshareData.announcement = {
                title: announcementTitle,
                message: announcementMessage
            }
        }
        else if (o1 == false) {
            liveshareData.announcement = null;
        }
        
        if (o2) {
            setTimeout(setAlarm, 1000);
            liveshareData.event = {
                title: eventsTitle,
                time: formatTimeLabel(eventTimeInput)
            }
        }
        else if (o2 == false) {
            liveshareData.event = null;
        }

        setTimeout(function() {
            sync.liveshare = true;
        }, 2000);
        
        setTimeout(function() {
            sync.announcements = false; 
            sync.liveshare = false; 
            updateAPI();
        }, 3000);
    }

    function setAlarm() {
        if (
            eventsTitle === "" || 
            eventTimeInput[0] == null || eventTimeInput[0] === "" ||
            eventTimeInput[1] == null || eventTimeInput[1] === ""
        ) {
            return;
        }

        if (timerID) {
            clearInterval(timerID);
            timerID = "";
        }

        let goodFormat = formatToInternational(eventTimeInput);
        let hours = goodFormat.split(":")[0];
        let minutes = goodFormat.split(":")[1];
       
        let t1 = (parseInt(hours) * 60) + parseInt(minutes);
        let time = new Date();
        let t2 = (time.getHours() * 60) + time.getMinutes();

        timerID = setInterval(() => {
            time = new Date();
            t2 = (time.getHours() * 60) + time.getMinutes();
            let diff = t1 - t2;

            if (diff <= 0) {
                clearInterval(timerID);
                timerID = "";
            } else if (diff <= 30) {
                if (timerChange !== diff) {
                    timerChange = diff;
                }
            }
        }, 2000);
    }

    onMount(async () => {
        const is24Hour = !new Intl.DateTimeFormat(undefined, { hour: 'numeric' })
        .resolvedOptions()
        .hourCycle.startsWith('h1');

        if (!is24Hour) {
            switchFormat();
        }
    })
</script>

<style>
    form {
        input, textarea {
            margin: 8px;
            border-radius: 15px;
            padding: 10px; 
            font-family: Atkinson Hyperlegible Mono;
            box-sizing: border-box;
        }
        textarea {
            width: calc(100% - 100px);
            resize: vertical;
            min-height: 40px;
        }
    }
    button {
        background-color: rgb(92, 89, 89);
    }
    button.disabled {
        cursor: progress;
    }
    button.incomplete {
        cursor: not-allowed
    }

    button.option {
        background-color: white;
        color: rgb(97, 96, 96);
        font-family: Atkinson Hyperlegible Mono, Montserrat;
    }
    h4 {
        margin-top: 35px;
    }

    .box {
        border-radius: 5px;
    }
    #number1 {
        margin-right: 0;
        width: 60px;
    }
    #number2 {
        margin-left: 0;
        margin-right: 0;
        width: 60px;
    }
    .pushLeft {
        margin-right: 15px !important;
    }
    button.box {
        padding: 5px;
        margin-left: 0;
    }
</style>

<table style:margin-top=0px style:margin-bottom=5px>
    <tbody>
        <tr>
            <td>
                <p>
                    <button class="bigButton" class:toggleOn={consoleMode == 1} title="Configure Announcement" onclick={() => {consoleMode == 1 ? consoleMode = 0 : consoleMode = 1}}><span translate="no" class="material-symbols-outlined">campaign</span></button>
                    <button class="bigButton" class:toggleOn={consoleMode == 2} title="Configure Event" onclick={() => {consoleMode == 2 ? consoleMode = 0 : consoleMode = 2}}><span translate="no" class="material-symbols-outlined">calendar_add_on</span></button>
                </p>
            </td>
        </tr>
        {#if consoleMode == 1}
        <tr>
            <td>
                <div class="subconsole">
                    <h4>Announcements</h4>
                    <p>One or both fields must contain content in order to display</p>
                    <form>
                        <textarea required bind:value={announcementTitle} placeholder="Title" rows="1"></textarea><br>
                        <textarea required bind:value={announcementMessage} class="bigInput" placeholder="Message" rows="2"></textarea>
                        <br>
                        {#if !announcementOn}<button disabled={sync.announcements || (announcementMessage == "" && announcementTitle == "")} onclick={function() {toggle(0);}} class:disabled={sync.announcements} class:incomplete={announcementMessage == "" && announcementTitle == ""}>Display Announcement</button>{:else}<button disabled={sync.announcements} onclick={function() {toggle(0);}} class:disabled={sync.announcements}>Hide Announcement</button> <button disabled={sync.announcements} onclick={function() { update(0)}} class:disabled={sync.announcements}>Sync Announcement</button>{/if}
                    </form>
                    <p style:font-family="Atkinson Hyperlegible Mono">For participant accessibility please avoid emoticons, ASCII art and bad formatting </p>
                </div>
            </td>
        </tr>
        {:else if consoleMode == 2}
        <tr>
            <td>
                <div class="subconsole">
                    <h4>Scheduled Event</h4>
                    <p>International Format will display the time of your event in the 24-hour clock; AM/PM format will display the time of your event in the 12-hour clock.</p>
                    <form>
                        <input bind:value={eventsTitle} type="text" placeholder="Title">
                        
                        <input type="number" min={pmMax == 12 ? 1 : 0} max={pmMax} onblur={sanitizeTime} class="box" id="number1" placeholder={placeholderTime.split(":")[0]} bind:value={eventTimeInput[0]}>
                        <span>:</span>
                        <input type="number" min=0 max=59 class="box" onblur={sanitizeTime} class:pushLeft={formatLabel == "International"} id="number2" placeholder={placeholderTime.split(":")[1]} bind:value={eventTimeInput[1]}>
                        {#if formatLabel == "AM/PM"}
                        <button type="button" class="box option" onclick={() => {pmString == "AM" ? pmString = "PM" : pmString = "AM"}}>{pmString}</button>
                        {/if}
                        <button type="button" style:margin-left=10px disabled={sync.announcements} class="option" onclick={switchFormat}> Displaying {formatLabel}</button>

                        <br>
                        {#if !eventOn}<button disabled={sync.announcements || eventsTitle == "" || eventTimeInput[0] === "" || eventTimeInput[1] === ""} onclick={function() {sanitizeTime(); toggle(1);}} class:disabled={sync.announcements} class:incomplete={eventsTitle === "" || eventTimeInput[0] === "" || eventTimeInput[1] === ""}>Display Event</button>{:else}<button disabled={sync.announcements} onclick={function() { sanitizeTime(); update(1)}} class:disabled={sync.announcements}>Sync Event</button> <button disabled={sync.announcements} onclick={function() {toggle(1);}} class:disabled={sync.announcements}>Hide Event</button>{/if}
                    </form>
                    <p style:font-family="Atkinson Hyperlegible Mono">For participant accessibility please avoid emoticons, ASCII art and bad formatting </p>
                </div>
            </td>
        </tr>
        {/if}
    </tbody>
</table>