/**
 * Example usage of the MoTeC LD file reader
 *
 * Run with: node example.js path/to/file.ld
 */

const { LdData } = require('./dist/index');

function main() {
  // Check if file path is provided
  if (process.argv.length < 3) {
    console.log('Usage: node example.js <path-to-ld-file>');
    console.log('Example: node example.js ./data/session.ld');
    process.exit(1);
  }

  const filePath = process.argv[2];

  try {
    console.log(`Reading file: ${filePath}\n`);

    // Load the .ld file
    const data = LdData.fromFile(filePath);

    // Display header information
    console.log('=== Session Information ===');
    console.log(data.head.toString());
    console.log();

    // Display channel information
    console.log(`=== Channels (${data.channelCount} total) ===`);
    data.channels.forEach((channel, idx) => {
      console.log(`[${idx}] ${channel.name} (${channel.shortName}) [${channel.unit}] @ ${channel.freq} Hz`);
    });
    console.log();

    // Example: Access a specific channel
    console.log('=== Example: Accessing Channel Data ===');
    if (data.channelCount > 0) {
      const firstChannel = data.getChannel(0);
      console.log(`Channel: ${firstChannel.name}`);
      console.log(`Unit: ${firstChannel.unit}`);
      console.log(`Frequency: ${firstChannel.freq} Hz`);
      console.log(`Data points: ${firstChannel.data.length}`);

      if (firstChannel.data.length > 0) {
        const values = firstChannel.data;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;

        console.log(`Min: ${min.toFixed(2)} ${firstChannel.unit}`);
        console.log(`Max: ${max.toFixed(2)} ${firstChannel.unit}`);
        console.log(`Avg: ${avg.toFixed(2)} ${firstChannel.unit}`);
      }
      console.log();
    }

    // Example: Convert to object (useful for JSON export)
    console.log('=== Example: Export to JSON ===');
    const dataObject = data.toObject();
    console.log('Metadata:', JSON.stringify(dataObject.metadata, null, 2));
    console.log(`Channels: ${dataObject.channels.length} channels with data`);
    console.log();

    // Example: Get data map
    console.log('=== Example: Data Map ===');
    const dataMap = data.toDataMap();
    console.log('Available channels:', Object.keys(dataMap).join(', '));
    console.log();

    console.log('✓ Successfully read and parsed the .ld file!');

  } catch (error) {
    console.error('Error reading file:', error.message);
    process.exit(1);
  }
}

main();
