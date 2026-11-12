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
export function proccessCity(name) {
    name = name.trim();
    name = name.toLowerCase();
    if (name == "nyc" || name == "new york city" || name == "new-york-city") {
        return "NYC";
    }
    else if (name == "dallas-fort-worth" || name=="dfw") {
        return "Dallas-Fort Worth";
    }
    // Additional special cases can follow; however, I don't think there are others
    else {
        if (name.indexOf("-") == -1) {
            return name.substring(0,1).toUpperCase() + name.substring(1);
        }
        else {
            let rtn = name.substring(0,1).toUpperCase();
            for (let i = 1; i < name.length; i++) {
                if (name.substring(i, i+1) == "-") {
                    rtn += " ";
                    i++;
                    rtn += name.substring(i, i+1).toUpperCase();
                }
                else {
                    rtn += name.substring(i, i+1);
                }
            }
            return rtn;
        }
    }
}

export function proccessEventCity(name) {
    return eventName + " " + proccessCity(name);
}

export async function checkCity(name) {
    let rawData = await fetch(`${API}/data?eventName=${proccessCity(name)}`);
    if (!rawData.ok) {
        console.log("Failed")
        return false;
    }
    return true;
}

export function cityToLink(city) {
    if (city == "Dallas-Fort Worth") {
        return "dfw";
    }
    else {
        return city.substring(0,1).toLowerCase() + city.substring(1)
        //return (city.substring(1).toLowerCase()) + city.substring(2, city.length);
    }
}