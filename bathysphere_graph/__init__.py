from connexion import App
from os import getenv
from flask_cors import CORS

try:
    from .secrets import defaults
except ImportError:
    defaults = {
        'ADMIN': '',
        'ADMIN_PASS': '',
        'API_KEY': '',
        'HOST': 'localhost',
        'EMAIL_ACCT': '',
        'EMAIL_KEY': '',
        "EMAIL_SERVER": "",
        "EMAIL_PORT": 0,
        "REPLY_TO": "",
        "SECRET": "",
        "PORT": 5000,
        "BASE_PATH": "/api"
    }


app = App(__name__, specification_dir="../openapi/", options={"swagger_ui": False})
for key, value in defaults.items():
    app.app.config[key] = getenv(key, value)

CORS(app.app)
app.add_api('api.yml', base_path=app.app.config["BASE_PATH"])
