import json
from config import STATE_FILE


def load_state():
    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except:
        return {"positions": []}


def save_state(data):
    with open(STATE_FILE, "w") as f:
        json.dump(data, f)