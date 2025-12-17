export type VerificationParams = {
  login: string;
  password: string;
};

export type GetUsersByFilterParams = {
  userIds?: string[];
  phones?: string[];
  login?: string;
};

export type GetUsersResponse = {
  items: Account[];
  total: number;
};

export type Account = {
  userId: string;
  login: string;
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};
