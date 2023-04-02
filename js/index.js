(async () => {
  // Redis DB
  const { createClient } = require('redis')
  const db = createClient();

  db.on('error', (err) => console.log('Redis Client Error', err))

  await db.connect();

  // JSON File config
  let editJsonFile = require(`edit-json-file`)
  let config = editJsonFile(`./config/config.json`, {
    autosave: true
  })


  // Express config
  const express = require('express')
  const bodyParser = require('body-parser');
  const port = 3000
  let cors = require('cors');

  const app = express()

  app.use(cors())
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json())

  // Scheduler
  const { ToadScheduler, SimpleIntervalJob, AsyncTask, Task } = require('toad-scheduler')


  /// SET SCHEDULES

  const scheduler = new ToadScheduler()

  regenerateSchedules()

  function regenerateSchedules() {
    let currentScheduleConfig = config.get()

    for (let idx = 0; idx < currentScheduleConfig.plants.length; idx++) {
      const plant = currentScheduleConfig.plants[idx].schedule;
  
      for (key in plant) {
        configSchedule = plant[key]
  
        // Check if the task already exists, and if so, if it's the same.
        if (!jobExists(configSchedule, key, idx)) {
          console.log(`Updating task ${key} ${idx}`)
          createTaskFor(configSchedule, key, idx)
        }
  
      }
    }
  }

  // Returns True if we don't need to recreate the task
  function jobExists(configSchedule, key, idx) {

    let task;
    let id = `${key} ${idx}`

    try {
      task = scheduler.getById(id)
    } catch {
      return false
    }

    switch (configSchedule.slice(0,1)) {
      case "0":
        if (task.getStatus() != "stopped") {
          return false
        }
        return true
        break;

      case "m":
        if (task.minutes != parseInt(configSchedule.slice(1), 10)) {
          return false 
        }
        return true
        break;
    
      case "h":
        if (task.hours != parseInt(configSchedule.slice(1), 10)) {
          return false
        }
        return true
        break;
      
      case "d":
        if (task.days != parseInt(configSchedule.slice(1), 10)) {
          return false 
        }
        return true
        break;
    }
  }

  function createTaskFor(configSchedule, key, idx) {
    scheduler.removeById(`${key} ${idx}`)

    const task = new Task(`${key} ${idx}`, ((key, idx) => {
      console.log(`SCHEDULE: ${key} ${idx}`)
      db.rPush("main:queue", `${key} ${idx}`)
    }).bind(null, key, idx))

    if (configSchedule == "0") { 
      // Create a dummy task that is immediately stopped
      scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ days: 1 }, task, { id: `${key} ${idx}`}))
      scheduler.stopById(`${key} ${idx}`)
      return;
    }

    let schedule = {}

    switch (configSchedule.slice(0,1)) {
      case "m":
        schedule = { minutes: parseInt(configSchedule.slice(1), 10)}
        break;
    
      case "h":
        schedule = { hours: parseInt(configSchedule.slice(1), 10)}
        break;
      
      case "d":
        schedule = { days: parseInt(configSchedule.slice(1), 10) }
        break;
    }

    job = new SimpleIntervalJob(schedule, task, {
      id: `${key} ${idx}`
    })

    scheduler.addSimpleIntervalJob(job)
  }

  /// PH TESTING

  let cancellables = { } // stupid javascript dictionaries aka not having dictionaries
  let id = 0

  // this function only measures pH for plant 3 because that's the only one a sensor is connected to
  /// ask for pH once every 5 minutes
  setInterval(() => {
    // sendMeasureRequest(0)
    // sendMeasureRequest(1)
    sendMeasureRequest(2)
  }, (1000 * 60 * 5)) // One minute (ms * 60 sec)

  // Read pH immediately when the program starts.
  sendMeasureRequest(2)

  // work through the return queue for pH every 10 seconds. This is busywaiting but at the rate this is happening at it doesn't really matter. No sense in overcomplicating it.
  setTimeout(clearReturnQueue, 0)

  async function clearReturnQueue() {
    console.log(`Clearing return queue...`)

    // breaks
    while (true) {
      let returnVal = await db.lPop(`main:return`)
      console.log(`got val ${returnVal}`)

      if (returnVal == null) { break; }

      let tokenized = returnVal.split(" ")

      if (typeof cancellables[tokenized[0]] !== "undefined") {
        cancellables[tokenized[0]](tokenized[1])
      }
    }

    setTimeout(clearReturnQueue, (1000 * 10))
  }

  function sendMeasureRequest(plant) {
    // MRPH, plant, id

    // This is synchronous so changing id shouldn't matter
    currentID = id++
    cancellables[id] = recievePh.bind(null, plant, Date.now())
    console.log(`main:queue`, `MRPH ${plant} ${id}`)
    db.rPush(`main:queue`, `MRPH ${plant} ${id++}`)
  }

  function recievePh(plant, time, pH) {
    console.log(`Setting pH ${pH} for plant ${plant} at time ${time}`)
    config.set(`plants.${plant}.phHistory.t${time}`, pH)
    
    // We'll just assume that this is the most recent pH measurement.
    // This might not be the best assumption, but considering how these measurements are spaced it's good enough.
    config.set(`plants.${plant}.recentpH`, pH)
  }


  /// SET APP ROUTES

  app.post('/addFeedRequest', (req, res) => {
    console.log(`recieved FEED ${req.query["plant"]}`)
    db.rPush("main:queue", `FEED ${req.query["plant"]}`)
      .then(() => {
        res.send('Done.')
      })
  }) 

  app.post('/addPhUpRequest', (req, res) => {
    console.log(`recieved PHUP ${req.query["plant"]}`)
    db.rPush("main:queue", `PHUP ${req.query["plant"]}`)
      .then(() => {
        res.send('Done.')
      })
  })

  app.post(`/setSchedule`, (req, res) => {
    let plant = parseInt(req.query[`plant`],10)

    config.set(`plants.${plant}.schedule`, req.body)

    regenerateSchedules()
    
    res.sendStatus(200)
  })

  app.get('/getConfig', (req, res) => {
    let plant = parseInt(req.query["plant"],10)
    console.log(`Sending schedule for plant ${plant}`)
    let currentConfig = config.get().plants[plant]

    res.send(currentConfig)
  })

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
})()


