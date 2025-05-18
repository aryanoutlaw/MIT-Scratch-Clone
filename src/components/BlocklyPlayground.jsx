import { useContext, useCallback, useMemo } from 'react';
import { BlocklyWorkspace } from 'react-blockly';
import * as Blockly from 'blockly';
import { eventBlocks, looksBlocks, motionBlocks, controlBlocks } from '../sharedComponent/blocks';
import { GlobalContext } from '../App';

Blockly.defineBlocksWithJsonArray([...eventBlocks, ...looksBlocks, ...motionBlocks, ...controlBlocks]);

const useToolboxConfig = () => useMemo(() => ({
  kind: 'flyoutToolbox',
  contents: [
    { kind: 'label', text: 'Event', 'web-class': 'event-label' },
    ...eventBlocks.map(block => ({ kind: 'block', type: block.type })),
    { kind: 'label', text: 'Motion', 'web-class': 'motion-label' },
    ...motionBlocks.map(block => ({ kind: 'block', type: block.type })),
    { kind: 'label', text: 'Looks', 'web-class': 'looks-label' },
    ...looksBlocks.map(block => ({ kind: 'block', type: block.type })),
    { kind: 'label', text: 'Control', 'web-class': 'control-label' },
    ...controlBlocks.map(block => ({ kind: 'block', type: block.type })),
  ],
}), []);

const useWorkspaceConfig = () => useMemo(() => ({
  grid: {
    spacing: 20,
    length: 3,
    colour: '#fff',
    snap: true,
  },
}), []);

function BlocklyPlayground() {
  const { sprites, setSprites, selectedSpriteId, setSelectedSpriteId } = useContext(GlobalContext);
  const toolboxConfig = useToolboxConfig();
  const workspaceConfig = useWorkspaceConfig();

  // Find the selected sprite
  const selectedSprite = sprites.find(sprite => sprite.id === selectedSpriteId) || sprites[0];

  // When blocks change in Blockly, update only the selected sprite's blocks
  const handleJsonChange = useCallback((e) => {
    console.log('Blockly JSON change event:', e);
    
    // Debug the structure of blocks being saved
    if (e?.blocks?.blocks) {
      console.log('Blocks being saved:', JSON.stringify(e.blocks.blocks, null, 2));
      
      // Process the blocks to better preserve relationships
      const processedBlocks = processBlockStructure(e.blocks.blocks);
      console.log('Processed blocks for storage:', JSON.stringify(processedBlocks, null, 2));
      
      setSprites(prevSprites => prevSprites.map(sprite =>
        sprite.id === selectedSprite.id
          ? { ...sprite, blocks: e.blocks.blocks }
          : sprite
      ));
    } else {
      setSprites(prevSprites => prevSprites.map(sprite =>
        sprite.id === selectedSprite.id
          ? { ...sprite, blocks: [] }
          : sprite
      ));
    }
  }, [setSprites, selectedSprite]);
  
  // Helper to process block structure and relationships
  const processBlockStructure = (blocks) => {
    if (!blocks || !Array.isArray(blocks)) return [];
    
    // Create a map of all blocks by ID for quick lookup
    const blockMap = {};
    blocks.forEach(block => {
      blockMap[block.id] = { ...block };
    });
    
    // Process relationships - focus on repeat blocks
    blocks.forEach(block => {
      // Special handling for repeat blocks
      if (block.type === 'repeat') {
        // Look for blocks that might be inside this repeat
        // In Blockly, these would appear immediately after in the workspace
        const repeatIndex = blocks.findIndex(b => b.id === block.id);
        if (repeatIndex >= 0 && repeatIndex < blocks.length - 1) {
          // The next block in the array might be inside this repeat
          const potentialInnerBlock = blocks[repeatIndex + 1];
          block.innerBlocks = [potentialInnerBlock];
        }
      }
    });
    
    return blocks;
  };

  // Tab naming logic
  const getTabNames = () => {
    const typeCount = {};
    return sprites.map((sprite) => {
      typeCount[sprite.type] = (typeCount[sprite.type] || 0) + 1;
      return {
        id: sprite.id,
        name: typeCount[sprite.type] > 1 ? `${sprite.type} ${typeCount[sprite.type]}` : sprite.type,
      };
    });
  };
  const tabNames = getTabNames();

  return (
    <div className="w-full h-full flex flex-col">
      {/* Tabs above the playground */}
      <div className="flex flex-row gap-2 px-4 py-2 border-b bg-gray-50 items-center">
        {/* Scratch logo on the top left */}
        <img src="/scratch.png" alt="Scratch Logo" style={{ height: '40px' }} />
        <div style={{ width: '110px' }} />
        {tabNames.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedSpriteId(tab.id)}
            className={`px-4 py-1 rounded-t font-semibold border-b-2 ${selectedSpriteId === tab.id ? 'bg-white border-blue-500 text-blue-600' : 'bg-gray-200 border-transparent text-gray-700'}`}
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div className="flex-1">
        <BlocklyWorkspace
          key={selectedSprite?.id}
          onJsonChange={handleJsonChange}
          className="w-full h-full"
          toolboxConfiguration={toolboxConfig}
          workspaceConfiguration={workspaceConfig}
          initialJson={{ blocks: { blocks: selectedSprite?.blocks || [] } }}
        />
      </div>
    </div>
  );
}

export default BlocklyPlayground;
