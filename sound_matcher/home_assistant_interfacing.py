import requests
def TriggerScript(IP, LongLivedAccessToken, scriptID):
    HA_URL = "http://" + IP + ":8123/api/services/script/turn_on"
    TOKEN = LongLivedAccessToken
    ENTITY = scriptID

    headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
    }
    data = {
    "entity_id": ENTITY,
    }
    response = requests.post(HA_URL, headers=headers, json=data) # Sends the request to Home Assistant
    
     
