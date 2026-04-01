import json
import os

STATE_FILE = "state.json"


def load_state():
    if not os.path.exists(STATE_FILE):
        return {"positions": []}

    with open(STATE_FILE, "r") as f:
        data = json.load(f)

    if "positions" not in data:
        data["positions"] = []

    return data


def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)