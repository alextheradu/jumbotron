<script>
    import favicon from '$lib/assets/favicon.svg';

    let { children } = $props();

    import "$lib/styles.css";

    let yvalue = $state(0);
</script>

<svelte:head>
    <link rel="icon" href={"https://assets.hackclub.com/icon-rounded.png"} />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:ital,wght@0,200..800;1,200..800&family=Host+Grotesk:ital,wght@0,300..800;1,300..800&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Darumadrop+One&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://raw.githubusercontent.com/hackclub/css/refs/heads/main/theme.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=add_to_queue,calendar_add_on,arrow_circle_up,campaign,cast,cast_pause,cast_warning,drive_export,podcasts,qr_code,settings_account_box,sync,undo,video_library" />
</svelte:head>

<!--<div class="layout">-->
    <!--<main>-->
        {@render children()}
    <!--</main>-->

    <!--<footer>
        <a href="https://hackclub.com"><img id="flag" src="https://assets.hackclub.com/flag-standalone.svg" alt="Flag version of Hack Club logo"/></a>
    </footer>-->
<!--</div>-->

<style>
    .layout {
        display: flex;
        flex-direction: column;
        min-height: 100vh;

    }

    main {
        flex: 1;
    }

    footer {

        padding: 10px;
        margin-top: 30px;

        #flag {
            max-height: 30px;
            display: block;
            margin: 0 auto;
            margin-bottom: 10px;
        }
        p {
            margin-bottom: 4px;
            font-family: Host Grotesk;
            margin: 0 auto;
            display: block;
        }
    }
</style>