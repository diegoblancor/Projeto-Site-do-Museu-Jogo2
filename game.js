// =============================================================================
// 1. VARIÁVEIS GLOBAIS E CONFIGURAÇÕES
// =============================================================================
let volumeGlobal = 1.0;   

let gancho, linhaCorda, grupoObjetos;
let estadoGancho = 'BALANCANDO', anguloGancho = 0, balancandoParaDireita = true;

const velocidadeMaxima = 4.0;
const velocidadeTiroPadrao = 8;
let velocidadeBalanço = 1.0, objetoPuxado = null;

let moedasColetadas = 0;
const metaMoedas = 25;

let cenarioAtual = 1;
let faseNoCenario = 1;
let fragmentosAtuais = 0;
let reliquiasCompletas = 0;

let tempoRestante = 100;
let jogoAcabou = false;
let esperandoProximaFase = false;
let fragmentoRevelado = false;
let jogoVencido = false;

let estamina = 150;
const estaminaMaxima = 150;

let graficoTempoPizza;
let textoHUD, textoCentro, barraEstamina, labelBoost, textoRelogio;
let teclaEspaco;

let gameOverRetangulo = null, gameOverTexto = null;

let posicoesOcupadas = [];
let musicaFase; // Armazena a trilha sonora atual

// =============================================================================
// 2. SISTEMA DE MEMORY CARD (LOCALSTORAGE)
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
// 3. TELA INICIAL (MENU PRINCIPAL)
// =============================================================================
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        this.load.image('fundo_capa', 'img/capa.png');
        this.load.image('ui_botao', 'img/placeholder_botao.png'); 
        this.load.audio('musica_cenario_1', 'audio/primeira-musica.mp3');
        this.load.audio('musica_cenario_2', 'audio/segunda-musica.mp3');
        this.load.audio('musica_cenario_3', 'audio/terceira-musica.mp3');
    }

    create() {
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;

        carregarJogo();

        let savedVol = localStorage.getItem('museuVolume');
        volumeGlobal = savedVol !== null ? parseFloat(savedVol) : 1.0;

        let fundo = this.add.image(W / 2, H / 2, 'fundo_capa');
        fundo.setDisplaySize(W, H);

        // this.add.rectangle(0, 0, W, H, 0x000000, 0.4).setOrigin(0, 0);

        // Grade 2/2/1 no canto inferior esquerdo
        const colX1   = 155;     // centro da coluna esquerda
        const colX2   = 305;     // centro da coluna direita
        const colGap  = colX2 - colX1;
        const linhaH  = 48;      // distância entre linhas
        const linha3  = H - 150; // Y da última linha (OPÇÕES)
        const linha2  = linha3 - linhaH;
        const linha1  = linha2 - linhaH;

        this._criarBotaoSprite(colX1, linha1, 'NOVO JOGO', true, () => {
            limparSave();
            cenarioAtual = 1; faseNoCenario = 1; fragmentosAtuais = 0; reliquiasCompletas = 0;
            jogoAcabou = false; esperandoProximaFase = false; jogoVencido = false;
            this.scene.start('GameScene');
        });

        let saveText = localStorage.getItem('museuSave');
        let temSave = saveText !== null;
        let savePodesContinuar = temSave && (() => {
            try {
                let data = JSON.parse(saveText);
                return !data.reliquias || data.reliquias < 3; // Só pode continuar se NÃO completou as 3 relíquias
            } catch {
                return true;
            }
        })();

        this._criarBotaoSprite(colX2, linha1, 'CONTINUAR', savePodesContinuar, savePodesContinuar ? () => {
            jogoAcabou = false; esperandoProximaFase = false; jogoVencido = false;
            this.scene.start('GameScene');
        } : null);

        if (!savePodesContinuar && temSave) {
            this.add.text(colX2, linha1 + 24, 'Jogo Completo!', {
                fontFamily: 'Arial', fontSize: '11px', color: '#00ff00', align: 'center'
            }).setOrigin(0.5);
        } else if (!temSave) {
            this.add.text(colX2, linha1 + 24, 'Sem save', {
                fontFamily: 'Arial', fontSize: '11px', color: '#aaaaaa'
            }).setOrigin(0.5);
        }

        this._criarBotaoSprite(colX1, linha2, 'INVENTÁRIO', true, () => {
            this.scene.start('InventoryScene');
        });

        this._criarBotaoSprite(colX2, linha2, 'TUTORIAL', true, () => {
            this.scene.start('TutorialScene');
        });

        this._criarBotaoSprite(colX1 + colGap / 2, linha3, 'OPÇÕES', true, () => {
            this.scene.start('OptionsScene');
        });

        this.add.text(W / 2, H - 14, 'Projeto de Extensão — Análise e Desenvolvimento de Sistemas', {
            fontFamily: 'Arial', fontSize: '12px', color: '#dddddd'
        }).setOrigin(0.5);
    }

    _criarBotaoSprite(x, y, label, ativo, callback) {
        let btn = this.add.sprite(x, y, 'ui_botao').setInteractive({ useHandCursor: ativo });
        btn.setDisplaySize(125, 38);

        if (!ativo) {
            btn.setTint(0x555555);
        }

        let txt = this.add.text(x, y, label, {
            fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold', color: ativo ? '#d4af37' : '#999999'
        }).setOrigin(0.5);

        if (!callback) return;

        btn.on('pointerover',  () => { btn.setTint(0xffd700); txt.setScale(1.06); });
        btn.on('pointerout',   () => { btn.clearTint(); txt.setScale(1.0);  });
        btn.on('pointerdown',  callback);
    }
}

