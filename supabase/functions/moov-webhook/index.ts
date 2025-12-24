import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyMoovWebhook } from "../_shared/moov.ts";

serve(async (req) => {
  let eventLogId: string | null = null;
  
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get webhook signature
    const signature = req.headers.get("Moov-Signature") || req.headers.get("X-Moov-Signature");
    const webhookSecret = Deno.env.get("MOOV_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("MOOV_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get raw body for signature verification
    const body = await req.text();
    const payload = JSON.parse(body);

    // Verify webhook signature (if provided)
    if (signature) {
      const isValid = await verifyMoovWebhook(body, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Handle different Moov webhook event types
    const eventType = payload.type || payload.eventType || payload.event?.type;
    console.log(`Received Moov webhook: ${eventType}`, JSON.stringify(payload, null, 2));

    // Log all webhook events for monitoring
    const eventLogResult = await supabase.from("moov_webhook_events").insert({
      event_type: eventType,
      event_id: payload.eventID || payload.id || payload.event?.id,
      payload: payload,
      received_at: new Date().toISOString(),
      processing_status: "pending",
    }).select().single().catch(err => {
      console.error("Failed to log webhook event:", err);
      return { data: null, error: err };
    });
    
    eventLogId = eventLogResult?.data?.id || null;

    switch (eventType) {
      // Account events
      case "account.created":
        await handleAccountCreated(supabase, payload);
        break;
      case "account.disconnected":
        await handleAccountDisconnected(supabase, payload);
        break;
      case "account.updated":
        await handleAccountUpdated(supabase, payload);
        break;
      case "account.verified":
        await handleAccountVerified(supabase, payload);
        break;

      // Balance events
      case "balance.updated":
        await handleBalanceUpdated(supabase, payload);
        break;

      // Bank account events
      case "bankAccount.created":
        await handleBankAccountCreated(supabase, payload);
        break;
      case "bankAccount.deleted":
        await handleBankAccountDeleted(supabase, payload);
        break;
      case "bankAccount.updated":
        await handleBankAccountUpdated(supabase, payload);
        break;

      // Billing statement events
      case "billingStatement.created":
        await handleBillingStatementCreated(supabase, payload);
        break;

      // Cancellation events
      case "cancellation.created":
        await handleCancellationCreated(supabase, payload);
        break;
      case "cancellation.updated":
        await handleCancellationUpdated(supabase, payload);
        break;

      // Capability events
      case "capability.requested":
        await handleCapabilityRequested(supabase, payload);
        break;
      case "capability.updated":
        await handleCapabilityUpdated(supabase, payload);
        break;

      // Card events
      case "card.autoUpdated":
        await handleCardAutoUpdated(supabase, payload);
        break;

      // Dispute events
      case "dispute.created":
        await handleDisputeCreated(supabase, payload);
        break;
      case "dispute.updated":
        await handleDisputeUpdated(supabase, payload);
        break;

      // Invoice events
      case "invoice.created":
        await handleInvoiceCreated(supabase, payload);
        break;
      case "invoice.updated":
        await handleInvoiceUpdated(supabase, payload);
        break;

      // Network ID events
      case "networkID.updated":
        await handleNetworkIDUpdated(supabase, payload);
        break;

      // Payment method events
      case "paymentMethod.disabled":
        await handlePaymentMethodDisabled(supabase, payload);
        break;
      case "paymentMethod.enabled":
        await handlePaymentMethodEnabled(supabase, payload);
        break;

      // Payment events (legacy support)
      case "payment.succeeded":
      case "payment.completed":
        await handlePaymentSucceeded(supabase, payload);
        break;
      case "payment.failed":
      case "payment.declined":
        await handlePaymentFailed(supabase, payload);
        break;
      case "payment.pending":
        await handlePaymentPending(supabase, payload);
        break;

      // Refund events
      case "refund.created":
        await handleRefundCreated(supabase, payload);
        break;
      case "refund.updated":
        await handleRefundUpdated(supabase, payload);
        break;

      // Representative events
      case "representative.created":
        await handleRepresentativeCreated(supabase, payload);
        break;
      case "representative.deleted":
        await handleRepresentativeDeleted(supabase, payload);
        break;
      case "representative.updated":
        await handleRepresentativeUpdated(supabase, payload);
        break;

      // Sweep events
      case "sweep.created":
        await handleSweepCreated(supabase, payload);
        break;
      case "sweep.updated":
        await handleSweepUpdated(supabase, payload);
        break;

      // Terminal application events
      case "terminalApplication.created":
        await handleTerminalApplicationCreated(supabase, payload);
        break;
      case "terminalApplication.updated":
        await handleTerminalApplicationUpdated(supabase, payload);
        break;

      // Ticket events
      case "ticket.created":
        await handleTicketCreated(supabase, payload);
        break;

      // Transfer events (legacy support)
      case "transfer.succeeded":
      case "transfer.completed":
        await handleTransferSucceeded(supabase, payload);
        break;
      case "transfer.failed":
        await handleTransferFailed(supabase, payload);
        break;

      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }

    // Update processing status to success
    if (eventLogId) {
      await supabase
        .from("moov_webhook_events")
        .update({
          processing_status: "success",
          processed_at: new Date().toISOString(),
        })
        .eq("id", eventLogId)
        .catch(err => console.error("Failed to update event log:", err));
    }

    return new Response(
      JSON.stringify({ received: true, eventType }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    
    // Update processing status to error
    if (eventLogId) {
      await supabase
        .from("moov_webhook_events")
        .update({
          processing_status: "error",
          error_message: error instanceof Error ? error.message : "Unknown error",
          processed_at: new Date().toISOString(),
        })
        .eq("id", eventLogId)
        .catch(err => console.error("Failed to update event log:", err));
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function handlePaymentSucceeded(supabase: any, payload: any) {
  const paymentID = payload.paymentID || payload.payment?.paymentID;
  const amount = payload.amount?.value || payload.amount;
  const metadata = payload.metadata || {};

  console.log(`Payment succeeded: ${paymentID}`);

  // Update order payment status
  if (metadata.order_id) {
    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        payment_provider_transaction_id: paymentID,
        updated_at: new Date().toISOString(),
      })
      .eq("id", metadata.order_id);
  }

  // Update membership if applicable
  if (metadata.membership_id) {
    await supabase
      .from("user_memberships")
      .update({
        status: "active",
        payment_provider_transaction_id: paymentID,
        updated_at: new Date().toISOString(),
      })
      .eq("id", metadata.membership_id);
  }
}

async function handlePaymentFailed(supabase: any, payload: any) {
  const paymentID = payload.paymentID || payload.payment?.paymentID;
  const failureReason = payload.failureReason || payload.error?.message;
  const metadata = payload.metadata || {};

  console.log(`Payment failed: ${paymentID}, reason: ${failureReason}`);

  if (metadata.order_id) {
    await supabase
      .from("orders")
      .update({
        payment_status: "failed",
        payment_error: failureReason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", metadata.order_id);
  }
}

async function handlePaymentPending(supabase: any, payload: any) {
  const paymentID = payload.paymentID || payload.payment?.paymentID;
  const metadata = payload.metadata || {};

  console.log(`Payment pending: ${paymentID}`);

  if (metadata.order_id) {
    await supabase
      .from("orders")
      .update({
        payment_status: "pending",
        payment_provider_transaction_id: paymentID,
        updated_at: new Date().toISOString(),
      })
      .eq("id", metadata.order_id);
  }
}

async function handleTransferSucceeded(supabase: any, payload: any) {
  const transferID = payload.transferID || payload.transfer?.transferID;
  const metadata = payload.metadata || {};

  console.log(`Transfer succeeded: ${transferID}`);

  // Update driver payout
  if (metadata.driver_id) {
    await supabase
      .from("driver_payouts")
      .update({
        status: "completed",
        external_transaction_id: transferID,
        processed_at: new Date().toISOString(),
      })
      .eq("external_transaction_id", transferID);
  }

  // Update restaurant payout
  if (metadata.restaurant_id) {
    await supabase
      .from("payouts")
      .update({
        status: "completed",
        external_transaction_id: transferID,
        processed_at: new Date().toISOString(),
      })
      .eq("external_transaction_id", transferID);
  }
}

async function handleTransferFailed(supabase: any, payload: any) {
  const transferID = payload.transferID || payload.transfer?.transferID;
  const failureReason = payload.failureReason || payload.error?.message;
  const metadata = payload.metadata || {};

  console.log(`Transfer failed: ${transferID}, reason: ${failureReason}`);

  if (metadata.driver_id) {
    await supabase
      .from("driver_payouts")
      .update({
        status: "failed",
        error_message: failureReason,
        processed_at: new Date().toISOString(),
      })
      .eq("external_transaction_id", transferID);
  }

  if (metadata.restaurant_id) {
    await supabase
      .from("payouts")
      .update({
        status: "failed",
        error_message: failureReason,
        processed_at: new Date().toISOString(),
      })
      .eq("external_transaction_id", transferID);
  }
}

async function handleDisputeCreated(supabase: any, payload: any) {
  const disputeID = payload.disputeID || payload.dispute?.disputeID;
  const paymentID = payload.paymentID || payload.payment?.paymentID;
  const amount = payload.amount?.value || payload.amount;

  console.log(`Dispute created: ${disputeID} for payment ${paymentID}`);

  // Create dispute record
  await supabase.from("payment_disputes").insert({
    dispute_id: disputeID,
    payment_id: paymentID,
    amount_cents: amount,
    status: "open",
    created_at: new Date().toISOString(),
  });
}

async function handleDisputeResolved(supabase: any, payload: any) {
  const disputeID = payload.disputeID || payload.dispute?.disputeID;
  const resolution = payload.resolution || payload.status;

  console.log(`Dispute resolved: ${disputeID}, resolution: ${resolution}`);

  await supabase
    .from("payment_disputes")
    .update({
      status: resolution === "won" ? "won" : "lost",
      resolved_at: new Date().toISOString(),
    })
    .eq("dispute_id", disputeID);
}

async function handleAccountVerified(supabase: any, payload: any) {
  const accountID = payload.accountID || payload.account?.accountID;
  const verificationStatus = payload.verificationStatus || payload.status;

  console.log(`Account verified: ${accountID}, status: ${verificationStatus}`);

  // Update merchant/restaurant verification status if applicable
  // This would depend on how you link Moov accounts to restaurants
}

async function handleAccountCreated(supabase: any, payload: any) {
  const accountID = payload.accountID || payload.account?.accountID;
  console.log(`Account created: ${accountID}`);
  // Handle account creation
}

async function handleAccountDisconnected(supabase: any, payload: any) {
  const accountID = payload.accountID || payload.account?.accountID;
  console.log(`Account disconnected: ${accountID}`);
  // Handle account disconnection
}

async function handleAccountUpdated(supabase: any, payload: any) {
  const accountID = payload.accountID || payload.account?.accountID;
  console.log(`Account updated: ${accountID}`);
  // Handle account updates
}

async function handleBalanceUpdated(supabase: any, payload: any) {
  const accountID = payload.accountID || payload.account?.accountID;
  const balance = payload.balance;
  console.log(`Balance updated for account ${accountID}:`, balance);
  // Handle balance updates
}

async function handleBankAccountCreated(supabase: any, payload: any) {
  const bankAccountID = payload.bankAccountID || payload.bankAccount?.bankAccountID;
  const accountID = payload.accountID || payload.account?.accountID;
  console.log(`Bank account created: ${bankAccountID} for account ${accountID}`);
  // Handle bank account creation
}

async function handleBankAccountDeleted(supabase: any, payload: any) {
  const bankAccountID = payload.bankAccountID || payload.bankAccount?.bankAccountID;
  console.log(`Bank account deleted: ${bankAccountID}`);
  // Handle bank account deletion
}

async function handleBankAccountUpdated(supabase: any, payload: any) {
  const bankAccountID = payload.bankAccountID || payload.bankAccount?.bankAccountID;
  console.log(`Bank account updated: ${bankAccountID}`);
  // Handle bank account updates
}

async function handleBillingStatementCreated(supabase: any, payload: any) {
  const statementID = payload.statementID || payload.billingStatement?.statementID;
  console.log(`Billing statement created: ${statementID}`);
  // Handle billing statement creation
}

async function handleCancellationCreated(supabase: any, payload: any) {
  const cancellationID = payload.cancellationID || payload.cancellation?.cancellationID;
  console.log(`Cancellation created: ${cancellationID}`);
  // Handle cancellation creation
}

async function handleCancellationUpdated(supabase: any, payload: any) {
  const cancellationID = payload.cancellationID || payload.cancellation?.cancellationID;
  console.log(`Cancellation updated: ${cancellationID}`);
  // Handle cancellation updates
}

async function handleCapabilityRequested(supabase: any, payload: any) {
  const capabilityID = payload.capabilityID || payload.capability?.capabilityID;
  const accountID = payload.accountID || payload.account?.accountID;
  console.log(`Capability requested: ${capabilityID} for account ${accountID}`);
  // Handle capability requests
}

async function handleCapabilityUpdated(supabase: any, payload: any) {
  const capabilityID = payload.capabilityID || payload.capability?.capabilityID;
  const status = payload.status || payload.capability?.status;
  console.log(`Capability updated: ${capabilityID}, status: ${status}`);
  // Handle capability updates
}

async function handleCardAutoUpdated(supabase: any, payload: any) {
  const cardID = payload.cardID || payload.card?.cardID;
  console.log(`Card auto-updated: ${cardID}`);
  // Handle card auto-updates
}

async function handleDisputeUpdated(supabase: any, payload: any) {
  const disputeID = payload.disputeID || payload.dispute?.disputeID;
  const status = payload.status || payload.dispute?.status;
  console.log(`Dispute updated: ${disputeID}, status: ${status}`);
  
  await supabase
    .from("payment_disputes")
    .update({
      status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("dispute_id", disputeID);
}

async function handleInvoiceCreated(supabase: any, payload: any) {
  const invoiceID = payload.invoiceID || payload.invoice?.invoiceID;
  console.log(`Invoice created: ${invoiceID}`);
  // Handle invoice creation
}

async function handleInvoiceUpdated(supabase: any, payload: any) {
  const invoiceID = payload.invoiceID || payload.invoice?.invoiceID;
  const status = payload.status || payload.invoice?.status;
  console.log(`Invoice updated: ${invoiceID}, status: ${status}`);
  // Handle invoice updates
}

async function handleNetworkIDUpdated(supabase: any, payload: any) {
  const networkID = payload.networkID || payload.networkID?.networkID;
  console.log(`Network ID updated: ${networkID}`);
  // Handle network ID updates
}

async function handlePaymentMethodDisabled(supabase: any, payload: any) {
  const paymentMethodID = payload.paymentMethodID || payload.paymentMethod?.paymentMethodID;
  console.log(`Payment method disabled: ${paymentMethodID}`);
  // Handle payment method disable
}

async function handlePaymentMethodEnabled(supabase: any, payload: any) {
  const paymentMethodID = payload.paymentMethodID || payload.paymentMethod?.paymentMethodID;
  console.log(`Payment method enabled: ${paymentMethodID}`);
  // Handle payment method enable
}

async function handleRefundCreated(supabase: any, payload: any) {
  const refundID = payload.refundID || payload.refund?.refundID;
  const paymentID = payload.paymentID || payload.payment?.paymentID;
  const amount = payload.amount?.value || payload.amount;
  console.log(`Refund created: ${refundID} for payment ${paymentID}, amount: ${amount}`);
  // Handle refund creation
}

async function handleRefundUpdated(supabase: any, payload: any) {
  const refundID = payload.refundID || payload.refund?.refundID;
  const status = payload.status || payload.refund?.status;
  console.log(`Refund updated: ${refundID}, status: ${status}`);
  // Handle refund updates
}

async function handleRepresentativeCreated(supabase: any, payload: any) {
  const representativeID = payload.representativeID || payload.representative?.representativeID;
  const accountID = payload.accountID || payload.account?.accountID;
  console.log(`Representative created: ${representativeID} for account ${accountID}`);
  // Handle representative creation
}

async function handleRepresentativeDeleted(supabase: any, payload: any) {
  const representativeID = payload.representativeID || payload.representative?.representativeID;
  console.log(`Representative deleted: ${representativeID}`);
  // Handle representative deletion
}

async function handleRepresentativeUpdated(supabase: any, payload: any) {
  const representativeID = payload.representativeID || payload.representative?.representativeID;
  console.log(`Representative updated: ${representativeID}`);
  // Handle representative updates
}

async function handleSweepCreated(supabase: any, payload: any) {
  const sweepID = payload.sweepID || payload.sweep?.sweepID;
  console.log(`Sweep created: ${sweepID}`);
  // Handle sweep creation
}

async function handleSweepUpdated(supabase: any, payload: any) {
  const sweepID = payload.sweepID || payload.sweep?.sweepID;
  const status = payload.status || payload.sweep?.status;
  console.log(`Sweep updated: ${sweepID}, status: ${status}`);
  // Handle sweep updates
}

async function handleTerminalApplicationCreated(supabase: any, payload: any) {
  const applicationID = payload.applicationID || payload.terminalApplication?.applicationID;
  console.log(`Terminal application created: ${applicationID}`);
  // Handle terminal application creation
}

async function handleTerminalApplicationUpdated(supabase: any, payload: any) {
  const applicationID = payload.applicationID || payload.terminalApplication?.applicationID;
  const status = payload.status || payload.terminalApplication?.status;
  console.log(`Terminal application updated: ${applicationID}, status: ${status}`);
  // Handle terminal application updates
}

async function handleTicketCreated(supabase: any, payload: any) {
  const ticketID = payload.ticketID || payload.ticket?.ticketID;
  const accountID = payload.accountID || payload.account?.accountID;
  console.log(`Ticket created: ${ticketID} for account ${accountID}`);
  // Handle ticket creation
}

