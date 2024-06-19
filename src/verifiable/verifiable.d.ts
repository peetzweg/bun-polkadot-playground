/* tslint:disable */
/* eslint-disable */
/**
* @param {Uint8Array} entropy
* @param {Uint8Array} members
* @param {Uint8Array} context
* @param {Uint8Array} message
* @returns {object}
*/
export function one_shot(entropy: Uint8Array, members: Uint8Array, context: Uint8Array, message: Uint8Array): object;
/**
* @param {Uint8Array} proof
* @param {Uint8Array} members
* @param {Uint8Array} context
* @param {Uint8Array} message
* @returns {Uint8Array}
*/
export function validate(proof: Uint8Array, members: Uint8Array, context: Uint8Array, message: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} entropy
* @param {Uint8Array} message
* @returns {Uint8Array}
*/
export function sign(entropy: Uint8Array, message: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} signature
* @param {Uint8Array} message
* @param {Uint8Array} member
* @returns {boolean}
*/
export function verify_signature(signature: Uint8Array, message: Uint8Array, member: Uint8Array): boolean;
/**
* @param {Uint8Array} entropy
* @returns {Uint8Array}
*/
export function member_from_entropy(entropy: Uint8Array): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly one_shot: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly validate: (a: number, b: number, c: number, d: number) => number;
  readonly sign: (a: number, b: number, c: number) => void;
  readonly verify_signature: (a: number, b: number, c: number) => number;
  readonly member_from_entropy: (a: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
