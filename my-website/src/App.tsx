/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Trophy, Heart, Zap, Info, X } from 'lucide-react';

// --- Types ---

type ShapeType = 'circle' | 'square' | 'triangle' | 'hexagon';

interface GameObject {
  id: number;
  x: number;
  y: number;
  type: 'substrate' | 'inhibitor' | 'modulator';
  shape: ShapeType;
  speed: number;
  radius: number;
}

interface GameState {
  score: number;
  lives: number;
  activeSite: ShapeType;
  isGameOver: boolean;
  isPaused: boolean;
  level: number;
  combo: number;
}

interface HighScore {
  name: string;
  score: number;
}

// --- Constants ---

const SHAPES: ShapeType[] = ['circle', 'square', 'triangle', 'hexagon'];
const COLORS = {
  circle: '#3b82f6', // blue
  square: '#ef4444', // red
  triangle: '#10b981', // emerald
  hexagon: '#f59e0b', // amber
  substrate: '#4ade80', // bright green glow
  inhibitor: '#f87171', // bright red glow
  modulator: '#a855f7', // purple
};

const INITIAL_STATE: GameState = {
  score: 0,
  lives: 3,
  activeSite: 'circle',
  isGameOver: false,
  isPaused: true,
  level: 1,
  combo: 0,
};

// --- Helper Functions ---

