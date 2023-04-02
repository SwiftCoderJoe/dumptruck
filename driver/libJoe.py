from adafruit_servokit import ServoKit
from gpiozero import RotaryEncoder
from time import sleep

kit = ServoKit(channels=16, frequency=60)

class SmartServo:
  def __init__(self, channel: int):
    self.servo = kit.servo[channel]
  def move(self, position):
    self.servo.fraction = position

  def dumpMaterial(self):
    self.move(0.9)
    sleep(1)
    self.move(0.1)
    sleep(1)
    self.move(0.9)
    sleep(1)

class SmartDispenser:
  def __init__(self, channel: int, encoderPins):
    self.motor = kit.continuous_servo[channel]
    self.encoder = RotaryEncoder(encoderPins.pinOne, encoderPins.pinTwo, max_steps=0)

  def move(self, target: int):
    if abs(self.encoder.steps - target) < 10:
      return
    elif self.encoder.steps < target:
      self.motor.throttle = -1
      while self.encoder.steps < target: # Busywaiting because I dont know python or gpiozero api!
        sleep(0.1)
        print(self.encoder.steps)
        pass
      self.motor.throttle = 0
    else:
      self.motor.throttle = 1
      while self.encoder.steps > target: # busywaiting again
        sleep(0.1)
        print(self.encoder.steps)
        pass
      self.motor.throttle = 0

  def rotate(self, steps: int):
    self.move(self.encoder.steps + steps)

  def stop(self):
    self.motor.throttle = 0
  
class SmartMotor:
  def __init__(self, channel: int, encoderPins):
    self.motor = kit.continuous_servo[channel]
    self.encoder = RotaryEncoder(encoderPins.pinOne, encoderPins.pinTwo, max_steps=0)
    self.home = 0

  def moveLeftToTarget(self, target: int):

    # Offset target by the current home location.
    offsetTarget = target + self.home

    if abs(self.encoder.steps - offsetTarget) < 10:
      print("NAVIGATION: Already close enough to target. Skipping.")
      return
    elif self.encoder.steps < offsetTarget:
      self.motor.throttle = -0.4
      while self.encoder.steps < offsetTarget: # Busywaiting because I dont know python or gpiozero api!
        sleep(0.1)
        # print(self.encoder.steps)
        pass
      self.motor.throttle = 0
    else:
      self.motor.throttle = 0.4
      while self.encoder.steps > offsetTarget: # busywaiting again
        sleep(0.1)
        # print(self.encoder.steps)
        pass
      self.motor.throttle = 0

  def moveToHome(self, start_delay=False):
    print("HOMING: Starting...")
    self.motor.throttle = 0.4
    lastEncoderSteps = 20000 # should never be this high
    if start_delay:
      sleep(0.1)
    while self.encoder.steps != lastEncoderSteps:
      lastEncoderSteps = self.encoder.steps
      sleep(0.1)
    self.motor.throttle = 0
    print("HOMING: Found home!")
    sleep(0.1)
    self.home = self.encoder.steps
    print("HOMING: New home set at " + str(self.home))

  def rotate(self, steps: int):
    self.move(self.encoder.steps + steps)

  def stop(self):
    self.motor.throttle = 0

class EncoderPins:
  def __init__(self, pinOne, pinTwo):
    self.pinOne = pinOne
    self.pinTwo = pinTwo
