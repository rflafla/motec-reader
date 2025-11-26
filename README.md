# MoTeC LD File Reader

A Node.js library for reading MoTeC .ld telemetry files. This library allows you to parse and extract data from MoTeC data logging files commonly used in motorsports and automotive testing.

## Features

- Parse MoTeC .ld files
- Access session metadata (driver, vehicle, venue, datetime, etc.)
- Read channel data (speed, RPM, temperature, etc.)
- Support for multiple data types (int16, int32, float16, float32)
- TypeScript support with full type definitions
- Lazy loading of channel data for efficient memory usage

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic Example

```typescript
import { LdData } from 'motec-ld-reader';

// Read an .ld file
const data = LdData.fromFile('path/to/file.ld');

// Access metadata
console.log(`Driver: ${data.head.driver}`);
console.log(`Vehicle: ${data.head.vehicleId}`);
console.log(`Date: ${data.head.datetime}`);
console.log(`Venue: ${data.head.venue}`);

// List all channels
console.log('\nAvailable channels:');
data.getChannelNames().forEach(name => {
  console.log(`  - ${name}`);
});

// Access a specific channel by name
const speedChannel = data.getChannel('Ground Speed');
console.log(`\nSpeed channel:`);
console.log(`  Name: ${speedChannel.name}`);
console.log(`  Unit: ${speedChannel.unit}`);
console.log(`  Frequency: ${speedChannel.freq} Hz`);
console.log(`  Data points: ${speedChannel.data.length}`);

// Access channel data
const speeds = speedChannel.data;
console.log(`  Max speed: ${Math.max(...speeds)} ${speedChannel.unit}`);
console.log(`  Avg speed: ${speeds.reduce((a, b) => a + b, 0) / speeds.length} ${speedChannel.unit}`);
```

### Access Channels by Index

```typescript
// Access channels by numeric index
const firstChannel = data.getChannel(0);
console.log(firstChannel.name);

// Iterate over all channels
for (let i = 0; i < data.channelCount; i++) {
  const channel = data.getChannel(i);
  console.log(`${i}: ${channel.name} (${channel.unit})`);
}
```

### Export to JSON

```typescript
// Convert to a plain object for JSON serialization
const dataObject = data.toObject();
console.log(JSON.stringify(dataObject, null, 2));

// Or just get the data as a map
const dataMap = data.toDataMap();
console.log(dataMap['Ground Speed']);
```

### Working with Channel Data

```typescript
// Get multiple channels
const rpm = data.getChannel('Engine RPM').data;
const throttle = data.getChannel('Throttle Pos').data;
const speed = data.getChannel('Ground Speed').data;

// Perform calculations
for (let i = 0; i < Math.min(rpm.length, throttle.length); i++) {
  if (throttle[i] > 80) {
    console.log(`Full throttle at ${i}s: ${speed[i]} km/h, ${rpm[i]} RPM`);
  }
}
```

### Channel Information

Each channel provides the following properties:

- `name`: Full channel name
- `shortName`: Abbreviated name
- `unit`: Unit of measurement
- `freq`: Sample frequency in Hz
- `data`: Array of data values (lazy loaded)
- `dataLen`: Number of data points

### Metadata Access

```typescript
// Event information
if (data.head.event) {
  console.log(`Event: ${data.head.event.name}`);
  console.log(`Session: ${data.head.event.session}`);
  console.log(`Comment: ${data.head.event.comment}`);

  // Venue information
  if (data.head.event.venue) {
    console.log(`Venue: ${data.head.event.venue.name}`);

    // Vehicle information
    if (data.head.event.venue.vehicle) {
      const vehicle = data.head.event.venue.vehicle;
      console.log(`Vehicle ID: ${vehicle.id}`);
      console.log(`Vehicle Type: ${vehicle.type}`);
      console.log(`Weight: ${vehicle.weight}`);
    }
  }
}
```

## API Reference

### `LdData`

Main class for reading .ld files.

#### Methods

- `static fromFile(filePath: string): LdData` - Read and parse an .ld file
- `getChannel(nameOrIndex: string | number): LdChan` - Get a channel by name or index
- `getChannelNames(): string[]` - Get all channel names
- `toObject()` - Convert to plain object for serialization
- `toDataMap(): Record<string, number[]>` - Get channel data as name-to-data map

#### Properties

- `head: LdHead` - Header/metadata information
- `channels: LdChan[]` - Array of all channels
- `channelCount: number` - Number of channels

### `LdHead`

Header information containing metadata about the recording session.

#### Properties

- `driver: string`
- `vehicleId: string`
- `venue: string`
- `datetime: Date`
- `shortComment: string`
- `event: LdEvent | null`

### `LdChan`

Channel data and metadata.

#### Properties

- `name: string` - Full channel name
- `shortName: string` - Abbreviated name
- `unit: string` - Unit of measurement
- `freq: number` - Sample frequency in Hz
- `data: number[]` - Data array (lazy loaded)
- `dataLen: number` - Number of data points
- `dtype: DataType` - Data type ('int16' | 'int32' | 'float16' | 'float32')

## File Format

The .ld file format is a binary format used by MoTeC data loggers. The library handles:

- File header with session metadata
- Event, venue, and vehicle information
- Channel metadata (linked list structure)
- Binary channel data with various numeric types
- Data scaling and conversion formulas

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch mode for development
npm run watch
```

## License

MIT

## Credits

This library was created through reverse engineering the MoTeC .ld file format. It is not officially affiliated with MoTeC.
