from pyglet.window import key, Window, NoSuchConfigException, mouse
from pyglet.text import HTMLLabel
from pyglet.app import exit
from pyglet.event import EVENT_HANDLED
from pyglet.graphics import Batch

from pyglet.gl import (
    GL_FILL,
    GL_PROJECTION,
    GL_MODELVIEW,
    glOrtho,
    glMatrixMode,
    glDisable,
    glViewport,
    gluPerspective,
    Config,
    GL_FRONT,
    GL_FRONT_AND_BACK,
    GL_SPECULAR,
    GL_SHININESS,
    GL_AMBIENT_AND_DIFFUSE,
    GL_DEPTH_TEST,
    GL_LINE_SMOOTH,
    GL_BLEND,
    GL_SRC_ALPHA,
    GL_ONE_MINUS_SRC_ALPHA,
    GL_LIGHTING,
    GL_LINE,
    GL_DEPTH_BUFFER_BIT,
    GL_COLOR_BUFFER_BIT,
    GL_TRIANGLES,
    GL_POINTS,
    glMaterialfv,
    glMaterialf,
    glPolygonMode,
    glEnable,
    glClearColor,
    glLineWidth,
    glBlendFunc,
    glClear,
    glLoadIdentity,
    glTranslatef,
    glScalef,
    glRotatef,
    GL_CULL_FACE,
    glUseProgram,
)

from numpy import ones, zeros, vstack, array, pi
from bathysphere_array.shaders import c_array
from bathysphere_array.utils import DEGREES, ZAXIS, XAXIS, YAXIS, Array, rotate
from bathysphere_array.shapes import topology_normals, vertex_array_normals

DEF_WIDTH = 1080
DEF_HEIGHT = 720
VIEW_DISTANCE = 10
LEFT_MOUSE_BUTTON_BIT = 1
MIDDLE_MOUSE_BUTTON_BIT = 2
RIGHT_MOUSE_BUTTON_BIT = 4

html = """
<font size=+0 color=#FF3030><b>GLSL Demo</b></font><br/>
<font size=+0 color=#00FF60>
  Enter = Enable/disable GLSL shader<br/>
      Q = Toggle wireframe<br/>
W,S,A,D = Up, Down, Left, Right<br/>
      E = Reset viewpoint<br/>
  Space = Autorotate<br/>  
 Arrows = Move Light 0<br/> 
      H = Show controls<br/>   
    Esc = Quit<br/>
</font>"""


def point_cloud(vertex_array, normals, batch, group):
    # type: (Array, Array, Batch, int) -> None
    """
    Add a point cloud to current batch
    """
    xyz = list(vertex_array.flatten())
    vnormals = list(normals.flatten())
    colors = list(ones(vertex_array.shape, dtype=float).flatten())
    batch.add(
        vertex_array.shape[0],
        GL_POINTS,
        group,
        ("v3f/static", xyz),
        ("n3f/static", vnormals),
        ("c3f/static", colors),
    )


def triangles(vertex_array, topology, normals, batch, group):
    # type: (Array, Array, Array, Batch, int) -> None
    if topology.shape != normals.shape:
        raise ValueError

    for each, norm in zip(topology, normals):
        new = vstack((norm, norm, norm)).flatten()
        buffer = ("v3f/static", vertex_array[each, :].flatten())
        batch.add(3, GL_TRIANGLES, group, buffer, ("n3f/static", new))
    return


def add(vertex_array, topology, batch, group=None, flat=False, points=False):
    # type: (Array, Array, Batch, int, bool, bool) -> None
    """
    Add vertex list to batch for rendering
    """
    vnormals = vertex_array_normals(vertex_array, topology)
    fnormals = topology_normals(vertex_array, topology)

    if flat:
        triangles()

    if points:
        point_cloud()

    # if (back): vnormals *= -1.0
    xyz = list(vertex_array.flatten())
    faces = topology.flatten()
    vnormals = list(vnormals.flatten())
    vertex_arrayex_list = batch.add_indexed(
        len(vertex_array), GL_TRIANGLES, group, faces, ("v3f/static", xyz), ("n3f/static", vnormals)
    )


COLORS = [c_array(0.7, 0.4, 0.2, 1.0), c_array(0.0, 0.2, 0.5, 0.2)]


