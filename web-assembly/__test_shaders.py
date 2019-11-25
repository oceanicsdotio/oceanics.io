import pytest
from pyglet.gl import (
    GLfloat,
    GL_VERTEX_ARRAY,
    glVertexPointer,
    glLoadIdentity,
    glDrawArrays,
    GL_COLOR_BUFFER_BIT,
    GL_FLOAT,
    glEnableClientState,
    glClear,
    GL_POINTS,
)

from bathysphere.interface import Interface


@pytest.mark.xfail
def test_rescale_model(model):

    model.vert[:, 0:2] *= 3.0
    model.vert[:, 0:2] -= 1.5
    model.vert[:, 2] = -0.1 * model.vert[:, 2] + 0.1


@pytest.mark.xfail
@pytest.mark.interactive
def test_create_window(model):

    window = Interface(lights=2)  # create instance of user interface window
    window.setup(batches=1)  # apply GL environment variables
    model.add(
        window.batch[0], flat=False, points=True
    )


@pytest.mark.xfail
@pytest.mark.interactive
def test_draw_frame(mesh):
    def draw(vertices, dims):
        glClear(GL_COLOR_BUFFER_BIT)
        glLoadIdentity()
        glDrawArrays(GL_POINTS, 0, len(vertices) // dims)

    vert = mesh.get("vertices")
    draw(vert, 3)
    # noinspection PyTypeChecker
    vertices_gl_array = (GLfloat * len(vert))(*vert)
    glEnableClientState(GL_VERTEX_ARRAY)
    glVertexPointer(2, GL_FLOAT, 0, vertices_gl_array)
