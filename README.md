# MIT Scratch Blockly Clone

A modern, interactive web-based clone of MIT Scratch, built with React, Vite, Blockly, and React-Draggable. This application lets you visually program and animate sprites using a drag-and-drop block interface, just like Scratch, but with a fresh, modern UI.

---

# Deployment: [Live Site](https://mit-scratch-clone-eight.vercel.app)

# Demo Link: [Demo Video](https://drive.google.com/file/d/1p4Td_plSSI4sk988gH8SfHRigYz98K3L/view?usp=sharing)


## ✨ Features

### Block-Based Programming
- **Blockly Integration:** Drag, drop, and snap together code blocks to create scripts for your sprites.
- **Block Categories:**
  - **Event:** Start scripts when the green flag is clicked.
  - **Motion:** Move, glide, turn, and set sprite positions.
  - **Looks:** Make sprites say or think messages.
  - **Control:** Wait and repeat actions.

### Sprite Management & Canvas
- **Add Sprites:** Use the `Add Sprite` button to add Cat, Dog, or Ball sprites to the canvas.
- **Draggable Sprites:** Click and drag sprites to reposition them on the canvas.
- **Sprite Selection:** Click a sprite to select and edit its properties or blocks.
- **Delete Sprite:** Select a sprite and click the red trash button in the controls to remove it.

### Sprite Controls (Right Panel)
- **Type:** Shows the type of the selected sprite (Cat, Dog, Ball).
- **Position:** Adjust X and Y coordinates manually.
- **Size:** Increase or decrease the sprite's size with + and - buttons.
- **Rotation:** Set the sprite's rotation in degrees.

### Programming & Animation
- **Tabs for Sprites:** Each sprite has its own tab in the block editor. Switch tabs to program different sprites.
- **Block Workspace:** Drag blocks from the toolbox to the workspace to build scripts for the selected sprite.
- **Run (▶️) Button:** Runs the script for the selected sprite (triggers `when flag clicked` blocks).
- **Run All:** Runs scripts for all sprites at once.
- **Undo:** Revert the last action (shows a counter for undo steps).
- **Reset:** Resets all sprites to their initial positions and states.
- **Hero Mode:** Toggle to enable collision detection. When two sprites collide, they swap their scripts and messages.

### Block Types
- **Event Blocks:**
  - `when flag clicked`: Start a script when the green flag is pressed.
- **Motion Blocks:**
  - `move [steps]`: Move sprite by X steps.
  - `turn [right/left] [degrees]`: Rotate sprite.
  - `go to x: [x] y: [y]`: Move sprite to coordinates.
  - `glide [secs] to x: [x] y: [y]`: Glide smoothly to position.
  - `change x/y by [value]`: Increment position.
  - `set x/y to [value]`: Set position directly.
- **Looks Blocks:**
  - `say [message] for [seconds]`: Show a speech bubble.
  - `say [message]`: Show a speech bubble briefly.
  - `think [message] for [seconds]`: Show a thought bubble.
  - `think [message]`: Show a thought bubble briefly.
- **Control Blocks:**
  - `wait [secs]`: Pause script.
  - `repeat above block [times]`: Repeat the previous block.

### UI Buttons Explained
- **Hero Mode:** Toggle collision-based script swapping between sprites.
- **Undo:** Step back through your actions (shows count).
- **Run (▶️):** Run the selected sprite's script.
- **Run All:** Run all sprites' scripts simultaneously.
- **Reset:** Reset all sprites to their starting state.
- **Add Sprite:** Add a new Cat, Dog, or Ball sprite.
- **Delete Sprite:** Remove the currently selected sprite.

### Sprites
- **Cat:** Orange cartoon cat, fully rotatable and resizable.
- **Dog:** Cartoon dog, rotatable and resizable.
- **Ball:** Simple colored ball, rotatable and resizable.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v14 or higher recommended; tested with v18)
- **npm** (Node Package Manager)

### Installation & Running Locally

1. **Clone the Repository**

```bash
git clone <your-repo-url>
cd MIT-Scratch-Blockly-master
```

2. **Install Dependencies**

```bash
npm install
```

3. **Start the Development Server**

```bash
npm run dev
```

4. **Open in Browser**

Visit [http://localhost:5173](http://localhost:5173) to use the app.

---

## 📝 Notes
- All assets (sprites, icons) are included in the repository.
- For feedback or questions, please open an issue or contact the maintainer.

---

Enjoy building and animating with your Scratch Blockly Clone!