class Light:
    def __init__(self, identity, direction=False):
        """
        Set up a new light source

        :param identity:
        :param direction:
        """
        self.dir = direction
        self.id = identity
        self.pos = 10 * ZAXIS
        self.properties = dict()
        self.properties["GL_AMBIENT"] = array([0.2, 0.2, 0.2, 1.0])
        self.properties["GL_DIFFUSE"] = array([0.5, 0.5, 0.5, 1.0])
        self.properties["GL_SPECULAR"] = array([1.0, 1.0, 1.0, 1.0])
        self.step = 0.05 * pi  # user-movable spotlighting


def new_context(lights, width=2, smooth=True, cull=False, depth=True):
    """
    Open GL context

    :param lights: number of lights
    """
    if lights > 0:
        glEnable(GL_LIGHTING)
    lights = [Light(ii) for ii in range(lights)] if lights > 0 else None

    shader = Program()  # shader program object
    mode = GL_LINE

    if smooth:
        glEnable(GL_LINE_SMOOTH)
    glLineWidth(width)

    glEnable(GL_BLEND)
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)

    glClearColor(0.0, 0.0, 0.0, 0.0)  # Background color

    if depth:
        glEnable(GL_DEPTH_TEST)

    if cull:
        glEnable(GL_CULL_FACE)


def refresh(pan, rot, zoom):
    #
    """
    Clear current buffer for rendering or depth testing

    :param pan:
    :param rot:
    :param zoom:
    :return:
    """

    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
    glLoadIdentity()

    glTranslatef(pan[0], pan[1], -5.0)
    glRotatef(rot[0, 0] * DEGREES, 0, 0, 1)
    glRotatef(rot[0, 1] * DEGREES, 0, 1, 0)
    glRotatef(rot[0, 2] * DEGREES, 1, 0, 0)
    glScalef(zoom, zoom, zoom)


def _draw(batches, shader, mode):
    """
    Draw objects

    :param colors: list of vec colors
    :param shader: compiled shader
    :return:
    """

    glMaterialfv(GL_FRONT, GL_SPECULAR, c_array(1.0, 1.0, 1.0, 0.2))
    glMaterialf(GL_FRONT, GL_SHININESS, 50.0)
    glPolygonMode(GL_FRONT_AND_BACK, mode)  # metry wire frame or filled

    shader.bind()
    for item, color in batches:  # cycle through all batches
        glMaterialfv(GL_FRONT, GL_AMBIENT_AND_DIFFUSE, color)
        draw()
    glUseProgram(0)


