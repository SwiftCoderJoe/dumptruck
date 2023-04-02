from tokenize import String
import libJoe
import redis
import serial

# import redis

from time import sleep

db = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Set up serial connection
ser = serial.Serial('/dev/ttyACM0', 115200, timeout=5)
sleep(5)
# Wait 5 seconds because of https://playground.arduino.cc/Main/DisablingAutoResetOnSerialConnection/
ser.reset_input_buffer()

# Define physical hardware
motor = libJoe.SmartMotor(0, libJoe.EncoderPins(24, 23))
phupDispenser = libJoe.SmartDispenser(1, libJoe.EncoderPins(8, 7))
foodDispenser = libJoe.SmartDispenser(3, libJoe.EncoderPins(5, 6))
bucket = libJoe.SmartServo(2)

# Define physical locations

# Feed one, feed two, plant zero, plant one, plant two
LOCATIONS = [230, 20, 550, 1000, 1600]
# Small to large dispenses. Only the first is generally used.
MOVEMENTS = [50, 200, 300, 400, 500]

def handleResponse(response: String):
  print("REDIS: Handling response: " + response)
  tokenizedResponse = response.split(" ")
  if len(tokenizedResponse) < 1:
    print("REDIS: ERROR TOKENIZING STRING: " + response)
    return

  if tokenizedResponse[0] == "FEED":
    print("REDIS: Response decoded as a FEED command.")
    feedPlant(tokenizedResponse[1:])

  if tokenizedResponse[0] == "PHUP":
    print("Response decoded as a PHUP command.")
    phupPlant(tokenizedResponse[1:])

  if tokenizedResponse[0] == "MRPH":
    print("Response decoded as a MRPH command.")
    measurePHPlant(tokenizedResponse[1:])

def measurePHPlant(arguments):
  ser.write(("MRPH " + arguments[0] + " " + arguments[1] + "\n").encode())
  response = ser.readline().decode('utf-8').rstrip()
  db.rpush("main:return", response)

def feedPlant(arguments):
  motor.moveLeftToTarget(LOCATIONS[0])
  sleep(1)
  foodDispenser.rotate(MOVEMENTS[0])
  sleep(1)

  navAndDump(int(arguments[0]))

  # Return Home
  motor.moveToHome()

def phupPlant(arguments):
  motor.moveLeftToTarget(LOCATIONS[1])
  sleep(1)
  phupDispenser.rotate(MOVEMENTS[0])
  sleep(1)

  navAndDump(int(arguments[0]))

  # Return Home
  motor.moveToHome()

def navAndDump(plant):
  motor.moveLeftToTarget(LOCATIONS[plant + 2])

  bucket.dumpMaterial()

try:

  motor.moveToHome(start_delay=True)

  while True:
    response = db.lpop("main:queue")

    if response is not None:
      print("REDIS: Recieved response: " + response)
      handleResponse(response)

    sleep(1)

except KeyboardInterrupt:
  motor.stop()
  foodDispenser.stop()
  phupDispenser.stop()
  print("Stopped")
