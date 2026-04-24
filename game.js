// =============================================================================
//  VARIÁVEIS GLOBAIS
// =============================================================================
let volumeGlobal = 1.0;   

let gancho, linhaCorda, grupoObjetos;
let estadoGancho = 'BALANCANDO', anguloGancho = 0, balancandoParaDireita = true;
let velocidadeBalanço = 1.0, velocidadeMaxima = 4.0, velocidadeTiroPadrao = 8, objetoPuxado = null;

let moedasColetadas = 0;
let metaMoedas = 25;

let cenarioAtual = 1;
let faseNoCenario = 1;
let fragmentosAtuais = 0;
let reliquiasCompletas = 0;

let tempoRestante = 100;
let jogoAcabou = false;
let esperandoProximaFase = false;
let fragmentoRevelado = false;

let estamina = 150;
let estaminaMaxima = 150;

let graficoEnergia, graficoTempoPizza, graficoMarcadores;
let textoHUD, textoCentro;
let teclaEspaco;

let posicoesOcupadas = [];


// =============================================================================
//  FUNÇÕES DE SAVE (MEMORY CARD)
// =============================================================================
function salvarJogo() {
    let save = { cenario: cenarioAtual, fase: faseNoCenario, fragmentos: fragmentosAtuais, reliquias: reliquiasCompletas };
    localStorage.setItem('museuSave', JSON.stringify(save));
}

function carregarJogo() {
    let saveText = localStorage.getItem('museuSave');
    if (saveText) {
        let data = JSON.parse(saveText);
        cenarioAtual = data.cenario;
        faseNoCenario = data.fase;
        fragmentosAtuais = data.fragmentos;
        reliquiasCompletas = data.reliquias;
    }
}

function limparSave() {
    localStorage.removeItem('museuSave');
}


// =============================================================================
//  CENA 1: MENU PRINCIPAL
// =============================================================================
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const W = 1024, H = 768;

        let savedVol = localStorage.getItem('museuVolume');
        volumeGlobal = savedVol !== null ? parseFloat(savedVol) : 1.0;

        this.add.rectangle(0, 0, W, H / 2, 0x1a0800).setOrigin(0, 0);
        this.add.rectangle(0, H / 2, W, H / 2, 0x3e2000).setOrigin(0, 0);

        let moldura = this.add.graphics();
        moldura.lineStyle(3, 0xd4af37, 0.5);
        moldura.strokeRect(28, 28, W - 56, H - 56);
        moldura.lineStyle(1, 0xd4af37, 0.2);
        moldura.strokeRect(38, 38, W - 76, H - 76);

        this.moedas = [];
        for (let i = 0; i < 18; i++) {
            let c = this.add.circle(
                Phaser.Math.Between(50, W - 50),
                Phaser.Math.Between(0, H),
                Phaser.Math.Between(5, 18),
                Phaser.Math.RND.pick([0xd4af37, 0xffaa00, 0xffffff]),
                Phaser.Math.FloatBetween(0.05, 0.2)
            );
            c.velY = Phaser.Math.FloatBetween(0.3, 1.0);
            this.moedas.push(c);
        }

        this.pendGfx = this.add.graphics();
        this.pendAngle = 0;
        this.pendDir = 1;

        this.add.text(W / 2, 100, 'MUSEU DO OURO', {
            fontFamily: 'Arial', fontSize: '62px', fontStyle: 'bold', color: '#d4af37', stroke: '#5c3a00', strokeThickness: 7
        }).setOrigin(0.5);

        this.add.text(W / 2, 160, 'Gold Miner — Protótipo', {
            fontFamily: 'Arial', fontSize: '22px', color: '#bf8b6e'
        }).setOrigin(0.5);

        let div = this.add.graphics();
        div.lineStyle(2, 0xd4af37, 0.4);
        div.lineBetween(W / 2 - 220, 190, W / 2 + 220, 190);

        // Botoes
        this._criarBotao(W / 2, 260, 'NOVO JOGO', true, () => {
            limparSave();
            cenarioAtual = 1; faseNoCenario = 1; fragmentosAtuais = 0; reliquiasCompletas = 0;
            jogoAcabou = false; esperandoProximaFase = false;
            this.scene.start('GameScene');
        });

        let temSave = localStorage.getItem('museuSave') !== null;
        this._criarBotao(W / 2, 340, 'CONTINUAR', temSave, temSave ? () => {
            jogoAcabou = false; esperandoProximaFase = false;
            this.scene.start('GameScene');
        } : null);

        this._criarBotao(W / 2, 420, 'INVENTÁRIO', true, () => {
            this.scene.start('InventoryScene');
        });

        this._criarBotao(W / 2, 500, 'TUTORIAL', true, () => {
            this.scene.start('TutorialScene');
        });

        this._criarBotao(W / 2, 580, 'OPÇÕES', true, () => {
            this.scene.start('OptionsScene');
        });

        this.add.text(W / 2, 728, 'Projeto de Extensão — Análise e Desenvolvimento de Sistemas', {
            fontFamily: 'Arial', fontSize: '15px', color: '#664422'
        }).setOrigin(0.5);

        if (!temSave) {
            this.add.text(W / 2, 380, 'Nenhum save encontrado', {
                fontFamily: 'Arial', fontSize: '13px', color: '#554433'
            }).setOrigin(0.5);
        }
    }

    _criarBotao(x, y, label, ativo, callback) {
        const LG = 320, AL = 60, R = 12;
        let bg = this.add.graphics();
        const _desenharBg = (hover) => {
            bg.clear();
            if (!ativo) {
                bg.fillStyle(0x111111, 0.6);
                bg.fillRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
                bg.lineStyle(2, 0x3a2a1a, 1);
                bg.strokeRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
                return;
            }
            if (hover) {
                bg.fillStyle(0xd4af37, 0.18);
                bg.fillRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
                bg.lineStyle(3, 0xd4af37, 1);
                bg.strokeRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
            } else {
                bg.fillStyle(0x000000, 0.55);
                bg.fillRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
                bg.lineStyle(2, 0x8b6914, 1);
                bg.strokeRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
            }
        };
        _desenharBg(false);

        let txt = this.add.text(x, y, label, {
            fontFamily: 'Arial', fontSize: '26px', fontStyle: 'bold', color: ativo ? '#d4af37' : '#443322'
        }).setOrigin(0.5);

        if (!callback) return;

        let zona = this.add.zone(x, y, LG, AL).setInteractive({ useHandCursor: true });
        zona.on('pointerover',  () => { _desenharBg(true);  txt.setScale(1.06); });
        zona.on('pointerout',   () => { _desenharBg(false); txt.setScale(1.0);  });
        zona.on('pointerdown',  callback);
    }

    update() {
        this.pendAngle += 0.7 * this.pendDir;
        if (this.pendAngle >  50) this.pendDir = -1;
        if (this.pendAngle < -50) this.pendDir =  1;

        this.pendGfx.clear();
        this.pendGfx.lineStyle(3, 0xd4af37, 0.4);
        let rad = Phaser.Math.DegToRad(this.pendAngle);
        let cx = 512, cy = 48;
        let px = cx + Math.sin(rad) * 130;
        let py = cy + Math.cos(rad) * 130;
        this.pendGfx.lineBetween(cx, cy, px, py);
        this.pendGfx.fillStyle(0xd4af37, 0.5);
        this.pendGfx.fillCircle(px, py, 14);
        this.pendGfx.fillStyle(0x8b6914, 0.6);
        this.pendGfx.fillCircle(cx, cy, 6);

        for (let c of this.moedas) {
            c.y += c.velY;
            if (c.y > 800) c.y = -20;
        }
    }
}


