/**
 * Simple Mock Supabase Client for Offline Testing
 * Works without internet, Docker, or Supabase server
 */

export class MockSupabaseClient {
  private session: any = null;
  private mockData: any = {};

  constructor() {
    this.loadSession();
    this.initMockData();
  }

  private generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  private initMockData() {
    this.mockData = {
      profiles: [],
      deals: [],
      deal_rooms: [],
      messages: [],
    };
  }

  private saveSession() {
    if (this.session && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem('mock_session', JSON.stringify(this.session));
      } catch {
        // localStorage may be unavailable in test or server environments
      }
    }
  }

  private loadSession() {
    if (typeof localStorage === "undefined") {
      this.session = null;
      return;
    }

    try {
      const stored = localStorage.getItem('mock_session');
      this.session = stored ? JSON.parse(stored) : null;
    } catch {
      this.session = null;
    }
  }

  auth = {
    signUp: async (options: any) => {
      console.log('[MOCK AUTH] signUp:', options.email);
      try {
        const userId = this.generateId();
        const user = {
          id: userId,
          email: options.email,
          user_metadata: options.options?.data || {},
        };

        const session = {
          user,
          access_token: `mock_${userId}`,
        };

        this.session = session;
        this.saveSession();

        // Create profile
        this.mockData.profiles.push({
          id: userId,
          email: options.email,
          full_name: options.options?.data?.full_name || '',
          role: options.options?.data?.role || 'business',
          created_at: new Date().toISOString(),
        });

        return { data: { user, session }, error: null };
      } catch (e) {
        console.error('[MOCK AUTH] signUp error:', e);
        return { data: null, error: { message: String(e) } };
      }
    },

    signInWithPassword: async (options: any) => {
      console.log('[MOCK AUTH] signInWithPassword:', options.email);
      try {
        const profile = this.mockData.profiles.find((p: any) => p.email === options.email);
        
        if (!profile) {
          return { 
            data: null, 
            error: { message: 'Invalid email or password' } 
          };
        }

        const user = {
          id: profile.id,
          email: options.email,
          user_metadata: {},
        };

        const session = {
          user,
          access_token: `mock_${profile.id}`,
        };

        this.session = session;
        this.saveSession();

        return { data: { user, session }, error: null };
      } catch (e) {
        console.error('[MOCK AUTH] signInWithPassword error:', e);
        return { data: null, error: { message: String(e) } };
      }
    },

    signInWithOtp: async (options: any) => {
      console.log('[MOCK AUTH] signInWithOtp:', options.phone || options.email);
      return { error: null };
    },

    verifyOtp: async (options: any) => {
      console.log('[MOCK AUTH] verifyOtp');
      if (options.token.length === 6) {
        // If a session already exists (from signUp or signIn), reuse that user id
        const existingUser = this.session?.user;
        const user = existingUser
          ? { id: existingUser.id, email: existingUser.email || options.email || `${options.phone}@mock.com` }
          : { id: this.generateId(), email: options.email || `${options.phone}@mock.com` };
        const session = { user, access_token: `mock_${user.id}` };
        this.session = session;
        this.saveSession();
        return { data: { user, session }, error: null };
      }
      return { data: null, error: { message: 'Invalid OTP' } };
    },

    signOut: async () => {
      console.log('[MOCK AUTH] signOut');
      this.session = null;
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.removeItem('mock_session');
        } catch {
          // Ignore missing storage in test/server environments
        }
      }
      return { error: null };
    },

    getSession: async () => {
      return { data: { session: this.session }, error: null };
    },

    getUser: async () => {
      return { data: { user: this.session?.user || null }, error: null };
    },

    onAuthStateChange: (callback: any) => {
      if (this.session) {
        callback('SIGNED_IN', this.session);
      }
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  };

  private createQueryBuilder(table: string, selectedColumns: string | string[] = "*", options: any = {}) {
    const self = this;
    const filters: Array<(row: any) => boolean> = [];
    const orderRules: Array<{ column: string; ascending: boolean }> = [];
    let limitCount: number | null = null;
    let fetchSingle = false;
    const headMode = Boolean(options?.head);

    const parseOr = (clause: string) => {
      const conditions = clause.split(",");
      const predicates = conditions.map((condition) => {
        const [field, op, rawValue] = condition.split(".");
        const value = rawValue;
        return (row: any) => {
          switch (op) {
            case "eq":
              return row[field] === value;
            case "neq":
              return row[field] !== value;
            case "gt":
              return row[field] > value;
            case "gte":
              return row[field] >= value;
            case "lt":
              return row[field] < value;
            case "lte":
              return row[field] <= value;
            default:
              return false;
          }
        };
      });
      filters.push((row) => predicates.some((fn) => fn(row)));
    };

    const execute = () => {
      let rows = Array.isArray(self.mockData[table]) ? [...self.mockData[table]] : [];

      rows = rows.filter((row) => filters.every((predicate) => predicate(row)));

      orderRules.forEach((orderRule) => {
        rows.sort((a: any, b: any) => {
          const aValue = a[orderRule.column];
          const bValue = b[orderRule.column];
          if (aValue === bValue) return 0;
          const direction = orderRule.ascending ? 1 : -1;
          return aValue > bValue ? direction : -direction;
        });
      });

      if (limitCount !== null) {
        rows = rows.slice(0, limitCount);
      }

      const projectColumns = (row: any) => {
        if (selectedColumns === "*" || typeof selectedColumns !== "string") {
          return row;
        }

        const normalized = selectedColumns.trim();
        if (normalized === "*" || normalized.includes("(") || normalized.includes(":") || normalized.includes("->")) {
          return row;
        }

        const columns = normalized.split(",").map((col) => col.trim());
        const projected: any = {};
        columns.forEach((column) => {
          if (column in row) {
            projected[column] = row[column];
          }
        });
        return projected;
      };

      if (fetchSingle) {
        const output = rows.length > 0 ? projectColumns(rows[0]) : null;
        return { data: output, error: null };
      }

      if (headMode) {
        return { data: null, count: rows.length, error: null };
      }

      return { data: rows.map(projectColumns), error: null };
    };

    const query: any = {
      eq: (col: string, val: any) => {
        filters.push((row) => row[col] === val);
        return query;
      },
      gte: (col: string, val: any) => {
        filters.push((row) => row[col] >= val);
        return query;
      },
      lte: (col: string, val: any) => {
        filters.push((row) => row[col] <= val);
        return query;
      },
      in: (col: string, values: any[]) => {
        filters.push((row) => values.includes(row[col]));
        return query;
      },
      order: (column: string, opts: { ascending: boolean } = { ascending: true }) => {
        orderRules.push({ column, ascending: opts.ascending });
        return query;
      },
      limit: (count: number) => {
        limitCount = count;
        return query;
      },
      or: (clause: string) => {
        parseOr(clause);
        return query;
      },
      single: async () => {
        fetchSingle = true;
        return execute();
      },
      maybeSingle: async () => {
        fetchSingle = true;
        return execute();
      },
      then: async () => execute(),
    };

    return query;
  }

  from = (table: string) => {
    const self = this;

    return {
      select: (columns: string | string[] = "*", options: any = {}) => {
        return self.createQueryBuilder(table, columns, options);
      },
      insert: (data: any) => ({
        select: () => ({
          then: async () => {
            const items = Array.isArray(data) ? data : [data];
            items.forEach((item: any) => {
              if (!item.id) item.id = self.generateId();
              if (!item.created_at) item.created_at = new Date().toISOString();
              self.mockData[table] = self.mockData[table] || [];
              self.mockData[table].push(item);
            });
            return { data: items, error: null };
          },
        }),
        then: async () => {
          const items = Array.isArray(data) ? data : [data];
          items.forEach((item: any) => {
            if (!item.id) item.id = self.generateId();
            if (!item.created_at) item.created_at = new Date().toISOString();
            self.mockData[table] = self.mockData[table] || [];
            self.mockData[table].push(item);
          });
          return { data: Array.isArray(data) ? items : items[0], error: null };
        },
      }),
      upsert: (data: any) => ({
        then: async () => {
          const items = Array.isArray(data) ? data : [data];
          items.forEach((item: any) => {
            if (!item.id) item.id = self.generateId();
            self.mockData[table] = self.mockData[table] || [];
            const idx = self.mockData[table].findIndex((r: any) => r.id === item.id);
            if (idx >= 0) {
              self.mockData[table][idx] = { ...self.mockData[table][idx], ...item };
            } else {
              self.mockData[table].push(item);
            }
          });
          return { data: items, error: null };
        },
      }),
      update: (data: any) => ({
        eq: (col: string, val: any) => ({
          then: async () => {
            const rows = self.mockData[table] || [];
            const row = rows.find((r: any) => r[col] === val);
            if (row) Object.assign(row, data);
            return { data: row, error: null };
          },
        }),
      }),
      delete: () => ({
        eq: (col: string, val: any) => ({
          then: async () => {
            self.mockData[table] = (self.mockData[table] || []).filter(
              (r: any) => r[col] !== val
            );
            return { data: null, error: null };
          },
        }),
      }),
    };
  };

  functions = {
    invoke: async (_name: string, _payload?: unknown) => {
      console.debug("[MOCK FUNCTIONS] invoke", _name, _payload);
      return { data: null, error: null };
    },
  };

  rpc = async () => ({ data: null, error: null });

  channel = (name?: string) => {
    const subscription = {
      name,
      on: (_event: string, _options: any, _callback: any) => ({
        subscribe: () => subscription,
      }),
      subscribe: () => subscription,
      unsubscribe: () => {},
    };
    return subscription;
  };

  removeChannel = (channel: any) => {
    if (channel && typeof channel.unsubscribe === "function") {
      channel.unsubscribe();
    }
  };
}

export const mockSupabase = new MockSupabaseClient();
