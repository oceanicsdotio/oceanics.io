/* tslint:disable */
/* eslint-disable */
/**
* @param {any} ctx 
* @param {number} w 
* @param {number} h 
* @param {number} mx 
* @param {number} my 
* @param {any} color 
*/
export function draw_hex_grid(ctx: any, w: number, h: number, mx: number, my: number, color: any): void;
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
* @returns {any} 
*/
export function create_color_map_canvas(_color: any): any;
/**
* @param {any} ctx 
* @param {number} w 
* @param {number} h 
* @param {any} color 
*/
export function clear_rect_blending(ctx: any, w: number, h: number, color: any): void;
/**
* @param {any} ctx 
* @param {number} frames 
* @param {number} time 
* @param {any} color 
* @returns {number} 
*/
export function draw_fps(ctx: any, frames: number, time: number, color: any): number;
/**
* @param {any} ctx 
* @param {string} caption 
* @param {number} x 
* @param {number} y 
* @param {any} color 
* @param {string} font 
*/
export function draw_caption(ctx: any, caption: string, x: number, y: number, color: any, font: string): void;
/**
* @param {any} ctx 
* @param {number} x 
* @param {number} y 
* @param {number} scale 
* @param {any} color 
*/
export function draw_single_pixel(ctx: any, x: number, y: number, scale: number, color: any): void;
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
* @param {any} ctx 
* @param {string} vertex 
* @param {string} fragment 
* @returns {any} 
*/
export function create_program(ctx: any, vertex: string, fragment: string): any;
/**
* @param {any} ctx 
* @param {Float32Array} data 
* @returns {any} 
*/
export function create_buffer(ctx: any, data: Float32Array): any;
/**
* @param {any} ctx 
* @param {any} texture 
* @param {number} unit 
*/
export function bind_texture(ctx: any, texture: any, unit: number): void;
/**
* @param {any} ctx 
* @param {any} data 
* @param {number} filter 
* @param {number} _width 
* @param {number} _height 
* @returns {any} 
*/
export function create_texture(ctx: any, data: any, filter: number, _width: number, _height: number): any;
/**
*/
export class Agent {
  free(): void;
/**
* @param {number} x 
* @param {number} y 
* @param {number} z 
*/
  constructor(x: number, y: number, z: number);
/**
* @param {number} p 
*/
  push_link(p: number): void;
/**
* @param {number} speed 
* @param {number} bounce 
* @param {number} pad 
* @param {number} tx 
* @param {number} ty 
* @param {number} tz 
*/
  clamp_motion(speed: number, bounce: number, pad: number, tx: number, ty: number, tz: number): void;
/**
* @param {any} ctx 
* @param {number} _n 
* @param {number} w 
* @param {number} h 
* @param {number} x 
* @param {number} y 
* @param {number} z 
* @param {number} u 
* @param {number} v 
* @param {number} fade 
* @param {number} scale 
* @param {any} color 
*/
  static draw_agent(ctx: any, _n: number, w: number, h: number, x: number, y: number, z: number, u: number, v: number, fade: number, scale: number, color: any): void;
}
/**
*/
export class Axis {
  free(): void;
}
/**
*/
export class Cursor {
  free(): void;
/**
*/
  constructor();
/**
* @param {any} ctx 
* @param {number} displacement 
* @param {number} radius 
* @param {number} n 
* @param {number} radians 
*/
  static keyring(ctx: any, displacement: number, radius: number, n: number, radians: number): void;
/**
* @param {any} ctx 
* @param {number} theta 
* @param {number} n 
* @param {number} a 
* @param {number} b 
*/
  static ticks(ctx: any, theta: number, n: number, a: number, b: number): void;
/**
* @param {any} ctx 
* @param {number} w 
* @param {number} h 
* @param {number} time 
* @param {number} x 
* @param {number} y 
* @param {number} dx 
* @param {number} dy 
* @param {any} color 
*/
  static draw(ctx: any, w: number, h: number, time: number, x: number, y: number, dx: number, dy: number, color: any): void;
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
* @param {any} ctx 
* @param {number} w 
* @param {number} h 
* @param {any} color 
*/
  draw(ctx: any, w: number, h: number, color: any): void;
}
/**
*/
export class DrawingCanvas {
  free(): void;
}
/**
*/
export class Group {
  free(): void;
/**
*/
  constructor();
}
/**
*/
export class Link {
  free(): void;
/**
* @param {number} p 
*/
  constructor(p: number);
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
* @param {any} ctx 
* @param {number} w 
* @param {number} h 
* @param {any} color 
*/
  draw(ctx: any, w: number, h: number, color: any): void;
/**
* @param {number} ii 
* @param {number} jj 
* @returns {boolean} 
*/
  mark(ii: number, jj: number): boolean;
/**
*/
  clear(): void;
/**
* @param {any} ctx 
* @param {number} w 
* @param {number} h 
* @param {number} frames 
* @param {number} _time 
* @param {any} color 
*/
  animation_frame(ctx: any, w: number, h: number, frames: number, _time: number, color: any): void;
}
/**
*/
export class Spring {
  free(): void;
/**
* @param {number} k 
* @param {number} x 
* @param {number} v 
* @param {number} l 
* @param {number} stop 
* @param {number} p 
*/
  constructor(k: number, x: number, v: number, l: number, stop: number, p: number);
/**
* @returns {number} 
*/
  potential_energy(): number;
/**
* @returns {number} 
*/
  force(): number;
/**
* @returns {boolean} 
*/
  drop(): boolean;
/**
* @param {number} distance 
*/
  update(distance: number): void;
/**
* @param {number} s 
* @returns {number} 
*/
  size(s: number): number;
  x: number;
}
/**
*/
export class Texture2D {
  free(): void;
/**
* @param {any} ctx 
* @param {number} _w 
* @param {number} _h 
* @param {number} _frame 
* @param {number} time 
*/
  static fill_canvas(ctx: any, _w: number, _h: number, _frame: number, time: number): void;
}
/**
*/
export class TriangularMesh {
  free(): void;
/**
* @param {number} nx 
* @param {number} ny 
* @param {number} w 
* @param {number} h 
*/
  constructor(nx: number, ny: number, w: number, h: number);
/**
* @param {any} ctx 
* @param {number} w 
* @param {number} h 
* @param {any} color 
*/
  draw(ctx: any, w: number, h: number, color: any): void;
/**
* @param {any} ctx 
* @param {number} w 
* @param {number} h 
* @param {number} frame 
* @param {number} _time 
* @param {any} color 
*/
  animation_frame(ctx: any, w: number, h: number, frame: number, _time: number, color: any): void;
/**
* @param {number} index 
* @returns {boolean} 
*/
  mark(index: number): boolean;
/**
*/
  clear(): void;
}
