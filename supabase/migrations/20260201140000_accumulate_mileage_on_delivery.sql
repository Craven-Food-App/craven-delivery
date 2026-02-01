-- Create or replace function to accumulate mileage pay when order is delivered
CREATE OR REPLACE FUNCTION accumulate_mileage_pay_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Only accumulate when order transitions TO delivered status
  IF NEW.order_status = 'delivered' AND (OLD.order_status IS NULL OR OLD.order_status != 'delivered') THEN
    -- Only process if there's a driver and mileage pay
    IF NEW.driver_id IS NOT NULL AND NEW.mileage_pay_cents > 0 THEN
      -- Insert or update driver_gas_money balance
      INSERT INTO driver_gas_money (driver_id, balance, last_earned_at, updated_at)
      VALUES (
        NEW.driver_id, 
        NEW.mileage_pay_cents,
        NOW(),
        NOW()
      )
      ON CONFLICT (driver_id)
      DO UPDATE SET 
        balance = driver_gas_money.balance + NEW.mileage_pay_cents,
        last_earned_at = NOW(),
        updated_at = NOW();
      
      -- Log the transaction for tracking
      INSERT INTO gas_money_transactions (
        driver_id,
        order_id,
        amount_cents,
        transaction_type,
        description,
        created_at
      )
      VALUES (
        NEW.driver_id,
        NEW.id,
        NEW.mileage_pay_cents,
        'earned',
        'Mileage pay from delivery',
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_accumulate_mileage_pay ON orders;

-- Create trigger on orders table
CREATE TRIGGER trigger_accumulate_mileage_pay
  AFTER UPDATE OF order_status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION accumulate_mileage_pay_on_delivery();

-- Also handle INSERT in case orders are created with 'delivered' status (like some test scenarios)
CREATE OR REPLACE FUNCTION accumulate_mileage_pay_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_status = 'delivered' AND NEW.driver_id IS NOT NULL AND NEW.mileage_pay_cents > 0 THEN
    INSERT INTO driver_gas_money (driver_id, balance, last_earned_at, updated_at)
    VALUES (
      NEW.driver_id, 
      NEW.mileage_pay_cents,
      NOW(),
      NOW()
    )
    ON CONFLICT (driver_id)
    DO UPDATE SET 
      balance = driver_gas_money.balance + NEW.mileage_pay_cents,
      last_earned_at = NOW(),
      updated_at = NOW();
    
    INSERT INTO gas_money_transactions (
      driver_id,
      order_id,
      amount_cents,
      transaction_type,
      description,
      created_at
    )
    VALUES (
      NEW.driver_id,
      NEW.id,
      NEW.mileage_pay_cents,
      'earned',
      'Mileage pay from delivery',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_accumulate_mileage_pay_on_insert ON orders;

CREATE TRIGGER trigger_accumulate_mileage_pay_on_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION accumulate_mileage_pay_on_insert();

-- Add comment for documentation
COMMENT ON FUNCTION accumulate_mileage_pay_on_delivery() IS 'Automatically accumulates mileage pay to driver_gas_money when order status changes to delivered';
COMMENT ON FUNCTION accumulate_mileage_pay_on_insert() IS 'Automatically accumulates mileage pay to driver_gas_money when order is created with delivered status';