class Interface(Window):
    def __init__(self):
        """Setup user interface instance"""
        # Create a window with multi-sampling (anti-aliasing)
        try:
            config = Config(
                sample_buffers=1, samples=4, depth_size=16, double_buffer=True
            )
            Window.__init__(
                self,
                width=DEF_WIDTH,
                height=DEF_HEIGHT,
                resizable=True,
                config=config,
                vsync=True,  # False to check framerate
            )

        # Fall back to no multi-sampling for old hardware
        except NoSuchConfigException:
            Window.__init__(self, resizable=True)

        self.pan = zeros(2, dtype=float)
        self.zoom = ones(1, dtype=float)
        self.showdialog = True
        self.overlay = True

        self.mbs = 0  # mouse button state
        self.mx = 0  # mouse x in screen coordinates
        self.my = 0  # mouse y in screen coordinates
        self.mdx = 0  # mouse movement
        self.mdy = 0  # mouse movement

        self.label = HTMLLabel(
            html,
            width=self.width / 2,
            multiline=True,
            anchor_x="center",
            anchor_y="center",
        )

    def on_mouse_press(self, x, y, buttons, modifiers):
        """When mouse is pressed"""

        # self.refresh()
        self.picker.draw(mode=GL_FILL)  # metry solid colored models
        self.__read_colorpixel(x, y)

        if self.qval[0] > 0:
            if buttons == mouse.LEFT:  # Left click
                if not (array(self.selected) == self.qval[0]).any():
                    print("Selected:", self.qval[0])
                    self.selected.append(self.qval[0])

            elif buttons == mouse.RIGHT:  # Right click
                if (array(self.selected) == self.qval[0]).any():
                    print("Deselected:", self.qval[0])
                    self.selected.remove(self.qval[0])

    def on_mouse_release(self, x, y, buttons, modifiers):
        """When mouse is released do nothing"""
        pass

    def on_mouse_motion(self, x, y, dx, dy):
        """Update mouse movement state for event handling"""
        self.mx = x
        self.my = y
        self.mdx = dx
        self.mdy = dy

    def on_mouse_scroll(self, x, y, scroll_x, scroll_y):
        """Mouse scroll controls zoom"""
        self.zoom += scroll_y * 0.05

    def on_mouse_drag(self, x, y, dx, dy, buttons, modifiers):
        """Mouse drag controls rotation and translation"""
        if buttons == mouse.RIGHT:  # Rotate
            self.rot[0, :] += (
                YAXIS * dx * self.rotstep - ZAXIS * dy * self.rotstep
            ).reshape(3)
        elif buttons == mouse.LEFT:  # Pan
            self.pan += 0.01 * array([dx, dy])

    def on_key_press(self, symbol, modifiers):
        """Keyboard mapping for user interface"""
        if symbol == key.H:  # Toggle states
            self.showdialog = not self.showdialog
            print("Toggle dialog", self.showdialog)

        elif symbol == key.SPACE:
            self.autorotate = not self.autorotate
            print("Toggle autorotate", self.autorotate)

        elif symbol == key.ENTER:
            self.shaderon = not self.shaderon
            if self.shaderon:
                print("Shader mode enabled")
            else:
                self.lighting = False
                print("Fixed pipeline enabled")

        elif symbol == key.Q:
            self.wireframe = not self.wireframe
            print("Toggle wireframe", self.wireframe)

        elif symbol == key.P:
            self.pointcloud = not self.pointcloud
            print("Toggle point cloud", self.pointcloud)

        elif symbol == key.O:
            self.perspective = not self.perspective
            print("Toggle ortho", not self.perspective)

        elif symbol == key.N:
            print("Toggle normals")
            self.normals = not self.normals

        elif symbol == key.E:  # Rotate world coordinates
            print("Reset view")
            self.rot[0, :] = zeros((1, 3), dtype=float)

        elif symbol == key.A:
            print("Stop left")
            self.autorotate = False
            self.rot[0, 1] += -self.rotstep
            self.rot[0, 1] %= 2 * pi

        elif symbol == key.S:
            print("Stop down")
            self.autorotate = False
            self.rot[0, 2] += self.rotstep
            self.rot[0, 2] %= 2 * pi

        elif symbol == key.W:
            print("Stop up")
            self.autorotate = False
            self.rot[0, 2] += -self.rotstep
            self.rot[0, 2] %= 2 * pi

        elif symbol == key.D:
            print("Stop right")
            self.autorotate = False
            self.rot[0, 1] += self.rotstep
            self.rot[0, 1] %= 2 * pi

        elif symbol == key.LEFT:  # Move light
            print("Light 0 rotate left")
            self.lights[0].pos = rotate(self.lights[0].pos, self.lightstep, YAXIS)
            self.lights[0].refresh()

        elif symbol == key.RIGHT:
            print("Light0 rotate right")
            self.lights[0].pos = rotate(self.lights[0].pos, -self.lightstep, YAXIS)
            self.lights[0].refresh()

        elif symbol == key.UP:
            print("Light 0 up")
            self.lights[0].pos = rotate(self.lights[0].pos, -self.lightstep, XAXIS)
            self.lights[0].refresh()

        elif symbol == key.DOWN:
            print("Light 0 down")
            self.lights[0].pos = rotate(self.lights[0].pos, self.lightstep, XAXIS)
            self.lights[0].refresh()

        elif symbol == key.ESCAPE:
            print("Exiting")  # ESC would do it anyway, but not "Q"
            self.close()
            exit()
            return EVENT_HANDLED

        else:
            print(symbol, "is unassigned")

    def on_resize(self, width, height):
        """Override default on_resize handler to create a 3D projection"""
        if height == 0:
            height = 1

        glViewport(0, 0, width * 2, height * 2)  # for Apple retina display
        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()

        front = 4.0
        scale = 2.0
        depth = 2 * scale

        aspect = width / float(height)
        if self.perspective:
            gluPerspective(30.0, aspect, 0.01, front + depth)
        else:
            glOrtho(
                -scale * aspect, scale * aspect, -scale, scale, front, front + depth
            )
            glMatrixMode(GL_MODELVIEW)

        return EVENT_HANDLED

    def on_draw(self, *args, **kwargs):
        """What to do when drawing"""
        self.refresh(self.pan, self.rot, self.zoom)
        self._draw_models()
        glDisable(GL_LIGHTING)
        glDisable(GL_DEPTH_TEST)
        glLoadIdentity()
        glTranslatef(0.0, 0.0, -4.5)
        glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
        glEnable(GL_DEPTH_TEST)
