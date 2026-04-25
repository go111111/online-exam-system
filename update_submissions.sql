-- Add submission status and rejection reason
SET @dbname = DATABASE();
SET @tablename = "submissions";
SET @columnname = "status";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE 
    (TABLE_NAME = @tablename) AND (TABLE_SCHEMA = @dbname) AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN status ENUM('submitted', 'graded', 'rejected') DEFAULT 'submitted' AFTER cheated")
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Add rejection columns
SET @columnname = "rejection_reason";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE 
    (TABLE_NAME = @tablename) AND (TABLE_SCHEMA = @dbname) AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN rejection_reason TEXT AFTER status")
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @columnname = "rejection_by";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE 
    (TABLE_NAME = @tablename) AND (TABLE_SCHEMA = @dbname) AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN rejection_by INT AFTER rejection_reason")
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @constraintname = "fk_rejection_by";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE
    (TABLE_NAME = @tablename) AND (TABLE_SCHEMA = @dbname) AND (CONSTRAINT_NAME = @constraintname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @constraintname, " FOREIGN KEY (rejection_by) REFERENCES users(id)")
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;
