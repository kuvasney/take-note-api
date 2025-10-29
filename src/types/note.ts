export interface IReminder {
  id: string;
  dataHora: string;
  texto: string;
}

export interface INote {
  id?: string;
  titulo: string;
  conteudo: string;
  dataCriacao?: Date;
  dataUltimaEdicao?: Date;
  archived: boolean;
  cor: string;
  tags: string[];
  pinned: boolean;
  lembretes: IReminder[];
  colaboradores: string[];
}

export type CreateNoteDto = Omit<INote, 'id' | 'dataCriacao' | 'dataUltimaEdicao'>;
export type UpdateNoteDto = Partial<CreateNoteDto> & { id?: string };