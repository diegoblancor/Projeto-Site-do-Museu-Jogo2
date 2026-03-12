const config = {
    type: Phaser.AUTO,
    width: 1024, 
    height: 768,
    parent: 'game-container', 
    backgroundColor: '#333333',
    physics: { default: 'arcade', arcade: { debug: false } },
    fps: { target: 60, forceSetTimeOut: true },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

let gancho, linhaCorda, grupoObjetos;
let estadoGancho = 'BALANCANDO', anguloGancho = 0, balancandoParaDireita = true;
let velocidadeBalanço = 1.0, velocidadeMaxima = 4.0, aumentoVelocidade = 0.2, velocidadeTiroPadrao = 8, objetoPuxado = null;

let moedasColetadas = 0;
let metaMoedas = 25; 
let fragmentosAtuais = 0;   
let reliquiasCompletas = 0; 
let faseAtual = 1;

let tempoRestante = 100;    
let jogoAcabou = false;
let esperandoProximaFase = false; 
let fragmentoRevelado = false;

// --- AQUI ESTÁ O BUFF DO JOGADOR ---
let estamina = 150;
let estaminaMaxima = 150;

let textoHUD, textoTempo, textoCentro, textoEstamina;
let teclaEspaco;

let posicoesOcupadas = []; 

function preload() {}

function create() {
    textoHUD = this.add.text(10, 10, '', { font: '22px Arial', fill: '#fff', fontStyle: 'bold' });
    textoTempo = this.add.text(850, 10, 'Tempo: 100', { font: '28px Arial', fill: '#ff0000', fontStyle: 'bold' });
    textoEstamina = this.add.text(850, 45, 'Energia: 100%', { font: '22px Arial', fill: '#00ff00', fontStyle: 'bold' });
    textoCentro = this.add.text(512, 384, '', { font: '45px Arial', fill: '#00ff00', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);

    grupoObjetos = this.physics.add.group();
    linhaCorda = this.add.graphics();
    
    gancho = this.add.rectangle(512, 100, 20, 20, 0xffffff);
    this.physics.add.existing(gancho);

    this.physics.add.overlap(gancho, grupoObjetos, pegarObjeto, null, this);
    this.input.on('pointerdown', acaoPrincipal, this);
    teclaEspaco = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.time.addEvent({ delay: 1000, callback: diminuirTempo, callbackScope: this, loop: true });

    montarFase.call(this);
}

function atualizarHUD() {
    // Corrigido: Adicionado backticks (crases) para interpolação de string
    textoHUD.setText(`Fase: ${faseAtual} | Pontos: ${moedasColetadas}/${metaMoedas}\nFragmentos: ${fragmentosAtuais}/3 | Relíquias: ${reliquiasCompletas}/3`);
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
    velocidadeBalanço = 1.0;
    estamina = 150; 
    fragmentoRevelado = false; 
    
    atualizarHUD();
    textoTempo.setText('Tempo: ' + tempoRestante);
    textoCentro.setText(''); 

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
    textoTempo.setText('Tempo: ' + tempoRestante);
    if (tempoRestante <= 0) {
        jogoAcabou = true;
        textoCentro.setText('TEMPO ESGOTADO!\nGAME OVER.');
        textoCentro.setColor('#ff0000');
    }
}

function acaoPrincipal() {
    if (jogoAcabou) return;
    if (esperandoProximaFase) {
        esperandoProximaFase = false;
        montarFase.call(this); 
    } else if (estadoGancho === 'BALANCANDO') {
        estadoGancho = 'DESCENDO';
    }
}

function update() {
    if (jogoAcabou || esperandoProximaFase) return; 

    linhaCorda.clear();
    linhaCorda.lineStyle(3, 0xaaaaaa, 1);
    linhaCorda.beginPath();
    linhaCorda.moveTo(512, 50);
    linhaCorda.lineTo(gancho.x, gancho.y);
    linhaCorda.strokePath();

    let radianos = Phaser.Math.DegToRad(anguloGancho);
    let apertouBotao = Phaser.Input.Keyboard.JustDown(teclaEspaco) || this.input.activePointer.justDown;

    if (estamina < estaminaMaxima) {
        estamina += 0.15; 
        if (estamina > estaminaMaxima) estamina = estaminaMaxima;
    }

    let porcentagem = Math.floor((estamina / estaminaMaxima) * 100);
    // Corrigido: Adicionado backticks para mostrar a energia
    textoEstamina.setText(`Energia: ${porcentagem}%`);
    if (porcentagem < 20) textoEstamina.setColor('#ff0000'); 
    else if (porcentagem < 50) textoEstamina.setColor('#ffff00'); 
    else textoEstamina.setColor('#00ff00'); 

    if (estadoGancho === 'BALANCANDO') {
        if (apertouBotao) acaoPrincipal.call(this);

        if (balancandoParaDireita) {
            anguloGancho += velocidadeBalanço;
            if (anguloGancho >= 75) balancandoParaDireita = false;
        } else {
            anguloGancho -= velocidadeBalanço;
            if (anguloGancho <= -75) balancandoParaDireita = true;
        }
        gancho.x = 512 + Math.sin(radianos) * 50; 
        gancho.y = 50 + Math.cos(radianos) * 50;
        gancho.angle = -anguloGancho; 
    }
    else if (estadoGancho === 'DESCENDO') {
        gancho.x += Math.sin(radianos) * velocidadeTiroPadrao;
        gancho.y += Math.cos(radianos) * velocidadeTiroPadrao;
        if (gancho.x < 0 || gancho.x > 1024 || gancho.y > 768) estadoGancho = 'SUBINDO';
    }
    else if (estadoGancho === 'SUBINDO') {
        let velocidadeAtual = objetoPuxado ? velocidadeTiroPadrao / objetoPuxado.peso : velocidadeTiroPadrao * 1.5;

        if (objetoPuxado && objetoPuxado.tipo === 'pedra_pesada' && apertouBotao) {
            if (estamina >= 10) {
                estamina -= 10;
                gancho.x -= Math.sin(radianos) * 25;
                gancho.y -= Math.cos(radianos) * 25;
            }
        }

        if (objetoPuxado) {
            objetoPuxado.x = gancho.x;
            objetoPuxado.y = gancho.y;
        }

        gancho.x -= Math.sin(radianos) * velocidadeAtual;
        gancho.y -= Math.cos(radianos) * velocidadeAtual;

        if (gancho.y <= 100) { 
            estadoGancho = 'BALANCANDO'; 
            if (objetoPuxado) {
                if (objetoPuxado.tipo === 'moeda') {
                    moedasColetadas += objetoPuxado.valor;
                    if (velocidadeBalanço < velocidadeMaxima) velocidadeBalanço = Math.round((velocidadeBalanço + aumentoVelocidade) * 10) / 10; 
                    
                    if (moedasColetadas >= metaMoedas && !fragmentoRevelado) {
                        fragmentoRevelado = true;
                        spawnarFragmento.call(this);
                    }
                } 
                else if (objetoPuxado.tipo === 'fragmento') {
                    fragmentosAtuais++;
                    faseAtual++;
                    if (fragmentosAtuais >= 3) {
                        reliquiasCompletas++;
                        fragmentosAtuais = 0; 
                        if (reliquiasCompletas >= 3) {
                            jogoAcabou = true;
                            textoCentro.setText('PARABÉNS! VOCÊ ZEROU O JOGO!\n3 Relíquias Completas!');
                            textoCentro.setColor('#00ff00');
                        } else {
                            textoCentro.setText('RELÍQUIA COMPLETA!\nClique para a próxima Fase.');
                            textoCentro.setColor('#00ff00');
                            esperandoProximaFase = true; 
                        }
                    } else {
                        textoCentro.setText('FRAGMENTO CAPTURADO!\nClique para a próxima Fase.');
                        textoCentro.setColor('#00ff00');
                        esperandoProximaFase = true; 
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