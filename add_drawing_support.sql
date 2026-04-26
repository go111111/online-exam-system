-- 添加画图题功能支持的数据库更新脚本
-- 日期: 2026年4月26日

-- 1. 更新 questions 表，添加对 drawing 题目类型的支持
-- MySQL 版本
ALTER TABLE questions MODIFY question_type ENUM('single_choice', 'multiple_choice', 'fill_blank', 'short_answer', 'drawing') NOT NULL;

-- 2. 创建新表存储上传的答案文件信息
CREATE TABLE IF NOT EXISTS answer_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    answer_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    file_type VARCHAR(50),
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE,
    INDEX idx_answer_id (answer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 在 answers 表中添加列支持存储图片路径和绘图数据
ALTER TABLE answers ADD COLUMN answer_image_path VARCHAR(500) NULL COMMENT '答案图片路径（用于绘图题或上传的图片）';
ALTER TABLE answers ADD COLUMN answer_image_base64 LONGTEXT NULL COMMENT 'Base64格式的图片数据（用于绘图题）';
ALTER TABLE answers ADD COLUMN submission_type ENUM('text', 'file', 'canvas') DEFAULT 'text' COMMENT '提交类型：text(文本), file(文件上传), canvas(canvas绘图)';

-- 4. 创建用于存储绘图数据的表
CREATE TABLE IF NOT EXISTS drawing_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    answer_id INT NOT NULL,
    canvas_json LONGTEXT NOT NULL COMMENT '绘图canvas的JSON数据',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_answer_drawing (answer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SQLite 版本的更新（可选，如果使用 SQLite）
-- 注意：SQLite 不支持 ALTER TABLE MODIFY，需要重建表
-- 这里只提供 CREATE TABLE 语句

-- 对于 SQLite，添加列到现有表
-- ALTER TABLE answers ADD COLUMN answer_image_path VARCHAR(500) NULL;
-- ALTER TABLE answers ADD COLUMN answer_image_base64 LONGTEXT NULL;
-- ALTER TABLE answers ADD COLUMN submission_type TEXT DEFAULT 'text';

-- 5. 验证更新
-- 查看 questions 表结构
SHOW COLUMNS FROM questions;

-- 查看 answers 表结构
SHOW COLUMNS FROM answers;

-- 查看新建表
SHOW TABLES LIKE 'answer%';
