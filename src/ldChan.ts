import { BinaryReader, decodeString } from './utils';

export type DataType = 'int16' | 'int32' | 'float16' | 'float32' | null;

/**
 * Channel (meta) data
 *
 * Parses and stores the channel meta data of a channel in an ld file.
 * The actual data is read on demand using the 'data' property.
 */
export class LdChan {
  private reader: BinaryReader;
  private _data: number[] | null = null;

  // Metadata pointers
  metaPtr: number;
  prevMetaPtr: number;
  nextMetaPtr: number;
  dataPtr: number;
  dataLen: number;

  // Channel properties
  dtype: DataType;
  freq: number;
  shift: number;
  mul: number;
  scale: number;
  dec: number;
  name: string;
  shortName: string;
  unit: string;

  constructor(
    reader: BinaryReader,
    metaPtr: number,
    prevMetaPtr: number,
    nextMetaPtr: number,
    dataPtr: number,
    dataLen: number,
    dtype: DataType,
    freq: number,
    shift: number,
    mul: number,
    scale: number,
    dec: number,
    name: string,
    shortName: string,
    unit: string
  ) {
    this.reader = reader;
    this.metaPtr = metaPtr;
    this.prevMetaPtr = prevMetaPtr;
    this.nextMetaPtr = nextMetaPtr;
    this.dataPtr = dataPtr;
    this.dataLen = dataLen;
    this.dtype = dtype;
    this.freq = freq;
    this.shift = shift;
    this.mul = mul;
    this.scale = scale;
    this.dec = dec;
    this.name = name;
    this.shortName = shortName;
    this.unit = unit;
  }

  /**
   * Parses and stores the header information of an ld channel in an ld file
   */
  static fromFile(reader: BinaryReader, metaPtr: number): LdChan {
    reader.seek(metaPtr);

    // Read channel structure
    // fmt = '<IIII H HHH hhhh 32s 8s 12s 40x'
    const prevMetaPtr = reader.readUInt32LE();
    const nextMetaPtr = reader.readUInt32LE();
    const dataPtr = reader.readUInt32LE();
    const dataLen = reader.readUInt32LE();

    reader.skip(2); // some counter

    const dtypeA = reader.readUInt16LE();
    const dtypeRaw = reader.readUInt16LE();
    const freq = reader.readUInt16LE();

    const shift = reader.readInt16LE();
    const mul = reader.readInt16LE();
    const scale = reader.readInt16LE();
    const dec = reader.readInt16LE();

    const name = decodeString(reader.readBytes(32));
    const shortName = decodeString(reader.readBytes(8));
    const unit = decodeString(reader.readBytes(12));

    reader.skip(40); // padding

    // Determine data type
    let dtype: DataType = null;
    if (dtypeA === 0x07) {
      // Float types
      if (dtypeRaw === 2) dtype = 'float16';
      else if (dtypeRaw === 4) dtype = 'float32';
    } else if ([0, 0x03, 0x05].includes(dtypeA)) {
      // Integer types
      if (dtypeRaw === 2) dtype = 'int16';
      else if (dtypeRaw === 4) dtype = 'int32';
    }

    return new LdChan(
      reader,
      metaPtr,
      prevMetaPtr,
      nextMetaPtr,
      dataPtr,
      dataLen,
      dtype,
      freq,
      shift,
      mul,
      scale,
      dec,
      name,
      shortName,
      unit
    );
  }

  /**
   * Read the data words of the channel (lazy loading)
   */
  get data(): number[] {
    if (this.dtype === null) {
      throw new Error(`Channel ${this.name} has unknown data type`);
    }

    if (this._data === null) {
      // Read raw data
      const rawData = this.reader.readNumericArray(this.dataPtr, this.dataLen, this.dtype);

      // Apply scaling: (raw/scale * 10^(-dec) + shift) * mul
      this._data = rawData.map(value =>
        (value / this.scale * Math.pow(10, -this.dec) + this.shift) * this.mul
      );
    }

    return this._data;
  }

  toString(): string {
    return `chan ${this.name} (${this.shortName}) [${this.unit}], ${this.freq} Hz`;
  }
}

/**
 * Read channel data inside ld file
 *
 * Cycles through the channels inside an ld file,
 * starting with the one where metaPtr points to.
 * Returns a list of LdChan objects.
 */
export function readChannels(reader: BinaryReader, metaPtr: number): LdChan[] {
  const channels: LdChan[] = [];
  let currentPtr = metaPtr;

  while (currentPtr !== 0) {
    const chan = LdChan.fromFile(reader, currentPtr);
    channels.push(chan);
    currentPtr = chan.nextMetaPtr;
  }

  return channels;
}
