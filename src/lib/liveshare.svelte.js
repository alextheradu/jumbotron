export const internal = $state({
    initComplete: false,
    code: null,
    slack: null,
    name: null,
    cityName: "",
    importedSync: false
})
export const sync = $state({
    announcements: false,
    slides: false
})

export const liveshareData = $state({
    timestamp: timestamp()
});

function timestamp() {
    let clock = new Date();
    return clock.getTime();
}

export async function updateAPI() {
    if (internal.initComplete) {
        liveshareData.timestamp = timestamp();
        let packet = JSON.stringify(liveshareData);
        const response = await fetch (`https://api.jumbotron.hackclub.com/sendPacket`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "code": internal.code,
                "password": internal.password,
                "packet": packet
            })
        })
        const data = await response.json();
        if (response.ok) {
            console.log(data);
            //localStorage.setItem("liveshareData", packet);
        }
        else {
            console.log("error");
        }
    }
}