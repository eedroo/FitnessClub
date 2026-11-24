-- Pedido de Premium feito no app (o admin vê a lista e liberta).
ALTER TABLE "User" ADD COLUMN "premiumRequestedAt" TIMESTAMP(3);
