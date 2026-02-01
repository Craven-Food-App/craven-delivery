# Instant Payout Implementation Guide

**Date:** 2026-01-31  
**Locations:** Earnings page & Feeder Card page  
**Feature:** Driver-initiated instant payouts

---

## Overview

Added two new Edge Functions to enable driver instant payouts:

1. **`get-driver-balance`** - Get driver's available Stripe balance
2. **`create-instant-payout`** - Trigger instant payout to driver's bank/card

---

## Backend Implementation ✅

### Files Created

1. **`supabase/functions/get-driver-balance/index.ts`**
   - Returns driver's available balance from Stripe
   - Shows pending balance
   - Indicates if instant payouts are enabled
   - Returns recent payout history

2. **`supabase/functions/create-instant-payout/index.ts`**
   - Creates instant payout via Stripe API
   - Validates balance and minimum amount
   - Logs payout in database
   - Returns estimated fee and arrival time

3. **`supabase/migrations/20260131000001_create_driver_payouts_table.sql`**
   - New table to track all driver payouts
   - RLS policies for security
   - Indexes for performance

---

## Frontend Integration

### 1. Earnings Page ("Payout Req" Button)

**Location:** Where "Payout Req" button is shown

#### API Calls Needed

```typescript
// Get balance (call on page load)
const getDriverBalance = async () => {
  const { data, error } = await supabase.functions.invoke('get-driver-balance', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  
  if (error) {
    console.error('Failed to get balance:', error);
    return null;
  }
  
  return data;
  // Returns:
  // {
  //   available_cents: 1234,
  //   available_dollars: "12.34",
  //   pending_cents: 567,
  //   pending_dollars: "5.67",
  //   payouts_enabled: true,
  //   instant_payouts_enabled: true,
  //   can_cash_out: true,
  //   minimum_payout: 100,
  //   recent_payouts: [...]
  // }
};

// Request instant payout (call when button clicked)
const requestInstantPayout = async (amountCents: number) => {
  const { data, error } = await supabase.functions.invoke('create-instant-payout', {
    body: {
      amount: amountCents,
      payout_method: 'instant', // or 'standard'
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  
  if (error) {
    console.error('Payout failed:', error);
    return null;
  }
  
  return data;
  // Returns:
  // {
  //   success: true,
  //   payout_id: "po_xxx",
  //   amount: 1234,
  //   status: "in_transit",
  //   estimated_arrival: "2026-01-31T15:30:00Z",
  //   method: "instant",
  //   fee_cents: 12,
  //   net_amount: 1222
  // }
};
```

