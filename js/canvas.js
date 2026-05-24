import { NodeColor } from './models.js';

export class MindMapCanvas {
    constructor(store) {
        this.store = store;
        
        // DOM References
        this.viewport = document.getElementById('canvas-viewport');
        this.content = document.getElementById('canvas-content');
        this.svgLayer = document.getElementById('svg-connections-layer');
        this.connectionsGroup = document.getElementById('connections-group');
        this.previewGroup = document.getElementById('preview-group');
        this.nodesLayer = document.getElementById('nodes-layer');
        
        // Panning and interaction states
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        
        // Active node drag state
        this.dragNodeID = null;
        this.dragStartMouseX = 0;
        this.dragStartMouseY = 0;
        this.dragStartPositions = null;
        this.isDraggingNode = false;
        
        // Double-click edit active state
        this.editingNodeID = null;
        
        // Track pad pinch zoom helper
        this.lastTouchDistance = 0;

        // Initialize events
        this.initViewportEvents();
        
        // Subscribe to store updates
        this.store.subscribe(() => this.render());
        
        // Initial center
        setTimeout(() => this.centerOnDocument(), 100);
    }

    // --- Panning & Zooming Interaction ---

    initViewportEvents() {
        // Viewport Drag-Panning (Universal Pointer Events)
        this.viewport.addEventListener('pointerdown', (e) => {
            // Ignore panning on touch if we are actually tapping an interactive card
            if (e.pointerType === 'touch' && e.target !== this.viewport && e.target !== this.content && e.target.tagName !== 'svg' && e.target.tagName !== 'path') {
                return;
            }
            // Only pan if clicking direct background or grid, not nodes
            if (e.target === this.viewport || e.target === this.content || e.target.tagName === 'svg' || e.target.tagName === 'path') {
                this.isPanning = true;
                this.panStartX = e.clientX - this.panX;
                this.panStartY = e.clientY - this.panY;
                this.viewport.style.cursor = 'grabbing';
                
                try {
                    this.viewport.setPointerCapture(e.pointerId);
                } catch (err) {}
                
                // Unfocus any active inline edit
                if (this.editingNodeID) {
                    this.commitInlineEdit();
                }
            }
        });

        window.addEventListener('pointermove', (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.panStartX;
                this.panY = e.clientY - this.panStartY;
                this.updateTransform();
            } else if (this.dragNodeID) {
                this.currentMouseX = e.clientX;
                this.currentMouseY = e.clientY;
                this.handleNodeDrag(e);
            }
        });

        const endPanningOrDragging = (e) => {
            if (this.isPanning) {
                this.isPanning = false;
                this.viewport.style.cursor = 'grab';
                try {
                    this.viewport.releasePointerCapture(e.pointerId);
                } catch (err) {}
            }
            if (this.dragNodeID) {
                this.endNodeDrag();
            }
        };

        window.addEventListener('pointerup', endPanningOrDragging);
        window.addEventListener('pointercancel', endPanningOrDragging);

