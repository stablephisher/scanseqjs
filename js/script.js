// ============================================
// ScanSeq — AI Camera Music Sequencer
// by @stablephisher
// ============================================

// --- MUSICAL SCALES ---
const SCALES = {
    pentatonic:    [0, 2, 4, 7, 9],
    major:         [0, 2, 4, 5, 7, 9, 11],
    minor:         [0, 2, 3, 5, 7, 8, 10],
    blues:         [0, 3, 5, 6, 7, 10],
    chromatic:     [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    japanese:      [0, 1, 5, 7, 8],
    arabic:        [0, 1, 4, 5, 7, 8, 11],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11]
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const THEMES = {
    neon: {
        bgColor: [8, 8, 18],
        lineGlow: true,
        colorShift: 0,
        satBoost: 1.3,
        particleColor: [99, 102, 241]
    },
    pastel: {
        bgColor: [25, 20, 30],
        lineGlow: false,
        colorShift: 30,
        satBoost: 0.6,
        particleColor: [236, 72, 153]
    },
    monochrome: {
        bgColor: [5, 5, 5],
        lineGlow: true,
        colorShift: 0,
        satBoost: 0,
        particleColor: [200, 200, 200]
    },
    fire: {
        bgColor: [15, 5, 0],
        lineGlow: true,
        colorShift: -30,
        satBoost: 1.5,
        particleColor: [255, 100, 30]
    },
    ocean: {
        bgColor: [0, 8, 20],
        lineGlow: true,
        colorShift: 180,
        satBoost: 1.2,
        particleColor: [6, 182, 212]
    },
    matrix: {
        bgColor: [0, 5, 0],
        lineGlow: true,
        colorShift: 120,
        satBoost: 1.0,
        particleColor: [0, 255, 70]
    }
};

// --- STATE ---
let capture;
let buff;
let lineNum = 20;
let linesColor = [];
let linesXPos = [];
let linesMovSpeed = [];
let linesTrigger = [];
let linesOldSum = [];
let waveMoving = [];
let waveMovingFactor = [];
let waveMovingSpeed = [];
let waveMovingDec = [];
let linesToneTrigger = [];

let polySynth;
let reverb, delay, chorus, distortion, vol;
let currentFX = 'reverb';

let startPostion;
let cameraScreenRatio;

let isPaused = false;
let isMuted = false;
let showHelp = false;
let appStarted = false;

// Settings
let currentScale = 'pentatonic';
let currentRoot = 'C';
let currentSynthType = 'triangle';
let currentTheme = 'neon';
let sensitivity = 40;
let moveSpeed = 10;
let noteList = [];

// Particles
let particles = [];
const MAX_PARTICLES = 100;

// Note display
let recentNotes = [];
const MAX_RECENT_NOTES = 8;

// FPS
let fpsHistory = [];

// Canvas ref
let cnv;

// --- GENERATE NOTE LIST ---
function generateNoteList() {
    const rootIndex = NOTE_NAMES.indexOf(currentRoot);
    const scaleIntervals = SCALES[currentScale];
    noteList = [];
    
    for (let octave = 2; octave <= 7; octave++) {
        for (let i = 0; i < scaleIntervals.length; i++) {
            const noteIndex = (rootIndex + scaleIntervals[i]) % 12;
            const noteOctave = octave + Math.floor((rootIndex + scaleIntervals[i]) / 12);
            if (noteOctave <= 7) {
                noteList.push(NOTE_NAMES[noteIndex] + noteOctave);
            }
        }
    }
    
    // Trim or pad to fit lineNum
    while (noteList.length < lineNum) {
        noteList.push(noteList[noteList.length - 1] || 'C4');
    }
    noteList = noteList.slice(0, lineNum);
}

// --- INIT ARRAYS ---
function initArrays() {
    linesColor = new Array(lineNum).fill(null).map(() => [0, 0, 0, 255]);
    linesXPos = new Array(lineNum).fill(0);
    linesMovSpeed = new Array(lineNum).fill(0);
    linesTrigger = new Array(lineNum).fill(false);
    linesOldSum = new Array(lineNum).fill(0);
    waveMoving = new Array(lineNum).fill(false);
    waveMovingFactor = new Array(lineNum).fill(0);
    waveMovingSpeed = new Array(lineNum).fill(0);
    waveMovingDec = new Array(lineNum).fill(0);
    linesToneTrigger = new Array(lineNum).fill(false);
}

// --- SYNTH SETUP ---
function createSynth() {
    if (polySynth) {
        polySynth.dispose();
    }
    
    let synthOptions;
    switch (currentSynthType) {
        case 'sine':
            synthOptions = { oscillator: { type: 'sine' } };
            break;
        case 'triangle':
            synthOptions = { oscillator: { partials: [0, 2, 3, 4] } };
            break;
        case 'sawtooth':
            synthOptions = { oscillator: { type: 'sawtooth' } };
            break;
        case 'square':
            synthOptions = { oscillator: { type: 'square' } };
            break;
        case 'am':
            polySynth = new Tone.PolySynth(Tone.AMSynth).toDestination();
            chainEffects();
            return;
        case 'fm':
            polySynth = new Tone.PolySynth(Tone.FMSynth).toDestination();
            chainEffects();
            return;
        default:
            synthOptions = { oscillator: { partials: [0, 2, 3, 4] } };
    }
    
    polySynth = new Tone.PolySynth(Tone.Synth, synthOptions).toDestination();
    chainEffects();
}

function chainEffects() {
    vol = new Tone.Volume(-28);
    
    let fxNode;
    switch (currentFX) {
        case 'reverb':
            fxNode = new Tone.JCReverb(0.3);
            break;
        case 'delay':
            fxNode = new Tone.FeedbackDelay("16n", 0.4);
            break;
        case 'chorus':
            fxNode = new Tone.Chorus(4, 2.5, 0.5).start();
            break;
        case 'distortion':
            fxNode = new Tone.Distortion(0.3);
            break;
        case 'none':
            polySynth.chain(vol, Tone.Destination);
            return;
        default:
            fxNode = new Tone.JCReverb(0.3);
    }
    
    polySynth.chain(vol, fxNode, Tone.Destination);
}

// --- PARTICLE SYSTEM ---
class Particle {
    constructor(x, y, col) {
        this.pos = createVector(x, y);
        this.vel = createVector(random(-2, 2), random(-3, -0.5));
        this.acc = createVector(0, 0.05);
        this.life = 255;
        this.decay = random(4, 8);
        this.size = random(2, 6);
        this.col = col || [255, 255, 255];
    }
    
    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.life -= this.decay;
    }
    
    draw() {
        push();
        noStroke();
        const theme = THEMES[currentTheme];
        let r = this.col[0], g = this.col[1], b = this.col[2];
        if (theme.lineGlow) {
            drawingContext.shadowBlur = 10;
            drawingContext.shadowColor = `rgba(${r},${g},${b},0.5)`;
        }
        fill(r, g, b, this.life);
        ellipse(this.pos.x, this.pos.y, this.size);
        drawingContext.shadowBlur = 0;
        pop();
    }
    
    isDead() {
        return this.life <= 0;
    }
}

