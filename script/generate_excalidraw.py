import json
import random
import time
import os

def make_id():
    return "".join(random.choices("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", k=20))

class ExcalidrawDiagram:
    def __init__(self):
        self.elements = []
        
    def add_rect(self, x, y, w, h, text=None, bg_color="transparent", stroke_color="#1e1e1e", stroke_width=2, roundness=3, text_size=16, text_bold=False):
        rect_id = make_id()
        roundness_config = {"type": roundness} if roundness else None
        
        rect = {
            "id": rect_id,
            "type": "rectangle",
            "x": x,
            "y": y,
            "width": w,
            "height": h,
            "angle": 0,
            "strokeColor": stroke_color,
            "backgroundColor": bg_color,
            "fillStyle": "solid" if bg_color != "transparent" else "hachure",
            "strokeWidth": stroke_width,
            "strokeStyle": "solid",
            "roughness": 0, # Sleek, modern look
            "opacity": 100,
            "groupIds": [],
            "frameId": None,
            "roundness": roundness_config,
            "seed": random.randint(1, 100000),
            "version": 1,
            "versionNonce": random.randint(1, 100000),
            "isDeleted": False,
            "boundElements": [],
            "updated": int(time.time() * 1000),
            "link": None,
            "locked": False
        }
        
        self.elements.append(rect)
        
        if text:
            text_id = make_id()
            text_elem = {
                "id": text_id,
                "type": "text",
                "x": x + 10,
                "y": y + (h - text_size - 6) / 2 if "\n" not in text else y + 15,
                "width": w - 20,
                "height": h - 20,
                "angle": 0,
                "strokeColor": stroke_color if bg_color == "transparent" else "#ffffff" if stroke_color == "transparent" else "#121212",
                "backgroundColor": "transparent",
                "fillStyle": "hachure",
                "strokeWidth": 1,
                "strokeStyle": "solid",
                "roughness": 0,
                "opacity": 100,
                "groupIds": [],
                "frameId": None,
                "roundness": None,
                "seed": random.randint(1, 100000),
                "version": 1,
                "versionNonce": random.randint(1, 100000),
                "isDeleted": False,
                "boundElements": None,
                "updated": int(time.time() * 1000),
                "link": None,
                "locked": False,
                "text": text,
                "fontSize": text_size,
                "fontFamily": 1, # Sans-serif
                "textAlign": "center",
                "verticalAlign": "middle",
                "baseline": text_size - 2,
                "containerId": rect_id,
                "originalText": text
            }
            rect["boundElements"].append({"type": "text", "id": text_id})
            self.elements.append(text_elem)
            
        return rect_id

    def add_arrow(self, start_x, start_y, end_x, end_y, label=None, stroke_color="#1e1e1e", stroke_width=2, style="solid"):
        arrow_id = make_id()
        points = [
            [0, 0],
            [end_x - start_x, end_y - start_y]
        ]
        
        arrow = {
            "id": arrow_id,
            "type": "arrow",
            "x": start_x,
            "y": start_y,
            "width": abs(end_x - start_x),
            "height": abs(end_y - start_y),
            "angle": 0,
            "strokeColor": stroke_color,
            "backgroundColor": "transparent",
            "fillStyle": "hachure",
            "strokeWidth": stroke_width,
            "strokeStyle": style,
            "roughness": 0,
            "opacity": 100,
            "groupIds": [],
            "frameId": None,
            "roundness": {
                "type": 2 # Curved
            },
            "seed": random.randint(1, 100000),
            "version": 1,
            "versionNonce": random.randint(1, 100000),
            "isDeleted": False,
            "boundElements": [],
            "updated": int(time.time() * 1000),
            "link": None,
            "locked": False,
            "points": points,
            "lastCommittedPoint": None,
            "startBinding": None,
            "endBinding": None,
            "startArrowhead": None,
            "endArrowhead": "arrow"
        }
        
        self.elements.append(arrow)
        
        if label:
            label_id = make_id()
            mid_x = (start_x + end_x) / 2
            mid_y = (start_y + end_y) / 2 - 12
            
            label_elem = {
                "id": label_id,
                "type": "text",
                "x": mid_x - 70,
                "y": mid_y,
                "width": 140,
                "height": 20,
                "angle": 0,
                "strokeColor": stroke_color,
                "backgroundColor": "transparent",
                "fillStyle": "hachure",
                "strokeWidth": 1,
                "strokeStyle": "solid",
                "roughness": 0,
                "opacity": 100,
                "groupIds": [],
                "frameId": None,
                "roundness": None,
                "seed": random.randint(1, 100000),
                "version": 1,
                "versionNonce": random.randint(1, 100000),
                "isDeleted": False,
                "boundElements": None,
                "updated": int(time.time() * 1000),
                "link": None,
                "locked": False,
                "text": label,
                "fontSize": 11,
                "fontFamily": 3, # Monospace
                "textAlign": "center",
                "verticalAlign": "middle",
                "baseline": 10,
                "containerId": None,
                "originalText": label
            }
            self.elements.append(label_elem)
            
        return arrow_id
        
    def add_text(self, x, y, text, size=16, color="#1e1e1e", bold=False, font_family=1, align="left"):
        text_id = make_id()
        text_elem = {
            "id": text_id,
            "type": "text",
            "x": x,
            "y": y,
            "width": len(text) * (size * 0.6),
            "height": size + 10,
            "angle": 0,
            "strokeColor": color,
            "backgroundColor": "transparent",
            "fillStyle": "hachure",
            "strokeWidth": 1,
            "strokeStyle": "solid",
            "roughness": 0,
            "opacity": 100,
            "groupIds": [],
            "frameId": None,
            "roundness": None,
            "seed": random.randint(1, 100000),
            "version": 1,
            "versionNonce": random.randint(1, 100000),
            "isDeleted": False,
            "boundElements": None,
            "updated": int(time.time() * 1000),
            "link": None,
            "locked": False,
            "text": text,
            "fontSize": size,
            "fontFamily": font_family,
            "textAlign": align,
            "verticalAlign": "middle",
            "baseline": size - 2,
            "containerId": None,
            "originalText": text
        }
        self.elements.append(text_elem)
        return text_id

    def save(self, filepath):
        data = {
            "type": "excalidraw",
            "version": 2,
            "source": "https://excalidraw.com",
            "elements": self.elements,
            "appState": {
                "viewBackgroundColor": "#ffffff",
                "gridSize": 20
            },
            "files": {}
        }
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)

