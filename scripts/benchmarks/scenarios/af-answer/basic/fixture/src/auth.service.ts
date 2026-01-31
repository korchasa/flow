import bcrypt from "bcrypt";

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  async validateLogin(email: string, pass: string): Promise<boolean> {
    // TODO: implement
    return true;
  }
}
