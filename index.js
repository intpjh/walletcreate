#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

// EventEmitter 최대 리스너 수 증가 (메모리 누수 경고 방지)
EventEmitter.defaultMaxListeners = 20;
import {
    generateVanityWallet,
    generateVanityWalletMultiWorker,
    generateVanityWalletContains,
    generateVanityWalletContainsMultiWorker,
    generateVanityWalletStartEnd,
    generateVanityWalletStartEndMultiWorker,
    isValidPattern,
    estimateAttempts,
    formatWalletInfo,
    keypairFromPrivateKey,
    getAddressFromKeypair
} from './utils/wallet-generator.js';

// ASCII 아트 로고
const LOGO = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║      ██████╗  ██████╗ ██╗      █████╗ ███╗   ██╗ █████╗      ║
║     ██╔════╝ ██╔═══██╗██║     ██╔══██╗████╗  ██║██╔══██╗     ║
║     ███████╗ ██║   ██║██║     ███████║██╔██╗ ██║███████║     ║
║     ╚════██║ ██║   ██║██║     ██╔══██║██║╚██╗██║██╔══██║     ║
║     ██████╔╝ ╚██████╔╝███████╗██║  ██║██║ ╚████║██║  ██║     ║
║     ╚═════╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝     ║
║                                                              ║
║                   VANITY WALLET GENERATOR                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

class VanityWalletGenerator {
    constructor() {
        this.progressBar = null;
    }

    displayLogo() {
        console.clear();
        console.log(chalk.cyan(LOGO));
        console.log(chalk.yellow('솔라나 지갑 주소를 원하는 패턴으로 생성하세요!\n'));
    }

