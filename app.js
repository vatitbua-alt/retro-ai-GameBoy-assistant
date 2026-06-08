// App.js - Retro AI Agent & Personal Assistant Logic

// State Management
const state = {
    agent: {
        x: 160,
        y: 110,
        targetX: 160,
        targetY: 110,
        speed: 1.5,
        state: 'IDLE', // IDLE, WALKING, WORKING, SLEEPING, DANCING, TALKING
        frame: 0,
        direction: 'down', // left, right, up, down
        speechTimeout: null,
        bubbleActive: false,
    },
    reminders: [],
    todos: [],
    soundEnabled: false,
    activeTheme: 'gameboy',
    apiKey: localStorage.getItem('fia_gemini_api_key') || 'AQ.Ab8RN6Lo7Ch0nSg2hgWk0ACbKg0sbpEBaSQc7hqeseNPQEPLcg',
};

// Colors based on current theme (loaded dynamically matching css)
let themeColors = {
    dark: '#0f380f',
    medium: '#306230',
    light: '#8bac0f',
    bg: '#9bbc0f'
};

// Canvas Setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Sound Setup
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// 8-Bit Retro Sound Generator
function playSound(type) {
    if (!state.soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    switch (type) {
        case 'click':
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, now);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        case 'beep':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, now);
            gainNode.gain.setValueAtTime(0.08, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
        case 'bubble':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'success':
            osc.type = 'square';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
        case 'alarm':
            // Play a rhythmic 8-bit alarm melody
            playAlarmMelody();
            break;
    }
}

function playAlarmMelody() {
    const notes = [880, 880, 0, 880, 880, 0, 1046, 1046, 0, 987, 987];
    const duration = 0.1;
    let timeOffset = 0;
    
    notes.forEach((freq) => {
        if (freq > 0) {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            const noteStart = audioCtx.currentTime + timeOffset;
            gainNode.gain.setValueAtTime(0.08, noteStart);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);
            
            osc.start(noteStart);
            osc.stop(noteStart + duration);
        }
        timeOffset += duration + 0.05;
    });
}

// Particle System for Animations
const particles = [];
function addParticle(x, y, type) {
    particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 1,
        vy: -Math.random() * 1.5 - 0.5,
        life: 1.0,
        decay: Math.random() * 0.02 + 0.01,
        type, // 'Z', 'note', 'star', 'spark'
        text: type === 'Z' ? 'Z' : ''
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Get GBC or monochrome theme colors
function getColors() {
    if (state.activeTheme === 'gameboy') {
        return {
            bg: '#cce0d8',          // Retro light teal-sage wall
            floor: '#a08870',       // Wood floor
            floorLine: '#584838',   // Floor line
            bedSheet: '#5078a8',    // Blue sheets
            blanket: '#d84038',     // Red blanket
            pillow: '#f8f8f8',      // White pillow
            desk: '#8c6040',        // Wood desk
            deskLegs: '#382818',
            monitor: '#d0d8d0',     // Classic grey casing
            monitorScreen: '#00e840', // Glowing green terminal
            chair: '#687890',       // Chair frame
            chairSeat: '#f8a848',   // Orange seat
            outline: '#181820',     // Dark pixel border
            agentBody: '#f8a8f8',   // Kirby Pink casing
            agentChest: '#d80020',  // Kirby Red feet
            agentScreen: '#f84888', // Kirby Blush cheeks
            agentEyes: '#102010',   // Dark eyes
            agentHeart: '#ffd000'   // Star/Heart
        };
    } else {
        // Fallback monochrome variables mapped from themeColors
        return {
            bg: themeColors.bg,
            floor: themeColors.bg,
            floorLine: themeColors.medium,
            bedSheet: themeColors.medium,
            blanket: themeColors.light,
            pillow: themeColors.light,
            desk: themeColors.dark,
            deskLegs: themeColors.dark,
            monitor: themeColors.dark,
            monitorScreen: themeColors.light,
            chair: themeColors.dark,
            chairCushion: themeColors.dark,
            outline: themeColors.dark,
            agentBody: themeColors.light,
            agentChest: themeColors.dark,
            agentScreen: themeColors.medium,
            agentEyes: themeColors.dark,
            agentHeart: themeColors.light
        };
    }
}

function drawParticles() {
    const c = getColors();
    particles.forEach(p => {
        ctx.fillStyle = c.outline;
        ctx.globalAlpha = p.life;
        if (p.type === 'Z') {
            ctx.font = '8px "Press Start 2P"';
            ctx.fillText(p.text, p.x, p.y);
        } else if (p.type === 'star') {
            ctx.fillRect(p.x, p.y, 2, 2);
        } else if (p.type === 'spark') {
            ctx.fillRect(p.x, p.y, 1, 1);
        } else if (p.type === 'note') {
            ctx.fillRect(p.x, p.y, 2, 3);
            ctx.fillRect(p.x + 2, p.y - 2, 2, 1);
            ctx.fillRect(p.x + 3, p.y - 1, 1, 2);
        }
    });
    ctx.globalAlpha = 1.0;
}

// Draw Environment Items
function drawBackground() {
    const c = getColors();
    // Fill screen background color
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Floor fill
    ctx.fillStyle = c.floor;
    ctx.fillRect(0, 130, canvas.width, canvas.height - 130);

    // Floor line
    ctx.strokeStyle = c.floorLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 130);
    ctx.lineTo(canvas.width, 130);
    ctx.stroke();

    // Bed (Left side)
    // Pillow border & fill
    ctx.fillStyle = c.outline;
    ctx.fillRect(14, 109, 14, 10);
    ctx.fillStyle = c.pillow;
    ctx.fillRect(16, 111, 10, 6);
    // Bed frame
    ctx.fillStyle = c.outline;
    ctx.fillRect(27, 114, 33, 16);
    ctx.fillStyle = c.bedSheet;
    ctx.fillRect(27, 115, 32, 14);
    // Blanket border & fill
    ctx.fillStyle = c.outline;
    ctx.fillRect(39, 111, 22, 20);
    ctx.fillStyle = c.blanket;
    ctx.fillRect(41, 113, 18, 16);

    // Desk and Computer (Right side)
    // Desk border & fill
    ctx.fillStyle = c.outline;
    ctx.fillRect(249, 114, 57, 17);
    ctx.fillStyle = c.desk;
    ctx.fillRect(251, 116, 53, 13);
    // Desk legs
    ctx.fillStyle = c.deskLegs;
    ctx.fillRect(254, 128, 4, 12);
    ctx.fillRect(297, 128, 4, 12);
    // Computer Monitor border & fill
    ctx.fillStyle = c.outline;
    ctx.fillRect(264, 93, 28, 22);
    ctx.fillStyle = c.monitor;
    ctx.fillRect(266, 95, 24, 18);
    // Stand
    ctx.fillStyle = c.outline;
    ctx.fillRect(275, 113, 6, 3);
    // Screen display glow (glowing lines if working)
    ctx.fillStyle = c.outline;
    ctx.fillRect(268, 97, 20, 14);
    if (state.agent.state === 'WORKING') {
        ctx.fillStyle = c.monitorScreen;
        ctx.fillRect(270, 99, 16, 2);
        ctx.fillRect(270, 102, 14, 2);
        ctx.fillRect(270, 107, 8, 2);
    }

    // Chair
    ctx.fillStyle = c.outline;
    ctx.fillRect(233, 119, 14, 20); // Chair outline
    ctx.fillStyle = c.chair;
    ctx.fillRect(235, 121, 10, 17); // Chair fill
    ctx.fillStyle = c.chairSeat;
    ctx.fillRect(229, 118, 14, 3);  // Cushion
    ctx.fillStyle = c.outline;
    ctx.fillRect(229, 104, 3, 15);  // Backrest
}

