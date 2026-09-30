-- Enforce the active plan's device limit even if devices are created by a future API.
ALTER TABLE user_devices DROP CONSTRAINT IF EXISTS user_devices_status_check;
ALTER TABLE user_devices ADD CONSTRAINT user_devices_status_check
  CHECK (status IN ('PENDING', 'CONNECTED', 'REVOKE_PENDING', 'DISCONNECTED', 'ERROR'));

CREATE OR REPLACE FUNCTION enforce_active_device_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  allowed_devices SMALLINT;
  used_devices INTEGER;
BEGIN
  -- The row lock serializes creation attempts for one account.
  SELECT device_limit INTO allowed_devices
    FROM subscriptions
   WHERE user_id = NEW.user_id AND status = 'ACTIVE' AND ends_at >= CURRENT_DATE
   ORDER BY ends_at DESC
   LIMIT 1
   FOR UPDATE;

  IF allowed_devices IS NULL THEN
    RAISE EXCEPTION 'active subscription is required to add a device' USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO used_devices
    FROM user_devices
   WHERE user_id = NEW.user_id AND revoked_at IS NULL;
  IF used_devices >= allowed_devices THEN
    RAISE EXCEPTION 'device limit reached' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_devices_limit_before_insert ON user_devices;
CREATE TRIGGER user_devices_limit_before_insert
  BEFORE INSERT ON user_devices
  FOR EACH ROW EXECUTE FUNCTION enforce_active_device_limit();