function spawnParticles(x, y, col, count) {
    for (let i = 0; i < count; i++) {
        if (particles.length < MAX_PARTICLES) {
            particles.push(new Particle(x, y, col));
        }
    }
}

// --- P5 SETUP ---
function preload() {}

function setup() {
    // Don't create canvas yet - wait for user to start
    noLoop();
}

// Called when user clicks "Launch Experience"
function startApp() {
    if (appStarted) return;
    appStarted = true;
    
    // Start Tone.js audio context
    Tone.start();
    
    const container = document.getElementById('canvas-container');
    const w = container.clientWidth;
    const h = container.clientHeight;
    
    cnv = createCanvas(w, h);
    cnv.parent('canvas-container');
    cnv.style('display', 'block');
    
    // Setup audio
    createSynth();
    
    // Setup camera
    capture = createCapture(VIDEO);
    capture.size(320, 240);
    capture.hide();
    
    cameraScreenRatio = height / 240;
    
    buff = createImage(80, 240);
    startPostion = 80 * cameraScreenRatio;
    
    initArrays();
    generateNoteList();
    
    for (let i = 0; i < lineNum; i++) {
        linesXPos[i] = startPostion;
    }
    
    // Init Lucide icons
    if (window.lucide) lucide.createIcons();
    
    // Setup UI event listeners
    setupUIListeners();
    
    // Hide loading & start overlay, show app
    document.getElementById('loading-screen').classList.add('fade-out');
    setTimeout(() => {
        document.getElementById('start-overlay').classList.add('fade-out');
        document.getElementById('app-container').classList.remove('hidden');
    }, 300);
    
    loop();
}

