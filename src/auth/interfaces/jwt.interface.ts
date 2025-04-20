import { UserType } from 'src/users/enums';

export interface JwtPayload {
  id: string;
  email: string;
  type: UserType;
}
