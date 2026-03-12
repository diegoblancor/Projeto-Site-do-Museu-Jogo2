const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1024,
        height: 768
    },
    parent: 'game-container', 
    backgroundColor: '#3e2723', 
    physics: { default: 'arcade', arcade: { debug: false } },
    fps: { target: 60, forceSetTimeOut: true },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

let gancho, linhaCorda, grupoObjetos;
let estadoGancho = 'BALANCANDO', anguloGancho = 0, balancandoParaDireita = true;
// Tirei o "aumentoVelocidade" daqui, a gente vai calcular por fase agora
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

let textoHUD, textoTempo, textoCentro, textoEstamina;
let teclaEspaco;

let posicoesOcupadas = []; 

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

function preload() {}

function create() {
    carregarJogo();

    textoHUD = this.add.text(10, 10, '', { font: '22px Arial', fill: '#fff', fontStyle: 'bold' });
    textoTempo = this.add.text(850, 10, 'Tempo: 100', { font: '28px Arial', fill: '#ff0000', fontStyle: 'bold' });
    textoEstamina = this.add.text(850, 45, 'Energia: 100%', { font: '22px Arial', fill: '#00ff00', fontStyle: 'bold' });
    textoCentro = this.add.text(512, 384, '', { font: '45px Arial', fill: '#00ff00', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);

    grupoObjetos = this.physics.add.group();
    linhaCorda = this.add.graphics();
    
    // --- BUFF 1: GANCHO MAIOR (De 20x20 para 40x30) ---
    gancho = this.add.rectangle(512, 100, 25, 20, 0xffffff);
    this.physics.add.existing(gancho);

    this.physics.add.overlap(gancho, grupoObjetos, pegarObjeto, null, this);
    this.input.on('pointerdown', acaoPrincipal, this);
    teclaEspaco = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

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

    // --- BUFF 2: VELOCIDADE SOBE SÓ NAS PRÓXIMAS FASES ---
    // A cada fase que você avança, a velocidade sobe +0.4. A Fase 1 fica com 1.0 cravado!
    let degrauDificuldade = ((cenarioAtual - 1) * 3) + (faseNoCenario - 1);
    velocidadeBalanço = 1.0 + (degrauDificuldade * 0.4);
    if (velocidadeBalanço > velocidadeMaxima) velocidadeBalanço = velocidadeMaxima; // Trava no limite

    if (cenarioAtual === 1) this.cameras.main.setBackgroundColor('#3e2723'); 
    else if (cenarioAtual === 2) this.cameras.main.setBackgroundColor('#1a237e'); 
    else if (cenarioAtual === 3) this.cameras.main.setBackgroundColor('#b71c1c'); 
    
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
        limparSave(); 
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
        
        // --- BUFF 3: CORDA MAIOR (A garra balança mais pra baixo, dando mais alcance) ---
        // Era * 50, aumentei pra * 80!
        gancho.x = 512 + Math.sin(radianos) * 170; 
        gancho.y = 50 + Math.cos(radianos) * 150; 
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
                    
                    // APAGUEI AQUELE CÓDIGO QUE AUMENTAVA A VELOCIDADE AQUI! Agora ela fica suave o round todo.

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