// =============================================================================
//  CENA 2: INVENTÁRIO 
// =============================================================================
// =============================================================================
//  CENA 2: INVENTÁRIO (SISTEMA DE FRAGMENTAÇÃO)
// =============================================================================
class InventoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'InventoryScene' });
    }

    create() {
        const W = 1024, H = 768;

        // Fundo e moldura
        this.add.rectangle(0, 0, W, H / 2, 0x1a0800).setOrigin(0, 0);
        this.add.rectangle(0, H / 2, W, H / 2, 0x3e2000).setOrigin(0, 0);

        let moldura = this.add.graphics();
        moldura.lineStyle(3, 0xd4af37, 0.5);
        moldura.strokeRect(28, 28, W - 56, H - 56);

        this.add.text(W / 2, 100, 'SALA DE EXPOSIÇÃO', {
            fontFamily: 'Arial', fontSize: '50px', fontStyle: 'bold', color: '#d4af37', stroke: '#5c3a00', strokeThickness: 6
        }).setOrigin(0.5);
        
        this.add.text(W / 2, 150, 'Acompanhe a restauração das peças', {
            fontFamily: 'Arial', fontSize: '22px', color: '#bf8b6e'
        }).setOrigin(0.5);

        // Puxa relíquias e os FRAGMENTOS pendentes do save
        let reliquiasSalvas = 0;
        let fragmentosSalvos = 0;
        let saveText = localStorage.getItem('museuSave');
        if (saveText) {
            let data = JSON.parse(saveText);
            reliquiasSalvas = data.reliquias || 0;
            fragmentosSalvos = data.fragmentos || 0;
        }

        const coresReliquias = [0x8b4513, 0x1e90ff, 0x800080];
        const nomesReliquias = ["Artefato da Terra", "Cálice das Águas", "Coroa das Ruínas"];
        const espacamento = 250;
        const startX = W / 2 - espacamento;

        for (let i = 0; i < 3; i++) {
            let px = startX + (i * espacamento);
            let py = 350;

            // Fundo do vidro do pedestal
            let bgSlot = this.add.graphics();
            bgSlot.fillStyle(0x000000, 0.6);
            bgSlot.fillRoundedRect(px - 100, py - 120, 200, 240, 16);
            bgSlot.lineStyle(2, 0xd4af37, 0.8);
            bgSlot.strokeRoundedRect(px - 100, py - 120, 200, 240, 16);

            // Lógica braba: descobre quantos pedaços desenhar NESSE pedestal
            let fragsDestaReliquia = 0;
            if (reliquiasSalvas > i) {
                fragsDestaReliquia = 3; // Já completou essa
            } else if (reliquiasSalvas === i) {
                fragsDestaReliquia = fragmentosSalvos; // Tá montando essa
            } else {
                fragsDestaReliquia = 0; // Nem chegou nessa ainda
            }

            // Desenha os 3 pedaços (de baixo para cima)
            // Pedaço 1: Base (Larga e achatada)
            this._desenharFragmento(px, py + 30, 80, 30, coresReliquias[i], fragsDestaReliquia >= 1);
            // Pedaço 2: Corpo (Médio)
            this._desenharFragmento(px, py - 5, 60, 40, coresReliquias[i], fragsDestaReliquia >= 2);
            // Pedaço 3: Topo (Menor)
            this._desenharFragmento(px, py - 45, 50, 40, coresReliquias[i], fragsDestaReliquia >= 3);

            // Textos de Status
            if (fragsDestaReliquia === 3) {
                this.add.text(px, py + 85, nomesReliquias[i], {
                    fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#00ff00', align: 'center'
                }).setOrigin(0.5);
            } else if (fragsDestaReliquia > 0) {
                this.add.text(px, py + 85, `Restaurando...\n(${fragsDestaReliquia}/3)`, {
                    fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold', color: '#ffd700', align: 'center'
                }).setOrigin(0.5);
            } else {
                // Se tá zerado, mostra o Ponto de Interrogação grandão por cima do "fantasma" da relíquia
                this.add.text(px, py - 10, '?', {
                    fontFamily: 'Arial', fontSize: '60px', fontStyle: 'bold', color: '#443322'
                }).setOrigin(0.5);
                this.add.text(px, py + 85, 'Bloqueado', {
                    fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#443322', align: 'center'
                }).setOrigin(0.5);
            }
        }

        this._criarBotaoVoltar(W / 2, 650, () => { this.scene.start('MenuScene'); });
    }

    // Função marota pra desenhar a peça acesa (se pegou) ou apagada (fantasma)
    _desenharFragmento(x, y, w, h, cor, temPeca) {
        let gfx = this.add.graphics();
        if (temPeca) {
            gfx.fillStyle(cor, 1);
            gfx.fillRoundedRect(x - w/2, y - h/2, w, h, 4);
            gfx.lineStyle(2, 0xffffff, 0.6);
            gfx.strokeRoundedRect(x - w/2, y - h/2, w, h, 4);
        } else {
            // Desenha a silhueta pra dar o "gostinho" do encaixe pro jogador
            gfx.fillStyle(0x222222, 0.5);
            gfx.fillRoundedRect(x - w/2, y - h/2, w, h, 4);
            gfx.lineStyle(2, 0x444444, 0.5);
            gfx.strokeRoundedRect(x - w/2, y - h/2, w, h, 4);
        }
    }

    _criarBotaoVoltar(x, y, callback) {
        const LG = 280, AL = 62, R = 12;
        let bg = this.add.graphics();
        const _desenhar = (hover) => {
            bg.clear();
            if (hover) {
                bg.fillStyle(0xd4af37, 0.18);
                bg.fillRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
                bg.lineStyle(3, 0xd4af37, 1);
                bg.strokeRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
            } else {
                bg.fillStyle(0x000000, 0.5);
                bg.fillRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
                bg.lineStyle(2, 0x8b6914, 1);
                bg.strokeRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
            }
        };
        _desenhar(false);

        let txt = this.add.text(x, y, '← VOLTAR AO MENU', {
            fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', color: '#d4af37'
        }).setOrigin(0.5);

        let zona = this.add.zone(x, y, LG, AL).setInteractive({ useHandCursor: true });
        zona.on('pointerover',  () => { _desenhar(true);  txt.setScale(1.05); });
        zona.on('pointerout',   () => { _desenhar(false); txt.setScale(1.0);  });
        zona.on('pointerdown',  callback);
    }
}


