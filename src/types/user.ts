export interface IUser {
  id?: string;
  nome: string;
  email: string;
  password: string;
  dataCriacao?: Date;
  dataUltimaAtualizacao?: Date;
  ativo: boolean;
  emailVerificado: boolean;
  // Para futuro SSO
  googleId?: string;
  microsoftId?: string;
}

export type CreateUserDto = Omit<IUser, 'id' | 'dataCriacao' | 'dataUltimaAtualizacao' | 'ativo' | 'emailVerificado' | 'googleId' | 'microsoftId'>;
export type UpdateUserDto = Partial<Omit<CreateUserDto, 'email'>>;
export type LoginDto = {
  email: string;
  password: string;
};