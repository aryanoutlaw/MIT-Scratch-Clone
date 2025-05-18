import PreviewArea from './components/PreviewArea'
import BlocklyPlayground from './components/BlocklyPlayground';
import { createContext, useState } from 'react';

export const GlobalContext = createContext();

function App() {
  const [data, setData] = useState({});
  const [sprites, setSprites] = useState([
    {
      id: 1,
      type: 'Dog',
      position: { x: 30, y: 30 },
      rotation: 0,
      size: -30,
      text: { message: '', duration: 0, animation: false },
      animation: null,
      playing: false,
      history: [],
      blocks: [],
    },
  ]);
  const [spriteIdCounter, setSpriteIdCounter] = useState(2);
  const [selectedSpriteId, setSelectedSpriteId] = useState(null);
  return (
    <>
    <GlobalContext.Provider value={{data, setData, sprites, setSprites, spriteIdCounter, setSpriteIdCounter, selectedSpriteId, setSelectedSpriteId}}>
    <div className="bg-blue-100 font-sans">
      <div className="h-screen overflow-hidden flex flex-row">
        <div className="flex-1 h-screen overflow-hidden flex flex-row bg-white border-t border-r border-gray-200 rounded-tr-xl mr-2 w-3/5">          
          <BlocklyPlayground />
        </div>
        <div className="h-screen overflow-hidden flex flex-row bg-white border-t border-l border-gray-200 rounded-tl-xl ml-2 w-2/5">
          <PreviewArea />
        </div>
      </div>
    </div>
    </GlobalContext.Provider>
    </>
  )
}

export default App
