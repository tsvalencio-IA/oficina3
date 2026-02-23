// =============================================================================
// J.A.R.V.I.S. RECOVERY PROTOCOL - AR TRAFFIC RESCUE
// NARRATIVA: RECUPERAÇÃO DE VEÍCULOS E SUCATA (EXTRAÇÃO ORBITAL IMEDIATA)
// =============================================================================

(function() {
    "use strict";

    let particles = [];
    let time = 0;

    const Game = {
        state: 'BOOT', // BOOT, SCANNING, EXTRACTING
        score: 0,
        
        // IA Visual (COCO-SSD)
        objectModel: null,
        detectedItems: [],
        lastDetectTime: 0,
        
        // Classes de objetos que J.A.R.V.I.S. vai transformar em "Missões de Resgate"
        targetMappings: {
            'car': 'VEÍCULO ACIDENTADO', 'truck': 'CAMINHÃO TOMBADO', 'bus': 'ÔNIBUS PRESO',
            'cell phone': 'CAIXA PRETA (DADOS)', 'remote': 'MÓDULO DE COMANDO', 'mouse': 'PEÇA DE MOTOR',
            'bottle': 'TANQUE DE COMBUSTÍVEL', 'cup': 'CILINDRO DE GÁS', 'sports ball': 'NÚCLEO DE ENERGIA'
        },
        
        // Mecânica de Captura
        scanProgress: 0,
        targetItem: null,
        cooldown: 0,
        
        // Missão
        itemsRecovered: 0,
        missionGoal: 10,
        moneyEarned: 0, // Valor em R$ da sucata/resgate
        
        // Sistema J.A.R.V.I.S.
        jarvisMessage: "",
        jarvisMessageTimer: 0,
        typingIndex: 0,
        isJarvisSpeaking: false,

        // Estética
        colorMain: '#00d8ff', // Cyan Stark
        colorAlert: '#f39c12', // Laranja alerta
        colorDanger: '#e74c3c',

        init: function(faseData) {
            this.state = 'BOOT';
            this.score = 0;
            this.itemsRecovered = 0;
            this.moneyEarned = 0;
            this.scanProgress = 0;
            this.cooldown = 0;
            particles = [];
            time = 0;
            
            this.transmit("Olá, Senhor. Protocolo de Limpeza de Vias ativado. Iniciando sistemas...");
            this.loadAIModel();
        },

        // --- SISTEMA DE COMUNICAÇÃO J.A.R.V.I.S. ---
        transmit: function(msg, isUrgent = false) {
            if (this.jarvisMessage === msg && this.jarvisMessageTimer > 0) return;
            this.jarvisMessage = msg;
            this.typingIndex = 0;
            this.jarvisMessageTimer = 200; // Tempo lendo a mensagem
            this.isJarvisSpeaking = true;
            if(window.Sfx) window.Sfx.play(isUrgent ? 1200 : 800, 'square', 0.1, 0.05);
        },

        loadAIModel: async function() {
            if (typeof cocoSsd === 'undefined') {
                const script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd";
                document.head.appendChild(script);
                
                script.onload = async () => {
                    this.objectModel = await cocoSsd.load();
                    this.state = 'SCANNING';
                    this.transmit("Senhor, radar online. Aguardando você encontrar o primeiro veículo acidentado.");
                };
            } else {
                this.objectModel = await cocoSsd.load();
                this.state = 'SCANNING';
                this.transmit("Sistemas 100%. Acelere o veículo, Senhor.");
            }
        },

        update: function(ctx, w, h, pose) {
            time += 0.05;
            if (this.jarvisMessageTimer > 0) {
                this.jarvisMessageTimer--;
            } else {
                this.isJarvisSpeaking = false;
            }

            // 1. DESENHA A CÂMERA DE FUNDO
            if (window.System.video && window.System.video.readyState === 4) {
                const videoRatio = window.System.video.videoWidth / window.System.video.videoHeight;
                const canvasRatio = w / h;
                let drawW = w, drawH = h, drawX = 0, drawY = 0;
                if (videoRatio > canvasRatio) { drawW = h * videoRatio; drawX = (w - drawW) / 2; } 
                else { drawH = w / videoRatio; drawY = (h - drawH) / 2; }
                ctx.drawImage(window.System.video, drawX, drawY, drawW, drawH);
            } else {
                ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, w, h);
            }

            // Filtro visual azulado de Alta Tecnologia (Iron Man HUD)
            ctx.fillStyle = "rgba(0, 20, 40, 0.15)";
            ctx.fillRect(0, 0, w, h);

            if (this.state === 'BOOT') {
                this.drawHUD(ctx, w, h, w/2, h/2);
                return this.score;
            }

            this.playMode(ctx, w, h);
            return this.score;
        },

        playMode: function(ctx, w, h) {
            const cx = w / 2;
            const cy = h / 2;
            let potentialTarget = null;

            if (this.cooldown > 0) this.cooldown--;

            // ==========================================
            // LÓGICA DA IA (DETECÇÃO DE TRÂNSITO E SUCATA)
            // ==========================================
            if (this.objectModel && window.System.video && window.System.video.readyState === 4) {
                
                if (Date.now() - this.lastDetectTime > 250) {
                    this.objectModel.detect(window.System.video).then(predictions => {
                        this.detectedItems = predictions;
                    });
                    this.lastDetectTime = Date.now();
                }

                const scaleX = w / window.System.video.videoWidth;
                const scaleY = h / window.System.video.videoHeight;

                this.detectedItems.forEach(item => {
                    // Verifica se o objeto está na nossa lista de "destroços/veículos"
                    const mappedName = this.targetMappings[item.class];
                    if (!mappedName || item.score < 0.40) return;

                    const boxW = item.bbox[2] * scaleX;
                    const boxH = item.bbox[3] * scaleY;
                    
                    // Ignora objetos que ocupam quase toda a tela (Paredes, pessoas grandes)
                    if (boxW > w * 0.7 || boxH > h * 0.7 || boxW < 30) return;

                    const boxX = item.bbox[0] * scaleX;
                    const boxY = item.bbox[1] * scaleY;
                    const itemCx = boxX + (boxW/2);
                    const itemCy = boxY + (boxH/2);

                    // Pinta de vermelho se for veículo, amarelo se for sucata
                    const isVehicle = ['car', 'truck', 'bus'].includes(item.class);
                    const boxColor = isVehicle ? this.colorDanger : this.colorAlert;

                    // Desenha o rastreador inteligente no objeto real
                    this.drawSmartBox(ctx, boxX, boxY, boxW, boxH, mappedName, boxColor);

                    // Mira central
                    const distToCenter = Math.hypot(itemCx - cx, itemCy - cy);
                    
                    if (distToCenter < 130 && this.cooldown <= 0 && this.state === 'SCANNING') {
                        potentialTarget = { ...item, cx: itemCx, cy: itemCy, w: boxW, h: boxH, mappedName: mappedName, color: boxColor };
                    }
                });
            }

            // ==========================================
            // EXTRAÇÃO ORBITAL IMEDIATA (Sem voltar pra base)
            // ==========================================

            if (this.state === 'SCANNING') {
                if (potentialTarget) {
                    this.targetItem = potentialTarget;
                    this.state = 'EXTRACTING';
                    this.transmit(`Senhor, travei a mira em um [${this.targetItem.mappedName}]. Solicitando drone de extração!`, true);
                } else {
                    if (this.jarvisMessageTimer <= 0 && Math.random() > 0.99) {
                        this.transmit("As vias parecem limpas no momento, Senhor. Continue o patrulhamento.");
                    }
                }
            }

            if (this.state === 'EXTRACTING') {
                if (potentialTarget && potentialTarget.mappedName === this.targetItem.mappedName) {
                    this.targetItem = potentialTarget; // Atualiza a posição caso o carrinho real se mexa
                    this.scanProgress += 2.0;
                    
                    if (this.scanProgress % 15 === 0 && window.Sfx) window.Sfx.hover();

                    // --- EFEITO DA MIRA DE DRONE ---
                    ctx.save();
                    ctx.translate(this.targetItem.cx, this.targetItem.cy);
                    ctx.rotate(-time * 2);
                    ctx.strokeStyle = this.targetItem.color; 
                    ctx.lineWidth = 4;
                    ctx.setLineDash([15, 20]);
                    const ringSize = 120 - (this.scanProgress * 0.6);
                    ctx.beginPath(); ctx.arc(0, 0, ringSize, 0, Math.PI*2); ctx.stroke();
                    ctx.restore();

                    // --- RAIO DE TRAVAMENTO ---
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(cx, h); ctx.lineTo(this.targetItem.cx, this.targetItem.cy); ctx.stroke();

                    // CONCLUIU A EXTRAÇÃO!
                    if (this.scanProgress >= 100) {
                        this.itemsRecovered++;
                        let reward = ['car', 'truck', 'bus'].includes(this.targetItem.class) ? 5000 : 1500; // Veículos valem mais
                        this.moneyEarned += reward;
                        this.score += reward / 10;
                        
                        this.state = 'SCANNING';
                        this.scanProgress = 0;
                        this.cooldown = 120; // 2 segundos antes de poder mirar em outra coisa
                        
                        if(window.Gfx) window.Gfx.shakeScreen(25);
                        if(window.Sfx) window.Sfx.epic();
                        
                        // O RAIO DE TELETRANSPORTE (Drone Orbital)
                        this.spawnOrbitalStrike(this.targetItem.cx, this.targetItem.cy, this.targetItem.color);
                        this.transmit(`Resgate bem sucedido, Senhor. +R$${reward} adicionados às Indústrias Stark.`);
                        
                        this.targetItem = null;

                        // Verifica fim de missão
                        if (this.itemsRecovered >= this.missionGoal) {
                            setTimeout(() => {
                                window.System.msg("VIAS LIMPAS!");
                                window.System.gameOver(this.score, true, this.moneyEarned / 100);
                            }, 3000);
                        }
                    }
                } else {
                    // Alvo saiu da mira
                    this.scanProgress = Math.max(0, this.scanProgress - 4);
                    if (this.scanProgress <= 0) {
                        this.state = 'SCANNING';
                        this.transmit("Perdemos o travamento. Alinhe o veículo novamente, Senhor.");
                        this.targetItem = null;
                    }
                }
            }

            // DESENHA O HUD PRINCIPAL
            this.drawHUD(ctx, w, h, cx, cy);
            this.updateParticles(ctx, w, h);
        },

        // Desenha a caixa high-tech nos carros acidentados
        drawSmartBox: function(ctx, x, y, bw, bh, label, color) {
            ctx.strokeStyle = color; ctx.lineWidth = 2;
            const l = 15; 
            
            ctx.beginPath();
            ctx.moveTo(x, y+l); ctx.lineTo(x, y); ctx.lineTo(x+l, y);
            ctx.moveTo(x+bw-l, y); ctx.lineTo(x+bw, y); ctx.lineTo(x+bw, y+l);
            ctx.moveTo(x+bw, y+bh-l); ctx.lineTo(x+bw, y+bh); ctx.lineTo(x+bw-l, y+bh);
            ctx.moveTo(x+l, y+bh); ctx.lineTo(x, y+bh); ctx.lineTo(x, y+bh-l);
            ctx.stroke();

            // Rótulo da IA
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(x, y - 24, ctx.measureText(label).width + 16, 24);
            ctx.fillStyle = color; ctx.font = "bold 12px 'Chakra Petch'"; ctx.textAlign="left";
            ctx.fillText(label, x + 8, y - 7);
        },

        drawHUD: function(ctx, w, h, cx, cy) {
            // Efeito de tela Stark (linhas e brilhos leves)
            ctx.strokeStyle = "rgba(0, 216, 255, 0.1)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(100, h/2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(w-100, h/2); ctx.lineTo(w, h/2); ctx.stroke();

            // =====================================
            // SISTEMA J.A.R.V.I.S. DE COMUNICAÇÃO
            // =====================================
            ctx.fillStyle = "rgba(0, 15, 25, 0.85)"; ctx.fillRect(10, 10, w - 20, 70);
            
            // Desenha as barrinhas de voz pulando se ele estiver falando
            for(let i=0; i<6; i++) {
                let barH = this.isJarvisSpeaking ? (Math.random() * 20 + 5) : 5;
                ctx.fillStyle = this.colorAlert;
                ctx.fillRect(25 + (i * 8), 45 - barH/2, 5, barH);
            }
            ctx.fillStyle = this.colorMain; ctx.font = "bold 14px 'Russo One'"; ctx.textAlign="left";
            ctx.fillText("J.A.R.V.I.S.", 80, 30);

            // Efeito de digitação da mensagem
            if (this.typingIndex < this.jarvisMessage.length) this.typingIndex += 1.5;
            let currentText = this.jarvisMessage.substring(0, Math.floor(this.typingIndex));
            
            ctx.fillStyle = "#fff"; ctx.font = "14px 'Chakra Petch'";
            ctx.fillText(currentText + (Math.floor(time*5)%2===0 && this.isJarvisSpeaking ? "..." : ""), 80, 55);

            // =====================================
            // MIRA CENTRAL PERMANENTE DO CAMINHÃO
            // =====================================
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(time * 0.4);
            ctx.strokeStyle = this.state === 'EXTRACTING' ? this.colorDanger : this.colorMain;
            ctx.lineWidth = 1;
            
            // Círculo interno cruzado
            ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(50, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, 50); ctx.stroke();

            // Círculo externo tracejado
            ctx.rotate(-time * 0.8);
            ctx.setLineDash([20, 15]);
            ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI*2); ctx.stroke();
            ctx.restore();

            // Barra de Extração
            if (this.state === 'EXTRACTING') {
                ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; ctx.fillRect(cx - 120, cy + 120, 240, 20);
                ctx.fillStyle = this.colorDanger; ctx.fillRect(cx - 120, cy + 120, (this.scanProgress/100) * 240, 20);
                ctx.strokeStyle = "#fff"; ctx.strokeRect(cx - 120, cy + 120, 240, 20);
                
                ctx.fillStyle = "#fff"; ctx.font = "bold 14px 'Russo One'"; ctx.textAlign="center";
                ctx.fillText(`CÁLCULO DE TELETRANSPORTE: ${Math.floor(this.scanProgress)}%`, cx, cy + 160);
            }

            // =====================================
            // PAINEL DE DADOS DO VEÍCULO (EMBAIXO)
            // =====================================
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; ctx.fillRect(0, h - 80, w, 80);
            ctx.strokeStyle = this.colorMain; ctx.lineWidth = 2; 
            ctx.beginPath(); ctx.moveTo(0, h - 80); ctx.lineTo(w, h - 80); ctx.stroke();

            // Missão e Grana
            ctx.textAlign = "left";
            ctx.fillStyle = this.colorMain; ctx.font = "bold 16px 'Chakra Petch'";
            ctx.fillText(`LIMPEZA DAS VIAS: ${this.itemsRecovered} / ${this.missionGoal}`, 20, h - 45);
            
            ctx.fillStyle = "#2ecc71"; ctx.font = "bold 22px 'Russo One'";
            ctx.fillText(`VALOR RESGATADO: R$ ${this.moneyEarned.toLocaleString('pt-BR')}`, 20, h - 15);

            // Alerta de Resfriamento
            if (this.cooldown > 0) {
                ctx.textAlign = "right";
                ctx.fillStyle = this.colorAlert; ctx.font = "16px 'Russo One'";
                ctx.fillText("SISTEMA DE EXTRAÇÃO RECARREGANDO", w - 20, h - 45);
                ctx.fillRect(w - 220, h - 30, (this.cooldown/120)*200, 10);
            } else {
                ctx.textAlign = "right";
                ctx.fillStyle = this.colorMain; ctx.font = "14px 'Chakra Petch'";
                ctx.fillText("PRONTO PARA PRÓXIMO ALVO", w - 20, h - 30);
            }
        },

        // A Animação Mágica: Um raio desce do céu e teleporta o brinquedo!
        spawnOrbitalStrike: function(x, y, color) {
            // Partículas da explosão no chão
            for(let i=0; i<60; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 25 + 10;
                particles.push({
                    type: 'boom', x: x, y: y,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    life: 1.0, size: Math.random() * 10 + 5, color: color
                });
            }
            
            // O Raio de Teletransporte
            particles.push({
                type: 'laser', x: x, y: y,
                life: 1.0, color: '#00ffff'
            });
        },

        updateParticles: function(ctx, w, h) {
            ctx.globalCompositeOperation = 'screen';
            
            particles.forEach(p => {
                if (p.type === 'boom') {
                    p.x += p.vx; p.y += p.vy; 
                    p.life -= 0.05; p.size *= 0.92;
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = Math.max(0, p.life);
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                } 
                else if (p.type === 'laser') {
                    // Desenha o Raio Orbital Gigante
                    ctx.globalAlpha = Math.max(0, p.life);
                    ctx.fillStyle = "rgba(0, 255, 255, 0.8)";
                    // Um pilar de luz descendo do topo da tela até o objeto
                    ctx.fillRect(p.x - 40, 0, 80, p.y);
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(p.x - 15, 0, 30, p.y);
                    
                    p.life -= 0.08; // Some bem rápido como um flash
                }
            });
            
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
            particles = particles.filter(p => p.life > 0);
        },

        cleanup: function() {}
    };

    const regLoop = setInterval(() => {
        if(window.System && window.System.registerGame) {
            window.System.registerGame('ar_recovery', 'J.A.R.V.I.S. AR', '🛸', Game, {
                camera: 'environment', // Exige câmera traseira
                phases: [
                    { id: 'f1', name: 'RESGATE URBANO', desc: 'Pilote, encontre os acidentes e J.A.R.V.I.S. cuidará da extração imediata.', reqLvl: 1 }
                ]
            });
            clearInterval(regLoop);
        }
    }, 100);

})();