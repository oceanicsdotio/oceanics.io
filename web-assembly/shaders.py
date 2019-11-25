from ctypes import (
    c_char_p,
    cast,
    pointer,
    POINTER,
    c_char,
    c_float,
    byref,
    c_int,
    create_string_buffer,
)
from pyglet.gl import (
    glCreateProgram,
    glGetProgramiv,
    GL_INFO_LOG_LENGTH,
    glLinkProgram,
    glGetProgramInfoLog,
    GL_LINK_STATUS,
    GL_COMPILE_STATUS,
    GL_VERTEX_SHADER,
    GL_FRAGMENT_SHADER,
    glGetShaderiv,
    glCompileShader,
    glShaderSource,
    glGetShaderInfoLog,
    glCreateShader,
    glAttachShader,
    GLuint,
    glUniformMatrix4fv,
    glGetUniformLocation,
)

from numpy import arange, ones
from pyglet.graphics import Batch
from pyglet.gl import GL_FRONT, GL_LIGHTING, GL_FILL, GL_RGB, GL_UNSIGNED_BYTE
from pyglet.gl import (
    glPolygonMode,
    glDisable,
    glReadPixels,
    GLfloat,
    GLubyte,
)  # Methods / Data types


from bathysphere_array.utils import c_array


def encode_shader(header, body):
    # type: (str, str) -> bytes
    return f"{header} void main() {{{body}}}".encode()


def read_pixel_color(px, py, qval):
    """Read color at clicked pixel"""
    glReadPixels(px, py, 1, 1, GL_RGB, GL_UNSIGNED_BYTE, qval)


def vertex_header(lights: (int,)):
    """
    Generate source code for vertex shader header only
    """
    lines = [
        "varying vec3 normal, ray;",
        "varying vec4 color_base, color_light;",
        *(f"varying vec3 lightDir{ii};" for ii in lights),
    ]
    return "\n".join(lines)


def vertex_body(lights: (int,) = arange(1)):
    """
    Generate Body of vertex shader
    """
    lines = [
        "color_base = vec4(3.0*gl_Vertex[2], 0, 5.0*gl_Vertex[2], 1.0);",
        "color_light = vec4(5.0*gl_Vertex[2], 0, 3.0*gl_Vertex[2], 1.0);",
        "normal = gl_NormalMatrix * gl_Normal;",
        "vec3 view_vertex = vec3(gl_ModelViewMatrix * gl_Vertex);",
        *(  # get vector from lights to vertex
            f"lightDir{ii} = vec3(gl_LightSource[{ii}].position.xyz - view_vertex);"
            for ii in lights
        ),
        "ray = -view_vertex;",  # vec to viewpoint from vertex
        "gl_Position = gl_ProjectionMatrix * gl_ModelViewMatrix * gl_Vertex;",
    ]
    return "\n".join(lines)


def vertex_shader(lights: int):
    """
    Create, and upload the shader to GPU memory
    """
    bytecode = encode_shader(
        header=vertex_header(lights), body=vertex_body(lights=arange(lights))
    )
    return compile_shader(bytecode, GL_VERTEX_SHADER)


def fragment_shader(lights: int):
    """
    Create, and upload the shader to GPU memory
    """
    bytecode = encode_shader(
        header=fragment_header(), body=fragment_body(lights=arange(lights))
    )
    return compile_shader(bytecode, GL_FRAGMENT_SHADER)


def fragment_header():
    # type: () -> str
    """
    Generate source code for fragment shader global variable definitions
    """
    lines = [
        "varying vec3 normal, lightDir0, lightDir1, ray;",
        "varying vec4 color_base, color_light;",
    ]
    return "\n".join(lines)


def fragment_body(lights):
    # type: (tuple or int) -> str
    """
    Generate source code for fragment shader global variable definitions
    """
    lines = [
        "vec3 N = normalize(normal);",
        "vec4 final_color = (gl_FrontLightModelProduct.sceneColor * color_base);",
    ]
    for ii in lights:
        lines.extend(
            [
                f"final_color += (gl_LightSource[{ii}].ambient * color_base);",
                f"vec3 L{ii}=normalize(lightDir{ii});",
                f"float lambertTerm{ii}=dot(normal, L{ii});",
                f"if (lambertTerm{ii} > 0.0) {{{lambert_conditional(ii)}}};",
            ]
        )
    lines.append("gl_FragColor = final_color;")
    return "\n".join(lines)


