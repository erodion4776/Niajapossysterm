
import { Sale } from '../db.ts';

/**
 * ESC/POS Command Constants for 58mm Thermal Printers
 */
const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],
  NORMAL_TEXT: [ESC, 0x21, 0x00],
  LINE_FEED: [0x0a],
};

/**
 * Formats a sale into a Uint8Array for a 58mm printer (32 chars wide)
 */
export function formatReceipt(sale: Sale): Uint8Array {
  const shopName = localStorage.getItem('shop_name') || 'NAIJASHOP';
  const shopInfo = localStorage.getItem('shop_info') || '';
  const dateStr = new Date(sale.timestamp).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' });
  const receiptNo = String(sale.id || '0').padStart(5, '0');

  const encoder = new TextEncoder();
  const bytes: number[] = [];

  const add = (data: number[] | string) => {
    if (typeof data === 'string') {
      // Replace Naira with N for hardware compatibility
      const safeText = data.replace(/₦/g, 'N');
      bytes.push(...Array.from(encoder.encode(safeText)));
    } else {
      bytes.push(...data);
    }
  };

  const line = () => add('--------------------------------\n');

  // 1. Initialize & Header
  add(CMD.INIT);
  add(CMD.ALIGN_CENTER);
  add(CMD.BOLD_ON);
  add(CMD.DOUBLE_HEIGHT);
  add(`${shopName.toUpperCase()}\n`);
  add(CMD.NORMAL_TEXT);
  add(CMD.BOLD_OFF);
  
  if (shopInfo) {
    add(`${shopInfo}\n`);
  }
  line();
  add(`RECEIPT #${receiptNo}\n`);
  add(`${dateStr}\n`);
  line();

  // 2. Items Table (ITEM (16) QTY (6) TOTAL (10))
  add(CMD.ALIGN_LEFT);
  add('ITEM            QTY       TOTAL \n');
  line();

  sale.items.forEach(item => {
    const name = item.name.substring(0, 15).padEnd(16, ' ');
    const qty = `x${item.quantity}`.padEnd(6, ' ');
    const price = (item.price * item.quantity).toLocaleString().padStart(10, ' ');
    add(`${name}${qty}${price}\n`);
  });

  line();

  // 3. Totals and Wallet/Debt Split Info
  add(CMD.ALIGN_RIGHT);
  
  add(`TOTAL ITEMS: N${sale.total.toLocaleString()}\n`);

  if (sale.walletUsed && sale.walletUsed > 0) {
    add(`PAID FROM WALLET: -N${sale.walletUsed.toLocaleString()}\n`);
    line();
  }
  
  if (sale.paymentMethod === 'Debt') {
    const remainingDebt = sale.total - (sale.walletUsed || 0);
    add(CMD.BOLD_ON);
    add(`NEW DEBT: N${remainingDebt.toLocaleString()}\n`);
    add(CMD.BOLD_OFF);
    add(CMD.ALIGN_CENTER);
    add(`Your Wallet Balance: N0\n`);
  } else if (sale.paymentMethod === 'Wallet') {
    add(CMD.BOLD_ON);
    add(`SETTLED VIA WALLET\n`);
    add(CMD.BOLD_OFF);
  } else {
    const cashTotal = sale.total - (sale.walletUsed || 0);
    add(CMD.BOLD_ON);
    add(`AMOUNT PAID: N${cashTotal.toLocaleString()}\n`);
    add(CMD.BOLD_OFF);
  }

  // 4. Footer & Policy
  add(CMD.LINE_FEED);
  add(CMD.ALIGN_CENTER);
  add('THANK YOU FOR YOUR PATRONAGE\n');
  add(CMD.BOLD_ON);
  add('NO REFUND AFTER PAYMENT\n');
  add(CMD.BOLD_OFF);
  add('Powered by NaijaShopApp\n');

  // 5. Tear Space & Partial Cut
  add(CMD.LINE_FEED);
  add(CMD.LINE_FEED);
  add(CMD.LINE_FEED);
  add([GS, 0x56, 0x01, 0x31]); // Feed and cut command

  return new Uint8Array(bytes);
}
