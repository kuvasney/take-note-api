import nodemailer from 'nodemailer';
import { IUser } from '../types/user.js';

// Configuração do transportador de email
const createTransporter = () => {
  // Em produção, use um serviço real como SendGrid, AWS SES, etc.
  // Para desenvolvimento, use Ethereal Email (emails de teste)
  console.log('Creating email transporter...');
  console.log("node env", process.env.NODE_ENV);
  console.log("smtp user", process.env.SMTP_USER);
  console.log("smtp pass", process.env.SMTP_PASS);


  
  if (process.env.NODE_ENV === 'production') {
    // Configuração para Gmail
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });    
  } else {    
    // Os emails podem ser visualizados em https://ethereal.email
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
        pass: process.env.SMTP_PASS || 'ethereal-password'
      }
    });
  }
};

export interface SendPasswordResetEmailOptions {
  user: IUser;
  resetToken: string;
  resetUrl: string;
}

/**
 * Envia email de recuperação de senha
 */
export const sendPasswordResetEmail = async (options: SendPasswordResetEmailOptions): Promise<void> => {
  const { user, resetUrl } = options;
  
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Take Note" <noreply@takenote.com>',
    to: user.email,
    subject: 'Recuperação de Senha - Take Note',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background: #4CAF50; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .warning { color: #ff5722; font-size: 14px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Recuperação de Senha</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${user.username}</strong>!</p>
              
              <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Take Note</strong>.</p>
              
              <p>Para criar uma nova senha, clique no botão abaixo:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Redefinir Senha</a>
              </div>
              
              <p>Ou copie e cole este link no seu navegador:</p>
              <p style="background: #fff; padding: 10px; border: 1px solid #ddd; word-break: break-all;">
                ${resetUrl}
              </p>
              
              <p class="warning">
                ⚠️ <strong>Importante:</strong> Este link é válido por apenas <strong>1 hora</strong> e pode ser usado apenas uma vez.
              </p>
              
              <p>Se você não solicitou a recuperação de senha, pode ignorar este email com segurança. Sua senha permanecerá inalterada.</p>
              
              <div class="footer">
                <p>Este é um email automático, por favor não responda.</p>
                <p>&copy; ${new Date().getFullYear()} Take Note. Todos os direitos reservados.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Recuperação de Senha - Take Note
      
      Olá, ${user.username}!
      
      Recebemos uma solicitação para redefinir a senha da sua conta no Take Note.
      
      Para criar uma nova senha, acesse o link abaixo:
      ${resetUrl}
      
      IMPORTANTE: Este link é válido por apenas 1 hora e pode ser usado apenas uma vez.
      
      Se você não solicitou a recuperação de senha, pode ignorar este email com segurança.
      
      ---
      Este é um email automático, por favor não responda.
      © ${new Date().getFullYear()} Take Note. Todos os direitos reservados.
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    
    // Log para desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email de recuperação enviado!');
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw new Error('Falha ao enviar email de recuperação');
  }
};

/**
 * Envia email de confirmação após senha alterada
 */
export const sendPasswordChangedEmail = async (user: IUser): Promise<void> => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Take Note" <noreply@rafael.abc.br>',
    to: user.email,
    subject: 'Senha Alterada - Take Note',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .success { color: #4CAF50; font-size: 18px; font-weight: bold; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Senha Alterada com Sucesso</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${user.username}</strong>!</p>
              
              <p class="success">Sua senha foi alterada com sucesso!</p>
              
              <p>A senha da sua conta no <strong>Take Note</strong> foi redefinida em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.</p>
              
              <div class="warning">
                <strong>⚠️ Não foi você?</strong><br>
                Se você não realizou esta alteração, sua conta pode estar comprometida. 
                Entre em contato conosco imediatamente através do suporte.
              </div>
              
              <p>Por segurança, recomendamos:</p>
              <ul>
                <li>Usar uma senha forte e única</li>
                <li>Não compartilhar sua senha com ninguém</li>
                <li>Ativar autenticação de dois fatores (em breve)</li>
              </ul>
              
              <div class="footer">
                <p>Este é um email automático, por favor não responda.</p>
                <p>&copy; ${new Date().getFullYear()} Take Note. Todos os direitos reservados.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Senha Alterada com Sucesso - Take Note
      
      Olá, ${user.username}!
      
      Sua senha foi alterada com sucesso!
      
      A senha da sua conta no Take Note foi redefinida em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.
      
      NÃO FOI VOCÊ?
      Se você não realizou esta alteração, sua conta pode estar comprometida. 
      Entre em contato conosco imediatamente através do suporte.
      
      ---
      Este é um email automático, por favor não responda.
      © ${new Date().getFullYear()} Take Note. Todos os direitos reservados.
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email de confirmação enviado!');
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email de confirmação:', error);
    // Não lança erro aqui pois a senha já foi alterada
  }
};