// --- UI LISTENERS ---
function setupUIListeners() {
    // Play/Pause
    document.getElementById('btn-play-pause').addEventListener('click', togglePause);
    
    // Mute
    document.getElementById('btn-mute').addEventListener('click', toggleMute);
    
    // Help
    document.getElementById('btn-help').addEventListener('click', () => toggleHelp());
    document.getElementById('close-help').addEventListener('click', () => toggleHelp());
    
    // Fullscreen
    document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
    
    // Screenshot
    document.getElementById('btn-screenshot').addEventListener('click', takeScreenshot);
    
    // Scale select
    document.getElementById('scale-select').addEventListener('change', function() {
        currentScale = this.value;
        generateNoteList();
        updateNowPlaying();
    });
    
    // Root select
    document.getElementById('root-select').addEventListener('change', function() {
        currentRoot = this.value;
        generateNoteList();
        updateNowPlaying();
    });
    
    // Synth select
    document.getElementById('synth-select').addEventListener('change', function() {
        currentSynthType = this.value;
        createSynth();
    });
    
    // Theme select
    document.getElementById('theme-select').addEventListener('change', function() {
        currentTheme = this.value;
    });
    
    // FX select
    document.getElementById('fx-select').addEventListener('change', function() {
        currentFX = this.value;
        createSynth();
    });
    
    // Sensitivity slider
    document.getElementById('sensitivity-slider').addEventListener('input', function() {
        sensitivity = parseInt(this.value);
        document.getElementById('sensitivity-value').textContent = sensitivity;
    });
    
    // Speed slider
    document.getElementById('speed-slider').addEventListener('input', function() {
        moveSpeed = parseInt(this.value);
        document.getElementById('speed-value').textContent = moveSpeed;
    });
    
    // Lines slider
    document.getElementById('lines-slider').addEventListener('input', function() {
        lineNum = parseInt(this.value);
        document.getElementById('lines-value').textContent = lineNum;
        initArrays();
        generateNoteList();
        for (let i = 0; i < lineNum; i++) {
            linesXPos[i] = startPostion;
        }
    });
}

// --- TOGGLE FUNCTIONS ---
function togglePause() {
    isPaused = !isPaused;
    const icon = document.getElementById('icon-play-pause');
    if (icon) {
        icon.setAttribute('data-lucide', isPaused ? 'play' : 'pause');
        if (window.lucide) lucide.createIcons();
    }
    const npBars = document.querySelector('.np-bars');
    if (npBars) npBars.classList.toggle('paused', isPaused);
    
    const npText = document.querySelector('.np-text');
    if (npText) npText.textContent = isPaused ? 'Paused' : 'Listening...';
}

function toggleMute() {
    isMuted = !isMuted;
    Tone.Destination.mute = isMuted;
    const icon = document.getElementById('icon-mute');
    const btn = document.getElementById('btn-mute');
    if (icon) {
        icon.setAttribute('data-lucide', isMuted ? 'volume-x' : 'volume-2');
        if (window.lucide) lucide.createIcons();
    }
    if (btn) btn.classList.toggle('ctrl-btn-active', isMuted);
}

function toggleHelp() {
    showHelp = !showHelp;
    const overlay = document.getElementById('help-overlay');
    if (overlay) overlay.classList.toggle('hidden', !showHelp);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen();
    }
}

function takeScreenshot() {
    // Flash effect
    const flash = document.createElement('div');
    flash.className = 'screenshot-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
    
    saveCanvas(cnv, 'scanseq-capture', 'png');
}

function updateNowPlaying() {
    const npText = document.querySelector('.np-text');
    if (npText && !isPaused) {
        npText.textContent = `${currentRoot} ${currentScale}`;
        setTimeout(() => {
            if (!isPaused) npText.textContent = 'Listening...';
        }, 2000);
    }
}

// --- NOTE DISPLAY ---
function showNote(noteName) {
    const container = document.getElementById('note-history');
    if (!container) return;
    
    const pill = document.createElement('div');
    pill.className = 'note-pill';
    pill.textContent = noteName;
    container.appendChild(pill);
    
    recentNotes.push(pill);
    if (recentNotes.length > MAX_RECENT_NOTES) {
        const old = recentNotes.shift();
        if (old && old.parentNode) old.parentNode.removeChild(old);
    }
    
    setTimeout(() => {
        if (pill.parentNode) pill.parentNode.removeChild(pill);
        const idx = recentNotes.indexOf(pill);
        if (idx > -1) recentNotes.splice(idx, 1);
    }, 1500);
}