def generate_diagram():
    diag = ExcalidrawDiagram()
    
    # Modern Material Theme Palette for Web Architecture
    C_HTML = "#b45309"      # Dark Amber (Entry / Wireframe)
    C_HTML_BG = "#fffbeb"   # Soft Amber
    
    C_VIEW = "#be123c"     # Dark Rose (Render & DOM View)
    C_VIEW_BG = "#ffe4e6"  # Soft Rose
    
    C_STORE = "#4338ca"    # Dark Indigo (Core Logic & Algorithms)
    C_STORE_BG = "#e0e7ff" # Soft Indigo
    
    C_MODEL = "#0f766e"    # Dark Teal (Document Models)
    C_MODEL_BG = "#ccfbf1" # Soft Teal
    
    C_STYL = "#374151"     # Dark Gray (Styling / CSS)
    C_STYL_BG = "#f3f4f6"  # Soft Gray
    
    # Diagram Header
    diag.add_text(100, 60, "Mindmapper-Antigravity Web Architecture", size=28, color="#111827", bold=True)
    diag.add_text(100, 100, "A premium Vanilla JS (ES Modules) single-page reactive application structured around a centralized layout reflow store and custom vector canvas layer.", size=14, color="#4b5563")
    
    # --- DOM & ENTRY SECTION ---
    # Container for Entry & HTML structure
    diag.add_rect(80, 160, 360, 480, stroke_color="#f59e0b", bg_color="#fffdf5", roundness=3, stroke_width=2)
    diag.add_text(100, 180, "HTML Entry & UI Wireframe", size=18, color=C_HTML, bold=True)
    
    html_id = diag.add_rect(120, 240, 280, 90, 
                           text="index.html\n- Split Navigation Layout Wireframe\n- Inline Lucide SVG Vector Icons\n- Drag-and-Drop file import overlay", 
                           bg_color=C_HTML_BG, stroke_color=C_HTML, text_size=12)
                           
    app_id = diag.add_rect(120, 365, 280, 110, 
                          text="js/app.js (Main Controller)\n- Connects Toolbar & Sidebar inputs\n- Direct binds Inspector form events\n- Registers Keyboard Shortcuts\n- Bootstraps Store & Canvas", 
                          bg_color=C_HTML_BG, stroke_color=C_HTML, text_size=12)
                          
    css_id = diag.add_rect(120, 505, 280, 110, 
                          text="css/styles.css (Design System)\n- Obsidian Dark Glassmorphism variables\n- min-height: 44px touch targets (WCAG)\n- @media (hover: hover) touch isolation\n- 100dvh Dynamic Viewport heights", 
                          bg_color=C_STYL_BG, stroke_color=C_STYL, text_size=12)

    # --- STATE STORE SECTION ---
    # Container for Core Logic & Algorithms Store
    diag.add_rect(500, 160, 360, 480, stroke_color="#6366f1", bg_color="#f5f3ff", roundness=3, stroke_width=2)
    diag.add_text(520, 180, "State Store & Algorithms", size=18, color=C_STORE, bold=True)
    
    store_id = diag.add_rect(540, 230, 280, 260, 
                           text="js/store.js (MindMapStore)\n\n[State Variables]\n- document: MindMapDocument\n- selectedNodeID: String?\n- dragPreview: DragPreview?\n- zoomScale: Double (Clamped)\n\n[Key Operations / Engines]\n- tidyLayout() / layoutSubtree() (Dendrogram tree post-order reflow)\n- moveBranch() / finishBranchDrag()\n- addChild() / deleteBranch()\n- LocalStorage autosaves\n- Markdown and JSON parser/exporter", 
                           bg_color=C_STORE_BG, stroke_color=C_STORE, text_size=12)
                           
    models_id = diag.add_rect(540, 520, 280, 90, 
                             text="js/models.js (Data Models)\n- MindMapDocument / MindMapNode\n- NodeColor palette maps\n- dynamic displaySize mapping\n- displayRect bounding boxes", 
                             bg_color=C_MODEL_BG, stroke_color=C_MODEL, text_size=12)

    # --- GRAPHICS CANVAS ENGINE SECTION ---
    # Container for Canvas / Visual Rendering Engine
    diag.add_rect(920, 160, 360, 480, stroke_color="#f43f5e", bg_color="#fff1f2", roundness=3, stroke_width=2)
    diag.add_text(940, 180, "Graphics & Canvas Engine", size=18, color=C_VIEW, bold=True)
    
    canvas_id = diag.add_rect(960, 230, 280, 120, 
                            text="js/canvas.js (MindMapCanvas)\n- Viewport Grab Panning\n- Trackpad swipe & Pinch-to-Zoom\n- Dynamic canvas bounds expansions\n- S-curve connections (SVG Bezier)\n- Boundary auto-scroll loops", 
                            bg_color=C_VIEW_BG, stroke_color=C_VIEW, text_size=12)
                            
    dom_nodes_id = diag.add_rect(960, 380, 280, 110, 
                               text="renderNodeCards() (DOM View)\n- Double-tap & click gesture handlers\n- Mode Swapping (<span> & <input>)\n- Non-flicker partial updates\n- Pointer captures during drag", 
                               bg_color=C_VIEW_BG, stroke_color=C_VIEW, text_size=12)
                               
    outline_id = diag.add_rect(960, 520, 280, 80, 
                              text="renderNodesOutline()\n- Builds Sidebar hierarchical lists\n- Synced node bullet highlights\n- Focus-centers node in viewport", 
                              bg_color=C_VIEW_BG, stroke_color=C_VIEW, text_size=12)

    # --- ARROWS & INTERACTIVE FLOWS ---
    # app.js controls index.html binding
    diag.add_arrow(260, 330, 260, 365, stroke_color=C_HTML)
    
    # CSS applies to index.html structure
    diag.add_arrow(260, 505, 260, 475, stroke_color=C_STYL, style="dashed")
    
    # app.js instantiates store and canvas
    diag.add_arrow(400, 420, 540, 360, label="Bootstraps & Subscribes", stroke_color=C_STORE)
    diag.add_arrow(400, 420, 960, 290, label="Initializes viewport", stroke_color=C_VIEW)
    
    # Canvas subscribes to store.js state changes
    diag.add_arrow(960, 290, 820, 360, label="Store subscriptions (render)", stroke_color=C_STORE)
    
    # Canvas renders DOM card components
    diag.add_arrow(1100, 350, 1100, 380, stroke_color=C_VIEW)
    
    # DOM cards trigger node dragging logic in the store
    diag.add_arrow(960, 435, 820, 360, label="pointerdown (moveBranch)", stroke_color=C_STORE)
    
    # Left Explorer triggers centering focus in the Canvas
    diag.add_arrow(1100, 520, 1100, 490, stroke_color=C_VIEW)
    
    # Store governs and persists models
    diag.add_arrow(680, 490, 680, 520, stroke_color=C_STORE)

    # --- LEGEND ---
    diag.add_rect(80, 700, 360, 240, stroke_color="#9ca3af", bg_color="#f9fafb", roundness=3)
    diag.add_text(100, 715, "Diagram Legend", size=16, color="#111827", bold=True)
    
    diag.add_rect(100, 750, 40, 20, bg_color=C_HTML_BG, stroke_color=C_HTML)
    diag.add_text(160, 750, "App Wireframe & Controller", size=12, color="#374151")
    
    diag.add_rect(100, 790, 40, 20, bg_color=C_STORE_BG, stroke_color=C_STORE)
    diag.add_text(160, 790, "Central Store & Spacing Engines", size=12, color="#374151")
    
    diag.add_rect(100, 830, 40, 20, bg_color=C_VIEW_BG, stroke_color=C_VIEW)
    diag.add_text(160, 830, "Vector Connection & Card DOM View", size=12, color="#374151")
    
    diag.add_rect(100, 870, 40, 20, bg_color=C_MODEL_BG, stroke_color=C_MODEL)
    diag.add_text(160, 870, "Strict Document & Node Schema", size=12, color="#374151")
    
    diag.add_rect(100, 910, 40, 20, bg_color=C_STYL_BG, stroke_color=C_STYL)
    diag.add_text(160, 910, "CSS Theme, Transitions & Responsiveness", size=12, color="#374151")

    # Output paths
    output_path = "/Users/lpbrochu/Workspace/Mindmapper-Antigravity/architecture.excalidraw"
    diag.save(output_path)
    print(f"Web Architecture diagram successfully saved to {output_path}")

if __name__ == "__main__":
    generate_diagram()