def lambert_conditional(identity):
    # type: (int) -> str
    lines = [
        f"final_color += gl_LightSource[{identity}].diffuse * color_light * lambertTerm{identity};",
        f"vec3 E = normalize(ray);",
        f"vec3 R = reflect(-L{identity}, N);",
        f"float specular = pow( max(dot(R, E), 0.0), gl_FrontMaterial.shininess );"
        f"final_color += gl_LightSource[{identity}].specular * gl_FrontMaterial.specular * specular;",
    ]
    return "\n".join(lines)


def object_selection(width, height, code=255):
    """
    Build vertex and fragment shader from code

    :param vert:
    :param frag:
    :param color_pick:
    """

    sc = str(code) + ".0/255.0"  # string of code

    vert = [
        "void main() {",
        "vec3 vVertex = vec3(gl_ModelViewMatrix * gl_Vertex);",
        "gl_Position = ftransform();}",
    ]
    frag = f"void main () {{gl_FragColor = vec4({sc},{sc},{sc}, 1);}}"

    compile_shader([vert.encode()], GL_VERTEX_SHADER)  # create the vertex shader
    compile_shader([frag.encode()], GL_FRAGMENT_SHADER)  # create the fragment shader
    _link()  # link the program

    xpix = 2 * width
    ypix = 2 * height

    depth = (GLfloat * ypix * xpix)(c_array(*ones(ypix, dtype=float)))
    qval = (GLubyte * 1)(0)
    qdep = (GLfloat * 1)(0)


def draw(batches, handles, mode=GL_FILL):
    # type: ((Batch,), tuple, int) -> None
    """Selection mode"""
    glPolygonMode(GL_FRONT, mode)  # filled triangles
    glDisable(GL_LIGHTING)

    for each, shader in zip(batches, handles):  # cycle through all batches
        bind_shader()
        each.draw()
        glAttachShader(0)


def setup(batches=1):
    colorinc = 255 // batches
    batches = tuple(Batch() for each in range(batches))

    for ii in arange(batches):

        picker.append(Shader(color_pick=(ii + 1) * colorinc))
        key.append((ii + 1) * colorinc)


def create_program(lights: int = 2):
    """
    Build vertex and fragment shader from code.

    Bind the program by calling glUseProgram(handle).
    """
    handle = glCreateProgram()  # create the program handle
    _vertex_shader = vertex_shader(lights=lights)  # create the vertex shader
    _fragment_shader = fragment_shader(lights=lights)  # create the fragment shader
    glLinkProgram(handle)
    status = get_program_log(handle)  # retrieve the log length
    return handle, status, _vertex_shader, _fragment_shader


def get_program_log(handle):
    """
    Create a log buffer to retrieve failed compilation info.
    """
    status = c_int(0)
    glGetProgramiv(handle, GL_LINK_STATUS, byref(status))
    if status:
        return None

    glGetProgramiv(handle, GL_INFO_LOG_LENGTH, byref(status))  # create a log buffer
    buffer = create_string_buffer(status.value)  # retrieve text
    glGetProgramInfoLog(handle, status, None, buffer)  # print log
    return buffer.value


def uniform(handle, name: str, *vals: list, kind: type):
    """Floating point or integer uniform"""
    if kind not in (int, float):
        raise TypeError
    (exec(f"glUniform{len(vals)}{'f' if kind == float else 'i'}"))(
        glGetUniformLocation(handle, name), *vals
    )


def uniform_matrixf(handle, name, mat):
    # type: (GLuint, str, list or tuple) -> None
    """Matrix stored as list"""
    loc = glGetUniformLocation(handle, name)  # upload the 4x4 floating point matrix
    glUniformMatrix4fv(loc, 1, False, c_array(c_float, *mat))
