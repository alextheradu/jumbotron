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
        font: 800 2.25rem/1 var(--font-text);
        letter-spacing: -0.02em;
        color: var(--ink);
        user-select: none;
    }
    .wordmark.size-s { font-size: 1.35rem; }
    .wordmark.on-art { color: var(--on-art); }
    img { height: 1.05em; width: auto; border-radius: 0.24em; }
</style>
