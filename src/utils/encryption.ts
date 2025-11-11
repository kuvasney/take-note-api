import CryptoJS from 'crypto-js';

// Chave de criptografia - DEVE estar no .env em produção
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-must-be-32-chars-minimum';

/**
 * Criptografa um texto usando AES-256
 * @param text Texto a ser criptografado
 * @returns Texto criptografado em base64
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Erro ao criptografar:', error);
    throw new Error('Falha na criptografia');
  }
}

/**
 * Descriptografa um texto usando AES-256
 * @param encryptedText Texto criptografado em base64
 * @returns Texto original
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  // Se não parece estar criptografado, retorna como está
  if (!isEncrypted(encryptedText)) {
    return encryptedText;
  }
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    
    // Tentar converter para string - AQUI pode dar erro se chave errada
    let text = '';
    try {
      text = decrypted.toString(CryptoJS.enc.Utf8);
    } catch (toStringError) {
      console.error('Erro ao converter bytes descriptografados para UTF-8:', toStringError);
      console.error('Possível causa: ENCRYPTION_KEY incorreta ou dados corrompidos');
      return encryptedText; // Retorna o texto criptografado original
    }
    
    // Se retornou string vazia, pode ser chave errada ou texto corrompido
    if (!text) {
      console.error('Descriptografia resultou em string vazia - chave incorreta ou dados corrompidos');
      return encryptedText; // Retorna o original ao invés de string vazia
    }
    
    return text;
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    return encryptedText; // Retorna o original ao invés de lançar erro
  }
}

/**
 * Verifica se um texto está criptografado
 * @param text Texto a verificar
 * @returns true se parece estar criptografado
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  
  // Textos criptografados com AES do crypto-js têm um padrão específico
  // Geralmente começam com "U2FsdGVkX1" (Base64 de "Salted__")
  return text.startsWith('U2FsdGVk');
}