    async showMainMenu() {
        const choices = [
            {
                name: '🎯 새 Vanity 지갑 생성',
                value: 'generate'
            },
            {
                name: '📋 기존 지갑 검증',
                value: 'verify'
            },
            {
                name: '💾 생성된 지갑 저장/불러오기',
                value: 'manage'
            },
            {
                name: '❓ 사용법 및 정보',
                value: 'help'
            },
            {
                name: '🚪 종료',
                value: 'exit'
            }
        ];

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: '원하는 작업을 선택하세요:',
                choices: choices
            }
        ]);

        return action;
    }

    async generateVanityWallet() {
        console.log(chalk.blue('\n🎯 Vanity 지갑 생성기\n'));

        // 검색 모드 선택
        const { searchMode } = await inquirer.prompt([
            {
                type: 'list',
                name: 'searchMode',
                message: '검색 모드를 선택하세요:',
                choices: [
                    {
                        name: '🎯 시작 패턴 (주소가 패턴으로 시작) - 예: ABC로 시작하는 주소',
                        value: 'startsWith'
                    },
                    {
                        name: '🔍 포함 패턴 (주소 내 어디든 패턴 포함) - 예: ABC가 어디든 포함된 주소',
                        value: 'contains'
                    },
                    {
                        name: '🎯🎯 앞뒤 패턴 (주소가 앞패턴으로 시작하고 뒤패턴으로 끝남) - 예: ABC로 시작하고 XYZ로 끝나는 주소',
                        value: 'startEnd'
                    }
                ]
            }
        ]);

        // 패턴 입력
        let pattern, startPattern, endPattern;
        
        if (searchMode === 'startEnd') {
            // 앞뒤 패턴 입력
            const patterns = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'startPattern',
                    message: '시작 패턴을 입력하세요 (빈칸=무시, 예: ABC, Sol):',
                    validate: (input) => {
                        // 빈 입력 허용
                        if (!input || input.trim().length === 0) {
                            return true;
                        }
                        if (input.length > 8) {
                            return '패턴이 너무 깁니다. 8자 이하로 입력해주세요.';
                        }
                        if (!isValidPattern(input)) {
                            return '유효하지 않은 패턴입니다. Base58 문자(1-9, A-H, J-N, P-Z, a-k, m-z)만 사용 가능합니다.';
                        }
                        return true;
                    }
                },
                {
                    type: 'input',
                    name: 'endPattern',
                    message: '끝 패턴을 입력하세요 (빈칸=무시, 예: XYZ, 123):',
                    validate: (input) => {
                        // 빈 입력 허용
                        if (!input || input.trim().length === 0) {
                            return true;
                        }
                        if (input.length > 8) {
                            return '패턴이 너무 깁니다. 8자 이하로 입력해주세요.';
                        }
                        if (!isValidPattern(input)) {
                            return '유효하지 않은 패턴입니다. Base58 문자(1-9, A-H, J-N, P-Z, a-k, m-z)만 사용 가능합니다.';
                        }
                        return true;
                    }
                }
            ]);
            
            startPattern = patterns.startPattern.trim();
            endPattern = patterns.endPattern.trim();
            
            // 빈 패턴 검사
            if (!startPattern && !endPattern) {
                console.log(chalk.red('❌ 시작 패턴 또는 끝 패턴 중 최소 하나는 입력해야 합니다.'));
                return;
            }
            
            // 패턴 길이 검사
            if (startPattern.length + endPattern.length >= 44) {
                console.log(chalk.red('❌ 시작 패턴과 끝 패턴의 총 길이가 너무 깁니다. 합쳐서 43자 이하여야 합니다.'));
                return;
            }
        } else {
            // 단일 패턴 입력
            const patternMessage = searchMode === 'startsWith' 
                ? '원하는 주소 시작 패턴을 입력하세요 (예: ABC, 123, Sol):'
                : '주소 내 포함될 패턴을 입력하세요 (예: ABC, 123, Sol):';

            const result = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'pattern',
                    message: patternMessage,
                    validate: (input) => {
                        if (!input || input.length === 0) {
                            return '패턴을 입력해주세요.';
                        }
                        if (input.length > 8) {
                            return '패턴이 너무 깁니다. 8자 이하로 입력해주세요.';
                        }
                        if (!isValidPattern(input)) {
                            return '유효하지 않은 패턴입니다. Base58 문자(1-9, A-H, J-N, P-Z, a-k, m-z)만 사용 가능합니다.';
                        }
                        return true;
                    }
                }
            ]);
            
            pattern = result.pattern;
        }

        // 추가 옵션
        const options = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'caseSensitive',
                message: '대소문자를 구분하시겠습니까?',
                default: true
            },
            {
                type: 'confirm',
                name: 'useMultiCore',
                message: '멀티코어를 사용하여 빠르게 생성하시겠습니까?',
                default: true
            }
        ]);

        // 예상 시도 횟수 표시
        let estimatedAttempts;
        let modeDescription;
        
        if (searchMode === 'startEnd') {
            const hasStartPattern = startPattern && startPattern.length > 0;
            const hasEndPattern = endPattern && endPattern.length > 0;
            
            if (hasStartPattern && hasEndPattern) {
                estimatedAttempts = estimateAttempts(startPattern, options.caseSensitive) * estimateAttempts(endPattern, options.caseSensitive);
                modeDescription = `앞뒤 패턴 (${startPattern}...${endPattern})`;
            } else if (hasStartPattern) {
                estimatedAttempts = estimateAttempts(startPattern, options.caseSensitive);
                modeDescription = `시작 패턴 (${startPattern})`;
            } else {
                estimatedAttempts = estimateAttempts(endPattern, options.caseSensitive);
                modeDescription = `끝 패턴 (...${endPattern})`;
            }
        } else if (searchMode === 'contains') {
            estimatedAttempts = Math.floor(estimateAttempts(pattern, options.caseSensitive) / (44 - pattern.length + 1)); // 포함 패턴은 더 쉬움
            modeDescription = `포함 패턴 (${pattern})`;
        } else {
            estimatedAttempts = estimateAttempts(pattern, options.caseSensitive);
            modeDescription = `시작 패턴 (${pattern})`;
        }
        
        console.log(chalk.yellow(`\n📊 검색 모드: ${modeDescription}`));
        console.log(chalk.yellow(`📊 예상 시도 횟수: ${estimatedAttempts.toLocaleString()}`));
        console.log(chalk.yellow(`⏱️  예상 소요 시간: ${this.getEstimatedTime(estimatedAttempts)} (하드웨어에 따라 차이가 있을 수 있습니다)\n`));

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: '생성을 시작하시겠습니까?',
                default: true
            }
        ]);

        if (!confirm) {
            return;
        }

        console.log(chalk.green('\n🔄 지갑 생성 중...\n'));

        // 진행률 표시
        let totalAttempts = 0;
        const startTime = Date.now();

        const progressCallback = (attempts) => {
            totalAttempts = attempts;
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = attempts / elapsed;
            console.log(chalk.cyan(`💪 시도 횟수: ${attempts.toLocaleString()} | 속도: ${Math.round(rate).toLocaleString()}/초 | 경과 시간: ${Math.round(elapsed)}초`));
        };

        try {
            let wallet;
            
            if (searchMode === 'startEnd') {
                // 앞뒤 패턴 검색
                if (options.useMultiCore) {
                    wallet = await generateVanityWalletStartEndMultiWorker(
                        startPattern,
                        endPattern,
                        null, // 기본 워커 수 사용
                        options.caseSensitive,
                        progressCallback
                    );
                } else {
                    wallet = generateVanityWalletStartEnd(
                        startPattern,
                        endPattern,
                        options.caseSensitive,
                        progressCallback
                    );
                }
            } else if (searchMode === 'contains') {
                // 포함 패턴 검색
                if (options.useMultiCore) {
                    wallet = await generateVanityWalletContainsMultiWorker(
                        pattern,
                        null, // 기본 워커 수 사용
                        options.caseSensitive,
                        progressCallback
                    );
                } else {
                    wallet = generateVanityWalletContains(
                        pattern,
                        options.caseSensitive,
                        progressCallback
                    );
                }
            } else {
                // 시작 패턴 검색 (기존 방식)
                if (options.useMultiCore) {
                    wallet = await generateVanityWalletMultiWorker(
                        pattern,
                        null, // 기본 워커 수 사용
                        options.caseSensitive,
                        progressCallback
                    );
                } else {
                    wallet = generateVanityWallet(
                        pattern,
                        options.caseSensitive,
                        progressCallback
                    );
                }
            }

            const endTime = Date.now();
            const totalTime = (endTime - startTime) / 1000;

            // 결과 표시
            console.log(chalk.green('\n🎉 성공! 원하는 패턴의 지갑을 찾았습니다!\n'));
            
            if (searchMode === 'startEnd') {
                const hasStartPattern = startPattern && startPattern.length > 0;
                const hasEndPattern = endPattern && endPattern.length > 0;
                
                const displayPattern = hasStartPattern && hasEndPattern 
                    ? `${startPattern}...${endPattern}`
                    : hasStartPattern 
                        ? startPattern
                        : `...${endPattern}`;
                
                this.displayWalletInfo(wallet, displayPattern, totalTime, searchMode, startPattern, endPattern);
                await this.saveWalletToFile(wallet, displayPattern, totalTime, searchMode, startPattern, endPattern);
            } else {
                this.displayWalletInfo(wallet, pattern, totalTime, searchMode);
                await this.saveWalletToFile(wallet, pattern, totalTime, searchMode);
            }

        } catch (error) {
            console.error(chalk.red('❌ 오류가 발생했습니다:'), error.message);
        }
    }

    displayWalletInfo(wallet, pattern, generationTime = null, searchMode = 'startsWith', startPattern = null, endPattern = null) {
        console.log(chalk.green('\n🎉 성공! 원하는 패턴의 지갑을 찾았습니다!\n'));
        
        // 패턴 하이라이트
        let highlightedAddress = wallet.address;
        if (searchMode === 'startEnd') {
            const hasStartPattern = startPattern && startPattern.length > 0;
            const hasEndPattern = endPattern && endPattern.length > 0;
            
            if (hasStartPattern && hasEndPattern) {
                const start = wallet.address.substring(0, startPattern.length);
                const middle = wallet.address.substring(startPattern.length, wallet.address.length - endPattern.length);
                const end = wallet.address.substring(wallet.address.length - endPattern.length);
                highlightedAddress = chalk.bgYellow.black(start) + middle + chalk.bgYellow.black(end);
            } else if (hasStartPattern) {
                const start = wallet.address.substring(0, startPattern.length);
                const rest = wallet.address.substring(startPattern.length);
                highlightedAddress = chalk.bgYellow.black(start) + rest;
            } else if (hasEndPattern) {
                const start = wallet.address.substring(0, wallet.address.length - endPattern.length);
                const end = wallet.address.substring(wallet.address.length - endPattern.length);
                highlightedAddress = start + chalk.bgYellow.black(end);
            }
        } else if (searchMode === 'contains') {
            const cleanPattern = pattern.replace('...', ''); // 앞뒤 패턴에서 ... 제거
            const patternIndex = wallet.address.toLowerCase().indexOf(cleanPattern.toLowerCase());
            if (patternIndex !== -1) {
                const before = wallet.address.substring(0, patternIndex);
                const match = wallet.address.substring(patternIndex, patternIndex + cleanPattern.length);
                const after = wallet.address.substring(patternIndex + cleanPattern.length);
                highlightedAddress = before + chalk.bgYellow.black(match) + after;
            }
        } else {
            highlightedAddress = chalk.bgYellow.black(pattern) + wallet.address.substring(pattern.length);
        }
        
        console.log(chalk.cyan('🏠 지갑 주소:'));
        console.log(`   ${highlightedAddress}\n`);
        
        console.log(chalk.cyan('🔑 개인키 (Private Key):'));
        console.log(chalk.red(`   ${wallet.privateKey}\n`));
        
        console.log(chalk.cyan('🔐 공개키 (Public Key):'));
        console.log(chalk.blue(`   ${wallet.publicKey}\n`));
        
        console.log(chalk.cyan('📊 생성 정보:'));
        console.log(chalk.white(`   🎯 패턴: ${pattern}`));
        console.log(chalk.white(`   🔢 개별 워커 시도 횟수: ${(wallet.attempts || 0).toLocaleString()}`));
        if (wallet.totalAttempts && wallet.totalAttempts !== wallet.attempts) {
            console.log(chalk.white(`   🔢 전체 시도 횟수: ${wallet.totalAttempts.toLocaleString()}`));
        }
        
        if (generationTime) {
            console.log(chalk.white(`   ⏱️  생성 시간: ${generationTime.toFixed(2)}초`));
        }
        
        console.log(chalk.red('\n⚠️  보안 주의사항:'));
        console.log(chalk.red('   • 개인키를 절대 다른 사람과 공유하지 마세요'));
        console.log(chalk.red('   • 개인키를 안전한 곳에 백업하세요'));
        console.log(chalk.red('   • 이 정보를 스크린샷으로 찍지 마세요\n'));
    }

    async saveWalletToFile(wallet, pattern, generationTime = null, searchMode = 'startsWith', startPattern = null, endPattern = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        let modePrefix, filePattern;
        
        if (searchMode === 'startEnd') {
            const hasStartPattern = startPattern && startPattern.length > 0;
            const hasEndPattern = endPattern && endPattern.length > 0;
            
            if (hasStartPattern && hasEndPattern) {
                modePrefix = 'startEnd';
                filePattern = `${startPattern}-${endPattern}`;
            } else if (hasStartPattern) {
                modePrefix = 'starts';
                filePattern = startPattern;
            } else {
                modePrefix = 'ends';
                filePattern = endPattern;
            }
        } else if (searchMode === 'contains') {
            modePrefix = 'contains';
            filePattern = pattern;
        } else {
            modePrefix = 'starts';
            filePattern = pattern;
        }
        
        const filename = `solana-wallet-${modePrefix}-${filePattern}-${timestamp}.json`;
        
        let searchModeDescription;
        if (searchMode === 'startEnd') {
            const hasStartPattern = startPattern && startPattern.length > 0;
            const hasEndPattern = endPattern && endPattern.length > 0;
            
            if (hasStartPattern && hasEndPattern) {
                searchModeDescription = `앞뒤 패턴 (${startPattern}로 시작, ${endPattern}로 끝남)`;
            } else if (hasStartPattern) {
                searchModeDescription = `시작 패턴 (${startPattern}로 시작)`;
            } else {
                searchModeDescription = `끝 패턴 (${endPattern}로 끝남)`;
            }
        } else if (searchMode === 'contains') {
            searchModeDescription = '주소 내 포함';
        } else {
            searchModeDescription = '주소 시작';
        }
        
        const walletData = {
            address: wallet.address,
            privateKey: wallet.privateKey,
            publicKey: wallet.publicKey,
            pattern: pattern,
            startPattern: startPattern,
            endPattern: endPattern,
            searchMode: searchMode,
            searchModeDescription: searchModeDescription,
            individualWorkerAttempts: wallet.attempts || 0,
            totalAttempts: wallet.totalAttempts || wallet.attempts || 0,
            generationTime: generationTime ? `${generationTime.toFixed(2)}초` : null,
            createdAt: new Date().toISOString(),
            createdBy: 'Solana Vanity Wallet Generator (Interactive Mode)',
            warning: "⚠️ 이 파일에는 개인키가 포함되어 있습니다. 절대 다른 사람과 공유하지 마세요!"
        };

        try {
            // wallets 디렉토리가 없으면 생성
            const walletsDir = 'wallets';
            if (!fs.existsSync(walletsDir)) {
                fs.mkdirSync(walletsDir);
            }

            const filepath = path.join(walletsDir, filename);
            fs.writeFileSync(filepath, JSON.stringify(walletData, null, 2));
            
            console.log(chalk.green(`\n💾 지갑 정보가 자동으로 저장되었습니다: ${filepath}`));
            console.log(chalk.yellow('   안전한 곳에 백업하고 불필요한 경우 삭제하세요.'));
        } catch (error) {
            console.error(chalk.red('❌ 파일 저장 중 오류가 발생했습니다:'), error.message);
        }
    }

    async verifyWallet() {
        console.log(chalk.blue('\n📋 지갑 검증\n'));

        const { privateKey } = await inquirer.prompt([
            {
                type: 'input',
                name: 'privateKey',
                message: '검증할 개인키를 입력하세요:',
                validate: (input) => {
                    if (!input || input.length === 0) {
                        return '개인키를 입력해주세요.';
                    }
                    try {
                        keypairFromPrivateKey(input);
                        return true;
                    } catch (error) {
                        return '유효하지 않은 개인키입니다.';
                    }
                }
            }
        ]);

        try {
            const keypair = keypairFromPrivateKey(privateKey);
            const address = getAddressFromKeypair(keypair);
            
            console.log(chalk.green('\n✅ 유효한 지갑입니다!\n'));
            console.log(chalk.cyan('지갑 주소:'), chalk.green(address));
            console.log(chalk.cyan('공개키:'), chalk.blue(keypair.publicKey.toBase58()));
            
        } catch (error) {
            console.error(chalk.red('❌ 지갑 검증 실패:'), error.message);
        }
    }

    async manageWallets() {
        console.log(chalk.blue('\n💾 지갑 관리\n'));

        const walletsDir = 'wallets';
        if (!fs.existsSync(walletsDir)) {
            console.log(chalk.yellow('저장된 지갑이 없습니다.'));
            return;
        }

        const files = fs.readdirSync(walletsDir).filter(file => file.endsWith('.json'));
        
        if (files.length === 0) {
            console.log(chalk.yellow('저장된 지갑이 없습니다.'));
            return;
        }

        const { selectedFile } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedFile',
                message: '불러올 지갑을 선택하세요:',
                choices: files.map(file => ({
                    name: file,
                    value: file
                }))
            }
        ]);

        try {
            const filepath = path.join(walletsDir, selectedFile);
            const walletData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            
            console.log(chalk.green('\n📄 저장된 지갑 정보:\n'));
            this.displayWalletInfo(walletData, walletData.pattern);
            
        } catch (error) {
            console.error(chalk.red('❌ 지갑 파일을 읽는 중 오류가 발생했습니다:'), error.message);
        }
    }

    showHelp() {
        console.log(chalk.blue('\n❓ 사용법 및 정보\n'));
        
        console.log(chalk.cyan('🎯 Vanity 지갑이란?'));
        console.log('   원하는 패턴으로 시작하는 지갑 주소를 생성하는 것입니다.');
        console.log('   예: "ABC"로 시작하는 주소 → ABCxxx...xxx\n');
        
        console.log(chalk.cyan('📝 패턴 규칙:'));
        console.log('   • Base58 문자만 사용 가능: 1-9, A-H, J-N, P-Z, a-k, m-z');
        console.log('   • 사용 불가능한 문자: 0, O, I, l');
        console.log('   • 최대 8자까지 권장 (더 길면 생성 시간이 매우 오래 걸림)\n');
        
        console.log(chalk.cyan('⏱️ 예상 소요 시간:'));
        console.log('   • 1자리: 즉시');
        console.log('   • 2자리: 1-10초');
        console.log('   • 3자리: 1-10분');
        console.log('   • 4자리: 1-10시간');
        console.log('   • 5자리 이상: 매우 오래 걸릴 수 있음\n');
        
        console.log(chalk.cyan('🔒 보안 주의사항:'));
        console.log('   • 개인키를 절대 타인과 공유하지 마세요');
        console.log('   • 개인키를 안전한 곳에 백업하세요');
        console.log('   • 이 프로그램은 오프라인에서 동작합니다');
        console.log('   • 생성된 지갑은 실제 솔라나 네트워크에서 사용 가능합니다\n');
        
        console.log(chalk.cyan('💡 팁:'));
        console.log('   • 멀티코어 옵션을 사용하면 더 빠르게 생성됩니다');
        console.log('   • 대소문자를 구분하지 않으면 더 빠르게 찾을 수 있습니다');
        console.log('   • 너무 긴 패턴은 현실적으로 생성하기 어렵습니다\n');
    }

    getEstimatedTime(attempts) {
        const ratePerSecond = 10000; // 대략적인 초당 생성 속도
        const seconds = attempts / ratePerSecond;
        
        if (seconds < 60) {
            return `${Math.round(seconds)}초`;
        } else if (seconds < 3600) {
            return `${Math.round(seconds / 60)}분`;
        } else if (seconds < 86400) {
            return `${Math.round(seconds / 3600)}시간`;
        } else {
            return `${Math.round(seconds / 86400)}일`;
        }
    }

    async run() {
        this.displayLogo();

        while (true) {
            try {
                const action = await this.showMainMenu();

                switch (action) {
                    case 'generate':
                        await this.generateVanityWallet();
                        break;
                    case 'verify':
                        await this.verifyWallet();
                        break;
                    case 'manage':
                        await this.manageWallets();
                        break;
                    case 'help':
                        this.showHelp();
                        break;
                    case 'exit':
                        console.log(chalk.green('\n👋 감사합니다! 안전한 거래하세요!\n'));
                        process.exit(0);
                        break;
                }

                // 메뉴로 돌아가기 전 잠시 대기
                await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'continue',
                        message: '\nEnter를 눌러 메인 메뉴로 돌아가세요...'
                    }
                ]);

                this.displayLogo();

            } catch (error) {
                if (error.isTtyError) {
                    console.error(chalk.red('❌ 터미널 환경에서 실행해주세요.'));
                } else {
                    console.error(chalk.red('❌ 오류가 발생했습니다:'), error.message);
                }
                process.exit(1);
            }
        }
    }
}

// 프로그램 실행
const generator = new VanityWalletGenerator();
generator.run().catch(error => {
    console.error(chalk.red('❌ 치명적 오류:'), error.message);
    process.exit(1);
}); 