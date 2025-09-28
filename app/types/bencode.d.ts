declare module 'bencode' {
  interface BencodeModule {
    decode(data: Uint8Array): any;
    encode(data: any): Uint8Array;
    byteLength(data: any): number;
    encodingLength(data: any): number;
  }
  
  const bencode: BencodeModule;
  export default bencode;
}