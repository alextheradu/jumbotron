<script>
    import { page } from "$app/state";
    import { resolve } from "$app/paths";
    import { onMount } from "svelte";
    import { eventName } from "$lib/event";

    let authCode = $state();

    
    onMount(async () => {
        if (localStorage.getItem("creds")) {
            window.location.href = resolve("/staff");
            return;
        }

        if (page.url.searchParams.get("code") == null) {
            window.location.href = resolve("/");
        }
        authCode = page.url.searchParams.get("code");

        const raw = await fetch("https://api.jumbotron.hackclub.com/genToken", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "code": authCode
            })
        })
        if (!raw.ok) {
            alert("Server error, try again soon!");
            window.location.replace(resolve("/"));
            return;
        }
        let data = await raw.json();
        let creds = data.credentials;
        localStorage.setItem("creds", creds);
        window.location.replace(resolve("/staff"));
        return;
        
    })
</script>
<svelte:head>
    <title>Jumbotron - Authenticating User</title>
</svelte:head>
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
<p>You will be automatically redirected</p>