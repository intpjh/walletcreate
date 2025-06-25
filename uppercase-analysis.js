import { generateKeypair, getAddressFromKeypair } from './utils/wallet-generator.js';

/**
 * 주소가 모든 대문자로 이루어져 있는지 확인
 * @param {string} address - 솔라나 주소
 * @returns {boolean} 모든 문자가 대문자인지 여부
 */
function isAllUppercase(address) {
    // Base58에서 사용되는 대문자들: ABCDEFGHJKLMNPQRSTUVWXYZ (O, I 제외)
    const uppercaseBase58 = /^[ABCDEFGHJKLMNPQRSTUVWXYZ]+$/;
    return uppercaseBase58.test(address);
}

/**
 * 확률 계산 함수
 */
function calculateProbability() {
    // Base58 문자 세트 (58개): 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    // 대문자만 (23개): ABCDEFGHJKLMNPQRSTUVWXYZ (O, I 제외)
    // 솔라나 주소는 보통 44자
    
    const totalBase58Chars = 58;
    const uppercaseBase58Chars = 23;
    const addressLength = 44;
    
    const probabilityPerChar = uppercaseBase58Chars / totalBase58Chars;
    const totalProbability = Math.pow(probabilityPerChar, addressLength);
    const expectedAttempts = 1 / totalProbability;
    
    console.log('📊 영문 대문자 주소 확률 분석');
    console.log('================================');
    console.log(`Base58 총 문자 수: ${totalBase58Chars}`);
    console.log(`대문자 문자 수: ${uppercaseBase58Chars}`);
    console.log(`주소 길이: ${addressLength}자`);
    console.log(`각 자리가 대문자일 확률: ${(probabilityPerChar * 100).toFixed(4)}%`);
    console.log(`모든 자리가 대문자일 확률: ${totalProbability.toExponential(2)}`);
    console.log(`예상 시도 횟수: ${expectedAttempts.toExponential(2)}`);
    
    return expectedAttempts;
}

/**
 * 성능 테스트 (샘플)
 */
async function performanceTest() {
    console.log('\n🔥 성능 테스트 중...');
    
    const startTime = Date.now();
    let attempts = 0;
    const sampleSize = 100000;
    let uppercaseCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
        const keypair = generateKeypair();
        const address = getAddressFromKeypair(keypair);
        attempts++;
        
        if (isAllUppercase(address)) {
            uppercaseCount++;
            console.log(`🎉 대문자 주소 발견! ${address}`);
        }
        
        if (i % 10000 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = i / elapsed;
            console.log(`진행: ${i}/${sampleSize}, 속도: ${rate.toFixed(0)} 주소/초`);
        }
    }
    
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = attempts / elapsed;
    
    console.log('\n📈 성능 결과');
    console.log('================');
    console.log(`총 시도: ${attempts}`);
    console.log(`소요 시간: ${elapsed.toFixed(2)}초`);
    console.log(`생성 속도: ${rate.toFixed(0)} 주소/초`);
    console.log(`발견된 대문자 주소: ${uppercaseCount}개`);
    
    return rate;
}

/**
 * 시간 추정
 */
function estimateTime(expectedAttempts, addressesPerSecond, numWorkers = 14) {
    const totalRate = addressesPerSecond * numWorkers;
    const timeInSeconds = expectedAttempts / totalRate;
    
    const seconds = timeInSeconds % 60;
    const minutes = Math.floor(timeInSeconds / 60) % 60;
    const hours = Math.floor(timeInSeconds / 3600) % 24;
    const days = Math.floor(timeInSeconds / 86400) % 365;
    const years = Math.floor(timeInSeconds / (86400 * 365));
    
    console.log('\n⏰ 예상 소요 시간 (14개 워커 기준)');
    console.log('=====================================');
    console.log(`단일 워커 속도: ${addressesPerSecond.toLocaleString()} 주소/초`);
    console.log(`멀티 워커 속도: ${totalRate.toLocaleString()} 주소/초`);
    console.log(`예상 소요 시간: ${timeInSeconds.toExponential(2)}초`);
    
    if (years > 0) {
        console.log(`= 약 ${years.toLocaleString()}년 ${days}일 ${hours}시간 ${minutes}분 ${seconds.toFixed(0)}초`);
    } else if (days > 0) {
        console.log(`= 약 ${days}일 ${hours}시간 ${minutes}분 ${seconds.toFixed(0)}초`);
    } else if (hours > 0) {
        console.log(`= 약 ${hours}시간 ${minutes}분 ${seconds.toFixed(0)}초`);
    } else if (minutes > 0) {
        console.log(`= 약 ${minutes}분 ${seconds.toFixed(0)}초`);
    } else {
        console.log(`= 약 ${seconds.toFixed(2)}초`);
    }
    
    // 현실적인 관점
    console.log('\n💡 현실적인 관점');
    console.log('==================');
    if (years > 1000) {
        console.log('⚠️  이는 우주의 나이보다도 훨씬 긴 시간입니다!');
        console.log('⚠️  실제로는 찾는 것이 거의 불가능합니다.');
    } else if (years > 100) {
        console.log('⚠️  이는 인간의 수명보다 훨씬 긴 시간입니다.');
        console.log('⚠️  현실적으로 불가능한 작업입니다.');
    } else if (years > 1) {
        console.log('⚠️  매우 오랜 시간이 걸립니다.');
        console.log('⚠️  더 짧은 패턴을 고려해보세요.');
    }
}

/**
 * 대안 제안
 */
function suggestAlternatives() {
    console.log('\n💡 대안 제안');
    console.log('=============');
    console.log('1. 앞 3-4자리만 대문자인 주소 찾기');
    console.log('2. 대소문자 상관없이 특정 단어 포함된 주소 찾기');
    console.log('3. 숫자와 대문자 조합의 패턴 찾기');
    
    // 앞 4자리 대문자 확률 계산
    const prob4chars = Math.pow(23/58, 4);
    const attempts4chars = 1 / prob4chars;
    
    console.log(`\n예시: 앞 4자리가 대문자인 주소`);
    console.log(`확률: ${prob4chars.toFixed(6)}`);
    console.log(`예상 시도: ${attempts4chars.toFixed(0)}번`);
    console.log(`14개 워커로 예상 시간: 약 ${(attempts4chars / (50000 * 14)).toFixed(1)}초`);
}

// 메인 실행
async function main() {
    console.log('🔍 솔라나 영문 대문자 주소 분석');
    console.log('===============================\n');
    
    // 1. 확률 계산
    const expectedAttempts = calculateProbability();
    
    // 2. 성능 테스트
    const addressesPerSecond = await performanceTest();
    
    // 3. 시간 추정
    estimateTime(expectedAttempts, addressesPerSecond);
    
    // 4. 대안 제안
    suggestAlternatives();
}

main().catch(console.error); 