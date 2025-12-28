/**
 * Professional Bluetooth Thermal Printer Service
 * Supports 58mm (32 chars) ESC/POS printers
 */

let printerCharacteristic: any | null = null;
let printerDevice: any | null = null;

// Common Bluetooth Printer Service UUIDs
const PRINTER_SERVICES = [
  '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (Standard)
  '0000ff00-0000-1000-8000-00805f9b34fb', // Common BLE Printer
  '0000ff01-0000-1000-8000-00805f9b34fb'  // Alternative BLE
];

export const isPrinterReady = () => !!printerCharacteristic;

/**
 * Scans for and connects to a Bluetooth Printer
 */
export async function connectBluetoothPrinter(): Promise<string> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    throw new Error('Bluetooth not supported on this browser. Use Chrome or Edge.');
  }

  try {
    printerDevice = await nav.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'MPT' },
        { namePrefix: 'TP' },
        { namePrefix: 'ZJ' },
        { namePrefix: 'BT' },
        { namePrefix: 'Inner' }
      ],
      optionalServices: PRINTER_SERVICES
    });

    const server = await printerDevice?.gatt?.connect();
    if (!server) throw new Error('GATT Server connection failed');

    // Attempt to find a writable characteristic in standard services
    let writableChar = null;
    
    for (const serviceUuid of PRINTER_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();
        writableChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
        if (writableChar) break;
      } catch (e) {
        continue;
      }
    }

    if (!writableChar) {
      // Fallback: try all available services
      const allServices = await server.getPrimaryServices();
      for (const service of allServices) {
        const chars = await service.getCharacteristics();
        writableChar = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
        if (writableChar) break;
      }
    }

    if (!writableChar) throw new Error('No writable characteristic found on this printer.');

    printerCharacteristic = writableChar;
    localStorage.setItem('last_printer_name', printerDevice?.name || 'Thermal Printer');
    return printerDevice?.name || 'Connected Printer';
  } catch (error) {
    console.error('Connection Error:', error);
    throw error;
  }
}

/**
 * Sends ESC/POS byte stream to printer in 20-byte chunks
 */
export async function sendRawToPrinter(data: Uint8Array): Promise<void> {
  if (!printerCharacteristic) throw new Error('Printer not connected');

  const CHUNK_SIZE = 20;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    await printerCharacteristic.writeValue(chunk);
    // 20ms delay is essential for low-cost thermal printer buffers
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

export function disconnectPrinter() {
  if (printerDevice?.gatt?.connected) {
    printerDevice.gatt.disconnect();
  }
  printerCharacteristic = null;
  localStorage.removeItem('last_printer_name');
}
