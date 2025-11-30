import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('PUBLIC_SUPABASE_ANON_KEY', 'test-key');

// A more robust and chainable mock for the Supabase client
const supabaseMock = {
  from: vi.fn(() => supabaseMock),
  select: vi.fn(() => supabaseMock),
  insert: vi.fn(() => supabaseMock),
  update: vi.fn(() => supabaseMock),
  delete: vi.fn(() => supabaseMock),
  eq: vi.fn(() => supabaseMock),
  order: vi.fn(() => supabaseMock),
  limit: vi.fn(() => supabaseMock),
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    ...supabaseMock,
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signIn: vi.fn(() => Promise.resolve({ data: null, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null }))
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: null, error: null })),
        download: vi.fn(() => Promise.resolve({ data: null, error: null })),
        remove: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }
  }))
})); 