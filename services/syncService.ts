import { supabase, getShopId } from '../utils/supabase.ts';
import { db, InventoryItem, Sale, User, Category, Expense, Debt, Customer } from '../db.ts';

// =====================
// HELPER: Case Conversion (Optional if Supabase schema matches camelCase)
// =====================
const toSnakeCase = (obj: any): any => {
  const converted: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    converted[snakeKey] = obj[key];
  }
  return converted;
};

const toCamelCase = (obj: any): any => {
  const converted: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    converted[camelKey] = obj[key];
  }
  return converted;
};

// =====================
// PUSH: Local → Cloud
// =====================
export async function pushToCloud() {
  const shopId = getShopId();
  const results = { success: 0, failed: 0, errors: [] as string[] };

  try {
    // 1. Push Inventory
    const unsyncedInventory = await db.inventory.where('synced').equals(0).toArray();
    for (const item of unsyncedInventory) {
      const cloudData = {
        uuid: item.uuid,
        shop_id: shopId,
        name: item.name,
        cost_price: item.costPrice,
        selling_price: item.sellingPrice,
        stock: item.stock,
        unit: item.unit,
        supplier_name: item.supplierName,
        min_stock: item.minStock,
        expiry_date: item.expiryDate,
        category: item.category,
        barcode: item.barcode,
        date_added: item.dateAdded,
        image: item.image,
        last_updated: item.last_updated || Date.now()
      };

      const { error } = await supabase
        .from('inventory')
        .upsert(cloudData, { onConflict: 'uuid' });

      if (error) {
        results.failed++;
        results.errors.push(`Inventory ${item.name}: ${error.message}`);
      } else {
        await db.inventory.update(item.id!, { synced: 1 });
        results.success++;
      }
    }

    // 2. Push Sales
    const unsyncedSales = await db.sales.where('synced').equals(0).toArray();
    for (const sale of unsyncedSales) {
      const cloudData = {
        uuid: sale.uuid,
        shop_id: shopId,
        items: sale.items,
        total: sale.total,
        total_cost: sale.totalCost,
        wallet_used: sale.walletUsed,
        wallet_saved: sale.walletSaved,
        cash_paid: sale.cashPaid,
        payment_method: sale.paymentMethod,
        timestamp: sale.timestamp,
        staff_id: sale.staff_id,
        staff_name: sale.staff_name,
        customer_phone: sale.customer_phone,
        last_updated: sale.last_updated || Date.now()
      };

      const { error } = await supabase
        .from('sales')
        .upsert(cloudData, { onConflict: 'uuid' });

      if (error) {
        results.failed++;
        results.errors.push(`Sale: ${error.message}`);
      } else {
        await db.sales.update(sale.id!, { synced: 1 });
        results.success++;
      }
    }

    // 3. Push Users
    const unsyncedUsers = await db.users.where('synced').equals(0).toArray();
    for (const user of unsyncedUsers) {
      const cloudData = {
        uuid: user.uuid,
        shop_id: shopId,
        name: user.name,
        pin: user.pin,
        role: user.role,
        email: user.email,
        avatar: user.avatar,
        last_updated: user.last_updated || Date.now()
      };

      const { error } = await supabase
        .from('users')
        .upsert(cloudData, { onConflict: 'uuid' });

      if (error) {
        results.failed++;
        results.errors.push(`User ${user.name}: ${error.message}`);
      } else {
        await db.users.update(user.id!, { synced: 1 });
        results.success++;
      }
    }

    // 4. Push Categories
    const unsyncedCategories = await db.categories.where('synced').equals(0).toArray();
    for (const cat of unsyncedCategories) {
      const cloudData = {
        uuid: cat.uuid,
        shop_id: shopId,
        name: cat.name,
        image: cat.image,
        date_created: cat.dateCreated,
        last_updated: cat.last_updated || Date.now()
      };

      const { error } = await supabase
        .from('categories')
        .upsert(cloudData, { onConflict: 'uuid' });

      if (error) {
        results.failed++;
      } else {
        await db.categories.update(cat.id!, { synced: 1 });
        results.success++;
      }
    }

    // 5. Push Expenses
    const unsyncedExpenses = await db.expenses.where('synced').equals(0).toArray();
    for (const exp of unsyncedExpenses) {
      const cloudData = {
        uuid: exp.uuid,
        shop_id: shopId,
        description: exp.description,
        amount: exp.amount,
        date: exp.date,
        last_updated: exp.last_updated || Date.now()
      };

      const { error } = await supabase
        .from('expenses')
        .upsert(cloudData, { onConflict: 'uuid' });

      if (error) {
        results.failed++;
      } else {
        await db.expenses.update(exp.id!, { synced: 1 });
        results.success++;
      }
    }

    // 6. Push Debts
    const unsyncedDebts = await db.debts.where('synced').equals(0).toArray();
    for (const debt of unsyncedDebts) {
      const cloudData = {
        uuid: debt.uuid,
        shop_id: shopId,
        sale_uuid: debt.sale_uuid,
        customer_name: debt.customerName,
        customer_phone: debt.customerPhone,
        total_amount: debt.totalAmount,
        remaining_balance: debt.remainingBalance,
        items: debt.items,
        date: debt.date,
        last_reminder_sent: debt.lastReminderSent,
        status: debt.status,
        note: debt.note,
        last_updated: debt.last_updated || Date.now()
      };

      const { error } = await supabase
        .from('debts')
        .upsert(cloudData, { onConflict: 'uuid' });

      if (error) {
        results.failed++;
      } else {
        await db.debts.update(debt.id!, { synced: 1 });
        results.success++;
      }
    }

    // 7. Push Customers
    const unsyncedCustomers = await db.customers.where('synced').equals(0).toArray();
    for (const customer of unsyncedCustomers) {
      const cloudData = {
        uuid: customer.uuid,
        shop_id: shopId,
        name: customer.name,
        phone: customer.phone,
        wallet_balance: customer.walletBalance,
        last_transaction: customer.lastTransaction,
        last_updated: customer.last_updated || Date.now()
      };

      const { error } = await supabase
        .from('customers')
        .upsert(cloudData, { onConflict: 'uuid' });

      if (error) {
        results.failed++;
      } else {
        await db.customers.update(customer.id!, { synced: 1 });
        results.success++;
      }
    }

    console.debug('Push complete:', results);
    return results;

  } catch (error) {
    console.error('Push failed:', error);
    throw error;
  }
}

