-- Migration 005: Map existing Rooms to Default BoardingHouses (1:N)
DO $$ BEGIN
  -- Create a Default Property for each owner that has rooms and doesn't already have a Default Property
  INSERT INTO boarding_houses (name, address, owner_id, description, status, isPublic, created_at, updated_at)
  SELECT 'Default Property', 'Chưa cập nhật địa chỉ', user_id, NULL, 'ACTIVE', TRUE, NOW(), NOW()
  FROM (SELECT DISTINCT user_id FROM rooms) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM boarding_houses bh WHERE bh.owner_id = t.user_id AND bh.name = 'Default Property'
  );

  -- Map each existing room to its owner's Default Property (the latest inserted) if boarding_house_id is NULL
  UPDATE rooms r
  SET boarding_house_id = bh.id
  FROM boarding_houses bh
  WHERE r.user_id = bh.owner_id
    AND r.boarding_house_id IS NULL;
END $$;
