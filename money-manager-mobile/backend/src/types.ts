export type CurrentUser = {
  id: string;
  email: string | null;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  status?: string;
};

export type AppEnv = {
  Variables: {
    user: CurrentUser;
  };
};