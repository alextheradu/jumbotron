<script>
    // Event artwork behind every page. Purely decorative.
    import { resolve } from "$app/paths";
    import { eventTheme } from "$lib/event.js";

    let { mascot = false, trees = true, scrim = 0.45 } = $props();
</script>

<div class="backdrop" aria-hidden="true" style:--scrim-alpha={scrim}>
    <img class="art" src={resolve(eventTheme.background)} alt="" />
    {#if trees}
        <img class="tree left" src={resolve(eventTheme.treeLeft)} alt="" />
        <img class="tree right" src={resolve(eventTheme.treeRight)} alt="" />
    {/if}
    <div class="scrim"></div>
    {#if mascot}
        <img class="mascot" src={resolve(eventTheme.mascot)} alt="" />
    {/if}
</div>

<style>
    .backdrop {
        position: fixed;
        inset: 0;
        z-index: -1;
        overflow: hidden;
        pointer-events: none;
        user-select: none;
    }
    img { -webkit-user-drag: none; }
    .art {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .tree {
        position: absolute;
        top: 0;
        height: 100%;
        object-fit: cover;
    }
    .tree.left { left: 0; }
    .tree.right { right: 0; }
    .scrim {
        position: absolute;
        inset: 0;
        background: rgb(20 24 32 / var(--scrim-alpha));
    }
    .mascot {
        position: absolute;
        left: 50%;
        bottom: -6px;
        height: 96px;
        transform: translateX(-50%);
        animation: peek 700ms var(--ease-out) 300ms both;
    }
    @keyframes peek {
        from { transform: translate(-50%, 100%); }
        to { transform: translate(-50%, 0); }
    }
    @media (max-width: 640px) {
        .tree { display: none; }
        .mascot { height: 72px; }
    }
</style>
