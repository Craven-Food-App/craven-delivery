-- Fix update_budget_spent trigger to handle expense_requests without budget_id
-- The expense_requests table doesn't have a budget_id column, so we need to
-- make the trigger function handle this gracefully

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS trigger_update_budget_spent ON public.expense_requests;

-- Create a new function that only works for tables with budget_id (like invoices)
CREATE OR REPLACE FUNCTION update_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update budget if status changed to 'paid'
  -- This function should only be used on tables that have budget_id column
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Only update if budget_id is not null
    IF (NEW.budget_id IS NOT NULL) THEN
      UPDATE public.budgets
      SET spent_amount = spent_amount + NEW.amount
      WHERE id = NEW.budget_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger for expense_requests is intentionally not recreated
-- since expense_requests table doesn't have a budget_id column
-- If budget tracking is needed for expenses, it should be implemented
-- through a different mechanism (e.g., matching by department_id and category_id)

