<script>
    import { page } from "$app/state";
    import { resolve } from "$app/paths";
    import { onMount } from "svelte";

    let authCode = $state();
    
    onMount(async () => {
        if (page.url.searchParams.get("code") == null) {
            window.location.href = resolve("/");
        }
        authCode = page.url.searchParams.get("code");

        const raw = await fetch("https://api.jumbotron.hackclub.com/generateToken", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "code": authCode
            })
        })
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
        <span style:font-family="Host Grotesk" style:color="black">Jumbotron</span>
    </h1>
</header>
<p>Loading...</p>