// --- DRAW ---
function draw() {
    if (!appStarted) return;
    
    const theme = THEMES[currentTheme];
    background(theme.bgColor[0], theme.bgColor[1], theme.bgColor[2]);
    
    if (!isPaused) {
        triggerLogic();
        lineColorCapture();
    }
    
    pathLineDraw();
    ellipseMoving();
    waveLineDraw();
    drawParticles();
    drawCameraPreview();
    drawScanLine();
    
    // FPS
    updateFPS();
}

function updateFPS() {
    const fps = Math.round(frameRate());
    fpsHistory.push(fps);
    if (fpsHistory.length > 30) fpsHistory.shift();
    const avgFps = Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length);
    const el = document.getElementById('fps-counter');
    if (el && frameCount % 15 === 0) {
        el.textContent = `${avgFps} FPS`;
    }
}

// --- CAMERA PREVIEW ---
function drawCameraPreview() {
    if (!capture || !buff) return;
    
    push();
    capture.loadPixels();
    buff.loadPixels();
    
    for (let y = 0; y < capture.height; y++) {
        for (let x = 0; x < capture.width; x++) {
            if (x < 80) {
                let i = y * capture.width + (capture.width - 1 - x);
                let _c = [capture.pixels[i * 4], capture.pixels[i * 4 + 1], capture.pixels[i * 4 + 2], 255];
                buff.set(x, y, _c);
            }
        }
    }
    buff.updatePixels();
    
    // Draw camera with rounded corners effect
    const camW = startPostion;
    const camH = 240 * cameraScreenRatio;
    
    // Subtle border
    stroke(255, 20);
    strokeWeight(1);
    noFill();
    rect(0, 0, camW, camH);
    
    noStroke();
    image(buff, 0, 0, camW, camH);
    
    // Camera label
    fill(255, 100);
    noStroke();
    textSize(9);
    textFont('Inter');
    textAlign(LEFT, TOP);
    text('CAM', 6, 6);
    pop();
}

// --- SCAN LINE ---
function drawScanLine() {
    push();
    stroke(255, 30);
    strokeWeight(1);
    line(startPostion, 0, startPostion, height);
    
    // Center line with glow
    const theme = THEMES[currentTheme];
    const cx = (width + startPostion) * 0.5;
    
    if (theme.lineGlow) {
        drawingContext.shadowBlur = 15;
        drawingContext.shadowColor = `rgba(${theme.particleColor[0]},${theme.particleColor[1]},${theme.particleColor[2]},0.3)`;
    }
    stroke(theme.particleColor[0], theme.particleColor[1], theme.particleColor[2], 60);
    strokeWeight(1.5);
    line(cx, 0, cx, height);
    drawingContext.shadowBlur = 0;
    pop();
}

// --- LINE COLOR CAPTURE ---
function lineColorCapture() {
    if (!capture || !capture.pixels || capture.pixels.length === 0) return;
    
    capture.loadPixels();
    for (let i = 0; i < lineNum; i++) {
        let _index = Math.floor((i + 0.5) * capture.height / lineNum) * capture.width - 80;
        if (_index < 0) _index = 0;
        if (_index * 4 + 2 < capture.pixels.length) {
            let r = capture.pixels[_index * 4];
            let g = capture.pixels[_index * 4 + 1];
            let b = capture.pixels[_index * 4 + 2];
            
            // Apply theme color modifications
            const theme = THEMES[currentTheme];
            if (theme.satBoost === 0) {
                // Monochrome
                const avg = (r + g + b) / 3;
                r = g = b = avg;
            } else if (theme.satBoost !== 1) {
                const avg = (r + g + b) / 3;
                r = avg + (r - avg) * theme.satBoost;
                g = avg + (g - avg) * theme.satBoost;
                b = avg + (b - avg) * theme.satBoost;
            }
            
            linesColor[i] = [
                constrain(r, 0, 255),
                constrain(g, 0, 255),
                constrain(b, 0, 255),
                255
            ];
        }
    }
}

// --- PATH LINE DRAW ---
function pathLineDraw() {
    push();
    const theme = THEMES[currentTheme];
    
    for (let i = 0; i < lineNum; i++) {
        if (!linesColor[i]) continue;
        
        let r = linesColor[i][0];
        let g = linesColor[i][1];
        let b = linesColor[i][2];
        
        // Glow effect
        if (theme.lineGlow) {
            drawingContext.shadowBlur = 8;
            drawingContext.shadowColor = `rgba(${r},${g},${b},0.4)`;
        }
        
        stroke(r, g, b, 180);
        strokeWeight(height / lineNum * 0.4);
        
        const y = (i + 0.5) * height / lineNum;
        line(startPostion, y, width, y);
    }
    drawingContext.shadowBlur = 0;
    pop();
}