// Draw the Character (AI Agent - Fia)
function drawAgent(tick) {
    const a = state.agent;
    const isBob = Math.floor(tick / 15) % 2 === 0;
    let bobY = (isBob && a.state !== 'SLEEPING' && a.state !== 'WORKING') ? 1 : 0;
    
    ctx.save();

    // Sleep state rendering
    if (a.state === 'SLEEPING') {
        // Zzz particles
        if (tick % 60 === 0) {
            addParticle(35, 105, 'Z');
        }
        
        // Horizontal robot body on bed
        ctx.translate(35, 112);
        ctx.rotate(-Math.PI / 2);
        drawRobotSprite(0, 0, false, false, tick);
        ctx.restore();
        return;
    }

    // Work state rendering
    if (a.state === 'WORKING') {
        if (tick % 10 === 0 && Math.random() > 0.4) {
            addParticle(245 + (Math.random() * 10), 105, 'spark');
        }
        // Face the desk (right)
        drawRobotSprite(238, 112, false, true, tick);
        ctx.restore();
        return;
    }

    // Dancing animation
    if (a.state === 'DANCING') {
        const jumpY = Math.abs(Math.sin(tick * 0.15)) * 8;
        const isSpin = Math.floor(tick / 8) % 2 === 0;
        if (tick % 15 === 0) {
            addParticle(a.x + (Math.random() - 0.5) * 10, a.y - 20, 'note');
        }
        drawRobotSprite(a.x, a.y - jumpY, isSpin, false, tick);
        ctx.restore();
        return;
    }

    // Walking animation
    let isLeftFoot = Math.floor(tick / 8) % 2 === 0;
    if (a.state === 'WALKING') {
        drawRobotSprite(a.x, a.y, a.direction === 'left', false, tick, isLeftFoot);
    } else {
        // Idle
        drawRobotSprite(a.x, a.y + bobY, false, false, tick);
    }

    ctx.restore();
}

