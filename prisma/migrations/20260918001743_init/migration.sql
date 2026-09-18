-- CreateTable
CREATE TABLE "worlds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "author_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "capacity" INTEGER,
    "recommended_capacity" INTEGER,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "heat" INTEGER NOT NULL DEFAULT 0,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "occupants" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "release_status" TEXT,
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "thumbnail_url" TEXT,
    "image_url" TEXT,
    "vrchat_created_at" TIMESTAMP(3),
    "vrchat_updated_at" TIMESTAMP(3),
    "popularity_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pos_x" DOUBLE PRECISION,
    "pos_y" DOUBLE PRECISION,
    "pos_z" DOUBLE PRECISION,
    "cluster_id" INTEGER,
    "cluster_label" TEXT,
    "color_hex" TEXT,
    "last_synced_at" TIMESTAMP(3),

    CONSTRAINT "worlds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" SERIAL NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "worlds_seen" INTEGER NOT NULL DEFAULT 0,
    "worlds_upserted" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vrchat_sync_sessions" (
    "account" TEXT NOT NULL,
    "encrypted_cookie_jar" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3),
    "last_verified_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vrchat_sync_sessions_pkey" PRIMARY KEY ("account")
);

-- CreateIndex
CREATE INDEX "worlds_popularity_score_idx" ON "worlds"("popularity_score");

-- CreateIndex
CREATE INDEX "worlds_cluster_id_idx" ON "worlds"("cluster_id");
