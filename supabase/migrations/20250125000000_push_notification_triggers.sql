-- Function to send push notification when order is assigned to driver
CREATE OR REPLACE FUNCTION notify_driver_order_assigned()
RETURNS TRIGGER AS $$
DECLARE
  order_data JSONB;
BEGIN
  -- Only send notification if driver_id was just assigned (was NULL, now has value)
  IF NEW.driver_id IS NOT NULL AND (OLD.driver_id IS NULL OR OLD.driver_id != NEW.driver_id) THEN
    -- Build order data
    order_data := jsonb_build_object(
      'order_id', NEW.id,
      'type', 'order_assigned',
      'status', NEW.order_status,
      'restaurant_name', (SELECT name FROM restaurants WHERE id = NEW.restaurant_id LIMIT 1)
    );

    -- Call edge function to send push notification
    -- Note: This uses pg_net extension if available, otherwise logs the notification
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url', true) || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
        ),
        body := jsonb_build_object(
          'driver_id', NEW.driver_id,
          'title', 'New Delivery Order',
          'body', 'You have a new delivery order!',
          'data', order_data
        )
      );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger when order is assigned to driver
DROP TRIGGER IF EXISTS order_assigned_notification ON orders;
CREATE TRIGGER order_assigned_notification
  AFTER UPDATE OF driver_id ON orders
  FOR EACH ROW
  WHEN (NEW.driver_id IS NOT NULL AND (OLD.driver_id IS NULL OR OLD.driver_id != NEW.driver_id))
  EXECUTE FUNCTION notify_driver_order_assigned();

-- Function to send push notification when order status changes
CREATE OR REPLACE FUNCTION notify_driver_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  status_messages JSONB := '{
    "pending": "New order pending",
    "confirmed": "Order confirmed",
    "preparing": "Restaurant is preparing your order",
    "ready": "Order ready for pickup",
    "picked_up": "Order picked up from restaurant",
    "in_transit": "Order is on the way",
    "delivered": "Order delivered successfully",
    "cancelled": "Order cancelled"
  }'::jsonb;
  message_text TEXT;
BEGIN
  -- Only send notification if status changed and driver is assigned
  IF NEW.order_status != OLD.order_status AND NEW.driver_id IS NOT NULL THEN
    message_text := status_messages->>NEW.order_status;
    
    IF message_text IS NULL THEN
      message_text := 'Order status updated to ' || NEW.order_status;
    END IF;

    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url', true) || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
        ),
        body := jsonb_build_object(
          'driver_id', NEW.driver_id,
          'title', 'Order Update',
          'body', message_text,
          'data', jsonb_build_object(
            'order_id', NEW.id,
            'type', 'order_status_change',
            'status', NEW.order_status
          )
        )
      );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send status change notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for order status changes
DROP TRIGGER IF EXISTS order_status_change_notification ON orders;
CREATE TRIGGER order_status_change_notification
  AFTER UPDATE OF order_status ON orders
  FOR EACH ROW
  WHEN (NEW.order_status != OLD.order_status AND NEW.driver_id IS NOT NULL)
  EXECUTE FUNCTION notify_driver_order_status_change();

-- Function to send push notification for new earnings
CREATE OR REPLACE FUNCTION notify_driver_new_earnings()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification when new earnings are recorded
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := jsonb_build_object(
        'driver_id', NEW.driver_id,
        'title', 'New Earnings',
        'body', '$' || (NEW.total_cents::numeric / 100)::text || ' added to your earnings',
        'data', jsonb_build_object(
          'type', 'new_earnings',
          'amount_cents', NEW.total_cents,
          'order_id', NEW.order_id
        )
      )
    );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send earnings notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new earnings
DROP TRIGGER IF EXISTS new_earnings_notification ON driver_earnings;
CREATE TRIGGER new_earnings_notification
  AFTER INSERT ON driver_earnings
  FOR EACH ROW
  EXECUTE FUNCTION notify_driver_new_earnings();

-- Note: To enable these triggers, you need to:
-- 1. Enable pg_net extension: CREATE EXTENSION IF NOT EXISTS pg_net;
-- 2. Set configuration variables:
--    ALTER DATABASE your_database SET app.supabase_url = 'https://your-project.supabase.co';
--    ALTER DATABASE your_database SET app.supabase_service_role_key = 'your-service-role-key';