// Modular Kirby Drawing helper
function drawRobotSprite(x, y, flip, workPose, tick, walkAlt = false) {
    const c = getColors();
    ctx.save();
    ctx.translate(x, y);
    if (flip) {
        ctx.scale(-1, 1);
    }

    // Draw Arms (behind body)
    ctx.fillStyle = c.outline;
    if (workPose) {
        ctx.fillRect(4, -4, 5, 4); // Typing arm right
    } else if (state.agent.state === 'DANCING') {
        ctx.fillRect(-10, -9, 5, 5); // Arm up L
        ctx.fillRect(5, -9, 5, 5);   // Arm up R
        ctx.fillStyle = c.agentBody;
        ctx.fillRect(-9, -8, 3, 3);
        ctx.fillRect(6, -8, 3, 3);
    } else {
        ctx.fillRect(-10, -4, 4, 6); // Arm side L
        ctx.fillRect(6, -4, 4, 6);   // Arm side R
        ctx.fillStyle = c.agentBody;
        ctx.fillRect(-9, -3, 2, 4);
        ctx.fillRect(7, -3, 2, 4);
    }

    // Feet (Shoes)
    ctx.fillStyle = c.outline;
    if (walkAlt) {
        ctx.fillRect(-7, 6, 6, 4);
        ctx.fillRect(1, 6, 6, 3);
    } else if (state.agent.state === 'WALKING') {
        ctx.fillRect(-7, 6, 6, 3);
        ctx.fillRect(1, 6, 6, 4);
    } else {
        ctx.fillRect(-7, 6, 6, 3);
        ctx.fillRect(1, 6, 6, 3);
    }

    // Fill Shoes
    ctx.fillStyle = c.agentChest; 
    if (walkAlt) {
        ctx.fillRect(-6, 7, 4, 2);
        ctx.fillRect(2, 7, 4, 1);
    } else if (state.agent.state === 'WALKING') {
        ctx.fillRect(-6, 7, 4, 1);
        ctx.fillRect(2, 7, 4, 2);
    } else {
        ctx.fillRect(-6, 7, 4, 1);
        ctx.fillRect(2, 7, 4, 1);
    }

    // Body Outline (Circle)
    ctx.fillStyle = c.outline;
    ctx.fillRect(-4, -14, 8, 1); // Top
    ctx.fillRect(-6, -13, 12, 1);
    ctx.fillRect(-8, -12, 16, 2);
    ctx.fillRect(-9, -10, 18, 14); // Mid
    ctx.fillRect(-8, 4, 16, 2);    // Bottom
    ctx.fillRect(-6, 6, 12, 1);

    // Body Fill (Pink)
    ctx.fillStyle = c.agentBody;
    ctx.fillRect(-4, -13, 8, 1); 
    ctx.fillRect(-6, -12, 12, 2);
    ctx.fillRect(-8, -10, 16, 14); 
    ctx.fillRect(-6, 4, 12, 2);

    // Eyes
    ctx.fillStyle = c.agentEyes;
    const isBlink = Math.floor(tick / 120) % 20 === 0;
    if (isBlink && !workPose) {
        ctx.fillRect(-4, -5, 2, 1);
        ctx.fillRect(2, -5, 2, 1);
    } else {
        if (workPose) { // Looking side
            ctx.fillRect(2, -6, 2, 4);
            ctx.fillRect(6, -6, 2, 4);
        } else {
            ctx.fillRect(-3, -7, 2, 4);
            ctx.fillRect(1, -7, 2, 4);
        }
    }

    // Blush
    ctx.fillStyle = c.agentScreen; 
    if (workPose) {
        ctx.fillRect(0, -3, 2, 2);
        ctx.fillRect(8, -3, 2, 2);
    } else {
        ctx.fillRect(-6, -3, 2, 2);
        ctx.fillRect(4, -3, 2, 2);
    }

    // Mouth
    ctx.fillStyle = c.agentEyes;
    if (state.agent.state === 'DANCING') {
        ctx.fillRect(-2, -3, 4, 4);
        ctx.fillStyle = c.agentChest;
        ctx.fillRect(-1, -2, 2, 2);
    } else {
        ctx.fillRect(-1, -2, 2, 1);
    }

    ctx.restore();
}

// Agent Speech System
function triggerAgentSpeech(text, duration = 5000) {
    const bubble = document.getElementById('speech-bubble');
    const textEl = document.getElementById('speech-text');
    
    textEl.innerText = text;
    bubble.classList.add('active');
    state.agent.bubbleActive = true;
    
    playSound('bubble');

    if (state.agent.speechTimeout) {
        clearTimeout(state.agent.speechTimeout);
    }

    state.agent.speechTimeout = setTimeout(() => {
        bubble.classList.remove('active');
        state.agent.bubbleActive = false;
    }, duration);
}

