-- Tabellen für die Server-Synchronisierung der Gin-Produktion-App.
-- In phpMyAdmin unter "Importieren" in die Datenbank aus server/config.php
-- einspielen (einmalig).

CREATE TABLE IF NOT EXISTS recipes (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  data LONGTEXT NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  INDEX idx_recipes_updated_at (updated_at),
  INDEX idx_recipes_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS batches (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  data LONGTEXT NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  INDEX idx_batches_updated_at (updated_at),
  INDEX idx_batches_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS photos (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  batch_id VARCHAR(64) NOT NULL,
  step_key VARCHAR(64) NULL,
  item_id VARCHAR(64) NULL,
  width INT NULL,
  height INT NULL,
  created_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  INDEX idx_photos_created_at (created_at),
  INDEX idx_photos_deleted_at (deleted_at),
  INDEX idx_photos_batch_id (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
