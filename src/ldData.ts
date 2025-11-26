import { BinaryReader, readFileBuffer } from './utils';
import { LdHead } from './ldHead';
import { LdChan, readChannels } from './ldChan';

/**
 * Container for parsed data of an ld file.
 *
 * Allows reading and accessing channel data.
 */
export class LdData {
  head: LdHead;
  channels: LdChan[];

  constructor(head: LdHead, channels: LdChan[]) {
    this.head = head;
    this.channels = channels;
  }

  /**
   * Parse data from an ld file
   */
  static fromFile(filePath: string): LdData {
    const buffer = readFileBuffer(filePath);
    const reader = new BinaryReader(buffer);

    // Read header
    const head = LdHead.fromFile(reader);

    // Read channels
    const channels = readChannels(reader, head.metaPtr);

    return new LdData(head, channels);
  }

  /**
   * Get a channel by name or index
   */
  getChannel(nameOrIndex: string | number): LdChan {
    if (typeof nameOrIndex === 'number') {
      if (nameOrIndex < 0 || nameOrIndex >= this.channels.length) {
        throw new Error(`Channel index ${nameOrIndex} out of range`);
      }
      return this.channels[nameOrIndex];
    }

    const matchingChannels = this.channels.filter(ch => ch.name === nameOrIndex);
    if (matchingChannels.length === 0) {
      throw new Error(`Channel '${nameOrIndex}' not found`);
    }
    if (matchingChannels.length > 1) {
      throw new Error(`Multiple channels with name '${nameOrIndex}' found`);
    }

    return matchingChannels[0];
  }

  /**
   * Get all channel names
   */
  getChannelNames(): string[] {
    return this.channels.map(ch => ch.name);
  }

  /**
   * Get number of channels
   */
  get channelCount(): number {
    return this.channels.length;
  }

  /**
   * Convert to a simple object structure
   * Useful for JSON serialization or data export
   */
  toObject(): {
    metadata: {
      driver: string;
      vehicleId: string;
      venue: string;
      datetime: string;
      shortComment: string;
      event?: string;
      session?: string;
    };
    channels: {
      name: string;
      shortName: string;
      unit: string;
      freq: number;
      data: number[] | bigint[];
    }[];
  } {
    return {
      metadata: {
        driver: this.head.driver,
        vehicleId: this.head.vehicleId,
        venue: this.head.venue,
        datetime: this.head.datetime.toISOString(),
        shortComment: this.head.shortComment,
        event: this.head.event?.name,
        session: this.head.event?.session
      },
      channels: this.channels.map(ch => ({
        name: ch.name,
        shortName: ch.shortName,
        unit: ch.unit,
        freq: ch.freq,
        data: ch.data
      }))
    };
  }

  /**
   * Get channel data as a map of channel names to data arrays
   */
  toDataMap(): Record<string, number[] | bigint[]> {
    const result: Record<string, number[] | bigint[]> = {};
    for (const channel of this.channels) {
      result[channel.name] = channel.data;
    }
    return result;
  }

  toString(): string {
    const channelList = this.channels.map((ch, idx) => `  [${idx}] ${ch.toString()}`).join('\n');
    return `${this.head.toString()}\n\nChannels (${this.channels.length}):\n${channelList}`;
  }
}
