import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

/**
 * 새로운 솔라나 키페어를 생성합니다
 * @returns {Keypair} 새로운 키페어
 */
export function generateKeypair() {
    return Keypair.generate();
}

/**
 * 키페어의 공개키를 base58 주소로 변환합니다
 * @param {Keypair} keypair - 솔라나 키페어
 * @returns {string} base58 인코딩된 주소
 */
export function getAddressFromKeypair(keypair) {
    return keypair.publicKey.toBase58();
}

/**
 * 키페어의 개인키를 base58로 변환합니다
 * @param {Keypair} keypair - 솔라나 키페어
 * @returns {string} base58 인코딩된 개인키
 */
export function getPrivateKeyFromKeypair(keypair) {
    return bs58.encode(keypair.secretKey);
}

/**
 * base58 개인키로부터 키페어를 복원합니다
 * @param {string} privateKeyBase58 - base58 인코딩된 개인키
 * @returns {Keypair} 복원된 키페어
 */
export function keypairFromPrivateKey(privateKeyBase58) {
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    return Keypair.fromSecretKey(privateKeyBytes);
}

/**
 * 주소가 지정된 패턴으로 시작하는지 확인합니다
 * @param {string} address - 검사할 주소
 * @param {string} pattern - 찾을 패턴
 * @param {boolean} caseSensitive - 대소문자 구분 여부 (기본: true)
 * @returns {boolean} 패턴 일치 여부
 */
export function matchesPattern(address, pattern, caseSensitive = true) {
    if (!caseSensitive) {
        return address.toLowerCase().startsWith(pattern.toLowerCase());
    }
    return address.startsWith(pattern);
}

/**
 * 주소 내 어느 위치에든 지정된 패턴이 포함되어 있는지 확인합니다
 * @param {string} address - 검사할 주소
 * @param {string} pattern - 찾을 패턴
 * @param {boolean} caseSensitive - 대소문자 구분 여부 (기본: true)
 * @returns {boolean} 패턴 포함 여부
 */
export function containsPattern(address, pattern, caseSensitive = true) {
    if (!caseSensitive) {
        return address.toLowerCase().includes(pattern.toLowerCase());
    }
    return address.includes(pattern);
}

/**
 * 주소가 지정된 패턴으로 시작하고 끝나는지 확인합니다
 * @param {string} address - 검사할 주소
 * @param {string} startPattern - 시작 패턴 (빈 문자열이면 시작 패턴 무시)
 * @param {string} endPattern - 끝 패턴 (빈 문자열이면 끝 패턴 무시)
 * @param {boolean} caseSensitive - 대소문자 구분 여부 (기본: true)
 * @returns {boolean} 패턴 일치 여부
 */
