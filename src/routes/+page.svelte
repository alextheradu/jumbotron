<script>
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import { onMount } from "svelte";
    import { eventName } from "$lib/event";
    import { fly, slide } from "svelte/transition";

    let showRedirectWarning = $state(false);
    let redirectReason = $state("");
    let redirectTimer = $state(null);

    let attendeeError = $state(null);

    onMount(async () => {
        let code = page.url.searchParams.get("code");
        if (code) {
            const response = await getPacket(code);
            if (response === false) {
                selectUserType("attendee");
                attendeeError = "This link is for an event that does not exist. Please enter the correct code below, or ask an organizer.";
            } else {
                sessionStorage.setItem("eventCode", code);
                redirectReason = "Redirecting based on the event code provided in your link.";
                showRedirectWarning = true;
                redirectTimer = setTimeout(() => {
                    window.location.href = resolve(`/attendee`);
                }, 5000);
            }
        } else if (localStorage.getItem("creds")) {
            /*
            redirectReason = "Redirecting based on your saved staff credentials.";
            showRedirectWarning = true;
            redirectTimer = setTimeout(() => {
                window.location.href = resolve("/staff");
            }, 5000);
            */
        }
    });

    async function getPacket(code) {
        try {
            const response = await fetch(`https://api.jumbotron.hackclub.com/getPacket?code=${code}`);
            const data = await response.json();

            if (!response.ok || data.error) {
                if (attendeeError == null) {
                    attendeeError = "No event was found under this code. Make sure you've entered it correctly, or ask an organizer.";
                }
                return false;
            }

            sessionStorage.setItem("eventPacket", JSON.stringify(data));
            sessionStorage.setItem("eventCode", code);
            return true;
        } catch (err) {
            attendeeError = "Failed to connect to the server. Please try again.";
            return false;
        }
    }

    function cancelRedirect() {
        if (redirectTimer) {
            clearTimeout(redirectTimer);
            redirectTimer = null;
        }
        showRedirectWarning = false;
        redirectReason = "";
    }

    // State to track which view/form is active: null, 'organizer', or 'attendee'
    let userType = $state(null); 

    function selectUserType(type) {
        userType = type;
        attendeeError = null; // Clear error when switching views
    }

    function resetSelection() {
        userType = null;
        attendeeError = null;
    }

    let widthVar = $state();

    // State for the 4-digit code inputs
    let digits = $state(['', '', '', '']);
    let inputElements = [];

    // Function to ensure the code is turned into a single string
    function getFullCode(input) {
        if (Array.isArray(input)) {
            return input.join('');
        }
        return String(input);
    }

    // Check if all 4 digits are filled out
    let isCodeComplete = $derived(digits.every(digit => digit !== ''));

    function handleInput(event, index) {
        const value = event.target.value;
        
        if (value.length > 1) {
            digits[index] = value[value.length - 1];
        }

        if (digits[index] && index < 3) {
            inputElements[index + 1].focus();
        }
    }

    function handleKeydown(event, index) {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            inputElements[index - 1].focus();
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const code = getFullCode(digits);
        attendeeError = null; 
        let success = await getPacket(code);
        if (success) {
            redirectReason = "Redirecting based on your successfully verified event code.";
            showRedirectWarning = true;
            redirectTimer = setTimeout(() => {
                window.location.href = resolve("/attendee");
            }, 5000);
        }
    }
</script>

<svelte:head>
    <title>Jumbotron - {userType ? (userType === 'organizer' ? 'Organizer Sign-In' : 'Participant Sign-In') : 'Welcome'}</title>
</svelte:head>

<svelte:window bind:innerWidth={widthVar}></svelte:window>

