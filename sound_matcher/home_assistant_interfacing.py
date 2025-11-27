import requests
def TriggerScript(scriptID):
    HA_URL = "http://" + HASS_IP + ":8123/api/services/script/turn_on"
    TOKEN = HASS_TOKEN
    ENTITY = scriptID

    headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
    }
    data = {
    "entity_id": ENTITY,
    }
    response = requests.post(HA_URL, headers=headers, json=data) # Sends the request to Home Assistant
    
     
HASS_IP = ""
HASS_TOKEN = ""

def set_hass_credentials(ip: str, token: str) -> None:
    """Set Home Assistant credentials for use in voice commands"""
    global HASS_IP, HASS_TOKEN
    HASS_IP = ip
    HASS_TOKEN = token
