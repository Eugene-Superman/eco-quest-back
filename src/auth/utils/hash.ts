import * as bcrypt from 'bcrypt';

export const hash = async (text: string) => {
  return await bcrypt.hash(text, 10);
};

export const compareHash = async (text: string, hashedText: string) => {
  return await bcrypt.compare(text, hashedText);
};
