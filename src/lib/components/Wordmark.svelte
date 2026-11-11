<script>
    let { onArt = false, size = "l" } = $props();
</script>

<span class="wordmark size-{size}" class:on-art={onArt}>
    <img src="https://assets.hackclub.com/icon-rounded.png" alt="Hack Club" />
    <span>Jumbotron</span>
</span>

<style>
    .wordmark {
        display: inline-flex;
        align-items: center;
        gap: 0.4em;
        /* Same as the original wordmark: Host Grotesk at weight 900 (the h1 weight), 40px */
        font: 900 40px/1 "Host Grotesk", var(--font-text);
        color: var(--ink);
        user-select: none;
    }
    .wordmark.size-s { font-size: 1.35rem; }
    .wordmark.on-art { color: var(--on-art); }
    img { height: 1.05em; width: auto; border-radius: 0.24em; }
</style>