// --- TRIGGER ---
function triggerLogic() {
    for (let i = 0; i < lineNum; i++) {
        if (!linesColor[i]) continue;
        
        let _colorValueSum = (linesColor[i][0] + linesColor[i][1] + linesColor[i][2]) / 3.0;
        let _diffColorValue = abs(_colorValueSum - linesOldSum[i]);
        
        if (_diffColorValue > sensitivity) {
            linesTrigger[i] = true;
            linesOldSum[i] = _colorValueSum;
            
            if (linesToneTrigger[i] === true) {
                linesToneTrigger[i] = false;
            }
        }
        
        const centerLine = (width + startPostion) * 0.5;
        
        if (linesXPos[i] > centerLine && linesToneTrigger[i] === false) {
            waveMoving[i] = true;
            linesTrigger[i] = true;
            linesToneTrigger[i] = true;
            
            if (linesToneTrigger[i] === true) {
                const now = Tone.now();
                const noteIdx = constrain(lineNum - 1 - i, 0, noteList.length - 1);
                const note = noteList[noteIdx];
                
                try {
                    polySynth.triggerAttackRelease(note, "32t", now);
                } catch (e) {}
                
                // Spawn particles at the collision point
                const y = (i + 0.5) * height / lineNum;
                const theme = THEMES[currentTheme];
                spawnParticles(centerLine, y, theme.particleColor, 5);
                
                // Show note
                showNote(note);
            }
        }
        
        if (linesXPos[i] > width) {
            linesXPos[i] = startPostion;
            linesTrigger[i] = false;
            linesToneTrigger[i] = true;
        }
        
        if (linesTrigger[i] === true) {
            linesMovSpeed[i] = moveSpeed;
        } else {
            linesXPos[i] = startPostion;
            linesMovSpeed[i] = 0.0;
        }
    }
}

// --- ELLIPSE MOVING ---
function ellipseMoving() {
    push();
    noStroke();
    const theme = THEMES[currentTheme];
    
    for (let i = 0; i < lineNum; i++) {
        if (!linesColor[i]) continue;
        
        linesXPos[i] += linesMovSpeed[i];
        
        let r = 255 - linesColor[i][0];
        let g = 255 - linesColor[i][1];
        let b = 255 - linesColor[i][2];
        
        const y = (i + 0.5) * height / lineNum;
        
        // Glow on active dots
        if (linesTrigger[i] && theme.lineGlow) {
            drawingContext.shadowBlur = 12;
            drawingContext.shadowColor = `rgba(${theme.particleColor[0]},${theme.particleColor[1]},${theme.particleColor[2]},0.6)`;
        }
        
        fill(r, g, b, 220);
        ellipse(linesXPos[i], y, 8, 8);
        
        // Trail effect
        if (linesTrigger[i]) {
            for (let t = 1; t <= 3; t++) {
                fill(r, g, b, 220 - t * 60);
                ellipse(linesXPos[i] - t * moveSpeed * 0.7, y, 8 - t * 1.5, 8 - t * 1.5);
            }
        }
        
        drawingContext.shadowBlur = 0;
    }
    pop();
}

// --- WAVE LINE DRAW ---
function waveLineDraw() {
    push();
    const theme = THEMES[currentTheme];
    
    if (theme.lineGlow) {
        drawingContext.shadowBlur = 10;
        drawingContext.shadowColor = `rgba(${theme.particleColor[0]},${theme.particleColor[1]},${theme.particleColor[2]},0.4)`;
    }
    
    stroke(theme.particleColor[0], theme.particleColor[1], theme.particleColor[2], 180);
    strokeWeight(2);
    noFill();
    
    beginShape();
    const cx = (width + startPostion) * 0.5;
    curveVertex(cx, 0);
    curveVertex(cx, 0);
    
    for (let i = 0; i < lineNum; i++) {
        if (waveMoving[i] === true) {
            waveMovingSpeed[i] = 0.7;
            waveMoving[i] = false;
            waveMovingFactor[i] = 0.0;
            waveMovingDec[i] = 0.9;
        }
        waveMovingFactor[i] += waveMovingSpeed[i];
        waveMovingDec[i] *= 0.98;
        
        let _movingX;
        if (i === 0 || i === lineNum - 1) {
            _movingX = sin(waveMovingFactor[i]) * 0.5 * waveMovingDec[i] * 30.0;
        } else {
            _movingX = (sin(waveMovingFactor[i]) + sin(waveMovingFactor[i + 1]) * 0.75 + sin(waveMovingFactor[i - 1]) * 0.75) * waveMovingDec[i] * 30.0;
        }
        curveVertex(cx + _movingX, (i + 0.5) * height / lineNum);
    }
    
    curveVertex(cx, height);
    curveVertex(cx, height);
    endShape();
    
    drawingContext.shadowBlur = 0;
    pop();
}

