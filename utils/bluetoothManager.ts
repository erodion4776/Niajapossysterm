/**
 * Bluetooth Connection Manager for NaijaShop
 * Manages GATT server lifecycle and printer characteristics.
 */

let printerCharacteristic: any | null = null;
let device: any | null = null;

export const isPrinterConnected = () => !!printerCharacteristic;

/**
 * Scans and connects to a BLE Thermal Printer.
 * Most 58mm printers use service 0xFF00 and characteristic 0xFF01.
 */
export async function connectToPrinter(): Promise<string> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    throw new Error('Bluetooth not supported in this browser. Try Chrome or Edge.');
  }

  try {
    device = await nav.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'MPT' },
        { namePrefix: 'TP' },
        { namePrefix: 'ZJ' },
        { services: ['0000ff00-0000-1000-8000-00805f9b34fb'] }
      ],
      optionalServices: ['0000ff00-0000-1000-8000-00805f9b34fb', '00001101-0000-1000-8000-00805f9b34fb']
    });

    const server = await device.gatt?.connect();
    if (!server) throw new Error('Could not connect to printer GATT server');

    // Attempt to find the standard printer service
    let service;
    try {
      service = await server.getPrimaryService('0000ff00-0000-1000-8000-00805f9b34fb');
    } catch (e) {
      // Fallback for some printers
      const services = await server.getPrimaryServices();
      service = services[0];
    }

    const characteristics = await service.getCharacteristics();
    // Look for the first Write/WriteWithoutResponse characteristic
    printerCharacteristic = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);

    if (!printerCharacteristic) throw new Error('No writable characteristic found on printer');

    localStorage.setItem('connected_printer_name', device.name || 'Generic Printer');
    return device.name || 'Thermal Printer';
  } catch (error) {
    console.error('Bluetooth Connection Error:', error);
    throw error;
  }
}

export async function sendToPrinter(data: Uint8Array): Promise<void> {
  if (!printerCharacteristic) throw new Error('Printer not connected');
  
  // Split data into 20-byte chunks for better BLE compatibility
  const CHUNK_SIZE = 20;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    await printerCharacteristic.writeValue(chunk);
    // Slight delay to allow printer buffer to process
    await new Promise(r => setTimeout(r, 15));
  }
}

export function disconnectPrinter() {
  if (device && device.gatt.connected) {
    device.gatt.disconnect();
  }
  printerCharacteristic = null;
  localStorage.removeItem('connected_printer_name');
}
