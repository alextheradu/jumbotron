<script>
    // The presenter's screen on an attendee's device, while organizers have the mirror on.
    // `mirror` is { name, n } from /getSession: n is the newest snapshot the big screen posted.
    // It opens full screen on its own when a demo starts; the attendee can shrink it to a pill
    // and open it again.
    import { fade } from "svelte/transition";
    import { API } from "$lib/org.svelte.js";

    let { code, mirror = null } = $props();

    let open = $state(true);
    let src = $state("");            // the frame on screen; swapped only once the next one loaded
    let viewer = $state();
    let isFullscreen = $state(false);
    let lastName = null;
    let stream = $state(null);       // live video from the projector tab, once connected
    let videoEl = $state();

    // A new presenter gets the attendee's attention again.
    $effect(() => {
        const name = mirror?.name ?? null;
        if (name && name !== lastName) open = true;
        lastName = name;
        if (!name) {
            src = "";
            shown = -1;
        }
    });

    // Load frames off screen, then swap, so the picture never flashes blank. Any frame newer than
    // the one on screen is shown when it finishes loading, even if a newer one is already on its
    // way: on a slow link, dropping every superseded load would freeze the picture.
    let shown = -1;
    $effect(() => {
        if (!mirror || stream) return;   // live video replaces the snapshots
        const n = mirror.n;
        const url = `${API}/demoFrame?code=${encodeURIComponent(code)}&n=${n}`;
        const img = new Image();
        img.src = url;
        img.decode().then(() => {
            if (n > shown) {
                shown = n;
                src = url;
            }
        }).catch(() => {});
    });

    // Live video: ask the projector tab for the presenter's screen over WebRTC. It is only open
    // while the viewer is on screen (each watcher costs the projector laptop upload bandwidth).
    // If it's full, blocked by the wifi or breaks, the snapshots above keep working.
    const CONNECT_MS = 8000;
    // Derived so a new frame (a new `mirror` object, same presenter) doesn't reconnect.
    let who = $derived(mirror?.name);
    $effect(() => {
        if (!who || !open || typeof RTCPeerConnection === "undefined") return;

        const id = crypto.randomUUID();
        let pc = null;
        let queue = Promise.resolve();
        const es = new EventSource(`${API}/mirrorStream?code=${encodeURIComponent(code)}&viewer=${id}`);
        const timer = setTimeout(() => { if (!stream) giveUp(); }, CONNECT_MS);

        const send = (signal) =>
            fetch(`${API}/mirrorSignal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, viewer: id, signal }),
                keepalive: true
            }).catch(() => {});

        function giveUp() {
            clearTimeout(timer);
            es.close();
            pc?.close();
            pc = null;
            stream = null;
        }

        async function start(iceServers) {
            const peer = (pc = new RTCPeerConnection({ iceServers }));
            peer.addTransceiver("video", { direction: "recvonly" });
            peer.onicecandidate = (e) => e.candidate && send({ candidate: e.candidate });
            peer.ontrack = (e) => {
                if (peer === pc) stream = e.streams[0];
            };
            peer.onconnectionstatechange = () => {
                if (peer !== pc) return;
                if (peer.connectionState === "connected") clearTimeout(timer);
                else if (["failed", "closed", "disconnected"].includes(peer.connectionState)) giveUp();
            };
            await peer.setLocalDescription(await peer.createOffer());
            await send({ description: peer.localDescription });
        }

        es.onmessage = (event) => {
            let msg;
            try { msg = JSON.parse(event.data); } catch { return; }
            if (msg.type === "hello") queue = queue.then(() => start(msg.iceServers || [])).catch(giveUp);
            else if (msg.type === "signal") {
                queue = queue.then(async () => {
                    if (!pc) return;
                    if (msg.signal.description) await pc.setRemoteDescription(msg.signal.description);
                    else if (msg.signal.candidate) await pc.addIceCandidate(msg.signal.candidate);
                }).catch(() => {});
            } else giveUp();   // full, ended, ...: snapshots take over
        };
        // No automatic reconnect: a dropped stream means the snapshots are fine.
        es.onerror = giveUp;

        return giveUp;
    });

    $effect(() => {
        if (videoEl && stream && videoEl.srcObject !== stream) {
            videoEl.srcObject = stream;
            videoEl.play().catch(() => {});
        }
    });

    function goFullscreen() {
        viewer?.requestFullscreen?.().catch(() => {});
    }

    function close() {
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
        open = false;
    }

    const canFullscreen = typeof document !== "undefined" && !!document.fullscreenEnabled;
</script>

<svelte:document onfullscreenchange={() => (isFullscreen = !!document.fullscreenElement)} onkeydown={(e) => open && mirror && e.key === "Escape" && !isFullscreen && close()} />

{#if mirror}
    {#if open}
        <div class="viewer" bind:this={viewer} role="dialog" aria-modal="true" aria-label="{mirror.name}'s screen" transition:fade={{ duration: 150 }}>
            {#if stream}
                <!-- svelte-ignore a11y_media_has_caption -->
                <video bind:this={videoEl} autoplay muted playsinline aria-label="{mirror.name}'s shared screen, live from the big screen"></video>
            {:else if src}
                <img {src} alt="{mirror.name}'s shared screen, live from the big screen" />
            {:else}
                <p class="waiting" role="status"><span class="spinner" aria-hidden="true"></span>Loading {mirror.name}'s screen</p>
            {/if}
            <div class="bar">
                <p class="who"><span class="live" aria-hidden="true"></span>{mirror.name}'s screen</p>
                <div class="actions">
                    {#if canFullscreen && !isFullscreen}
                        <button class="btn btn-small btn-on-art" onclick={goFullscreen}>
                            <span class="icon" translate="no" aria-hidden="true">fullscreen</span>Full screen
                        </button>
                    {/if}
                    <button class="btn btn-small btn-on-art" onclick={close} aria-label="Close the shared screen">
                        <span class="icon" translate="no" aria-hidden="true">close</span>Close
                    </button>
                </div>
            </div>
        </div>
    {:else}
        <button class="reopen btn btn-primary" onclick={() => (open = true)} transition:fade={{ duration: 150 }}>
            <span class="icon" translate="no" aria-hidden="true">present_to_all</span>Watch {mirror.name}'s screen
        </button>
    {/if}
{/if}

<style>
    .viewer {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: grid;
        place-items: center;
        background: #000;
        color: var(--on-art);
    }
    img, video { width: 100%; height: 100%; object-fit: contain; }
    .bar {
        position: absolute;
        inset: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: max(10px, env(safe-area-inset-top)) 12px 10px;
        background: linear-gradient(rgb(0 0 0 / 0.7), transparent);
    }
    .who { display: flex; align-items: center; gap: 8px; min-width: 0; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .live { flex: none; width: 9px; height: 9px; border-radius: 50%; background: oklch(0.68 0.2 27); animation: breathe 2s ease-in-out infinite; }
    .actions { display: flex; gap: 8px; flex: none; }
    .waiting { display: flex; align-items: center; gap: 0.6em; font-weight: 700; }
    .spinner { width: 1em; height: 1em; border: 0.14em solid rgb(255 255 255 / 0.3); border-top-color: var(--on-art); border-radius: 50%; animation: spin 0.9s linear infinite; }
    .reopen {
        position: fixed;
        left: 50%;
        bottom: max(16px, env(safe-area-inset-bottom));
        z-index: 50;
        transform: translateX(-50%);
        box-shadow: var(--shadow-2);
        white-space: nowrap;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes breathe { 50% { opacity: 0.4; } }
    @media (prefers-reduced-motion: reduce) {
        .live, .spinner { animation: none; }
    }
</style>
