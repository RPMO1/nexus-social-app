import CryptoJS from "crypto-js";


export const generateEncryption = ({ plaintext = " ", signature = process.env.ENCRYPTION_SIGNATURE } = {}) => {
    const encryption = CryptoJS.AES.encrypt(plaintext, signature).toString();
    return encryption;
}

export const decodeEncryption = ({ ciphertext = " ", signature = process.env.ENCRYPTION_SIGNATURE } = {}) => {
    const decryption = CryptoJS.AES.decrypt(ciphertext, signature).toString(CryptoJS.enc.Utf8);
    return decryption;
}