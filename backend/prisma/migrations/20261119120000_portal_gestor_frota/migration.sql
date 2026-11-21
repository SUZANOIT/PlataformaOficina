-- Portal do Gestor de Frota: vínculo do usuário ao cliente PJ e cadastro de motoristas
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
CREATE INDEX IF NOT EXISTS "User_clientId_idx" ON "User"("clientId");
DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "fleet_drivers" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "vehicleId" TEXT,
  "nome" TEXT NOT NULL,
  "cpf" TEXT NOT NULL,
  "cnh" TEXT,
  "categoriaCnh" TEXT,
  "validadeCnh" TIMESTAMP(3),
  "telefone" TEXT,
  "email" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ATIVO',
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fleet_drivers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "fleet_drivers_clientId_cpf_key" ON "fleet_drivers"("clientId", "cpf");
CREATE INDEX IF NOT EXISTS "fleet_drivers_companyId_idx" ON "fleet_drivers"("companyId");
CREATE INDEX IF NOT EXISTS "fleet_drivers_clientId_idx" ON "fleet_drivers"("clientId");
CREATE INDEX IF NOT EXISTS "fleet_drivers_vehicleId_idx" ON "fleet_drivers"("vehicleId");
DO $$ BEGIN
  ALTER TABLE "fleet_drivers" ADD CONSTRAINT "fleet_drivers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "fleet_drivers" ADD CONSTRAINT "fleet_drivers_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "fleet_drivers" ADD CONSTRAINT "fleet_drivers_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Isolamento no banco: usuário do portal pertence à mesma oficina do cliente e não possui perfis administrativos
CREATE OR REPLACE FUNCTION portal_gestor_user_check() RETURNS trigger AS $$
DECLARE client_company TEXT;
BEGIN
  IF NEW."clientId" IS NOT NULL THEN
    SELECT "companyId" INTO client_company FROM "Client" WHERE "id" = NEW."clientId";
    IF client_company IS NULL OR NEW."companyId" IS DISTINCT FROM client_company THEN
      RAISE EXCEPTION 'Usuário do portal deve pertencer à mesma oficina do cliente';
    END IF;
    IF NEW."roleAdmin" OR NEW."roleOrcamentista" OR NEW."roleContasPagar" OR NEW."roleContasReceber"
       OR NEW."roleContabilidade" OR NEW."roleRh" OR NEW."roleColaborador" THEN
      RAISE EXCEPTION 'Usuário do portal não pode possuir perfis administrativos';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_portal_gestor_user_check ON "User";
CREATE TRIGGER trg_portal_gestor_user_check BEFORE INSERT OR UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION portal_gestor_user_check();

-- Motorista: cliente pertence à oficina e o veículo vinculado pertence ao mesmo cliente
CREATE OR REPLACE FUNCTION fleet_driver_check() RETURNS trigger AS $$
DECLARE client_company TEXT; vehicle_client TEXT;
BEGIN
  SELECT "companyId" INTO client_company FROM "Client" WHERE "id" = NEW."clientId";
  IF client_company IS NULL OR client_company <> NEW."companyId" THEN
    RAISE EXCEPTION 'Motorista deve pertencer à mesma oficina do cliente';
  END IF;
  IF NEW."vehicleId" IS NOT NULL THEN
    SELECT "clienteId" INTO vehicle_client FROM "Vehicle" WHERE "id" = NEW."vehicleId";
    IF vehicle_client IS DISTINCT FROM NEW."clientId" THEN
      RAISE EXCEPTION 'Veículo do motorista deve pertencer ao mesmo cliente';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fleet_driver_check ON "fleet_drivers";
CREATE TRIGGER trg_fleet_driver_check BEFORE INSERT OR UPDATE ON "fleet_drivers"
  FOR EACH ROW EXECUTE FUNCTION fleet_driver_check();
