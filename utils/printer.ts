/**
 * Bluetooth Thermal Printer Utility for NaijaShop
 * Handles Web Bluetooth connectivity and ESC/POS byte encoding for 58mm printers.
 */

// Fix: Use 'any' for the characteristic type as BluetoothRemoteGATTCharacteristic may not be in the global scope
let printerCharacteristic: any | null = null;

const ESC = 0x1b;
const GS = 0x1d;

export const PrinterCommands = {
  INIT: new Uint8Array([ESC, 0x40]),
  CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  RIGHT: new Uint8Array([ESC, 0x61, 0x02]),
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  DOUBLE_HEIGHT: new Uint8Array([ESC, 0x21, 0x10]),
  DOUBLE_WIDTH: new Uint8Array([ESC, 0x21, 0x20]),
  RESET_FORMAT: new Uint8Array([ESC, 0x21, 0x00]),
  FEED_3: new Uint8Array([ESC, 0x64, 0x03]),
};

/**
 * Encodes text to bytes, substituting Naira symbol for compatibility
 */
const encodeText = (text: string) => {
  const normalized = text.replace(/₦/g, 'N');
  return new TextEncoder().encode(normalized + '\n');
};

/**
 * Connects to a Bluetooth Thermal Printer
 */
export async function connectPrinter(): Promise<string> {
  // Fix: Cast navigator to any to access the experimental 'bluetooth' property which may not be in standard TypeScript lib
  const nav = navigator as any;
  if (!nav.bluetooth) {
    throw new Error('Bluetooth not supported on this browser.');
  }

  try {
    // Fix: Access requestDevice via the casted navigator
    const device = await nav.bluetooth.requestDevice({
      filters: [
        { services: ['0000ff01-0000-1000-8000-00805f9b34fb'] },
        { namePrefix: 'MPT' },
        { namePrefix: 'TP' },
        { namePrefix: 'BT' }
      ],
      optionalServices: ['0000ff00-0000-1000-8000-00805f9b34fb']
    });

    const server = await device.gatt?.connect();
    if (!server) throw new Error('Could not connect to GATT server');

    // Try to find the write characteristic
    const service = await server.getPrimaryService('0000ff00-0000-1000-8000-00805f9b34fb');
    printerCharacteristic = await service.getCharacteristic('0000ff01-0000-1000-8000-00805f9b34fb');

    localStorage.setItem('connected_printer_name', device.name || 'Generic Printer');
    return device.name || 'Connected Printer';
  } catch (error) {
    console.error('Bluetooth Connection Error:', error);
    throw error;
  }
}

/**
 * Disconnects existing printer
 */
export function disconnectPrinter() {
  printerCharacteristic = null;
  localStorage.removeItem('connected_printer_name');
}

/**
 * Formats and prints a receipt
 */
export async function printReceipt(sale: any): Promise<boolean> {
  if (!printerCharacteristic) {
    throw new Error('No printer connected');
  }

  const shopName = localStorage.getItem('shop_name') || 'NAIJASHOP';
  const shopInfo = localStorage.getItem('shop_info') || '';
  const dateStr = new Date(sale.timestamp).toLocaleString('en-NG');

  const chunks: Uint8Array[] = [
    PrinterCommands.INIT,
    PrinterCommands.CENTER,
    PrinterCommands.BOLD_ON,
    PrinterCommands.DOUBLE_HEIGHT,
    encodeText(shopName.toUpperCase()),
    PrinterCommands.RESET_FORMAT,
    PrinterCommands.CENTER,
    encodeText(shopInfo),
    encodeText('--------------------------------'),
    encodeText(`RECEIPT #${String(sale.id).padStart(5, '0')}`),
    encodeText(dateStr),
    encodeText('--------------------------------'),
    PrinterCommands.LEFT,
  ];

  // Table header
  chunks.push(encodeText('ITEM            QTY     PRICE'));

  sale.items.forEach((item: any) => {
    const name = item.name.substring(0, 15).padEnd(16, ' ');
    const qty = String(item.quantity).padEnd(8, ' ');
    const price = (item.price * item.quantity).toLocaleString().padStart(8, ' ');
    chunks.push(encodeText(`${name}${qty}${price}`));
  });

  chunks.push(encodeText('--------------------------------'));
  chunks.push(PrinterCommands.RIGHT);
  chunks.push(PrinterCommands.BOLD_ON);
  chunks.push(encodeText(`TOTAL: N${sale.total.toLocaleString()}`));
  chunks.push(PrinterCommands.RESET_FORMAT);
  chunks.push(PrinterCommands.CENTER);
  chunks.push(encodeText('\nThank you for your business!'));
  chunks.push(encodeText('NO REFUND AFTER PAYMENT'));
  chunks.push(encodeText('\nPowered by NaijaShop POS'));
  chunks.push(PrinterCommands.FEED_3);

  // Send chunks to printer
  for (const chunk of chunks) {
    await printerCharacteristic.writeValue(chunk);
    // Tiny delay to prevent buffer overflow on cheap printers
    await new Promise(r => setTimeout(r, 20));
  }

  return true;
}