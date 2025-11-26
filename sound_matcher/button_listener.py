#!/usr/bin/env python3
import RPi.GPIO as GPIO
import time
import subprocess
import sound_matcher as sm

BUTTON_PIN = 18
LED_PIN = 21

def trigger_voice_command():
    print("Button pressed! Running voice command...")
    sm.listen_once("default_user")

GPIO.setmode(GPIO.BCM)
GPIO.setup(BUTTON_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(LED_PIN, GPIO.OUT)

def button_callback(channel):
    GPIO.output(LED_PIN, GPIO.HIGH)
    trigger_voice_command()
    GPIO.output(LED_PIN, GPIO.LOW)

GPIO.add_event_detect(BUTTON_PIN, GPIO.FALLING, callback=button_callback, bouncetime=500)

print("Voice command button ready!")
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    GPIO.cleanup()