// AI Personality Engine (Canned retro response generator + Task handlers)
function processUserText(rawInput) {
    const input = rawInput.trim().toLowerCase();
    
    // Command Parsers
    if (input.startsWith('/remind')) {
        return handleRemindCommand(rawInput);
    }
    if (input.startsWith('/todo')) {
        const todoText = rawInput.substring(5).trim();
        if (!todoText) return "กรุณาระบุชื่องานด้วยค่ะ เช่น `/todo เขียนโค้ด`";
        addTodoItem(todoText);
        return `เพิ่มงาน "${todoText}" ลงในรายการให้แล้วค่ะ! 📝`;
    }
    if (input === '/sleep') {
        setAgentState('SLEEPING');
        return "เฟียจะไปเข้านอนแล้วนะคะเจ้านาย... ราตรีสวัสดิ์ค่ะ 😴";
    }
    if (input === '/dance') {
        setAgentState('DANCING');
        // Stop dance after 6 seconds
        setTimeout(() => {
            if (state.agent.state === 'DANCING') setAgentState('IDLE');
        }, 6000);
        return "เย้! มาเต้นกันเถอะค่ะเจ้านาย! ดนตรีมา! 🎵🕺";
    }
    if (input === '/work') {
        setAgentState('WORKING');
        return "เฟียประจำตำแหน่งที่โต๊ะทำงานแล้วค่ะ! มีงานให้ช่วยพิมพ์บอกได้เลยนะคะ 💻";
    }

    // Natural Language responses (Thai)
    if (input.includes('สวัสดี') || input.includes('hello') || input.includes('hi')) {
        return "สวัสดีค่ะเจ้านาย! วันนี้มีอะไรให้เลขาตัวเล็กๆ คนนี้ช่วยเหลือไหมคะ? 😊";
    }
    if (input.includes('ทำอะไรได้บ้าง') || input.includes('help') || input.includes('ช่วย')) {
        return "เฟียสามารถ: \n1. ตั้งเตือนความจำ (/remind)\n2. จด ToDo List (/todo)\n3. ไปนั่งทำงาน เต้น หรือนอนหลับได้ค่ะ!";
    }
    if (input.includes('ชื่ออะไร') || input.includes('who are you')) {
        return "ฉันชื่อ 'เฟีย' (Fia) เลขา AI ส่วนตัวสไตล์ Retro Game Boy ของคุณค่ะ! 🤖";
    }
    if (input.includes('น่ารัก') || input.includes('ชอบ')) {
        setAgentState('DANCING');
        setTimeout(() => { if (state.agent.state === 'DANCING') setAgentState('IDLE'); }, 3000);
        return "ขอบคุณค่ะเจ้านาย! (บิดตัวเขินและเต้นดุ๊กดิ๊ก) ดีใจจังเลยค่ะ! 🥰";
    }
    if (input.includes('เหนื่อย') || input.includes('ท้อ')) {
        return "สู้ๆ นะคะเจ้านาย! พักผ่อนสายตาและดื่มน้ำสักแก้วก่อนนะคะ เฟียเป็นกำลังใจให้เสมอค่ะ! ☕✨";
    }
    if (input.includes('อากาศ')) {
        return "วันนี้มองออกไปนอกหน้าต่างดูสดใสดีนะคะ อย่าลืมยืดเส้นยืดสายบ้างนะคะเจ้านาย";
    }
    if (input.includes('หิว')) {
        return "อย่าทำงานจนลืมทานข้าวนะคะ! สั่งของอร่อยๆ มาทานเติมพลังกันเถอะค่ะ 🍕";
    }

    // Fallback response
    return "รับทราบค่ะเจ้านาย! ลองตั้งเตือนความจำโดยพิมพ์คำสั่ง `/remind [เรื่อง] ใน [เวลา]` ดูสิคะ เดี๋ยวเฟียจัดการให้เอง!";
}

// Ask Gemini API
async function askGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`;
    
    // Prepare dynamic system instruction so Gemini knows about the user's tasks
    const todoList = state.todos.map((t, idx) => `${idx + 1}. ${t.text}`).join('\n') || 'ไม่มีงานค้าง';
    const activeReminders = state.reminders.filter(r => !r.triggered).map((r, idx) => `${idx + 1}. ${r.text} (เวลา ${r.time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`).join('\n') || 'ไม่มีแจ้งเตือนค้าง';

    const systemInstructionText = `You are Fia (เฟีย), a cute pixel art Kirby-style AI personal assistant. You are polite, helpful, and speak in Thai. Always end your sentences with ค่ะ/นะคะ. You are talking to your master (เจ้านาย).
Keep responses concise, cute, and matching your Gameboy Color pixel art style. You can reference their tasks or reminders if asked.
Current ToDo List:
${todoList}

Active Reminders:
${activeReminders}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                systemInstruction: {
                    parts: [{ text: systemInstructionText }]
                }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'API Return Status Error');
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "เฟียฟังไม่เข้าใจเลยค่ะเจ้านาย รบกวนพิมพ์ใหม่อีกครั้งได้ไหมคะ?";
        }
    } catch (error) {
        console.error("Gemini API Request Failed:", error);
        return `เกิดข้อผิดพลาดในการเชื่อมต่อกับ Gemini API ค่ะ: ${error.message} (กรุณาตรวจสอบว่า API Key ถูกต้องหรือไม่ค่ะ)`;
    }
}

