function feedPlant(plant) {
    fetch(`http://10.7.0.103:3000/addFeedRequest?plant=${plant}`, {
        method: 'POST',
        mode: 'cors',
        body: ""
    })
    .then(response => toast("Request recieved."))
    .catch((err) => {
        toast("Error sending request.")
    })
}

function phupPlant(plant) {
    fetch(`http://10.7.0.103:3000/addPhUpRequest?plant=${plant}`, {
        method: 'POST',
        mode: 'cors',
        body: ""
    })
    .then(response => toast("Request recieved."))
    .catch((err) => {
        toast("Error sending request.")
    })
}

function decodeScheduleConfigToString(scheduleConfig) {
    if (scheduleConfig == "0") {
        return "Never"
    }

    let workingString = "every " + scheduleConfig.slice(1) + " "

    switch (scheduleConfig.slice(0,1)) {
        case 'm':
            workingString += "Minutes"
            break;
        case 'h':
            workingString += "Hours"
            break;
        case 'd':
            workingString += "Days"
            break;
    }

    if (scheduleConfig.slice(1) == "1") {
        workingString = workingString.slice(0, -1) 
    }

    return workingString
}

async function getPlantConfig(plant) {
    let response = await fetch(`http://10.7.0.103:3000/getConfig?plant=${plant}`, {
        method: `GET`,
        mode: `cors`
    })

    if (!response.ok) { 
        toast(`Failed to fetch schedule for plant ${plant}`)
        return 
    }

    return await response.json()

}

function sliderMinMax(value) {
    switch (value) {
        case "m":
            return [1, 60]
        case "h":
            return [1, 12]
        case "d":
            return [1, 30]
        case "0":
            return [0,0]
    }
}

// The worst function signature I have ever written, ever.
function valueChanged(plant, opcode) {
    // Get the section for the given plant and opcode with this horrendous oneliner
    let parent = document.getElementById(`plant${plant}Schedule`).children[opcode]

    let label = parent.children[0].children[0]
    let slider = parent.children[1].children[0]
    let picker = parent.children[1].children[1]

    let minMax = sliderMinMax(picker.value)
    slider.min = minMax[0]
    slider.max = minMax[1]

    label.textContent = decodeScheduleConfigToString(picker.value == `0` ? picker.value : picker.value + slider.value)
    
}

async function applyScheduleToDom(plant) {
    // First, get the parent div of the schedule of the given plant.
    let scheduleParent = document.getElementById(`plant${plant}Schedule`)
    let boxParent = document.getElementById(`plant${plant}`)
    let pHIndicator = boxParent.children[1].children[0]

    // Next, make it so the user can't interact while we're loading the data.
    scheduleParent.classList.add(`inoperable-geometry`)
    boxParent.classList.remove(`bg-bad`, `bg-warn`, `bg-good`)
    pHIndicator.classList.remove(`bg-bad`, `bg-warn`, `bg-good`)

    // Get the config for the given plant from the API.
    let config = await getPlantConfig(plant)
    let recentpH = config.recentpH
    let schedule = config.schedule


    /// SET PH BACKGROUNDS
    if (recentpH == undefined) {
        boxParent.classList.add(`bg-bad`)
        pHIndicator.classList.add(`bg-bad`)
        pHIndicator.textContent = `Error`
    } else if (recentpH > 6 && recentpH < 8) {
        boxParent.classList.add(`bg-good`)
        pHIndicator.classList.add(`bg-good`)
        pHIndicator.textContent = `pH is ${recentpH}`
    } else {
        boxParent.classList.add(`bg-warn`)
        pHIndicator.classList.add(`bg-warn`)
        pHIndicator.textContent = `pH is ${recentpH}`
    }

    /// SET SCHEDULES

    // Initlize this variable that we overwrite later
    let minMax = [0,0]

    // Get the div of the feed section
    let feedParent = scheduleParent.children[0]

    // Text label
    feedParent.children[0].children[0].textContent = decodeScheduleConfigToString(schedule.FEED)
    // Slider
    feedParent.children[1].children[0].value = parseInt(schedule.FEED.slice(1),10)
    minMax = sliderMinMax(schedule.FEED.slice(0,1))
    feedParent.children[1].children[0].min = minMax[0]
    feedParent.children[1].children[0].max = minMax[1]
    // Picker
    feedParent.children[1].children[1].value = schedule.FEED.slice(0,1)
    

    // Get the div of the pH Up section
    let phupParent = scheduleParent.children[1]

    // Text label
    phupParent.children[0].children[0].textContent = decodeScheduleConfigToString(schedule.PHUP)
    // Slider
    phupParent.children[1].children[0].value = parseInt(schedule.PHUP.slice(1),10)
    minMax = sliderMinMax(schedule.PHUP.slice(0,1))
    phupParent.children[1].children[0].min = minMax[0]
    phupParent.children[1].children[0].max = minMax[1]
    // Picker
    phupParent.children[1].children[1].value = schedule.PHUP.slice(0,1)

    // Get the div of the pH Down section
    let phdownParent = scheduleParent.children[2]

    // Text label
    phdownParent.children[0].children[0].textContent = decodeScheduleConfigToString(schedule.PHDN)
    // Slider
    phdownParent.children[1].children[0].value = parseInt(schedule.PHDN.slice(1),10)
    minMax = sliderMinMax(schedule.PHDN.slice(0,1))
    phdownParent.children[1].children[0].min = minMax[0]
    phdownParent.children[1].children[0].max = minMax[1]
    // Picker
    phdownParent.children[1].children[1].value = schedule.PHDN.slice(0,1)

    scheduleParent.classList.remove(`inoperable-geometry`)
}

async function setSchedule(plant) {
    let parent = document.getElementById(`plant${plant}Schedule`)

    let jsonObject = {
        FEED: createConfigStringFromDom(parent.children[0]),
        PHUP: createConfigStringFromDom(parent.children[1]),
        PHDN: createConfigStringFromDom(parent.children[2])
    }

    let response = await fetch(`http://10.7.0.103:3000/setSchedule?plant=${plant}`, {
        method: `POST`,
        headers: {
            'Content-Type': 'application/json'
        },
        mode: `cors`,
        body: JSON.stringify(jsonObject)
    })

    if (!response.ok) { 
        toast(`Failed to apply schedule for plant ${plant}`)
        return 
    } else {
        toast(`Applied schedule for plant ${plant}`)
        return
    }
}

function createConfigStringFromDom(parent) {
    let mode = parent.children[1].children[1].value

    return (mode == 0) ? "0" : mode + parent.children[1].children[0].value
}

function toast(message) {
    // Get the snackbar DIV
    var toastContainer = document.getElementById("toastContainer");
  
    toastContainer.insertAdjacentHTML(`beforeend`, `<div class="toast show">${message}</div>`)

    // After 3 seconds, remove the first div. since all divs from the container are removed, this is always the correct one.
    setTimeout(() => {
        toastContainer.removeChild(toastContainer.childNodes[0])
    }, 3000);
} 

window.addEventListener(`load`, async () => {
    await applyScheduleToDom(0)
    await applyScheduleToDom(1)
    await applyScheduleToDom(2)
})