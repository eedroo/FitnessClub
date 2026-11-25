-- O admin repõe as tentativas de programa com IA de uma pessoa.
ALTER TABLE "User" ADD COLUMN "aiQuotaResetAt" TIMESTAMP(3);