<style>
    .redirect-banner {
        background-color: rgba(180, 50, 50, 0.623);
        border: 4px solid rgb(246, 176, 106);
        border-radius: 20px;
        font-weight: 600;
        color: white;
        padding: 1rem 1.5rem;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        font-family: Atkinson Hyperlegible, Montserrat;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .redirect-banner button {
        background-color: white;
        color: #431d22;
        border: none;
        padding: 0.5rem 1rem;
        font-weight: bold;
        border-radius: 4px;
        cursor: pointer;
    }

    a {
        color: rgb(255, 223, 223);
    }
    #background {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        object-fit: cover;
        z-index: 0;
        user-select: none;
        -webkit-user-drag: none;
        -moz-user-drag: none;
    }

    #leftTree {
        z-index: 1;
        position: fixed;
        height: 100%;
        top: 0;
        left: 0;
        object-fit: cover;
        margin: 0 !important; 
        padding: 0;
    }

    #rightTree {
        object-fit: cover;
        z-index: 0;
        position: fixed;
        height: 100%;
        top: 0;
        right: 0;
        margin: 0 !important; 
        padding: 0;
    }

    #pudding {
        z-index: 1000;
        position: fixed;
        bottom: 0;
        transform: translate(-50%, 0%);
        left: 50%;
        height: 100px;
        opacity: 0;
    }

    #header {
        position: relative;
        z-index: 2;
    }

    #header::after {
        content: "";
        position: fixed;
        top: 0;
        right: 0;
        left: 0;
        height: 100%;
        background-color: rgba(33, 2, 2, 0.475);
        z-index: -1;
        border-bottom: 8px solid rgb(246, 176, 106);
    }

    #spotlight {
        margin-top: 80px;
        z-index: 1000;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: Darumadrop One, Montserrat;
    }

    #spotlight button,
    #spotlight .btn-link {
        font-family: Atkinson Hyperlegible, Montserrat;
        cursor: pointer;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        border: none;
        background-color: rgb(246, 176, 106);
        color: #431d22;
        font-weight: bold;
        text-decoration: none;
        display: inline-block;
        transition: transform 0.125s ease-in-out, box-shadow 0.125s ease-in-out;
    }

     .btn-link:focus,
     .btn-link:hover {
        box-shadow: var(--shadow-elevated);
        transform: scale(1.0625);
    }

    #spotlight button.secondary {
        background-color: rgba(245, 245, 245, 0.05);
        color: white;
        border: 2px solid white;
        margin-top: 1rem;
    }

    .form-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    fieldset {
        border: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    legend {
        font-size: 30px;
        font-weight: 600;
        margin-bottom: 1.5rem;
    }

    .button-group {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-direction: column;
    }
    @media (min-width: 800px) {
        .button-group {
            flex-direction: row;
        }
        #pudding {
            opacity: 1;
        }
    }

    button span.material-symbols-outlined {
        vertical-align: middle;
    }

    .boxes-container {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
        margin-bottom: 1.5rem;
    }

    .boxes-container input {
        width: 3rem;
        height: 3.5rem;
        font-size: 1.5rem;
        text-align: center;
        border-radius: 8px;
        border: 1px solid #ccc;
        background-color: rgb(255, 255, 255);
        color: #333;
    }

    .boxes-container input:focus {
        outline: 2px solid rgb(246, 176, 106);
        border-color: transparent;
    }
</style>

