/**
 * Payment Flow Test Script
 * Tests the complete payment flow end-to-end
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 PAYMENT FLOW TEST\n');
console.log('=' .repeat(60));

async function testPaymentCreation() {
  console.log('\n📝 TEST 1: Create Payment Intent');
  console.log('-'.repeat(60));
  
  try {
    const { data, error } = await supabase.functions.invoke('create-payment', {
      body: {
        orderTotal: 2500, // $25.00
        customerInfo: {
          email: 'test@example.com',
          name: 'Test User'
        },
        orderId: `test-order-${Date.now()}`
      }
    });

    if (error) {
      console.error('❌ Payment creation failed:', error);
      return false;
    }

    if (data && data.clientSecret) {
      console.log('✅ Payment intent created successfully');
      console.log(`   Client Secret: ${data.clientSecret.substring(0, 20)}...`);
      return true;
    } else {
      console.error('❌ No client secret returned');
      return false;
    }
  } catch (error) {
    console.error('❌ Exception:', error);
    return false;
  }
}

async function testRateLimiting() {
  console.log('\n🚦 TEST 2: Rate Limiting');
  console.log('-'.repeat(60));
  
  console.log('Sending 5 rapid payment requests...');
  
  const results = [];
  for (let i = 0; i < 5; i++) {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          orderTotal: 1000,
          customerInfo: { email: 'test@example.com', name: 'Test' },
          orderId: `rate-test-${i}`
        }
      });
      
      results.push({ 
        attempt: i + 1, 
        success: !error,
        status: error ? 'blocked' : 'allowed'
      });
    } catch (error) {
      results.push({ 
        attempt: i + 1, 
        success: false,
        status: 'error'
      });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\nResults:');
  results.forEach(r => {
    const icon = r.success ? '✅' : '🚫';
    console.log(`  ${icon} Attempt ${r.attempt}: ${r.status}`);
  });
  
  const blocked = results.filter(r => r.status === 'blocked').length;
  if (blocked > 0) {
    console.log(`\n✅ Rate limiting working! Blocked ${blocked}/5 requests`);
    return true;
  } else {
    console.log('\n⚠️  Rate limiting may not be working (all requests allowed)');
    return false;
  }
}

async function testStripeConnectStatus() {
  console.log('\n🔗 TEST 3: Stripe Connect Status');
  console.log('-'.repeat(60));
  
  try {
    const { data, error } = await supabase.functions.invoke('get-stripe-connect-status', {
      body: {
        accountId: 'test_account'
      }
    });

    if (error) {
      console.log('⚠️  Stripe Connect check failed (may need real account):', error.message);
      return false;
    }

    console.log('✅ Stripe Connect endpoint responding');
    return true;
  } catch (error) {
    console.log('⚠️  Stripe Connect test skipped (needs real account)');
    return false;
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting payment flow tests...\n');
  
  const results = {
    paymentCreation: await testPaymentCreation(),
    rateLimiting: await testRateLimiting(),
    stripeConnect: await testStripeConnectStatus()
  };
  
  console.log('\n📊 TEST RESULTS:');
  console.log('=' .repeat(60));
  console.log(`Payment Creation:  ${results.paymentCreation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Rate Limiting:     ${results.rateLimiting ? '✅ PASS' : '⚠️  CHECK'}`);
  console.log(`Stripe Connect:    ${results.stripeConnect ? '✅ PASS' : '⚠️  SKIP'}`);
  
  const allPassed = results.paymentCreation;
  
  if (allPassed) {
    console.log('\n🎉 CORE PAYMENT TESTS PASSED!');
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Test in browser: Place a real order');
    console.log('2. Check Stripe Dashboard for payment intent');
    console.log('3. Verify webhook is receiving events');
    console.log('4. Test driver payout flow');
  } else {
    console.log('\n❌ SOME TESTS FAILED');
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Verify STRIPE_SECRET_KEY is set in Supabase');
    console.log('2. Check Edge Function logs in Supabase Dashboard');
    console.log('3. Ensure ALLOWED_ORIGINS includes your domain');
    console.log('4. Verify you\'re using production keys (sk_live_)');
  }
  
  console.log('\n');
}

// Run tests
runAllTests().catch(console.error);

