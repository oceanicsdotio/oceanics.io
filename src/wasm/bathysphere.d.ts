/* tslint:disable */
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
* @param {number} longitude 
* @param {number} latitude 
* @param {number} zoom 
*/
export function tile_url(longitude: number, latitude: number, zoom: number): void;
/**
* @param {number} x 
* @param {number} y 
*/
export function mouse_move(x: number, y: number): void;
/**
* @param {number} ptr 
* @param {number} height 
* @param {number} width 
* @param {number} time 
*/
export function modify_canvas(ptr: number, height: number, width: number, time: number): void;
/**
*/
export function main(): void;
/**
* @param {number} np 
* @returns {Float64Array} 
*/
export function random_series(np: number): Float64Array;
/**
* @param {Float64Array} series 
* @returns {Float64Array} 
*/
export function make_vertex_array(series: Float64Array): Float64Array;

/**
* If `module_or_path` is {RequestInfo}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {RequestInfo | BufferSource | WebAssembly.Module} module_or_path
*
* @returns {Promise<any>}
*/
export default function init (module_or_path?: RequestInfo | BufferSource | WebAssembly.Module): Promise<any>;
        