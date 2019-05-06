from . import graph
from . import sensing
from . import tasking
from . import catalog
from . import mesh

from connexion import FlaskApp
from flask_cors import CORS


app = FlaskApp(__name__, specification_dir="../openapi/", options={"swagger_ui": False})
CORS(app.app)
app.add_api('api.yml')
