<script>
    import { resolve } from "$app/paths";
    import { eventName } from "$lib/event";
    import { internal } from "$lib/liveshare.svelte.js";

    let copied = $state(false);
    let copyTimer = null;

    let link = $derived(`jumbotron.hackclub.com/?code=${internal.code ?? ""}`);

    async function copy() {
        try {
            await navigator.clipboard.writeText(`https://${link}`);
            copied = true;
            clearTimeout(copyTimer);
            copyTimer = setTimeout(() => (copied = false), 2000);
        } catch {
            copied = false;
        }
    }
</script>

<section class="share" aria-labelledby="share-heading">
    <div class="code-block">
        <h2 id="share-heading" class="eyebrow">Attendee code</h2>
        <p class="code mono" translate="no">{internal.code ?? "····"}</p>
        <p class="hint">Yours for all of {eventName}. It stays the same if you rename your event.</p>
    </div>
    <div class="link-block">
        <span class="field-label">Or share this link</span>
        <div class="link-row">
            <span class="link mono" translate="no">{link}</span>
            <button class="btn btn-small" class:done={copied} onclick={copy} disabled={!internal.code}>
                <span class="icon" translate="no" aria-hidden="true">{copied ? "check" : "content_copy"}</span>
                {copied ? "Copied" : "Copy"}
            </button>
        </div>
        <a class="btn btn-small btn-quiet open" href={resolve("/") + `?code=${internal.code ?? ""}`} target="_blank" rel="noopener">
            <span class="icon" translate="no" aria-hidden="true">cast</span>
            Open attendee view in a new tab
        </a>
    </div>
</section>

<style>
    .share {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 24px 40px;
        align-items: center;
    }
    .eyebrow {
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ink-3);
    }
    .code {
        font-size: clamp(3rem, 7vw, 4.25rem);
        font-weight: 700;
        letter-spacing: 0.12em;
        line-height: 1.1;
    }
    .hint { max-width: 30ch; }
    .link-block { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; justify-items: start; min-width: 0; }
    .link-row {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 6px 6px 6px 14px;
        border-radius: var(--radius-pill);
        background: var(--surface-sunken);
    }
    .link { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.95rem; }
    .done { --btn-bg: var(--live); --btn-ink: var(--surface); }
    .open { padding-left: 4px; }
    @media (max-width: 720px) {
        .share { grid-template-columns: minmax(0, 1fr); }
    }
</style>