export interface SendCollaboratorAddedEmailOptions {
  collaboratorEmail: string;
  ownerName: string;
  noteTitle: string;
  noteId: string;
}

/**
 * Envia email notificando que uma nota foi compartilhada
 */
export const sendCollaboratorAddedEmail = async (options: SendCollaboratorAddedEmailOptions): Promise<void> => {
  const { collaboratorEmail, ownerName, noteTitle, noteId } = options;
  
  const transporter = createTransporter();
  const appUrl = 'https://takenote.rafael.abc.br';
  const noteUrl = `${appUrl}/notes/${noteId}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Take Note" <noreply@takenote.com>',
    to: collaboratorEmail,
    subject: `Take Note: ${ownerName} compartilhou uma nota com você!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #673AB7; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .note-preview { 
              background: #fff; 
              border-left: 4px solid #673AB7; 
              padding: 15px; 
              margin: 20px 0;
              border-radius: 3px;
            }
            .note-title { 
              font-size: 18px; 
              font-weight: bold; 
              color: #673AB7; 
              margin-bottom: 10px;
            }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background: #673AB7; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .info-box {
              background: #e8eaf6;
              border: 1px solid #673AB7;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📝 Nova Nota Compartilhada</h1>
            </div>
            <div class="content">
              <p>Olá!</p>
              
              <p><strong>${ownerName}</strong> compartilhou uma nota com você no <strong>Take Note</strong>!</p>
              
              <div class="note-preview">
                <div class="note-title">📄 ${noteTitle}</div>
                <p style="color: #666; font-size: 14px;">Você agora tem acesso para visualizar e editar esta nota.</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${noteUrl}" class="button">Visualizar Nota</a>
              </div>
              
              <div class="info-box">
                <strong>💡 O que você pode fazer:</strong>
                <ul style="margin: 10px 0;">
                  <li>Visualizar o conteúdo completo da nota</li>
                  <li>Editar e adicionar informações</li>
                  <li>Adicionar tags e lembretes</li>
                  <li>Colaborar em tempo real</li>
                </ul>
              </div>
              
              <p>Acesse a nota através do link acima ou visite <a href="${appUrl}" style="color: #673AB7;">${appUrl.replace('https://', '')}</a></p>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                💡 <strong>Dica:</strong> Faça login com sua conta para acessar todas as notas compartilhadas com você!
              </p>
              
              <div class="footer">
                <p>Este é um email automático, por favor não responda.</p>
                <p>&copy; ${new Date().getFullYear()} Take Note. Todos os direitos reservados.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Nova Nota Compartilhada - Take Note
      
      Olá!
      
      ${ownerName} compartilhou uma nota com você no Take Note!
      
      📄 Nota: ${noteTitle}
      
      Você agora tem acesso para visualizar e editar esta nota.
      
      O que você pode fazer:
      - Visualizar o conteúdo completo da nota
      - Editar e adicionar informações
      - Adicionar tags e lembretes
      - Colaborar em tempo real
      
      Acesse a nota: ${noteUrl}
      
      Ou visite: ${appUrl.replace('https://', '')}
      
      ---
      Este é um email automático, por favor não responda.
      © ${new Date().getFullYear()} Take Note. Todos os direitos reservados.
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    
    // Log para desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email de colaboração enviado!');
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email de colaboração:', error);
    // Não lança erro para não interromper o fluxo de adicionar colaborador
  }
};