// =====================
// PULL: Cloud → Local
// =====================
export async function pullFromCloud() {
  const shopId = getShopId();
  const results = { added: 0, updated: 0, errors: [] as string[] };

  try {
    // Get last sync time
    const lastSyncSetting = await db.settings.get('last_sync_timestamp');
    const lastSync = lastSyncSetting?.value || 0;

    // 1. Pull Inventory
    const { data: cloudInventory, error: invError } = await supabase
      .from('inventory')
      .select('*')
      .eq('shop_id', shopId)
      .gt('last_updated', lastSync);

    if (invError) {
      results.errors.push(`Inventory: ${invError.message}`);
    } else if (cloudInventory) {
      for (const item of cloudInventory) {
        const localItem = await db.inventory.where('uuid').equals(item.uuid).first();
        
        const dexieData: Partial<InventoryItem> = {
          uuid: item.uuid,
          name: item.name,
          costPrice: item.cost_price,
          sellingPrice: item.selling_price,
          stock: item.stock,
          unit: item.unit,
          supplierName: item.supplier_name,
          minStock: item.min_stock,
          expiryDate: item.expiry_date,
          category: item.category,
          barcode: item.barcode,
          dateAdded: item.date_added,
          image: item.image,
          last_updated: item.last_updated,
          synced: 1
        };

        if (localItem) {
          if (item.last_updated > (localItem.last_updated || 0)) {
            await db.inventory.update(localItem.id!, dexieData);
            results.updated++;
          }
        } else {
          await db.inventory.add(dexieData as InventoryItem);
          results.added++;
        }
      }
    }

    // 2. Pull Sales
    const { data: cloudSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('shop_id', shopId)
      .gt('last_updated', lastSync);

    if (salesError) {
      results.errors.push(`Sales: ${salesError.message}`);
    } else if (cloudSales) {
      for (const sale of cloudSales) {
        const localSale = await db.sales.where('uuid').equals(sale.uuid).first();
        
        const dexieData: Partial<Sale> = {
          uuid: sale.uuid,
          items: sale.items,
          total: sale.total,
          totalCost: sale.total_cost,
          walletUsed: sale.wallet_used,
          walletSaved: sale.wallet_saved,
          cashPaid: sale.cash_paid,
          paymentMethod: sale.payment_method,
          timestamp: sale.timestamp,
          staff_id: sale.staff_id,
          staff_name: sale.staff_name,
          customer_phone: sale.customer_phone,
          last_updated: sale.last_updated,
          synced: 1
        };

        if (!localSale) {
          await db.sales.add(dexieData as Sale);
          results.added++;
        }
      }
    }

    // 3. Pull Users
    const { data: cloudUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('shop_id', shopId)
      .gt('last_updated', lastSync);

    if (!usersError && cloudUsers) {
      for (const user of cloudUsers) {
        const localUser = await db.users.where('uuid').equals(user.uuid).first();
        
        const dexieData: Partial<User> = {
          uuid: user.uuid,
          name: user.name,
          pin: user.pin,
          role: user.role,
          email: user.email,
          avatar: user.avatar,
          last_updated: user.last_updated,
          synced: 1
        };

        if (localUser) {
          if (user.last_updated > (localUser.last_updated || 0)) {
            await db.users.update(localUser.id!, dexieData);
            results.updated++;
          }
        } else {
          await db.users.add(dexieData as User);
          results.added++;
        }
      }
    }

    // 4. Pull Categories
    const { data: cloudCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('shop_id', shopId)
      .gt('last_updated', lastSync);

    if (cloudCategories) {
      for (const cat of cloudCategories) {
        const localCat = await db.categories.where('uuid').equals(cat.uuid).first();
        
        if (!localCat) {
          await db.categories.add({
            uuid: cat.uuid,
            name: cat.name,
            image: cat.image,
            dateCreated: cat.date_created,
            last_updated: cat.last_updated,
            synced: 1
          });
          results.added++;
        }
      }
    }

    // Update last sync timestamp
    await db.settings.put({ key: 'last_sync_timestamp', value: Date.now() });

    console.debug('Pull complete:', results);
    return results;

  } catch (error) {
    console.error('Pull failed:', error);
    throw error;
  }
}

// =====================
// FULL SYNC: Push then Pull
// =====================
export async function syncAll() {
  console.debug('Starting full sync...');
  
  const pushResult = await pushToCloud();
  const pullResult = await pullFromCloud();
  
  return {
    pushed: pushResult.success,
    pulled: pullResult.added + pullResult.updated,
    errors: [...pushResult.errors, ...pullResult.errors]
  };
}

// =====================
// REALTIME SUBSCRIPTION
// =====================
export function subscribeToChanges(onInventoryChange: () => void, onSalesChange: () => void) {
  const shopId = getShopId();

  const inventorySubscription = supabase
    .channel('inventory-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory',
        filter: `shop_id=eq.${shopId}`
      },
      (payload) => {
        console.debug('Cloud inventory changed:', payload);
        onInventoryChange();
      }
    )
    .subscribe();

  const salesSubscription = supabase
    .channel('sales-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sales',
        filter: `shop_id=eq.${shopId}`
      },
      (payload) => {
        console.debug('Cloud new sale detected:', payload);
        onSalesChange();
      }
    )
    .subscribe();

  return () => {
    inventorySubscription.unsubscribe();
    salesSubscription.unsubscribe();
  };
}
