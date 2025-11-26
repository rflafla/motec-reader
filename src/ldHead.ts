import { BinaryReader, decodeString } from './utils';

/**
 * Vehicle information
 */
export class LdVehicle {
  id: string;
  weight: number;
  type: string;
  comment: string;

  constructor(id: string, weight: number, type: string, comment: string) {
    this.id = id;
    this.weight = weight;
    this.type = type;
    this.comment = comment;
  }

  static fromFile(reader: BinaryReader): LdVehicle {
    // fmt = '<64s 128x I 32s 32s'
    const id = decodeString(reader.readBytes(64));
    reader.skip(128);
    const weight = reader.readUInt32LE();
    const type = decodeString(reader.readBytes(32));
    const comment = decodeString(reader.readBytes(32));

    return new LdVehicle(id, weight, type, comment);
  }

  toString(): string {
    return `${this.id} (type: ${this.type}, weight: ${this.weight}, ${this.comment})`;
  }
}

/**
 * Venue information
 */
export class LdVenue {
  name: string;
  vehiclePtr: number;
  vehicle: LdVehicle | null;

  constructor(name: string, vehiclePtr: number, vehicle: LdVehicle | null) {
    this.name = name;
    this.vehiclePtr = vehiclePtr;
    this.vehicle = vehicle;
  }

  static fromFile(reader: BinaryReader): LdVenue {
    // fmt = '<64s 1034x H'
    const name = decodeString(reader.readBytes(64));
    reader.skip(1034);
    const vehiclePtr = reader.readUInt16LE();

    let vehicle: LdVehicle | null = null;
    if (vehiclePtr > 0) {
      const currentPos = reader.tell();
      reader.seek(vehiclePtr);
      vehicle = LdVehicle.fromFile(reader);
      reader.seek(currentPos);
    }

    return new LdVenue(name, vehiclePtr, vehicle);
  }

  toString(): string {
    return `${this.name}; vehicle: ${this.vehicle}`;
  }
}

/**
 * Event information
 */
export class LdEvent {
  name: string;
  session: string;
  comment: string;
  venuePtr: number;
  venue: LdVenue | null;

  constructor(
    name: string,
    session: string,
    comment: string,
    venuePtr: number,
    venue: LdVenue | null
  ) {
    this.name = name;
    this.session = session;
    this.comment = comment;
    this.venuePtr = venuePtr;
    this.venue = venue;
  }

  static fromFile(reader: BinaryReader): LdEvent {
    // fmt = '<64s 64s 1024s H'
    const name = decodeString(reader.readBytes(64));
    const session = decodeString(reader.readBytes(64));
    const comment = decodeString(reader.readBytes(1024));
    const venuePtr = reader.readUInt16LE();

    let venue: LdVenue | null = null;
    if (venuePtr > 0) {
      const currentPos = reader.tell();
      reader.seek(venuePtr);
      venue = LdVenue.fromFile(reader);
      reader.seek(currentPos);
    }

    return new LdEvent(name, session, comment, venuePtr, venue);
  }

  toString(): string {
    return `${this.name}; venue: ${this.venue}`;
  }
}

/**
 * Header information of an ld file
 */
export class LdHead {
  metaPtr: number;
  dataPtr: number;
  eventPtr: number;
  event: LdEvent | null;
  driver: string;
  vehicleId: string;
  venue: string;
  datetime: Date;
  shortComment: string;

  constructor(
    metaPtr: number,
    dataPtr: number,
    eventPtr: number,
    event: LdEvent | null,
    driver: string,
    vehicleId: string,
    venue: string,
    datetime: Date,
    shortComment: string
  ) {
    this.metaPtr = metaPtr;
    this.dataPtr = dataPtr;
    this.eventPtr = eventPtr;
    this.event = event;
    this.driver = driver;
    this.vehicleId = vehicleId;
    this.venue = venue;
    this.datetime = datetime;
    this.shortComment = shortComment;
  }

  static fromFile(reader: BinaryReader): LdHead {
    reader.seek(0);

    // Read header structure
    // fmt = '<I 4x II 20x I 24x HHH I 8s H H I 4x 16s 16x 16s 16x 64s 64s 64x 64s 64x 1024x I 66x 64s 126x'

    reader.skip(4); // ldmarker
    reader.skip(4); // padding

    const metaPtr = reader.readUInt32LE();
    const dataPtr = reader.readUInt32LE();
    reader.skip(20); // unknown

    const eventPtr = reader.readUInt32LE();
    reader.skip(24); // unknown

    reader.skip(2 + 2 + 2); // unknown static numbers
    reader.skip(4); // device serial
    reader.skip(8); // device type
    reader.skip(2); // device version
    reader.skip(2); // unknown static number
    reader.skip(4); // num_channs
    reader.skip(4); // padding

    const dateStr = decodeString(reader.readBytes(16));
    reader.skip(16); // padding
    const timeStr = decodeString(reader.readBytes(16));
    reader.skip(16); // padding

    const driver = decodeString(reader.readBytes(64));
    const vehicleId = decodeString(reader.readBytes(64));
    reader.skip(64); // padding
    const venue = decodeString(reader.readBytes(64));
    reader.skip(64); // padding
    reader.skip(1024); // padding
    reader.skip(4); // pro logging magic number
    reader.skip(66); // padding

    const shortComment = decodeString(reader.readBytes(64));
    reader.skip(126); // padding

    // Parse datetime
    let datetime: Date;
    try {
      // Try with seconds first: "dd/mm/yyyy HH:MM:SS"
      const dateTimeParts = `${dateStr} ${timeStr}`.match(
        /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/
      );
      if (dateTimeParts) {
        const [, day, month, year, hour, minute, second] = dateTimeParts;
        datetime = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
      } else {
        // Try without seconds: "dd/mm/yyyy HH:MM"
        const dateTimePartsNoSec = `${dateStr} ${timeStr}`.match(
          /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/
        );
        if (dateTimePartsNoSec) {
          const [, day, month, year, hour, minute] = dateTimePartsNoSec;
          datetime = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            0
          );
        } else {
          datetime = new Date();
        }
      }
    } catch (e) {
      datetime = new Date();
    }

    // Read event if present
    let event: LdEvent | null = null;
    if (eventPtr > 0) {
      const currentPos = reader.tell();
      reader.seek(eventPtr);
      event = LdEvent.fromFile(reader);
      reader.seek(currentPos);
    }

    return new LdHead(
      metaPtr,
      dataPtr,
      eventPtr,
      event,
      driver,
      vehicleId,
      venue,
      datetime,
      shortComment
    );
  }

  toString(): string {
    return [
      `driver:    ${this.driver}`,
      `vehicleid: ${this.vehicleId}`,
      `venue:     ${this.venue}`,
      `event:     ${this.event?.name || 'N/A'}`,
      `session:   ${this.event?.session || 'N/A'}`,
      `short_comment: ${this.shortComment}`
    ].join('\n');
  }
}
