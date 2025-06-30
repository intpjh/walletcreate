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

/**
 * 주소가 지정된 패턴으로 시작하고 끝나는지 확인합니다
 */
function matchesStartEndPattern(address, startPattern, endPattern, caseSensitive = true) {
    // 빈 패턴 처리
    const hasStartPattern = startPattern && startPattern.trim().length > 0;
    const hasEndPattern = endPattern && endPattern.trim().length > 0;
    
    if (!hasStartPattern && !hasEndPattern) {
        return true; // 둘 다 빈 패턴이면 모든 주소가 매치
    }
    
    if (!caseSensitive) {
        const lowerAddress = address.toLowerCase();
        const lowerStart = hasStartPattern ? startPattern.toLowerCase() : '';
        const lowerEnd = hasEndPattern ? endPattern.toLowerCase() : '';
        
        const startMatch = !hasStartPattern || lowerAddress.startsWith(lowerStart);
        const endMatch = !hasEndPattern || lowerAddress.endsWith(lowerEnd);
        
        return startMatch && endMatch;
    }
    
    const startMatch = !hasStartPattern || address.startsWith(startPattern);
    const endMatch = !hasEndPattern || address.endsWith(endPattern);
    
    return startMatch && endMatch;
}

// 워커 메인 로직
const { pattern, startPattern, endPattern, caseSensitive, workerId, searchMode = 'startsWith' } = workerData;
let attempts = 0;

// 검색 모드에 따른 로그 메시지
let logMessage;
if (searchMode === 'startEnd') {
    const hasStartPattern = startPattern && startPattern.trim().length > 0;
    const hasEndPattern = endPattern && endPattern.trim().length > 0;
    
    const patternDescription = hasStartPattern && hasEndPattern 
        ? `"${startPattern}...${endPattern}"`
        : hasStartPattern 
            ? `"${startPattern}로 시작"`
            : `"${endPattern}로 끝남"`;
    
    logMessage = `🔧 워커 ${workerId} 시작: 앞뒤 패턴 ${patternDescription} (모드: ${searchMode})`;
} else {
    logMessage = `🔧 워커 ${workerId} 시작: 패턴 "${pattern}" (모드: ${searchMode})`;
}
console.log(logMessage);

while (true) {
    const keypair = generateKeypair();
    const address = getAddressFromKeypair(keypair);
    attempts++;
    
    let isMatch = false;
    
    // 검색 모드에 따른 패턴 매칭
    if (searchMode === 'startEnd') {
        isMatch = matchesStartEndPattern(address, startPattern, endPattern, caseSensitive);
    } else if (searchMode === 'contains') {
        isMatch = containsPattern(address, pattern, caseSensitive);
    } else { // 기본값: 'startsWith'
        isMatch = matchesPattern(address, pattern, caseSensitive);
    }
    
    if (isMatch) {
        parentPort.postMessage({
            success: true,
            address: address,
            privateKey: getPrivateKeyFromKeypair(keypair),
            publicKey: keypair.publicKey.toBase58(),
            attempts: attempts,
            workerId: workerId,
            searchMode: searchMode,
            startPattern: startPattern,
            endPattern: endPattern,
            pattern: pattern
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