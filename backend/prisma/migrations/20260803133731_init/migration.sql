-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('trekker', 'officer', 'admin');

-- CreateEnum
CREATE TYPE "route_difficulty" AS ENUM ('easy', 'moderate', 'difficult');

-- CreateEnum
CREATE TYPE "application_type" AS ENUM ('individual', 'group');

-- CreateEnum
CREATE TYPE "group_type" AS ENUM ('private', 'commercial');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'permit_issued');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "participant_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CORRECTION_REQUESTED', 'EXCLUDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('aadhaar', 'fitness_certificate', 'photograph', 'guardian_consent', 'other');

-- CreateEnum
CREATE TYPE "permit_status" AS ENUM ('active', 'revoked');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "mobile" VARCHAR(15) NOT NULL,
    "full_name" VARCHAR(200),
    "email" VARCHAR(200),
    "address" TEXT,
    "role" "user_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL,
    "mobile" VARCHAR(15) NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed_at" TIMESTAMPTZ,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trek_routes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "region" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "difficulty" "route_difficulty",
    "is_open" BOOLEAN NOT NULL DEFAULT false,
    "required_documents" JSONB NOT NULL DEFAULT '[]',
    "capacity_per_day" INTEGER,
    "min_lead_time_days" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "trek_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(30) NOT NULL,
    "type" "application_type" NOT NULL,
    "group_type" "group_type",
    "applicant_user_id" UUID NOT NULL,
    "trek_route_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "application_status" NOT NULL DEFAULT 'draft',
    "rejection_reason" TEXT,
    "operator_registration_no" VARCHAR(100),
    "operator_name" VARCHAR(200),
    "operator_reg_valid_until" DATE,
    "submitted_at" TIMESTAMPTZ,
    "decided_at" TIMESTAMPTZ,
    "decided_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "is_leader" BOOLEAN NOT NULL DEFAULT false,
    "full_name" VARCHAR(200) NOT NULL,
    "date_of_birth" DATE,
    "gender" "gender",
    "address" TEXT,
    "mobile" VARCHAR(15),
    "identity_number" VARCHAR(20) NOT NULL,
    "identity_last4" VARCHAR(4) NOT NULL,
    "emergency_contact_name" VARCHAR(200),
    "emergency_contact_mobile" VARCHAR(15),
    "medical_declaration" BOOLEAN NOT NULL DEFAULT false,
    "is_guide" BOOLEAN NOT NULL DEFAULT false,
    "guide_registration_no" VARCHAR(100),
    "status" "participant_status" NOT NULL DEFAULT 'PENDING',
    "officer_remark" TEXT,
    "resubmitted" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_at" TIMESTAMPTZ,
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "document_type" "document_type" NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "original_filename" VARCHAR(300) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permits" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(30) NOT NULL,
    "application_id" UUID NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "signed_payload" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "qr_payload" TEXT NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE NOT NULL,
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_by" UUID NOT NULL,
    "status" "permit_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revocations" (
    "id" UUID NOT NULL,
    "permit_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "revoked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_by" UUID NOT NULL,

    CONSTRAINT "revocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");

-- CreateIndex
CREATE INDEX "otp_codes_mobile_idx" ON "otp_codes"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "applications_reference_key" ON "applications"("reference");

-- CreateIndex
CREATE INDEX "applications_applicant_user_id_idx" ON "applications"("applicant_user_id");

-- CreateIndex
CREATE INDEX "applications_trek_route_id_idx" ON "applications"("trek_route_id");

-- CreateIndex
CREATE INDEX "applications_decided_by_idx" ON "applications"("decided_by");

-- CreateIndex
CREATE INDEX "participants_application_id_idx" ON "participants"("application_id");

-- CreateIndex
CREATE INDEX "participants_reviewed_by_idx" ON "participants"("reviewed_by");

-- CreateIndex
CREATE INDEX "participants_identity_number_idx" ON "participants"("identity_number");

-- CreateIndex
CREATE INDEX "documents_participant_id_idx" ON "documents"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "permits_reference_key" ON "permits"("reference");

-- CreateIndex
CREATE INDEX "permits_application_id_idx" ON "permits"("application_id");

-- CreateIndex
CREATE INDEX "permits_issued_by_idx" ON "permits"("issued_by");

-- CreateIndex
CREATE UNIQUE INDEX "revocations_permit_id_key" ON "revocations"("permit_id");

-- CreateIndex
CREATE INDEX "audit_log_actor_user_id_idx" ON "audit_log"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicant_user_id_fkey" FOREIGN KEY ("applicant_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_trek_route_id_fkey" FOREIGN KEY ("trek_route_id") REFERENCES "trek_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revocations" ADD CONSTRAINT "revocations_permit_id_fkey" FOREIGN KEY ("permit_id") REFERENCES "permits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revocations" ADD CONSTRAINT "revocations_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