export function matchesStartEndPattern(address, startPattern, endPattern, caseSensitive = true) {
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

/**
 * 지정된 패턴으로 시작하는 vanity 주소를 생성합니다
 * @param {string} pattern - 찾을 패턴
 * @param {boolean} caseSensitive - 대소문자 구분 여부 (기본: true)
 * @param {Function} progressCallback - 진행 상황 콜백 함수
 * @returns {Object} 생성된 지갑 정보 {address, privateKey, publicKey, attempts}
 */
export function generateVanityWallet(pattern, caseSensitive = true, progressCallback = null) {
    let attempts = 0;
    let keypair;
    let address;

    // 패턴 유효성 검사
    if (!isValidPattern(pattern)) {
        throw new Error('유효하지 않은 패턴입니다. Base58 문자만 사용할 수 있습니다.');
    }

    do {
        keypair = generateKeypair();
        address = getAddressFromKeypair(keypair);
        attempts++;

        if (progressCallback && attempts % 10000 === 0) {
            progressCallback(attempts);
        }
    } while (!matchesPattern(address, pattern, caseSensitive));

    return {
        address: address,
        privateKey: getPrivateKeyFromKeypair(keypair),
        publicKey: keypair.publicKey.toBase58(),
        attempts: attempts,
        keypair: keypair
    };
}

/**
 * 주소 내 어느 위치에든 지정된 패턴이 포함된 vanity 주소를 생성합니다
 * @param {string} pattern - 찾을 패턴
 * @param {boolean} caseSensitive - 대소문자 구분 여부 (기본: true)
 * @param {Function} progressCallback - 진행 상황 콜백 함수
 * @returns {Object} 생성된 지갑 정보 {address, privateKey, publicKey, attempts}
 */
export function generateVanityWalletContains(pattern, caseSensitive = true, progressCallback = null) {
    let attempts = 0;
    let keypair;
    let address;

    // 패턴 유효성 검사
    if (!isValidPattern(pattern)) {
        throw new Error('유효하지 않은 패턴입니다. Base58 문자만 사용할 수 있습니다.');
    }

    do {
        keypair = generateKeypair();
        address = getAddressFromKeypair(keypair);
        attempts++;

        if (progressCallback && attempts % 10000 === 0) {
            progressCallback(attempts);
        }
    } while (!containsPattern(address, pattern, caseSensitive));

    return {
        address: address,
        privateKey: getPrivateKeyFromKeypair(keypair),
        publicKey: keypair.publicKey.toBase58(),
        attempts: attempts,
        keypair: keypair
    };
}

/**
 * 지정된 시작과 끝 패턴을 가진 vanity 주소를 생성합니다
 * @param {string} startPattern - 시작 패턴
 * @param {string} endPattern - 끝 패턴
 * @param {boolean} caseSensitive - 대소문자 구분 여부 (기본: true)
 * @param {Function} progressCallback - 진행 상황 콜백 함수
 * @returns {Object} 생성된 지갑 정보 {address, privateKey, publicKey, attempts}
 */
export function generateVanityWalletStartEnd(startPattern, endPattern, caseSensitive = true, progressCallback = null) {
    let attempts = 0;
    let keypair;
    let address;

    // 빈 패턴 처리
    const hasStartPattern = startPattern && startPattern.trim().length > 0;
    const hasEndPattern = endPattern && endPattern.trim().length > 0;
    
    // 둘 다 빈 패턴이면 에러
    if (!hasStartPattern && !hasEndPattern) {
        throw new Error('시작 패턴 또는 끝 패턴 중 최소 하나는 입력해야 합니다.');
    }

    // 패턴 유효성 검사 (빈 패턴이 아닌 경우에만)
    if (hasStartPattern && !isValidPattern(startPattern)) {
        throw new Error('유효하지 않은 시작 패턴입니다. Base58 문자만 사용할 수 있습니다.');
    }
    if (hasEndPattern && !isValidPattern(endPattern)) {
        throw new Error('유효하지 않은 끝 패턴입니다. Base58 문자만 사용할 수 있습니다.');
    }

    // 패턴 길이 검사 (솔라나 주소는 44자이므로 시작+끝 패턴이 44자를 초과하면 안됨)
    const startLength = hasStartPattern ? startPattern.length : 0;
    const endLength = hasEndPattern ? endPattern.length : 0;
    if (startLength + endLength >= 44) {
        throw new Error('시작 패턴과 끝 패턴의 총 길이가 너무 깁니다. 합쳐서 43자 이하여야 합니다.');
    }

    do {
        keypair = generateKeypair();
        address = getAddressFromKeypair(keypair);
        attempts++;

        if (progressCallback && attempts % 10000 === 0) {
            progressCallback(attempts);
        }
    } while (!matchesStartEndPattern(address, startPattern, endPattern, caseSensitive));

    return {
        address: address,
        privateKey: getPrivateKeyFromKeypair(keypair),
        publicKey: keypair.publicKey.toBase58(),
        attempts: attempts,
        keypair: keypair
    };
}

/**
 * 멀티 워커를 사용하여 vanity 주소를 생성합니다 (수정된 버전)
 * @param {string} pattern - 찾을 패턴
 * @param {number} workerCount - 워커 스레드 수 (기본: CPU 코어 수)
 * @param {boolean} caseSensitive - 대소문자 구분 여부 (기본: true)
 * @param {Function} progressCallback - 진행 상황 콜백 함수
 * @returns {Promise<Object>} 생성된 지갑 정보
 */
export async function generateVanityWalletMultiWorker(pattern, workerCount = null, caseSensitive = true, progressCallback = null) {
    const { Worker } = await import('worker_threads');
    const os = await import('os');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    // 패턴 유효성 검사
    if (!isValidPattern(pattern)) {
        throw new Error('유효하지 않은 패턴입니다. Base58 문자만 사용할 수 있습니다.');
    }

    return new Promise((resolve, reject) => {
        const numWorkers = workerCount || os.cpus().length;
        const workers = [];
        let totalAttempts = 0;
        let resolved = false;

        // 현재 디렉토리 경로 계산
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const workerPath = path.join(__dirname, 'worker.js');

        console.log(`🚀 ${numWorkers}개 워커로 병렬 생성 시작...`);

        for (let i = 0; i < numWorkers; i++) {
            try {
                const worker = new Worker(workerPath, {
                    workerData: { 
                        pattern, 
                        caseSensitive,
                        workerId: i + 1
                    }
                });

                worker.on('message', (message) => {
                    if (resolved) return;

                    if (message.success) {
                        resolved = true;
                        message.totalAttempts = totalAttempts + message.attempts;
                        
                        console.log(`🎉 워커 ${message.workerId}가 해답을 찾았습니다!`);
                        
                        // 모든 워커 종료
                        workers.forEach(w => w.terminate());
                        resolve(message);
                    } else if (message.progress) {
                        totalAttempts += 10000;
                        if (progressCallback) {
                            progressCallback(totalAttempts);
                        }
                    }
                });

                worker.on('error', (error) => {
                    console.error(`❌ 워커 ${i + 1} 오류:`, error.message);
                    if (!resolved) {
                        reject(error);
                    }
                });

                workers.push(worker);
            } catch (error) {
                console.error(`❌ 워커 ${i + 1} 생성 실패:`, error.message);
                reject(error);
                return;
            }
        }
    });
}

/**
 * 멀티 워커를 사용하여 주소 내 어느 위치에든 패턴이 포함된 vanity 주소를 생성합니다
 * @param {string} pattern - 찾을 패턴
 * @param {number} workerCount - 워커 스레드 수 (기본: CPU 코어 수)
 * @param {boolean} caseSensitive - 대소문자 구분 여부 (기본: true)
 * @param {Function} progressCallback - 진행 상황 콜백 함수
 * @returns {Promise<Object>} 생성된 지갑 정보
 */
export async function generateVanityWalletContainsMultiWorker(pattern, workerCount = null, caseSensitive = true, progressCallback = null) {
    const { Worker } = await import('worker_threads');
    const os = await import('os');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    // 패턴 유효성 검사
    if (!isValidPattern(pattern)) {
        throw new Error('유효하지 않은 패턴입니다. Base58 문자만 사용할 수 있습니다.');
    }

    return new Promise((resolve, reject) => {
        const numWorkers = workerCount || os.cpus().length;
        const workers = [];
        let totalAttempts = 0;
        let resolved = false;

        // 현재 디렉토리 경로 계산
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const workerPath = path.join(__dirname, 'worker.js');

        console.log(`🚀 ${numWorkers}개 워커로 병렬 생성 시작... (포함 패턴)`);

        for (let i = 0; i < numWorkers; i++) {
            try {
                const worker = new Worker(workerPath, {
                    workerData: { 
                        pattern, 
                        caseSensitive,
                        workerId: i + 1,
                        searchMode: 'contains' // 새로운 모드 추가
                    }
                });

                worker.on('message', (message) => {
                    if (resolved) return;

                    if (message.success) {
                        resolved = true;
                        message.totalAttempts = totalAttempts + message.attempts;
                        
                        console.log(`🎉 워커 ${message.workerId}가 해답을 찾았습니다!`);
                        
                        // 모든 워커 종료
                        workers.forEach(w => w.terminate());
                        resolve(message);
                    } else if (message.progress) {
                        totalAttempts += 10000;
                        if (progressCallback) {
                            progressCallback(totalAttempts);
                        }
                    }
                });

                worker.on('error', (error) => {
                    console.error(`❌ 워커 ${i + 1} 오류:`, error.message);
                    if (!resolved) {
                        reject(error);
                    }
                });

                workers.push(worker);
            } catch (error) {
                console.error(`❌ 워커 ${i + 1} 생성 실패:`, error.message);
                reject(error);
                return;
            }
        }
    });
}

/**
 * 멀티 워커를 사용하여 시작과 끝 패턴을 가진 vanity 주소를 생성합니다
 * @param {string} startPattern - 시작 패턴
 * @param {string} endPattern - 끝 패턴
 * @param {number} workerCount - 워커 스레드 수 (기본: CPU 코어 수)
 * @param {boolean} caseSensitive - 대소문자 구분 여부 (기본: true)
 * @param {Function} progressCallback - 진행 상황 콜백 함수
 * @returns {Promise<Object>} 생성된 지갑 정보
 */
export async function generateVanityWalletStartEndMultiWorker(startPattern, endPattern, workerCount = null, caseSensitive = true, progressCallback = null) {
    const { Worker } = await import('worker_threads');
    const os = await import('os');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    // 빈 패턴 처리
    const hasStartPattern = startPattern && startPattern.trim().length > 0;
    const hasEndPattern = endPattern && endPattern.trim().length > 0;
    
    // 둘 다 빈 패턴이면 에러
    if (!hasStartPattern && !hasEndPattern) {
        throw new Error('시작 패턴 또는 끝 패턴 중 최소 하나는 입력해야 합니다.');
    }
    
    // 패턴 유효성 검사 (빈 패턴이 아닌 경우에만)
    if (hasStartPattern && !isValidPattern(startPattern)) {
        throw new Error('유효하지 않은 시작 패턴입니다. Base58 문자만 사용할 수 있습니다.');
    }
    if (hasEndPattern && !isValidPattern(endPattern)) {
        throw new Error('유효하지 않은 끝 패턴입니다. Base58 문자만 사용할 수 있습니다.');
    }
    
    // 패턴 길이 검사
    const startLength = hasStartPattern ? startPattern.length : 0;
    const endLength = hasEndPattern ? endPattern.length : 0;
    if (startLength + endLength >= 44) {
        throw new Error('시작 패턴과 끝 패턴의 총 길이가 너무 깁니다. 합쳐서 43자 이하여야 합니다.');
    }

    return new Promise((resolve, reject) => {
        const numWorkers = workerCount || os.cpus().length;
        const workers = [];
        let totalAttempts = 0;
        let resolved = false;

        // 현재 디렉토리 경로 계산
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const workerPath = path.join(__dirname, 'worker.js');

        const patternDescription = hasStartPattern && hasEndPattern 
            ? `${startPattern}...${endPattern}`
            : hasStartPattern 
                ? `${startPattern}로 시작`
                : `${endPattern}로 끝남`;
        console.log(`🚀 ${numWorkers}개 워커로 병렬 생성 시작... (앞뒤 패턴: ${patternDescription})`);

        for (let i = 0; i < numWorkers; i++) {
            try {
                const worker = new Worker(workerPath, {
                    workerData: { 
                        startPattern,
                        endPattern,
                        caseSensitive,
                        workerId: i + 1,
                        searchMode: 'startEnd' // 새로운 모드 추가
                    }
                });

                worker.on('message', (message) => {
                    if (resolved) return;

                    if (message.success) {
                        resolved = true;
                        message.totalAttempts = totalAttempts + message.attempts;
                        
                        console.log(`🎉 워커 ${message.workerId}가 해답을 찾았습니다!`);
                        
                        // 모든 워커 종료
                        workers.forEach(w => w.terminate());
                        resolve(message);
                    } else if (message.progress) {
                        totalAttempts += 10000;
                        if (progressCallback) {
                            progressCallback(totalAttempts);
                        }
                    }
                });

                worker.on('error', (error) => {
                    console.error(`❌ 워커 ${i + 1} 오류:`, error.message);
                    if (!resolved) {
                        reject(error);
                    }
                });

                workers.push(worker);
            } catch (error) {
                console.error(`❌ 워커 ${i + 1} 생성 실패:`, error.message);
                reject(error);
                return;
            }
        }
    });
}

/**
 * 패턴이 유효한 Base58 문자로만 구성되어 있는지 확인합니다
 * @param {string} pattern - 검사할 패턴
 * @returns {boolean} 유효성 여부
 */
export function isValidPattern(pattern) {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(pattern);
}

/**
 * 패턴의 예상 시도 횟수를 계산합니다
 * @param {string} pattern - 패턴
 * @param {boolean} caseSensitive - 대소문자 구분 여부
 * @returns {number} 예상 시도 횟수
 */
export function estimateAttempts(pattern, caseSensitive = true) {
    const base58Length = 58;
    const patternLength = pattern.length;
    
    if (!caseSensitive) {
        // 대소문자 구분하지 않을 때는 확률이 더 높아집니다
        // 하지만 정확한 계산은 복잡하므로 근사치를 사용합니다
        return Math.pow(base58Length / 2, patternLength);
    }
    
    return Math.pow(base58Length, patternLength);
}

/**
 * 지갑 정보를 안전하게 표시하기 위한 형식으로 변환합니다
 * @param {Object} walletInfo - 지갑 정보
 * @returns {Object} 표시용 지갑 정보
 */
export function formatWalletInfo(walletInfo) {
    return {
        address: walletInfo.address,
        publicKey: walletInfo.publicKey,
        privateKey: walletInfo.privateKey,
        attempts: walletInfo.attempts.toLocaleString(),
        pattern: walletInfo.pattern || 'N/A'
    };
} 