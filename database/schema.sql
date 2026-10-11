-- ============================================================
-- GAMIFIED ENVIRONMENTAL EDUCATION PLATFORM — SQLITE SCHEMA
-- ============================================================

-- 1. USERS (student + teacher)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  school TEXT,
  class TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. COURSES
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. ENROLLMENTS
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, course_id)
);

-- 4. ACTIVITIES (student proof uploads)
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  proof_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  points_awarded INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. ACTIVITY_REMARKS (teacher feedback)
CREATE TABLE IF NOT EXISTS activity_remarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  remark TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. QUIZZES (AI-generated)
CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  questions TEXT NOT NULL,   -- JSON string
  created_for INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 7. QUIZ_ATTEMPTS
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  answers TEXT,              -- JSON string
  score INTEGER,
  total_questions INTEGER,
  attempted_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 8. LEARNING_PROGRESS
CREATE TABLE IF NOT EXISTS learning_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  mastered INTEGER DEFAULT 0,        -- 0=false, 1=true
  needs_practice INTEGER DEFAULT 0,  -- 0=false, 1=true
  last_score INTEGER,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, topic)
);

-- 9. REWARDS (points + badges)
CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  badges TEXT DEFAULT '[]',           -- JSON string
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 10. AI_INTERACTIONS
CREATE TABLE IF NOT EXISTS ai_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT,
  question TEXT,
  response TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_activities_student ON activities(student_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_student ON learning_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_student ON ai_interactions(student_id);