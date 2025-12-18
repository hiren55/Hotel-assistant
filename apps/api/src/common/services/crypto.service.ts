import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Cryptographic service for secure operations
 * - AES-256-GCM encryption for sensitive fields
 * - Secure token generation
 * - Hash comparison utilities
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 12; // 96 bits for GCM
  private readonly tagLength = 16; // 128 bits

  private encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    this.initializeKey();
  }

  /**
   * Initialize encryption key from environment
   */
  private initializeKey(): void {
    const keyBase64 = this.configService.get<string>('DATA_ENCRYPTION_KEY');

    if (keyBase64) {
      this.encryptionKey = Buffer.from(keyBase64, 'base64');
      if (this.encryptionKey.length !== this.keyLength) {
        throw new Error(
          `Invalid encryption key length. Expected ${this.keyLength} bytes, got ${this.encryptionKey.length}`,
        );
      }
      this.logger.log('Encryption key initialized from environment');
    } else {
      // In development, generate a key (not for production!)
      if (process.env.NODE_ENV === 'production') {
        throw new Error('DATA_ENCRYPTION_KEY is required in production');
      }
      this.logger.warn(
        'No DATA_ENCRYPTION_KEY found. Using generated key (NOT for production)',
      );
      this.encryptionKey = crypto.randomBytes(this.keyLength);
    }
  }

  /**
   * Encrypt a string value using AES-256-GCM
   * Returns base64 encoded string: version || iv || ciphertext || tag
   */
  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv, {
        authTagLength: this.tagLength,
      });

      let ciphertext = cipher.update(plaintext, 'utf8');
      ciphertext = Buffer.concat([ciphertext, cipher.final()]);
      const tag = cipher.getAuthTag();

      // Format: version (1 byte) || iv (12 bytes) || ciphertext || tag (16 bytes)
      const version = Buffer.from([0x01]); // Version 1
      const combined = Buffer.concat([version, iv, ciphertext, tag]);

      return combined.toString('base64');
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt a base64 encoded encrypted string
   */
  decrypt(encryptedBase64: string): string {
    try {
      const combined = Buffer.from(encryptedBase64, 'base64');

      // Extract version
      const version = combined[0];
      if (version !== 0x01) {
        throw new Error(`Unsupported encryption version: ${version}`);
      }

      // Extract components
      const iv = combined.subarray(1, 1 + this.ivLength);
      const tag = combined.subarray(combined.length - this.tagLength);
      const ciphertext = combined.subarray(1 + this.ivLength, combined.length - this.tagLength);

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv, {
        authTagLength: this.tagLength,
      });
      decipher.setAuthTag(tag);

      let plaintext = decipher.update(ciphertext);
      plaintext = Buffer.concat([plaintext, decipher.final()]);

      return plaintext.toString('utf8');
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate a cryptographically secure random token
   * @param bytes Number of random bytes (default: 32 = 256 bits)
   * @returns Hex-encoded token string
   */
  generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Generate a URL-safe base64 token
   * @param bytes Number of random bytes (default: 32 = 256 bits)
   * @returns URL-safe base64 encoded token
   */
  generateUrlSafeToken(bytes: number = 32): string {
    return crypto
      .randomBytes(bytes)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Hash a token for storage using SHA-256
   * @param token The token to hash
   * @returns Hex-encoded hash
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param a First string
   * @param b Second string
   * @returns true if equal
   */
  secureCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
      // Still do comparison to prevent timing leakage
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Hash a password using Argon2id (via Supabase) or bcrypt
   * Note: For passwords, prefer using Supabase Auth which uses Argon2
   * This is a fallback for cases where direct hashing is needed
   */
  async hashPassword(password: string): Promise<string> {
    // Using bcrypt as fallback since Argon2 requires native bindings
    const bcrypt = await import('bcrypt');
    const saltRounds = this.configService.get<number>('security.bcryptRounds') || 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against a bcrypt hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a deterministic encryption for searchable fields
   * WARNING: Less secure than random IV - use only when searching is required
   */
  encryptDeterministic(plaintext: string): string {
    // Use HMAC to derive a deterministic IV from the plaintext
    const iv = crypto
      .createHmac('sha256', this.encryptionKey)
      .update(plaintext)
      .digest()
      .subarray(0, this.ivLength);

    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv, {
      authTagLength: this.tagLength,
    });

    let ciphertext = cipher.update(plaintext, 'utf8');
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);
    const tag = cipher.getAuthTag();

    // Format: version (1 byte) || iv (12 bytes) || ciphertext || tag (16 bytes)
    const version = Buffer.from([0x02]); // Version 2 = deterministic
    const combined = Buffer.concat([version, iv, ciphertext, tag]);

    return combined.toString('base64');
  }
}
