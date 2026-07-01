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
let textoHUD, textoCentro, textoCentroBg, barraEstamina, textoRelogio;
let hudPanelBg, hudPanelX = 6, hudPanelY = 0, hudPanelW = 290;
let hudBarY = 92;
let teclaEspaco;

let gameOverRetangulo = null, gameOverTexto = null;
let jogoFoiIniciado = false;

let posicoesOcupadas = [];
let musicaFase;          // Armazena a trilha sonora atual
let chaveMusicaAtual;    // Chave da trilha em reprodução (evita reiniciar a mesma música)

// =============================================================================
// 2. SISTEMA DE MEMORY CARD (LOCALSTORAGE)
// =============================================================================
function salvarJogo() {
    let save = { cenario: cenarioAtual, fase: faseNoCenario, fragmentos: fragmentosAtuais, reliquias: reliquiasCompletas, moedas: moedasColetadas, tempo: tempoRestante };
    localStorage.setItem('museuSave', JSON.stringify(save));
}

function carregarJogo() {
    let saveText = localStorage.getItem('museuSave');
    if (saveText) {
        try {
            let data = JSON.parse(saveText);
            cenarioAtual = data.cenario || 1;
            faseNoCenario = data.fase || 1;
            fragmentosAtuais = data.fragmentos || 0;
            reliquiasCompletas = data.reliquias || 0;
            moedasColetadas = data.moedas || 0;
            tempoRestante = data.tempo !== undefined ? data.tempo : 100;
        } catch (e) {
            limparSave();
        }
    }
}

function limparSave() {
    localStorage.removeItem('museuSave');
}

// =============================================================================
// FUNÇÃO GLOBAL: CRIAR BOTÃO ESTILIZADO DO MUSEU
// =============================================================================
function criarBotaoMuseu(scene, x, y, w, h, label, ativo, callback) {
    // Cores inspiradas na fachada do Museu: Parede creme, Pilares vermelhos, Porta de madeira
    let corParede = ativo ? 0xfdf1db : 0xcccccc;
    let corPilar = ativo ? 0xb12423 : 0x777777;
    let corTexto = ativo ? '#6e3c1d' : '#555555';

    scene.add.rectangle(x + 4, y + 4, w, h, 0x000000, 0.4).setOrigin(0.5);

    let bg = scene.add.rectangle(x, y, w, h, corParede).setOrigin(0.5);
    bg.setStrokeStyle(4, corPilar);

    let detalhe = scene.add.rectangle(x, y, w - 10, h - 10).setStrokeStyle(2, corPilar, 0.4).setOrigin(0.5);

    let txt = scene.add.text(x, y, label, {
        fontFamily: 'Arial', fontSize: Math.floor(h * 0.4) + 'px', fontStyle: 'bold', color: corTexto
    }).setOrigin(0.5);

    if (ativo) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => { bg.setFillStyle(0xffffff); txt.setScale(1.05); detalhe.setScale(1.02); });
        bg.on('pointerout', () => { bg.setFillStyle(corParede); txt.setScale(1.0); detalhe.setScale(1.0); });
        if (callback) {
            bg.on('pointerdown', () => { bg.setFillStyle(0xe8d5b5); scene.time.delayedCall(50, callback); });
        }
    }
    return bg;
}

// =============================================================================
// 3. TELA INICIAL (MENU PRINCIPAL)
// =============================================================================
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        this.load.image('fundo_capa', 'img/sprites/cenarios/capa.png');
        this.load.image('pergaminho', 'img/sprites/cenarios/pergaminho.png');
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

        // Grade 2/2/1 no canto inferior esquerdo
        const colX1 = 210;     // centro da coluna esquerda (era 155)
        const colX2 = 360;     // centro da coluna direita (era 305)
        const colGap = colX2 - colX1;
        const linhaH = 48;      // distância entre linhas
        const linha3 = H - 150; // Y da última linha (OPÇÕES)
        const linha2 = linha3 - linhaH;
        const linha1 = linha2 - linhaH;

        this._criarBotaoSprite(colX1, linha1, 'NOVO JOGO', true, () => {
            limparSave();
            cenarioAtual = 1; faseNoCenario = 1; fragmentosAtuais = 0; reliquiasCompletas = 0;
            moedasColetadas = 0; tempoRestante = 100;
            jogoAcabou = false; esperandoProximaFase = false; jogoVencido = false;
            this.scene.start('GameScene');
        });

        let saveText = localStorage.getItem('museuSave');
        let temSave = saveText !== null;
        let savePodesContinuar = jogoFoiIniciado && temSave && (() => {
            try {
                let data = JSON.parse(saveText);
                return !data.reliquias || data.reliquias < 3;
            } catch {
                return true;
            }
        })();

        this._criarBotaoSprite(colX2, linha1, 'CONTINUAR', savePodesContinuar, savePodesContinuar ? () => {
            carregarJogo();
            jogoAcabou = false; esperandoProximaFase = false; jogoVencido = false;
            this.scene.start('GameScene');
        } : null);


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

        const tocaMusicaMenu = () => {
            if (!this.sys.isActive()) return;
            this.musicaMenu = this.sound.add('musica_cenario_1');
            this.musicaMenu.play({ loop: true, volume: volumeGlobal });
        };
        if (this.sound.locked) {
            this.sound.once('unlocked', tocaMusicaMenu);
        } else {
            tocaMusicaMenu();
        }
        this.events.once('shutdown', () => {
            this.sound.off('unlocked', tocaMusicaMenu);
            if (this.musicaMenu) { this.musicaMenu.stop(); this.musicaMenu.destroy(); this.musicaMenu = null; }
        });
    }

    _criarBotaoSprite(x, y, label, ativo, callback) {
        criarBotaoMuseu(this, x, y, 140, 42, label, ativo, callback);
    }
}

// =============================================================================
// 4. SALA DE EXPOSIÇÃO (INVENTÁRIO)
// =============================================================================
class InventoryScene extends Phaser.Scene {
    constructor() { super({ key: 'InventoryScene' }); }

    preload() {
        const relics = ['mascara', 'santo', 'tigre'];
        relics.forEach(relic => {
            for (let i = 1; i <= 3; i++) {
                this.load.image(`frag_${relic}_${i}`, `img/sprites/fragmentos/${relic}${i}.png`);
            }
            this.load.image(`frag_${relic}_full`, `img/sprites/fragmentos/${relic}full.png`);
        });
    }

    create() {
        const W = this.cameras.main.width, H = this.cameras.main.height;

        this.add.rectangle(0, 0, W, H / 2, 0x2d0a0a).setOrigin(0, 0);
        this.add.rectangle(0, H / 2, W, H / 2, 0x4a1010).setOrigin(0, 0);

        let moldura = this.add.graphics();
        moldura.lineStyle(3, 0xd4af37, 0.5);
        moldura.strokeRect(28, 28, W - 56, H - 56);

        this.add.text(W / 2, 100, 'SALA DE EXPOSIÇÃO', {
            fontFamily: 'Arial', fontSize: '50px', fontStyle: 'bold', color: '#d4af37', stroke: '#2d0a0a', strokeThickness: 6
        }).setOrigin(0.5);

        let reliquiasSalvas = 0, fragmentosSalvos = 0;
        let saveText = localStorage.getItem('museuSave');
        if (saveText) {
            let data = JSON.parse(saveText);
            reliquiasSalvas = data.reliquias || 0;
            fragmentosSalvos = data.fragmentos || 0;
        }

        const nomesReliquias = ["Máscara Ritual", "Imagem do Santo", "Tigre de Bronze"];
        const relicKeys = ['mascara', 'santo', 'tigre'];
        const espacamento = 250;
        const startX = W / 2 - espacamento;

        for (let i = 0; i < 3; i++) {
            let px = startX + (i * espacamento);
            let py = 330;

            let frame = this.add.graphics();
            frame.fillStyle(0x1a0505, 0.9);
            frame.fillRoundedRect(px - 100, py - 120, 200, 250, 10);
            frame.lineStyle(3, 0xd4af37, 0.9);
            frame.strokeRoundedRect(px - 100, py - 120, 200, 250, 10);

            let fragsDestaReliquia = (reliquiasSalvas > i) ? 3 : ((reliquiasSalvas === i) ? fragmentosSalvos : 0);
            const rKey = relicKeys[i];

            if (fragsDestaReliquia === 3) {
                let fullImg = this.add.image(px, py - 20, `frag_${rKey}_full`);
                const fsrc = this.textures.get(`frag_${rKey}_full`).getSourceImage();
                const fsc = Math.min(180 / fsrc.width, 210 / fsrc.height);
                fullImg.setDisplaySize(Math.round(fsrc.width * fsc), Math.round(fsrc.height * fsc));
                this.add.text(px, py + 110, nomesReliquias[i], {
                    fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold', color: '#f5e6c8', align: 'center'
                }).setOrigin(0.5);
            } else if (fragsDestaReliquia > 0) {
                const slotH = 72, maxW = 180;
                for (let j = 1; j <= 3; j++) {
                    const tk = `frag_${rKey}_${j}`;
                    let pieceY = py - 95 + (j - 1) * slotH + slotH / 2;
                    let piece = this.add.image(px, pieceY, tk);
                    const src = this.textures.get(tk).getSourceImage();
                    const sc = Math.min(maxW / src.width, (slotH - 8) / src.height);
                    piece.setDisplaySize(Math.round(src.width * sc), Math.round(src.height * sc));
                    if (j > fragsDestaReliquia) { piece.setTint(0x111111); piece.setAlpha(0.3); }
                }
                this.add.text(px, py + 110, `Restaurando...\n(${fragsDestaReliquia}/3)`, {
                    fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold', color: '#d4af37', align: 'center'
                }).setOrigin(0.5);
            } else {
                this.add.text(px, py - 10, '?', {
                    fontFamily: 'Arial', fontSize: '60px', fontStyle: 'bold', color: '#7a3a3a'
                }).setOrigin(0.5);
                this.add.text(px, py + 110, 'Bloqueado', {
                    fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#7a3a3a', align: 'center'
                }).setOrigin(0.5);
            }
        }

        this._criarBotaoVoltar(W / 2, 650, () => { this.scene.start('MenuScene'); });
    }