const getRandomShape = (): ShapeType => SHAPES[Math.floor(Math.random() * SHAPES.length)];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [showInstructions, setShowInstructions] = useState(false);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [isHighScore, setIsHighScore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Game loop refs
  const requestRef = useRef<number>(null);
  const objectsRef = useRef<GameObject[]>([]);
  const playerXRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  const nextIdRef = useRef<number>(0);

  // --- Game Logic ---

  const spawnObject = useCallback((canvasWidth: number) => {
    const typeRand = Math.random();
    let type: GameObject['type'] = 'substrate';
    let shape: ShapeType = getRandomShape();

    if (typeRand > 0.85) {
      type = 'modulator';
      shape = getRandomShape(); // Modulator shape doesn't matter for matching, but we'll give it one
    } else if (typeRand > 0.6) {
      type = 'inhibitor';
      shape = gameState.activeSite; // Inhibitors often mimic the current substrate
    } else {
      type = 'substrate';
      // 50% chance to be the correct shape
      shape = Math.random() > 0.5 ? gameState.activeSite : getRandomShape();
    }

    const newObj: GameObject = {
      id: nextIdRef.current++,
      x: Math.random() * (canvasWidth - 40) + 20,
      y: -50,
      type,
      shape,
      speed: 2 + Math.random() * 2 + (gameState.level * 0.5),
      radius: 20,
    };

    objectsRef.current.push(newObj);
  }, [gameState.activeSite, gameState.level]);

  const update = useCallback((canvas: HTMLCanvasElement) => {
    if (gameState.isGameOver || gameState.isPaused) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Spawn logic
    const now = Date.now();
    const spawnRate = Math.max(400, 1200 - (gameState.level * 100));
    if (now - lastSpawnTimeRef.current > spawnRate) {
      spawnObject(canvas.width);
      lastSpawnTimeRef.current = now;
    }

    // Update and draw objects
    objectsRef.current = objectsRef.current.filter((obj) => {
      obj.y += obj.speed;

      // Collision detection
      const dx = obj.x - playerXRef.current;
      const dy = obj.y - (canvas.height - 60);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < obj.radius + 30) {
        handleCollision(obj);
        return false;
      }

      // Out of bounds
      if (obj.y > canvas.height + 50) {
        if (obj.type === 'substrate' && obj.shape === gameState.activeSite) {
          // Missed a correct substrate
          setGameState(prev => ({ ...prev, lives: Math.max(0, prev.lives - 1), combo: 0 }));
        }
        return false;
      }

      drawObject(ctx, obj);
      return true;
    });

    // Draw Player (Enzyme)
    drawPlayer(ctx, canvas.width, canvas.height);

    // Level up logic
    if (gameState.score > gameState.level * 500) {
      setGameState(prev => ({ ...prev, level: prev.level + 1 }));
    }

    // Game over check
    if (gameState.lives <= 0) {
      setGameState(prev => ({ ...prev, isGameOver: true }));
      checkHighScore(gameState.score);
    }

    requestRef.current = requestAnimationFrame(() => update(canvas));
  }, [gameState, spawnObject]);

  const handleCollision = (obj: GameObject) => {
    if (obj.type === 'substrate') {
      if (obj.shape === gameState.activeSite) {
        setGameState(prev => ({ 
          ...prev, 
          score: prev.score + (100 * prev.level * (1 + prev.combo * 0.1)),
          combo: prev.combo + 1
        }));
      } else {
        setGameState(prev => ({ ...prev, lives: Math.max(0, prev.lives - 1), combo: 0 }));
      }
    } else if (obj.type === 'inhibitor') {
      setGameState(prev => ({ 
        ...prev, 
        score: Math.max(0, prev.score - 50), 
        lives: Math.max(0, prev.lives - 1),
        combo: 0 
      }));
    } else if (obj.type === 'modulator') {
      const newShape = getRandomShape();
      setGameState(prev => ({ ...prev, activeSite: newShape }));
    }
  };

  // --- Drawing Helpers ---

  const drawObject = (ctx: CanvasRenderingContext2D, obj: GameObject) => {
    ctx.save();
    ctx.translate(obj.x, obj.y);
    
    // Glow effect
    ctx.shadowBlur = 15;
    if (obj.type === 'substrate') {
      ctx.shadowColor = obj.shape === gameState.activeSite ? COLORS.substrate : '#ffffff';
      ctx.fillStyle = COLORS[obj.shape];
    } else if (obj.type === 'inhibitor') {
      ctx.shadowColor = COLORS.inhibitor;
      ctx.fillStyle = '#111'; // Dark core for inhibitor
      ctx.strokeStyle = COLORS.inhibitor;
      ctx.lineWidth = 3;
    } else {
      ctx.shadowColor = COLORS.modulator;
      ctx.fillStyle = COLORS.modulator;
    }

    drawShape(ctx, obj.shape, obj.radius, obj.type === 'inhibitor');
    ctx.restore();
  };

  const drawShape = (ctx: CanvasRenderingContext2D, shape: ShapeType, r: number, isOutline: boolean) => {
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    } else if (shape === 'square') {
      ctx.rect(-r, -r, r * 2, r * 2);
    } else if (shape === 'triangle') {
      ctx.moveTo(0, -r);
      ctx.lineTo(r, r);
      ctx.lineTo(-r, r);
      ctx.closePath();
    } else if (shape === 'hexagon') {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
      }
      ctx.closePath();
    }
    
    if (isOutline) ctx.stroke();
    else ctx.fill();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const x = playerXRef.current;
    const y = h - 60;

    ctx.save();
    ctx.translate(x, y);

    // Enzyme Body
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS[gameState.activeSite];
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = COLORS[gameState.activeSite];
    ctx.lineWidth = 4;

    // Draw a "C" shape or a pocket
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0.2 * Math.PI, 1.8 * Math.PI, true);
    ctx.stroke();
    ctx.fill();

    // Draw Active Site Indicator inside the pocket
    ctx.save();
    ctx.scale(0.6, 0.6);
    ctx.fillStyle = COLORS[gameState.activeSite];
    ctx.globalAlpha = 0.8;
    drawShape(ctx, gameState.activeSite, 25, false);
    ctx.restore();

    ctx.restore();
  };

  // --- Effects ---

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    requestRef.current = requestAnimationFrame(() => update(canvas));

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState.isPaused || gameState.isGameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    
    const x = clientX - rect.left;
    playerXRef.current = Math.max(40, Math.min(canvas.width - 40, x));
  };

  const startGame = () => {
    setGameState({ ...INITIAL_STATE, isPaused: false });
    objectsRef.current = [];
    lastSpawnTimeRef.current = Date.now();
  };

  const togglePause = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const fetchHighScores = async () => {
    try {
      const response = await fetch('/api/highscores');
      const data = await response.json();
      setHighScores(data);
    } catch (error) {
      console.error('Failed to fetch high scores:', error);
    }
  };

  const checkHighScore = (score: number) => {
    if (score === 0) return;
    const isTop5 = highScores.length < 5 || score > highScores[highScores.length - 1].score;
    if (isTop5) {
      setIsHighScore(true);
    }
  };

  const submitHighScore = async () => {
    if (!playerName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/highscores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, score: Math.floor(gameState.score) }),
      });
      setIsHighScore(false);
      setPlayerName('');
      await fetchHighScores();
    } catch (error) {
      console.error('Failed to submit high score:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchHighScores();
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950 text-white font-sans overflow-hidden flex flex-col">
      {/* Header UI */}
      <div className="p-4 flex justify-between items-center bg-slate-900/50 backdrop-blur-md border-b border-white/10 z-10">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Score</span>
            <span className="text-2xl font-mono font-bold text-emerald-400">{Math.floor(gameState.score).toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Level</span>
            <span className="text-2xl font-mono font-bold text-blue-400">{gameState.level}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <Heart 
                key={i} 
                size={20} 
                className={i < gameState.lives ? "fill-red-500 text-red-500" : "text-slate-700"} 
              />
            ))}
          </div>
          <button 
            onClick={() => setShowInstructions(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative flex-1 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          className="w-full h-full cursor-none"
        />

        {/* Active Site HUD */}
        <div className="absolute bottom-8 left-8 p-4 bg-slate-900/80 rounded-2xl border border-white/10 backdrop-blur-xl flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Active Site</span>
            <span className="text-sm font-bold capitalize text-white">{gameState.activeSite}</span>
          </div>
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${COLORS[gameState.activeSite]}22`, border: `2px solid ${COLORS[gameState.activeSite]}` }}
          >
            <div 
              className="w-6 h-6"
              style={{ 
                backgroundColor: COLORS[gameState.activeSite],
                clipPath: gameState.activeSite === 'circle' ? 'circle(50%)' : 
                          gameState.activeSite === 'square' ? 'inset(0)' :
                          gameState.activeSite === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' :
                          'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
              }}
            />
          </div>
        </div>

        {/* Combo Indicator */}
        <AnimatePresence>
          {gameState.combo > 1 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.5 }}
              key={gameState.combo}
              className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center pointer-events-none"
            >
              <span className="text-4xl font-black italic text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                {gameState.combo}X COMBO!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlays */}
        <AnimatePresence>
          {(gameState.isPaused || gameState.isGameOver) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-20"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="max-w-md w-full bg-slate-900 border border-white/10 rounded-3xl p-8 text-center shadow-2xl"
              >
                {gameState.isGameOver ? (
                  <>
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Trophy className="text-red-500" size={40} />
                    </div>
                    <h2 className="text-4xl font-black mb-2">GAME OVER</h2>
                    <p className="text-slate-400 mb-8">You catalyzed as much as you could!</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-slate-800/50 p-4 rounded-2xl">
                        <span className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Final Score</span>
                        <span className="text-2xl font-mono font-bold text-emerald-400">{gameState.score.toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl">
                        <span className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Max Level</span>
                        <span className="text-2xl font-mono font-bold text-blue-400">{gameState.level}</span>
                      </div>
                    </div>

                    {isHighScore ? (
                      <div className="mb-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                        <h3 className="text-emerald-400 font-bold mb-4">NEW HIGH SCORE!</h3>
                        <input 
                          type="text" 
                          placeholder="Enter your name"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                          className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl mb-4 text-center focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        <button 
                          onClick={submitHighScore}
                          disabled={!playerName.trim() || isSubmitting}
                          className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl disabled:opacity-50"
                        >
                          {isSubmitting ? 'SUBMITTING...' : 'SUBMIT SCORE'}
                        </button>
                      </div>
                    ) : (
                      <div className="mb-8">
                        <h3 className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-4">Top Catalysts</h3>
                        <div className="space-y-2">
                          {highScores.map((hs, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-xl border border-white/5">
                              <div className="flex items-center gap-3">
                                <span className="text-slate-500 font-mono text-xs">{i + 1}</span>
                                <span className="font-bold">{hs.name}</span>
                              </div>
                              <span className="text-emerald-400 font-mono font-bold">{hs.score.toLocaleString()}</span>
                            </div>
                          ))}
                          {highScores.length === 0 && <p className="text-slate-600 text-sm italic">No records yet...</p>}
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={startGame}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group"
                    >
                      <RotateCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                      TRY AGAIN
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-4xl font-black mb-6">ENZYME REACTION</h2>
                    <p className="text-slate-400 mb-8">Match your active site to the falling substrates. Avoid inhibitors!</p>
                    
                    <button 
                      onClick={gameState.score === 0 ? startGame : togglePause}
                      className="w-full py-4 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Play size={20} fill="currentColor" />
                      {gameState.score === 0 ? 'START REACTION' : 'RESUME'}
                    </button>
                    
                    {gameState.score === 0 && (
                      <button 
                        onClick={() => setShowInstructions(true)}
                        className="w-full mt-4 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all"
                      >
                        HOW TO PLAY
                      </button>
                    )}
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions Modal */}
        <AnimatePresence>
          {showInstructions && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-30"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-3xl p-8 relative"
              >
                <button 
                  onClick={() => setShowInstructions(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>

                <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
                  <Zap className="text-yellow-400" />
                  LAB MANUAL
                </h3>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <div className="w-6 h-6 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-400">Substrates</h4>
                      <p className="text-sm text-slate-400">Catch shapes that match your current active site to gain points and build combos.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <div className="w-6 h-6 border-2 border-red-500 rounded-full" />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-400">Competitive Inhibitors</h4>
                      <p className="text-sm text-slate-400">These mimic your substrate but block your reaction. Avoid them at all costs!</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <div className="w-6 h-6 bg-purple-500 rotate-45" />
                    </div>
                    <div>
                      <h4 className="font-bold text-purple-400">Allosteric Modulators</h4>
                      <p className="text-sm text-slate-400">Touching these will change your enzyme's shape, forcing you to adapt to a new substrate.</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowInstructions(false)}
                  className="w-full mt-8 py-4 bg-white text-slate-950 font-bold rounded-2xl transition-all"
                >
                  GOT IT
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 bg-slate-900/80 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
        <span>Enzyme Reaction Simulator v1.0</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> System Stable</span>
          <span>Catalysis Active</span>
        </div>
      </div>
    </div>
  );
}
