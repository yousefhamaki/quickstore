import crypto from 'crypto';

// AES-256-GCM settings
const ALGORITHM = 'aes-256-gcm';
// ENCRYPTION_KEY must be exactly 32 bytes (256 bits). Uses fallback in development.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
    ? Buffer.from(process.env.ENCRYPTION_KEY, 'base64') 
    : crypto.scryptSync('buildora-fallback-secret-2026', 'salt', 32); 
const IV_LENGTH = 12;

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Structure: iv:authTag:encryptedPayload
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(hash: string): string {
    const parts = hash.split(':');
    if (parts.length !== 3) throw new Error('Invalid encryption hash format.');
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}
