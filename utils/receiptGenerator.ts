/**
 * Receipt Generation Utility for 58mm Thermal Printers
 * Encodes sale data into ESC/POS commands.
 */

const ESC = 0x1b;
const GS = 0x1d;

const COMMANDS = {
  INIT: [ESC, 0x40],
  CENTER: [ESC, 0x61, 0x01],
  LEFT: [ESC, 0x61, 0x00],
  RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  LARGE_TEXT: [GS, 0x21, 0x11], // Double width + Double height
  NORMAL_TEXT: [GS, 0x21, 0x00],
  FEED_AND_CUT: [GS, 0x56, 0x01, 0x31], // Feed and partial cut
  LINE_FEED: [0x0a]
};

/**
 * Generates a byte stream for a 58mm receipt (32 chars wide).
 */
export function generateReceiptBytes(sale: any): Uint8Array {
  const shopName = localStorage.getItem('shop_name') || 'NAIJASHOP';
  const shopInfo = localStorage.getItem('shop_info') || '';
  const dateStr = new Date(sale.timestamp).toLocaleString('en-NG');
  
  const encoder = new TextEncoder();
  const chunks: number[] = [];

  const addText = (text: string) => {
    // Replace Naira symbol with N for compatibility
    const safeText = text.replace(/₦/g, 'N');
    const bytes = encoder.encode(safeText + '\n');
    chunks.push(...Array.from(bytes));
  };

  const addCommand = (cmd: number[]) => chunks.push(...cmd);

  // 1. Initialize
  addCommand(COMMANDS.INIT);
  addCommand(COMMANDS.CENTER);

  // 2. Header
  addCommand(COMMANDS.LARGE_TEXT);
  addCommand(COMMANDS.BOLD_ON);
  addText(shopName.toUpperCase());
  addCommand(COMMANDS.BOLD_OFF);
  addCommand(COMMANDS.NORMAL_TEXT);
  
  if (shopInfo) {
    addText(shopInfo);
  }
  
  addText('--------------------------------');
  addCommand(COMMANDS.BOLD_ON);
  addText(`RECEIPT #${String(sale.id || 0).padStart(5, '0')}`);
  addCommand(COMMANDS.BOLD_OFF);
  addText(dateStr);
  addText('--------------------------------');

  // 3. Items Table (32 chars: Name(16) Qty(6) Price(10))
  addCommand(COMMANDS.LEFT);
  addText('ITEM            QTY       PRICE');
  
  sale.items.forEach((item: any) => {
    const name = item.name.substring(0, 15).padEnd(16, ' ');
    const qty = String(item.quantity).padEnd(6, ' ');
    const price = (item.price * item.quantity).toLocaleString().padStart(10, ' ');
    addText(`${name}${qty}${price}`);
  });

  // 4. Footer
  addText('--------------------------------');
  addCommand(COMMANDS.RIGHT);
  addCommand(COMMANDS.BOLD_ON);
  addText(`TOTAL: N${sale.total.toLocaleString()}`);
  addCommand(COMMANDS.BOLD_OFF);
  
  addCommand(COMMANDS.CENTER);
  addCommand(COMMANDS.LINE_FEED);
  addText('THANK YOU FOR YOUR PATRONAGE');
  addCommand(COMMANDS.BOLD_ON);
  addText('NO REFUND AFTER PAYMENT');
  addCommand(COMMANDS.BOLD_OFF);
  addCommand(COMMANDS.LINE_FEED);
  addText('Powered by NaijaShopApp 🇳🇬');

  // 5. Cut
  addCommand([0x0a, 0x0a, 0x0a]); // 3 line feeds
  addCommand(COMMANDS.FEED_AND_CUT);

  return new Uint8Array(chunks);
}
