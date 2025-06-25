import { parentPort, workerData } from 'worker_threads';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * 새로운 솔라나 키페어를 생성합니다
 */
function generateKeypair() {
    return Keypair.generate();
}

/**
 * 키페어의 공개키를 base58 주소로 변환합니다
 */
function getAddressFromKeypair(keypair) {
    return keypair.publicKey.toBase58();
}

/**
 * 키페어의 개인키를 base58로 변환합니다
 */
function getPrivateKeyFromKeypair(keypair) {
    return bs58.encode(keypair.secretKey);
}

/**
 * 주소가 지정된 패턴으로 시작하는지 확인합니다
 */
function matchesPattern(address, pattern, caseSensitive = true) {
    if (!caseSensitive) {
        return address.toLowerCase().startsWith(pattern.toLowerCase());
    }
    return address.startsWith(pattern);
}

/**
 * 주소 내 어느 위치에든 지정된 패턴이 포함되어 있는지 확인합니다
 */
function containsPattern(address, pattern, caseSensitive = true) {
    if (!caseSensitive) {
        return address.toLowerCase().includes(pattern.toLowerCase());
    }
    return address.includes(pattern);
}

// 워커 메인 로직
const { pattern, caseSensitive, workerId, searchMode = 'startsWith' } = workerData;
let attempts = 0;

console.log(`🔧 워커 ${workerId} 시작: 패턴 "${pattern}" (모드: ${searchMode})`);

// 검색 함수 선택
const searchFunction = searchMode === 'contains' ? containsPattern : matchesPattern;

while (true) {
    const keypair = generateKeypair();
    const address = getAddressFromKeypair(keypair);
    attempts++;
    
    if (searchFunction(address, pattern, caseSensitive)) {
        parentPort.postMessage({
            success: true,
            address: address,
            privateKey: getPrivateKeyFromKeypair(keypair),
            publicKey: keypair.publicKey.toBase58(),
            attempts: attempts,
            workerId: workerId,
            searchMode: searchMode
        });
        break;
    }
    
    if (attempts % 10000 === 0) {
        parentPort.postMessage({
            progress: true,
            attempts: attempts,
            workerId: workerId
        });
    }
} 