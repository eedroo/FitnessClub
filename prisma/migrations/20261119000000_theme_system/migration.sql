-- O tema passa a seguir o sistema por defeito (como as apps nativas do iOS).
ALTER TABLE "User" ALTER COLUMN "theme" SET DEFAULT 'SYSTEM';
-- Contas já criadas ficaram em LIGHT só por ser o valor por defeito: passam a seguir o sistema.
UPDATE "User" SET "theme" = 'SYSTEM' WHERE "theme" = 'LIGHT';
