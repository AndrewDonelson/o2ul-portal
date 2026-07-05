-- Keep only one master admin before enforcing uniqueness.
WITH ranked_masters AS (
    SELECT email,
           ROW_NUMBER() OVER (ORDER BY created_at ASC, email ASC) AS rn
    FROM users
    WHERE role = 'master_admin'
)
UPDATE users
SET role = 'admin',
    updated_at = NOW()
WHERE email IN (
    SELECT email FROM ranked_masters WHERE rn > 1
);

-- Enforce singleton master admin role at the database layer.
CREATE UNIQUE INDEX IF NOT EXISTS users_one_master_admin_idx
ON users ((role))
WHERE role = 'master_admin';