// =============================================================================
//  CENA 3: TUTORIAL
// =============================================================================
class TutorialScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TutorialScene' });
    }

    create() {
        const W = 1024, H = 768;

        this.add.rectangle(0, 0, W, H / 2, 0x1a0800).setOrigin(0, 0);
        this.add.rectangle(0, H / 2, W, H / 2, 0x3e2000).setOrigin(0, 0);

        let moldura = this.add.graphics();
        moldura.lineStyle(3, 0xd4af37, 0.5);
        moldura.strokeRect(28, 28, W - 56, H - 56);

        this.add.text(W / 2, 100, 'COMO JOGAR', {
            fontFamily: 'Arial', fontSize: '50px', fontStyle: 'bold', color: '#d4af37', stroke: '#5c3a00', strokeThickness: 6
        }).setOrigin(0.5);

        let div = this.add.graphics();
        div.lineStyle(2, 0xd4af37, 0.4);
        div.lineBetween(W / 2 - 200, 150, W / 2 + 200, 150);

        let painel = this.add.graphics();
        painel.fillStyle(0x000000, 0.5);
        painel.fillRoundedRect(W / 2 - 350, 180, 700, 380, 16);
        painel.lineStyle(2, 0xd4af37, 0.8);
        painel.strokeRoundedRect(W / 2 - 350, 180, 700, 380, 16);

        let instrucoes = [
            "🎣 O gancho balança automaticamente de um lado para o outro.",
            "",
            "🖱️ Clique com o MOUSE ou aperte ESPAÇO para lançar a corda.",
            "",
            "⚙️ Pegou uma pedra muito pesada? SEGURE o clique/ESPAÇO",
            "para usar o BOOST de força. Mas cuidado: isso gasta Energia!",
            "",
            "💎 Junte moedas e diamantes para somar 25 Pontos e revelar",
            "o Fragmento de Relíquia perdido no cenário.",
            "",
            "⏳ Fique de olho no Relógio! Se o tempo acabar, é Game Over."
        ];

        this.add.text(W / 2, 370, instrucoes.join('\n'), {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff', align: 'center', lineSpacing: 5
        }).setOrigin(0.5);

        this._criarBotaoVoltar(W / 2, 650, () => { this.scene.start('MenuScene'); });
    }

    _criarBotaoVoltar(x, y, callback) {
        const LG = 280, AL = 62, R = 12;
        let bg = this.add.graphics();
        const _desenhar = (hover) => {
            bg.clear();
            if (hover) {
                bg.fillStyle(0xd4af37, 0.18);
                bg.fillRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
                bg.lineStyle(3, 0xd4af37, 1);
                bg.strokeRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
            } else {
                bg.fillStyle(0x000000, 0.5);
                bg.fillRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
                bg.lineStyle(2, 0x8b6914, 1);
                bg.strokeRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
            }
        };
        _desenhar(false);

        let txt = this.add.text(x, y, '← ENTENDIDO!', {
            fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', color: '#d4af37'
        }).setOrigin(0.5);

        let zona = this.add.zone(x, y, LG, AL).setInteractive({ useHandCursor: true });
        zona.on('pointerover',  () => { _desenhar(true);  txt.setScale(1.05); });
        zona.on('pointerout',   () => { _desenhar(false); txt.setScale(1.0);  });
        zona.on('pointerdown',  callback);
    }
}


