let websocket = null,
    pluginUUID = null,
    updateInterval = null

const API_BASE_URL = 'http://127.0.0.1:5511'
const UPDATE_INTERVAL_IN_MS = 30 * 1000

function connectElgatoStreamDeckSocket (
    inPort,
    inPluginUUID,
    inRegisterEvent,
    inInfo
) {
    pluginUUID = inPluginUUID
    websocket = new WebSocket(`ws://localhost:${inPort}`)

    websocket.onopen = function () {
        // WebSocket is connected, register the plugin
        websocket.send(JSON.stringify({
            event: inRegisterEvent,
            uuid: inPluginUUID,
        }))
    }

    websocket.onmessage = async function (evt) {
        // Received message from Stream Deck
        const jsonObj = JSON.parse(evt.data);
        const context = jsonObj["context"];

        // keyUp, keyDown, didReceiveGlobalSettings
        console.log('EVENT::', jsonObj['event'])

        if (jsonObj['event'] === 'keyUp') {
            await toggleDnd(context)
            setButtonState(context, await getCurrentDndState())

            if (!updateInterval) {
                updateInterval = setInterval(async () => {
                    console.log('Trigger Interval')
                    setButtonState(context, await getCurrentDndState())
                }, UPDATE_INTERVAL_IN_MS)
            }
        } else if (jsonObj['event'] === 'keyDown') {
            websocket.send(JSON.stringify({
                event: "getGlobalSettings",
                context: pluginUUID,
            }))
        } else if (jsonObj['event'] === 'willAppear') {
            // Plugin button is now visible (for example if the button's page was opened)
            setButtonState(context, await getCurrentDndState())

            if (!updateInterval) {
                updateInterval = setInterval(async () => {
                    console.log('Trigger Interval')
                    setButtonState(context, await getCurrentDndState())
                }, UPDATE_INTERVAL_IN_MS)
            }
        }

    }
}

function setImage (context, isDndOn) {
    const imageOn = 'https://nick-hat-boecker.de/files/streamdeck_dnd_on.png'
    const imageOff = 'https://nick-hat-boecker.de/files/streamdeck_dnd_off.png'

    const json = {
        event: 'setImage',
        context,
        payload: {
            image: isDndOn ? imageOn : imageOff,
        },
    }

    websocket.send(JSON.stringify(json))
}

function setTitle (context, isDndOn) {
    websocket.send(JSON.stringify({
        event: 'setTitle',
        context,
        payload: {
            title: isDndOn ? 'Turn off' : 'Turn on',
        },
    }))
}

function setButtonState (context, isDndOn) {
    setTitle(context, isDndOn)
    setImage(context, isDndOn)

    console.log('Set Button state::', isDndOn)
}

const getCurrentDndState = async () => {
    const dndState = await fetch(`${API_BASE_URL}/get-dnd-state`).then(response => response.text())
    const isDndOn = dndState.trim().toLowerCase() === 'do not disturb'
    console.log('getCurrentDndState:: ', dndState.trim(), isDndOn)

    return isDndOn
}

async function toggleDnd () {
    const isDndOn = await getCurrentDndState()
    const url = `${API_BASE_URL}/toggle-dnd-state?activateDnd=${!isDndOn}`

    console.log('toggleDnd1:: ', isDndOn ? 'Toggling off...' : 'Toggling on...', url)

    const response = await fetch(url)
        .then(response => response.text())
    console.log('toggleDnd:: ', response)
}
