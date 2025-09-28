declare module 'bencode' {
  export function decode(data: Uint8Array): any;
  export function encode(data: any): Uint8Array;
}