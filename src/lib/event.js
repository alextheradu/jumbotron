import { API } from "$lib/api.js";

export let eventName = "Haven" // Used to change the name of the Satellite event across Jumbotron and to make updating the UI between events easier

// Artwork for the current event. Colors and fonts live in the token block at the top of $lib/styles.css.
// For a new Satellite: swap these paths (relative to /static) and the tokens, nothing else.
export const eventTheme = {
    background: "/images/haven/background.webp",
    treeLeft: "/images/haven/treeLeft.webp",
    treeRight: "/images/haven/treeRight.webp",
    mascot: "/images/haven/smol-pud.webp"
};