<!-- Background -->
<img src={resolve("/images/haven/background.webp")} alt="" aria-hidden="true" id="background"/>
<img src={resolve("/images/haven/treeLeft.webp")} alt="" aria-hidden="true" id="leftTree" />
<img src={resolve("/images/haven/treeRight.webp")} alt="" aria-hidden="true" id="rightTree" />
{#if !showRedirectWarning}<img out:fly={{y:100}} src={resolve("/images/haven/smol-pud.webp")} alt="" aria-hidden="true" id="pudding" />{/if}

<header id="header">
    <h1 style:user-select="none" style:font-size="40px" style:margin-top="45px">
        <img 
            style="max-height:40px; margin-left: 5px; margin-right: 5px; transform: translateY(5px); padding: 0; display:inline" 
            src="https://assets.hackclub.com/icon-rounded.png" 
            alt="" 
        />
        <span style:font-family="Host Grotesk, Montserrat" style:color="white">Jumbotron</span>
    </h1>
</header>

<main id="spotlight">
    {#if showRedirectWarning}
        <div 
            class="redirect-banner" 
            transition:slide 
            role="alert" 
            aria-live="assertive"
        >
            <span>You are about to be redirected.</span>
            {#if redirectReason}
                <span style:font-size="0.9rem" style:opacity="0.9">{redirectReason}</span>
            {/if}
            <button 
                type="button" 
                onclick={cancelRedirect} 
                aria-label="Cancel automatic redirect"
            >
                Cancel Redirect
            </button>
        </div>
    {/if}

    {#if userType === null}
        <!-- Initial Selection Prompt -->
        <div class="form-container" role="region" aria-label="User Type Selection">
            <form aria-labelledby="form-heading" onsubmit={(e) => e.preventDefault()}>
                <fieldset>
                    <legend style:margin-left=10px style:margin-right=10px id="form-heading">Welcome! Are you a {eventName} attendee?</legend>
                    <div class="button-group">
                        <button type="button" onclick={() => selectUserType('attendee')}>
                            Yes, I'm an attendee
                        </button>
                        <button type="button" onclick={() => selectUserType('organizer')}>
                            No, I'm an organizer
                        </button> 
                    </div>
                </fieldset>
            </form>
        </div>

    {:else if userType === 'organizer'}
        <!-- Organizer Form View -->
        <div in:slide class="form-container" role="region" aria-label="Organizer Sign-In Form">
            <form aria-labelledby="org-heading" onsubmit={(e) => e.preventDefault()}>
                <fieldset>
                    <legend id="org-heading">Organizers are required to log in through <a href="https://auth.hackclub.com" target="_blank" rel="noreferrer">Hack Club Auth</a></legend>
                    <p style:margin-top="0px" style:color="white">Your account must be verified and YSWS-eligible to use this tool.</p>
                    <svg style="display: block; margin: 0 auto" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="1.414" xmlns="http://www.w3.org/2000/svg" aria-label="admin" viewBox="0 0 32 32" preserveAspectRatio="xMidYMid meet" fill="currentColor" width="100" height="100"><path d="M21.437 17.023a1 1 0 0 1 .785.977v2.2H23a1 1 0 0 1 .907 1.42l-2.222 4.8a1 1 0 0 1-1.907-.42v-2.2H19a1 1 0 0 1-.907-1.42l2.222-4.8a1 1 0 0 1 1.122-.557zM19.834 16.977C20.714 16.173 21 14.873 21 13a5 5 0 0 0-10 0c0 1.873.286 3.173 1.165 3.977a8.029 8.029 0 0 0-3.6 4.062c-.162.408-.213.939.162 1.168.792.485 1.632-.457 2.105-1.257a5.997 5.997 0 0 1 5.48-2.942c1.132.058 2.373-.055 3.24-.784a8.75 8.75 0 0 0 .282-.247zM19 13c0 1.683-.271 2.241-.47 2.456-.162.176-.68.544-2.53.544-1.85 0-2.368-.368-2.53-.544C13.27 15.24 13 14.683 13 13a3 3 0 1 1 6 0z"/></svg>
                    <a 
                        class="btn-link"
                        style="margin-bottom: 50px; margin-top: 20px;"
                        href="https://auth.hackclub.com/oauth/authorize?client_id=e86d4d7eec9c546e6c4700388d4fea7f&redirect_uri=https%3A%2F%2Fsymmetrical-doodle-69qgr7v97j76f59j7-5173.app.github.dev%2Fcallback&response_type=code&scope=name+verification_status+slack_id"
                    >
                        Continue
                    </a>
                </fieldset>
            </form>
                <button type="button" class="secondary" onclick={resetSelection}><span class="material-symbols-outlined" translate="no">undo</span> Back to selection</button>
        </div>

    {:else if userType === 'attendee'}
        <div in:slide class="form-container" role="region" aria-label="Participant Check-In Form">
            <form aria-labelledby="attendee-heading" onsubmit={handleSubmit}>
                <fieldset>
                    <legend id="attendee-heading">{attendeeError || "Please enter the code provided by your event"}</legend>
                    
                    <!-- Accessible 4-Digit Code Box Input Group -->
                    <div class="boxes-container">
                        {#each digits as digit, index}
                            <input
                                bind:this={inputElements[index]}
                                bind:value={digits[index]}
                                type="text"
                                inputmode="numeric"
                                maxlength="1"
                                pattern="[0-9]*"
                                aria-label="Digit {index + 1} of 4"
                                oninput={(e) => handleInput(e, index)}
                                onkeydown={(e) => handleKeydown(e, index)}
                            />
                        {/each}
                    </div>

                    {#if isCodeComplete}
                        <div class="button-group" transition:slide>
                            <button style="margin-bottom: 50px; margin-top: 20px;" type="submit">Continue</button>
                        </div>
                    {/if}
                </fieldset>
            </form>
            <button type="button" class="secondary" onclick={resetSelection}><span class="material-symbols-outlined" translate="no">undo</span> Back to selection</button>
        </div>
    {/if}
</main>