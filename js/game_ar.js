// =============================================================================
// USR AR COLLECTOR V3 - HYBRID SENSOR EDITION (FIX PARA HOT WHEELS)
// COMBINA IA (COCO-SSD) COM RADAR ÓPTICO DE CONTRASTE (PIXEL ANALYSIS)
// =============================================================================

(function() {
    "use strict";

    let particles = [];
    let time = 0;

    const Game = {
        state: 'BOOT', // BOOT, SCANNING, ANALYZING
        score: 0,
        
        // IA Visual (Rede Neuronal)
        objectModel: null,
        detectedItems: [],
        lastDetectTime: 0,
        
        // Radar Óptico (Contraste com o chão)
        floorColor: { r: 0, g: 0, b: 0 },
        
        // Mecânica de Captura
        scanProgress: 0,
        targetItem: null,
        graceTimer: 0, 
        
        // Missão
        itemsRecovered: 0,
        moneyEarned: 0, 

        // Estética Corporativa "USR"
        colorMain: '#00ffff', 
        colorDanger: '#ff003c', 
        colorSuccess: '#00ff66', 

        init: function(faseData) {
            this.state = 'BOOT';
            this.score = 0;
            this.itemsRecovered = 0;
            this.moneyEarned = 0;
            this.scanProgress = 0;
            particles = [];
            time = 0;
            
            this.loadAIModel();
        },

        loadAIModel: async function() {
            if (typeof cocoSsd === 'undefined') {
                const script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd";
                document.head.appendChild(script);
                
                script.onload = async () => {
                    this.objectModel = await cocoSsd.load();
                    this.state = 'SCANNING';
                    if(window.Sfx) window.Sfx.play(800, 'square', 0.5, 0.2);
                };
            } else {
                this.objectModel = await cocoSsd.load();
                this.state = 'SCANNING';
            }
        },

        update: function(ctx, w, h, pose) {
            time += 0.05;

            // 1. DESENHA A CÂMARA DE FUNDO (REALIDADE AUMENTADA)
            if (window.System.video && window.System.video.readyState === 4) {
                const videoRatio = window.System.video.videoWidth / window.System.video.videoHeight;
                const canvasRatio = w / h;
                let drawW = w, drawH = h, drawX = 0, drawY = 0;
                if (videoRatio > canvasRatio) { drawW = h * videoRatio; drawX = (w - drawW) / 2; } 
                else { drawH = w / videoRatio; drawY = (h - drawH) / 2; }
                
                ctx.drawImage(window.System.video, drawX, drawY, drawW, drawH);
            } else {
                ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
            }

            // EFEITO DE SCANLINES (ESTILO CÂMARA DE SEGURANÇA)
            ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
            for(let i = 0; i < h; i += 4) {
                ctx.fillRect(0, i + (time * 10) % 4, w, 1);
            }

            if (this.state === 'BOOT') {
                this.drawGiantOverlay(ctx, w, h, "INICIANDO SENSORES", "CALIBRANDO SISTEMAS ÓPTICOS...");
                return this.score;
            }

            this.playMode(ctx, w, h);
            return this.score;
        },

        drawGiantOverlay: function(ctx, w, h, title, sub) {
            ctx.fillStyle = "rgba(0, 10, 20, 0.85)"; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = this.colorMain; ctx.textAlign = "center";
            ctx.font = "bold clamp(30px, 6vw, 60px) 'Russo One'";
            ctx.fillText(title, w/2, h/2);
            ctx.fillStyle = "#fff"; ctx.font = "bold clamp(16px, 4vw, 30px) 'Chakra Petch'";
            ctx.fillText(sub, w/2, h/2 + 60);
            
            // Círculo de loading
            ctx.strokeStyle = this.colorMain; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(w/2, h/2 + 120, 30, time, time + Math.PI); ctx.stroke();
        },

        // Função para ler a cor média de uma área (Usado pelo Radar Óptico)
        getAverageColor: function(ctx, x, y, width, height) {
            try {
                const data = ctx.getImageData(x, y, width, height).data;
                let r = 0, g = 0, b = 0;
                for (let i = 0; i < data.length; i += 4) {
                    r += data[i]; g += data[i+1]; b += data[i+2];
                }
                const count = data.length / 4;
                return { r: r/count, g: g/count, b: b/count };
            } catch (e) {
                return { r: 0, g: 0, b: 0 };
            }
        },

        playMode: function(ctx, w, h) {
            const cx = w / 2;
            const cy = h / 2;
            let activeTarget = null;

            // =========================================================================
            // SENSOR 1: RADAR ÓPTICO (O SEGREDO PARA OS HOT WHEELS!)
            // =========================================================================
            // Ele tira uma "amostra" da cor do chão (na parte inferior do ecrã)
            this.floorColor = this.getAverageColor(ctx, cx - 50, h * 0.85, 100, 40);
            
            // Depois, tira uma "amostra" do centro da mira
            const centerColor = this.getAverageColor(ctx, cx - 40, cy - 40, 80, 80);
            
            // Compara o chão com o centro. Se a cor for muito diferente, TEM UM BRINQUEDO ALI!
            const colorDiff = Math.abs(this.floorColor.r - centerColor.r) + 
                              Math.abs(this.floorColor.g - centerColor.g) + 
                              Math.abs(this.floorColor.b - centerColor.b);

            if (colorDiff > 80 && this.state === 'SCANNING') { // 80 é uma boa margem de contraste
                activeTarget = {
                    cx: cx, cy: cy, w: 180, h: 180, 
                    label: "ANOMALIA / CARRINHO", color: this.colorDanger
                };
            }

            // =========================================================================
            // SENSOR 2: REDE NEURONAL (COCO-SSD PARA SUCATAS MAIORES)
            // =========================================================================
            if (this.objectModel && window.System.video && window.System.video.readyState === 4) {
                if (Date.now() - this.lastDetectTime > 200) {
                    this.objectModel.detect(window.System.video).then(predictions => {
                        this.detectedItems = predictions;
                    });
                    this.lastDetectTime = Date.now();
                }

                const scaleX = w / window.System.video.videoWidth;
                const scaleY = h / window.System.video.videoHeight;

                this.detectedItems.forEach(item => {
                    const ignoredClasses = ['person', 'bed', 'sofa', 'tv', 'refrigerator', 'door', 'dining table'];
                    if (ignoredClasses.includes(item.class) || item.score < 0.15) return;

                    const boxW = item.bbox[2] * scaleX;
                    const boxH = item.bbox[3] * scaleY;
                    if (boxW > w * 0.8 || boxH > h * 0.8) return;

                    const boxX = item.bbox[0] * scaleX;
                    const boxY = item.bbox[1] * scaleY;
                    const itemCx = boxX + (boxW/2);
                    const itemCy = boxY + (boxH/2);

                    // Desenha HUD Passivo
                    if (this.state === 'SCANNING') {
                        this.drawHologramBox(ctx, boxX, boxY, boxW, boxH, "OBJETO IDENTIFICADO", "rgba(0,255,255,0.4)");
                    }

                    // Se a IA achar algo perto do centro, tem prioridade sobre o Radar Óptico
                    if (Math.hypot(itemCx - cx, itemCy - cy) < 250 && this.state === 'SCANNING') {
                        activeTarget = { cx: itemCx, cy: itemCy, w: boxW, h: boxH, label: "VEÍCULO / SUCATA", color: this.colorMain };
                    }
                });
            }

            // ==========================================
            // MÁQUINA DE ESTADOS (TRAVAMENTO E "HACKING")
            // ==========================================

            if (this.state === 'SCANNING') {
                if (activeTarget) {
                    this.targetItem = activeTarget;
                    this.state = 'ANALYZING';
                    this.graceTimer = 30; // 30 frames de memória caso a câmara trema
                    if(window.Sfx) window.Sfx.play(1200, 'sawtooth', 0.1, 0.1);
                }
            }

            if (this.state === 'ANALYZING') {
                // INTERATIVIDADE MÁXIMA: Decifrar Dados!
                if (activeTarget) {
                    this.targetItem = activeTarget; 
                    this.graceTimer = 30; 
                    this.scanProgress += 2.0; 
                } else {
                    // Memória de mira
                    this.graceTimer--;
                    if (this.graceTimer <= 0) {
                        this.scanProgress -= 5;
                        if (this.scanProgress <= 0) {
                            this.state = 'SCANNING';
                            this.targetItem = null;
                            if(window.Sfx) window.Sfx.error();
                        }
                    }
                }

                if (this.targetItem) {
                    if (this.scanProgress % 8 === 0 && window.Sfx) window.Sfx.hover();
                    
                    // Tremer o ecrã levemente para dar tensão
                    if(window.Gfx) window.Gfx.addShake(1);

                    // CAIXA DE HACKING NO ALVO
                    const tX = this.targetItem.cx; const tY = this.targetItem.cy;
                    const ringSize = Math.max(80, 250 - (this.scanProgress * 1.7));
                    
                    ctx.save();
                    ctx.translate(tX, tY);
                    
                    // Círculos de mira giratórios
                    ctx.rotate(time * 3);
                    ctx.strokeStyle = this.colorDanger; ctx.lineWidth = 6; ctx.setLineDash([20, 15]);
                    ctx.beginPath(); ctx.arc(0, 0, ringSize, 0, Math.PI*2); ctx.stroke();
                    ctx.rotate(-time * 5);
                    ctx.strokeStyle = this.colorMain; ctx.setLineDash([40, 10]);
                    ctx.beginPath(); ctx.arc(0, 0, ringSize + 20, 0, Math.PI*2); ctx.stroke();
                    ctx.restore();

                    // TEXTO DE DADOS BINÁRIOS (INTERATIVIDADE)
                    ctx.fillStyle = this.colorDanger;
                    ctx.font = "bold 14px monospace"; ctx.textAlign = "center";
                    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
                    ctx.fillText(`DECODING... [${randomCode}]`, tX, tY - ringSize - 20);
                    ctx.fillStyle = "#fff";
                    ctx.fillText(`VOLUME DETECTADO: ${Math.floor(this.scanProgress)}%`, tX, tY + ringSize + 30);

                    // Feixe de Laser do Caminhão
                    ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + Math.sin(time*15)*0.5})`; 
                    ctx.lineWidth = 10;
                    ctx.beginPath(); ctx.moveTo(cx, h); ctx.lineTo(tX, tY); ctx.stroke();

                    // CAPTURA CONCLUÍDA!
                    if (this.scanProgress >= 100) {
                        this.itemsRecovered++;
                        let reward = Math.floor(Math.random() * 800) + 200;
                        this.moneyEarned += reward;
                        this.score += reward / 10;
                        
                        this.state = 'SCANNING';
                        this.scanProgress = 0;
                        
                        if(window.Gfx) window.Gfx.shakeScreen(35);
                        if(window.Sfx) window.Sfx.epic();
                        
                        this.spawnCaptureEffect(tX, tY);
                        this.targetItem = null;
                        window.System.msg(`+ R$ ${reward} EXTRAÍDOS!`);
                    }
                }
            }

            this.drawMachineHUD(ctx, w, h, cx, cy);
            this.updateParticles(ctx, w, h);
        },

        drawHologramBox: function(ctx, x, y, bw, bh, label, color) {
            ctx.strokeStyle = color; ctx.lineWidth = 4;
            const l = 20; 
            ctx.beginPath();
            ctx.moveTo(x, y+l); ctx.lineTo(x, y); ctx.lineTo(x+l, y);
            ctx.moveTo(x+bw-l, y); ctx.lineTo(x+bw, y); ctx.lineTo(x+bw, y+l);
            ctx.moveTo(x+bw, y+bh-l); ctx.lineTo(x+bw, y+bh); ctx.lineTo(x+bw-l, y+bh);
            ctx.moveTo(x+l, y+bh); ctx.lineTo(x, y+bh); ctx.lineTo(x, y+bh-l);
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.font = "bold clamp(10px, 2vw, 16px) 'Chakra Petch'";
            const textW = ctx.measureText(label).width;
            ctx.fillRect(x, y - 25, textW + 10, 25);
            ctx.fillStyle = "#000"; ctx.textAlign = "left";
            ctx.fillText(label, x + 5, y - 7);
        },

        drawMachineHUD: function(ctx, w, h, cx, cy) {
            const grad = ctx.createRadialGradient(cx, cy, h*0.35, cx, cy, h);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(1, "rgba(0,10,20,0.85)");
            ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

            // =====================================
            // ESTATUTO DE HACKING / SCANNING
            // =====================================
            if (this.state === 'ANALYZING') {
                ctx.fillStyle = `rgba(255, 0, 0, ${Math.abs(Math.sin(time*10))*0.2})`;
                ctx.fillRect(0, 0, w, h); 

                ctx.fillStyle = this.colorDanger; ctx.textAlign = "center";
                ctx.font = "bold clamp(35px, 8vw, 70px) 'Russo One'";
                ctx.fillText("ALVO BLOQUEADO!", w/2, 80);
                
                // BARRA GIGANTE
                ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                ctx.fillRect(w*0.1, h*0.75, w*0.8, 40);
                ctx.fillStyle = this.colorDanger;
                ctx.fillRect(w*0.1, h*0.75, (this.scanProgress/100) * (w*0.8), 40);
                ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
                ctx.strokeRect(w*0.1, h*0.75, w*0.8, 40);
            } 
            else if (this.state === 'SCANNING') {
                // LINHA DE RADAR QUE SOBE E DESCE
                const radarY = cy + Math.sin(time * 2) * (h * 0.3);
                ctx.fillStyle = "rgba(0, 255, 255, 0.4)"; ctx.fillRect(0, radarY, w, 4);
                ctx.fillStyle = "rgba(0, 255, 255, 0.1)"; ctx.fillRect(0, radarY - 20, w, 40);

                // MIRA CENTRAL
                ctx.strokeStyle = "rgba(0, 255, 255, 0.3)"; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(cx, cy, 180, 0, Math.PI*2); ctx.stroke();
                ctx.beginPath(); ctx.arc(cx, cy, 90, 0, Math.PI*2); ctx.stroke();
                
                ctx.fillStyle = this.colorMain; ctx.textAlign = "center";
                ctx.font = "bold clamp(30px, 6vw, 60px) 'Russo One'";
                ctx.fillText("PROCURANDO SUCATA", w/2, 60);
                
                // Exibe a leitura de cor em tempo real para dar um ar técnico
                ctx.font = "12px monospace"; ctx.fillStyle = "#aaa";
                ctx.fillText(`C_SENS: [${Math.floor(this.floorColor.r)},${Math.floor(this.floorColor.g)},${Math.floor(this.floorColor.b)}]`, w/2, 85);
            }

            // RODAPÉ GIGANTE
            ctx.fillStyle = "rgba(0, 15, 20, 0.95)"; ctx.fillRect(0, h - 110, w, 110);
            ctx.strokeStyle = this.colorMain; ctx.lineWidth = 5; 
            ctx.beginPath(); ctx.moveTo(0, h - 110); ctx.lineTo(w, h - 110); ctx.stroke();

            ctx.textAlign = "left";
            ctx.fillStyle = "#fff"; ctx.font = "bold clamp(18px, 4vw, 28px) 'Chakra Petch'";
            ctx.fillText(`MATERIAL RECOLHIDO: ${this.itemsRecovered}`, 20, h - 65);
            
            ctx.fillStyle = this.colorSuccess; ctx.font = "bold clamp(35px, 7vw, 60px) 'Russo One'";
            ctx.fillText(`R$ ${this.moneyEarned.toLocaleString('pt-BR')}`, 20, h - 20);
        },

        spawnCaptureEffect: function(x, y) {
            // Explosão digital
            for(let i=0; i<50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 30 + 10;
                particles.push({
                    type: 'binary', x: x, y: y,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    life: 1.0, val: Math.random() > 0.5 ? '1' : '0'
                });
            }
            particles.push({ type: 'flash', life: 1.0 });
        },

        updateParticles: function(ctx) {
            ctx.globalCompositeOperation = 'screen';
            
            particles.forEach(p => {
                if (p.type === 'binary') {
                    p.x += p.vx; p.y += p.vy; 
                    p.life -= 0.04; 
                    ctx.fillStyle = `rgba(0, 255, 255, ${Math.max(0, p.life)})`;
                    ctx.font = "bold 20px monospace";
                    ctx.fillText(p.val, p.x, p.y);
                } 
                else if (p.type === 'flash') {
                    ctx.globalAlpha = Math.max(0, p.life * 0.7);
                    ctx.fillStyle = "#00ffff";
                    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
                    p.life -= 0.1; 
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
            window.System.registerGame('ar_collector', 'Caça-Anomalias AR', '👽', Game, {
                camera: 'environment',
                phases: [
                    { id: 'f1', name: 'LIMPEZA ÓPTICA', desc: 'Pilote o camião. O radar encontra as anomalias no chão!', reqLvl: 1 }
                ]
            });
            clearInterval(regLoop);
        }
    }, 100);

})();
