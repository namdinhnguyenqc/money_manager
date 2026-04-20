export type CurrentUser = {
  id: string;
  email: string | null;
};

export type AppEnv = {
  Variables: {
    user: CurrentUser;
  };
};
