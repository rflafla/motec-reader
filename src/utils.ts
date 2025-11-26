import { readFileSync } from 'fs';

/**
 * Decode a null-terminated ASCII string from a buffer
 */
export function decodeString(buffer: Buffer): string {
  const nullIndex = buffer.indexOf(0);
  const endIndex = nullIndex >= 0 ? nullIndex : buffer.length;
  return buffer.slice(0, endIndex).toString('ascii').trim();
}

/**
 * Helper class for reading binary data from a buffer with position tracking
 */
export class BinaryReader {
  private buffer: Buffer;
  private position: number;

  constructor(buffer: Buffer, initialPosition: number = 0) {
    this.buffer = buffer;
    this.position = initialPosition;
  }

  seek(position: number): void {
    this.position = position;
  }

  tell(): number {
    return this.position;
  }

  readUInt32LE(): number {
    const value = this.buffer.readUInt32LE(this.position);
    this.position += 4;
    return value;
  }

  readUInt16LE(): number {
    const value = this.buffer.readUInt16LE(this.position);
    this.position += 2;
    return value;
  }

  readInt16LE(): number {
    const value = this.buffer.readInt16LE(this.position);
    this.position += 2;
    return value;
  }

  readInt32LE(): number {
    const value = this.buffer.readInt32LE(this.position);
    this.position += 4;
    return value;
  }

  readBytes(length: number): Buffer {
    const value = this.buffer.slice(this.position, this.position + length);
    this.position += length;
    return value;
  }

  skip(bytes: number): void {
    this.position += bytes;
  }

  /**
   * Read an array of numeric data with a specific data type
   */
  readNumericArray(dataPtr: number, count: number, dtype: 'int16' | 'int32' | 'float32' | 'float16' | 'gps' | 'timestamp'): number[] {
    this.seek(dataPtr);
    const result: number[] = [];

    for (let i = 0; i < count; i++) {
      switch (dtype) {
        case 'int16':
          result.push(this.readInt16LE());
          break;
        case 'int32':
        case 'timestamp':
          result.push(this.readInt32LE());
          break;
        case 'gps':
          result.push(this.buffer.readDoubleLE(this.position));
          // result.push(Number(this.buffer.readBigInt64LE(this.position)));
          this.position += 8;
          break;
        case 'float32':
          result.push(this.buffer.readFloatLE(this.position));
          this.position += 4;
          break;
        case 'float16':
          // Node.js doesn't have native float16, so we need to convert
          result.push(this.readFloat16());
          break;
      }
    }

    return result;
  }

  /**
   * Read a 16-bit float (half-precision)
   * Based on IEEE 754 half-precision format
   */
  private readFloat16(): number {
    const value = this.readUInt16LE();
    const sign = (value & 0x8000) >> 15;
    const exponent = (value & 0x7C00) >> 10;
    const fraction = value & 0x03FF;

    if (exponent === 0) {
      return (sign ? -1 : 1) * Math.pow(2, -14) * (fraction / Math.pow(2, 10));
    } else if (exponent === 0x1F) {
      return fraction ? NaN : (sign ? -Infinity : Infinity);
    }

    return (sign ? -1 : 1) * Math.pow(2, exponent - 15) * (1 + fraction / Math.pow(2, 10));
  }

  getBuffer(): Buffer {
    return this.buffer;
  }
}

/**
 * Read entire file into a buffer
 */
export function readFileBuffer(filePath: string): Buffer {
  return readFileSync(filePath);
}