    _criarBotaoVoltar(x, y, callback) {
        criarBotaoMuseu(this, x, y, 280, 62, '← VOLTAR AO MENU', true, callback);
    }
}

// =============================================================================
// 5. TELA DE TUTORIAL
// =============================================================================
class TutorialScene extends Phaser.Scene {
    constructor() { super({ key: 'TutorialScene' }); }

    preload() {
        const spr = [
            ['spr_gancho',        'img/sprites/cenarios/garra_fechada.png'],
            ['spr_moeda_prata',   'img/sprites/cenarios/moeda_1000.png'],
            ['spr_moeda_bronze',  'img/sprites/cenarios/moeda_500.png'],
            ['spr_pedra_grande',  'img/sprites/cenarios/pedra_grande.png'],
            ['spr_pedra_pequena', 'img/sprites/cenarios/pedra_pequena.png'],
            ['spr_concha_grande', 'img/sprites/cenarios/concha_grande.png'],
            ['spr_concha_pequena','img/sprites/cenarios/concha_pequena.png'],
        ];
        spr.forEach(([key, path]) => {
            if (!this.textures.exists(key)) this.load.image(key, path);
        });
    }

    create() {
        const W = this.cameras.main.width, H = this.cameras.main.height;

        // Filtro LINEAR nos sprites do tutorial para qualidade suave ao escalar
        const tutKeys = ['spr_gancho', 'spr_moeda_prata', 'spr_moeda_bronze',
                         'spr_pedra_grande', 'spr_diamante'];
        tutKeys.forEach(k => {
            if (this.textures.exists(k))
                this.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
        });
        // Restaura nearest-neighbor ao sair para não afetar o jogo
        this.events.once('shutdown', () => {
            tutKeys.forEach(k => {
                if (this.textures.exists(k))
                    this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
            });
        });

        this.add.rectangle(0, 0, W, H / 2, 0x2d0a0a).setOrigin(0, 0);
        this.add.rectangle(0, H / 2, W, H / 2, 0x4a1010).setOrigin(0, 0);

        let moldura = this.add.graphics();
        moldura.lineStyle(3, 0xd4af37, 0.5);
        moldura.strokeRect(28, 28, W - 56, H - 56);

        this.add.text(W / 2, 66, 'COMO JOGAR', {
            fontFamily: 'Arial', fontSize: '44px', fontStyle: 'bold',
            color: '#d4af37', stroke: '#2d0a0a', strokeThickness: 6
        }).setOrigin(0.5);

        // Texto introdutório criado primeiro para medir a largura real
        const textoIntro = this.add.text(W / 2, 131,
            'Lance o gancho e colete itens enterrados nos sítios arqueológicos do Município de São José.\n' +
            'Monte 3 relíquias históricas antes que o tempo acabe e complete o acervo do Museu Histórico Gilberto Gerlach!',
            {
                fontFamily: 'Arial', fontSize: '15px', color: '#bf8b6e',
                align: 'center', lineSpacing: 7
            }
        ).setOrigin(0.5, 0.5);

        // Separadores se estendem até o fim do texto
        const sepHalf = Math.round(textoIntro.width / 2) + 8;
        let sep = this.add.graphics();
        sep.lineStyle(1, 0xd4af37, 0.35);
        sep.lineBetween(W / 2 - sepHalf, 100, W / 2 + sepHalf, 100);

        let sep2 = this.add.graphics();
        sep2.lineStyle(1, 0xd4af37, 0.25);
        sep2.lineBetween(W / 2 - sepHalf, 162, W / 2 + sepHalf, 162);

        // Grid 2×2 de cards
        const cW = 300, cH = 220, gap = 22;
        const gLeft = W / 2 - cW - gap / 2;
        const gTop = 174;

        const scene = this;

        const criarCard = (gx, gy, accent, titulo, desc, drawFn) => {
            let g = scene.add.graphics();
            g.fillStyle(0x0d0600, 0.88);
            g.fillRoundedRect(gx, gy, cW, cH, 12);
            g.lineStyle(2, accent, 0.85);
            g.strokeRoundedRect(gx, gy, cW, cH, 12);
            g.lineStyle(1, accent, 0.18);
            g.strokeRoundedRect(gx + 4, gy + 4, cW - 8, cH - 8, 10);
            // Área do ícone com tint suave
            g.fillStyle(accent, 0.07);
            g.fillRoundedRect(gx + 8, gy + 8, cW - 16, 82, 8);
            drawFn(g, gx + cW / 2, gy + 49);
            // Linha separadora
            g.lineStyle(1, accent, 0.3);
            g.lineBetween(gx + 16, gy + 95, gx + cW - 16, gy + 95);
            const corHex = '#' + accent.toString(16).padStart(6, '0');
            scene.add.text(gx + cW / 2, gy + 108, titulo, {
                fontFamily: 'Arial', fontSize: '15px', fontStyle: 'bold', color: corHex
            }).setOrigin(0.5);
            scene.add.text(gx + cW / 2, gy + 160, desc, {
                fontFamily: 'Arial', fontSize: '13px', color: '#d4c9b0',
                align: 'center', lineSpacing: 5,
                wordWrap: { width: cW - 28 }
            }).setOrigin(0.5);
        };

        // Card 1 — O Gancho (sprite real da garra)
        criarCard(gLeft, gTop, 0xd4af37, 'O GANCHO',
            'O gancho balança sozinho.\nClique ou pressione ESPAÇO\npara lançá-lo e coletar itens!',
            (g, icx, icy) => {
                // Corda
                g.lineStyle(3, 0xcccccc, 0.85);
                g.lineBetween(icx, icy - 42, icx, icy - 4);
                // Sprite real da garra
                scene.add.image(icx, icy + 20, 'spr_gancho').setDisplaySize(34, 44).setOrigin(0.5);
                // Setas de balanço ← →
                g.lineStyle(2, 0xd4af37, 0.65);
                g.lineBetween(icx - 52, icy - 10, icx - 28, icy - 10);
                g.lineBetween(icx - 52, icy - 10, icx - 43, icy - 17);
                g.lineBetween(icx - 52, icy - 10, icx - 43, icy - 3);
                g.lineBetween(icx + 28, icy - 10, icx + 52, icy - 10);
                g.lineBetween(icx + 52, icy - 10, icx + 43, icy - 17);
                g.lineBetween(icx + 52, icy - 10, icx + 43, icy - 3);
            }
        );

        // Card 2 — Barra de Estamina (visual idêntico ao do jogo + pedra pesada)
        criarCard(gLeft + cW + gap, gTop, 0xd4af37, 'BARRA DE ENERGIA',
            'Com pedras pesadas, SEGURE\no clique ou aperte ESPAÇO para\ndar boost, mas gasta Energia!',
            (g, icx, icy) => {
                // Pedra grande sendo puxada
                scene.add.image(icx + 44, icy - 2, 'spr_pedra_grande').setDisplaySize(42, 42).setOrigin(0.5);
                // Gancho acima da pedra
                scene.add.image(icx + 44, icy - 34, 'spr_gancho').setDisplaySize(18, 24).setOrigin(0.5);
                g.lineStyle(2, 0xcccccc, 0.75);
                g.lineBetween(icx + 44, icy - 46, icx + 44, icy - 22);
                // Barra de energia — pill style igual ao jogo
                const bx = icx - 58, by = icy + 10, bw = 90, bh = 16, br = 8;
                g.fillStyle(0x1a1a1a, 0.95);
                g.fillRoundedRect(bx, by, bw, bh, br);
                g.fillStyle(0x44cc44, 1);
                g.fillRoundedRect(bx + 2, by + 2, 56, bh - 4, br - 2);
                for (let i = 1; i < 8; i++) {
                    const sx = bx + 2 + ((bw - 4) / 8) * i;
                    if (sx < bx + 58) { g.fillStyle(0x000000, 0.28); g.fillRect(sx, by + 2, 2, bh - 4); }
                }
                g.fillStyle(0xffffff, 0.18);
                g.fillRoundedRect(bx + 3, by + 2, 52, Math.round((bh - 4) * 0.45), br - 2);
                g.lineStyle(2, 0x999999, 0.9);
                g.strokeRoundedRect(bx, by, bw, bh, br);
            }
        );

        // Gera textura do diamante se ainda não existir
        if (!this.textures.exists('spr_diamante')) {
            const dg = this.make.graphics({ add: false });
            dg.fillStyle(0x00ccff, 1);
            dg.fillTriangle(20, 0, 40, 20, 20, 40);
            dg.fillTriangle(20, 0, 0, 20, 20, 40);
            dg.fillStyle(0xffffff, 0.35);
            dg.fillTriangle(8, 18, 20, 2, 20, 18);
            dg.lineStyle(2, 0x0088cc, 1);
            dg.strokePoints([{ x: 20, y: 0 }, { x: 40, y: 20 }, { x: 20, y: 40 }, { x: 0, y: 20 }], true);
            dg.generateTexture('spr_diamante', 40, 40);
            dg.destroy();
        }

        // Card 3 — Itens a Coletar (moedas e diamantes)
        criarCard(gLeft, gTop + cH + gap, 0xf5c842, 'ITENS A COLETAR',
            'Colete moedas e diamantes\npara acumular pontos e revelar\nas relíquias perdidas do sítio arqueológico!',
            (g, icx, icy) => {
                const itens = [
                    ['spr_moeda_prata',  38, 38, -50, 0],
                    ['spr_moeda_bronze', 34, 34,   0, 0],
                    ['spr_diamante',     38, 38,  50, 0],
                ];
                itens.forEach(([key, w, h, dx, dy]) => {
                    scene.add.image(icx + dx, icy + dy, key).setDisplaySize(w, h).setOrigin(0.5);
                });
            }
        );

        // Card 4 — O Tempo (relógio idêntico ao HUD, proporcional: fator 38/57 ≈ 0.667)
        criarCard(gLeft + cW + gap, gTop + cH + gap, 0xd4af37, 'O TEMPO',
            'O relógio conta regressivamente.\nSe zerar, é Game Over!\nFique de olho e trabalhe rápido.',
            (g, icx, icy) => {
                // Face semi-transparente (igual ao jogo: 0x1a0506, 0.50)
                g.fillStyle(0x1a0506, 0.50);
                g.fillCircle(icx, icy, 37);
                // Borda externa (jogo: lineStyle 2, 0xd4af37, 0.95)
                g.lineStyle(2, 0xd4af37, 0.95);
                g.strokeCircle(icx, icy, 38);
                // Anel interno (jogo: lineStyle 1, 0xd4af37, 0.3, raio 50 → 33)
                g.lineStyle(1, 0xd4af37, 0.3);
                g.strokeCircle(icx, icy, 33);
                // Marcas de hora nos 4 pontos cardeais (jogo: 44→52 → 29→35)
                for (let i = 0; i < 4; i++) {
                    const ang = (i * Math.PI / 2) - Math.PI / 2;
                    g.lineStyle(2, 0xd4af37, 0.7);
                    g.beginPath();
                    g.moveTo(icx + Math.cos(ang) * 29, icy + Math.sin(ang) * 29);
                    g.lineTo(icx + Math.cos(ang) * 35, icy + Math.sin(ang) * 35);
                    g.strokePath();
                }
                // Fatia de tempo (jogo: raio 36 → 24, fillStyle 0x000000, 0.80)
                g.fillStyle(0x000000, 0.80);
                g.beginPath();
                g.moveTo(icx, icy);
                g.arc(icx, icy, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 0.7, false);
                g.closePath();
                g.fillPath();
                // Textos (jogo: 'TEMPO' cy-22→-15, número cy+10→+7, bold 26px→17px)
                scene.add.text(icx, icy + 3, '100', { font: 'bold 17px Arial', fill: '#f0e0b0', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
            }
        );

        this._criarBotaoVoltar(W / 2, gTop + cH * 2 + gap + 50, () => { this.scene.start('MenuScene'); });
    }

    _criarBotaoVoltar(x, y, callback) {
        criarBotaoMuseu(this, x, y, 280, 62, '← VOLTAR AO MENU', true, callback);
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

        const tH = 16, tR = 8;

        // Sombra da trilha
        let sombra = scene.add.graphics();
        sombra.fillStyle(0x000000, 0.35);
        sombra.fillRoundedRect(this._SX + 2, sy - tH / 2 + 3, sw, tH, tR);

        // Trilha fundo
        let trilha = scene.add.graphics();
        trilha.fillStyle(0x1a0a02, 1);
        trilha.fillRoundedRect(this._SX, sy - tH / 2, sw, tH, tR);
        trilha.lineStyle(2, 0x6b4408, 0.9);
        trilha.strokeRoundedRect(this._SX, sy - tH / 2, sw, tH, tR);
        trilha.lineStyle(1, 0xd4af37, 0.2);
        trilha.strokeRoundedRect(this._SX + 2, sy - tH / 2 + 2, sw - 4, tH - 4, tR - 2);

        // Marcas de posição abaixo da trilha
        let ticks = scene.add.graphics();
        ticks.fillStyle(0xd4af37, 0.4);
        for (let i = 1; i < 4; i++) {
            ticks.fillCircle(this._SX + sw * i / 4, sy + tH / 2 + 7, 2.5);
        }

        // Preenchimento e handle (redesenhados ao mover)
        this.sliderFill = scene.add.graphics();
        this.handleG = scene.add.graphics();

        this._desenharSlider = () => {
            const fillW = volumeGlobal * sw;
            const hx = this._SX + fillW;

            this.sliderFill.clear();
            if (fillW > tR) {
                const tr = fillW >= sw ? tR : 0;
                this.sliderFill.fillStyle(0xb8860b, 1);
                this.sliderFill.fillRoundedRect(this._SX, sy - tH / 2, fillW, tH,
                    { tl: tR, bl: tR, tr, br: tr });
                this.sliderFill.fillStyle(0xffe28a, 0.4);
                this.sliderFill.fillRoundedRect(this._SX + 3, sy - tH / 2 + 3, fillW - 6, Math.round(tH * 0.38),
                    { tl: tR, bl: 0, tr: 0, br: 0 });
            }

            this.handleG.clear();
            this.handleG.fillStyle(0x000000, 0.3);
            this.handleG.fillCircle(hx + 2, sy + 2, 20);
            this.handleG.fillStyle(0x4a2f06, 1);
            this.handleG.fillCircle(hx, sy, 20);
            this.handleG.fillStyle(0xd4af37, 1);
            this.handleG.fillCircle(hx, sy, 15);
            this.handleG.fillStyle(0xfff5cc, 0.5);
            this.handleG.fillCircle(hx - 5, sy - 5, 7);
            this.handleG.fillStyle(0x8b6914, 1);
            this.handleG.fillCircle(hx, sy, 5);
            this.handleG.lineStyle(1.5, 0x4a2f06, 0.9);
            this.handleG.strokeCircle(hx, sy, 15);
        };
        this._desenharSlider();

        this.textoVol = scene.add.text(cx, sy + 46, `${Math.round(volumeGlobal * 100)}%`, {
            fontFamily: 'Arial', fontSize: '30px', fontStyle: 'bold', color: '#d4af37'
        }).setOrigin(0.5);

        let zonaSlider = scene.add.zone(cx, sy, sw + 50, 70).setInteractive({ useHandCursor: true });
        zonaSlider.on('pointerdown', (ptr) => { this._arrastando = true; this._moverSlider(ptr.x); });
        scene.input.on('pointermove', (ptr) => { if (this._arrastando) this._moverSlider(ptr.x); });
        scene.input.on('pointerup', () => {
            if (this._arrastando) {
                this._arrastando = false;
                localStorage.setItem('museuVolume', volumeGlobal);
            }
        });

        this._muteBg = scene.add.graphics();
        this._muteTxt = scene.add.text(cx, muteY, volumeGlobal === 0 ? '🔇  MUDO' : '🔊  SOM', {
            fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold',
            color: volumeGlobal === 0 ? '#d4af37' : '#664422'
        }).setOrigin(0.5);
        this._desenharMute(volumeGlobal === 0);

        let zonaMute = scene.add.zone(cx, muteY, 200, 50).setInteractive({ useHandCursor: true });
        zonaMute.on('pointerdown', () => {
            if (volumeGlobal === 0) {
                this._moverSlider(this._SX + this._SW);
            } else {
                this._moverSlider(this._SX);
            }
            localStorage.setItem('museuVolume', volumeGlobal);
        });
    }

    _moverSlider(mouseX) {
        const novoX = Phaser.Math.Clamp(mouseX, this._SX, this._SX + this._SW);
        volumeGlobal = (novoX - this._SX) / this._SW;
        this.textoVol.setText(`${Math.round(volumeGlobal * 100)}%`);
        this._desenharSlider();
        this._desenharMute(volumeGlobal === 0);
        this._muteTxt.setText(volumeGlobal === 0 ? '🔇  MUDO' : '🔊  SOM');
        this._muteTxt.setColor(volumeGlobal === 0 ? '#d4af37' : '#664422');
        this._scene.sound.volume = volumeGlobal;
        if (this._onVolumeChange) this._onVolumeChange(volumeGlobal);
    }

    _desenharMute(ativo) {
        this._muteBg.clear();
        this._muteBg.lineStyle(2, ativo ? 0xd4af37 : 0x443322, 1);
        this._muteBg.strokeRoundedRect(this._cx - 90, this._muteY - 22, 180, 45, 8);
    }
}

class OptionsScene extends Phaser.Scene {
    constructor() { super({ key: 'OptionsScene' }); }

    create() {
        const W = this.cameras.main.width, H = this.cameras.main.height;

        this.add.rectangle(0, 0, W, H / 2, 0x2d0a0a).setOrigin(0, 0);
        this.add.rectangle(0, H / 2, W, H / 2, 0x4a1010).setOrigin(0, 0);

        let moldura = this.add.graphics();
        moldura.lineStyle(3, 0xd4af37, 0.5);
        moldura.strokeRect(28, 28, W - 56, H - 56);

        this.add.text(W / 2, 120, 'OPÇÕES', {
            fontFamily: 'Arial', fontSize: '58px', fontStyle: 'bold', color: '#d4af37', stroke: '#2d0a0a', strokeThickness: 7
        }).setOrigin(0.5);

        this.add.text(W / 2, 245, 'VOLUME', {
            fontFamily: 'Arial', fontSize: '28px', fontStyle: 'bold', color: '#f5e6c8'
        }).setOrigin(0.5);

        let iconMute = this.add.text(W / 2 - 240, 330, '🔇', { fontSize: '32px' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        let iconSound = this.add.text(W / 2 + 240, 330, '🔊', { fontSize: '32px' }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        let slider = new SliderVolume(this, W / 2, 330, 400, 490);

        iconMute.on('pointerdown', () => {
            slider._moverSlider(slider._SX);
            localStorage.setItem('museuVolume', volumeGlobal);
        });
        iconSound.on('pointerdown', () => {
            slider._moverSlider(slider._SX + slider._SW);
            localStorage.setItem('museuVolume', volumeGlobal);
        });

        this._criarBotaoVoltar(W / 2, 624, () => { this.scene.start('MenuScene'); });
    }

    _criarBotaoVoltar(x, y, callback) {
        criarBotaoMuseu(this, x, y, 280, 62, '← VOLTAR AO MENU', true, callback);
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

    create() {
        const W = this.cameras.main.width, H = this.cameras.main.height;

        this.add.rectangle(0, 0, W, H, 0x000000, 0.78).setOrigin(0, 0);

        let painel = this.add.graphics();
        painel.fillStyle(0x0d0600, 1);
        painel.fillRoundedRect(W / 2 - 350, 128, 700, 512, 14);
        painel.fillStyle(0x1c0d02, 0.45);
        painel.fillRoundedRect(W / 2 - 342, 136, 684, 496, 10);
        painel.lineStyle(3, 0xd4af37, 1);
        painel.strokeRoundedRect(W / 2 - 350, 128, 700, 512, 14);
        painel.lineStyle(1, 0xd4af37, 0.35);
        painel.strokeRoundedRect(W / 2 - 342, 136, 684, 496, 10);

        this.add.text(W / 2, 160, '— MUSEU HISTÓRICO MUNICIPAL GILBERTO GERLACH —', {
            fontFamily: 'Arial', fontSize: '11px', color: '#8b6914', fontStyle: 'bold'
        }).setOrigin(0.5);

        let sepG = this.add.graphics();
        sepG.lineStyle(1, 0xd4af37, 0.5);
        sepG.lineBetween(W / 2 - 280, 174, W / 2 + 280, 174);

        this.add.text(W / 2, 200, 'EXPEDIÇÃO PAUSADA', {
            fontFamily: '"Cinzel", "Georgia", serif', fontSize: '42px', fontStyle: 'bold',
            color: '#d4af37', stroke: '#0d0600', strokeThickness: 5
        }).setOrigin(0.5);

        let iconMuteP = this.add.text(W / 2 - 240, 340, '🔇', { fontSize: '32px' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        let iconSoundP = this.add.text(W / 2 + 240, 340, '🔊', { fontSize: '32px' }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        let sliderP = new SliderVolume(this, W / 2, 340, 400, 470, (vol) => {
            this.scene.get(this.parentScene).sound.volume = vol;
        });

        iconMuteP.on('pointerdown', () => {
            sliderP._moverSlider(sliderP._SX);
            localStorage.setItem('museuVolume', volumeGlobal);
        });
        iconSoundP.on('pointerdown', () => {
            sliderP._moverSlider(sliderP._SX + sliderP._SW);
            localStorage.setItem('museuVolume', volumeGlobal);
        });

        this._criarBotaoSprite(W / 2, 540, 'CONTINUAR', true, () => { this._retomarJogo(); });
        this._criarBotaoSprite(W / 2, 620, 'MENU INICIAL', true, () => {
            salvarJogo();
            try { if (musicaFase) { musicaFase.stop(); musicaFase.destroy(); } } catch (e) {}
            musicaFase = null; chaveMusicaAtual = null;
            this.scene.stop(this.parentScene);
            this.scene.stop();
            this.scene.start('MenuScene');
        });

        this.input.keyboard.on('keydown-ESC', () => { this._retomarJogo(); });
        this.input.keyboard.on('keydown-SPACE', () => { this._retomarJogo(); });
    }

    _criarBotaoSprite(x, y, label, ativo, callback) {
        criarBotaoMuseu(this, x, y, 320, 68, label, ativo, callback);
    }

    _retomarJogo() {
        if (musicaFase) musicaFase.resume();
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
        this.load.image('spr_arqueologo_1', 'img/sprites/cenarios/arqterra.png');
        this.load.image('spr_arqueologo_2', 'img/sprites/cenarios/arqjangada.png');
        this.load.image('spr_arqueologo_3', 'img/sprites/cenarios/arqjeep.png');
        this.load.image('spr_gancho', 'img/sprites/cenarios/garra_fechada.png');
        this.load.image('fundo_cenario_terra', 'img/sprites/cenarios/terra.jpeg');
        this.load.image('fundo_cenario_agua', 'img/sprites/cenarios/agua.jpeg');
        this.load.image('fundo_cenario_cascalho', 'img/sprites/cenarios/cascalho.jpeg');
        this.load.image('spr_moeda_prata', 'img/sprites/cenarios/moeda_1000.png');
        this.load.image('spr_moeda_bronze', 'img/sprites/cenarios/moeda_500.png');
        this.load.image('spr_pedra_grande', 'img/sprites/cenarios/pedra_grande.png');
        this.load.image('spr_pedra_pequena', 'img/sprites/cenarios/pedra_pequena.png');
        this.load.image('spr_concha_grande', 'img/sprites/cenarios/concha_grande.png');
        this.load.image('spr_concha_pequena', 'img/sprites/cenarios/concha_pequena.png');
        this.load.image('frag_mascara_1', 'img/sprites/fragmentos/mascara1.png');
        this.load.image('frag_mascara_2', 'img/sprites/fragmentos/mascara2.png');
        this.load.image('frag_mascara_3', 'img/sprites/fragmentos/mascara3.png');
        this.load.image('frag_mascara_full', 'img/sprites/fragmentos/mascarafull.png');
        this.load.image('frag_santo_1', 'img/sprites/fragmentos/santo1.png');
        this.load.image('frag_santo_2', 'img/sprites/fragmentos/santo2.png');
        this.load.image('frag_santo_3', 'img/sprites/fragmentos/santo3.png');
        this.load.image('frag_santo_full', 'img/sprites/fragmentos/santofull.png');
        this.load.image('frag_tigre_1', 'img/sprites/fragmentos/tigre1.png');
        this.load.image('frag_tigre_2', 'img/sprites/fragmentos/tigre2.png');
        this.load.image('frag_tigre_3', 'img/sprites/fragmentos/tigre3.png');
        this.load.image('frag_tigre_full', 'img/sprites/fragmentos/tigrefull.png');
        this.load.image('exib_mascara', 'img/sprites/fragmentos/mascara%20exibicao.png');
        this.load.image('exib_santo', 'img/sprites/fragmentos/santo%20exibicao.png');
        this.load.image('exib_tigre', 'img/sprites/fragmentos/tigre%20exibicao.png');
    }

    create() {
        this.sound.volume = volumeGlobal;
        create.call(this);
    }

    update() {
        update.call(this);
    }
}

GameScene.prototype._criarBotaoPausa = function (x, y) {
    const w = 50, h = 50, r = 8;
    const gfx = this.add.graphics().setDepth(3);

    const desenhar = (hover) => {
        gfx.clear();
        gfx.fillStyle(0x1a0506, hover ? 0.75 : 0.50);
        gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
        gfx.lineStyle(2, 0xd4af37, hover ? 1 : 0.95);
        gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
        gfx.lineStyle(1, 0xd4af37, 0.3);
        gfx.strokeRoundedRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6, 6);
    };
    desenhar(false);

    const pauseTxt = this.add.text(x, y, 'II', {
        fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#d4af37'
    }).setOrigin(0.5).setDepth(4);

    // Hitbox invisível para interatividade (suporta getBounds/setInteractive)
    const hitbox = this.add.rectangle(x, y, w, h, 0x000000, 0).setOrigin(0.5).setDepth(4);
    hitbox.setInteractive({ useHandCursor: true });
    hitbox.on('pointerover', () => { desenhar(true); pauseTxt.setScale(1.1); });
    hitbox.on('pointerout', () => { desenhar(false); pauseTxt.setScale(1.0); });
    hitbox.on('pointerdown', () => { this.time.delayedCall(50, () => { this._abrirMenuPausa(); }); });

    this.botaoPausaBg = hitbox;
};

GameScene.prototype._abrirMenuPausa = function () {
    if (this.scene.isPaused()) return;
    estadoGancho = 'BALANCANDO';
    if (objetoPuxado) { objetoPuxado = null; }
    if (musicaFase) musicaFase.pause();
    this.scene.launch('PauseScene', { parentScene: this.scene.key });
    this.scene.pause();
};

function create() {
    jogoFoiIniciado = true;
    carregarJogo();

    if (!this.textures.exists('spr_diamante')) {
        const g = this.make.graphics({ add: false });
        g.fillStyle(0x00ccff, 1);
        g.fillTriangle(20, 0, 40, 20, 20, 40);
        g.fillTriangle(20, 0, 0, 20, 20, 40);
        g.fillStyle(0xffffff, 0.35);
        g.fillTriangle(8, 18, 20, 2, 20, 18);
        g.lineStyle(2, 0x0088cc, 1);
        g.strokePoints([{ x: 20, y: 0 }, { x: 40, y: 20 }, { x: 20, y: 40 }, { x: 0, y: 20 }], true);
        g.generateTexture('spr_diamante', 40, 40);
        g.destroy();
    }

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Limpa propriedades de cena que persistem entre restarts (Phaser reutiliza a instância)
    this.fundoCenario = null;
    this._revelaAtiva = false;
    this._revelaFechar = null;
    this.gameOverDrawn = false;

    textoCentroBg = null;
    textoCentro = this.add.text(W / 2, H / 2, '', {
        fontFamily: 'MedievalSharp, Georgia, serif', fontSize: '28px',
        color: '#f5deb3', stroke: '#2a0e00', strokeThickness: 2,
        align: 'center', lineSpacing: 10
    }).setOrigin(0.5).setVisible(false).setDepth(11);

    // Centro vertical do HUD = meio entre topo da tela e a base do pé do personagem
    // personagem: charY0=110, metade da altura ≈ 60*(W/1366) → pé ≈ 110+60*(W/1366)
    const hudCY = Math.round((110 + Math.round(60 * (W / 1366))) / 2);
    hudBarY = hudCY + 30; // barra abaixo do painel (painel agora com 86px)

    // Painel de fundo do HUD esquerdo — largura ajustável conforme o texto
    hudPanelBg = this.add.graphics().setDepth(2);
    hudPanelY = hudCY - 62;
    redesenharPainelHUD(hudPanelW);

    textoHUD = this.add.text(16, hudCY - 56, '', {
        font: '17px Arial', fill: '#f5deb3', fontStyle: 'bold', lineSpacing: 7
    }).setDepth(3);

    // Ícone de raio à esquerda da barra, alinhado ao painel (x=6)
    // Barra de energia fora do painel, abaixo dele
    barraEstamina = this.add.graphics().setDepth(3);

    const cx = W - 104, cy = hudCY;
    let clockFace = this.add.graphics().setDepth(2);
    clockFace.fillStyle(0x1a0506, 0.50); clockFace.fillCircle(cx, cy, 56);
    clockFace.lineStyle(2, 0xd4af37, 0.95); clockFace.strokeCircle(cx, cy, 57);
    clockFace.lineStyle(1, 0xd4af37, 0.3); clockFace.strokeCircle(cx, cy, 50);
    // Marcas de hora (12, 3, 6, 9)
    for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI / 2) - Math.PI / 2;
        clockFace.lineStyle(2, 0xd4af37, 0.7);
        clockFace.beginPath();
        clockFace.moveTo(cx + Math.cos(ang) * 44, cy + Math.sin(ang) * 44);
        clockFace.lineTo(cx + Math.cos(ang) * 52, cy + Math.sin(ang) * 52);
        clockFace.strokePath();
    }

    graficoTempoPizza = this.add.graphics({ x: cx, y: cy }).setDepth(3);
    this.add.text(cx, cy - 22, 'TEMPO', { font: '11px Arial', fill: '#bf8b6e', fontStyle: 'bold' }).setOrigin(0.5).setDepth(4);
    textoRelogio = this.add.text(cx, cy + 10, '100', { font: 'bold 26px Arial', fill: '#f0e0b0', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setDepth(4);

    grupoObjetos = this.physics.add.group();
    linhaCorda = this.add.graphics().setDepth(4);

    // Tamanho do personagem e âncora proporcionais à largura do jogo (design base: W=1366)
    const gameScale0 = W / 1366;
    const charW0 = Math.round(180 * gameScale0);
    const charH0 = Math.round(120 * gameScale0);
    const charY0 = 110;
    const charTopDesign = 50; // charY - 60 na escala base

    const ancorasDesign = { 1: [24, 90], 2: [18, 76], 3: [30, 74] };
    const [adx0, ady0] = ancorasDesign[cenarioAtual] || [24, 90];
    this.ancoraX = W / 2 + Math.round(adx0 * gameScale0);
    this.ancoraY = Math.round((charY0 - charH0 / 2) + (ady0 - charTopDesign) * gameScale0);

    gancho = this.physics.add.sprite(this.ancoraX, this.ancoraY, 'spr_gancho');
    gancho.setDisplaySize(Math.round(64 * gameScale0), Math.round(80 * gameScale0));
    gancho.setDepth(4);

    // Ajusta a hitbox da garra para pegar objetos apenas com a ponta
    gancho.body.setSize(gancho.width * 0.4, gancho.height * 0.3);
    gancho.body.setOffset(gancho.width * 0.3, gancho.height * 0.65);

    this.arqueologoSpr = this.add.image(W / 2, charY0, `spr_arqueologo_${cenarioAtual}`);
    this.arqueologoSpr.setDisplaySize(charW0, charH0);
    this.arqueologoSpr.setDepth(1);

    this.physics.add.overlap(gancho, grupoObjetos, pegarObjeto, null, this);
    this.input.on('pointerdown', (pointer) => acaoPrincipal.call(this, pointer), this);
    teclaEspaco = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.teclaEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.teclaM = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this._criarBotaoPausa(cx + 70, cy - 45);

    this.time.addEvent({ delay: 1000, callback: diminuirTempo, callbackScope: this, loop: true });

    montarFase.call(this);
}

function mostrarBanner(scene, texto, cor) {
    const W = scene.cameras.main.width, H = scene.cameras.main.height;
    const bannerW = 680, bannerH = 130;
    const bx = W / 2 - bannerW / 2, by = H / 2 - bannerH / 2;
    if (textoCentroBg) { textoCentroBg.destroy(); }
    textoCentroBg = scene.add.graphics().setDepth(10);
    textoCentroBg.fillStyle(0x2d0a0a, 0.95);
    textoCentroBg.fillRoundedRect(bx, by, bannerW, bannerH, 10);
    textoCentroBg.lineStyle(3, 0xd4af37, 1);
    textoCentroBg.strokeRoundedRect(bx, by, bannerW, bannerH, 10);
    textoCentroBg.lineStyle(1, 0xd4af37, 0.4);
    textoCentroBg.strokeRoundedRect(bx + 7, by + 7, bannerW - 14, bannerH - 14, 7);
    textoCentro.setText(texto).setColor(cor || '#f5deb3').setVisible(true);
}

function esconderBanner() {
    textoCentro.setVisible(false);
    if (textoCentroBg) { textoCentroBg.destroy(); textoCentroBg = null; }
}

// Loop gapless via WebAudio nativo — bypassa o sistema de loop do Phaser
function criarMusicaGapless(scene, chave) {
    try {
        const sndMgr = scene.sound;
        const ctx = sndMgr && sndMgr.context;
        if (!ctx) return null;

        const buffer = scene.cache.audio.get(chave);
        if (!buffer || typeof buffer.getChannelData !== 'function') return null;

        // Detecta último sample audível (elimina silêncio de cauda do MP3)
        const ch = buffer.getChannelData(0);
        let fim = ch.length - 1;
        while (fim > 0 && Math.abs(ch[fim]) < 0.001) fim--;
        const loopEnd = (fim + 1) / buffer.sampleRate;

        // Conecta ao masterVolumeNode do Phaser: herda volume e mute automaticamente
        const gain = ctx.createGain();
        gain.gain.value = 1.0;
        const masterNode = sndMgr.masterVolumeNode || sndMgr.masterMuteNode || ctx.destination;
        gain.connect(masterNode);

        let _src = null, _startedAt = 0, _offset = 0, _ativo = false, _pausado = false;

        function _iniciar(offset) {
            _src = ctx.createBufferSource();
            _src.buffer = buffer;
            _src.loop = true;
            _src.loopStart = 0;
            _src.loopEnd = loopEnd;
            _src.connect(gain);
            _src.start(0, offset % loopEnd);
            _startedAt = ctx.currentTime - (offset % loopEnd);
            _ativo = true;
            _pausado = false;
        }

        _iniciar(0);

        return {
            get isPlaying() { return _ativo && !_pausado; },
            pause() {
                if (!_ativo || _pausado) return;
                _offset = ((ctx.currentTime - _startedAt) % loopEnd + loopEnd) % loopEnd;
                _pausado = true;
                try { _src.stop(0); } catch (e) {}
            },
            resume() {
                if (!_pausado) return;
                _iniciar(_offset);
            },
            stop()    { _ativo = false; _pausado = false; try { _src.stop(0); } catch (e) {} try { gain.disconnect(); } catch (e) {} },
            destroy() { this.stop(); }
        };
    } catch (e) { return null; }
}

function redesenharPainelHUD(largura) {
    if (!hudPanelBg) return;
    hudPanelBg.clear();
    hudPanelBg.fillStyle(0x1a0506, 0.50);
    hudPanelBg.fillRoundedRect(hudPanelX, hudPanelY, largura, 86, 9);
    hudPanelBg.lineStyle(2, 0xd4af37, 0.95);
    hudPanelBg.strokeRoundedRect(hudPanelX, hudPanelY, largura, 86, 9);
    hudPanelBg.lineStyle(1, 0xd4af37, 0.3);
    hudPanelBg.strokeRoundedRect(hudPanelX + 4, hudPanelY + 4, largura - 8, 78, 7);
}

function atualizarHUD() {
    const sitios = ['Ponta de Baixo', 'Rio Maruim', 'Sambaqui Ilha da Casca'];
    const sitio = sitios[cenarioAtual - 1] || 'Sítio Desconhecido';
    textoHUD.setText(`Sítio: ${sitio} - Peça ${faseNoCenario}/3\nFragmentos Coletados: ${moedasColetadas}/${metaMoedas}\nAcervo: ${reliquiasCompletas}/3 relíquias`);

    // Painel se ajusta à largura do texto, com largura mínima
    hudPanelW = Math.max(230, Math.round(textoHUD.width) + 30);
    redesenharPainelHUD(hudPanelW);
}

function acharPosicaoValida(raioNovoItem, larguraTela) {
    let maxTentativas = 100;
    for (let t = 0; t < maxTentativas; t++) {
        let x = Phaser.Math.Between(50, larguraTela - 50);
        let y = Phaser.Math.Between(280, 700);
        let sobreposto = false;

        for (let pos of posicoesOcupadas) {
            if (Phaser.Math.Distance.Between(x, y, pos.x, pos.y) < (raioNovoItem + pos.raio + 5)) {
                sobreposto = true;
                break;
            }
        }

        if (!sobreposto) {
            posicoesOcupadas.push({ x: x, y: y, raio: raioNovoItem });
            return { x: x, y: y };
        }
    }
    return { x: Phaser.Math.Between(100, larguraTela - 100), y: Phaser.Math.Between(300, 700) };
}

function montarFase() {
    // Limpar mensagem de game over se ainda existir
    if (gameOverRetangulo && gameOverRetangulo.active) { gameOverRetangulo.destroy(); }
    gameOverRetangulo = null;
    if (gameOverTexto && gameOverTexto.active) { gameOverTexto.destroy(); }
    gameOverTexto = null;
    this.gameOverDrawn = false;

    if (this.botaoPausaBg) this.botaoPausaBg.setInteractive({ useHandCursor: true });

    grupoObjetos.clear(true, true);
    posicoesOcupadas = [];
    estamina = 150;
    fragmentoRevelado = false;
    jogoVencido = false;
    jogoAcabou = false;
    esperandoProximaFase = false;

    // Reseta o estado da garra para evitar bugs caso o jogador saia no meio de uma ação
    estadoGancho = 'BALANCANDO';
    anguloGancho = 0;
    balancandoParaDireita = true;
    objetoPuxado = null;

    const novaChave = cenarioAtual === 2 ? 'musica_cenario_2'
                    : cenarioAtual === 3 ? 'musica_cenario_3'
                    : 'musica_cenario_1';

    if (novaChave !== chaveMusicaAtual || !musicaFase || !musicaFase.isPlaying) {
        // Cenário mudou ou música não está tocando → reinicia a trilha
        try { if (musicaFase) { musicaFase.stop(); musicaFase.destroy(); } } catch (e) {}
        musicaFase = null;
        chaveMusicaAtual = novaChave;
        musicaFase = criarMusicaGapless(this, chaveMusicaAtual);
        if (!musicaFase) {
            // fallback Phaser caso WebAudio não esteja disponível
            try { musicaFase = this.sound.add(chaveMusicaAtual); musicaFase.play({ loop: true, volume: volumeGlobal }); } catch (e) { musicaFase = null; }
        }
    }

    let degrauDificuldade = ((cenarioAtual - 1) * 3) + (faseNoCenario - 1);
    velocidadeBalanço = 1.0 + (degrauDificuldade * 0.15);
    if (velocidadeBalanço > velocidadeMaxima) velocidadeBalanço = velocidadeMaxima;

    // Fundo do cenário: imagem para os que já têm arte, cor sólida para os demais
    const Wbg = this.cameras.main.width, Hbg = this.cameras.main.height;
    const fundosCenario = { 1: 'fundo_cenario_terra', 2: 'fundo_cenario_agua', 3: 'fundo_cenario_cascalho' };
    const chaveFundo = fundosCenario[cenarioAtual];

    if (chaveFundo) {
        if (!this.fundoCenario) {
            this.fundoCenario = this.add.image(Wbg / 2, Hbg / 2, chaveFundo).setDepth(-10);
        } else {
            this.fundoCenario.setTexture(chaveFundo).setVisible(true);
        }
        this.fundoCenario.setDisplaySize(Wbg, Hbg);
    } else {
        // Cenário sem imagem — fallback cor sólida
        if (this.fundoCenario) this.fundoCenario.setVisible(false);
        this.cameras.main.setBackgroundColor('#b71c1c');
    }

    const W = this.cameras.main.width;
    const gameScale = W / 1366;
    const charW = Math.round(180 * gameScale);
    const charH = Math.round(120 * gameScale);
    const charTopDesign = 50;

    if (this.arqueologoSpr) {
        this.arqueologoSpr.setTexture(`spr_arqueologo_${cenarioAtual}`);
        this.arqueologoSpr.setDisplaySize(charW, charH);
    }

    const ancorasDesign = { 1: [24, 90], 2: [18, 76], 3: [30, 74] };
    const [ax, ay] = ancorasDesign[cenarioAtual] || [24, 90];
    this.ancoraX = W / 2 + Math.round(ax * gameScale);
    this.ancoraY = Math.round((110 - charH / 2) + (ay - charTopDesign) * gameScale);

    atualizarHUD();
    esconderBanner();
    const cfgCenario = [
        { m5: 2, m3: 6, m1: 8, pGrande: 2, pPequena: 4 },
        { m5: 3, m3: 7, m1: 9, pGrande: 3, pPequena: 5 },
        { m5: 4, m3: 8, m1: 10, pGrande: 5, pPequena: 6 },
    ];
    const cfg = cfgCenario[Phaser.Math.Clamp(cenarioAtual - 1, 0, 2)];

    // Diamante (valor 5) — 36x36
    for (let i = 0; i < cfg.m5; i++) {
        const d = 36, r = d / 2;
        let pos = acharPosicaoValida(r, W);
        let spr = this.physics.add.sprite(pos.x, pos.y, 'spr_diamante');
        spr.setDisplaySize(d, d);
        // Reduz a hitbox do item para 80% do tamanho visual e centraliza
        spr.body.setCircle(spr.width * 0.4, spr.width * 0.1, spr.height * 0.1);
        spr.tipo = 'moeda'; spr.peso = 0.5; spr.valor = 5;
        grupoObjetos.add(spr);
    }

    // Moeda 1000 / prata (valor 3) — ajustado para a nova imagem
    for (let i = 0; i < cfg.m3; i++) {
        const d = 64, r = d / 2; // Aumentamos o tamanho visual base (era 42, agora 64)
        let pos = acharPosicaoValida(r, W);
        let spr = this.physics.add.sprite(pos.x, pos.y, 'spr_moeda_prata');
        spr.setDisplaySize(d, d);

        // Hitbox ajustada: raio levemente menor (35%) e mais centralizado (15% de margem)
        spr.body.setCircle(spr.width * 0.35, spr.width * 0.15, spr.height * 0.15);
        spr.tipo = 'moeda'; spr.peso = 1.5; spr.valor = 3;
        grupoObjetos.add(spr);
    }

    // Moeda 500 / bronze (valor 1) — 52x52
    for (let i = 0; i < cfg.m1; i++) {
        const d = 52, r = d / 2;
        let pos = acharPosicaoValida(r, W);
        let spr = this.physics.add.sprite(pos.x, pos.y, 'spr_moeda_bronze');
        spr.setDisplaySize(d, d);
        spr.body.setCircle(spr.width * 0.4, spr.width * 0.1, spr.height * 0.1);
        spr.tipo = 'moeda'; spr.peso = 1.0; spr.valor = 1;
        grupoObjetos.add(spr);
    }

    let chaveSpriteGrande = cenarioAtual === 2 ? 'spr_concha_grande' : 'spr_pedra_grande';
    for (let i = 0; i < cfg.pGrande; i++) {
        const d = 170, r = d / 2;
        let pos = acharPosicaoValida(r, W);
        let spr = this.physics.add.sprite(pos.x, pos.y, chaveSpriteGrande);
        spr.setDisplaySize(d, d);
        spr.body.setCircle(spr.width * 0.4, spr.width * 0.1, spr.height * 0.1);
        spr.tipo = 'pedra_pesada'; spr.peso = 8.0; spr.valor = 0;
        grupoObjetos.add(spr);
    }

    let chaveSpritePequena = cenarioAtual === 2 ? 'spr_concha_pequena' : 'spr_pedra_pequena';
    for (let i = 0; i < cfg.pPequena; i++) {
        const d = 110, r = d / 2;
        let pos = acharPosicaoValida(r, W);
        let spr = this.physics.add.sprite(pos.x, pos.y, chaveSpritePequena);
        spr.setDisplaySize(d, d);
        spr.body.setCircle(spr.width * 0.4, spr.width * 0.1, spr.height * 0.1);
        spr.tipo = 'pedra_pesada'; spr.peso = 4.0; spr.valor = 0;
        grupoObjetos.add(spr);
    }
}

function spawnarFragmento() {
    mostrarBanner(this, 'ARTEFATO LOCALIZADO\nResgate o fragmento antes que o tempo acabe!');

    this.time.delayedCall(2500, () => {
        if (!esperandoProximaFase && !jogoAcabou) esconderBanner();
    });

    let r = 20;
    let pos = acharPosicaoValida(r, this.cameras.main.width);

    const relicNameMap = ['mascara', 'santo', 'tigre'];
    const relicName = relicNameMap[cenarioAtual - 1] || 'mascara';
    const texKey = `frag_${relicName}_${faseNoCenario}`;

    let spr = this.physics.add.sprite(pos.x, pos.y, texKey);
    spr.setDisplaySize(70, 70);
    spr.body.setSize(54, 54, true);
    spr.tipo = 'fragmento';
    spr.peso = 2;
    spr.valor = 0;

    grupoObjetos.add(spr);
}

function diminuirTempo() {
    if (jogoAcabou || esperandoProximaFase) return;
    tempoRestante--;

    if (tempoRestante <= 0) {
        jogoAcabou = true;
        if (musicaFase) musicaFase.pause();
        mostrarBanner(this, 'FIM DA EXPEDIÇÃO\nO tempo de escavação esgotou.', '#ff8080');
        limparSave();
        mostrarControlesGameOver.call(this);
    }
}

function mostrarControlesGameOver() {
    if (this.gameOverDrawn) return;
    if (this.botaoPausaBg) this.botaoPausaBg.disableInteractive();
    const W = this.cameras.main.width;
    let mensagem = jogoVencido
        ? 'Pressione M para retornar ao Museu Histórico de São José.'
        : 'Clique ou aperte ESPAÇO para continuar a escavação.';

    gameOverTexto = this.add.text(W / 2, 510, mensagem, {
        fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', align: 'center'
    }).setOrigin(0.5);

    const textH = gameOverTexto.height;
    gameOverRetangulo = this.add.rectangle(W / 2, 510, gameOverTexto.width + 40, textH + 30, 0x000000, 0.55).setOrigin(0.5);
    gameOverRetangulo.setDepth(gameOverTexto.depth - 1);
    this.gameOverDrawn = true;
}

function reiniciarFase() {
    if (!jogoAcabou) return;
    moedasColetadas = 0;
    tempoRestante = 100;
    montarFase.call(this);
}

function acaoPrincipal(pointer) {
    if (this._revelaFechouNesseFrame) return;
    if (jogoAcabou) {
        reiniciarFase.call(this);
        return;
    }
    if (pointer && this.botaoPausaBg) {
        const bounds = this.botaoPausaBg.getBounds();
        if (Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y)) return;
    }

    if (esperandoProximaFase) {
        esperandoProximaFase = false;
        moedasColetadas = 0;
        tempoRestante = 100;
        montarFase.call(this);
    } else if (estadoGancho === 'BALANCANDO') {
        estadoGancho = 'DESCENDO';
    }
}

function update() {
    this._revelaFechouNesseFrame = false;
    if (this._revelaAtiva) {
        if (Phaser.Input.Keyboard.JustDown(teclaEspaco) || Phaser.Input.Keyboard.JustDown(this.teclaM)) {
            if (this._revelaFechar) this._revelaFechar();
        }
        return;
    }
    if (jogoAcabou) {
        if (Phaser.Input.Keyboard.JustDown(this.teclaEsc) || Phaser.Input.Keyboard.JustDown(this.teclaM)) {
            try { if (musicaFase) { musicaFase.stop(); musicaFase.destroy(); } } catch (e) {}
            musicaFase = null; chaveMusicaAtual = null;
            this.scene.start('MenuScene');
            return;
        }
        if (Phaser.Input.Keyboard.JustDown(teclaEspaco) || this.input.activePointer.justDown) {
            if (jogoVencido) {
                try { if (musicaFase) { musicaFase.stop(); musicaFase.destroy(); } } catch (e) {}
                musicaFase = null; chaveMusicaAtual = null;
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
    linhaCorda.moveTo(this.ancoraX, this.ancoraY);
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

    let propE = estamina / estaminaMaxima;
    let corB = propE > 0.50 ? 0x44cc44 : propE > 0.20 ? 0xffaa00 : 0xff3333;
    let alphaB = propE < 0.20 ? (Math.sin(this.time.now * 0.012) * 0.4 + 0.6) : 1;

    barraEstamina.clear();

    const barH = 20, barR = barH / 2;
    const barW = Math.max(60, Math.round(hudPanelW * 0.90)); // 90% do painel, margem igual dos dois lados
    const barX = Math.round(hudPanelX + (hudPanelW - barW) / 2); // centralizada, ambos os lados movem juntos

    // Fundo escuro (pill)
    barraEstamina.fillStyle(0x1a1a1a, 0.95);
    barraEstamina.fillRoundedRect(barX, hudBarY, barW, barH, barR);

    const fillW = Math.max(0, Math.round((barW - 4) * propE));
    if (fillW > barR) {
        // Preenchimento colorido
        barraEstamina.fillStyle(corB, alphaB);
        barraEstamina.fillRoundedRect(barX + 2, hudBarY + 2, fillW, barH - 4, barR - 2);

        // Segmentos verticais (divisórias escuras)
        const numSeg = 8;
        const segStep = (barW - 4) / numSeg;
        for (let i = 1; i < numSeg; i++) {
            const sx = barX + 2 + segStep * i;
            if (sx < barX + 2 + fillW - 2) {
                barraEstamina.fillStyle(0x000000, 0.30);
                barraEstamina.fillRect(sx, hudBarY + 2, 2, barH - 4);
            }
        }

        // Brilho superior (gloss)
        barraEstamina.fillStyle(0xffffff, 0.20);
        barraEstamina.fillRoundedRect(barX + 3, hudBarY + 2, fillW - 2, Math.round((barH - 4) * 0.45), barR - 2);
    }

    // Borda externa (silver)
    barraEstamina.lineStyle(2.5, 0x999999, 1);
    barraEstamina.strokeRoundedRect(barX, hudBarY, barW, barH, barR);

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
        let anguloFimPizza = anguloInicioPizza + (porcentagemTempoPerdido * 2 * Math.PI);
        graficoTempoPizza.arc(0, 0, 36, anguloInicioPizza, anguloFimPizza, false);
        graficoTempoPizza.closePath();
        graficoTempoPizza.fillPath();
    }

    if (estadoGancho === 'BALANCANDO') {
        if (apertouBotao) acaoPrincipal.call(this, this.input.activePointer);

        if (balancandoParaDireita) {
            anguloGancho += velocidadeBalanço;
            if (anguloGancho >= 75) balancandoParaDireita = false;
        } else {
            anguloGancho -= velocidadeBalanço;
            if (anguloGancho <= -75) balancandoParaDireita = true;
        }

        let tamanhoDaCorda = 135;

        gancho.x = this.ancoraX + Math.sin(radianos) * tamanhoDaCorda;
        gancho.y = this.ancoraY + Math.cos(radianos) * tamanhoDaCorda;
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

        if (gancho.y <= this.arqueologoSpr.y + this.arqueologoSpr.displayHeight / 2) {
            estadoGancho = 'BALANCANDO';
            anguloGancho = Phaser.Math.Between(-55, 55);
            balancandoParaDireita = anguloGancho < 0 ? true : Phaser.Math.Between(0, 1) === 0;

            if (objetoPuxado) {
                if (objetoPuxado.tipo === 'moeda') {
                    moedasColetadas += objetoPuxado.valor;
                    let corTexto = objetoPuxado.valor === 5 ? '#ffffff' : objetoPuxado.valor === 3 ? '#d4af37' : '#ffaa00';
                    mostrarTextoFlutuante(this, gancho.x, gancho.y, `+$${objetoPuxado.valor}`, corTexto);
                    this.cameras.main.flash(160, 255, 215, 0);
                    atualizarHUD();

                    if (moedasColetadas >= metaMoedas && !fragmentoRevelado) {
                        fragmentoRevelado = true;
                        spawnarFragmento.call(this);
                    }
                }
                else if (objetoPuxado.tipo === 'fragmento') {
                    mostrarTextoFlutuante(this, gancho.x, gancho.y, 'ACHADO!', '#00ffff');
                    this.cameras.main.flash(300, 0, 200, 220);
                    pulsarIrradiante(this, gancho.x, gancho.y);
                    fragmentosAtuais++;
                    faseNoCenario++;

                    const cenarioCaptura = cenarioAtual;
                    const fragsCapturados = fragmentosAtuais;

                    if (fragmentosAtuais >= 3) {
                        reliquiasCompletas++;
                        cenarioAtual++;
                        fragmentosAtuais = 0;
                        faseNoCenario = 1;
                        moedasColetadas = 0;
                        tempoRestante = 100;
                        salvarJogo();

                        if (musicaFase) musicaFase.pause();

                        if (reliquiasCompletas >= 3) {
                            mostrarCenarioCompleto(this, cenarioCaptura, () => {
                                mostrarVitoriaFinal(this, () => {
                                    try { if (musicaFase) { musicaFase.stop(); musicaFase.destroy(); } } catch (e) {}
                                    musicaFase = null; chaveMusicaAtual = null;
                                    this.scene.start('MenuScene');
                                });
                            });
                        } else {
                            mostrarCenarioCompleto(this, cenarioCaptura, () => {
                                mostrarBanner(this, `Novo sítio arqueológico desbloqueado!\nClique para iniciar a próxima escavação.`);
                                esperandoProximaFase = true;
                            });
                        }
                    } else {
                        moedasColetadas = 0;
                        tempoRestante = 100;
                        salvarJogo();
                        if (musicaFase) musicaFase.pause();
                        mostrarRevela(this, cenarioCaptura, fragsCapturados, () => {
                            mostrarBanner(this, `Fragmento ${fragsCapturados}/3 catalogado\nClique para continuar a escavação.`);
                            esperandoProximaFase = true;
                        });
                    }
                }
                objetoPuxado.destroy();
                objetoPuxado = null;
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

// Mostra tela de progresso após coletar fragmento 1/3 ou 2/3
function mostrarRevela(scene, cenario, numFragmentos, aoFechar) {
    const W = scene.cameras.main.width;
    const H = scene.cameras.main.height;
    const relicKey = ['mascara', 'santo', 'tigre'][cenario - 1] || 'mascara';
    const subtitulos = [
        '',
        'O primeiro fragmento foi catalogado. A busca continua...',
        'Dois fragmentos encontrados. Falta apenas um!'
    ];

    scene._revelaAtiva = true;
    const obj = [];

    const pw = 640, ph = 480;
    const px = W / 2 - pw / 2, py = H / 2 - ph / 2;

    obj.push(scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(50));

    let panel = scene.add.graphics().setDepth(51);
    panel.fillStyle(0x0d0600, 1);
    panel.fillRoundedRect(px, py, pw, ph, 14);
    panel.fillStyle(0x1c0d02, 0.4);
    panel.fillRoundedRect(px + 8, py + 8, pw - 16, ph - 16, 10);
    panel.lineStyle(3, 0xd4af37, 1);
    panel.strokeRoundedRect(px, py, pw, ph, 14);
    panel.lineStyle(1, 0xd4af37, 0.35);
    panel.strokeRoundedRect(px + 8, py + 8, pw - 16, ph - 16, 10);
    obj.push(panel);

    const hY = py + 20;
    obj.push(scene.add.text(W / 2, hY, '— MUSEU HISTÓRICO DE SÃO JOSÉ —', {
        fontFamily: 'Arial', fontSize: '10px', color: '#8b6914', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52));

    let s1 = scene.add.graphics().setDepth(52);
    s1.lineStyle(1, 0xd4af37, 0.5);
    s1.lineBetween(W / 2 - 270, hY + 14, W / 2 + 270, hY + 14);
    obj.push(s1);

    obj.push(scene.add.text(W / 2, hY + 44, `FRAGMENTO  ${numFragmentos}/3  RECUPERADO`, {
        fontFamily: '"Cinzel", "Georgia", serif', fontSize: '28px', fontStyle: 'bold',
        color: '#d4af37', stroke: '#0d0600', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5).setDepth(52));

    if (subtitulos[numFragmentos]) {
        obj.push(scene.add.text(W / 2, hY + 82, subtitulos[numFragmentos], {
            fontFamily: 'Arial', fontSize: '13px', color: '#bf8b6e', align: 'center'
        }).setOrigin(0.5).setDepth(52));
    }

    let s2 = scene.add.graphics().setDepth(52);
    const s2Y = hY + 100;
    s2.lineStyle(1, 0xd4af37, 0.3);
    s2.lineBetween(W / 2 - 260, s2Y, W / 2 + 260, s2Y);
    obj.push(s2);

    // Fragmentos lado a lado
    const fragTop = s2Y + 12;
    const fragBot = py + ph - 56;
    const fragH = fragBot - fragTop;
    const colW = pw / 3;

    for (let j = 1; j <= 3; j++) {
        const tk = `frag_${relicKey}_${j}`;
        const src = scene.textures.get(tk).getSourceImage();
        const maxW = colW - 30, maxH = fragH - 28;
        const sc = Math.min(maxW / src.width, maxH / src.height);
        const cx = px + (j - 0.5) * colW;
        const cy = fragTop + fragH / 2 - 10;

        let piece = scene.add.image(cx, cy, tk).setDepth(52);
        piece.setDisplaySize(Math.round(src.width * sc), Math.round(src.height * sc));
        if (j > numFragmentos) { piece.setTint(0x222222); piece.setAlpha(0.2); }
        obj.push(piece);

        // Número do fragmento
        obj.push(scene.add.text(cx, fragBot - 10, `${j} / 3`, {
            fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold',
            color: j <= numFragmentos ? '#d4af37' : '#443322'
        }).setOrigin(0.5).setDepth(52));
    }

    let s3 = scene.add.graphics().setDepth(52);
    s3.lineStyle(1, 0xd4af37, 0.3);
    s3.lineBetween(W / 2 - 260, py + ph - 44, W / 2 + 260, py + ph - 44);
    obj.push(s3);

    let cont = scene.add.text(W / 2, py + ph - 24, 'CLIQUE AQUI OU APERTE ESPAÇO PARA CONTINUAR A ESCAVAÇÃO', {
        fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold', color: '#8b6914', align: 'center'
    }).setOrigin(0.5).setDepth(52);
    obj.push(cont);
    scene.tweens.add({ targets: cont, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    const fechar = () => {
        obj.forEach(o => { if (o && o.active) o.destroy(); });
        scene._revelaAtiva = false;
        scene._revelaFechouNesseFrame = true;
        scene._revelaFechar = null;
        scene.input.off('pointerdown', fechar);
        aoFechar();
    };
    scene._revelaFechar = fechar;
    scene.input.once('pointerdown', fechar);
}

// Mostra tela de objeto completo após coletar os 3 fragmentos de um cenário (imagem exibicao)
function mostrarCenarioCompleto(scene, cenario, aoFechar) {
    const W = scene.cameras.main.width;
    const H = scene.cameras.main.height;
    const exibKeys = ['exib_mascara', 'exib_santo', 'exib_tigre'];
    const nomes = ['Máscara Ritual', 'Imagem Sacra', 'Tigre de Bronze'];
    const msgs = [
        'Este artefato sagrado encontrou seu lar\nno Museu Histórico Municipal Gilberto Gerlach.',
        'Esta relíquia volta a ocupar\nseu lugar de honra no acervo do museu.',
        'Esta peça única completa\na coleção arqueológica do museu.'
    ];
    const idx = (cenario - 1);

    scene._revelaAtiva = true;
    const obj = [];

    const pw = 560, ph = 640;
    const px = W / 2 - pw / 2, py = H / 2 - ph / 2;

    obj.push(scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(50));

    let panel = scene.add.graphics().setDepth(51);
    panel.fillStyle(0x0d0600, 1);
    panel.fillRoundedRect(px, py, pw, ph, 14);
    panel.fillStyle(0x1c0d02, 0.4);
    panel.fillRoundedRect(px + 8, py + 8, pw - 16, ph - 16, 10);
    panel.lineStyle(3, 0xd4af37, 1);
    panel.strokeRoundedRect(px, py, pw, ph, 14);
    panel.lineStyle(1, 0xd4af37, 0.35);
    panel.strokeRoundedRect(px + 8, py + 8, pw - 16, ph - 16, 10);
    obj.push(panel);

    const hY = py + 20;
    obj.push(scene.add.text(W / 2, hY, '— MUSEU HISTÓRICO DE SÃO JOSÉ —', {
        fontFamily: 'Arial', fontSize: '10px', color: '#8b6914', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52));
    let s1 = scene.add.graphics().setDepth(52);
    s1.lineStyle(1, 0xd4af37, 0.5); s1.lineBetween(W / 2 - 240, hY + 14, W / 2 + 240, hY + 14);
    obj.push(s1);

    obj.push(scene.add.text(W / 2, hY + 44, 'RELÍQUIA RESTAURADA', {
        fontFamily: '"Cinzel", "Georgia", serif', fontSize: '30px', fontStyle: 'bold',
        color: '#d4af37', stroke: '#0d0600', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5).setDepth(52));

    obj.push(scene.add.text(W / 2, hY + 82, nomes[idx] || '', {
        fontFamily: 'MedievalSharp, Georgia, serif', fontSize: '22px',
        color: '#e8c890', stroke: '#0d0600', strokeThickness: 1, align: 'center'
    }).setOrigin(0.5).setDepth(52));

    let s2 = scene.add.graphics().setDepth(52);
    const s2Y = hY + 102;
    s2.lineStyle(1, 0xd4af37, 0.3); s2.lineBetween(W / 2 - 220, s2Y, W / 2 + 220, s2Y);
    obj.push(s2);

    // Imagem do artefato centralizada e proporcional
    const imgAreaTop = s2Y + 10;
    const imgAreaBot = py + ph - 110;
    const imgAreaH = imgAreaBot - imgAreaTop;
    const exibKey = exibKeys[idx] || exibKeys[0];
    const exibSrc = scene.textures.get(exibKey).getSourceImage();
    const exibScale = Math.min((pw - 60) / exibSrc.width, imgAreaH / exibSrc.height);
    let img = scene.add.image(W / 2, imgAreaTop + imgAreaH / 2, exibKey).setDepth(52);
    img.setDisplaySize(Math.round(exibSrc.width * exibScale), Math.round(exibSrc.height * exibScale));
    obj.push(img);

    let s3 = scene.add.graphics().setDepth(52);
    const s3Y = py + ph - 98;
    s3.lineStyle(1, 0xd4af37, 0.3); s3.lineBetween(W / 2 - 220, s3Y, W / 2 + 220, s3Y);
    obj.push(s3);

    obj.push(scene.add.text(W / 2, s3Y + 22, msgs[idx] || '', {
        fontFamily: 'MedievalSharp, Georgia, serif', fontSize: '18px',
        color: '#f0d080', stroke: '#0d0600', strokeThickness: 2,
        align: 'center', lineSpacing: 6
    }).setOrigin(0.5).setDepth(52));

    let s4 = scene.add.graphics().setDepth(52);
    const s4Y = py + ph - 44;
    s4.lineStyle(1, 0xd4af37, 0.3); s4.lineBetween(W / 2 - 220, s4Y, W / 2 + 220, s4Y);
    obj.push(s4);

    let cont = scene.add.text(W / 2, s4Y + 18, 'CLIQUE AQUI OU APERTE ESPAÇO PARA CONTINUAR', {
        fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold', color: '#8b6914', align: 'center'
    }).setOrigin(0.5).setDepth(52);
    obj.push(cont);
    scene.tweens.add({ targets: cont, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    const fechar = () => {
        obj.forEach(o => { if (o && o.active) o.destroy(); });
        scene._revelaAtiva = false;
        scene._revelaFechouNesseFrame = true;
        scene._revelaFechar = null;
        scene.input.off('pointerdown', fechar);
        aoFechar();
    };
    scene._revelaFechar = fechar;
    scene.input.once('pointerdown', fechar);
}

// Mostra tela de vitória com os 3 objetos completos (imagens full)
function mostrarVitoriaFinal(scene, aoFechar) {
    const W = scene.cameras.main.width;
    const H = scene.cameras.main.height;

    scene._revelaAtiva = true;
    const obj = [];

    obj.push(scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 1).setDepth(50));

    // Pergaminho como fundo — esticado para cobrir toda a área
    let perg = scene.add.image(W / 2, H / 2, 'pergaminho').setDepth(51);
    perg.setDisplaySize(W - 40, H - 10);
    obj.push(perg);

    // Overlay escuro suave para melhorar legibilidade do texto sobre o papel
    let overlay = scene.add.graphics().setDepth(51);
    overlay.fillStyle(0x2a1200, 0.18);
    overlay.fillRect(20, 5, W - 40, H - 10);
    obj.push(overlay);

    obj.push(scene.add.text(W / 2, 52, '— MUSEU HISTÓRICO DE SÃO JOSÉ —', {
        fontFamily: 'Arial', fontSize: '11px', color: '#5c3010', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52));
    let s1 = scene.add.graphics().setDepth(52);
    s1.lineStyle(1, 0x7a4a18, 0.5); s1.lineBetween(W / 2 - 420, 65, W / 2 + 420, 65);
    obj.push(s1);

    obj.push(scene.add.text(W / 2, 98, 'MISSÃO ARQUEOLÓGICA CUMPRIDA', {
        fontFamily: '"Cinzel", "Georgia", serif', fontSize: '34px', fontStyle: 'bold',
        color: '#3d1a00', stroke: '#c8a060', strokeThickness: 2, align: 'center'
    }).setOrigin(0.5).setDepth(52));

    obj.push(scene.add.text(W / 2, 140, 'As três relíquias históricas foram resgatadas e catalogadas.', {
        fontFamily: 'Georgia, serif', fontSize: '15px', fontStyle: 'italic',
        color: '#5c3010', align: 'center'
    }).setOrigin(0.5).setDepth(52));

    let s2 = scene.add.graphics().setDepth(52);
    s2.lineStyle(1, 0x7a4a18, 0.4); s2.lineBetween(W / 2 - 380, 160, W / 2 + 380, 160);
    obj.push(s2);

    const vitoriaExibKeys = ['exib_mascara', 'exib_santo', 'exib_tigre'];
    const nomes = ['Máscara Ritual', 'Imagem Sacra', 'Tigre de Bronze'];
    const startX = W / 2 - 310;

    for (let i = 0; i < 3; i++) {
        let ix = startX + i * 310;
        const src = scene.textures.get(vitoriaExibKeys[i]).getSourceImage();
        const scale = Math.min(250 / src.width, 320 / src.height);
        let img = scene.add.image(ix, 340, vitoriaExibKeys[i]).setDepth(52);
        img.setDisplaySize(Math.round(src.width * scale), Math.round(src.height * scale));
        obj.push(img);
        obj.push(scene.add.text(ix, 524, nomes[i], {
            fontFamily: '"Cinzel", Georgia, serif', fontSize: '15px', fontStyle: 'bold',
            color: '#3d1a00', stroke: '#d4b070', strokeThickness: 1, align: 'center'
        }).setOrigin(0.5).setDepth(52));
    }

    let s3 = scene.add.graphics().setDepth(52);
    s3.lineStyle(1, 0x7a4a18, 0.4); s3.lineBetween(W / 2 - 380, 550, W / 2 + 380, 550);
    obj.push(s3);

    obj.push(scene.add.text(W / 2, 590, 'Estes artefatos agora fazem parte permanente do acervo do Museu Histórico Municipal Gilberto Gerlach.\nObrigado por ajudar a preservar nossa história!', {
        fontFamily: 'Georgia, serif', fontSize: '17px', fontStyle: 'italic',
        color: '#3d1a00', align: 'center', lineSpacing: 7
    }).setOrigin(0.5).setDepth(52));

    let s4 = scene.add.graphics().setDepth(52);
    s4.lineStyle(1, 0x7a4a18, 0.4); s4.lineBetween(W / 2 - 380, 645, W / 2 + 380, 645);
    obj.push(s4);

    let cont = scene.add.text(W / 2, 664, 'CLIQUE AQUI, APERTE ESPAÇO OU M PARA RETORNAR AO MUSEU', {
        fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold', color: '#7a4a18', align: 'center'
    }).setOrigin(0.5).setDepth(52);
    obj.push(cont);
    scene.tweens.add({ targets: cont, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    const fechar = () => {
        obj.forEach(o => { if (o && o.active) o.destroy(); });
        scene._revelaAtiva = false;
        scene._revelaFechouNesseFrame = true;
        scene._revelaFechar = null;
        scene.input.off('pointerdown', fechar);
        aoFechar();
    };
    scene._revelaFechar = fechar;
    scene.input.once('pointerdown', fechar);
}

function pegarObjeto(ganchoObjeto, objetoAtingido) {
    if (estadoGancho === 'DESCENDO') {
        estadoGancho = 'SUBINDO';
        objetoPuxado = objetoAtingido;
        objetoPuxado.setDepth(5);
        if (objetoAtingido.tipo === 'pedra_pesada') {
            let scene = ganchoObjeto.scene;
            const msg = objetoAtingido.peso >= 6 ? 'MUITO PESADA!' : 'PESADA!';
            mostrarTextoFlutuante(scene, ganchoObjeto.x, ganchoObjeto.y, msg, '#ff4444');
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
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: 768
    },
    parent: 'game-container',
    backgroundColor: '#2d0a0a',
    physics: { default: 'arcade', arcade: { debug: false } },
    fps: { target: 60, forceSetTimeOut: true },
    scene: [MenuScene, InventoryScene, TutorialScene, OptionsScene, GameScene, PauseScene]
};
new Phaser.Game(config);