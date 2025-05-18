import { useState, useContext, useEffect, useCallback, useRef } from 'react';
import CatSprite from './CatSprite';
import DogSprite from './DogSprite';
import BallSprite from './BallSprite';
import Draggable from 'react-draggable';
import { Flag, RotateCcw, Undo2Icon, Play } from 'lucide-react';
import { GlobalContext } from '../App';
import { throttle } from 'lodash';

export default function PreviewArea() {
  const { sprites, setSprites, spriteIdCounter, setSpriteIdCounter, selectedSpriteId, setSelectedSpriteId } = useContext(GlobalContext);
  const [playing, setPlaying] = useState(false);
  const [history, setHistory] = useState([]);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const [showDropdown, setShowDropdown] = useState(false);
  const wasDragged = useRef(false);
  const [heroMode, setHeroMode] = useState(false);
  const [collidedPairs, setCollidedPairs] = useState([]);

  // Helper to update a specific sprite by id
  const updateSpriteById = (spriteId, updater) => {
    setSprites(prev => prev.map(sprite =>
      sprite.id === spriteId ? updater(sprite) : sprite
    ));
  };

  // Helper to get a sprite by id
  const getSpriteById = (spriteId) => sprites.find(sprite => sprite.id === spriteId);

  // Helper to update selected sprite
  const updateSelectedSprite = (updater) => {
    setSprites(prev => prev.map(sprite =>
      sprite.id === selectedSpriteId ? updater(sprite) : sprite
    ));
  };

  // Helper to get selected sprite
  const selectedSprite = sprites.find(sprite => sprite.id === selectedSpriteId) || sprites[0];

  // Refactored: startAnimation now takes spriteId and processes blocks
  const startAnimation = useCallback((spriteId, event_type = 'when_flag_clicked') => {
    const sprite = getSpriteById(spriteId);
    if (sprite && sprite.blocks && sprite.blocks.length > 0) {
      const actions = sprite.blocks.filter(action => action.type === event_type);
      if (actions.length > 0) {
        setHistory(prev => [...prev, { id: spriteId, prevState: { ...sprite } }]);
        // Pre-process all blocks to normalize structure
        actions.forEach(action => {
          console.log('Starting animation for block:', action.type);
          executeAction(spriteId, action, null);
        });
      }
    }
  }, [sprites]);

  // Helper to smoothly glide a sprite from its current position to a target position over a duration
  const glideTo = (start, end, duration, onUpdate, onComplete) => {
    const startTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const newX = start.x + (end.x - start.x) * t;
      const newY = start.y + (end.y - start.y) * t;
      onUpdate({ x: newX, y: newY });
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete && onComplete();
      }
    };
    animate();
  };

  // Helper: Process a block's structure to extract fields and handle nested data
  const processBlockStructure = (block) => {
    if (!block) return { type: 'unknown', fields: {} };
    
    // Make a deep copy to avoid side effects
    const processedBlock = JSON.parse(JSON.stringify(block));
    
    // Default fields if not present
    if (!processedBlock.fields) {
      processedBlock.fields = {};
    }
    
    // Extract fields from inputs if needed
    if (processedBlock.inputs) {
      Object.keys(processedBlock.inputs).forEach(key => {
        // If it's a field value input
        if (processedBlock.inputs[key].fields) {
          Object.keys(processedBlock.inputs[key].fields).forEach(fieldKey => {
            processedBlock.fields[fieldKey] = processedBlock.inputs[key].fields[fieldKey];
          });
        }
        
        // For "DO" inputs in repeat blocks, process them
        if (key.toUpperCase() === 'DO' && processedBlock.inputs[key].block) {
          processedBlock.DO = {
            block: processBlockStructure(processedBlock.inputs[key].block)
          };
        }
      });
    }
    
    // Process 'next' block
    if (processedBlock.next && processedBlock.next.block) {
      processedBlock.next = {
        block: processBlockStructure(processedBlock.next.block)
      };
    }
    
    return processedBlock;
  };

  // Refactored: executeAction now takes spriteId
  const executeAction = (spriteId, action, previousBlockInChain) => {
    const sprite = getSpriteById(spriteId);
    if (!sprite) return;
    
    // Process the block structure to normalize it
    const processedAction = processBlockStructure(action);
    
    // Log for debugging
    console.log('Executing action:', processedAction.type);
    if (processedAction.type === 'repeat') {
      console.log('Repeat block structure:', JSON.stringify(processedAction, null, 2));
    }
    
    const { type, fields, next } = processedAction;
    setPlaying(true);
    switch (type) {
      case 'go_to':
        updateSpriteById(spriteId, sprite => ({ ...sprite, position: { x: fields.x_position, y: fields.y_position } }));
        break;
      case 'go_to_random':
        updateSpriteById(spriteId, sprite => ({ ...sprite, position: { x: Math.random() * 400, y: Math.random() * 400 } }));
        break;
      case 'clockwise':
        updateSpriteById(spriteId, sprite => ({ ...sprite, rotation: sprite.rotation + Number(fields.angle) }));
        break;
      case 'anticlockwise':
        updateSpriteById(spriteId, sprite => ({ ...sprite, rotation: sprite.rotation - Number(fields.angle) }));
        break;
      case 'glide': {
        const start = { ...sprite.position };
        const end = { x: fields.x_position, y: fields.y_position };
        const duration = fields.seconds * 1000;
        updateSpriteById(spriteId, sprite => ({ ...sprite, animation: { type: 'glide', duration } }));
        glideTo(
          start,
          end,
          duration,
          (pos) => updateSpriteById(spriteId, sprite => ({ ...sprite, position: pos })),
          () => {
            updateSpriteById(spriteId, sprite => ({ ...sprite, animation: null, position: end }));
            if (next && next.block) {
              setTimeout(() => executeAction(spriteId, next.block, action), 10);
            } else {
              setPlaying(false);
            }
          }
        );
        return;
      }
      case 'point_towards':
        if (fields.target === 'MOUSE_POINTER') {
          const rect = document.getElementById(`sprite-${sprite.id}`)?.getBoundingClientRect();
          if (rect) {
            const svgCenterX = rect.left + rect.width / 2;
            const svgCenterY = rect.top + rect.height / 2;
            const deltaX = mousePositionRef.current.x - svgCenterX;
            const deltaY = mousePositionRef.current.y - svgCenterY;
            let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            if (angle < 0) angle += 360;
            updateSpriteById(spriteId, sprite => ({ ...sprite, rotation: angle, animation: null }));
          }
        }
        break;
      case 'move':
        updateSpriteById(spriteId, sprite => ({ ...sprite, position: { ...sprite.position, x: sprite.position.x + fields.x_position } }));
        break;
      case 'change_x_by':
        updateSpriteById(spriteId, sprite => ({ ...sprite, position: { ...sprite.position, x: sprite.position.x + fields.delta_x } }));
        break;
      case 'set_x':
        updateSpriteById(spriteId, sprite => ({ ...sprite, position: { ...sprite.position, x: fields.x_position } }));
        break;
      case 'change_y_by':
        updateSpriteById(spriteId, sprite => ({ ...sprite, position: { ...sprite.position, y: sprite.position.y + fields.delta_y } }));
        break;
      case 'set_y':
        updateSpriteById(spriteId, sprite => ({ ...sprite, position: { ...sprite.position, y: fields.y_position } }));
        break;
      case 'say_for_seconds':
        updateSpriteById(spriteId, sprite => ({ ...sprite, text: { message: fields.message, duration: fields.seconds * 1000, animation: false } }));
        setTimeout(() => updateSpriteById(spriteId, sprite => ({ ...sprite, text: { message: '', duration: 0, animation: false } })), fields.seconds * 1000);
        break;
      case 'say':
        updateSpriteById(spriteId, sprite => ({ ...sprite, text: { message: fields.message, duration: 100, animation: false } }));
        break;
      case 'think_for_seconds':
        updateSpriteById(spriteId, sprite => ({ ...sprite, text: { message: fields.message, duration: fields.seconds * 1000, animation: true } }));
        setTimeout(() => updateSpriteById(spriteId, sprite => ({ ...sprite, text: { message: '', duration: 0, animation: false } })), fields.seconds * 1000);
        break;
      case 'think':
        updateSpriteById(spriteId, sprite => ({ ...sprite, text: { message: fields.message, duration: 100, animation: true } }));
        break;
      case 'change_size':
        updateSpriteById(spriteId, sprite => ({ ...sprite, size: sprite.size + fields.size }));
        break;
      case 'wait': {
        // Wait for the specified seconds, then continue to next block
        const ms = (fields.seconds || 1) * 1000;
        setTimeout(() => {
          if (next && next.block) {
            executeAction(spriteId, next.block, action);
          } else {
            setPlaying(false);
          }
        }, ms);
        return; // Don't fall through to next block immediately
      }
      case 'repeat': {
        const blockToRepeat = previousBlockInChain; // From the new executeAction signature
        const times = (processedAction.fields && processedAction.fields.TIMES) ? Number(processedAction.fields.TIMES) : 1;
        const nextAfterRepeat = (processedAction.next && processedAction.next.block) ? processedAction.next.block : null;
        const currentRepeatBlock = action; // The original 'action' object for the repeat block

        if (blockToRepeat && times > 0) {
          let firstRepeatedBlock = null;
          let previousLinkInChain = null;

          for (let i = 0; i < times; i++) {
            const clonedInstance = JSON.parse(JSON.stringify(blockToRepeat)); // Clone the block to repeat
            // It's good practice to give cloned blocks unique IDs if downstream systems rely on them, though may not be strictly needed here.
            // clonedInstance.id = `${blockToRepeat.id || 'block'}_rep${i}_${Date.now()}`;
            clonedInstance.next = null; // Will be linked to the next instance or to nextAfterRepeat

            if (!firstRepeatedBlock) {
              firstRepeatedBlock = clonedInstance;
            }
            if (previousLinkInChain) {
              previousLinkInChain.next = { block: clonedInstance };
            }
            previousLinkInChain = clonedInstance;
          }

          // Link the end of the repeated chain to what comes after the repeat block
          if (previousLinkInChain) { // This means at least one block was cloned (times >= 1)
            previousLinkInChain.next = nextAfterRepeat ? { block: nextAfterRepeat } : null;
          } else {
            // This case should not be reached if blockToRepeat and times > 0.
            // If times = 1, firstRepeatedBlock is previousLinkInChain, so its next is set.
            // If somehow it is reached, execute nextAfterRepeat directly.
             if (nextAfterRepeat) {
              executeAction(spriteId, nextAfterRepeat, currentRepeatBlock);
            } else {
              setPlaying(false);
            }
            return;
          }
          
          if (firstRepeatedBlock) {
            // Execute the newly constructed chain.
            // The 'previousBlockInChain' for the first block in this new chain
            // is the repeat block itself, as it logically precedes this generated sequence.
            console.log(`Repeat: Executing ${blockToRepeat.type} ${times} times.`);
            executeAction(spriteId, firstRepeatedBlock, currentRepeatBlock);
            return; // Execution is now handled by the new chain
          }
        }

        // Fall-through: if no blockToRepeat, or times <= 0, or if the above logic didn't result in a chain.
        console.log('Repeat: No valid preceding block to repeat or zero repetitions. Proceeding to next block after repeat.');
        if (nextAfterRepeat) {
          executeAction(spriteId, nextAfterRepeat, currentRepeatBlock);
        } else {
          setPlaying(false); // No more blocks in this chain
        }
        return;
      }
      default:
        break;
    }

    if (next && next.block) {
      setTimeout(() => executeAction(spriteId, next.block, action), 10);
    } else {
      setPlaying(false);
    }
  };

  // Undo and reset should also update selected sprite
  const undoAction = () => {
    if (history.length > 0) {
      const lastEntry = history[history.length - 1];
      setSprites(prev => prev.map(sprite =>
        sprite.id === lastEntry.id ? { ...lastEntry.prevState } : sprite
      ));
      setHistory(history.slice(0, -1));
    }
  };

  const reset = () => {
    setSprites(prev => prev.map(sprite => ({
      ...sprite,
      position: { x: 30, y: 30 },
      rotation: 0,
      size: sprite.type === 'Ball' ? -10 : -30,
      text: { message: '', duration: 0, animation: false },
      animation: null,
      playing: false,
      history: [],
    })));
    setHistory([]);
    setPlaying(false);
    // Clear any ongoing timeouts or animations
    const highestTimeoutId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
  };

  useEffect(() => {
    const handleMouseMove = throttle((event) => {
      mousePositionRef.current = { x: event.clientX, y: event.clientY };
    }, 200);

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Helper to render the correct sprite
  const renderSprite = (sprite, idx) => {
    const commonProps = {
      key: sprite.id,
      id: `sprite-${sprite.id}`,
      showTooltip: sprite.text.duration > 0,
      tooltipText: sprite.text.message,
      animation: sprite.text?.animation,
    };
    switch (sprite.type) {
      case 'Cat':
        return (
          <CatSprite
            {...commonProps}
            size={sprite.size}
            rotation={sprite.rotation}
          />
        );
      case 'Dog':
        return (
          <DogSprite
            {...commonProps}
            width={95.17898101806641 + sprite.size}
            height={100.04156036376953 + sprite.size}
            rotation={-sprite.rotation}
          />
        );
      case 'Ball':
        return <BallSprite {...commonProps} size={sprite.size} rotation={sprite.rotation} />;
      default:
        return null;
    }
  };

  // Add sprite handler
  const handleAddSprite = (type) => {
    setSprites(prev => [
      ...prev,
      {
        id: spriteIdCounter,
        type,
        position: { x: 30, y: 30 },
        rotation: 0,
        size: type === 'Ball' ? -10 : -30,
        text: { message: '', duration: 0, animation: false },
        animation: null,
        playing: false,
        history: [],
        blocks: [],
      },
    ]);
    setSpriteIdCounter(id => id + 1);
    setShowDropdown(false);
  };

  // Sprite drag handler
  const handleDrag = (e, data, idx) => {
    setSprites(prev => prev.map((sprite, i) =>
      i === idx ? { ...sprite, position: { x: data.x, y: data.y } } : sprite
    ));
  };

  // Sprite select handler
  const handleSelectSprite = (id) => {
    setSelectedSpriteId(id);
  };

  // Sprite delete handler
  const handleDeleteSprite = () => {
    if (selectedSpriteId !== null) {
      setSprites(prev => prev.filter(sprite => sprite.id !== selectedSpriteId));
      setSelectedSpriteId(null);
    }
  };

  // Sprite size handlers
  const handleChangeSize = (delta) => {
    if (selectedSprite) {
      const targetId = selectedSprite.id;
      setSprites(prev => prev.map(sprite =>
        sprite.id === targetId ? { ...sprite, size: (sprite.size || 0) + delta } : sprite
      ));
    }
  };

  // Sprite position and rotation handlers
  const handleChangePosition = (axis, value) => {
    if (selectedSprite) {
      const targetId = selectedSprite.id;
      setSprites(prev => prev.map(sprite =>
        sprite.id === targetId ? { ...sprite, position: { ...sprite.position, [axis]: value } } : sprite
      ));
    }
  };
  const handleChangeRotation = (value) => {
    if (selectedSprite) {
      const targetId = selectedSprite.id;
      setSprites(prev => prev.map(sprite =>
        sprite.id === targetId ? { ...sprite, rotation: value } : sprite
      ));
    }
  };

  // Helper: Get bounding box for a sprite
  const getSpriteBoundingBox = (sprite) => {
    let width = 50, height = 50;
    if (sprite.type === 'Cat') {
      width = 95.17898101806641 + sprite.size;
      height = 100.04156036376953 + sprite.size;
    } else if (sprite.type === 'Dog') {
      width = 95.17898101806641 + sprite.size;
      height = 100.04156036376953 + sprite.size;
    } else if (sprite.type === 'Ball') {
      width = 50 + sprite.size;
      height = 50 + sprite.size;
    }
    return {
      left: sprite.position.x,
      top: sprite.position.y,
      right: sprite.position.x + width,
      bottom: sprite.position.y + height,
      width,
      height,
    };
  };

  // Helper: Check collision between two sprites
  const isColliding = (a, b) => {
    const boxA = getSpriteBoundingBox(a);
    const boxB = getSpriteBoundingBox(b);
    return !(
      boxA.right < boxB.left ||
      boxA.left > boxB.right ||
      boxA.bottom < boxB.top ||
      boxA.top > boxB.bottom
    );
  };

  // Hero Mode: Detect collisions and swap actions
  useEffect(() => {
    if (!heroMode || sprites.length < 2) return;
    let newCollidedPairs = [];
    for (let i = 0; i < sprites.length; i++) {
      for (let j = i + 1; j < sprites.length; j++) {
        if (isColliding(sprites[i], sprites[j])) {
          newCollidedPairs.push([sprites[i].id, sprites[j].id]);
        }
      }
    }
    // Only swap if new collision (not already swapped for this pair)
    newCollidedPairs.forEach(([idA, idB]) => {
      const alreadySwapped = collidedPairs.some(
        ([a, b]) => (a === idA && b === idB) || (a === idB && b === idA)
      );
      if (!alreadySwapped) {
        const spriteA = getSpriteById(idA);
        const spriteB = getSpriteById(idB);
        if (spriteA && spriteB) {
          // Swap text and blocks (permanently)
          setSprites(prev => prev.map(sprite => {
            if (sprite.id === idA) {
              return { ...sprite, text: spriteB.text, blocks: spriteB.blocks };
            } else if (sprite.id === idB) {
              return { ...sprite, text: spriteA.text, blocks: spriteA.blocks };
            } else {
              return sprite;
            }
          }));
        }
      }
    });
    setCollidedPairs(newCollidedPairs);
  }, [sprites, heroMode]);

  // Reset collided pairs when hero mode is off or sprites change
  useEffect(() => {
    if (!heroMode) setCollidedPairs([]);
  }, [heroMode, sprites.length]);

  // Run all sprites' top-level blocks (not just event blocks)
  const runAllSprites = useCallback(() => {
    sprites.forEach(sprite => {
      if (sprite.blocks && sprite.blocks.length > 0) {
        // Find all blocks that are not referenced as next.block of any other block
        const allBlocks = sprite.blocks;
        const referencedBlocks = new Set();
        allBlocks.forEach(block => {
          if (block.next && block.next.block) {
            referencedBlocks.add(block.next.block.id);
          }
        });
        // Filter top-level blocks: those whose ID is not in referencedBlocks
        // This assumes event blocks are part of allBlocks and might be caught here.
        // A more robust way for top-level is to identify blocks without predecessors in any chain.
        // For now, let's assume this finds starting points or unlinked blocks.
        const topLevelBlocks = allBlocks.filter(block => !referencedBlocks.has(block.id));

        topLevelBlocks.forEach(block => {
          setHistory(prev => [...prev, { id: sprite.id, prevState: { ...sprite } }]);
          executeAction(sprite.id, block, null);
        });
      }
    });
  }, [sprites, executeAction]);

  return (
    <div className="flex-none w-full">
      <div className="flex flex-row p-4 gap-4 justify-end pr-6">
        <div className='flex flex-row gap-4 justify-end z-10'>
          {/* Hero Mode Toggle */}
          <div className="flex items-center gap-3" style={{ animation: 'fadeInScale 0.5s 0.05s cubic-bezier(0.4,0,0.2,1) both' }}>
            <label htmlFor="hero-mode-toggle" className="font-semibold select-none">Hero Mode</label>
            <button
              id="hero-mode-toggle"
              type="button"
              aria-pressed={heroMode}
              onClick={() => setHeroMode(v => !v)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 border-2 border-blue-300 ${heroMode ? 'bg-blue-500' : 'bg-gray-300'}`}
              style={{ minWidth: '3rem' }}
            >
              <span
                className={`absolute left-1 top-[3px] w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${heroMode ? 'translate-x-[20px]' : ''}`}
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
              ></span>
            </button>
          </div>
          {history.length > 0 && (
            <div
              onClick={undoAction}
              title='Undo'
              className='cursor-pointer self-center flex flex-row gap-1'
            >
              <p className='font-semibold'>{history.length}</p >
              <Undo2Icon />
            </div>
          )}
          <div
            onClick={() => startAnimation(selectedSpriteId, "when_flag_clicked")}
            title={"Run"}
            className={`cursor-pointer self-center ${playing ? "pointer-events-none" : ""}`}
          >
            <Play fill={playing ? "gray" : "green"} color='green' />
          </div>
          {/* Run All Button */}
          <div
            onClick={runAllSprites}
            title="Run All Sprites"
            className={`animated-btn animated-btn-green cursor-pointer self-center px-4 py-1.5 ml-2 font-medium flex items-center gap-1 ${playing ? "pointer-events-none opacity-50" : ""}`}
            style={{ animation: 'fadeInScale 0.5s cubic-bezier(0.4,0,0.2,1)' }}
          >
            <span className="btn-content">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Run All
            </span>
          </div>
          <div
            onClick={reset}
            title='Reset'
            className='cursor-pointer self-center'
          >
            <RotateCcw />
          </div>
          {/* + Sprite Dropdown */}
          <div className="relative">
            <button
              className="animated-btn animated-btn-blue px-4 py-1.5 flex items-center gap-1 font-medium"
              style={{ animation: 'fadeInScale 0.5s 0.1s cubic-bezier(0.4,0,0.2,1) both' }}
              onClick={() => setShowDropdown(v => !v)}
            >
              <span className="btn-content">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Sprite
              </span>
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded-md shadow-lg z-20 overflow-hidden">
                <div className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b" onClick={() => handleAddSprite('Cat')}>Cat</div>
                <div className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b" onClick={() => handleAddSprite('Dog')}>Dog</div>
                <div className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => handleAddSprite('Ball')}>Ball</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Split preview area into two parts (now vertical) */}
      <div className="h-[calc(100vh_-_4rem)] overflow-y-auto p-2 relative border flex flex-col gap-4">
        {/* Top: Sprites Area */}
        <div className="flex-1 relative border-b pb-4">
          {sprites.map((sprite, idx) => (
            <Draggable
              key={sprite.id}
              position={sprite.position}
              onStart={() => { wasDragged.current = false; }}
              onDrag={(e, data) => { wasDragged.current = true; handleDrag(e, data, idx); }}
            >
              <div
                className={`absolute cursor-pointer ${selectedSpriteId === sprite.id && !sprite.animation && !playing && !sprite.text.duration ? 'ring-4 ring-blue-400' : ''}`}
                style={{
                  left: 0,
                  top: 0,
                  zIndex: 10 + idx,
                  width: 'fit-content',
                  height: 'fit-content',
                }}
                onMouseDown={() => { wasDragged.current = false; }}
                onClick={() => {
                  handleSelectSprite(sprite.id);
                }}
              >
                {/* Cross delete button only visible when selected */}
                {selectedSpriteId === sprite.id && !sprite.animation && !playing && !sprite.text.duration && (
                  <button
                    className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-100 z-20"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                    onClick={e => { e.stopPropagation(); setSprites(prev => prev.filter(s => s.id !== sprite.id)); if(selectedSpriteId === sprite.id) setSelectedSpriteId(null); }}
                    title="Delete sprite"
                  >
                    &#10005;
                  </button>
                )}
                {renderSprite(sprite, idx)}
              </div>
            </Draggable>
          ))}
        </div>
        {/* Bottom: Controls Area */}
        <div className="w-full flex flex-col gap-4 p-6 bg-gray-50 rounded-lg shadow">
          <h2 className="font-bold text-xl mb-4 pb-2 border-b border-gray-200 text-gray-700">Sprite Controls</h2>
          {selectedSprite ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-600 w-24">Type:</span>
                <span className="text-gray-800 font-semibold">{selectedSprite.type}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-600 w-24">Position:</span>
                  <div className="flex items-center gap-2">
                    <label htmlFor="posX" className="text-sm text-gray-500">X:</label>
                    <input
                      id="posX"
                      type="number"
                      value={selectedSprite.position.x}
                      onChange={e => handleChangePosition('x', Number(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <label htmlFor="posY" className="text-sm text-gray-500">Y:</label>
                    <input
                      id="posY"
                      type="number"
                      value={selectedSprite.position.y}
                      onChange={e => handleChangePosition('y', Number(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-600 w-24">Size:</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-800 font-semibold mr-2">{selectedSprite.size}</span>
                  <button 
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow-sm transition-colors text-sm font-medium" 
                    onClick={() => handleChangeSize(10)}
                  >
                    +
                  </button>
                  <button 
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow-sm transition-colors text-sm font-medium" 
                    onClick={() => handleChangeSize(-10)}
                  >
                    -
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-600 w-24">Rotation:</span>
                <input
                  type="number"
                  value={selectedSprite.rotation}
                  onChange={e => handleChangeRotation(Number(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <button 
                  className="w-full animated-btn animated-btn-red px-4 py-2 flex items-center gap-2 font-medium justify-center transition-all"
                  style={{ animation: 'fadeInScale 0.5s 0.2s cubic-bezier(0.4,0,0.2,1) both' }}
                  onClick={handleDeleteSprite}
                >
                  <span className="btn-content">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                    Delete Sprite
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">Select a sprite to see its controls.</div>
          )}
        </div>
      </div>
    </div>
  );
}
