export interface IReminder {
  id: string;
  dataHora: string;
  texto: string;
}

export interface INote {
  id?: string;
  userId: string;  // Dono da nota
  order: number;   // Ordem de exibição (maior = mais acima)
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

export type CreateNoteDto = Omit<INote, 'id' | 'dataCriacao' | 'dataUltimaEdicao' | 'userId' | 'order'>;
export type UpdateNoteDto = Partial<CreateNoteDto> & { id?: string };