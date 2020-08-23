/* tslint:disable */
/* eslint-disable */
/**
* @param {WebGLRenderingContext} ctx 
* @param {string} vertex 
* @param {string} fragment 
* @returns {WebGLProgram} 
*/
export function create_program(ctx: WebGLRenderingContext, vertex: string, fragment: string): WebGLProgram;
/**
* @param {WebGLRenderingContext} ctx 
* @param {Float32Array} data 
* @returns {WebGLBuffer} 
*/
export function create_buffer(ctx: WebGLRenderingContext, data: Float32Array): WebGLBuffer;
/**
* @param {WebGLRenderingContext} ctx 
* @param {WebGLTexture} texture 
* @param {number} unit 
*/
export function bind_texture(ctx: WebGLRenderingContext, texture: WebGLTexture, unit: number): void;
/**
* @param {WebGLRenderingContext} ctx 
* @param {ImageData} data 
* @param {number} filter 
* @param {number} _width 
* @param {number} _height 
* @returns {WebGLTexture} 
*/
export function create_texture(ctx: WebGLRenderingContext, data: ImageData, filter: number, _width: number, _height: number): WebGLTexture;
/**
* @param {number} np 
* @returns {Float64Array} 
*/
export function random_series(np: number): Float64Array;
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
* @param {number} frames 
* @param {number} time 
* @param {any} color 
* @returns {number} 
*/
export function draw_fps(ctx: CanvasRenderingContext2D, frames: number, time: number, color: any): number;
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
* @returns {any} 
*/
export function fetch_text(path: string): any;
/**
* @param {Float64Array} series 
* @returns {Float64Array} 
*/
export function make_vertex_array(series: Float64Array): Float64Array;
/**
* @param {number} x 
* @param {number} y 
*/
export function mouse_move(x: number, y: number): void;
/**
*/
export class Axis {
  free(): void;
}
/**
*/
export class CellIndex {
  free(): void;
}
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
*/
export class CursorState {
  free(): void;
}
/**
*/
export class DataStream {
  free(): void;
/**
* @param {number} capacity 
*/
  constructor(capacity: number);
/**
* @param {number} x 
* @param {number} y 
*/
  push(x: number, y: number): void;
/**
* @param {CanvasRenderingContext2D} ctx 
* @param {number} w 
* @param {number} h 
* @param {any} color 
* @param {number} point_size 
* @param {number} line_width 
* @param {number} alpha 
*/
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, color: any, point_size: number, line_width: number, alpha: number): void;
}
/**
*/
export class DrawingCanvas {
  free(): void;
}
/**
*/
export class EdgeIndex {
  free(): void;
}
/**
*/
export class Group {
  free(): void;
/**
* @param {number} count 
* @param {number} zero 
* @param {number} stop 
*/
  constructor(count: number, zero: number, stop: number);
/**
* @param {CanvasRenderingContext2D} ctx 
* @param {number} width 
* @param {number} height 
* @param {number} fade 
* @param {number} scale 
* @param {any} color 
*/
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, fade: number, scale: number, color: any): void;
/**
* @param {number} padding 
* @param {number} drag 
* @param {number} bounce 
*/
  update_links(padding: number, drag: number, bounce: number): void;
}
/**
*/
export class HexagonalGrid {
  free(): void;
/**
* @param {number} nx 
*/
  constructor(nx: number);
/**
* @param {CanvasRenderingContext2D} ctx 
* @param {number} w 
* @param {number} h 
* @param {number} mx 
* @param {number} my 
* @param {any} color 
* @param {number} line_width 
* @param {number} alpha 
*/
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, mx: number, my: number, color: any, line_width: number, alpha: number): void;
}
/**
*/
export class Observation {
  free(): void;
}
/**
*/
export class ObservedProperty {
  free(): void;
}
/**
*/
export class RectilinearGrid {
  free(): void;
/**
* @param {number} nx 
* @param {number} ny 
*/
  constructor(nx: number, ny: number);
/**
* @param {CanvasRenderingContext2D} ctx 
* @param {number} w 
* @param {number} h 
* @param {any} color 
*/
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, color: any): void;
/**
* @param {number} ii 
* @param {number} jj 
* @returns {boolean} 
*/
  insert(ii: number, jj: number): boolean;
/**
*/
  clear(): void;
/**
* @param {CanvasRenderingContext2D} ctx 
* @param {number} w 
* @param {number} h 
* @param {number} frames 
* @param {any} color 
*/
  animation_frame(ctx: CanvasRenderingContext2D, w: number, h: number, frames: number, color: any): void;
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
* @param {CanvasRenderingContext2D} ctx 
* @param {number} w 
* @param {number} h 
* @param {any} color 
* @param {number} _time 
* @param {number} line_width 
*/
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, color: any, _time: number, line_width: number): void;
}
/**
*/
export class Texture2D {
  free(): void;
/**
* @param {CanvasRenderingContext2D} ctx 
* @param {number} _w 
* @param {number} _h 
* @param {number} _frame 
* @param {number} time 
*/
  static fill_canvas(ctx: CanvasRenderingContext2D, _w: number, _h: number, _frame: number, time: number): void;
}
/**
*/
export class TriangularMesh {
  free(): void;
/**
* @param {number} nx 
* @param {number} ny 
*/
  constructor(nx: number, ny: number);
/**
* @param {CanvasRenderingContext2D} ctx 
* @param {number} w 
* @param {number} h 
* @param {any} color 
* @param {number} alpha 
* @param {number} line_width 
*/
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, color: any, alpha: number, line_width: number): void;
}
