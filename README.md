# The Dumptruck

The Dumptruck is a ridiculously overengineered robot designed to feed plants on a schedule and measure their pH values. It presents this data in an easy-to-use web format that is modeled after [my own portfolio](https://joecardenas.dev/). 

## The Frontend

The frontend is a simple plain HTML/CSS/JS website located in `frontend` served through [Caddy](https://caddyserver.com/). It communicates to an API hosted on a local network by the same machine that hosts the server. It includes simple elements to change the schedule of feeding and providing pH Up and pH Down chemicals. It also displays recent pH measurement data as provided by the API and subtly changes the backgrounds of each plant to reflect their current pH status.

## Scheduler & API

The scheduler and API are located in `js`. They are written in JavaScript, run through [PM2](https://pm2.io/), the API is served using [express.js](https://expressjs.com/), and the tasks are scheduled using [toad-scheduler](https://github.com/kibertoad/toad-scheduler/). When the program starts, it schedules all jobs. Through the API, jobs' schedules can be read or written to. The API can also read pH measurements, which are stored in a JSON file. Whenever the scheduler wants to tell the driver to perform a certain action or take a certain measurement, it pushes to a FIFO queue in a Redis database. 

## Driver

The driver carries out all the physical actions requested by the scheduler. It is written in Python. The driver communicates with an Arduino (to get analog values from a generic pH sensor), an Adafruit PWM module, and numerous motor encoders. When the driver recieves a job from the Redis queue, it fulfills it and then sends back any necessary data using a return queue. 