// =============================================================================
// 4. SALA DE EXPOSIÇÃO (INVENTÁRIO)
// =============================================================================
class InventoryScene extends Phaser.Scene {
    constructor() { super({ key: 'InventoryScene' }); }

    preload() {
        this.load.image('ui_botao', 'img/placeholder_botao.png');
        this.load.image('ui_slot_reliquia', 'img/placeholder_slot.png');
        this.load.image('spr_fragmento_inv', 'img/placeholder_frag_inv.png');
    }

    create() {
        const W = this.cameras.main.width, H = this.cameras.main.height;

        this.add.rectangle(0, 0, W, H / 2, 0x1a0800).setOrigin(0, 0);
        this.add.rectangle(0, H / 2, W, H / 2, 0x3e2000).setOrigin(0, 0);

        let moldura = this.add.graphics();
        moldura.lineStyle(3, 0xd4af37, 0.5);
        moldura.strokeRect(28, 28, W - 56, H - 56);

        this.add.text(W / 2, 100, 'SALA DE EXPOSIÇÃO', {
            fontFamily: 'Arial', fontSize: '50px', fontStyle: 'bold', color: '#d4af37', stroke: '#5c3a00', strokeThickness: 6
        }).setOrigin(0.5);
        
        let reliquiasSalvas = 0, fragmentosSalvos = 0;
        let saveText = localStorage.getItem('museuSave');
        if (saveText) {
            let data = JSON.parse(saveText);
            reliquiasSalvas = data.reliquias || 0;
            fragmentosSalvos = data.fragmentos || 0;
        }

        const nomesReliquias = ["Artefato da Terra", "Cálice das Águas", "Coroa das Ruínas"];
        const espacamento = 250;
        const startX = W / 2 - espacamento;

        for (let i = 0; i < 3; i++) {
            let px = startX + (i * espacamento);
            let py = 350;

            let slotImg = this.add.sprite(px, py, 'ui_slot_reliquia');
            slotImg.setDisplaySize(200, 240);

            let fragsDestaReliquia = (reliquiasSalvas > i) ? 3 : ((reliquiasSalvas === i) ? fragmentosSalvos : 0);

            this._renderizarFragmento(px, py + 30, fragsDestaReliquia >= 1);
            this._renderizarFragmento(px, py - 5, fragsDestaReliquia >= 2);
            this._renderizarFragmento(px, py - 45, fragsDestaReliquia >= 3);

            if (fragsDestaReliquia === 3) {
                this.add.text(px, py + 85, nomesReliquias[i], {
                    fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#00ff00', align: 'center'
                }).setOrigin(0.5);
            } else if (fragsDestaReliquia > 0) {
                this.add.text(px, py + 85, `Restaurando...\n(${fragsDestaReliquia}/3)`, {
                    fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold', color: '#ffd700', align: 'center'
                }).setOrigin(0.5);
            } else {
                this.add.text(px, py - 10, '?', { fontFamily: 'Arial', fontSize: '60px', fontStyle: 'bold', color: '#443322' }).setOrigin(0.5);
                this.add.text(px, py + 85, 'Bloqueado', { fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#443322', align: 'center' }).setOrigin(0.5);
            }
        }

        this._criarBotaoVoltar(W / 2, 650, () => { this.scene.start('MenuScene'); });
    }

    _renderizarFragmento(x, y, temPeca) {
        let frag = this.add.sprite(x, y, 'spr_fragmento_inv');
        frag.setDisplaySize(60, 30);
        if (!temPeca) frag.setTint(0x222222);
    }

    _criarBotaoVoltar(x, y, callback) {
        let btn = this.add.sprite(x, y, 'ui_botao').setInteractive({ useHandCursor: true });
        btn.setDisplaySize(280, 62);
        let txt = this.add.text(x, y, '← VOLTAR AO MENU', { fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', color: '#d4af37' }).setOrigin(0.5);
        btn.on('pointerover',  () => { btn.setTint(0xffd700); txt.setScale(1.05); });
        btn.on('pointerout',   () => { btn.clearTint(); txt.setScale(1.0);  });
        btn.on('pointerdown',  callback);
    }
}

// =============================================================================
// 5. TELA DE TUTORIAL
// =============================================================================
class TutorialScene extends Phaser.Scene {
    constructor() { super({ key: 'TutorialScene' }); }

    preload() {
        this.load.image('ui_botao', 'img/placeholder_botao.png');
    }

    create() {
        const W = this.cameras.main.width, H = this.cameras.main.height;

        this.add.rectangle(0, 0, W, H / 2, 0x1a0800).setOrigin(0, 0);
        this.add.rectangle(0, H / 2, W, H / 2, 0x3e2000).setOrigin(0, 0);

        let moldura = this.add.graphics();
        moldura.lineStyle(3, 0xd4af37, 0.5);
        moldura.strokeRect(28, 28, W - 56, H - 56);

        this.add.text(W / 2, 100, 'COMO JOGAR', {
            fontFamily: 'Arial', fontSize: '50px', fontStyle: 'bold', color: '#d4af37', stroke: '#5c3a00', strokeThickness: 6
        }).setOrigin(0.5);

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
        let btn = this.add.sprite(x, y, 'ui_botao').setInteractive({ useHandCursor: true });
        btn.setDisplaySize(280, 62);
        let txt = this.add.text(x, y, '← ENTENDIDO!', { fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', color: '#d4af37' }).setOrigin(0.5);
        btn.on('pointerover',  () => { btn.setTint(0xffd700); txt.setScale(1.05); });
        btn.on('pointerout',   () => { btn.clearTint(); txt.setScale(1.0);  });
        btn.on('pointerdown',  callback);
    }
}

// =============================================================================
// 6. CLASSE UTILITÁRIA: SLIDER DE VOLUME E OPÇÕES
// =============================================================================
class SliderVolume {
    constructor(scene, cx, sy, sw, muteY, onVolumeChange) {
        this._scene = scene;
        this._SX = cx - sw / 2;
        this._SY = sy;
        this._SW = sw;
        this._cx = cx;
        this._muteY = muteY;
        this._onVolumeChange = onVolumeChange || null;
        this._arrastando = false;
        this._volAntesMute = null;

        let trilha = scene.add.graphics();
        trilha.fillStyle(0x2a1800, 1);
        trilha.fillRoundedRect(this._SX, sy - 8, sw, 16, 8);
        trilha.lineStyle(1, 0x7a5c00, 1);
        trilha.strokeRoundedRect(this._SX, sy - 8, sw, 16, 8);

        this.sliderFill = scene.add.graphics();
        this.handle = scene.add.circle(this._SX + volumeGlobal * sw, sy, 20, 0xd4af37);
        this.handle.setStrokeStyle(3, 0x5c3a00);

        this.textoVol = scene.add.text(cx, sy + 60, `${Math.round(volumeGlobal * 100)}%`, {
            fontFamily: 'Arial', fontSize: '34px', fontStyle: 'bold', color: '#d4af37'
        }).setOrigin(0.5);

        this._atualizarSlider();

        let zonaSlider = scene.add.zone(cx, sy, sw + 60, 70).setInteractive({ useHandCursor: true });
        zonaSlider.on('pointerdown', (ptr) => { this._arrastando = true; this._moverSlider(ptr.x); });
        scene.input.on('pointermove', (ptr) => { if (this._arrastando) this._moverSlider(ptr.x); });
        scene.input.on('pointerup', () => {
            if (this._arrastando) {
                this._arrastando = false;
                localStorage.setItem('museuVolume', volumeGlobal);
            }
        });

        this._muteBg = scene.add.graphics();
        this._muteTxt = scene.add.text(cx, muteY, '🔇  MUDO', {
            fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold',
            color: volumeGlobal === 0 ? '#d4af37' : '#664422'
        }).setOrigin(0.5);
        this._desenharMute(volumeGlobal === 0);

        let zonaMute = scene.add.zone(cx, muteY, 200, 50).setInteractive({ useHandCursor: true });
        zonaMute.on('pointerdown', () => {
            if (volumeGlobal > 0) {
                this._volAntesMute = volumeGlobal;
                this._moverSlider(this._SX);
            } else {
                this._moverSlider(this._SX + (this._volAntesMute || 1.0) * this._SW);
            }
            localStorage.setItem('museuVolume', volumeGlobal);
        });
    }

    _moverSlider(mouseX) {
        let novoX = Phaser.Math.Clamp(mouseX, this._SX, this._SX + this._SW);
        volumeGlobal = (novoX - this._SX) / this._SW;
        this.handle.x = novoX;
        this.textoVol.setText(`${Math.round(volumeGlobal * 100)}%`);
        this._atualizarSlider();
        this._desenharMute(volumeGlobal === 0);
        this._muteTxt.setColor(volumeGlobal === 0 ? '#d4af37' : '#664422');
        this._scene.sound.volume = volumeGlobal;
        if (this._onVolumeChange) this._onVolumeChange(volumeGlobal);
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
        this._muteBg.strokeRoundedRect(this._cx - 90, this._muteY - 22, 180, 45, 8);
    }
}

class OptionsScene extends Phaser.Scene {
    constructor() { super({ key: 'OptionsScene' }); }
    preload() { this.load.image('ui_botao', 'img/placeholder_botao.png'); }

    create() {
        const W = this.cameras.main.width, H = this.cameras.main.height;

        this.add.rectangle(0, 0, W, H / 2, 0x1a0800).setOrigin(0, 0);
        this.add.rectangle(0, H / 2, W, H / 2, 0x3e2000).setOrigin(0, 0);

        let moldura = this.add.graphics();
        moldura.lineStyle(3, 0xd4af37, 0.5);
        moldura.strokeRect(28, 28, W - 56, H - 56);

        this.add.text(W / 2, 120, 'OPÇÕES', {
            fontFamily: 'Arial', fontSize: '58px', fontStyle: 'bold', color: '#d4af37', stroke: '#5c3a00', strokeThickness: 7
        }).setOrigin(0.5);

        this.add.text(W / 2, 245, 'VOLUME', {
            fontFamily: 'Arial', fontSize: '28px', fontStyle: 'bold', color: '#bf8b6e'
        }).setOrigin(0.5);

        this.add.text(W / 2 - 240, 330, '🔇', { fontSize: '28px' }).setOrigin(0.5);
        this.add.text(W / 2 + 240, 330, '🔊', { fontSize: '28px' }).setOrigin(0.5);

        new SliderVolume(this, W / 2, 330, 400, 480);

        this._criarBotaoVoltar(W / 2, 620, () => { this.scene.start('MenuScene'); });
    }

    _criarBotaoVoltar(x, y, callback) {
        let btn = this.add.sprite(x, y, 'ui_botao').setInteractive({ useHandCursor: true });
        btn.setDisplaySize(280, 62);
        let txt = this.add.text(x, y, '← VOLTAR AO MENU', { fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', color: '#d4af37' }).setOrigin(0.5);
        btn.on('pointerover',  () => { btn.setTint(0xffd700); txt.setScale(1.05); });
        btn.on('pointerout',   () => { btn.clearTint(); txt.setScale(1.0);  });
        btn.on('pointerdown',  callback);
    }
}

// =============================================================================
// 7. PAUSA
// =============================================================================
class PauseScene extends Phaser.Scene {
    constructor() { super({ key: 'PauseScene' }); }

    init(data) {
        this.parentScene = data.parentScene || 'GameScene';
    }

    preload() {
        this.load.image('ui_botao', 'img/placeholder_botao.png');
    }

    create() {
        const W = this.cameras.main.width, H = this.cameras.main.height;

        this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0, 0);

        let painel = this.add.graphics();
        painel.fillStyle(0x120f09, 0.95);
        painel.fillRoundedRect(W / 2 - 350, 128, 700, 512, 18);
        painel.lineStyle(3, 0xd4af37, 1);
        painel.strokeRoundedRect(W / 2 - 350, 128, 700, 512, 18);

        this.add.text(W / 2, 190, 'PAUSADO', {
            fontFamily: 'Arial', fontSize: '58px', fontStyle: 'bold', color: '#d4af37', stroke: '#5c3a00', strokeThickness: 6
        }).setOrigin(0.5);

        new SliderVolume(this, W / 2, 340, 400, 470, (vol) => {
            this.scene.get(this.parentScene).sound.volume = vol;
        });

        this._criarBotaoSprite(W / 2, 540, 'CONTINUAR', true, () => { this._retomarJogo(); });
        this._criarBotaoSprite(W / 2, 620, 'MENU INICIAL', true, () => {
            if (musicaFase) musicaFase.stop(); // Mata o som ao sair pro menu
            this.scene.stop(this.parentScene);
            this.scene.stop();
            this.scene.start('MenuScene');
        });

        this.input.keyboard.on('keydown-ESC', () => { this._retomarJogo(); });
        this.input.keyboard.on('keydown-SPACE', () => { this._retomarJogo(); });
    }

    _criarBotaoSprite(x, y, label, ativo, callback) {
        let btn = this.add.sprite(x, y, 'ui_botao').setInteractive({ useHandCursor: ativo });
        btn.setDisplaySize(320, 68);
        if (!ativo) btn.setTint(0x555555);
        let txt = this.add.text(x, y, label, { fontFamily: 'Arial', fontSize: '30px', fontStyle: 'bold', color: ativo ? '#d4af37' : '#999999' }).setOrigin(0.5);
        if (!callback) return;
        btn.on('pointerover',  () => { btn.setTint(0xffd700); txt.setScale(1.06); });
        btn.on('pointerout',   () => { btn.clearTint(); txt.setScale(1.0);  });
        btn.on('pointerdown',  callback);
    }

    _retomarJogo() {
        this.scene.stop();
        this.scene.resume(this.parentScene);
    }
}

// =============================================================================
// 8. O JOGO PRINCIPAL E A LÓGICA CORE
// =============================================================================
class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }
    
    preload() { 
        // Assets do jogo rodando - Substitua pelas suas artes da pasta img/
        this.load.image('spr_diamante', 'img/diamante.png');
        this.load.image('spr_gancho', 'img/garra_fechada.png');
        this.load.image('fundo_cenario_terra', 'img/fundos/cenario_terra.png'); // Cenário 1 - Terra
        this.load.image('fundo_cenario_agua', 'img/fundos/cenario_agua.png');   // Cenário 2 - Água
        this.load.image('spr_moeda_prata', 'img/moeda_1000.png');
        this.load.image('spr_moeda_bronze', 'img/moeda_500.png');
        this.load.image('spr_pedra_grande', './img/pedra_grande.png'); 
        this.load.image('spr_pedra_pequena', './img/pedra_pequena.png');
        this.load.image('spr_fragmento_fase', 'img/placeholder_fragmento.png');  
        this.load.image('ui_btn_pausa', 'img/placeholder_btn_pausa.png');
    }

    create()  { 
        this.sound.volume = volumeGlobal;
        create.call(this);  
    }
    
    update()  { 
        update.call(this);  
    }
}

GameScene.prototype._criarBotaoPausa = function(x, y) {
    let btnPausa = this.add.sprite(x, y, 'ui_btn_pausa').setInteractive({ useHandCursor: true });
    btnPausa.setDisplaySize(62, 62);
    btnPausa.on('pointerdown', () => { this._abrirMenuPausa(); });
};

GameScene.prototype._abrirMenuPausa = function() {
    if (this.scene.isPaused()) return;
    this.scene.launch('PauseScene', { parentScene: this.scene.key });
    this.scene.pause();
};

function create() {
    carregarJogo();
    
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    textoHUD = this.add.text(10, 10, '', { font: '22px Arial', fill: '#fff', fontStyle: 'bold' });
    textoCentro = this.add.text(W / 2, H / 2, '', { font: '45px Arial', fill: '#00ff00', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);

    this.add.text(10, 60, '⚡ ENERGIA', { font: '13px Arial', fill: '#ffdd55', fontStyle: 'bold' });
    barraEstamina = this.add.graphics();

    labelBoost = this.add.text(250, 76, '⚡ BOOST!', { font: '13px Arial', fill: '#ffff00', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }).setVisible(false);

    const cx = W - 104, cy = 108;

    let clockShadow = this.add.graphics();
    clockShadow.fillStyle(0x000000, 0.5); clockShadow.fillCircle(cx + 3, cy + 3, 57);
    let clockFace = this.add.graphics();
    clockFace.fillStyle(0x1c0f04, 1); clockFace.fillCircle(cx, cy, 54);
    clockFace.lineStyle(5, 0xd4af37, 1); clockFace.strokeCircle(cx, cy, 55);

    graficoTempoPizza = this.add.graphics({ x: cx, y: cy }).setDepth(1);

    this.add.text(cx, cy - 24, 'TEMPO', { font: '11px Arial', fill: '#bf8b6e', fontStyle: 'bold' }).setOrigin(0.5).setDepth(3);
    textoRelogio = this.add.text(cx, cy + 10, '100', { font: 'bold 26px Arial', fill: '#f0e0b0', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setDepth(3);

    grupoObjetos = this.physics.add.group();
    linhaCorda = this.add.graphics();

    gancho = this.physics.add.sprite(W / 2, 100, 'spr_gancho');
    gancho.setDisplaySize(64, 80); // mantém a proporção da garra (919x1152)
    gancho.setDepth(2);            // garra acima dos objetos soltos no cenário

    this.physics.add.overlap(gancho, grupoObjetos, pegarObjeto, null, this);
    this.input.on('pointerdown', (pointer) => acaoPrincipal.call(this, pointer), this);
    teclaEspaco = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.teclaEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.teclaM = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this._criarBotaoPausa(W - 40, 40);

    this.time.addEvent({ delay: 1000, callback: diminuirTempo, callbackScope: this, loop: true });

    montarFase.call(this);
}

function atualizarHUD() {
    textoHUD.setText(`Cenário: ${cenarioAtual} - Fase: ${faseNoCenario} | Pontos: ${moedasColetadas}/${metaMoedas}\nFragmentos: ${fragmentosAtuais}/3 | Inventário: ${reliquiasCompletas}/3`);
}

function acharPosicaoValida(raioNovoItem, larguraTela) {
    let maxTentativas = 100;
    for(let t = 0; t < maxTentativas; t++) {
        let x = Phaser.Math.Between(50, larguraTela - 50);
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
    return {x: Phaser.Math.Between(100, larguraTela - 100), y: Phaser.Math.Between(300, 700)};
}

function montarFase() {
    // Limpar mensagem de game over se ainda existir
    if (gameOverRetangulo) { gameOverRetangulo.destroy(); gameOverRetangulo = null; }
    if (gameOverTexto) { gameOverTexto.destroy(); gameOverTexto = null; }
    
    grupoObjetos.clear(true, true);
    posicoesOcupadas = [];
    moedasColetadas = 0;
    tempoRestante = 100;
    estamina = 150;
    fragmentoRevelado = false;
    jogoVencido = false;

    if (musicaFase) musicaFase.stop();
    let chaveMusica = 'musica_cenario_1';
    if (cenarioAtual === 2) chaveMusica = 'musica_cenario_2';
    if (cenarioAtual === 3) chaveMusica = 'musica_cenario_3';

    musicaFase = this.sound.add(chaveMusica);
    musicaFase.play({ loop: true, volume: volumeGlobal });

    let degrauDificuldade = ((cenarioAtual - 1) * 3) + (faseNoCenario - 1);
    velocidadeBalanço = 1.0 + (degrauDificuldade * 0.15);
    if (velocidadeBalanço > velocidadeMaxima) velocidadeBalanço = velocidadeMaxima;

    // Fundo do cenário: imagem para os que já têm arte, cor sólida para os demais
    const Wbg = this.cameras.main.width, Hbg = this.cameras.main.height;
    const fundosCenario = { 1: 'fundo_cenario_terra', 2: 'fundo_cenario_agua' };
    const chaveFundo = fundosCenario[cenarioAtual];

    if (chaveFundo) {
        if (!this.fundoCenario) {
            this.fundoCenario = this.add.image(Wbg / 2, Hbg / 2, chaveFundo).setDepth(-10);
        } else {
            this.fundoCenario.setTexture(chaveFundo).setVisible(true);
        }
        this.fundoCenario.setDisplaySize(Wbg, Hbg);
    } else {
        // Cenário sem imagem ainda (ex.: 3) — usa cor sólida de fallback
        if (this.fundoCenario) this.fundoCenario.setVisible(false);
        this.cameras.main.setBackgroundColor('#b71c1c');
    }

    atualizarHUD();
    textoCentro.setText('');

    const W = this.cameras.main.width;
    const cfgCenario = [
        { m5: 2, m3: 6, m1: 8,  pGrande: 2, pPequena: 4 },  
        { m5: 3, m3: 7, m1: 9,  pGrande: 3, pPequena: 5 },  
        { m5: 4, m3: 8, m1: 10, pGrande: 5, pPequena: 6 },  
    ];
    const cfg = cfgCenario[Phaser.Math.Clamp(cenarioAtual - 1, 0, 2)];

    // Diamante (valor 5) — 36x36
    for (let i = 0; i < cfg.m5; i++) {
        const d = 36, r = d / 2;
        let pos = acharPosicaoValida(r, W);
        let spr = this.physics.add.sprite(pos.x, pos.y, 'spr_diamante');
        spr.setDisplaySize(d, d);
        spr.body.setCircle(spr.width / 2);
        spr.tipo = 'moeda'; spr.peso = 0.5; spr.valor = 5;
        grupoObjetos.add(spr);
    }

    // Moeda 1000 / prata (valor 3) — 42x42, menor que a de 500
    for (let i = 0; i < cfg.m3; i++) {
        const d = 42, r = d / 2;
        let pos = acharPosicaoValida(r, W);
        let spr = this.physics.add.sprite(pos.x, pos.y, 'spr_moeda_prata');
        spr.setDisplaySize(d, d);
        spr.body.setCircle(spr.width / 2);
        spr.tipo = 'moeda'; spr.peso = 1.5; spr.valor = 3;
        grupoObjetos.add(spr);
    }

    // Moeda 500 / bronze (valor 1) — 52x52
    for (let i = 0; i < cfg.m1; i++) {
        const d = 52, r = d / 2;
        let pos = acharPosicaoValida(r, W);
        let spr = this.physics.add.sprite(pos.x, pos.y, 'spr_moeda_bronze');
        spr.setDisplaySize(d, d);
        spr.body.setCircle(spr.width / 2);
        spr.tipo = 'moeda'; spr.peso = 1.0; spr.valor = 1;
        grupoObjetos.add(spr);
    }

    for (let i = 0; i < cfg.pGrande; i++) {
        const d = 170, r = d / 2;
        let pos = acharPosicaoValida(r, W);
        let spr = this.physics.add.sprite(pos.x, pos.y, 'spr_pedra_grande');
        spr.setDisplaySize(d, d);
        spr.body.setCircle(spr.width / 2);
        spr.tipo = 'pedra_pesada'; spr.peso = 8.0; spr.valor = 0;
        grupoObjetos.add(spr);
    }

    for (let i = 0; i < cfg.pPequena; i++) {
        const d = 110, r = d / 2;
        let pos = acharPosicaoValida(r, W);
        let spr = this.physics.add.sprite(pos.x, pos.y, 'spr_pedra_pequena');
        spr.setDisplaySize(d, d);
        spr.body.setCircle(spr.width / 2);
        spr.tipo = 'pedra_pesada'; spr.peso = 4.0; spr.valor = 0;
        grupoObjetos.add(spr);
    }
}

function spawnarFragmento() {
    textoCentro.setText('FRAGMENTO REVELADO!\nCapture-o rápido!');
    textoCentro.setColor('#00ffff');

    this.time.delayedCall(2500, () => {
        if (!esperandoProximaFase && !jogoAcabou) textoCentro.setText('');
    });

    let r = 20;
    let pos = acharPosicaoValida(r, this.cameras.main.width);
    
    let spr = this.physics.add.sprite(pos.x, pos.y, 'spr_fragmento_fase');
    spr.body.setCircle(r);
    spr.tipo = 'fragmento';
    spr.peso = 2;
    spr.valor = 0;

    this.tweens.add({
        targets: spr,
        scaleX: 1.22,
        scaleY: 1.22,
        alpha: 0.8,
        duration: 480,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    grupoObjetos.add(spr);
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
    const W = this.cameras.main.width;
    gameOverRetangulo = this.add.rectangle(W / 2, 530, 680, 90, 0x000000, 0.55).setOrigin(0.5);
    
    let mensagem = jogoVencido 
        ? 'Você completou o jogo! Pressione M para retornar ao menu.'
        : 'Pressione ESPAÇO ou clique para reiniciar. Pressione M para retornar ao menu.';
    
    gameOverTexto = this.add.text(W / 2, 500, mensagem, {
        fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', align: 'center'
    }).setOrigin(0.5);
    this.gameOverDrawn = true;
}

function reiniciarFase() {
    if (!jogoAcabou) return;
    
    // Limpar objetos de game over
    if (gameOverRetangulo) { gameOverRetangulo.destroy(); gameOverRetangulo = null; }
    if (gameOverTexto) { gameOverTexto.destroy(); gameOverTexto = null; }
    
    jogoAcabou = false;
    jogoVencido = false;
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
            if (musicaFase) musicaFase.stop();
            this.scene.start('MenuScene');
            return;
        }
        if (Phaser.Input.Keyboard.JustDown(teclaEspaco) || this.input.activePointer.justDown) {
            if (jogoVencido) {
                if (musicaFase) musicaFase.stop();
                this.scene.start('MenuScene');
            } else {
                reiniciarFase.call(this);
            }
            return;
        }
        return;
    }
    if (esperandoProximaFase) return;

    if (Phaser.Input.Keyboard.JustDown(this.teclaEsc)) {
        this._abrirMenuPausa();
        return;
    }

    const W = this.cameras.main.width;
    const centroX = W / 2;

    linhaCorda.clear();
    linhaCorda.lineStyle(3, 0xaaaaaa, 1);
    linhaCorda.beginPath();
    linhaCorda.moveTo(centroX, 50);
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

    barraEstamina.clear();
    let propE = estamina / estaminaMaxima;
    let corB  = propE > 0.50 ? 0x44cc44 : propE > 0.20 ? 0xffaa00 : 0xff3333;
    let alphaB = propE < 0.20 ? (Math.sin(this.time.now * 0.012) * 0.4 + 0.6) : 1;

    barraEstamina.fillStyle(0x111111, 0.9);
    barraEstamina.fillRoundedRect(10, 76, 230, 16, 6);
    barraEstamina.fillStyle(0x000000, 0.3);
    barraEstamina.fillRoundedRect(10, 78, 230, 14, 5);

    let fillW = Math.max(0, Math.round(230 * propE));
    if (fillW > 0) {
        barraEstamina.fillStyle(corB, alphaB);
        barraEstamina.fillRoundedRect(10, 76, fillW, 16, 6);
        barraEstamina.fillStyle(0xffffff, 0.18);
        barraEstamina.fillRoundedRect(12, 77, Math.max(0, fillW - 4), 5, 3);
    }

    barraEstamina.lineStyle(1, 0x666666, 0.9);
    barraEstamina.strokeRoundedRect(10, 76, 230, 16, 6);

    labelBoost.setVisible(
        estadoGancho === 'SUBINDO' && objetoPuxado !== null &&
        objetoPuxado.tipo === 'pedra_pesada' && estamina > 10
    );

    textoRelogio.setText(String(Math.max(0, tempoRestante)));
    if (tempoRestante <= 20) {
        textoRelogio.setColor(Math.floor(this.time.now / 400) % 2 === 0 ? '#ff4444' : '#ffaa00');
    } else {
        textoRelogio.setColor('#f0e0b0');
    }

    graficoTempoPizza.clear();
    let porcentagemTempoPerdido = (100 - tempoRestante) / 100;

    if (porcentagemTempoPerdido > 0) {
        graficoTempoPizza.fillStyle(0x000000, 0.80);
        graficoTempoPizza.beginPath();
        graficoTempoPizza.moveTo(0, 0);
        let anguloInicioPizza = -Math.PI / 2;
        let anguloFimPizza    = anguloInicioPizza + (porcentagemTempoPerdido * 2 * Math.PI);
        graficoTempoPizza.arc(0, 0, 43, anguloInicioPizza, anguloFimPizza, false);
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

        gancho.x = centroX + Math.sin(radianos) * tamanhoDaCorda;
        gancho.y = 50  + Math.cos(radianos) * tamanhoDaCorda;
        gancho.angle = -anguloGancho;
    }
    else if (estadoGancho === 'DESCENDO') {
        gancho.x += Math.sin(radianos) * velocidadeTiroPadrao;
        gancho.y += Math.cos(radianos) * velocidadeTiroPadrao;
        if (gancho.x < 0 || gancho.x > W || gancho.y > 768) estadoGancho = 'SUBINDO';
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

        if (gancho.y <= 100) {
            estadoGancho = 'BALANCANDO';
            anguloGancho = Phaser.Math.Between(-55, 55); 
            balancandoParaDireita = anguloGancho < 0 ? true : Phaser.Math.Between(0, 1) === 0;

            if (objetoPuxado) {
                if (objetoPuxado.tipo === 'moeda') {
                    moedasColetadas += objetoPuxado.valor;
                    let corTexto = objetoPuxado.valor === 5 ? '#ffffff' : objetoPuxado.valor === 3 ? '#d4af37' : '#ffaa00';
                    mostrarTextoFlutuante(this, gancho.x, gancho.y, `+$${objetoPuxado.valor}`, corTexto);
                    this.cameras.main.flash(160, 255, 215, 0);

                    if (moedasColetadas >= metaMoedas && !fragmentoRevelado) {
                        fragmentoRevelado = true;
                        spawnarFragmento.call(this);
                    }
                }
                else if (objetoPuxado.tipo === 'fragmento') {
                    mostrarTextoFlutuante(this, gancho.x, gancho.y, 'FRAGMENTO!', '#00ffff');
                    this.cameras.main.flash(300, 0, 200, 220);
                    pulsarIrradiante(this, gancho.x, gancho.y);
                    fragmentosAtuais++;
                    faseNoCenario++;

                    if (fragmentosAtuais >= 3) {
                        reliquiasCompletas++;
                        cenarioAtual++;
                        fragmentosAtuais = 0;
                        faseNoCenario = 1;

                        if (reliquiasCompletas >= 3) {
                            jogoAcabou = true;
                            jogoVencido = true;
                            textoCentro.setText('PARABÉNS! VOCÊ ZEROU O MUSEU!\n3 Relíquias no Inventário!');
                            textoCentro.setColor('#00ff00');
                            salvarJogo();
                            mostrarControlesGameOver.call(this);
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

function mostrarTextoFlutuante(scene, x, y, texto, cor) {
    let t = scene.add.text(x, y, texto, {
        fontFamily: 'Arial', fontSize: '26px', fontStyle: 'bold',
        color: cor, stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);
    scene.tweens.add({ targets: t, y: y - 80, alpha: 0, duration: 900, ease: 'Power2', onComplete: () => t.destroy() });
}

function pulsarIrradiante(scene, x, y) {
    for (let i = 0; i < 3; i++) {
        scene.time.delayedCall(i * 110, () => {
            let ring = scene.add.graphics().setDepth(9);
            ring.lineStyle(3, 0x00ffff, 1);
            ring.strokeCircle(x, y, 10);
            scene.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 650, ease: 'Power2', onComplete: () => ring.destroy() });
        });
    }
}

function pegarObjeto(ganchoObjeto, objetoAtingido) {
    if (estadoGancho === 'DESCENDO') {
        estadoGancho = 'SUBINDO';
        objetoPuxado = objetoAtingido;
        objetoPuxado.setDepth(3); // objeto agarrado sobrepõe a garra (depth 2), escondendo-a atrás
        if (objetoAtingido.tipo === 'pedra_pesada') {
            let scene = ganchoObjeto.scene;
            mostrarTextoFlutuante(scene, ganchoObjeto.x, ganchoObjeto.y, 'PESADA...', '#ff4444');
            scene.cameras.main.flash(200, 255, 30, 0);
            scene.cameras.main.shake(220, 0.005);
        }
    }
}

// =============================================================================
// 9. CONFIGURAÇÃO FINAL DO PHASER
// =============================================================================
let aspect = window.innerWidth / window.innerHeight;
let GAME_WIDTH = Phaser.Math.Clamp(Math.round(768 * aspect), 1024, 1366);

const config = {
    type: Phaser.AUTO,
    pixelArt: true, // Mantém os pixels 100% nítidos
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: 768
    },
    parent: 'game-container',
    backgroundColor: '#1a0800',
    physics: { default: 'arcade', arcade: { debug: false } },
    fps: { target: 60, forceSetTimeOut: true },
    scene: [MenuScene, InventoryScene, TutorialScene, OptionsScene, GameScene, PauseScene]
};

const game = new Phaser.Game(config);