/**
 * Global type declarations for Web Crypto API
 *
 * This file provides TypeScript type definitions for the Web Crypto API
 * that is available in browsers and secure contexts (HTTPS/localhost).
 */

interface CryptoKey {
  readonly type: "secret" | "private" | "public";
  readonly extractable: boolean;
  readonly algorithm: KeyAlgorithm;
  readonly usages: KeyUsage[];
}

interface KeyAlgorithm {
  name: string;
}

type KeyUsage =
  | "encrypt"
  | "decrypt"
  | "sign"
  | "verify"
  | "deriveKey"
  | "deriveBits"
  | "wrapKey"
  | "unwrapKey";

interface SubtleCrypto {
  importKey(
    format: "raw" | "pkcs8" | "spki" | "jwk",
    keyData: BufferSource | JsonWebKey,
    algorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ): Promise<CryptoKey>;

  deriveKey(
    algorithm: DeriveKeyAlgorithm,
    baseKey: CryptoKey,
    derivedKeyType: AlgorithmIdentifier | AesDerivedKeyAlgorithm | HmacImportParams | KeyAlgorithm,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ): Promise<CryptoKey>;

  encrypt(
    algorithm: AlgorithmIdentifier | AesGcmParams,
    key: CryptoKey,
    data: BufferSource
  ): Promise<ArrayBuffer>;

  decrypt(
    algorithm: AlgorithmIdentifier | AesGcmParams,
    key: CryptoKey,
    data: BufferSource
  ): Promise<ArrayBuffer>;

  sign(
    algorithm: AlgorithmIdentifier | string,
    key: CryptoKey,
    data: BufferSource
  ): Promise<ArrayBuffer>;
}

interface Crypto {
  readonly subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}

interface AlgorithmIdentifier {
  name: string;
}

interface AesGcmParams extends AlgorithmIdentifier {
  name: "AES-GCM";
  iv: BufferSource;
  additionalData?: BufferSource;
  tagLength?: number;
}

interface AesKeyAlgorithm extends KeyAlgorithm {
  name: "AES-GCM";
  length: number;
}

interface AesDerivedKeyAlgorithm extends KeyAlgorithm {
  name: "AES-GCM";
  length: number;
}

interface DeriveKeyAlgorithm extends AlgorithmIdentifier {
  name: "PBKDF2";
  salt: BufferSource;
  iterations: number;
  hash: AlgorithmIdentifier;
}

interface HmacImportParams extends AlgorithmIdentifier {
  name: "HMAC";
  hash: AlgorithmIdentifier | string;
  length?: number;
}

interface RsaHashedImportParams extends AlgorithmIdentifier {
  name: "RSASSA-PKCS1-v1_5" | "RSA-PSS";
  hash: AlgorithmIdentifier;
}

interface EcKeyImportParams extends AlgorithmIdentifier {
  name: "ECDSA";
  namedCurve: string;
}

// Additional global declarations
declare const crypto: Crypto;
declare const window: {
  crypto: Crypto;
};

declare class TextEncoder {
  encode(input?: string): Uint8Array;
}

declare class TextDecoder {
  decode(input?: BufferSource, options?: { stream?: boolean }): string;
}

declare function btoa(data: string): string;
declare function atob(data: string): string;

declare class URLSearchParams {
  constructor(init?: Record<string, string> | string);
  append(name: string, value: string): void;
  toString(): string;
}

