import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const SALT_BYTES = 16;
const KEY_BYTES = 64;

export const hashPassword = async (password: string) => {
    const salt = randomBytes(SALT_BYTES);
    const key = (await scrypt(password, salt, KEY_BYTES)) as Buffer;
    return `${salt.toString("hex")}:${key.toString("hex")}`;
};

export const verifyPassword = async (password: string, passwordHash: string) => {
    const [saltHex, keyHex] = String(passwordHash || "").split(":");
    if (!saltHex || !keyHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const expectedKey = Buffer.from(keyHex, "hex");
    const providedKey = (await scrypt(password, salt, expectedKey.length)) as Buffer;
    if (providedKey.length !== expectedKey.length) return false;
    return timingSafeEqual(providedKey, expectedKey);
};
