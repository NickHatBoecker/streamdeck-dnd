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
                    setButtonState(context, await getCurrentDndState())
                }, UPDATE_INTERVAL_IN_MS)
            }
        }

    }
}

const setImage = async (context, isDndOn) => {
    const imageOn = 'https://nick-hat-boecker.de/files/streamdeck_dnd_on.png'
    const imageOff = 'https://nick-hat-boecker.de/files/streamdeck_dnd_off.png'

    const image = await getBase64Image(isDndOn ? imageOn : imageOff)

    const json = {
        event: 'setImage',
        context,
        payload: {
            image,
        },
    }
    console.log('setImage', json)

    websocket.send(JSON.stringify(json))
}

function setTitle (context, isDndOn) {
    websocket.send(JSON.stringify({
        event: 'setTitle',
        context,
        payload: {
            // title: isDndOn ? 'Turn off' : 'Turn on',
            title: '',
        },
    }))
}

function setButtonState (context, isDndOn) {
    setTitle(context, isDndOn)
    setImage(context, isDndOn)
}

const getCurrentDndState = async () => {
    const dndState = await fetch(`${API_BASE_URL}/get-dnd-state`).then(response => response.text())
    const isDndOn = dndState.trim().toLowerCase() === 'do not disturb'

    return isDndOn
}

async function toggleDnd () {
    console.log('TOGGLE DND!')
    const url = `${API_BASE_URL}/toggle-dnd-state`

    const response = await fetch(url)
        .then(response => response.text())
    console.log('RESPONSE', response)
}

function getBase64Image (url) {
    return new Promise(
        function (resolve, reject) {
            try {
                const img = new Image()

                img.setAttribute('crossOrigin', 'anonymous')
                img.src = url
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = img.width
                    canvas.height = img.height
                    canvas.getContext('2d').drawImage(img, 0, 0)

                    const dataURL = canvas.toDataURL('image/png')

                    resolve(dataURL)
                }
            } catch (e) {
                console.log(e)
                reject()
            }
        }
    )
}