// =============================================================================
//  CENA 4: OPÇÕES
// =============================================================================
class OptionsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OptionsScene' });
    }

    create() {
        const W = 1024, H = 768;
        this.arrastando = false;

        this.add.rectangle(0, 0, W, H / 2, 0x1a0800).setOrigin(0, 0);
        this.add.rectangle(0, H / 2, W, H / 2, 0x3e2000).setOrigin(0, 0);

        let moldura = this.add.graphics();
        moldura.lineStyle(3, 0xd4af37, 0.5);
        moldura.strokeRect(28, 28, W - 56, H - 56);

        this.add.text(W / 2, 120, 'OPÇÕES', {
            fontFamily: 'Arial', fontSize: '58px', fontStyle: 'bold', color: '#d4af37', stroke: '#5c3a00', strokeThickness: 7
        }).setOrigin(0.5);

        let div = this.add.graphics();
        div.lineStyle(2, 0xd4af37, 0.4);
        div.lineBetween(W / 2 - 220, 175, W / 2 + 220, 175);

        this.add.text(W / 2, 245, 'VOLUME', {
            fontFamily: 'Arial', fontSize: '28px', fontStyle: 'bold', color: '#bf8b6e'
        }).setOrigin(0.5);

        this.add.text(W / 2 - 240, 330, '🔇', { fontSize: '28px' }).setOrigin(0.5);
        this.add.text(W / 2 + 240, 330, '🔊', { fontSize: '28px' }).setOrigin(0.5);

        const SX = W / 2 - 200;
        const SY = 330;
        const SW = 400;
        this._SX = SX; this._SY = SY; this._SW = SW;

        let trilha = this.add.graphics();
        trilha.fillStyle(0x2a1800, 1);
        trilha.fillRoundedRect(SX, SY - 8, SW, 16, 8);
        trilha.lineStyle(1, 0x7a5c00, 1);
        trilha.strokeRoundedRect(SX, SY - 8, SW, 16, 8);

        this.sliderFill = this.add.graphics();
        this.handle = this.add.circle(SX + volumeGlobal * SW, SY, 20, 0xd4af37);
        this.handle.setStrokeStyle(3, 0x5c3a00);

        this.textoVol = this.add.text(W / 2, 390, `${Math.round(volumeGlobal * 100)}%`, {
            fontFamily: 'Arial', fontSize: '34px', fontStyle: 'bold', color: '#d4af37'
        }).setOrigin(0.5);

        this._atualizarSlider();

        let zonaSlider = this.add.zone(W / 2, SY, SW + 60, 70).setInteractive({ useHandCursor: true });
        zonaSlider.on('pointerdown', (ptr) => { this.arrastando = true; this._moverSlider(ptr.x); });
        this.input.on('pointermove', (ptr) => { if (this.arrastando) this._moverSlider(ptr.x); });
        this.input.on('pointerup',   () => { if (this.arrastando) { this.arrastando = false; localStorage.setItem('museuVolume', volumeGlobal); } });

        this._muteBg = this.add.graphics();
        this._muteTxt = this.add.text(W / 2, 480, '🔇  MUDO', {
            fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', color: volumeGlobal === 0 ? '#d4af37' : '#664422'
        }).setOrigin(0.5);

        this._desenharMute(volumeGlobal === 0);

        let zonaMute = this.add.zone(W / 2, 480, 200, 50).setInteractive({ useHandCursor: true });
        zonaMute.on('pointerdown', () => {
            if (volumeGlobal > 0) {
                this._volAntesMute = volumeGlobal;
                this._moverSlider(this._SX);
            } else {
                this._moverSlider(this._SX + (this._volAntesMute || 1.0) * this._SW);
            }
            localStorage.setItem('museuVolume', volumeGlobal);
        });

        this._criarBotaoVoltar(W / 2, 620, () => { this.scene.start('MenuScene'); });

        this.add.text(W / 2, 730, 'O volume será aplicado assim que o jogo iniciar', {
            fontFamily: 'Arial', fontSize: '14px', color: '#664422'
        }).setOrigin(0.5);
    }

    _moverSlider(mouseX) {
        let novoX = Phaser.Math.Clamp(mouseX, this._SX, this._SX + this._SW);
        volumeGlobal = (novoX - this._SX) / this._SW;
        this.handle.x = novoX;
        this.textoVol.setText(`${Math.round(volumeGlobal * 100)}%`);
        this._atualizarSlider();
        this._desenharMute(volumeGlobal === 0);
        this._muteTxt.setColor(volumeGlobal === 0 ? '#d4af37' : '#664422');
        this.sound.volume = volumeGlobal;
    }

    _atualizarSlider() {
        this.sliderFill.clear();
        if (volumeGlobal > 0) {
            this.sliderFill.fillStyle(0xd4af37, 1);
            this.sliderFill.fillRoundedRect(this._SX, this._SY - 8, volumeGlobal * this._SW, 16, { tl: 8, bl: 8, tr: 0, br: 0 });
        }
    }

    _desenharMute(ativo) {
        this._muteBg.clear();
        this._muteBg.lineStyle(2, ativo ? 0xd4af37 : 0x443322, 1);
        this._muteBg.strokeRoundedRect(1024 / 2 - 90, 458, 180, 45, 8);
    }

    _criarBotaoVoltar(x, y, callback) {
        const LG = 280, AL = 62, R = 12;
        let bg = this.add.graphics();
        const _desenhar = (hover) => {
            bg.clear();
            if (hover) {
                bg.fillStyle(0xd4af37, 0.18);
                bg.fillRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
                bg.lineStyle(3, 0xd4af37, 1);
                bg.strokeRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
            } else {
                bg.fillStyle(0x000000, 0.5);
                bg.fillRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
                bg.lineStyle(2, 0x8b6914, 1);
                bg.strokeRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
            }
        };
        _desenhar(false);

        let txt = this.add.text(x, y, '← VOLTAR AO MENU', {
            fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', color: '#d4af37'
        }).setOrigin(0.5);

        let zona = this.add.zone(x, y, LG, AL).setInteractive({ useHandCursor: true });
        zona.on('pointerover',  () => { _desenhar(true);  txt.setScale(1.05); });
        zona.on('pointerout',   () => { _desenhar(false); txt.setScale(1.0);  });
        zona.on('pointerdown',  callback);
    }
}