#### Updated Component Example

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export const EarningsPage = () => {
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    const session = await supabase.auth.getSession();
    const { data } = await supabase.functions.invoke('get-driver-balance', {
      headers: {
        Authorization: `Bearer ${session?.data.session?.access_token}`,
      },
    });
    setBalance(data);
  };

  const handlePayoutRequest = async () => {
    if (!balance?.can_cash_out) {
      Alert.alert(
        'Cannot Cash Out',
        'Minimum balance is $1.00 or onboarding not complete'
      );
      return;
    }

    // Show confirmation with fee estimate
    const feeCents = Math.min(Math.round(balance.available_cents * 0.01), 1000);
    const netAmount = balance.available_cents - feeCents;

    Alert.alert(
      'Instant Payout',
      `Cash out $${balance.available_dollars}?\n\n` +
      `Fee: $${(feeCents / 100).toFixed(2)}\n` +
      `You receive: $${(netAmount / 100).toFixed(2)}\n\n` +
      `Money arrives in 5-30 minutes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cash Out',
          onPress: async () => {
            setLoading(true);
            try {
              const session = await supabase.auth.getSession();
              const { data, error } = await supabase.functions.invoke(
                'create-instant-payout',
                {
                  body: {
                    amount: balance.available_cents,
                    payout_method: 'instant',
                  },
                  headers: {
                    Authorization: `Bearer ${session?.data.session?.access_token}`,
                  },
                }
              );

              if (error) {
                Alert.alert('Payout Failed', error.message);
              } else {
                Alert.alert(
                  'Payout Requested! 🎉',
                  `$${data.net_amount / 100} is on the way to your account.\n\n` +
                  `Estimated arrival: ${new Date(data.estimated_arrival).toLocaleTimeString()}`
                );
                loadBalance(); // Refresh balance
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* ON FIRE status section */}
      <View style={styles.fireSection}>
        <Text style={styles.fireText}>ON FIRE 🔥</Text>
        <Text style={styles.activityText}>Normal activity</Text>
      </View>

      {/* Earnings Snapshot */}
      <View style={styles.snapshotSection}>
        <Text style={styles.snapshotTitle}>EARNINGS SNAPSHOT</Text>
        <Text style={styles.todayAmount}>
          ${balance?.available_dollars || '0.00'}
        </Text>
        <Text style={styles.todayLabel}>Available Balance</Text>
        
        {balance?.pending_cents > 0 && (
          <Text style={styles.pendingText}>
            ${balance.pending_dollars} pending
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Manage Card</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.payoutButton,
            !balance?.can_cash_out && styles.buttonDisabled,
          ]}
          onPress={handlePayoutRequest}
          disabled={loading || !balance?.can_cash_out}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Processing...' : 'Payout Req'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status Messages */}
      {!balance?.payouts_enabled && (
        <Text style={styles.warningText}>
          Complete onboarding to enable payouts
        </Text>
      )}
      
      {!balance?.instant_payouts_enabled && balance?.payouts_enabled && (
        <Text style={styles.infoText}>
          Enable instant payouts in Stripe settings for faster access
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF4500',
  },
  fireSection: {
    padding: 20,
  },
  fireText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  snapshotSection: {
    backgroundColor: '#FFF5E6',
    padding: 20,
    borderRadius: 16,
    margin: 20,
  },
  snapshotTitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  todayAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  todayLabel: {
    fontSize: 14,
    color: '#666',
  },
  pendingText: {
    fontSize: 12,
    color: '#FF8C00',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  payoutButton: {
    backgroundColor: '#FF6B35',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  warningText: {
    textAlign: 'center',
    color: '#FFD700',
    padding: 10,
    fontSize: 12,
  },
  infoText: {
    textAlign: 'center',
    color: '#FFF',
    padding: 10,
    fontSize: 11,
  },
});
```

---

### 2. Feeder Card Page (Instant Payout to Card)

**Location:** Feeder Card balance page with card details

#### Updated Component Example

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';

export const FeederCardPage = () => {
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [payouts, setPayouts] = useState<any[]>([]);

  useEffect(() => {
    loadBalanceAndPayouts();
  }, []);

  const loadBalanceAndPayouts = async () => {
    const session = await supabase.auth.getSession();
    const { data } = await supabase.functions.invoke('get-driver-balance', {
      headers: {
        Authorization: `Bearer ${session?.data.session?.access_token}`,
      },
    });
    
    if (data) {
      setBalance(data);
      setPayouts(data.recent_payouts || []);
    }
  };

  const handleInstantCashOut = async () => {
    if (!balance?.can_cash_out) {
      Alert.alert(
        'Cannot Cash Out',
        balance?.payouts_enabled
          ? 'Minimum balance is $1.00'
          : 'Please complete Stripe onboarding first'
      );
      return;
    }

    // Calculate fee (1% capped at $10)
    const feeCents = Math.min(Math.round(balance.available_cents * 0.01), 1000);
    const netAmountCents = balance.available_cents - feeCents;

    Alert.alert(
      'Instant Cash Out to Card',
      `Available: $${balance.available_dollars}\n` +
      `Instant payout fee: $${(feeCents / 100).toFixed(2)}\n` +
      `You receive: $${(netAmountCents / 100).toFixed(2)}\n\n` +
      `Money arrives in 5-30 minutes to your card ending in 8129.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cash Out Now',
          style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              const session = await supabase.auth.getSession();
              const { data, error } = await supabase.functions.invoke(
                'create-instant-payout',
                {
                  body: {
                    amount: balance.available_cents,
                    payout_method: 'instant',
                  },
                  headers: {
                    Authorization: `Bearer ${session?.data.session?.access_token}`,
                  },
                }
              );

              if (error) {
                Alert.alert('Cash Out Failed', error.message || 'Please try again');
              } else {
                Alert.alert(
                  'Cash Out Successful! 🎉',
                  `$${(data.net_amount / 100).toFixed(2)} is on the way to your card.\n\n` +
                  `Expected arrival: ${new Date(data.estimated_arrival).toLocaleTimeString()}`
                );
                loadBalanceAndPayouts(); // Refresh
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#4CAF50';
      case 'in_transit':
        return '#FF9800';
      case 'pending':
        return '#2196F3';
      case 'failed':
        return '#F44336';
      default:
        return '#999';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Card Display */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Wallet Balance</Text>
        <Text style={styles.cardBalance}>
          ${balance?.available_dollars || '0.00'}
        </Text>
        <Text style={styles.cardNumber}>•••• •••• •••• 8129</Text>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.cardLabel}>Exp</Text>
            <Text style={styles.cardValue}>12/25</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>CVV</Text>
            <Text style={styles.cardValue}>•••</Text>
          </View>
        </View>
        <Text style={styles.cardName}>TORRANCE STROMAN</Text>
      </View>

      {/* Cash Out Button */}
      <TouchableOpacity
        style={[
          styles.cashOutButton,
          (!balance?.can_cash_out || loading) && styles.buttonDisabled,
        ]}
        onPress={handleInstantCashOut}
        disabled={!balance?.can_cash_out || loading}
      >
        <Text style={styles.cashOutButtonText}>
          {loading ? '⏳ Processing...' : '⚡ Instant Cash Out'}
        </Text>
        {balance?.available_cents > 0 && (
          <Text style={styles.cashOutSubtext}>
            Get ${balance.available_dollars} in 5-30 minutes
          </Text>
        )}
      </TouchableOpacity>

      {/* Card Management Options */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionIcon}>👁️</Text>
          <Text style={styles.optionText}>Show Card Details</Text>
          <Text style={styles.optionSubtext}>View number, expiry, CVV</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionIcon}>🔒</Text>
          <Text style={styles.optionText}>Lock Card</Text>
          <Text style={styles.optionSubtext}>Disable all transactions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionIcon}>🔑</Text>
          <Text style={styles.optionText}>Change Card PIN</Text>
          <Text style={styles.optionSubtext}>Set or update your PIN</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction History */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Transaction History</Text>
        
        {payouts.length === 0 ? (
          <Text style={styles.emptyText}>No payouts yet</Text>
        ) : (
          payouts.map((payout) => (
            <View key={payout.id} style={styles.transaction}>
              <View style={styles.transactionIcon}>
                <Text style={styles.transactionIconText}>💸</Text>
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>
                  {payout.method === 'instant' ? 'Instant Payout' : 'Payout'}
                </Text>
                <Text style={styles.transactionDate}>
                  {new Date(payout.arrival_date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.transactionRight}>
                <Text style={styles.transactionAmount}>
                  ${(payout.amount / 100).toFixed(2)}
                </Text>
                <Text
                  style={[
                    styles.transactionStatus,
                    { color: getPayoutStatusColor(payout.status) },
                  ]}
                >
                  {payout.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Status Messages */}
      {!balance?.payouts_enabled && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Complete Stripe onboarding to enable payouts
          </Text>
        </View>
      )}

      {balance?.pending_cents > 0 && (
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            💡 ${balance.pending_dollars} pending (available soon)
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 20,
    padding: 24,
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    minHeight: 200,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  cardBalance: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cardNumber: {
    color: 'white',
    fontSize: 18,
    letterSpacing: 2,
    marginBottom: 16,
  },
  cardBottom: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  cardValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cardName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cashOutButton: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cashOutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cashOutSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 4,
  },
  optionsContainer: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  option: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  historyContainer: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 20,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  transactionStatus: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  warningBanner: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
  },
  infoBanner: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  infoText: {
    color: '#1565C0',
    fontSize: 14,
  },
});
```

---

## Key Features Implemented

### 1. Balance Display
- Shows available balance in real-time
- Shows pending balance
- Indicates if payouts are enabled
- Shows onboarding status

### 2. Instant Payout
- One-click cash out
- Fee calculation (1% capped at $10)
- Confirmation dialog with details
- Success/error handling
- Estimated arrival time

### 3. Payout History
- Recent payout transactions
- Status indicators (pending, in_transit, paid, failed)
- Amount and arrival date
- Color-coded status

### 4. Error Handling
- Insufficient balance warnings
- Onboarding not complete alerts
- Minimum payout enforcement ($1.00)
- Stripe API error messages

---

## Testing Checklist

### Backend Testing

```bash
# 1. Test get balance
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/get-driver-balance \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# 2. Test create payout
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/create-instant-payout \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "payout_method": "instant"}'
```

### Frontend Testing

1. **Load balance on page mount**
   - ✅ Shows correct available balance
   - ✅ Shows pending balance
   - ✅ Shows if payouts enabled

2. **Click "Payout Req" / "Instant Cash Out"**
   - ✅ Shows confirmation dialog
   - ✅ Displays fee estimate
   - ✅ Shows net amount
   - ✅ Disables button if insufficient funds

3. **Confirm payout**
   - ✅ Button shows loading state
   - ✅ Success message appears
   - ✅ Balance refreshes automatically
   - ✅ Payout appears in history

4. **Error scenarios**
   - ✅ Shows error if onboarding not complete
   - ✅ Shows error if balance < $1.00
   - ✅ Shows error if Stripe API fails

---

## Fees & Timing

### Instant Payout
- **Fee:** 1% (capped at $10 max)
- **Timing:** 5-30 minutes
- **Requirements:** Bank/card supports instant transfers

### Standard Payout (Automatic)
- **Fee:** Free
- **Timing:** Next business day (or weekly)
- **Requirements:** Bank account verified

---

## Security Notes

1. **Authorization:** All endpoints require authenticated user token
2. **RLS:** Database policies ensure drivers only see their own payouts
3. **Validation:** Amount validation on both frontend and backend
4. **Idempotency:** Stripe payout IDs are unique (prevents duplicates)
5. **Audit Trail:** All payouts logged in `driver_payouts` table

---

## Deployment Steps

1. **Deploy Edge Functions:**
```bash
supabase functions deploy get-driver-balance
supabase functions deploy create-instant-payout
```

2. **Run Migration:**
```bash
supabase db push
```

3. **Update Mobile App:**
   - Add balance fetching on page load
   - Add payout request handler
   - Update UI with balance display
   - Add confirmation dialog

4. **Test End-to-End:**
   - Complete driver onboarding
   - Complete a delivery
   - Check balance appears
   - Request instant payout
   - Verify money arrives

---

## Webhook Updates (Optional)

To update payout status when Stripe processes it:

**Add to `stripe-webhook/index.ts`:**

```typescript
case 'payout.paid':
case 'payout.failed':
  await handlePayoutUpdate(event.data.object as Stripe.Payout);
  break;

async function handlePayoutUpdate(payout: Stripe.Payout) {
  await supabase
    .from('driver_payouts')
    .update({
      status: payout.status,
      arrival_date: payout.arrival_date 
        ? new Date(payout.arrival_date * 1000).toISOString()
        : null,
      failure_code: payout.failure_code,
      failure_message: payout.failure_message,
    })
    .eq('stripe_payout_id', payout.id);
}
```

---

## Summary

✅ **Backend:** Two new Edge Functions + database table  
✅ **Frontend:** Balance display + instant payout button  
✅ **Security:** RLS policies + authorization checks  
✅ **UX:** Confirmation dialog + fee disclosure + status tracking  

**Ready to deploy and test!**


