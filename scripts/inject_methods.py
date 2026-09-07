with open('game.js', 'r', encoding='utf-8') as f:
    code = f.read()

banner_methods = '''
    renderLevelClearBanner(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 23, 0.84)';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        const bw = 680;
        const bh = 240;
        const bx = (VIRTUAL_WIDTH - bw) / 2;
        const by = (VIRTUAL_HEIGHT - bh) / 2 - 15;

        const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(bx, by, bw, bh);

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 6, by + 6, bw - 12, bh - 12);

        ctx.font = 'bold 20px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText(`🌟 FASE ${this.currentPhase} CONCLUÍDA! 🌟`, VIRTUAL_WIDTH / 2, by + 48);

        let phaseTitle = '';
        let phaseDetail = '';
        if (this.currentPhase === 1) {
            phaseTitle = 'A GRANDE COLETA DE LIXO NO BAIRRO';
            phaseDetail = `Sacos Coletados: ${this.trashCollected}/${this.totalTrash} | Recicláveis: ${this.recyclablesCollected}/${this.totalRecyclables}`;
        } else if (this.currentPhase === 2) {
            phaseTitle = 'RODOVIA AO TRANSBORDO URBANO';
            phaseDetail = `Biodiesel: ${this.biodieselCollected}/${this.totalBiodiesel} | Reparos: ${this.wrenchesCollected}/${this.totalWrenches}`;
        } else if (this.currentPhase === 3) {
            phaseTitle = 'TRANSBORDO: 30T NA CARRETA';
            phaseDetail = '4 Caminhões Basculados | Lona 100% Selada';
        } else if (this.currentPhase === 4) {
            phaseTitle = 'TRAVESSIA DAS DUNAS AO ATERRO';
            phaseDetail = 'Carga Estável (30.000 kg) | Balança Rodoviária Ok';
        } else if (this.currentPhase === 5) {
            phaseTitle = 'ATERRO SANITÁRIO & USINA VERDE';
            phaseDetail = '10.0 MW de Biogás | ETE com Água pH 7.0';
        }

        ctx.font = 'bold 11px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(phaseTitle, VIRTUAL_WIDTH / 2, by + 86);

        ctx.font = '10px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(phaseDetail, VIRTUAL_WIDTH / 2, by + 118);

        ctx.font = 'bold 14px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`PONTUAÇÃO: ${this.score}`, VIRTUAL_WIDTH / 2, by + 152);

        const remaining = Math.max(0, 3.2 - (this.levelClearTimer || 0)).toFixed(1);
        const blink = Math.floor(performance.now() / 350) % 2 === 0;
        ctx.font = '10px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = blink ? '#ffffff' : '#fde047';
        ctx.fillText(`AVANÇANDO EM ${remaining}s... [ESPAÇO / A PARA AVANÇAR] ▶`, VIRTUAL_WIDTH / 2, by + 205);
        ctx.restore();
    }

    renderGameOverBanner(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        const bw = 600;
        const bh = 200;
        const bx = (VIRTUAL_WIDTH - bw) / 2;
        const by = (VIRTUAL_HEIGHT - bh) / 2 - 10;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.font = 'bold 22px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText('💀 FIM DE JOGO! 💀', VIRTUAL_WIDTH / 2, by + 55);

        ctx.font = '11px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#fca5a5';
        ctx.fillText('Você perdeu todas as vidas!', VIRTUAL_WIDTH / 2, by + 100);

        const remaining = Math.max(0, 4.0 - (this.gameOverTimer || 0)).toFixed(1);
        const blink = Math.floor(performance.now() / 350) % 2 === 0;
        ctx.fillStyle = blink ? '#ffffff' : '#f87171';
        ctx.font = '10px "Press Start 2P", monospace, sans-serif';
        ctx.fillText(`TENTAR DE NOVO EM ${remaining}s... [ESPAÇO / A]`, VIRTUAL_WIDTH / 2, by + 155);
        ctx.restore();
    }

    initMobileTouchControls() {
        if (typeof document === 'undefined') return;

        const bindBtn = (id, onDown, onUp) => {
            const el = document.getElementById(id);
            if (!el) return;
            const start = (e) => {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
                el.classList.add('active');
                if (window.soundManager) window.soundManager.resume();
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    try { navigator.vibrate(15); } catch (err) {}
                }
                onDown();
            };
            const end = (e) => {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
                el.classList.remove('active');
                onUp();
            };
            el.addEventListener('touchstart', start, { passive: false });
            el.addEventListener('touchend', end, { passive: false });
            el.addEventListener('touchcancel', end, { passive: false });
            el.addEventListener('mousedown', start);
            el.addEventListener('mouseup', end);
            el.addEventListener('mouseleave', end);
        };

        bindBtn('btnTouchLeft', () => { this.keys.left = true; }, () => { this.keys.left = false; });
        bindBtn('btnTouchRight', () => { this.keys.right = true; }, () => { this.keys.right = false; });
        bindBtn('btnTouchUp', () => { this.keys.up = true; }, () => { this.keys.up = false; });
        bindBtn('btnTouchDown', () => { this.keys.down = true; }, () => { this.keys.down = false; });

        bindBtn('btnTouchA', () => {
            this.keys.up = true;
            this.keys.jump = true;
            this.keys.jumpHeld = true;
            this.keyboardJumpHeld = true;
            if (this.player) this.player.jumpBuffer = 0.2;
            if (this.currentPhase === 2 && window.soundManager) window.soundManager.playHorn();

            if (this.state === 'TITLE') {
                this.startGame();
            } else if (this.state === 'CUTSCENE') {
                this.advanceCutscene();
            } else if (this.state === 'LEVEL_CLEAR') {
                this.nextPhase();
            } else if (this.state === 'GAME_OVER') {
                this.restartLevel();
            }
        }, () => {
            this.keys.up = false;
            this.keyboardJumpHeld = false;
            if (!this.gamepadJumpHeld) {
                this.keys.jump = false;
                this.keys.jumpHeld = false;
            }
        });

        bindBtn('btnTouchB', () => {
            this.keys.down = true;
        }, () => {
            this.keys.down = false;
        });

        const soundBtn = document.getElementById('btnMobileSound');
        if (soundBtn) {
            const toggleSound = (e) => {
                if (e.cancelable) e.preventDefault();
                if (window.soundManager) {
                    const muted = window.soundManager.toggleMute();
                    soundBtn.textContent = muted ? '🔇' : '🔊';
                }
            };
            soundBtn.addEventListener('click', toggleSound);
            soundBtn.addEventListener('touchstart', toggleSound, { passive: false });
        }

        const fsBtn = document.getElementById('btnMobileFullscreen');
        if (fsBtn) {
            const toggleFs = (e) => {
                if (e.cancelable) e.preventDefault();
                this.toggleFullscreen();
            };
            fsBtn.addEventListener('click', toggleFs);
            fsBtn.addEventListener('touchstart', toggleFs, { passive: false });
        }
    }
'''

if 'initMobileTouchControls() {' not in code:
    code = code.replace('    start() {', banner_methods + '\n    start() {')
    print('[OK] Injected banner_methods before start()')

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(code)
print('[OK] Saved game.js')

with open('PC/game.js', 'w', encoding='utf-8') as f:
    f.write(code)
print('[OK] Saved PC/game.js')

mobile_code = code.replace(
    "ctx.fillText('PRESSIONE ENTER OU CLIQUE PARA JOGAR', VIRTUAL_WIDTH / 2, 480);",
    "ctx.fillText('TOQUE NA TELA OU NO BOTAO A PARA JOGAR', VIRTUAL_WIDTH / 2, 480);"
)
with open('celular/game.js', 'w', encoding='utf-8') as f:
    f.write(mobile_code)
print('[OK] Saved celular/game.js')
