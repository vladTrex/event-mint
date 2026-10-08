export type SearchUserParams = {
  userIds?: string[];
  phones?: string[];
  login?: string;
  email?: string;
  take?: number;
  skip?: number;
};

export type CheckExistUserParams = {
  phone: string;
  login: string;
};
