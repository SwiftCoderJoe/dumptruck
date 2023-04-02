
## Redis commands

These commands are sent over the Redis database connection from the javascript api to the driver.

### Opcodes:

PHUP [plant number]:
    Tells the driver to send pH up material to the selected plant

PHDN [plant number]:
    Tells the driver to send pH down material to the selected plant

FEED [plant number]:
    Tells the driver to send feed/MaxiGro to the selected plant

MRPH [plant number] [id]: 
    Tells the driver to measure the pH of the selected plant. The response code will also include the id.

### Responses:
All response codes begin with an ID. They are handled based on the ID.

[id] [pH Measurement]:
    Response with the pH mV value from the pH sensor.