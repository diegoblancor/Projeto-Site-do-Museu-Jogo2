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

// Variáveis da Interface Visual
let graficoEnergia, ponteiroRelogio;
let textoHUD, textoCentro;
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
    textoCentro = this.add.text(512, 384, '', { font: '45px Arial', fill: '#00ff00', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);

    // -----------------------------------------------------------------
    // --- O NOVO RELÓGIO (NO CANTO SUPERIOR DIREITO) ---
    // -----------------------------------------------------------------
    let relogioX = 920; 
    let relogioY = 100;

    // 1. Fundo da Energia (Vermelho - Aparece quando gasta a verde)
    let fundoEnergia = this.add.graphics();
    fundoEnergia.lineStyle(12, 0xff0000, 1);
    fundoEnergia.strokeCircle(relogioX, relogioY, 56);

    // 2. Gráfico da Energia Atual (Verde - Vai desenhar por cima no Update)
    graficoEnergia = this.add.graphics();

    // 3. Face do Relógio (Marrom escuro da sua imagem)
    this.add.circle(relogioX, relogioY, 50, 0xbf8b6e);

    // 4. Marcadores pretos desenhados com linhas simples pra não dar erro (12, 3, 6, 9)
    let marcadores = this.add.graphics({x: relogioX, y: relogioY});
    marcadores.lineStyle(3, 0x000000, 1);
    marcadores.lineBetween(0, -40, 0, -50); // 12h
    marcadores.lineBetween(40, 0, 50, 0);   // 3h
    marcadores.lineBetween(0, 40, 0, 50);   // 6h
    marcadores.lineBetween(-40, 0, -50, 0); // 9h

    // 5. O Ponteiro do tempo
    ponteiroRelogio = this.add.line(relogioX, relogioY, 0, 0, 0, -42, 0x000000, 2).setOrigin(0, 0);
    // -----------------------------------------------------------------


    grupoObjetos = this.physics.add.group();
    linhaCorda = this.add.graphics();
    
    // A garra de volta pro meio certinho, sem relógio em cima dela!
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

    let degrauDificuldade = ((cenarioAtual - 1) * 3) + (faseNoCenario - 1);
    velocidadeBalanço = 1.0 + (degrauDificuldade * 0.4);
    if (velocidadeBalanço > velocidadeMaxima) velocidadeBalanço = velocidadeMaxima; 

    if (cenarioAtual === 1) this.cameras.main.setBackgroundColor('#3e2723'); 
    else if (cenarioAtual === 2) this.cameras.main.setBackgroundColor('#1a237e'); 
    else if (cenarioAtual === 3) this.cameras.main.setBackgroundColor('#b71c1c'); 
    
    atualizarHUD();
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
    let segurandoBotao = teclaEspaco.isDown || this.input.activePointer.isDown;
    let taDandoBoost = (estadoGancho === 'SUBINDO' && objetoPuxado && objetoPuxado.tipo === 'pedra_pesada' && segurandoBotao && estamina >= 1.5);

    if (!taDandoBoost && estamina < estaminaMaxima) {
        estamina += 0.15; 
        if (estamina > estaminaMaxima) estamina = estaminaMaxima;
    }

    // --- ATUALIZAÇÃO VISUAL DO RELÓGIO (TEMPO E ENERGIA) ---
    // Gira o ponteiro
    ponteiroRelogio.angle = -90 + ((100 - tempoRestante) / 100) * 360;

    // Desenha o arco verde da energia
    graficoEnergia.clear();
    let porcentagemE = estamina / estaminaMaxima;
    
    if (porcentagemE > 0) {
        // Se a energia abaixar de 20%, o resto da barra verde fica amarelo de aviso
        if (porcentagemE < 0.20) graficoEnergia.lineStyle(12, 0xffff00, 1); 
        else graficoEnergia.lineStyle(12, 0x00ff00, 1); 

        graficoEnergia.beginPath();
        // Desenha começando do topo (-Math.PI / 2) até a quantidade de energia atual
        let anguloFim = (-Math.PI / 2) + (porcentagemE * 2 * Math.PI);
        graficoEnergia.arc(920, 100, 56, -Math.PI / 2, anguloFim, false);
        graficoEnergia.strokePath();
    }
    // -------------------------------------------------------

    if (estadoGancho === 'BALANCANDO') {
        if (apertouBotao) acaoPrincipal.call(this);

        if (balancandoParaDireita) {
            anguloGancho += velocidadeBalanço;
            if (anguloGancho >= 75) balancandoParaDireita = false;
        } else {
            anguloGancho -= velocidadeBalanço;
            if (anguloGancho <= -75) balancandoParaDireita = true;
        }
        
        gancho.x = 512 + Math.sin(radianos) * 170; 
        gancho.y = 50 + Math.cos(radianos) * 100;  
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

        if (gancho.y <= 100) { 
            estadoGancho = 'BALANCANDO'; 
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