// Remind Command Handler (/remind [เรื่อง] ใน [x] วินาที/นาที)
function handleRemindCommand(rawInput) {
    // Match pattern like: /remind ดื่มน้ำ ใน 30 วินาที OR /remind ประชุม ใน 5 นาที
    const match = rawInput.match(/\/remind\s+(.+)\s+(?:ใน|in)\s+(\d+)\s*(วินาที|นาที|ชั่วโมง|s|sec|m|min|h|hour|seconds|minutes|hours)/i);
    
    if (!match) {
        return "คำสั่งไม่ถูกต้องค่ะ! รูปแบบ: `/remind [เรื่อง] ใน [x] วินาที` หรือ `/remind [เรื่อง] ใน [x] นาที` ค่ะ";
    }

    const taskText = match[1].trim();
    const duration = parseInt(match[2]);
    const unit = match[3].toLowerCase();

    let seconds = duration;
    if (unit.includes('นาที') || unit.startsWith('m')) {
        seconds = duration * 60;
    } else if (unit.includes('ชั่วโมง') || unit.startsWith('h')) {
        seconds = duration * 3600;
    }

    const triggerTime = new Date();
    triggerTime.setSeconds(triggerTime.getSeconds() + seconds);

    addReminder(taskText, triggerTime);
    return `รับทราบค่ะ! เฟียจะเตือนเรื่อง "${taskText}" ในอีก ${duration} ${unit} นะคะ ⏰`;
}

// Change Agent State (And set walking coordinates if needed)
function setAgentState(newState) {
    const oldState = state.agent.state;
    state.agent.state = newState;
    document.getElementById('agent-status').innerText = newState;

    if (newState === 'WORKING') {
        state.agent.targetX = 238;
        state.agent.targetY = 112;
    } else if (newState === 'SLEEPING') {
        state.agent.targetX = 35;
        state.agent.targetY = 112;
    } else if (newState === 'IDLE') {
        // Return to center if was working or sleeping
        if (oldState === 'WORKING' || oldState === 'SLEEPING') {
            state.agent.targetX = 160;
            state.agent.targetY = 110;
        }
    }
}

// Agent Position / Movement Loop
function updateAgentMovement() {
    const a = state.agent;
    const dx = a.targetX - a.x;
    const dy = a.targetY - a.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 2) {
        a.state = 'WALKING';
        document.getElementById('agent-status').innerText = 'WALKING';
        
        // Normalize movement
        a.x += (dx / distance) * a.speed;
        a.y += (dy / distance) * a.speed;

        // Set direction
        if (Math.abs(dx) > Math.abs(dy)) {
            a.direction = dx > 0 ? 'right' : 'left';
        } else {
            a.direction = dy > 0 ? 'down' : 'up';
        }
    } else {
        // Arrived at target
        if (a.state === 'WALKING') {
            a.x = a.targetX;
            a.y = a.targetY;
            // Determine final state based on coordinates
            if (a.x === 238 && a.y === 112) {
                setAgentState('WORKING');
            } else if (a.x === 35 && a.y === 112) {
                setAgentState('SLEEPING');
            } else {
                setAgentState('IDLE');
            }
        }
    }
}

// Reminder System
function addReminder(text, triggerTime) {
    const reminder = {
        id: Date.now(),
        text,
        time: triggerTime,
        triggered: false
    };
    state.reminders.push(reminder);
    saveReminders();
    renderReminders();
    playSound('success');
}

function saveReminders() {
    localStorage.setItem('fia_reminders', JSON.stringify(
        state.reminders.map(r => ({ ...r, time: r.time.toISOString() }))
    ));
}

function loadReminders() {
    const saved = localStorage.getItem('fia_reminders');
    if (saved) {
        state.reminders = JSON.parse(saved).map(r => ({
            ...r,
            time: new Date(r.time)
        })).filter(r => r.time > new Date() || !r.triggered);
    }
}

function renderReminders() {
    const list = document.getElementById('reminders-list');
    list.innerHTML = '';

    const activeReminders = state.reminders.filter(r => !r.triggered);

    if (activeReminders.length === 0) {
        list.innerHTML = '<li class="empty-list-msg">ไม่มีการแจ้งเตือนที่ตั้งไว้</li>';
        return;
    }

    activeReminders.forEach(r => {
        const li = document.createElement('li');
        li.className = 'retro-list-item';
        
        const timeStr = r.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        li.innerHTML = `
            <div class="list-item-content">
                <div>
                    <div><strong>${r.text}</strong></div>
                    <div class="list-item-meta">⏰ ${timeStr}</div>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="icon-btn" onclick="deleteReminder(${r.id})" title="ลบ">❌</button>
            </div>
        `;
        list.appendChild(li);
    });
}

function deleteReminder(id) {
    state.reminders = state.reminders.filter(r => r.id !== id);
    saveReminders();
    renderReminders();
    playSound('click');
}

