import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

/**
 * Cria um hash SHA256 do refresh token para armazenamento seguro
 * NUNCA armazene refresh tokens em texto puro no banco de dados
 * 
 * @param refreshToken - O refresh token JWT em texto puro
 * @returns Hash SHA256 do token
 */
export function hashRefreshToken(refreshToken: string): string {
  // Usando SHA256 para hash do refresh token
  // Alternativa: pode-se adicionar um pepper (secret adicional) aqui
  return crypto.createHash('sha256').update(refreshToken).digest('hex');
}

/**
 * Verifica se um refresh token corresponde ao hash armazenado
 * 
 * @param refreshToken - O refresh token recebido do cliente
 * @param storedHash - O hash armazenado no banco de dados
 * @returns true se o token corresponde ao hash
 */
export function verifyRefreshTokenHash(refreshToken: string, storedHash: string): boolean {
  const tokenHash = hashRefreshToken(refreshToken);
  return tokenHash === storedHash;
}
