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
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    throw new Error('Falha na descriptografia');
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