// --- PARTICLES ---
function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].isDead()) {
            particles.splice(i, 1);
        }
    }
}

// --- KEYBOARD ---
function keyPressed() {
    if (!appStarted) return;
    
    // Space - pause
    if (keyCode === 32) {
        togglePause();
        return false;
    }
    
    // M - mute
    if (key === 'm' || key === 'M') {
        toggleMute();
    }
    
    // H - help
    if (key === 'h' || key === 'H') {
        toggleHelp();
    }
    
    // F - fullscreen
    if (key === 'f' || key === 'F') {
        toggleFullscreen();
    }
    
    // S - screenshot
    if (key === 's' || key === 'S') {
        takeScreenshot();
    }
    
    // R - randomize
    if (key === 'r' || key === 'R') {
        const scaleKeys = Object.keys(SCALES);
        currentScale = scaleKeys[Math.floor(Math.random() * scaleKeys.length)];
        currentRoot = NOTE_NAMES[Math.floor(Math.random() * NOTE_NAMES.length)];
        
        document.getElementById('scale-select').value = currentScale;
        document.getElementById('root-select').value = currentRoot;
        generateNoteList();
        updateNowPlaying();
    }
    
    // T - cycle theme
    if (key === 't' || key === 'T') {
        const themeKeys = Object.keys(THEMES);
        const idx = themeKeys.indexOf(currentTheme);
        currentTheme = themeKeys[(idx + 1) % themeKeys.length];
        document.getElementById('theme-select').value = currentTheme;
    }
    
    // 1-8 - switch scale
    if (key >= '1' && key <= '8') {
        const scaleKeys = Object.keys(SCALES);
        const idx = parseInt(key) - 1;
        if (idx < scaleKeys.length) {
            currentScale = scaleKeys[idx];
            document.getElementById('scale-select').value = currentScale;
            generateNoteList();
            updateNowPlaying();
        }
    }
    
    // Arrow keys - sensitivity/speed
    if (keyCode === UP_ARROW) {
        sensitivity = constrain(sensitivity + 5, 10, 100);
        document.getElementById('sensitivity-slider').value = sensitivity;
        document.getElementById('sensitivity-value').textContent = sensitivity;
    }
    if (keyCode === DOWN_ARROW) {
        sensitivity = constrain(sensitivity - 5, 10, 100);
        document.getElementById('sensitivity-slider').value = sensitivity;
        document.getElementById('sensitivity-value').textContent = sensitivity;
    }
    if (keyCode === RIGHT_ARROW) {
        moveSpeed = constrain(moveSpeed + 1, 2, 20);
        document.getElementById('speed-slider').value = moveSpeed;
        document.getElementById('speed-value').textContent = moveSpeed;
    }
    if (keyCode === LEFT_ARROW) {
        moveSpeed = constrain(moveSpeed - 1, 2, 20);
        document.getElementById('speed-slider').value = moveSpeed;
        document.getElementById('speed-value').textContent = moveSpeed;
    }
}

// --- WINDOW RESIZE ---
function windowResized() {
    if (!appStarted) return;
    const container = document.getElementById('canvas-container');
    if (container) {
        resizeCanvas(container.clientWidth, container.clientHeight);
        cameraScreenRatio = height / 240;
        startPostion = 80 * cameraScreenRatio;
        for (let i = 0; i < lineNum; i++) {
            if (linesXPos[i] < startPostion) linesXPos[i] = startPostion;
        }
    }
}

// --- DOM READY ---
window.addEventListener('DOMContentLoaded', () => {
    // Loading screen timing
    setTimeout(() => {
        const loadScreen = document.getElementById('loading-screen');
        if (loadScreen) loadScreen.classList.add('fade-out');
    }, 2200);
    
    // Start button
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            startApp();
        });
    }
    
    // Also allow clicking anywhere on start overlay
    const startOverlay = document.getElementById('start-overlay');
    if (startOverlay) {
        startOverlay.addEventListener('click', (e) => {
            if (e.target === startOverlay || e.target.closest('.start-content')) {
                startApp();
            }
        });
    }
});