#!/usr/bin/env python3
import RPi.GPIO as GPIO
import time
import sound_matcher as sm

BUTTON_PIN = 18
LED_PIN = 21

# Clean up any previous GPIO setup
GPIO.cleanup()

GPIO.setmode(GPIO.BCM)
GPIO.setup(BUTTON_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(LED_PIN, GPIO.OUT)
GPIO.output(LED_PIN, GPIO.LOW)

def trigger_voice_command():
    print("Button pressed! Running voice command...")
    try:
        sm.listen_once("default_user")
    except Exception as e:
        print(f"Error in voice command: {e}")

def button_callback(channel):
    print("Button detected!")
    GPIO.output(LED_PIN, GPIO.HIGH)
    trigger_voice_command()
    GPIO.output(LED_PIN, GPIO.LOW)

try:
    GPIO.add_event_detect(BUTTON_PIN, GPIO.FALLING, callback=button_callback, bouncetime=500)
    print("Voice command button ready! Press the button...")
    
    # Keep the script running
    while True:
        time.sleep(1)
        
except Exception as e:
    print(f"GPIO Error: {e}")
finally:
    GPIO.cleanup()