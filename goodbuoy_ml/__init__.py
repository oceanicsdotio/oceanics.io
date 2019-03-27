from connexion import App
from flask_cors import CORS
from . import routes

app = App(__name__, specification_dir="../openapi/", options={"swagger_ui": False})
CORS(app.app)
app.add_api('api.yml')