// Check reminders loop (runs every second)
function checkReminders() {
    const now = new Date();
    let triggerCount = 0;

    state.reminders.forEach(r => {
        if (!r.triggered && now >= r.time) {
            r.triggered = true;
            triggerCount++;
            triggerAlarm(r.text);
        }
    });

    if (triggerCount > 0) {
        saveReminders();
        renderReminders();
    }
}

// Alarm Trigger Modal Popup
function triggerAlarm(message) {
    // Sound alarm loop
    playSound('alarm');
    const interval = setInterval(() => {
        if (document.getElementById('alarm-modal').classList.contains('active')) {
            playSound('alarm');
        } else {
            clearInterval(interval);
        }
    }, 2000);

    // Make character run up front and alert
    setAgentState('IDLE');
    state.agent.targetX = 160;
    state.agent.targetY = 110;
    triggerAgentSpeech(`🚨 เจ้านายคะ! ถึงเวลาทำเรื่อง: "${message}" แล้วนะคะ! 🚨`, 10000);

    // Trigger native device notification
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("แจ้งเตือนจากผู้ช่วย AI", {
            body: message,
            icon: 'icon-192x192.png'
        });
    }

    // Open Modal

    document.getElementById('alarm-message').innerText = message;
    document.getElementById('alarm-modal').classList.add('active');

    // System Notification
    if (Notification.permission === "granted") {
        new Notification("แจ้งเตือนจากเลขาส่วนตัว Fia!", {
            body: message,
            icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="%239bbc0f"/><rect x="10" y="10" width="10" height="10" fill="%230f380f"/></svg>'
        });
    }
}

// Request Notification Permission
if (window.Notification && Notification.permission === "default") {
    Notification.requestPermission();
}

// ToDo List System
function addTodoItem(text) {
    const item = {
        id: Date.now(),
        text,
        completed: false
    };
    state.todos.push(item);
    saveTodos();
    renderTodos();
    playSound('success');
}

function saveTodos() {
    localStorage.setItem('fia_todos', JSON.stringify(state.todos));
}

function loadTodos() {
    const saved = localStorage.getItem('fia_todos');
    if (saved) {
        state.todos = JSON.parse(saved);
    }
}

function renderTodos() {
    const list = document.getElementById('todo-list');
    list.innerHTML = '';

    if (state.todos.length === 0) {
        list.innerHTML = '<li class="empty-list-msg">ไม่มีรายการงานค้างอยู่</li>';
        return;
    }

    state.todos.forEach(t => {
        const li = document.createElement('li');
        li.className = `retro-list-item ${t.completed ? 'checked' : ''}`;
        
        li.innerHTML = `
            <div class="list-item-content">
                <span>${t.text}</span>
            </div>
            <div class="list-item-actions">
                <button class="icon-btn check-btn" onclick="toggleTodo(${t.id})" title="${t.completed ? 'ย้อนกลับ' : 'เสร็จสิ้น'}">
                    ${t.completed ? '↩️' : '✅'}
                </button>
                <button class="icon-btn" onclick="deleteTodo(${t.id})" title="ลบ">❌</button>
            </div>
        `;
        list.appendChild(li);
    });
}

function toggleTodo(id) {
    const item = state.todos.find(t => t.id === id);
    if (item) {
        item.completed = !item.completed;
        saveTodos();
        renderTodos();
        playSound(item.completed ? 'success' : 'click');
    }
}

function deleteTodo(id) {
    state.todos = state.todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
    playSound('click');
}

// Chat UI Functions
function appendChatMessage(sender, text, isBot = false) {
    const history = document.getElementById('chat-history');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isBot ? 'bot-message' : 'user-message'}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Format message text (replace newlines with <br>)
    const formattedText = text.replace(/\n/g, '<br>');

    bubble.innerHTML = `
        <div class="sender-name">${sender}</div>
        <div class="message-text">${formattedText}</div>
        <div class="message-time">${time}</div>
    `;

    history.appendChild(bubble);
    history.scrollTop = history.scrollHeight;
    
    if (isBot) {
        playSound('beep');
    } else {
        playSound('click');
    }
}

// Cycle Console Theme
const themes = ['gameboy', 'amber', 'cyberpunk', 'pocket'];
function cycleTheme() {
    const currentIndex = themes.indexOf(state.activeTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];

    document.body.className = '';
    document.body.classList.add(`theme-${nextTheme}`);
    state.activeTheme = nextTheme;

    // Redraw using colors mapping to the active style sheet
    updateThemeColors();
    playSound('success');

    // Speech bubble feedback
    triggerAgentSpeech(`เปลี่ยนธีมหน้าจอเครื่อง Game Boy เป็น: ${nextTheme.toUpperCase()} แล้วค่ะ!`, 3000);
}