// =============================================================================
//  CENA 5: PAUSA
// =============================================================================
class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
    }

    init(data) {
        this.parentScene = data.parentScene || 'GameScene';
    }

    create() {
        const W = 1024, H = 768;
        this.arrastando = false;

        this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0, 0);

        let painel = this.add.graphics();
        painel.fillStyle(0x120f09, 0.95);
        painel.fillRoundedRect(162, 128, 700, 512, 18);
        painel.lineStyle(3, 0xd4af37, 1);
        painel.strokeRoundedRect(162, 128, 700, 512, 18);

        this.add.text(W / 2, 190, 'PAUSADO', {
            fontFamily: 'Arial', fontSize: '58px', fontStyle: 'bold', color: '#d4af37', stroke: '#5c3a00', strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(W / 2, 250, 'Ajuste o volume antes de retomar o jogo', {
            fontFamily: 'Arial', fontSize: '22px', color: '#bf8b6e'
        }).setOrigin(0.5);

        const SX = W / 2 - 200;
        const SY = 340;
        const SW = 400;
        this._SX = SX; this._SY = SY; this._SW = SW;

        let trilha = this.add.graphics();
        trilha.fillStyle(0x2a1800, 1);
        trilha.fillRoundedRect(SX, SY - 8, SW, 16, 8);
        trilha.lineStyle(1, 0x7a5c00, 1);
        trilha.strokeRoundedRect(SX, SY - 8, SW, 16, 8);

        this.sliderFill = this.add.graphics();
        this.handle = this.add.circle(SX + volumeGlobal * SW, SY, 20, 0xd4af37);
        this.handle.setStrokeStyle(3, 0x5c3a00);

        this.textoVol = this.add.text(W / 2, 400, `${Math.round(volumeGlobal * 100)}%`, {
            fontFamily: 'Arial', fontSize: '34px', fontStyle: 'bold', color: '#d4af37'
        }).setOrigin(0.5);

        this._atualizarSlider();

        let zonaSlider = this.add.zone(W / 2, SY, SW + 60, 70).setInteractive({ useHandCursor: true });
        zonaSlider.on('pointerdown', (ptr) => { this.arrastando = true; this._moverSlider(ptr.x); });
        this.input.on('pointermove', (ptr) => { if (this.arrastando) this._moverSlider(ptr.x); });
        this.input.on('pointerup',   () => { if (this.arrastando) { this.arrastando = false; localStorage.setItem('museuVolume', volumeGlobal); } });

        this._muteBg = this.add.graphics();
        this._muteTxt = this.add.text(W / 2, 470, '🔇  MUDO', {
            fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', color: volumeGlobal === 0 ? '#d4af37' : '#664422'
        }).setOrigin(0.5);
        this._desenharMute(volumeGlobal === 0);

        let zonaMute = this.add.zone(W / 2, 470, 200, 50).setInteractive({ useHandCursor: true });
        zonaMute.on('pointerdown', () => {
            if (volumeGlobal > 0) {
                this._volAntesMute = volumeGlobal;
                this._moverSlider(this._SX);
            } else {
                this._moverSlider(this._SX + (this._volAntesMute || 1.0) * this._SW);
            }
            localStorage.setItem('museuVolume', volumeGlobal);
        });

        this._criarBotao(W / 2, 540, 'CONTINUAR', true, () => { this._retomarJogo(); });
        this._criarBotao(W / 2, 620, 'MENU INICIAL', true, () => {
            this.scene.stop(this.parentScene);
            this.scene.stop();
            this.scene.start('MenuScene');
        });

        this.input.keyboard.on('keydown-ESC', () => { this._retomarJogo(); });
        this.input.keyboard.on('keydown-SPACE', () => { this._retomarJogo(); });
    }

    _moverSlider(mouseX) {
        let novoX = Phaser.Math.Clamp(mouseX, this._SX, this._SX + this._SW);
        volumeGlobal = (novoX - this._SX) / this._SW;
        this.handle.x = novoX;
        this.textoVol.setText(`${Math.round(volumeGlobal * 100)}%`);
        this._atualizarSlider();
        this._desenharMute(volumeGlobal === 0);
        this._muteTxt.setColor(volumeGlobal === 0 ? '#d4af37' : '#664422');
        this.sound.volume = volumeGlobal;
        this.scene.get(this.parentScene).sound.volume = volumeGlobal;
    }

    _atualizarSlider() {
        this.sliderFill.clear();
        if (volumeGlobal > 0) {
            this.sliderFill.fillStyle(0xd4af37, 1);
            this.sliderFill.fillRoundedRect(this._SX, this._SY - 8, volumeGlobal * this._SW, 16, { tl: 8, bl: 8, tr: 0, br: 0 });
        }
    }

    _desenharMute(ativo) {
        this._muteBg.clear();
        this._muteBg.lineStyle(2, ativo ? 0xd4af37 : 0x443322, 1);
        this._muteBg.strokeRoundedRect(1024 / 2 - 90, 448, 180, 45, 8);
    }

    _criarBotao(x, y, label, ativo, callback) {
        const LG = 320, AL = 68, R = 12;
        let bg = this.add.graphics();
        const _desenharBg = (hover) => {
            bg.clear();
            if (hover) {
                bg.fillStyle(0xd4af37, 0.18);
                bg.fillRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
                bg.lineStyle(3, 0xd4af37, 1);
                bg.strokeRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
            } else {
                bg.fillStyle(0x000000, 0.5);
                bg.fillRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
                bg.lineStyle(2, 0x8b6914, 1);
                bg.strokeRoundedRect(x - LG / 2, y - AL / 2, LG, AL, R);
            }
        };
        _desenharBg(false);

        let txt = this.add.text(x, y, label, {
            fontFamily: 'Arial', fontSize: '30px', fontStyle: 'bold', color: '#d4af37'
        }).setOrigin(0.5);

        let zona = this.add.zone(x, y, LG, AL).setInteractive({ useHandCursor: true });
        zona.on('pointerover',  () => { _desenharBg(true);  txt.setScale(1.06); });
        zona.on('pointerout',   () => { _desenharBg(false); txt.setScale(1.0);  });
        zona.on('pointerdown',  callback);
    }

    _retomarJogo() {
        this.scene.stop();
        this.scene.resume(this.parentScene);
    }
}


