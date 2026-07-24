-- Cap-For-Twikoo 数据库表结构
-- 可通过 `psql $DATABASE_URL -f sql/init.sql` 手动执行
-- 或由 Serverless 函数在首次调用时自动执行（幂等）

CREATE TABLE IF NOT EXISTS cap_challenges (
    token TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    expires_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS cap_tokens (
    token_hash TEXT PRIMARY KEY,
    expires_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cap_challenges_expires
    ON cap_challenges(expires_at);

CREATE INDEX IF NOT EXISTS idx_cap_tokens_expires
    ON cap_tokens(expires_at);
