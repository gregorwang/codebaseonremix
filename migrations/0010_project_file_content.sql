PRAGMA defer_foreign_keys = TRUE;

-- 让 project_files 保存被扫描源码文件的完整内容, 用于做题/讲解页内置源码阅读器。
-- 在线 ALTER 不能 NOT NULL, 默认 NULL; 含密文件在扫描阶段已被跳过(不入库),
-- 这里允许 NULL 兼容旧行与未来跳过的行。
ALTER TABLE project_files ADD COLUMN content TEXT;
ALTER TABLE project_files ADD COLUMN line_count INTEGER;