// =============================================================================
//  CENA 6: JOGO PRINCIPAL
// =============================================================================
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }
    preload() { preload.call(this); }
    create()  { 
        this.sound.volume = volumeGlobal;
        create.call(this);  
    }
    update()  { update.call(this);  }
}

GameScene.prototype._criarBotaoPausa = function(x, y) {
    const size = 62;
    let bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.4);
    bg.fillRoundedRect(x - size / 2, y - size / 2, size, size, 14);
    bg.lineStyle(2, 0xd4af37, 1);
    bg.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 14);
    this.add.text(x, y, '⏸', { fontFamily: 'Arial', fontSize: '30px', color: '#d4af37' }).setOrigin(0.5);

    this.pauseZone = this.add.zone(x, y, size, size).setInteractive({ useHandCursor: true });
    this.pauseZone.on('pointerdown', () => { this._abrirMenuPausa(); });
};

GameScene.prototype._abrirMenuPausa = function() {
    if (this.scene.isPaused()) return;
    this.scene.launch('PauseScene', { parentScene: this.scene.key });
    this.scene.pause();
};

// =============================================================================
//  LÓGICA CORE DO JOGO (SISTEMA MARRETA)
// =============================================================================
function preload() {}

function create() {
    carregarJogo();

    textoHUD = this.add.text(10, 10, '', { font: '22px Arial', fill: '#fff', fontStyle: 'bold' });
    textoCentro = this.add.text(512, 384, '', { font: '45px Arial', fill: '#00ff00', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);

    let cx = 920;
    let cy = 100;

    let fundoEnergia = this.add.graphics();
    fundoEnergia.lineStyle(12, 0xff0000, 1);
    fundoEnergia.strokeCircle(cx, cy, 56);

    graficoEnergia = this.add.graphics();
    this.add.circle(cx, cy, 50, 0xbf8b6e);
    graficoTempoPizza = this.add.graphics({x: cx, y: cy});

    let marcadores = this.add.graphics({x: cx, y: cy});
    marcadores.lineStyle(3, 0x000000, 1);
    marcadores.lineBetween(0, -40, 0, -50);
    marcadores.lineBetween(40, 0, 50, 0);
    marcadores.lineBetween(0, 40, 0, 50);
    marcadores.lineBetween(-40, 0, -50, 0);

    grupoObjetos = this.physics.add.group();
    linhaCorda = this.add.graphics();

    gancho = this.add.rectangle(512, 100, 25, 20, 0xffffff);
    this.physics.add.existing(gancho);

    this.physics.add.overlap(gancho, grupoObjetos, pegarObjeto, null, this);
    this.input.on('pointerdown', (pointer) => acaoPrincipal.call(this, pointer), this);
    teclaEspaco = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.teclaEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.teclaM = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this._criarBotaoPausa(994, 26);

    this.time.addEvent({ delay: 1000, callback: diminuirTempo, callbackScope: this, loop: true });

    montarFase.call(this);
}

function atualizarHUD() {
    textoHUD.setText(`Cenário: ${cenarioAtual} - Fase: ${faseNoCenario} | Pontos: ${moedasColetadas}/${metaMoedas}\nFragmentos: ${fragmentosAtuais}/3 | Inventário: ${reliquiasCompletas}/3`);
}

function acharPosicaoValida(raioNovoItem) {
    let maxTentativas = 100;
    for(let t = 0; t < maxTentativas; t++) {
        let x = Phaser.Math.Between(50, 974);
        let y = Phaser.Math.Between(250, 700);
        let sobreposto = false;

        for(let pos of posicoesOcupadas) {
            if(Phaser.Math.Distance.Between(x, y, pos.x, pos.y) < (raioNovoItem + pos.raio + 5)) {
                sobreposto = true;
                break;
            }
        }

        if(!sobreposto) {
            posicoesOcupadas.push({x: x, y: y, raio: raioNovoItem});
            return {x: x, y: y};
        }
    }
    return {x: Phaser.Math.Between(100, 900), y: Phaser.Math.Between(300, 700)};
}

function montarFase() {
    grupoObjetos.clear(true, true);
    posicoesOcupadas = [];
    moedasColetadas = 0;

    tempoRestante = 100;
    estamina = 150;
    fragmentoRevelado = false;

    let degrauDificuldade = ((cenarioAtual - 1) * 3) + (faseNoCenario - 1);
    velocidadeBalanço = 1.0 + (degrauDificuldade * 0.15);
    if (velocidadeBalanço > velocidadeMaxima) velocidadeBalanço = velocidadeMaxima;

    if (cenarioAtual === 1) this.cameras.main.setBackgroundColor('#3e2723');
    else if (cenarioAtual === 2) this.cameras.main.setBackgroundColor('#1a237e');
    else if (cenarioAtual === 3) this.cameras.main.setBackgroundColor('#b71c1c');

    atualizarHUD();
    textoCentro.setText('');

    // Gerador blindado: Diamante tá levinho (0.5)!
    for(let i = 0; i < 18; i++) {
        let chance = Phaser.Math.Between(1, 100);
        let raio, valor, peso, cor;

        if (chance > 85) {
            raio = 10; valor = 5; peso = 0.5; cor = 0xffffff;
        } else if (chance > 50) {
            raio = 25; valor = 3; peso = 1.5; cor = 0xd4af37;
        } else {
            raio = 15; valor = 1; peso = 1.0; cor = 0xffaa00;
        }

        let pos = acharPosicaoValida(raio);
        let item = this.add.circle(pos.x, pos.y, raio, cor);
        this.physics.add.existing(item);
        item.tipo = 'moeda'; item.peso = peso; item.valor = valor;
        grupoObjetos.add(item);
    }

    for(let i = 0; i < 9; i++) {
        let chance = Phaser.Math.Between(1, 100);
        let raio, peso, cor;

        if (chance > 60) {
            raio = 45; peso = 8.0; cor = 0x444444;
        } else {
            raio = 20; peso = 4.0; cor = 0x888888;
        }

        let pos = acharPosicaoValida(raio);
        let pedra = this.add.circle(pos.x, pos.y, raio, cor);
        this.physics.add.existing(pedra);
        pedra.tipo = 'pedra_pesada'; pedra.peso = peso; pedra.valor = 0;
        grupoObjetos.add(pedra);
    }
}

function spawnarFragmento() {
    textoCentro.setText('FRAGMENTO REVELADO!\nCapture-o rápido!');
    textoCentro.setColor('#00ffff');

    this.time.delayedCall(2500, () => {
        if (!esperandoProximaFase && !jogoAcabou) textoCentro.setText('');
    });

    let pos = acharPosicaoValida(25);
    let fragmentoFisico = this.add.rectangle(pos.x, pos.y, 25, 25, 0x00ffff);
    this.physics.add.existing(fragmentoFisico);

    fragmentoFisico.tipo = 'fragmento';
    fragmentoFisico.peso = 2;
    fragmentoFisico.valor = 0;

    grupoObjetos.add(fragmentoFisico);
}

function diminuirTempo() {
    if (jogoAcabou || esperandoProximaFase) return;
    tempoRestante--;

    if (tempoRestante <= 0) {
        jogoAcabou = true;
        textoCentro.setText('TEMPO ESGOTADO!\nGAME OVER.');
        textoCentro.setColor('#ff0000');
        limparSave();
        mostrarControlesGameOver.call(this);
    }
}

function mostrarControlesGameOver() {
    if (this.gameOverDrawn) return;

    const W = 1024;
    this.add.rectangle(W / 2, 530, 680, 90, 0x000000, 0.55).setOrigin(0.5);
    this.add.text(W / 2, 500, 'Pressione ESPAÇO ou clique para reiniciar. Pressione M para retornar ao menu.', {
        fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', align: 'center'
    }).setOrigin(0.5);

    this.gameOverDrawn = true;
}

function reiniciarFase() {
    if (!jogoAcabou) return;
    jogoAcabou = false;
    esperandoProximaFase = false;
    this.gameOverDrawn = false;
    montarFase.call(this);
}

function acaoPrincipal(pointer) {
    if (jogoAcabou) {
        reiniciarFase.call(this);
        return;
    }
    if (pointer && this.pauseZone) {
        let bounds = this.pauseZone.getBounds();
        if (pointer.x >= bounds.x && pointer.x <= bounds.right && pointer.y >= bounds.y && pointer.y <= bounds.bottom) {
            return;
        }
    }

    if (esperandoProximaFase) {
        esperandoProximaFase = false;
        montarFase.call(this);
    } else if (estadoGancho === 'BALANCANDO') {
        estadoGancho = 'DESCENDO';
    }
}

function update() {
    if (jogoAcabou) {
        if (Phaser.Input.Keyboard.JustDown(this.teclaEsc) || Phaser.Input.Keyboard.JustDown(this.teclaM)) {
            this.scene.start('MenuScene');
            return;
        }
        if (Phaser.Input.Keyboard.JustDown(teclaEspaco) || this.input.activePointer.justDown) {
            reiniciarFase.call(this);
            return;
        }
        return;
    }
    if (esperandoProximaFase) return;

    if (Phaser.Input.Keyboard.JustDown(this.teclaEsc)) {
        this._abrirMenuPausa();
        return;
    }

    linhaCorda.clear();
    linhaCorda.lineStyle(3, 0xaaaaaa, 1);
    linhaCorda.beginPath();
    linhaCorda.moveTo(512, 50);
    linhaCorda.lineTo(gancho.x, gancho.y);
    linhaCorda.strokePath();

    let radianos = Phaser.Math.DegToRad(anguloGancho);
    let apertouBotao = Phaser.Input.Keyboard.JustDown(teclaEspaco) || this.input.activePointer.justDown;
    let segurandoBotao = teclaEspaco.isDown || this.input.activePointer.isDown;
    let taDandoBoost = (estadoGancho === 'SUBINDO' && objetoPuxado && objetoPuxado.tipo === 'pedra_pesada' && segurandoBotao && estamina >= 1.5);

    if (!taDandoBoost && estamina < estaminaMaxima) {
        estamina += 0.15;
        if (estamina > estaminaMaxima) estamina = estaminaMaxima;
    }

    graficoEnergia.clear();
    let porcentagemE = estamina / estaminaMaxima;

    if (porcentagemE > 0) {
        if (porcentagemE < 0.20) graficoEnergia.lineStyle(12, 0xffff00, 1);
        else graficoEnergia.lineStyle(12, 0x00ff00, 1);

        graficoEnergia.beginPath();
        let anguloFimE = (-Math.PI / 2) + (porcentagemE * 2 * Math.PI);
        graficoEnergia.arc(920, 100, 56, -Math.PI / 2, anguloFimE, false);
        graficoEnergia.strokePath();
    }

    graficoTempoPizza.clear();
    let porcentagemTempoPerdido = (100 - tempoRestante) / 100;

    if (porcentagemTempoPerdido > 0) {
        graficoTempoPizza.fillStyle(0x111111, 0.85);
        graficoTempoPizza.beginPath();
        graficoTempoPizza.moveTo(0, 0);

        let anguloInicioPizza = -Math.PI / 2;
        let anguloFimPizza = anguloInicioPizza + (porcentagemTempoPerdido * 2 * Math.PI);

        graficoTempoPizza.arc(0, 0, 50, anguloInicioPizza, anguloFimPizza, false);
        graficoTempoPizza.closePath();
        graficoTempoPizza.fillPath();
    }

    if (estadoGancho === 'BALANCANDO') {
        if (apertouBotao) acaoPrincipal.call(this);

        if (balancandoParaDireita) {
            anguloGancho += velocidadeBalanço;
            if (anguloGancho >= 75) balancandoParaDireita = false;
        } else {
            anguloGancho -= velocidadeBalanço;
            if (anguloGancho <= -75) balancandoParaDireita = true;
        }

        let tamanhoDaCorda = 135;

        gancho.x = 512 + Math.sin(radianos) * tamanhoDaCorda;
        gancho.y = 50  + Math.cos(radianos) * tamanhoDaCorda;
        gancho.angle = -anguloGancho;
    }
    else if (estadoGancho === 'DESCENDO') {
        gancho.x += Math.sin(radianos) * velocidadeTiroPadrao;
        gancho.y += Math.cos(radianos) * velocidadeTiroPadrao;
        if (gancho.x < 0 || gancho.x > 1024 || gancho.y > 768) estadoGancho = 'SUBINDO';
    }
    else if (estadoGancho === 'SUBINDO') {
        let velocidadeAtual = objetoPuxado ? velocidadeTiroPadrao / objetoPuxado.peso : velocidadeTiroPadrao * 1.5;

        if (taDandoBoost) {
            estamina -= 1.5;
            gancho.x -= Math.sin(radianos) * 3.5;
            gancho.y -= Math.cos(radianos) * 3.5;
        }

        if (objetoPuxado) {
            objetoPuxado.x = gancho.x;
            objetoPuxado.y = gancho.y;
        }

        gancho.x -= Math.sin(radianos) * velocidadeAtual;
        gancho.y -= Math.cos(radianos) * velocidadeAtual;

        // O SEGREDO TÁ AQUI EMBAIXO: Tirei aquela maracutaia de velocidade aleatória que quebrou seu jogo. 
        if (gancho.y <= 100) {
            estadoGancho = 'BALANCANDO';
            // Deixei só o angulo mudando pra garra não cair sempre reta
            anguloGancho = Phaser.Math.Between(-55, 55); 
            balancandoParaDireita = anguloGancho < 0 ? true : Phaser.Math.Between(0, 1) === 0;

            if (objetoPuxado) {
                if (objetoPuxado.tipo === 'moeda') {
                    moedasColetadas += objetoPuxado.valor;

                    if (moedasColetadas >= metaMoedas && !fragmentoRevelado) {
                        fragmentoRevelado = true;
                        spawnarFragmento.call(this);
                    }
                }
                else if (objetoPuxado.tipo === 'fragmento') {
                    fragmentosAtuais++;
                    faseNoCenario++;

                    if (fragmentosAtuais >= 3) {
                        reliquiasCompletas++;
                        cenarioAtual++;
                        fragmentosAtuais = 0;
                        faseNoCenario = 1;

                        if (reliquiasCompletas >= 3) {
                            jogoAcabou = true;
                            textoCentro.setText('PARABÉNS! VOCÊ ZEROU O MUSEU!\n3 Relíquias no Inventário!');
                            textoCentro.setColor('#00ff00');
                            limparSave();
                        } else {
                            textoCentro.setText(`CENÁRIO CONCLUÍDO!\nRelíquia guardada no Inventário.\nClique para iniciar o Cenário ${cenarioAtual}.`);
                            textoCentro.setColor('#00ff00');
                            esperandoProximaFase = true;
                            salvarJogo();
                        }
                    } else {
                        textoCentro.setText(`FRAGMENTO CAPTURADO!\nFase ${faseNoCenario} liberada.\nClique para continuar.`);
                        textoCentro.setColor('#00ff00');
                        esperandoProximaFase = true;
                        salvarJogo();
                    }
                }
                objetoPuxado.destroy();
                objetoPuxado = null;
                atualizarHUD();
            }
        }
    }
}

function pegarObjeto(ganchoObjeto, objetoAtingido) {
    if (estadoGancho === 'DESCENDO') {
        estadoGancho = 'SUBINDO';
        objetoPuxado = objetoAtingido;
    }
}


// =============================================================================
//  CONFIGURAÇÃO E INICIALIZAÇÃO DO PHASER
// =============================================================================
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1024,
        height: 768
    },
    parent: 'game-container',
    backgroundColor: '#1a0800',
    physics: { default: 'arcade', arcade: { debug: false } },
    fps: { target: 60, forceSetTimeOut: true },
    // AQUI ESTÃO TODAS AS SUAS CENAS BLINDADAS:
    scene: [MenuScene, InventoryScene, TutorialScene, OptionsScene, GameScene, PauseScene]
};

const game = new Phaser.Game(config);