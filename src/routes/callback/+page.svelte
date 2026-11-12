<script>
    import { page } from "$app/state";
    import { resolve } from "$app/paths";
    import { onMount } from "svelte";
    import Backdrop from "$lib/components/Backdrop.svelte";
    import Wordmark from "$lib/components/Wordmark.svelte";

    import { API } from "$lib/api.js";

    let errorText = $state("");
    let backTo = $state("/");

    onMount(async () => {
        if (localStorage.getItem("creds")) {
            window.location.replace(resolve("/staff"));
            return;
        }

        const authCode = page.url.searchParams.get("code");
        if (!authCode) {
            window.location.replace(resolve("/"));
            return;
        }

        try {
            const raw = await fetch(`${API}/genToken`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: authCode })
            });
            const data = await raw.json().catch(() => ({}));

            if (!raw.ok || !data.credentials) {
                errorText = data.error
                    ? `Hack Club Auth said: ${data.error}`
                    : "We couldn't finish signing you in. Your account may not be verified or YSWS-eligible yet.";
                return;
            }

            const creds = data.credentials;
            if (data.sources) creds.push(JSON.stringify(data.sources));
            localStorage.setItem("creds", JSON.stringify(creds));
            window.location.replace(resolve("/staff"));
        } catch {
            errorText = "Can't reach Jumbotron right now. Check your connection and try again.";
        }
    });
</script>

<svelte:head>
    <title>Signing in · Jumbotron</title>
</svelte:head>

<Backdrop />

<main>
    <Wordmark onArt />
    {#if errorText}
        <div class="panel" role="alert">
            <h1>Sign-in didn't work</h1>
            <p>{errorText}</p>
            <a class="btn btn-primary" href={resolve(backTo)}>Back to Jumbotron</a>
        </div>
    {:else}
        <div class="loading" role="status">
            <span class="spinner" aria-hidden="true"></span>
            <p>Signing you in</p>
        </div>
    {/if}
</main>

<style>
    main {
        min-height: 100dvh;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 40px;
        padding: 16px;
        color: var(--on-art);
        text-align: center;
    }
    .loading { display: grid; justify-items: center; gap: 14px; font-weight: 700; font-size: 1.1rem; }
    .spinner {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 4px solid oklch(1 0 0 / 0.3);
        border-top-color: var(--on-art);
        animation: spin 0.9s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .panel {
        width: min(420px, 100%);
        display: grid;
        justify-items: center;
        gap: 12px;
        padding: 28px 24px;
        border-radius: var(--radius-l);
        background: var(--surface);
        color: var(--ink);
        box-shadow: var(--shadow-2);
    }
    h1 { font-size: 1.3rem; }
    p { color: var(--ink-2); }
</style>