        // Wheel Panning & Pinch-to-Zoom
        this.viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            if (e.ctrlKey) {
                // Pinch to Zoom
                const zoomFactor = 1 - e.deltaY * 0.003;
                const newZoom = this.store.zoomScale * zoomFactor;
                this.zoomAtViewportCenter(newZoom);
            } else {
                // Natural Swipe Panning
                this.panX -= e.deltaX;
                this.panY -= e.deltaY;
                this.updateTransform();
            }
        }, { passive: false });

        // Double Click background to deselect all
        this.viewport.addEventListener('dblclick', (e) => {
            if (e.target === this.viewport || e.target === this.content || e.target.tagName === 'svg') {
                this.store.selectedNodeID = null;
                this.store.notify();
            }
        });

        // Dynamic viewport resize
        window.addEventListener('resize', () => {
            this.updateTransform();
        });
    }

    updateTransform() {
        // Clamp panning so user doesn't lose the canvas
        const margin = 200;
        const limitXMin = -this.content.clientWidth * this.store.zoomScale + margin;
        const limitXMax = this.viewport.clientWidth - margin;
        const limitYMin = -this.content.clientHeight * this.store.zoomScale + margin;
        const limitYMax = this.viewport.clientHeight - margin;

        this.panX = Math.min(Math.max(this.panX, limitXMin), limitXMax);
        this.panY = Math.min(Math.max(this.panY, limitYMin), limitYMax);

        this.content.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.store.zoomScale})`;
    }

    zoomAtViewportCenter(targetZoom) {
        const oldZoom = this.store.zoomScale;
        this.store.setZoom(targetZoom);
        const newZoom = this.store.zoomScale;

        // Zoom relative to viewport center focal point
        const fx = this.viewport.clientWidth / 2;
        const fy = this.viewport.clientHeight / 2;

        this.panX = fx - (fx - this.panX) * (newZoom / oldZoom);
        this.panY = fy - (fy - this.panY) * (newZoom / oldZoom);

        this.updateTransform();
        this.store.saveBackup();
        
        // Update Zoom Text Indicator
        const zoomText = document.getElementById('zoom-text');
        const hudZoomText = document.getElementById('hud-zoom-percent');
        if (zoomText) zoomText.textContent = `${this.store.zoomPercent}%`;
        if (hudZoomText) hudZoomText.textContent = `${this.store.zoomPercent}%`;
    }

    centerOnDocument() {
        const nodes = this.store.document.nodes;
        if (nodes.length === 0) return;

        // Calculate node boundaries
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const node of nodes) {
            const size = node.displaySize;
            const x = node.position.x;
            const y = node.position.y;
            
            minX = Math.min(minX, x - size.width / 2);
            maxX = Math.max(maxX, x + size.width / 2);
            minY = Math.min(minY, y - size.height / 2);
            maxY = Math.max(maxY, y + size.height / 2);
        }

        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        // Set pan coordinates to center this coordinate inside viewport
        const vw = this.viewport.clientWidth;
        const vh = this.viewport.clientHeight;
        
        this.panX = vw / 2 - midX * this.store.zoomScale;
        this.panY = vh / 2 - midY * this.store.zoomScale;
        
        this.updateTransform();
    }

    // --- Node Dragging Events ---

    startNodeDrag(nodeID, e) {
        e.stopPropagation();
        
        // Prevent drag if editing title
        if (this.editingNodeID === nodeID) return;

        this.dragNodeID = nodeID;
        this.dragStartMouseX = e.clientX;
        this.dragStartMouseY = e.clientY;
        this.currentMouseX = e.clientX;
        this.currentMouseY = e.clientY;
        this.dragStartPositions = this.store.branchPositions(nodeID);
        this.isDraggingNode = false; // set to true only after exceeding threshold
        this.edgeScrollLoopActive = false;
        
        this.store.selectedNodeID = nodeID;
        this.store.notify();
    }

    handleNodeDrag(e) {
        if (!this.dragNodeID) return;

        const dxMouse = e.clientX - this.dragStartMouseX;
        const dyMouse = e.clientY - this.dragStartMouseY;
        const distance = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        // Only register drag if moved past 4 pixels threshold
        if (!this.isDraggingNode) {
            if (distance > 4) {
                this.isDraggingNode = true;
                
                // Start dynamic boundary edge scrolling loop
                if (!this.edgeScrollLoopActive) {
                    this.edgeScrollLoopActive = true;
                    this.startEdgeScrollLoop();
                }
            } else {
                return; // ignore minor click wiggles
            }
        }

        const dx = dxMouse / this.store.zoomScale;
        const dy = dyMouse / this.store.zoomScale;

        this.store.moveBranch(this.dragNodeID, this.dragStartPositions, { width: dx, height: dy });
    }

    endNodeDrag() {
        if (this.isDraggingNode && this.dragNodeID) {
            this.store.finishBranchDrag(this.dragNodeID);
        }
        
        this.isDraggingNode = false;
        this.dragNodeID = null;
        this.dragStartPositions = null;
        this.edgeScrollLoopActive = false;
    }

    startEdgeScrollLoop() {
        if (!this.isDraggingNode || !this.dragNodeID) {
            this.edgeScrollLoopActive = false;
            return;
        }

        const rect = this.viewport.getBoundingClientRect();
        const edgeMargin = 55; // 55px boundary scroll trigger zone
        const scrollSpeed = 8; // speed of auto-scroll in pixels per frame

        let dx = 0;
        let dy = 0;

        // Check horizontal edges
        if (this.currentMouseX < rect.left + edgeMargin) {
            dx = scrollSpeed; // pan right (moves canvas right, scrolling viewport left)
        } else if (this.currentMouseX > rect.right - edgeMargin) {
            dx = -scrollSpeed; // pan left (moves canvas left, scrolling viewport right)
        }

        // Check vertical edges
        if (this.currentMouseY < rect.top + edgeMargin) {
            dy = scrollSpeed; // pan down (moves canvas down, scrolling viewport up)
        } else if (this.currentMouseY > rect.bottom - edgeMargin) {
            dy = -scrollSpeed; // pan up (moves canvas up, scrolling viewport down)
        }

        if (dx !== 0 || dy !== 0) {
            this.panX += dx;
            this.panY += dy;
            this.updateTransform();

            // Shift mouse start tracking to match panning translation perfectly
            this.dragStartMouseX -= dx;
            this.dragStartMouseY -= dy;

            // Sync node positioning coordinates
            this.handleNodeDrag({
                clientX: this.currentMouseX,
                clientY: this.currentMouseY
            });
        }

        requestAnimationFrame(() => this.startEdgeScrollLoop());
    }

    // --- Inline Title Editing (Double Click) ---

    startInlineEdit(nodeID, inputElement) {
        this.editingNodeID = nodeID;
        const card = document.getElementById(`node-card-${nodeID}`);
        if (card) {
            card.classList.add('editing');
        }
        
        inputElement.readOnly = false;
        inputElement.focus();
        setTimeout(() => {
            inputElement.select();
        }, 50);

        // Save when Enter key is pressed or Blur occurs
        const keyHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                inputElement.blur();
            }
        };

        const blurHandler = () => {
            inputElement.removeEventListener('keydown', keyHandler);
            inputElement.removeEventListener('blur', blurHandler);
            this.commitInlineEdit(nodeID, inputElement.value);
        };

        inputElement.addEventListener('keydown', keyHandler);
        inputElement.addEventListener('blur', blurHandler);
    }

    commitInlineEdit(nodeID = null, newValue = null) {
        const activeID = nodeID || this.editingNodeID;
        if (!activeID) return;

        const card = document.getElementById(`node-card-${activeID}`);
        if (card) {
            card.classList.remove('editing');
            const input = card.querySelector('.node-title-input');
            if (input) {
                input.readOnly = true;
                if (newValue === null) {
                    newValue = input.value;
                }
            }
        }

        const node = this.store.document.nodes.find(n => n.id === activeID);
        if (node && newValue !== null && newValue.trim() !== '') {
            node.title = newValue.trim();
            this.store.markChanged('Renamed idea');
        }

        this.editingNodeID = null;
        this.render(); // Reflow to update lists
    }

    // --- Rendering Core Loop ---

    render() {
        // 0. Dynamically expand canvas dimensions to encapsulate all active nodes
        const nodes = this.store.document.nodes;
        if (nodes.length > 0) {
            let maxX = -Infinity, maxY = -Infinity;
            for (const node of nodes) {
                const size = node.displaySize;
                const x = node.position.x;
                const y = node.position.y;
                maxX = Math.max(maxX, x + size.width / 2);
                maxY = Math.max(maxY, y + size.height / 2);
            }
            
            // Apply a generous scroll margin so users can pan past edges
            const margin = 800; 
            const canvasWidth = Math.max(3200, maxX + margin);
            const canvasHeight = Math.max(2400, maxY + margin);

            this.content.style.width = `${canvasWidth}px`;
            this.content.style.height = `${canvasHeight}px`;
            this.svgLayer.setAttribute('width', canvasWidth);
            this.svgLayer.setAttribute('height', canvasHeight);
            this.svgLayer.setAttribute('viewBox', `0 0 ${canvasWidth} ${canvasHeight}`);
        }

        // 1. Update document title
        const docTitleInput = document.getElementById('input-doc-title');
        if (docTitleInput && document.activeElement !== docTitleInput) {
            docTitleInput.value = this.store.document.title;
        }

        // 2. Render dynamic nodes list outline
        this.renderNodesOutline();

        // 3. Render connection paths
        this.renderConnections();

        // 4. Render node element cards
        this.renderNodeCards();

        // 5. Update HUD elements
        this.renderHUDElements();

        // Check if there's a centering request
        if (this.lastCenterRequestID !== this.store.centerContentRequestID) {
            this.lastCenterRequestID = this.store.centerContentRequestID;
            this.centerOnDocument();
        }
    }

    renderNodesOutline() {
        const container = document.getElementById('nodes-list-container');
        if (!container) return;

        if (this.store.document.nodes.length === 0) {
            container.innerHTML = `
                <div class="content-unavailable">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    <span>No nodes in document</span>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        // Loop through nodes in document order
        for (const node of this.store.document.nodes) {
            const item = document.createElement('div');
            item.className = `node-item ${node.id === this.store.selectedNodeID ? 'selected' : ''}`;
            item.dataset.id = node.id;
            
            const colorMeta = NodeColor[node.color] || NodeColor.teal;
            
            item.innerHTML = `
                <div class="node-color-bullet" style="background-color: ${colorMeta.border}; box-shadow: 0 0 6px ${colorMeta.border}"></div>
                <div class="node-item-details">
                    <div class="node-item-title">${node.title || 'Untitled'}</div>
                    ${node.notes ? `<div class="node-item-notes">${node.notes}</div>` : ''}
                </div>
            `;

            item.addEventListener('click', () => {
                this.store.selectedNodeID = node.id;
                this.store.notify();
                this.focusCardElement(node.id);
            });

            container.appendChild(item);
        }
    }

    focusCardElement(nodeID) {
        // Zoom and center slightly on that selected node card if clicked in list
        const node = this.store.document.nodes.find(n => n.id === nodeID);
        if (!node) return;

        const vw = this.viewport.clientWidth;
        const vh = this.viewport.clientHeight;
        
        this.panX = vw / 2 - node.position.x * this.store.zoomScale;
        this.panY = vh / 2 - node.position.y * this.store.zoomScale;
        
        this.updateTransform();
    }

    renderConnections() {
        this.connectionsGroup.innerHTML = '';
        
        const nodeMap = new Map(this.store.document.nodes.map(n => [n.id, n]));

        // Render S-curves for edges
        for (const edge of this.store.document.edges) {
            const parent = nodeMap.get(edge.parentID);
            const child = nodeMap.get(edge.childID);
            if (!parent || !child) continue;

            const px = parent.position.x;
            const py = parent.position.y;
            const cx = child.position.x;
            const cy = child.position.y;

            // S-Curve math connecting parent to child
            const controlOffset = Math.max(80, Math.abs(cx - px) * 0.42);
            const pathData = `M ${px} ${py} C ${px + controlOffset} ${py}, ${cx - controlOffset} ${cy}, ${cx} ${cy}`;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('class', 'connection-path');
            
            const colorMeta = NodeColor[child.color] || NodeColor.teal;
            path.setAttribute('stroke', `${colorMeta.border}b5`); // Hex transparency ~72%
            
            this.connectionsGroup.appendChild(path);
        }

        // Render drag preview S-Curve
        this.previewGroup.innerHTML = '';
        if (this.store.dragPreview) {
            const preview = this.store.dragPreview;
            const from = preview.from;
            const to = preview.to;

            const controlOffset = Math.max(80, Math.abs(to.x - from.x) * 0.42);
            const pathData = `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('class', 'drag-preview-path');
            
            this.previewGroup.appendChild(path);
        }
    }

    renderNodeCards() {
        // Keep elements cache to avoid rebuilding everything and breaking focuses
        const existingCards = new Map();
        for (const el of this.nodesLayer.children) {
            if (el.dataset.id) {
                existingCards.set(el.dataset.id, el);
            }
        }

        const nodesToKeep = new Set();

        for (const node of this.store.document.nodes) {
            const size = node.displaySize;
            const isSelected = node.id === this.store.selectedNodeID;
            const isDropTarget = this.store.dragPreview?.targetParentID === node.id;
            const colorMeta = NodeColor[node.color] || NodeColor.teal;
            
            let card = existingCards.get(node.id);
            
            if (!card) {
                // Construct a new card element
                card = document.createElement('div');
                card.id = `node-card-${node.id}`;
                card.dataset.id = node.id;
                
                // Track double taps for touch tablet compatibility
                let lastTapTime = 0;
                
                // Universal Pointer Drag event bindings
                card.addEventListener('pointerdown', (e) => {
                    // Prevent drag on text editing input or selections
                    if (e.target.classList.contains('node-title-input') && card.classList.contains('editing')) {
                        return;
                    }
                    
                    // Double-tap/Double-click inline edit manual check (touch friendly)
                    const now = Date.now();
                    if (now - lastTapTime < 300) {
                        e.preventDefault();
                        const input = card.querySelector('.node-title-input');
                        if (input) {
                            this.startInlineEdit(node.id, input);
                            lastTapTime = 0; // Reset
                            return;
                        }
                    }
                    lastTapTime = now;

                    try {
                        card.setPointerCapture(e.pointerId);
                    } catch (err) {}
                    
                    this.startNodeDrag(node.id, e);
                });
                
                // Select click
                card.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.store.selectedNodeID !== node.id) {
                        this.store.selectedNodeID = node.id;
                        this.store.notify();
                    }
                });

                // Double click inline edit (mouse fallback)
                card.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    const input = card.querySelector('.node-title-input');
                    if (input) {
                        this.startInlineEdit(node.id, input);
                    }
                });
                
                this.nodesLayer.appendChild(card);
            }

            nodesToKeep.add(node.id);

            // Update card properties and content
            card.className = `node-card ${node.isRoot ? 'root-node' : ''} ${isSelected ? 'selected' : ''} ${isDropTarget ? 'drop-target' : ''}`;
            card.style.width = `${size.width}px`;
            card.style.left = `${node.position.x}px`;
            card.style.top = `${node.position.y}px`;
            
            // Set dynamic CSS properties for color mappings
            card.style.setProperty('--node-accent-color', colorMeta.border);
            card.style.setProperty('--node-accent-glow', `${colorMeta.border}2d`); // 18% glow opacity
            
            // Inside contents
            let input = card.querySelector('.node-title-input');
            let notesText = card.querySelector('.node-card-notes');
            
            if (!input) {
                card.innerHTML = `
                    <div class="node-card-header">
                        <div class="node-card-bullet"></div>
                        <input type="text" class="node-title-input" readonly value="${node.title}">
                    </div>
                    <div class="node-card-notes ${!node.notes ? 'empty-placeholder' : ''}">
                        ${node.notes ? node.notes : (isSelected ? 'Double click to edit title' : '')}
                    </div>
                `;
            } else {
                // Update title value if not currently typing in it
                if (document.activeElement !== input && this.editingNodeID !== node.id) {
                    input.value = node.title;
                }
                
                // Update notes body
                if (notesText) {
                    notesText.className = `node-card-notes ${!node.notes ? 'empty-placeholder' : ''}`;
                    notesText.textContent = node.notes ? node.notes : (isSelected ? 'Double click or edit in inspector' : '');
                }
            }
        }

        // Clean up deleted card nodes
        for (const [id, el] of existingCards.entries()) {
            if (!nodesToKeep.has(id)) {
                this.nodesLayer.removeChild(el);
            }
        }
    }

    renderHUDElements() {
        const hudNode = document.getElementById('hud-node-count');
        const hudEdge = document.getElementById('hud-edge-count');
        const statusText = document.getElementById('status-text');
        const fileLabel = document.getElementById('label-file-displayName');

        if (hudNode) hudNode.textContent = this.store.document.nodes.length;
        if (hudEdge) hudEdge.textContent = this.store.document.edges.length;
        if (statusText) statusText.textContent = this.store.statusMessage;
        if (fileLabel) fileLabel.textContent = this.store.fileDisplayName;
    }
}