function updateThemeColors() {
    const bodyStyles = window.getComputedStyle(document.body);
    themeColors = {
        bg: bodyStyles.getPropertyValue('--screen-bg').trim() || '#9bbc0f',
        dark: bodyStyles.getPropertyValue('--screen-dark').trim() || '#0f380f',
        medium: bodyStyles.getPropertyValue('--screen-medium').trim() || '#306230',
        light: bodyStyles.getPropertyValue('--screen-light').trim() || '#8bac0f'
    };
}

// Core Game Loop / Render Tick
let tickCount = 0;
function loop() {
    tickCount++;
    
    updateAgentMovement();
    updateParticles();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    drawParticles();
    drawAgent(tickCount);

    requestAnimationFrame(loop);
}

// Clock on Gameboy screen status bar
function updateClock() {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    document.getElementById('current-time').innerText = timeStr;
}

// Initialization and Event Listeners
window.addEventListener('DOMContentLoaded', () => {
    // Load local storage
    loadReminders();
    loadTodos();
    renderReminders();
    renderTodos();
    updateThemeColors();

    // Start Loops
    requestAnimationFrame(loop);
    setInterval(updateClock, 1000);
    setInterval(checkReminders, 1000);

    // Initial clock render
    updateClock();

    // Setup API Key UI Input
    const apiKeyInput = document.getElementById('api-key-input');
    if (apiKeyInput) {
        apiKeyInput.value = state.apiKey;
    }

    const btnSaveKey = document.getElementById('btn-save-key');
    if (btnSaveKey) {
        btnSaveKey.addEventListener('click', () => {
            const val = apiKeyInput.value.trim();
            if (val) {
                state.apiKey = val;
                localStorage.setItem('fia_gemini_api_key', val);
                triggerAgentSpeech("บันทึก API Key เรียบร้อยแล้วค่ะเจ้านาย! 🔑", 4000);
                playSound('click');
            }
        });
    }

    const btnClearKey = document.getElementById('btn-clear-key');
    if (btnClearKey) {
        btnClearKey.addEventListener('click', () => {
            state.apiKey = '';
            apiKeyInput.value = '';
            localStorage.removeItem('fia_gemini_api_key');
            triggerAgentSpeech("ลบ API Key เรียบร้อยแล้วค่ะ! 🗑️", 4000);
            playSound('click');
        });
    }

    // Chat form submit
    const chatForm = document.getElementById('chat-form');
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputEl = document.getElementById('chat-input');
        const text = inputEl.value.trim();
        if (!text) return;

        // Add user bubble
        appendChatMessage('เจ้านาย', text, false);
        inputEl.value = '';

        // If it is a local command (starts with /), run processUserText
        if (text.startsWith('/')) {
            setTimeout(() => {
                const reply = processUserText(text);
                appendChatMessage('FIA (AI Agent)', reply, true);
                triggerAgentSpeech(reply.substring(0, 60) + (reply.length > 60 ? '...' : ''), 5000);
            }, 600);
            return;
        }

        // If API Key is present, ask Gemini
        if (state.apiKey) {
            // Append temporary "typing" bubble
            const history = document.getElementById('chat-history');
            const typingBubble = document.createElement('div');
            typingBubble.className = 'chat-bubble bot-message typing-indicator-bubble';
            typingBubble.id = 'fia-typing-indicator';
            typingBubble.innerHTML = `
                <div class="sender-name">FIA (AI Agent)</div>
                <div class="message-text"><i>กำลังคิดหาคำตอบ... 💭</i></div>
            `;
            history.appendChild(typingBubble);
            history.scrollTop = history.scrollHeight;

            setAgentState('WORKING');

            try {
                const reply = await askGemini(text);
                
                // Remove typing bubble
                const indicator = document.getElementById('fia-typing-indicator');
                if (indicator) indicator.remove();

                appendChatMessage('FIA (AI Agent)', reply, true);
                triggerAgentSpeech(reply.substring(0, 60) + (reply.length > 60 ? '...' : ''), 5000);
            } catch (err) {
                const indicator = document.getElementById('fia-typing-indicator');
                if (indicator) indicator.remove();
                
                const errReply = `ขออภัยค่ะเจ้านาย มีปัญหาการติดต่อเซิร์ฟเวอร์: ${err.message}`;
                appendChatMessage('FIA (AI Agent)', errReply, true);
            } finally {
                setAgentState('IDLE');
            }
        } else {
            // No API Key, fallback message
            setTimeout(() => {
                const reply = "เฟียคุยโต้ตอบอิสระไม่ได้หากไม่มี API Key ค่ะเจ้านาย... กรุณาใส่ Gemini API Key ในแถบด้านบนก่อนนะคะ หรือใช้คำสั่งด่วน เช่น `/sleep`, `/dance` ได้เลยค่ะ!";
                appendChatMessage('FIA (AI Agent)', reply, true);
                triggerAgentSpeech("อย่าลืมใส่ API Key นะคะ 🔑", 4000);
            }, 600);
        }
    });

    // Tab buttons switcher
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            playSound('click');
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const targetTab = tab.getAttribute('data-tab');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });

    // Reminder Form Submit
    const reminderForm = document.getElementById('reminder-form');
    reminderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById('reminder-text').value.trim();
        const timeVal = document.getElementById('reminder-time').value;
        const quickVal = document.getElementById('reminder-quick').value;

        let triggerTime = new Date();

        if (quickVal) {
            triggerTime.setSeconds(triggerTime.getSeconds() + parseInt(quickVal));
        } else if (timeVal) {
            const [hours, minutes] = timeVal.split(':');
            triggerTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            // If the time is in the past today, schedule it for tomorrow
            if (triggerTime < new Date()) {
                triggerTime.setDate(triggerTime.getDate() + 1);
            }
        }

        addReminder(text, triggerTime);
        triggerAgentSpeech(`ตั้งเตือนความจำเรื่อง "${text}" เรียบร้อยค่ะ! ⏰`, 4000);

        // Request native notification permission if supported
        if ("Notification" in window && Notification.permission !== "denied" && Notification.permission !== "granted") {
            Notification.requestPermission();
        }

        // Reset form
        reminderForm.reset();
    });

    // ToDo Form Submit
    const todoForm = document.getElementById('todo-form');
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('todo-text');
        const text = input.value.trim();
        if (!text) return;

        addTodoItem(text);
        triggerAgentSpeech(`บันทึกรายการงาน "${text.substring(0, 20)}" ให้แล้วค่ะ!`, 3000);
        input.value = '';
    });

    // Close Alarm modal listener
    document.getElementById('btn-close-alarm').addEventListener('click', () => {
        document.getElementById('alarm-modal').classList.remove('active');
        playSound('click');
        // Flash LED or battery active green
        document.getElementById('battery-led').classList.remove('active');
        setTimeout(() => document.getElementById('battery-led').classList.add('active'), 200);
    });

    // D-Pad walk controls listeners
    document.getElementById('btn-up').addEventListener('click', () => {
        playSound('click');
        state.agent.targetY = Math.max(95, state.agent.y - 15);
    });
    document.getElementById('btn-down').addEventListener('click', () => {
        playSound('click');
        state.agent.targetY = Math.min(125, state.agent.y + 15);
    });
    document.getElementById('btn-left').addEventListener('click', () => {
        playSound('click');
        state.agent.targetX = Math.max(25, state.agent.x - 20);
    });
    document.getElementById('btn-right').addEventListener('click', () => {
        playSound('click');
        state.agent.targetX = Math.min(295, state.agent.x + 20);
    });

    // Action A (Interact) - makes agent talk/react
    document.getElementById('btn-a').addEventListener('click', () => {
        playSound('beep');
        const replies = [
            "สวัสดีค่ะ! วันนี้มีอะไรให้หนูรับใช้ไหมคะ?",
            "ตัวการ์ตูน Pixel Art นี้หนูวาดเองจาก Canvas เลยนะ!",
            "เจ้านาย สู้ๆ นะคะ! วันนี้ทำผลงานได้ดีเยี่ยมเลย!",
            "ถ้าอยากให้หนูแจ้งเตือน พิมพ์บอกแชท หรือใช้แท็บขวาตั้งเตือนได้เลยค่ะ!",
            "เจ้านายหิวข้าวหรือยังคะ? พักผ่อนทานมื้อเที่ยงด้วยนะ!"
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        triggerAgentSpeech(randomReply, 5500);
        
        // Spawn heart/star particles
        for(let i=0; i<5; i++) {
            addParticle(state.agent.x + (Math.random()-0.5)*10, state.agent.y - 15, 'star');
        }
    });

    // Action B (Toggle Audio permission)
    document.getElementById('btn-b').addEventListener('click', () => {
        initAudio();
        state.soundEnabled = !state.soundEnabled;
        const btn = document.getElementById('btn-b');
        if (state.soundEnabled) {
            btn.style.filter = "brightness(1.4)";
            playSound('success');
            triggerAgentSpeech("เปิดระบบเสียง Retro 8-bit แล้วค่ะ! 🔊", 3000);
        } else {
            btn.style.filter = "none";
            triggerAgentSpeech("ปิดระบบเสียงชั่วคราวแล้วค่ะ 🔇", 3000);
        }
    });

    // Select Button (Cycle Theme)
    document.getElementById('btn-select').addEventListener('click', () => {
        cycleTheme();
    });

    // Start Button (Trigger Dance)
    document.getElementById('btn-start').addEventListener('click', () => {
        playSound('success');
        setAgentState('DANCING');
        triggerAgentSpeech("Let's dance! ดนตรีมาเลยยยย 🎵💃🕺", 5000);
        setTimeout(() => {
            if (state.agent.state === 'DANCING') setAgentState('IDLE');
        }, 5000);
    });

    // Window resize check color stylesheet
    window.addEventListener('resize', updateThemeColors);
});

// Global exposers for onclick handlers
window.deleteReminder = deleteReminder;
window.deleteTodo = deleteTodo;
window.toggleTodo = toggleTodo;
