/**
 * Professional Bluetooth Thermal Printer Service
 * Supports 58mm (32 chars) ESC/POS printers
 */

// Fix: Using any for Web Bluetooth types to avoid "Cannot find name" errors in environments without Web Bluetooth type definitions.
let printerCharacteristic: any | null = null;
let printerDevice: any | null = null;

const PRINTER_SERVICE_UUID = '00001101-0000-1000-8000-00805f9b34fb'; // Serial Port Profile
const FALLBACK_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb'; // Common BLE Printer Service

export const isPrinterReady = () => !!printerCharacteristic;

/**
 * Scans for and connects to a Bluetooth Printer
 */
export async function connectBluetoothPrinter(): Promise<string> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    throw new Error('Bluetooth not supported on this device/browser.');
  }

  try {
    printerDevice = await nav.bluetooth.requestDevice({
      filters: [
        { services: [PRINTER_SERVICE_UUID] },
        { namePrefix: 'MPT' },
        { namePrefix: 'TP' },
        { namePrefix: 'ZJ' }
      ],
      optionalServices: [PRINTER_SERVICE_UUID, FALLBACK_SERVICE_UUID]
    });

    const server = await printerDevice?.gatt?.connect();
    if (!server) throw new Error('GATT Server connection failed');

    // Try primary service then fallback
    let service;
    try {
      service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
    } catch (e) {
      service = await server.getPrimaryService(FALLBACK_SERVICE_UUID);
    }

    const characteristics = await service.getCharacteristics();
    // Find first writable characteristic
    // Fix: cast characteristic item to any in the find predicate.
    printerCharacteristic = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse) || null;

    if (!printerCharacteristic) throw new Error('No writable characteristic found');

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
    // 15ms delay to prevent buffer overflow on low-end printers
    await new Promise(resolve => setTimeout(resolve, 15));
  }
}

export function disconnectPrinter() {
  if (printerDevice?.gatt?.connected) {
    printerDevice.gatt.disconnect();
  }
  printerCharacteristic = null;
  localStorage.removeItem('last_printer_name');
}
