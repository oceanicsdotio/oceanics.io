/* tslint:disable */
/* eslint-disable */
/**
*/
export function greet(): void;
/**
* @returns {string}
*/
export function get_rust_data(): string;
/**
* @param {string} name
* @returns {string}
*/
export function hello_world(name: string): string;
/**
*/
export function panic_hook(): void;
/**
* @param {any} _color
* @returns {CanvasRenderingContext2D}
*/
export function create_color_map_canvas(_color: any): CanvasRenderingContext2D;
/**
* @param {CanvasRenderingContext2D} ctx
* @param {number} w
* @param {number} h
* @param {any} color
*/
export function clear_rect_blending(ctx: CanvasRenderingContext2D, w: number, h: number, color: any): void;
/**
* @param {CanvasRenderingContext2D} ctx
* @param {string} caption
* @param {number} x
* @param {number} y
* @param {any} color
* @param {string} font
*/
export function draw_caption(ctx: CanvasRenderingContext2D, caption: string, x: number, y: number, color: any, font: string): void;
/**
* @param {CanvasRenderingContext2D} ctx
* @param {number} frames
* @param {number} time
* @param {any} color
* @returns {number}
*/
export function draw_fps(ctx: CanvasRenderingContext2D, frames: number, time: number, color: any): number;
/**
* @param {CanvasRenderingContext2D} ctx
* @param {number} x
* @param {number} y
* @param {number} scale
* @param {any} color
*/
export function draw_single_pixel(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: any): void;
/**
* @param {number} size
* @returns {number}
*/
export function alloc(size: number): number;
/**
* @param {number} ptr
* @param {number} cap
*/
export function dealloc(ptr: number, cap: number): void;
/**
* @param {string} path
* @returns {Promise<any>}
*/
export function fetch_text(path: string): Promise<any>;
/**
* @param {Float64Array} series
* @returns {Float64Array}
*/
export function make_vertex_array(series: Float64Array): Float64Array;
/**
*
*    After generating the base data array, clamp it and create a new
*    array as a JavaScript/HTML image data element.
*    
* @param {number} world_size
* @param {number} water_level
* @returns {ImageData}
*/
export function image_data(world_size: number, water_level: number): ImageData;
/**
* @param {number} jj
* @param {number} length
* @param {number} grid_size
* @returns {number}
*/
export function x_transform(jj: number, length: number, grid_size: number): number;
/**
* @param {number} xx
* @param {number} phase
* @param {number} width
* @returns {number}
*/
export function z_transform(xx: number, phase: number, width: number): number;
/**
* @param {number} day_of_year
* @param {number} latitude
* @param {number} time_of_day
* @returns {number}
*/
export function photosynthetically_active_radiation(day_of_year: number, latitude: number, time_of_day: number): number;
/**
* @param {WebGLRenderingContext} context
* @param {WebGLBuffer} buffer
* @param {number} handle
* @param {number} count
*/
export function bind_attribute(context: WebGLRenderingContext, buffer: WebGLBuffer, handle: number, count: number): void;
/**
*
*    Compile the shaders and link them to a program, returning the pointer to the executable
*    in GPU memory. 
*
*    This is the high-level routine called directly from JavaScript. 
*    
* @param {WebGLRenderingContext} ctx
* @param {string} vertex
* @param {string} fragment
* @returns {WebGLProgram}
*/
export function create_program(ctx: WebGLRenderingContext, vertex: string, fragment: string): WebGLProgram;
/**
*
*    Memory buffers are used to store array data for visualization.
*
*    This could be colors, or positions, or offsets, or velocities. 
*    
* @param {WebGLRenderingContext} ctx
* @param {Float32Array} data
* @returns {WebGLBuffer}
*/
export function create_buffer(ctx: WebGLRenderingContext, data: Float32Array): WebGLBuffer;
/**
*
*    Activate the chosen texture so that GL operations on textures will target it. The
*    texture number is [0,...) and can be accessed sequentially by offset.  
*
*    Currently we only support 2D textures, which can be stacked to emulate 3D.
*    
* @param {WebGLRenderingContext} ctx
* @param {WebGLTexture} texture
* @param {number} unit
*/
export function bind_texture(ctx: WebGLRenderingContext, texture: WebGLTexture, unit: number): void;
/**
*
*    Define a 2D array in GPU memory, and bind it for GL operations. 
*    
* @param {WebGLRenderingContext} ctx
* @param {ImageData} data
* @param {number} filter
* @param {number} _width
* @param {number} _height
* @returns {WebGLTexture}
*/
export function create_texture(ctx: WebGLRenderingContext, data: ImageData, filter: number, _width: number, _height: number): WebGLTexture;
/**
*/
export class ContextCursor {
  free(): void;
/**
* @param {number} x
* @param {number} y
*/
  constructor(x: number, y: number);
/**
*
*        Draw radial ticks
*            - theta: angle of rotation for set of all ticks
*            - n: the number of ticks
*            - a, b: the inner and outer radiuses
*        
* @param {CanvasRenderingContext2D} ctx
* @param {number} theta
* @param {number} n
* @param {number} a
* @param {number} b
*/
  static ticks(ctx: CanvasRenderingContext2D, theta: number, n: number, a: number, b: number): void;
/**
* @param {number} x
* @param {number} y
*/
  update(x: number, y: number): void;
/**
* @param {CanvasRenderingContext2D} ctx
* @param {number} w
* @param {number} h
* @param {any} color
* @param {number} time
* @param {number} line_width
*/
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, color: any, time: number, line_width: number): void;
}
/**
*
*     * The Cypher data structure contains pre-computed queries
*     * ready to be executed against the Neo4j graph database.
*     
*/
export class Cypher {
  free(): void;
/**
* @returns {string}
*/
  readonly query: string;
/**
*/
  read_only: boolean;
}
/**
*
*    Features are used in multiple ways. Both by the probability table.
*    and by the game interface. 
*    
*/
export class Feature {
  free(): void;
}
/**
*/
export class InteractiveDataStream {
  free(): void;
/**
*
*         * Create a new container without making too many assumptions
*         *  how it will be used. Mostly streams are dynamically
*         * constructed on the JavaScript side.
*         
* @param {number} capacity
*/
  constructor(capacity: number);
/**
*
*         * Compose the data-driven visualization and draw to the target HtmlCanvasElement.
*         
* @param {HTMLCanvasElement} canvas
* @param {number} time
* @param {any} style
*/
  draw(canvas: HTMLCanvasElement, time: number, style: any): void;
/**
*
*         * Hoist the datastream push method, needed to ensure JavaScript binding
*         
* @param {number} x
* @param {number} y
*/
  push(x: number, y: number): void;
/**
*
*         * Hoist data stream size getter, needed to ensure JavaScript binding
*         
* @returns {number}
*/
  size(): number;
/**
*
*         * Hoist cursor setter, needed to ensure JavaScript binding
*         
* @param {number} x
* @param {number} y
*/
  update_cursor(x: number, y: number): void;
}
/**
*
*    * Container for rectilinear grid that also has a cursor reference,
*    * and keeps track of metadata related to sampling and rendering.
*    
*/
export class InteractiveGrid {
  free(): void;
/**
*
*        * JavaScript binding for creating a new interactive grid container
*        
* @param {number} nx
* @param {number} ny
* @param {number} nz
* @param {number} stencil
*/
  constructor(nx: number, ny: number, nz: number, stencil: number);
/**
*
*        * Hoisting function for cursor updates from JavaScript. 
*        * Prevents null references in some cases.
*        
* @param {number} x
* @param {number} y
*/
  update_cursor(x: number, y: number): void;
/**
* 
*        * Animation frame is used as a visual feedback test 
*        * that utilizes most public methods of the data structure.
*        
* @param {HTMLCanvasElement} canvas
* @param {number} time
* @param {any} style
*/
  draw(canvas: HTMLCanvasElement, time: number, style: any): void;
}
/**
*
*     * Container for mesh that also contains cursor and rendering target infromation
*     
*/
export class InteractiveMesh {
  free(): void;
/**
*
*         * By default create a simple RTIN graph and initial the cursor
*         
* @param {number} nx
* @param {number} ny
*/
  constructor(nx: number, ny: number);
/**
*
*         * Compose a data-driven interactive canvas for the triangular network. 
*         
* @param {HTMLCanvasElement} canvas
* @param {number} time
* @param {any} style
*/
  draw(canvas: HTMLCanvasElement, time: number, style: any): void;
/**
*
*         * Update link forces and vectors. 
*         * 
*         * First use the edges to apply forces vectors to each particle, incrementally
*         * updating the velocity.
*         
* @param {number} drag
* @param {number} bounce
* @param {number} dt
* @param {number} collision_threshold
*/
  updateState(drag: number, bounce: number, dt: number, collision_threshold: number): void;
/**
*
*         * Hoisting function for cursor updates from JavaScript. 
*         * Prevents null references in some cases
*         
* @param {number} x
* @param {number} y
*/
  updateCursor(x: number, y: number): void;
/**
*
*         * Rotate the mesh in place
*         
* @param {number} angle
* @param {number} ax
* @param {number} ay
* @param {number} az
*/
  rotate(angle: number, ax: number, ay: number, az: number): void;
}
/**
*
*     The Island Kernel is used to generate island features
*     when the program is used in generative mode.
*     
*/
export class IslandKernel {
  free(): void;
/**
*/
  depth: number;
/**
*/
  mask: number;
}
/**
*
*     * Links are the relationships between two entities.
*     *
*     * They are directional, and have properties like entities. When you
*     * have the option, it is encouraged to use rich links, instead of
*     *  doubly-linked nodes to represent relationships.
*     *
*     * The attributes are for a `Links` are:
*     * - `_symbol`, a private str for cypher query templating
*     * - `rank`, a reinforcement learning parameter for recommending new data
*     * - `uuid`, the unique identifier for the entity
*     * - `props`, properties blob
*     * - `label`, the optional label for the relationship, we only use one per link
*     
*/
export class Links {
  free(): void;
/**
* @param {string | undefined} label
* @param {number | undefined} rank
* @param {number | undefined} cost
* @param {string | undefined} pattern
*/
  constructor(label?: string, rank?: number, cost?: number, pattern?: string);
/**
*
*         * Query to remove a links between node patterns
*         
* @param {Node} left
* @param {Node} right
* @returns {Cypher}
*/
  drop(left: Node, right: Node): Cypher;
/**
*
*         * Create links between node patterns
*         
* @param {Node} left
* @param {Node} right
* @returns {Cypher}
*/
  join(left: Node, right: Node): Cypher;
/**
*
*         * Use link-based queries, usually to get all children/siblings,
*         * but actually very flexible.
*         
* @param {Node} left
* @param {Node} right
* @param {string} result
* @returns {Cypher}
*/
  query(left: Node, right: Node, result: string): Cypher;
/**
*/
  cost?: number;
/**
*/
  rank?: number;
}
/**
*
*    The MiniMap is a data structure and interactive container.
*    It contains persistent world data as a raster, and exposes
*    selection and subsetting methods to explore subareas. 
*    
*/
export class MiniMap {
  free(): void;
/**
*
*         * Constructor to init the data structure from JavaScript. 
*         
* @param {number} vx
* @param {number} vy
* @param {number} world_size
* @param {number} water_level
* @param {CanvasRenderingContext2D} ctx
* @param {number} grid_size
*/
  constructor(vx: number, vy: number, world_size: number, water_level: number, ctx: CanvasRenderingContext2D, grid_size: number);
/**
* @param {number} jj
* @param {number} index
* @param {number} length
* @param {number} width
* @param {number} phase
* @returns {string}
*/
  get_dynamic_tile(jj: number, index: number, length: number, width: number, phase: number): string;
/**
* @param {CanvasRenderingContext2D} ctx
* @param {number} ii
* @param {number} jj
* @param {number} length
* @param {number} time
* @param {number} width
* @param {number} tile
*/
  drawTile(ctx: CanvasRenderingContext2D, ii: number, jj: number, length: number, time: number, width: number, tile: number): void;
/**
*
*         * Public interface to update actions
*         
* @param {number} actions
*/
  set_actions(actions: number): void;
/**
*
*         * Get remaining actions from Javascript
*         
* @returns {number}
*/
  actions(): number;
/**
*
*         * Hoist the insert feature method and rename it for
*         * web interface
*         
* @param {any} feature
*/
  insertFeature(feature: any): void;
/**
*
*         * Hoist the score calculating method
*         
* @returns {number}
*/
  score(): number;
/**
*
*         * Get the JSON serialized tile data from a linear index. 
*         
* @param {number} index
* @returns {any}
*/
  get_tile(index: number): any;
/**
*
*         * Hoist the replace tile function to make it 
*         * available from JavaScript interface.
*         * This swaps out a tile for another tile.
*         
* @param {number} ii
* @param {number} jj
*/
  replaceTile(ii: number, jj: number): void;
/**
*/
  clear(): void;
/**
* @param {number} ind
* @param {number} ii
* @param {number} jj
* @returns {number}
*/
  insertTile(ind: number, ii: number, jj: number): number;
/**
* @param {number} index
* @returns {number}
*/
  get_mask(index: number): number;
/**
* @param {CanvasRenderingContext2D} ctx
* @returns {ImageData}
*/
  visible(ctx: CanvasRenderingContext2D): ImageData;
/**
*
*         * Access method for current view
*         
* @returns {number}
*/
  view_x(): number;
/**
*
*         * Access method for current view
*         
* @returns {number}
*/
  view_y(): number;
/**
*
*         * Move the field of view in the overall world image. Input is used 
*         * my onClick events to navigate around the map.
*         
* @param {CanvasRenderingContext2D} ctx
* @param {number} vx
* @param {number} vy
*/
  updateView(ctx: CanvasRenderingContext2D, vx: number, vy: number): void;
/**
*
*         * Make a white box, that will be filled in with image
*         * data to form a frame. 
*         
* @param {CanvasRenderingContext2D} ctx
*/
  draw_bbox(ctx: CanvasRenderingContext2D): void;
/**
*
*         * Draw the image data, then a square, and then fill the square with part of the image data again to form
*         * a frame
*         
* @param {CanvasRenderingContext2D} ctx
*/
  draw_image_data(ctx: CanvasRenderingContext2D): void;
}
/**
*
*     * The Node data structure encapsulates logic needed for
*     * representing entities in the Cypher query language.
*     
*/
export class Node {
  free(): void;
/**
* @param {string | undefined} pattern
* @param {string | undefined} symbol
* @param {string | undefined} label
*/
  constructor(pattern?: string, symbol?: string, label?: string);
/**
*
*         * Query to delete a node pattern from the graph.
*         
* @returns {Cypher}
*/
  delete(): Cypher;
/**
*
*         * Format a query that will merge a pattern into all matching nodes.
*         
* @param {Node} updates
* @returns {Cypher}
*/
  mutate(updates: Node): Cypher;
/**
*
*         * Generate a query to load data from the database
*         
* @param {string | undefined} key
* @returns {Cypher}
*/
  load(key?: string): Cypher;
/**
* @returns {Cypher}
*/
  create(): Cypher;
}
/**
*
*     * Data structure representing a Node Index, which can be used to
*     * to create index on node property to speed up retievals and enfroce
*     * unique constraints.
*     
*/
export class NodeIndex {
  free(): void;
/**
* @param {string} label
* @param {string} key
*/
  constructor(label: string, key: string);
/**
*
*         * Indexes add a unique constraint as well as speeding up queries
*         * on the graph database.
*         
* @returns {Cypher}
*/
  add(): Cypher;
/**
*
*         * Remove the index
*         
* @returns {Cypher}
*/
  drop(): Cypher;
/**
*
*         * Apply a unique constraint, without creating an index
*         
* @returns {Cypher}
*/
  unique_constraint(): Cypher;
}
/**
*/
export class PrismCursor {
  free(): void;
/**
* @param {number} x
* @param {number} y
* @param {number} device_pixel_ratio
* @param {number} grid_size
*/
  constructor(x: number, y: number, device_pixel_ratio: number, grid_size: number);
/**
* @param {number} x
* @param {number} y
*/
  update(x: number, y: number): void;
/**
* @param {number} width
* @returns {number}
*/
  gridX(width: number): number;
/**
* @param {number} width
* @returns {number}
*/
  gridY(width: number): number;
/**
* @returns {number}
*/
  x(): number;
/**
* @returns {number}
*/
  y(): number;
}
/**
*/
export class SimpleCursor {
  free(): void;
/**
* @param {number} x
* @param {number} y
*/
  constructor(x: number, y: number);
/**
* @param {number} x
* @param {number} y
*/
  update(x: number, y: number): void;
/**
*
*        The simple cursor rendering method is stateless exept for the cursor position,
*        which is updated asynchronously from the JavaScript interface so that event handling
*        is isolated from the request animation frame loop.
*
*        Components include 4 segments between the axes and the cursor position. These have
*        minimum length of `tick_size` or the distance current position from the axis. The
*        max length is `tick_size` plus the distance to the cursor, modulated by the
*        `completeness` parameter. 
*        
* @param {CanvasRenderingContext2D} ctx
* @param {number} w
* @param {number} h
* @param {any} color
* @param {number} font_size
* @param {number} line_width
* @param {number} tick_size
* @param {number} completeness
* @param {number} label_padding
*/
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, color: any, font_size: number, line_width: number, tick_size: number, completeness: number, label_padding: number): void;
/**
*/
  x: number;
/**
*/
  y: number;
}
/**
*
*    Tiles are individual features, aka the instance of
*    a type of feature, which is stored in memory and may be 
*    modified to deviate from the basic rules.
*
*    These are used in the TileSet struct.
*
*    These have:
*    - feature: unique string identifying the base type
*    - flip: render left or right facing sprite
*    - value: passive value toward total score
*    - frame_offset: start frame to desync animations
*    
*/
export class Tile {
  free(): void;
}
/**
*
*     * Tileset collects data structures related to generating and saving
*     * features in the game.
*     * Tiles are stored in `tiles`. 
*     * Current count of each type is stored
*     * in a HashMap indexed by tile type, and mapping of diagonal indices
*     * to linear indices is stored in a another HashMap.
*     
*/
export class TileSet {
  free(): void;
}
