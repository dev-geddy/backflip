-- Custom SQL migration file, put your code below! --
-- One more shipped palette: Teal (`L2-UI-55`). A deep blue-green surface with
-- the slate-blue hover row the design source pairs it with — the two hues are
-- deliberately not the same, which is why the accent is stored rather than
-- derived from the surface.
--
-- Ownerless like the rest of the shipped set (`type = 'system'`, `userId`
-- null), so it lands in everyone's system shelf and cannot be renamed or
-- deleted. Appended, not reordered: `listSystemPresets` sorts by `createdAt`,
-- so it takes the end of the shelf.
--
-- Idempotent via the partial unique index on `name WHERE type = 'system'`.
INSERT INTO "chrome_preset" ("id", "type", "userId", "name", "surface", "accent") VALUES
  (gen_random_uuid()::text, 'system', NULL, 'Teal', '#0c2a31', '#333b4a')
ON CONFLICT DO NOTHING;
